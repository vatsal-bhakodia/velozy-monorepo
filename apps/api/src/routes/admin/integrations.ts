import { Router } from "express";
import type { Request, Router as ExpressRouter } from "express";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@velozy/db";
import type { Environment } from "../../config/env.js";
import { adminAccess } from "../../lib/admin-auth.js";
import { decryptCredentials, encryptCredentials } from "../../lib/integration-secrets.js";
import { HttpError } from "../../middleware/errors.js";
import { buyShippingLabel, issueQuoteToken, readQuoteToken, shippingRates, type Address, type CartLine } from "../../lib/commerce-providers.js";

const providerNames = ["stripe", "razorpay", "dodo", "shiprocket", "shippo", "easypost"] as const;
const providerSchema = z.enum(providerNames);
const id = z.string().uuid();
const credentialFields: Record<(typeof providerNames)[number], string[]> = {
  stripe: ["secretKey", "webhookSecret"],
  razorpay: ["keyId", "keySecret", "webhookSecret"],
  dodo: ["apiKey", "webhookSecret"],
  shiprocket: ["email", "password", "webhookSecret"],
  shippo: ["apiToken", "webhookSecret"],
  easypost: ["apiKey", "webhookSecret"],
};

async function providerRequest(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(12_000) });
  if (!response.ok) {
    const message = (await response.text()).slice(0, 500);
    throw new Error(`Provider returned ${response.status}${message ? `: ${message}` : ""}`);
  }
  return response;
}

