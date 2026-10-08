import { randomUUID, createHmac, timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { and, eq, gte } from "drizzle-orm";
import { schema } from "@velozy/db";
import type { Environment } from "../config/env.js";
import { HttpError } from "../middleware/errors.js";
import pricingConfig from "../../../../docs/pricing_config.json" with { type: "json" };

export const pricing = pricingConfig as typeof pricingConfig;
export type BillingRegion = "india" | "international";
export type BillingCurrency = "INR" | "USD";
export type BillingInterval = "month" | "year";
export type FoundationLimit = "published_pages" | "custom_domains" | "media_storage_gb" | "team_editors_including_owner" | "bandwidth_gb_per_month";
type BillingProductMap = {
  foundation: Record<string, Record<BillingCurrency, Partial<Record<BillingInterval, string>>>>;
  credits: Record<string, Partial<Record<BillingCurrency, string>>>;
};

export function billingRegion(country: unknown): BillingRegion {
  return typeof country === "string" && country.trim().toUpperCase() === "IN" ? "india" : "international";
}

export function billingCurrency(region: BillingRegion): BillingCurrency {
  return region === "india" ? "INR" : "USD";
}

export function subscriptionIsActive(subscription: typeof schema.projectSubscriptions.$inferSelect | undefined, now = new Date()) {
  if (!subscription) return false;
  if (["cancelled", "canceled"].includes(subscription.status)) return Boolean(subscription.currentPeriodEnd && subscription.currentPeriodEnd > now);
  if (!["active", "trialing"].includes(subscription.status)) return false;
  return subscription.provider === "free" || !subscription.currentPeriodEnd || subscription.currentPeriodEnd > now;
}

export async function requireProjectPlanLimit(db: any, projectId: string, limit: FoundationLimit) {
  const subscription = await db.query.projectSubscriptions.findFirst({ where: eq(schema.projectSubscriptions.projectId, projectId) });
  if (!subscriptionIsActive(subscription))
    throw new HttpError(402, "Choose an active plan to use this feature", "subscription_required");
  const plan = pricing.foundation_plans.find((item) => item.id === subscription.plan);
  const allowance = Number(plan?.limits[limit] ?? 0);
  if (!plan || allowance < 1)
    throw new HttpError(403, "This feature is not included in the current plan", "plan_limit_reached");
  return { subscription, plan, allowance };
}

export function getProductMap(environment: Environment): BillingProductMap {
  if (!environment.DODO_PLATFORM_PRODUCTS_JSON) throw new HttpError(503, "Platform billing products are not configured", "billing_not_configured");
  let parsed: unknown;
  try { parsed = JSON.parse(environment.DODO_PLATFORM_PRODUCTS_JSON); }
  catch { throw new HttpError(503, "Platform billing product configuration is invalid", "billing_not_configured"); }
  if (!parsed || typeof parsed !== "object" || !("foundation" in parsed) || !("credits" in parsed))
    throw new HttpError(503, "Platform billing product configuration is invalid", "billing_not_configured");
  return parsed as BillingProductMap;
}

export function configuredDodo(environment: Environment) {
  if (!environment.DODO_PLATFORM_API_KEY || !environment.DODO_PLATFORM_WEBHOOK_SECRET)
    throw new HttpError(503, "Platform Dodo billing is not configured", "billing_not_configured");
  if (environment.DODO_PLATFORM_MODE === "live" && !environment.DODO_PLATFORM_LIVE_ENABLED)
    throw new HttpError(503, "Live billing remains disabled until staging checkout and webhook verification are complete", "live_billing_disabled");
  const base = environment.DODO_PLATFORM_MODE === "live" ? "https://live.dodopayments.com" : "https://test.dodopayments.com";
  return { apiKey: environment.DODO_PLATFORM_API_KEY, webhookSecret: environment.DODO_PLATFORM_WEBHOOK_SECRET, base };
}

export async function dodoRequest<T>(environment: Environment, path: string, body: unknown, idempotencyKey?: string): Promise<T> {
  const dodo = configuredDodo(environment);
  const response = await fetch(`${dodo.base}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${dodo.apiKey}`,
      "Dodo-Version": "2025-03-01",
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const result = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const message = result.message ?? result.error ?? `Dodo returned ${response.status}`;
    throw new HttpError(502, String(message).slice(0, 300), "billing_provider_error");
  }
  return result as T;
}

export function verifyPlatformDodoSignature(body: Buffer, headers: { id: string; timestamp: string; signature: string }, secret: string) {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature || !Number.isFinite(Number(timestamp)) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const key = secret.startsWith("whsec_") ? Buffer.from(secret.slice(6), "base64") : Buffer.from(secret);
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.`).update(body).digest();
  return signature.split(/[ ,]+/).some((part) => {
    const encoded = part.replace(/^v\d+=/, "");
    const candidates = [Buffer.from(encoded, "hex"), Buffer.from(encoded, "base64")];
    return candidates.some((candidate) => candidate.length === expected.length && timingSafeEqual(expected, candidate));
  });
}

function addMonths(date: Date, months: number) {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export function currentCreditCycle(periodStart: Date, periodEnd: Date, now = new Date()) {
  let start = new Date(periodStart);
  while (addMonths(start, 1) <= now && addMonths(start, 1) < periodEnd) start = addMonths(start, 1);
  return { start, end: addMonths(start, 1) > periodEnd ? new Date(periodEnd) : addMonths(start, 1) };
}

export async function ensureCreditWallet(db: any, projectId: string, actorId?: string) {
  const subscription = await db.query.projectSubscriptions.findFirst({ where: eq(schema.projectSubscriptions.projectId, projectId) });
  const walletRow = await db.query.projectCreditWallets.findFirst({ where: eq(schema.projectCreditWallets.projectId, projectId) });
  if (subscription?.provider === "free" && subscription.status === "active") return;
  const now = new Date();
  const paidThroughCancellation = Boolean(subscription && ["cancelled", "canceled"].includes(subscription.status) && subscription.currentPeriodEnd && subscription.currentPeriodEnd > now);
  if (!subscription || (!paidThroughCancellation && !["active", "trialing"].includes(subscription.status)) || !subscription.currentPeriodStart || !subscription.currentPeriodEnd || subscription.currentPeriodEnd <= now) {
    if (walletRow?.subscriptionBalance) {
      await db.transaction(async (tx: any) => {
        const [wallet] = await tx.select().from(schema.projectCreditWallets).where(eq(schema.projectCreditWallets.projectId, projectId)).for("update");
        if (!wallet?.subscriptionBalance) return;
        await tx.update(schema.projectCreditWallets).set({ subscriptionBalance: 0, subscriptionCycleStart: null, subscriptionCycleEnd: null, updatedAt: new Date() }).where(eq(schema.projectCreditWallets.projectId, projectId));
        await tx.insert(schema.projectCreditEvents).values({ projectId, actorId: actorId ?? null, kind: "expire", action: "monthly_allowance_expired", subscriptionDelta: -wallet.subscriptionBalance, idempotencyKey: `expire:${projectId}:${wallet.subscriptionCycleEnd?.toISOString() ?? "inactive"}` }).onConflictDoNothing();
      });
    }
    return;
  }
  const current = currentCreditCycle(subscription.currentPeriodStart, subscription.currentPeriodEnd);
  const [plan] = pricing.foundation_plans.filter((item) => item.id === subscription.plan);
  const allowance = Number((plan as any)?.included_ai_credits_per_month ?? 0);
  await db.transaction(async (tx: any) => {
    await tx.insert(schema.projectCreditWallets).values({ projectId }).onConflictDoNothing();
    const [wallet] = await tx.select().from(schema.projectCreditWallets).where(eq(schema.projectCreditWallets.projectId, projectId)).for("update");
    if (!wallet) throw new HttpError(500, "Credit wallet could not be loaded");
    if (wallet.subscriptionCycleStart?.getTime() === current.start.getTime()) return;
    const delta = allowance - wallet.subscriptionBalance;
    await tx.update(schema.projectCreditWallets).set({ subscriptionBalance: allowance, subscriptionCycleStart: current.start, subscriptionCycleEnd: current.end, updatedAt: new Date() }).where(eq(schema.projectCreditWallets.projectId, projectId));
    await tx.insert(schema.projectCreditEvents).values({ projectId, actorId: actorId ?? null, kind: "refill", action: "monthly_subscription_allowance", subscriptionDelta: delta, idempotencyKey: `refill:${projectId}:${current.start.toISOString()}`, metadata: { credits: allowance } }).onConflictDoNothing();
  });
}

export type CreditReservation = { projectId: string; actorId: string; clientKey: string; credits: number; subscriptionCredits: number; purchasedCredits: number; cycleStart?: string };

export function actionCreditWeight(action: string) {
  const weight = Number((pricing.credit_system.estimated_action_weights as Record<string, number>)[action]);
  if (!Number.isSafeInteger(weight) || weight < 1) throw new HttpError(500, `No AI credit weight is configured for ${action}`);
  return weight;
}

export async function reserveAiCredits(db: any, input: { projectId: string; actorId: string; clientKey: string; action: string; credits: number }) {
  await ensureCreditWallet(db, input.projectId, input.actorId);
  let reservation: CreditReservation | undefined;
  await db.transaction(async (tx: any) => {
    await tx.insert(schema.projectCreditWallets).values({ projectId: input.projectId }).onConflictDoNothing();
    const [wallet] = await tx.select().from(schema.projectCreditWallets).where(eq(schema.projectCreditWallets.projectId, input.projectId)).for("update");
    if (!wallet) throw new HttpError(500, "Credit wallet could not be loaded");
    const idempotencyKey = `reserve:${input.clientKey}`;
    const duplicate = await tx.query.projectCreditEvents.findFirst({ where: and(eq(schema.projectCreditEvents.projectId, input.projectId), eq(schema.projectCreditEvents.idempotencyKey, idempotencyKey)) });
    if (duplicate) throw new HttpError(409, "This AI request was already charged; create a new request to retry", "duplicate_ai_request");
    const available = wallet.subscriptionBalance + wallet.purchasedBalance;
    if (available < input.credits) throw new HttpError(402, "Not enough AI credits. Upgrade your plan or add a credit pack.", "insufficient_ai_credits");
    const subscriptionCredits = Math.min(wallet.subscriptionBalance, input.credits);
    const purchasedCredits = input.credits - subscriptionCredits;
    await tx.update(schema.projectCreditWallets).set({ subscriptionBalance: wallet.subscriptionBalance - subscriptionCredits, purchasedBalance: wallet.purchasedBalance - purchasedCredits, reservedBalance: wallet.reservedBalance + input.credits, updatedAt: new Date() }).where(eq(schema.projectCreditWallets.projectId, input.projectId));
    await tx.insert(schema.projectCreditEvents).values({ projectId: input.projectId, actorId: input.actorId, kind: "reserve", action: input.action, subscriptionDelta: -subscriptionCredits, purchasedDelta: -purchasedCredits, reservedDelta: input.credits, idempotencyKey, metadata: { credits: input.credits, subscriptionCredits, purchasedCredits, cycleStart: wallet.subscriptionCycleStart?.toISOString() } });
    reservation = { projectId: input.projectId, actorId: input.actorId, clientKey: input.clientKey, credits: input.credits, subscriptionCredits, purchasedCredits, cycleStart: wallet.subscriptionCycleStart?.toISOString() };
  });
  return reservation!;
}

export async function settleAiCredits(db: any, reservation: CreditReservation, success: boolean) {
  await db.transaction(async (tx: any) => {
    const key = `${success ? "settle" : "refund"}:${reservation.clientKey}`;
    const existing = await tx.query.projectCreditEvents.findFirst({ where: and(eq(schema.projectCreditEvents.projectId, reservation.projectId), eq(schema.projectCreditEvents.idempotencyKey, key)) });
    if (existing) return;
    const [wallet] = await tx.select().from(schema.projectCreditWallets).where(eq(schema.projectCreditWallets.projectId, reservation.projectId)).for("update");
    if (!wallet || wallet.reservedBalance < reservation.credits) throw new HttpError(409, "AI credit reservation is no longer valid", "credit_reservation_invalid");
    const currentCycle = wallet.subscriptionCycleStart?.toISOString() ?? null;
    const reservedCycle = reservation.cycleStart ?? null;
    const refundSubscription = success || currentCycle !== reservedCycle ? 0 : reservation.subscriptionCredits;
    const refundPurchased = success ? 0 : reservation.purchasedCredits;
    await tx.update(schema.projectCreditWallets).set({ subscriptionBalance: wallet.subscriptionBalance + refundSubscription, purchasedBalance: wallet.purchasedBalance + refundPurchased, reservedBalance: wallet.reservedBalance - reservation.credits, updatedAt: new Date() }).where(eq(schema.projectCreditWallets.projectId, reservation.projectId));
    await tx.insert(schema.projectCreditEvents).values({ projectId: reservation.projectId, actorId: reservation.actorId, kind: success ? "settle" : "refund", action: success ? "ai_generation" : "failed_ai_generation", subscriptionDelta: refundSubscription, purchasedDelta: refundPurchased, reservedDelta: -reservation.credits, idempotencyKey: key, metadata: { credits: reservation.credits, action: success ? "charged" : "released" } });
  });
}

export async function withAiCredits<T>(db: any, input: { projectId: string; actorId: string; clientKey: string; action: string }, work: () => Promise<T>): Promise<T> {
  if (!input.clientKey || input.clientKey.length > 255)
    throw new HttpError(400, "An Idempotency-Key is required for AI generation", "idempotency_key_required");
  const reservation = await reserveAiCredits(db, { ...input, credits: actionCreditWeight(input.action) });
  try {
    const result = await work();
    await settleAiCredits(db, reservation, true);
    return result;
  } catch (error) {
    await settleAiCredits(db, reservation, false);
    throw error;
  }
}

export function requestAiIdempotencyKey(request: Request) {
  const clientKey = request.header("idempotency-key");
  if (!clientKey || clientKey.length > 255)
    throw new HttpError(400, "An Idempotency-Key is required for AI generation", "idempotency_key_required");
  return clientKey;
}

export async function withRequestAiCredits<T>(
  db: any,
  request: Request,
  projectAccess: (projectId: string, userId: string, capability?: string) => Promise<unknown>,
  action: string,
  work: () => Promise<T>,
): Promise<T> {
  const projectId = request.body?.projectId;
  if (typeof projectId !== "string" || !/^[0-9a-f-]{36}$/i.test(projectId) || !request.auth?.userId)
    throw new HttpError(400, "Select a project before using AI", "project_required");
  await projectAccess(projectId, request.auth.userId, "content:write");
  const clientKey = requestAiIdempotencyKey(request);
  return withAiCredits(db, { projectId, actorId: request.auth.userId, clientKey, action }, work);
}

export async function addPurchasedCredits(tx: any, projectId: string, credits: number, actorId: string, checkoutId: string) {
  const [created] = await tx.insert(schema.projectCreditEvents).values({ projectId, actorId, kind: "purchase", action: "ai_credit_topup", purchasedDelta: credits, idempotencyKey: `topup:${checkoutId}`, metadata: { checkoutId, credits } }).onConflictDoNothing().returning({ id: schema.projectCreditEvents.id });
  if (!created) return;
  await tx.insert(schema.projectCreditWallets).values({ projectId }).onConflictDoNothing();
  const [wallet] = await tx.select().from(schema.projectCreditWallets).where(eq(schema.projectCreditWallets.projectId, projectId)).for("update");
  await tx.update(schema.projectCreditWallets).set({ purchasedBalance: wallet.purchasedBalance + credits, updatedAt: new Date() }).where(eq(schema.projectCreditWallets.projectId, projectId));
}

export async function addSubscriptionCredits(tx: any, projectId: string, credits: number, actorId: string | null, cycleStart: Date, cycleEnd: Date, source: string) {
  await tx.insert(schema.projectCreditWallets).values({ projectId }).onConflictDoNothing();
  const [wallet] = await tx.select().from(schema.projectCreditWallets).where(eq(schema.projectCreditWallets.projectId, projectId)).for("update");
  if (wallet.subscriptionCycleStart?.getTime() === cycleStart.getTime()) return;
  const idempotencyKey = `subscription-credit:${source}:${cycleStart.toISOString()}`;
  const existing = await tx.query.projectCreditEvents.findFirst({ where: and(eq(schema.projectCreditEvents.projectId, projectId), eq(schema.projectCreditEvents.idempotencyKey, idempotencyKey)) });
  if (existing) return;
  const delta = credits - wallet.subscriptionBalance;
  await tx.update(schema.projectCreditWallets).set({ subscriptionBalance: credits, subscriptionCycleStart: cycleStart, subscriptionCycleEnd: cycleEnd, updatedAt: new Date() }).where(eq(schema.projectCreditWallets.projectId, projectId));
  await tx.insert(schema.projectCreditEvents).values({ projectId, actorId, kind: "refill", action: "monthly_subscription_allowance", subscriptionDelta: delta, idempotencyKey, metadata: { credits, cycleStart: cycleStart.toISOString(), cycleEnd: cycleEnd.toISOString() } });
}

export async function currentCreditUsage(db: any, projectId: string, from: Date) {
  const events = await db.query.projectCreditEvents.findMany({ where: and(eq(schema.projectCreditEvents.projectId, projectId), eq(schema.projectCreditEvents.kind, "settle"), gte(schema.projectCreditEvents.createdAt, from)) });
  return events.reduce((sum: number, event: any) => sum + Number(event.metadata?.credits ?? 0), 0);
}

export function newCheckoutId() { return randomUUID(); }
