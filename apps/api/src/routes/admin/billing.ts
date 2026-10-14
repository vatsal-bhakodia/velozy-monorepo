import { Router } from "express";
import type { Request, Router as ExpressRouter } from "express";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { createDb, schema } from "@velozy/db";
import type { Environment } from "../../config/env.js";
import { HttpError } from "../../middleware/errors.js";
import { adminAccess } from "../../lib/admin-auth.js";
import {
  addSubscriptionCredits,
  billingCurrency,
  billingRegion,
  configuredDodo,
  currentCreditUsage,
  currentCreditCycle,
  ensureCreditWallet,
  dodoRequest,
  getProductMap,
  newCheckoutId,
  pricing,
  subscriptionIsActive as isActive,
} from "../../lib/platform-billing.js";

const id = z.string().uuid();
const planCheckoutInput = z.object({ projectId: id, planId: z.enum(["launch", "scale"]), interval: z.enum(["month", "year"]) }).strict();
const topupInput = z.object({ projectId: id, packId: z.enum(["ai_100", "ai_500", "ai_1500", "ai_5000"]) }).strict();

export function adminBillingRouter(environment: Environment): ExpressRouter {
  const { db, user } = adminAccess(environment.DATABASE_URL);
  const router = Router();

  async function ownerProject(request: Request, rawProjectId: unknown) {
    const currentUser = await user(request);
    const projectId = id.parse(rawProjectId);
    const project = await db.query.projects.findFirst({ where: eq(schema.projects.id, projectId) });
    if (!project) throw new HttpError(404, "Project not found");
    if (project.userId !== currentUser.id) throw new HttpError(403, "Only the project owner can manage billing", "billing_owner_required");
    return { currentUser, project };
  }

  function regionFor(request: Request) { return billingRegion(request.header("cf-ipcountry")); }

  async function startCheckout(
    request: Request,
    currentUser: { id: string; email: string },
    project: { id: string },
    input: { kind: "subscription" | "credits"; productId: string; currency: "INR" | "USD"; amount: number; credits?: number; metadata: Record<string, string> },
  ) {
    const idempotencyKey = request.header("idempotency-key")?.trim();
    if (!idempotencyKey || idempotencyKey.length > 255)
      throw new HttpError(400, "An Idempotency-Key is required for checkout", "idempotency_key_required");
    configuredDodo(environment);

    const checkoutId = newCheckoutId();
    const [created] = await db.insert(schema.platformBillingCheckouts).values({
      id: checkoutId,
      projectId: project.id,
      actorId: currentUser.id,
      kind: input.kind,
      productId: input.productId,
      currency: input.currency,
      amount: input.amount,
      credits: input.credits ?? 0,
      idempotencyKey,
      metadata: input.metadata,
    }).onConflictDoNothing().returning();
    const checkout = created ?? await db.query.platformBillingCheckouts.findFirst({
      where: and(eq(schema.platformBillingCheckouts.projectId, project.id), eq(schema.platformBillingCheckouts.idempotencyKey, idempotencyKey)),
    });
    if (!checkout) throw new HttpError(500, "Checkout could not be created");
    if (checkout.kind !== input.kind || checkout.productId !== input.productId || checkout.currency !== input.currency || checkout.amount !== input.amount || checkout.credits !== (input.credits ?? 0))
      throw new HttpError(409, "This Idempotency-Key was already used for a different checkout", "checkout_key_conflict");
    if (checkout.status === "paid") return { checkoutId: checkout.id, checkoutUrl: null, created: false, paid: true };
    if (checkout.status === "failed") throw new HttpError(409, "This checkout failed. Start a new checkout request to retry.", "checkout_failed");
    const metadata = (checkout.metadata ?? {}) as Record<string, unknown>;
    if (checkout.providerSessionId && typeof metadata.checkoutUrl === "string")
      return { checkoutId: checkout.id, checkoutUrl: metadata.checkoutUrl, created: false, paid: false };

    try {
      const session = await dodoRequest<Record<string, any>>(environment, "/checkouts", {
        product_cart: [{ product_id: input.productId, quantity: 1 }],
        customer: { email: currentUser.email },
        return_url: `${environment.ADMIN_URL ?? "http://localhost:5173"}/settings/plan-usage?billing=return&checkout=${checkout.id}`,
        metadata: {
          projectId: project.id,
          billingCheckoutId: checkout.id,
          billingType: input.kind,
          ...input.metadata,
          currency: input.currency,
          amount: String(input.amount),
        },
      }, checkout.id);
      const checkoutUrl = String(session.checkout_url ?? "");
      const sessionId = String(session.session_id ?? session.id ?? "");
      if (!checkoutUrl || !sessionId) throw new Error("Dodo did not return a hosted checkout URL");
      await db.update(schema.platformBillingCheckouts).set({
        providerSessionId: sessionId,
        metadata: { ...metadata, checkoutUrl },
        updatedAt: new Date(),
      }).where(eq(schema.platformBillingCheckouts.id, checkout.id));
      return { checkoutId: checkout.id, checkoutUrl, created: Boolean(created), paid: false };
    } catch (error) {
      await db.update(schema.platformBillingCheckouts).set({ status: "failed", updatedAt: new Date() }).where(eq(schema.platformBillingCheckouts.id, checkout.id));
      throw error;
    }
  }

  router.get("/billing", async (request, response) => {
    const { currentUser, project } = await ownerProject(request, request.query.projectId);
    const now = new Date();
    let subscription = await db.query.projectSubscriptions.findFirst({ where: eq(schema.projectSubscriptions.projectId, project.id) });
    if (!isActive(subscription, now) && subscription?.status === "active" && subscription.currentPeriodEnd && subscription.currentPeriodEnd <= now) {
      [subscription] = await db.update(schema.projectSubscriptions).set({ status: "expired", updatedAt: now }).where(eq(schema.projectSubscriptions.id, subscription.id)).returning();
    }
    const shownSubscription = isActive(subscription, now) ? subscription : undefined;
    await ensureCreditWallet(db, project.id, currentUser.id);
    const wallet = await db.query.projectCreditWallets.findFirst({ where: eq(schema.projectCreditWallets.projectId, project.id) });
    const [publishedPages] = await db.select({ count: count() }).from(schema.pages).where(and(eq(schema.pages.projectId, project.id), eq(schema.pages.status, "published")));
    const region = shownSubscription ? (shownSubscription.currency === "INR" ? "india" : "international") : regionFor(request);
    const currency = billingCurrency(region);
    const plans = pricing.foundation_plans.map((plan) => {
      const price = (plan.prices as any)[region];
      return { id: plan.id, name: plan.name, monthly: price.monthly, annualTotal: price.annual_total, annualMonthlyEquivalent: price.annual_monthly_equivalent, includedCredits: plan.included_ai_credits_per_month, oneTimeTrialCredits: (plan as any).one_time_trial_ai_credits ?? 0, limits: plan.limits, features: plan.features, paidCreditsPurchaseAllowed: Boolean((plan as any).paid_credits_purchase_allowed ?? plan.id !== "free") };
    });
    const topups = pricing.credit_topups.map((pack) => ({ id: pack.id, credits: pack.credits, amount: (pack.prices as any)[region] }));
    const periodStart = shownSubscription?.currentPeriodStart ?? wallet?.subscriptionCycleStart ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const usageStart = shownSubscription?.currentPeriodStart && shownSubscription.currentPeriodEnd
      ? currentCreditCycle(shownSubscription.currentPeriodStart, shownSubscription.currentPeriodEnd, now).start
      : periodStart;
    const aiCreditsUsed = await currentCreditUsage(db, project.id, usageStart);
    const activePlan = shownSubscription ? pricing.foundation_plans.find((plan) => plan.id === shownSubscription.plan) : undefined;
    let billingConfigured = Boolean(environment.DODO_PLATFORM_API_KEY && environment.DODO_PLATFORM_WEBHOOK_SECRET && environment.DODO_PLATFORM_PRODUCTS_JSON);
    try { configuredDodo(environment); getProductMap(environment); } catch { billingConfigured = false; }
    response.json({
      project: { id: project.id, name: project.name },
      region,
      currency,
      priceVersion: pricing.schema_version,
      subscription: shownSubscription ? {
        plan: shownSubscription.plan,
        planName: activePlan?.name ?? shownSubscription.plan,
        interval: shownSubscription.interval,
        status: shownSubscription.status,
        provider: shownSubscription.provider,
        currency: shownSubscription.currency,
        priceAmount: shownSubscription.priceAmount,
        currentPeriodStart: shownSubscription.currentPeriodStart?.toISOString() ?? null,
        activeUntil: shownSubscription.currentPeriodEnd?.toISOString() ?? null,
        cancelAtPeriodEnd: shownSubscription.cancelAtPeriodEnd?.toISOString() ?? null,
        scheduledPlan: shownSubscription.scheduledPlan,
        scheduledInterval: shownSubscription.scheduledInterval,
      } : null,
      usage: {
        cycleStart: usageStart.toISOString(),
        cycleEnd: shownSubscription?.currentPeriodEnd?.toISOString() ?? null,
        aiCredits: { subscriptionBalance: wallet?.subscriptionBalance ?? 0, purchasedBalance: wallet?.purchasedBalance ?? 0, reservedBalance: wallet?.reservedBalance ?? 0, used: aiCreditsUsed, monthlyAllowance: activePlan?.included_ai_credits_per_month ?? 0 },
        publishedPages: Number(publishedPages?.count ?? 0),
      },
      plans,
      topups,
      billingConfigured,
    });
  });

  router.post("/billing/free", async (request, response) => {
    const { currentUser, project } = await ownerProject(request, request.body?.projectId);
    const current = await db.query.projectSubscriptions.findFirst({ where: eq(schema.projectSubscriptions.projectId, project.id) });
    if (isActive(current) && current?.plan !== "free") {
      return response.json({ success: true, plan: current?.plan, alreadyActive: true });
    }
    const currency = billingCurrency(regionFor(request));
    const now = new Date();
    const trialCredits = pricing.foundation_plans.find((plan) => plan.id === "free")?.one_time_trial_ai_credits ?? 0;
    await db.transaction(async (tx) => {
      const [subscription] = await tx.insert(schema.projectSubscriptions).values({ projectId: project.id, provider: "free", plan: "free", interval: "month", status: "active", currency, priceAmount: 0, priceVersion: pricing.schema_version, currentPeriodStart: now, metadata: { activatedBy: currentUser.id } }).onConflictDoUpdate({ target: schema.projectSubscriptions.projectId, set: { provider: "free", providerSubscriptionId: null, providerCustomerId: null, plan: "free", interval: "month", status: "active", currency, priceAmount: 0, priceVersion: pricing.schema_version, currentPeriodStart: now, currentPeriodEnd: null, cancelAtPeriodEnd: null, scheduledPlan: null, scheduledInterval: null, metadata: { activatedBy: currentUser.id }, updatedAt: now } }).returning();
      await tx.insert(schema.projectCreditWallets).values({ projectId: project.id }).onConflictDoNothing();
      const [wallet] = await tx.select().from(schema.projectCreditWallets).where(eq(schema.projectCreditWallets.projectId, project.id)).for("update");
      const existingTrial = await tx.query.projectCreditEvents.findFirst({ where: and(eq(schema.projectCreditEvents.projectId, project.id), eq(schema.projectCreditEvents.idempotencyKey, `free-trial:${project.id}`)) });
      const alreadyOnFreePlan = isActive(current) && current?.plan === "free";
      if (!alreadyOnFreePlan && wallet.subscriptionBalance > 0) {
        await tx.update(schema.projectCreditWallets).set({ subscriptionBalance: 0, subscriptionCycleStart: null, subscriptionCycleEnd: null, updatedAt: now }).where(eq(schema.projectCreditWallets.projectId, project.id));
        await tx.insert(schema.projectCreditEvents).values({ projectId: project.id, actorId: currentUser.id, kind: "expire", action: "expired_subscription_allowance_on_free_plan", subscriptionDelta: -wallet.subscriptionBalance, idempotencyKey: `free-reset:${project.id}:${now.toISOString()}`, metadata: { subscriptionId: subscription.id } });
      }
      const existingFreeBalance = alreadyOnFreePlan ? wallet.subscriptionBalance : 0;
      if (!existingTrial && trialCredits > 0) {
        await tx.update(schema.projectCreditWallets).set({ subscriptionBalance: existingFreeBalance + trialCredits, subscriptionCycleStart: null, subscriptionCycleEnd: null, updatedAt: now }).where(eq(schema.projectCreditWallets.projectId, project.id));
        await tx.insert(schema.projectCreditEvents).values({ projectId: project.id, actorId: currentUser.id, kind: "refill", action: "free_trial_credits", subscriptionDelta: trialCredits, idempotencyKey: `free-trial:${project.id}`, metadata: { subscriptionId: subscription.id, credits: trialCredits } });
      } else if (existingTrial) {
        const adjustmentKey = `free-trial-adjustment:${project.id}`;
        const existingAdjustment = await tx.query.projectCreditEvents.findFirst({ where: and(eq(schema.projectCreditEvents.projectId, project.id), eq(schema.projectCreditEvents.idempotencyKey, adjustmentKey)) });
        const trialMetadata = existingTrial.metadata as Record<string, unknown> | null;
        const adjustment = Math.max(0, trialCredits - Number(trialMetadata?.credits ?? 0));
        if (!existingAdjustment && adjustment > 0) {
          await tx.update(schema.projectCreditWallets).set({ subscriptionBalance: existingFreeBalance + adjustment, subscriptionCycleStart: null, subscriptionCycleEnd: null, updatedAt: now }).where(eq(schema.projectCreditWallets.projectId, project.id));
          await tx.insert(schema.projectCreditEvents).values({ projectId: project.id, actorId: currentUser.id, kind: "refill", action: "free_trial_credit_adjustment", subscriptionDelta: adjustment, idempotencyKey: adjustmentKey, metadata: { subscriptionId: subscription.id, credits: adjustment } });
        }
      }
    });
    response.status(201).json({ success: true, plan: "free" });
  });

  router.post("/billing/checkout", async (request, response) => {
    const input = planCheckoutInput.parse(request.body);
    const { currentUser, project } = await ownerProject(request, input.projectId);
    const current = await db.query.projectSubscriptions.findFirst({ where: eq(schema.projectSubscriptions.projectId, project.id) });
    const region = isActive(current) && current!.provider === "dodo" ? (current!.currency === "INR" ? "india" : "international") : regionFor(request);
    const currency = billingCurrency(region);
    const plan = pricing.foundation_plans.find((item) => item.id === input.planId)!;
    const price = (plan.prices as any)[region];
    const amount = input.interval === "month" ? price.monthly : price.annual_total;
    const products = getProductMap(environment);
    const productId = products.foundation[input.planId]?.[currency]?.[input.interval];
    if (!productId) throw new HttpError(503, `Dodo product is missing for ${input.planId} ${input.interval} ${currency}`, "billing_product_not_configured");
    if (isActive(current) && current!.provider === "dodo" && current!.providerSubscriptionId) {
      if (current!.plan === input.planId && current!.interval === input.interval) throw new HttpError(409, "This plan is already active", "plan_already_active");
      const idempotencyKey = request.header("idempotency-key")?.trim();
      if (!idempotencyKey || idempotencyKey.length > 255)
        throw new HttpError(400, "An Idempotency-Key is required for plan changes", "idempotency_key_required");
      const rank: Record<string, number> = { free: 0, launch: 1, scale: 2 };
      const tierUpgrade = (rank[input.planId] ?? 0) > (rank[current!.plan] ?? 0);
      const intervalChange = input.interval !== current!.interval;
      const effectiveAt = tierUpgrade && !intervalChange ? "immediately" : "next_billing_date";
      const changed = await dodoRequest<Record<string, any>>(environment, `/subscriptions/${encodeURIComponent(current!.providerSubscriptionId)}/change-plan`, {
        product_id: productId,
        quantity: 1,
        effective_at: effectiveAt,
        proration_billing_mode: effectiveAt === "immediately" ? "prorated_immediately" : "full_immediately",
        on_payment_failure: "prevent_change",
        metadata: { projectId: project.id, planId: input.planId, interval: input.interval, priceVersion: pricing.schema_version },
      }, idempotencyKey);
      if (effectiveAt === "next_billing_date") await db.update(schema.projectSubscriptions).set({ scheduledPlan: input.planId, scheduledInterval: input.interval, updatedAt: new Date() }).where(eq(schema.projectSubscriptions.id, current!.id));
      response.json({ success: true, scheduled: effectiveAt !== "immediately", checkoutUrl: typeof changed.payment_link === "string" ? changed.payment_link : null, message: effectiveAt === "immediately" ? "Plan change requested. Access updates after Dodo confirms it." : "Plan change scheduled for renewal." });
      return;
    }
    if (isActive(current) && current!.provider !== "free") throw new HttpError(409, "The current plan cannot be changed through Dodo", "subscription_change_unavailable");
    if (current && current.provider !== "free" && current.currentPeriodEnd && current.currentPeriodEnd > new Date() && !["expired", "cancelled"].includes(current.status))
      throw new HttpError(409, "The current subscription is still active or awaiting payment", "subscription_not_changeable");
    const checkout = await startCheckout(request, currentUser, project, {
      kind: "subscription", productId, currency, amount,
      metadata: { planId: input.planId, interval: input.interval, priceVersion: pricing.schema_version, region },
    });
    response.status(checkout.created ? 201 : 200).json({ checkoutUrl: checkout.checkoutUrl, checkoutId: checkout.checkoutId, ...(checkout.paid ? { message: "Payment is already confirmed." } : {}) });
  });

  router.post("/billing/topups/checkout", async (request, response) => {
    const input = topupInput.parse(request.body);
    const { currentUser, project } = await ownerProject(request, input.projectId);
    const subscription = await db.query.projectSubscriptions.findFirst({ where: eq(schema.projectSubscriptions.projectId, project.id) });
    if (!isActive(subscription) || !subscription || subscription.plan === "free") throw new HttpError(403, "Upgrade to Launch or Scale before buying AI credits", "topups_not_available");
    const region = subscription.currency === "INR" ? "india" : "international";
    const currency = billingCurrency(region);
    const pack = pricing.credit_topups.find((item) => item.id === input.packId)!;
    const amount = (pack.prices as any)[region] as number;
    const productId = getProductMap(environment).credits[input.packId]?.[currency];
    if (!productId) throw new HttpError(503, `Dodo product is missing for ${input.packId} ${currency}`, "billing_product_not_configured");
    const checkout = await startCheckout(request, currentUser, project, {
      kind: "credits", productId, currency, amount, credits: pack.credits,
      metadata: { packId: input.packId, priceVersion: pricing.schema_version, region },
    });
    response.status(checkout.created ? 201 : 200).json({ checkoutUrl: checkout.checkoutUrl, checkoutId: checkout.checkoutId, ...(checkout.paid ? { message: "Payment is already confirmed." } : {}) });
  });

  return router;
}
