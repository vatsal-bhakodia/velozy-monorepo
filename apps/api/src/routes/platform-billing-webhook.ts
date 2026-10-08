import { Router } from "express";
import type { Request, Router as ExpressRouter } from "express";
import { and, eq, inArray } from "drizzle-orm";
import { createDb, schema } from "@velozy/db";
import type { Environment } from "../config/env.js";
import { HttpError } from "../middleware/errors.js";
import {
  addSubscriptionCredits,
  addPurchasedCredits,
  configuredDodo,
  currentCreditCycle,
  pricing,
  verifyPlatformDodoSignature,
} from "../lib/platform-billing.js";

function object(value: unknown): Record<string, any> {
  return value && typeof value === "object" ? value as Record<string, any> : {};
}

function eventData(event: Record<string, any>) {
  const data = object(event.data);
  return object(data.object ?? (Object.keys(data).length ? data : event));
}

function eventMetadata(event: Record<string, any>, data: Record<string, any>) {
  return object(data.metadata ?? data.subscription?.metadata ?? data.object?.metadata ?? event.metadata ?? {});
}

function eventDate(...values: unknown[]) {
  for (const value of values) {
    if (typeof value !== "string" && typeof value !== "number") continue;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return undefined;
}

function eventOccurredAt(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value))
    return new Date(value < 1_000_000_000_000 ? value * 1000 : value);
  return eventDate(value);
}

function confirmedAmount(data: Record<string, any>) {
  const baseAmount = data.subtotal ?? data.amount;
  if (baseAmount !== undefined && baseAmount !== null && baseAmount !== "")
    return { amount: Number(baseAmount), includesTax: false };
  const totalAmount = data.total_amount;
  if (totalAmount !== undefined && totalAmount !== null && totalAmount !== "")
    return { amount: Number(totalAmount), includesTax: true };
  return undefined;
}

function productId(data: Record<string, any>) {
  const cart = Array.isArray(data.product_cart) ? data.product_cart : [];
  return String(data.product_id ?? data.product?.product_id ?? data.subscription?.product_id ?? cart[0]?.product_id ?? "");
}

function planForProduct(configured: Record<string, any>, externalProductId: string) {
  if (!externalProductId) return undefined;
  for (const [planId, currencies] of Object.entries(configured.foundation ?? {})) {
    for (const [currency, intervals] of Object.entries(currencies as Record<string, any>)) {
      for (const [interval, configuredId] of Object.entries(intervals as Record<string, string>)) {
        if (configuredId === externalProductId) return { plan: planId, interval, currency };
      }
    }
  }
  return undefined;
}

function subscriptionStatus(type: string, data: Record<string, any>, existing?: typeof schema.projectSubscriptions.$inferSelect) {
  if (/^subscription\.(failed|payment_failed)$/.test(type)) return "past_due";
  if (type === "subscription.unpaused") return "active";
  if (/^subscription\.expired$/.test(type)) return "expired";
  if (/^subscription\.(cancelled|canceled)$/.test(type)) return "cancelled";
  if (/^subscription\.paused$/.test(type)) return "paused";
  const raw = String(data.status ?? data.subscription?.status ?? "").toLowerCase();
  if (["active", "trialing", "past_due", "on_hold", "paused", "cancelled", "canceled", "expired"].includes(raw)) return raw;
  if (/expired/.test(type)) return "expired";
  if (/cancelled|canceled/.test(type)) return "cancelled";
  if (/past_due|payment_failed|\.failed$/.test(type)) return "past_due";
  if (/active|renewed|created/.test(type)) return "active";
  return existing?.status ?? "pending";
}

