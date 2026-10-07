import { Router } from "express";
import type { Request, Router as ExpressRouter } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, inArray, or } from "drizzle-orm";
import { schema } from "@velozy/db";
import type { Environment } from "../config/env.js";
import { decryptCredentials } from "../lib/integration-secrets.js";
import { HttpError } from "../middleware/errors.js";
import { createDb } from "@velozy/db";

const providers = ["stripe", "razorpay", "dodo", "shiprocket", "shippo", "easypost"] as const;
type Provider = (typeof providers)[number];

function rawBody(request: Request) {
  return Buffer.isBuffer(request.body) ? request.body : Buffer.from("");
}

function validSignature(expected: Buffer, signature: string) {
  const candidates = signature.split(/[ ,]+/).map((part) => part.replace(/^v\d+=/, ""));
  return candidates.some((part) => {
    const values = [Buffer.from(part, "hex"), Buffer.from(part, "base64")];
    return values.some((value) => value.length === expected.length && timingSafeEqual(expected, value));
  });
}

function verifySignature(provider: Provider, request: Request, body: Buffer, secret: string) {
  if (provider === "stripe") {
    const signature = request.header("stripe-signature") || "";
    const timestamp = signature.match(/(?:^|,)t=(\d+)/)?.[1];
    const signed = signature.match(/(?:^|,)v1=([^,]+)/)?.[1];
    if (!timestamp || !signed || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
    return validSignature(createHmac("sha256", secret).update(`${timestamp}.`).update(body).digest(), signed);
  }
  if (provider === "razorpay") {
    const signature = request.header("x-razorpay-signature") || "";
    return validSignature(createHmac("sha256", secret).update(body).digest(), signature);
  }
  if (provider === "dodo") {
    const id = request.header("webhook-id") || "";
    const timestamp = request.header("webhook-timestamp") || "";
    const signature = request.header("webhook-signature") || "";
    if (!id || !timestamp || !Number.isFinite(Number(timestamp)) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
    const key = secret.startsWith("whsec_") ? Buffer.from(secret.slice(6), "base64") : secret;
    return validSignature(createHmac("sha256", key).update(`${id}.${timestamp}.`).update(body).digest(), signature);
  }
  const signature = request.header(provider === "shippo" ? "x-shippo-signature" : provider === "easypost" ? "x-hmac-signature" : "x-shiprocket-signature") || "";
  if (!signature) return false;
  return validSignature(createHmac("sha256", secret).update(body).digest(), signature);
}

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" ? value as Record<string, any> : {};
}

function webhookIdentity(provider: Provider, event: Record<string, any>, request: Request) {
  const data = asObject(event.data);
  const object = asObject(data.object ?? (Object.keys(data).length ? data : undefined) ?? event.payload?.payment_link?.entity ?? event.payload?.payment?.entity ?? event);
  const metadata = asObject(object.metadata ?? object.notes ?? event.metadata);
  const orderId = String(metadata.orderId ?? metadata.order_id ?? object.reference_id ?? "");
  const projectId = String(metadata.projectId ?? metadata.project_id ?? "");
  const eventId = provider === "dodo"
    ? request.header("webhook-id") || String(event.id ?? "")
    : String(event.id ?? event.event_id ?? event.webhook_id ?? "");
  const type = String(event.type ?? event.event ?? event.event_type ?? "unknown");
  return { orderId, projectId, object, eventId, type };
}

function isPaid(provider: Provider, type: string, object: Record<string, any>) {
  if (provider === "stripe") return ["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(type) && object.payment_status === "paid";
  if (provider === "razorpay") return type === "payment_link.paid" || object.status === "paid";
  if (provider === "dodo") return /payment\.succeeded|checkout\.completed/i.test(type) || object.status === "succeeded";
  return false;
}

function minorUnits(amount: number, currency: string) {
  const zeroDecimal = ["BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF"].includes(currency.toUpperCase());
  return Math.round(amount * (zeroDecimal ? 1 : 100));
}

function verifyPaidOrder(provider: Provider, order: typeof schema.orders.$inferSelect, object: Record<string, any>) {
  const amount = provider === "stripe" ? object.amount_total
    : provider === "razorpay" ? (object.amount_paid ?? object.amount)
      : (object.total_amount ?? object.amount);
  const currency = object.currency;
  if (typeof amount !== "number" || !currency || currency.toUpperCase() !== order.currency.toUpperCase()) return false;
  if (minorUnits(Number(order.total), order.currency) !== amount) return false;
  const reference = provider === "razorpay" ? (object.payment_link_id ?? object.id)
    : (object.id ?? object.session_id);
  return !order.providerReference || !reference || String(reference) === order.providerReference;
}

function shipmentState(provider: Provider, event: Record<string, any>) {
  const payload = asObject(event.data ?? event);
  const object = asObject(payload.object ?? payload);
  const id = String(object.object_id ?? object.shipment_id ?? object.id ?? object.tracking_number ?? "");
  const trackingNumber = String(object.tracking_number ?? object.tracking_code ?? object.trackingCode ?? "");
  const state = String(object.status ?? object.tracking_status?.status ?? event.event ?? "in_transit").toLowerCase();
  const status = /deliver/.test(state) ? "delivered" : /exception|fail|return/.test(state) ? "exception" : /label|pre_transit|created/.test(state) ? "label_created" : "in_transit";
  const trackingUrl = String(object.tracking_url_provider ?? object.tracking_url ?? object.public_url ?? "");
  return { id, trackingNumber, trackingUrl, status };
}

export function providerWebhookRouter(environment: Environment): ExpressRouter {
  const db = createDb(environment.DATABASE_URL);
  const router = Router();
  router.post("/:provider", async (request, response) => {
    const provider = request.params.provider as Provider;
    if (!providers.includes(provider)) throw new HttpError(404, "Unknown provider webhook");
    const body = rawBody(request);
    let event: Record<string, any>;
    try { event = JSON.parse(body.toString("utf8")); }
    catch { throw new HttpError(400, "Invalid webhook body"); }

    const identity = webhookIdentity(provider, event, request);
    let integration = identity.projectId
      ? await db.query.integrations.findFirst({ where: and(eq(schema.integrations.projectId, identity.projectId), eq(schema.integrations.provider, provider)) })
      : undefined;
    let order = identity.orderId
      ? await db.query.orders.findFirst({ where: and(eq(schema.orders.id, identity.orderId), eq(schema.orders.provider, provider)) })
      : undefined;
    if (!order && identity.orderId) order = await db.query.orders.findFirst({ where: eq(schema.orders.id, identity.orderId) });
    if (!integration && order) integration = await db.query.integrations.findFirst({ where: and(eq(schema.integrations.projectId, order.projectId), eq(schema.integrations.provider, provider)) });
    const shipment = !order ? await db.query.shipments.findFirst({ where: and(eq(schema.shipments.provider, provider), or(eq(schema.shipments.externalShipmentId, shipmentState(provider, event).id), eq(schema.shipments.trackingNumber, shipmentState(provider, event).trackingNumber))) }) : undefined;
    if (!integration && shipment) integration = await db.query.integrations.findFirst({ where: and(eq(schema.integrations.projectId, shipment.projectId), eq(schema.integrations.provider, provider)) });
    if (!integration?.encryptedCredentials) throw new HttpError(404, "Provider integration not found");
    let credentials: Record<string, string>;
    try { credentials = decryptCredentials(environment.INTEGRATION_ENCRYPTION_KEY, integration.encryptedCredentials); }
    catch { throw new HttpError(503, "Provider webhook verification is unavailable"); }
    const signatureSecret = credentials.webhookSecret;
    if (!signatureSecret || !verifySignature(provider, request, body, signatureSecret))
      throw new HttpError(400, "Invalid provider webhook signature", "invalid_signature");
    if (!identity.eventId) throw new HttpError(400, "Provider event ID is required");

    if (order && ["stripe", "razorpay", "dodo"].includes(provider)) {
      const paid = isPaid(provider, identity.type, identity.object);
      if (paid && !verifyPaidOrder(provider, order, identity.object))
        throw new HttpError(400, "Paid amount or currency does not match the order", "payment_amount_mismatch");
      const inserted = await db.transaction(async (tx) => {
        const [eventReceipt] = await tx.insert(schema.integrationWebhookEvents).values({ projectId: order.projectId, provider, externalEventId: identity.eventId, eventType: identity.type }).onConflictDoNothing().returning({ id: schema.integrationWebhookEvents.id });
        if (eventReceipt && paid) {
          await tx.update(schema.orders).set({ status: "paid", updatedAt: new Date() }).where(and(
            eq(schema.orders.id, order.id),
            eq(schema.orders.projectId, order.projectId),
            eq(schema.orders.provider, provider),
            inArray(schema.orders.status, ["pending", "checkout_failed"]),
          ));
        }
        return eventReceipt;
      });
      return response.json({ received: true, duplicate: !inserted });
    }

    const currentShipment = shipment ?? (order ? await db.query.shipments.findFirst({ where: and(eq(schema.shipments.orderId, order.id), eq(schema.shipments.provider, provider)) }) : undefined);
    if (currentShipment) {
      const inserted = await db.transaction(async (tx) => {
        const [eventReceipt] = await tx.insert(schema.integrationWebhookEvents).values({ projectId: currentShipment.projectId, provider, externalEventId: identity.eventId, eventType: identity.type }).onConflictDoNothing().returning({ id: schema.integrationWebhookEvents.id });
        if (eventReceipt) {
        const state = shipmentState(provider, event);
        await tx.update(schema.shipments).set({ status: state.status, trackingNumber: state.trackingNumber || currentShipment.trackingNumber, trackingUrl: state.trackingUrl || currentShipment.trackingUrl, updatedAt: new Date() }).where(eq(schema.shipments.id, currentShipment.id));
        if (state.status === "delivered") await tx.update(schema.orders).set({ status: "fulfilled", updatedAt: new Date() }).where(and(eq(schema.orders.id, currentShipment.orderId), eq(schema.orders.projectId, currentShipment.projectId)));
        }
        return eventReceipt;
      });
      return response.json({ received: true, duplicate: !inserted });
    }
    response.json({ received: true, ignored: true });
  });
  return router;
}