async function checkCredentials(provider: (typeof providerNames)[number], credentials: Record<string, string>, mode: string) {
  const basic = (username: string, password: string) => `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
  if (provider === "stripe") {
    await providerRequest("https://api.stripe.com/v1/account", { headers: { Authorization: `Bearer ${credentials.secretKey}` } });
  } else if (provider === "razorpay") {
    await providerRequest("https://api.razorpay.com/v1/payments?count=1", { headers: { Authorization: basic(credentials.keyId, credentials.keySecret) } });
  } else if (provider === "dodo") {
    const base = mode === "live" ? "https://live.dodopayments.com" : "https://test.dodopayments.com";
    await providerRequest(`${base}/products?page_size=1`, { headers: { Authorization: `Bearer ${credentials.apiKey}`, "Dodo-Version": "2025-03-01" } });
  } else if (provider === "shiprocket") {
    await providerRequest("https://apiv2.shiprocket.in/v1/external/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: credentials.email, password: credentials.password }),
    });
  } else if (provider === "shippo") {
    await providerRequest("https://api.goshippo.com/user", { headers: { Authorization: `ShippoToken ${credentials.apiToken}` } });
  } else {
    await providerRequest("https://api.easypost.com/v2/addresses", { headers: { Authorization: basic(credentials.apiKey, "") } });
  }
}

function presentIntegration(integration: typeof schema.integrations.$inferSelect) {
  const settings = (integration.settings as Record<string, unknown> | null) ?? {};
  return {
    id: integration.id,
    provider: integration.provider,
    status: integration.status,
    connected: Boolean(integration.encryptedCredentials) && integration.status === "connected",
    credentialsConfigured: Boolean(integration.encryptedCredentials),
    mode: settings.mode === "live" ? "live" : "test",
    enabled: settings.enabled === true,
    priority: typeof settings.priority === "number" ? settings.priority : 100,
    settings: { productMap: settings.productMap ?? {} },
    updatedAt: integration.updatedAt,
  };
}

export function adminIntegrationsRouter(environment: Environment): ExpressRouter {
  const { db, user, project } = adminAccess(environment.DATABASE_URL);
  const router = Router();
  const owned = async (request: Request, projectId: unknown) =>
    project(id.parse(projectId), (await user(request)).id, request.method === "GET" ? "commerce:read" : "commerce:write");

  router.get("/integrations", async (request, response) => {
    const currentProject = await owned(request, request.query.projectId);
    const rows = await db.query.integrations.findMany({
      where: eq(schema.integrations.projectId, currentProject.id),
    });
    response.json({ integrations: rows.map(presentIntegration) });
  });

  router.put("/integrations", async (request, response) => {
    const currentProject = await owned(request, request.body?.projectId);
    const provider = providerSchema.parse(request.body?.provider);
    const mode = z.enum(["test", "live"]).parse(request.body?.mode ?? "test");
    const enabled = z.boolean().default(false).parse(request.body?.enabled);
    const priority = z.number().int().min(0).max(1000).default(100).parse(request.body?.priority);
    const productMap = z.record(z.string().uuid(), z.string().trim().min(1).max(255)).default({}).parse(request.body?.productMap);
    const input = z.record(z.string(), z.string().trim().min(1).max(2000)).optional().parse(request.body?.credentials);
    const existing = await db.query.integrations.findFirst({
      where: and(eq(schema.integrations.projectId, currentProject.id), eq(schema.integrations.provider, provider)),
    });
    const previousCredentials = existing?.encryptedCredentials
      ? decryptCredentials(environment.INTEGRATION_ENCRYPTION_KEY, existing.encryptedCredentials)
      : {};
    const credentials: Record<string, string> = { ...previousCredentials, ...(input ?? {}) };
    for (const field of credentialFields[provider]) {
      if (!credentials[field]) throw new HttpError(400, `${field} is required`);
    }
    if (!environment.INTEGRATION_ENCRYPTION_KEY)
      throw new HttpError(503, "Provider setup is unavailable until INTEGRATION_ENCRYPTION_KEY is configured", "integration_encryption_unavailable");
    let encryptedCredentials;
    try { encryptedCredentials = encryptCredentials(environment.INTEGRATION_ENCRYPTION_KEY, credentials); }
    catch (error) { throw new HttpError(503, error instanceof Error ? error.message : "Integration encryption is unavailable"); }
    const settings = { mode, enabled, priority, productMap };
    const [integration] = await db.insert(schema.integrations).values({
      projectId: currentProject.id,
      provider,
      status: "pending",
      encryptedCredentials,
      settings,
    }).onConflictDoUpdate({
      target: [schema.integrations.projectId, schema.integrations.provider],
      set: { encryptedCredentials, settings, status: "pending", updatedAt: new Date() },
    }).returning();
    response.json({ integration: presentIntegration(integration) });
  });

  router.post("/integrations/:provider/test", async (request, response) => {
    const currentProject = await owned(request, request.body?.projectId);
    const provider = providerSchema.parse(request.params.provider);
    const integration = await db.query.integrations.findFirst({
      where: and(eq(schema.integrations.projectId, currentProject.id), eq(schema.integrations.provider, provider)),
    });
    if (!integration?.encryptedCredentials) throw new HttpError(404, "Save provider credentials before testing");
    try {
      const credentials = decryptCredentials(environment.INTEGRATION_ENCRYPTION_KEY, integration.encryptedCredentials);
      const mode = ((integration.settings as Record<string, unknown>)?.mode === "live") ? "live" : "test";
      await checkCredentials(provider, credentials, mode);
      const [updated] = await db.update(schema.integrations).set({ status: "connected", updatedAt: new Date() }).where(eq(schema.integrations.id, integration.id)).returning();
      response.json({ integration: presentIntegration(updated), message: "Provider credentials verified" });
    } catch (error) {
      await db.update(schema.integrations).set({ status: "error", updatedAt: new Date() }).where(eq(schema.integrations.id, integration.id));
      throw new HttpError(400, error instanceof Error ? error.message : "Provider credentials could not be verified", "provider_connection_failed");
    }
  });

  router.delete("/integrations/:provider", async (request, response) => {
    const currentProject = await owned(request, request.body?.projectId);
    const provider = providerSchema.parse(request.params.provider);
    await db.delete(schema.integrations).where(and(
      eq(schema.integrations.projectId, currentProject.id),
      eq(schema.integrations.provider, provider),
    ));
    response.json({ success: true });
  });

  router.get("/orders/:id/shipping-rates", async (request, response) => {
    const currentProject = await owned(request, request.query.projectId);
    const orderId = id.parse(request.params.id);
    const order = await db.query.orders.findFirst({ where: and(eq(schema.orders.id, orderId), eq(schema.orders.projectId, currentProject.id)) });
    if (!order) throw new HttpError(404, "Order not found");
    const metadata = (order.metadata as Record<string, any> | null) ?? {};
    const address = metadata.shippingAddress as Address | undefined;
    const origin = metadata.shippingOrigin as Address | undefined;
    const items = metadata.lineItems as CartLine[] | undefined;
    if (!address || !origin || !items?.length) throw new HttpError(400, "This order does not have complete shipping details");
    const integrations = await db.query.integrations.findMany({ where: eq(schema.integrations.projectId, currentProject.id) });
    const rates = await shippingRates(environment, integrations, origin, address, items, order.currency);
    response.json({ rates: rates.map((rate) => ({ ...rate, quoteToken: issueQuoteToken(environment, currentProject.id, address, rate, Date.now() + 10 * 60_000) })) });
  });

  router.get("/orders/:id/shipments", async (request, response) => {
    const currentProject = await owned(request, request.query.projectId);
    const orderId = id.parse(request.params.id);
    const order = await db.query.orders.findFirst({ where: and(eq(schema.orders.id, orderId), eq(schema.orders.projectId, currentProject.id)) });
    if (!order) throw new HttpError(404, "Order not found");
    response.json({ shipments: await db.query.shipments.findMany({ where: and(eq(schema.shipments.projectId, currentProject.id), eq(schema.shipments.orderId, order.id)) }) });
  });

  router.post("/orders/:id/shipments", async (request, response) => {
    const currentProject = await owned(request, request.body?.projectId);
    const orderId = id.parse(request.params.id);
    const order = await db.query.orders.findFirst({ where: and(eq(schema.orders.id, orderId), eq(schema.orders.projectId, currentProject.id)) });
    if (!order) throw new HttpError(404, "Order not found");
    if (!["paid", "processing"].includes(order.status)) throw new HttpError(409, "Only paid or processing orders can be shipped");
    const metadata = (order.metadata as Record<string, any> | null) ?? {};
    const address = metadata.shippingAddress as Address | undefined;
    if (!address) throw new HttpError(400, "This order does not have a shipping address");
    const quote = readQuoteToken(environment, z.string().min(1).parse(request.body?.quoteToken), currentProject.id, address);
    if (quote.provider === "manual") throw new HttpError(400, "Manual shipping rates do not have provider labels");
    const integration = await db.query.integrations.findFirst({ where: and(eq(schema.integrations.projectId, currentProject.id), eq(schema.integrations.provider, quote.provider)) });
    const integrationSettings = (integration?.settings as Record<string, any> | null) ?? {};
    if (!integration || integration.status !== "connected" || integrationSettings.enabled !== true) throw new HttpError(409, "The selected delivery provider is no longer enabled");
    const [reservation] = await db.insert(schema.shipments).values({ projectId: currentProject.id, orderId: order.id, provider: quote.provider, externalRateId: quote.rateId, amount: String(quote.amount), currency: quote.currency, status: "purchasing", metadata: { rateLabel: quote.label, shipmentId: quote.shipmentId ?? null } }).onConflictDoNothing().returning();
    if (!reservation) throw new HttpError(409, "A shipment label is already being purchased or exists for this order");
    try {
      const items = Array.isArray(metadata.lineItems) ? metadata.lineItems as CartLine[] : [];
      const result = await buyShippingLabel(environment, integration, { id: order.id, projectId: order.projectId, currency: order.currency, total: order.total, metadata, items }, quote);
      const [shipment] = await db.update(schema.shipments).set({ externalShipmentId: result.externalShipmentId, trackingNumber: result.trackingNumber, trackingUrl: result.trackingUrl, labelUrl: result.labelUrl, status: result.status, metadata: result.metadata, updatedAt: new Date() }).where(eq(schema.shipments.id, reservation.id)).returning();
      response.status(201).json({ shipment });
    } catch (error) {
      await db.delete(schema.shipments).where(eq(schema.shipments.id, reservation.id));
      throw new HttpError(502, error instanceof Error ? error.message : "Could not purchase shipping label", "shipping_label_failed");
    }
  });

  return router;
}