export function platformBillingWebhookRouter(environment: Environment): ExpressRouter {
  const db = createDb(environment.DATABASE_URL);
  const router = Router();
  router.post("/platform/dodo", async (request: Request, response) => {
    const dodo = configuredDodo(environment);
    if (!Buffer.isBuffer(request.body)) throw new HttpError(400, "Invalid webhook body");
    const body = request.body as Buffer;
    let event: Record<string, any>;
    try { event = JSON.parse(body.toString("utf8")); }
    catch { throw new HttpError(400, "Invalid webhook body"); }
    const eventId = request.header("webhook-id") || String(event.id ?? "");
    const timestamp = request.header("webhook-timestamp") || "";
    const signature = request.header("webhook-signature") || "";
    if (!verifyPlatformDodoSignature(body, { id: eventId, timestamp, signature }, dodo.webhookSecret))
      throw new HttpError(400, "Invalid Dodo webhook signature", "invalid_signature");
    if (!eventId) throw new HttpError(400, "Dodo event ID is required");

    const data = eventData(event);
    const metadata = eventMetadata(event, data);
    const type = String(event.type ?? event.event_type ?? event.event ?? "unknown").toLowerCase();
    const checkoutId = String(metadata.billingCheckoutId ?? metadata.billing_checkout_id ?? "");
    const subscriptionData = { ...data, ...object(data.subscription) };
    const subscriptionId = String(subscriptionData.subscription_id ?? subscriptionData.id ?? "");
    const externalProductId = productId(subscriptionData);
    const occurredAt = eventOccurredAt(event.timestamp);

    const receipt = await db.transaction(async (tx) => {
      const [created] = await tx.insert(schema.platformBillingWebhookEvents).values({ providerEventId: eventId, eventType: type }).onConflictDoNothing().returning({ id: schema.platformBillingWebhookEvents.id });
      if (!created) return { duplicate: true };
      let checkout = checkoutId ? await tx.query.platformBillingCheckouts.findFirst({ where: eq(schema.platformBillingCheckouts.id, checkoutId) }) : undefined;
      if (!checkout) {
        const sessionId = String(data.checkout_session_id ?? data.checkout_id ?? data.session_id ?? "");
        if (sessionId) checkout = await tx.query.platformBillingCheckouts.findFirst({ where: eq(schema.platformBillingCheckouts.providerSessionId, sessionId) });
      }

      if (/payment\.(succeeded|paid)|checkout\.completed/.test(type) || data.status === "succeeded") {
        if (!checkout) throw new HttpError(404, "Dodo payment does not match a platform checkout", "billing_checkout_not_found");
        if (externalProductId && externalProductId !== checkout.productId) throw new HttpError(400, "Dodo product does not match this checkout", "billing_product_mismatch");
        const amount = confirmedAmount(data);
        const currency = String(data.currency ?? "").toUpperCase();
        const amountMatches = amount && Number.isSafeInteger(amount.amount) && (amount.includesTax ? amount.amount >= checkout.amount : amount.amount === checkout.amount);
        if (currency !== checkout.currency || !amountMatches)
          throw new HttpError(400, "Dodo amount or currency does not match this checkout", "billing_amount_mismatch");
        const [paidCheckout] = await tx.update(schema.platformBillingCheckouts).set({ status: "paid", updatedAt: new Date() }).where(and(
          eq(schema.platformBillingCheckouts.id, checkout.id),
          inArray(schema.platformBillingCheckouts.status, ["pending", "failed"]),
        )).returning({ id: schema.platformBillingCheckouts.id });
        if (paidCheckout && checkout.kind === "credits") await addPurchasedCredits(tx, checkout.projectId, checkout.credits, checkout.actorId, checkout.id);
      }

      if (/^subscription\./.test(type)) {
        const checkoutMetadata = object(checkout?.metadata);
        const existingByProviderId = subscriptionId
          ? await tx.query.projectSubscriptions.findFirst({ where: and(eq(schema.projectSubscriptions.provider, "dodo"), eq(schema.projectSubscriptions.providerSubscriptionId, subscriptionId)) })
          : undefined;
        const projectId = String(metadata.projectId ?? metadata.project_id ?? checkout?.projectId ?? existingByProviderId?.projectId ?? "");
        if (projectId) {
          // Serialize subscription updates per project so the timestamp check also
          // protects against two out-of-order deliveries running concurrently.
          await tx.select({ id: schema.projects.id }).from(schema.projects).where(eq(schema.projects.id, projectId)).for("update");
          const existing = await tx.query.projectSubscriptions.findFirst({ where: eq(schema.projectSubscriptions.projectId, projectId) });
          const configured = JSON.parse(environment.DODO_PLATFORM_PRODUCTS_JSON || "{}") as Record<string, any>;
          const product = planForProduct(configured, externalProductId);
          let plan = String(product?.plan ?? metadata.planId ?? metadata.plan_id ?? checkoutMetadata.planId ?? existing?.plan ?? "");
          let interval = String(product?.interval ?? metadata.interval ?? checkoutMetadata.interval ?? existing?.interval ?? "month");
          plan ||= existing?.plan ?? "";
          const planRecord = pricing.foundation_plans.find((item) => item.id === plan);
          if (planRecord && subscriptionId) {
            const existingMetadata = object(existing?.metadata);
            const lastEventAt = eventDate(existingMetadata.dodoEventTimestamp);
            if (occurredAt && lastEventAt && occurredAt < lastEventAt) return { duplicate: false, staleSubscriptionEvent: true };
            const region = checkoutMetadata.region === "india" || product?.currency === "INR" ? "india" : String(subscriptionData.currency ?? checkout?.currency ?? existing?.currency ?? "USD").toUpperCase() === "INR" ? "india" : "international";
            const amount = region === "india" ? (planRecord.prices as any).india : (planRecord.prices as any).international;
            const priceAmount = interval === "year" ? amount.annual_total : amount.monthly;
            const currentPeriodStart = eventDate(subscriptionData.current_period_start, subscriptionData.previous_billing_date, subscriptionData.billing_period_start, subscriptionData.created_at) ?? existing?.currentPeriodStart ?? new Date();
            const currentPeriodEnd = eventDate(subscriptionData.current_period_end, subscriptionData.next_billing_date, subscriptionData.billing_period_end) ?? existing?.currentPeriodEnd ?? null;
            const status = subscriptionStatus(type, subscriptionData, existing);
            let cancelAtPeriodEnd = existing?.cancelAtPeriodEnd ?? null;
            if (Object.hasOwn(subscriptionData, "cancel_at_next_billing_date"))
              cancelAtPeriodEnd = subscriptionData.cancel_at_next_billing_date ? currentPeriodEnd : null;
            else if (Object.hasOwn(subscriptionData, "cancel_at_period_end")) {
              const cancellation = subscriptionData.cancel_at_period_end;
              cancelAtPeriodEnd = typeof cancellation === "boolean" ? cancellation ? currentPeriodEnd : null : eventDate(cancellation) ?? null;
            }
            let scheduledPlan = existing?.scheduledPlan ?? null;
            let scheduledInterval = existing?.scheduledInterval ?? null;
            if (metadata.scheduledPlan) scheduledPlan = String(metadata.scheduledPlan);
            if (metadata.scheduledInterval) scheduledInterval = String(metadata.scheduledInterval);
            if (Object.hasOwn(subscriptionData, "scheduled_change")) {
              const scheduledChange = object(subscriptionData.scheduled_change);
              const scheduledProduct = planForProduct(configured, String(scheduledChange.product_id ?? scheduledChange.product?.product_id ?? ""));
              scheduledPlan = scheduledProduct?.plan ?? null;
              scheduledInterval = scheduledProduct?.interval ?? null;
            }
            if (scheduledPlan === plan && (!scheduledInterval || scheduledInterval === interval)) {
              scheduledPlan = null;
              scheduledInterval = null;
            }
            const currency = String(subscriptionData.currency ?? checkout?.currency ?? existing?.currency ?? "USD").toUpperCase();
            const priceVersion = String(metadata.priceVersion ?? checkoutMetadata.priceVersion ?? existing?.priceVersion ?? pricing.schema_version);
            const providerCustomerId = String(subscriptionData.customer_id ?? subscriptionData.customer?.customer_id ?? existing?.providerCustomerId ?? "") || null;
            const subscriptionMetadata = {
              ...existingMetadata,
              dodoProductId: externalProductId || existingMetadata.dodoProductId,
              lastEvent: type,
              ...(occurredAt ? { dodoEventTimestamp: occurredAt.toISOString() } : {}),
            };
            await tx.insert(schema.projectSubscriptions).values({
              projectId,
              provider: "dodo",
              providerSubscriptionId: subscriptionId,
              providerCustomerId,
              plan,
              interval,
              status,
              currency,
              priceAmount,
              priceVersion,
              currentPeriodStart,
              currentPeriodEnd,
              cancelAtPeriodEnd,
              scheduledPlan,
              scheduledInterval,
              metadata: subscriptionMetadata,
            }).onConflictDoUpdate({ target: schema.projectSubscriptions.projectId, set: {
              provider: "dodo", providerSubscriptionId: subscriptionId,
              providerCustomerId,
              plan, interval, status, currency, priceAmount,
              priceVersion, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd,
              scheduledPlan, scheduledInterval,
              metadata: subscriptionMetadata, updatedAt: new Date(),
            } });
            if (["active", "trialing"].includes(status) && currentPeriodEnd) {
              const allowance = planRecord.id === "free" ? 0 : planRecord.included_ai_credits_per_month;
              const cycle = currentCreditCycle(currentPeriodStart, currentPeriodEnd);
              await addSubscriptionCredits(tx, projectId, allowance, checkout?.actorId ?? null, cycle.start, cycle.end, subscriptionId);
            }
          }
        }
      }
      return { duplicate: false };
    });
    response.json({ received: true, duplicate: receipt.duplicate });
  });
  return router;
}
