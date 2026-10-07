import { Router } from "express";
import type { Request, Router as ExpressRouter } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { createDb, schema } from "@velozy/db";
import type { Environment } from "../config/env.js";
import { publicSiteUrl } from "../lib/public-site-url.js";
import { HttpError } from "../middleware/errors.js";
import { issueQuoteToken, readQuoteToken, shippingRates, startHostedCheckout, type Address, type CartLine, type Rate } from "../lib/commerce-providers.js";

const linesInput = z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(99) })).min(1).max(40);
const addressInput = z.object({
  name: z.string().trim().min(1).max(255),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(50).optional().default(""),
  address1: z.string().trim().min(1).max(255),
  address2: z.string().trim().max(255).optional().default(""),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(2).max(20),
  country: z.string().trim().length(2).transform((value) => value.toUpperCase()),
});
const customerInput = z.object({
  name: z.string().trim().min(1).max(255),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(50).optional().default(""),
  country: z.string().trim().length(2).transform((value) => value.toUpperCase()),
});

async function allowedOrigin(request: Request, project: typeof schema.projects.$inferSelect, db: ReturnType<typeof createDb>) {
  const origin = request.header("origin");
  if (!origin) return undefined;
  if (!project.subdomain) throw new HttpError(403, "This site is not configured for checkout");
  try {
    const parsed = new URL(origin);
    if (parsed.origin === new URL(publicSiteUrl(project.subdomain)).origin) return parsed.origin;
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const domain = await db.query.siteDomains.findFirst({ where: and(eq(schema.siteDomains.projectId, project.id), eq(schema.siteDomains.hostname, hostname), eq(schema.siteDomains.isVerified, true)) });
    if (domain && parsed.protocol === "https:" && !parsed.port) return parsed.origin;
  } catch { /* malformed Origin is rejected below */ }
  throw new HttpError(403, "Checkout origin does not match this published site");
}

async function publicProjectUrl(project: typeof schema.projects.$inferSelect, db: ReturnType<typeof createDb>) {
  const domain = await db.query.siteDomains.findFirst({ where: and(eq(schema.siteDomains.projectId, project.id), eq(schema.siteDomains.isCustom, true), eq(schema.siteDomains.isVerified, true)), columns: { hostname: true } });
  return domain ? `https://${domain.hostname}` : publicSiteUrl(project.subdomain || "");
}

function mapProduct(product: typeof schema.products.$inferSelect, quantity: number): CartLine {
  const unitPrice = Number(product.discountedPrice ?? product.price ?? 0);
  if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new HttpError(400, `Product ${product.name} has an invalid price`);
  return { id: product.id, name: product.name, quantity, unitPrice, productKind: product.productKind, weight: product.weight, dimensions: product.dimensions };
}

function shippingOrigin(data: unknown): Address | null {
  const value = (data as Record<string, any> | null)?.origin;
  const parsed = addressInput.safeParse({ ...value, email: value?.email || "shipping@invalid.local" });
  if (!parsed.success || !value?.postalCode) return null;
  return parsed.data;
}

function manualShippingRates(data: unknown, country: string, currency: string): Rate[] {
  const value = (data as Record<string, any> | null) ?? {};
  return (Array.isArray(value.zones) ? value.zones : []).flatMap((zone: Record<string, any>) => {
    const regions = String(zone.regions ?? "").split(/[\s,]+/).map((item) => item.toUpperCase()).filter(Boolean);
    const amount = Number(zone.rate);
    if (zone.active === false || !regions.includes(country) || !Number.isFinite(amount) || amount < 0) return [];
    return [{ provider: "manual" as const, rateId: String(zone.id), label: `${zone.name} · ${amount.toFixed(2)} ${currency}`, amount, currency }];
  });
}

export function publicCommerceRouter(environment: Environment): ExpressRouter {
  const db = createDb(environment.DATABASE_URL);
  const router = Router();
  router.get("/public/projects/:projectId/catalog", async (request, response) => {
    const project = await db.query.projects.findFirst({ where: and(eq(schema.projects.id, request.params.projectId), eq(schema.projects.isPublished, true)) });
    if (!project) throw new HttpError(404, "Published site not found");
    const products = await db.query.products.findMany({ where: and(eq(schema.products.projectId, project.id), eq(schema.products.status, "published"), eq(schema.products.isActive, true)), orderBy: [desc(schema.products.createdAt)] });
    response.json({ currency: project.currency, purchaseMode: project.purchaseMode, products: products.map((product) => ({ id: product.id, name: product.name, description: product.shortDescription || product.description || "", price: product.discountedPrice ?? product.price, currency: project.currency, productKind: product.productKind, weight: product.weight, dimensions: product.dimensions, image: Array.isArray(product.images) ? product.images[0] ?? "" : "" })) });
  });
  const loadProject = async (id: string) => {
    const project = await db.query.projects.findFirst({ where: and(eq(schema.projects.id, id), eq(schema.projects.isPublished, true)) });
    if (!project) throw new HttpError(404, "Published site not found");
    if (project.purchaseMode !== "checkout") throw new HttpError(409, "Online checkout is not enabled for this site");
    return project;
  };
  const loadLines = async (projectId: string, items: Array<{ productId: string; quantity: number }>) => {
    const productIds = [...new Set(items.map((item) => item.productId))];
    if (productIds.length !== items.length) throw new HttpError(400, "Remove duplicate product lines before checkout");
    const products = await db.query.products.findMany({ where: and(eq(schema.products.projectId, projectId), inArray(schema.products.id, productIds), eq(schema.products.status, "published"), eq(schema.products.isActive, true)) });
    if (products.length !== productIds.length) throw new HttpError(400, "One or more products are unavailable");
    const byId = new Map(products.map((product) => [product.id, product]));
    return items.map((item) => mapProduct(byId.get(item.productId)!, item.quantity));
  };

  router.post("/public/projects/:projectId/shipping-rates", async (request, response) => {
    const project = await loadProject(request.params.projectId);
    await allowedOrigin(request, project, db);
    const destination = addressInput.parse(request.body?.address);
    const items = linesInput.parse(request.body?.items);
    const lines = await loadLines(project.id, items);
    if (!lines.some((item) => item.productKind === "physical")) return response.json({ rates: [] });
    const setting = await db.query.commerceSettings.findFirst({ where: and(eq(schema.commerceSettings.projectId, project.id), eq(schema.commerceSettings.kind, "shipping")) });
    const origin = shippingOrigin(setting?.data);
    const manualRates = manualShippingRates(setting?.data, destination.country, project.currency);
    if (!origin) return response.json({ warning: "The store has not configured a complete ship-from address; showing manual shipping rates only.", rates: manualRates.map((rate) => ({ ...rate, quoteToken: issueQuoteToken(environment, project.id, destination, rate) })) });
    const integrations = await db.query.integrations.findMany({ where: eq(schema.integrations.projectId, project.id) });
    const liveRates = await shippingRates(environment, integrations, origin, destination, lines, project.currency);
    const rates = [...liveRates, ...manualRates].sort((left, right) => left.amount - right.amount).map((rate) => ({ ...rate, quoteToken: issueQuoteToken(environment, project.id, destination, rate) }));
    response.json({ rates });
  });

  router.post("/public/projects/:projectId/checkout/session", async (request, response) => {
    const project = await loadProject(request.params.projectId);
    const requestSiteUrl = await allowedOrigin(request, project, db);
    const idempotencyKey = z.string().uuid().parse(request.header("idempotency-key") || request.body?.idempotencyKey);
    const linesInputValue = linesInput.parse(request.body?.items);
    const customer = customerInput.parse(request.body?.customer);
    const lines = await loadLines(project.id, linesInputValue);
    const physical = lines.some((item) => item.productKind === "physical");
    if (lines.some((item) => item.productKind === "physical") && lines.some((item) => item.productKind !== "physical"))
      throw new HttpError(400, "Physical and digital products must be checked out separately");
    let rate: Rate | undefined;
    let origin: Address | null = null;
    const shippingAddress = physical
      ? addressInput.parse({ ...request.body?.shippingAddress, email: customer.email, name: request.body?.shippingAddress?.name || customer.name, phone: request.body?.shippingAddress?.phone || customer.phone })
      : undefined;
    if (physical) {
      if (typeof request.body?.shippingQuote !== "string") throw new HttpError(400, "Choose a shipping option before checkout");
      try { rate = readQuoteToken(environment, request.body.shippingQuote, project.id, shippingAddress); }
      catch (error) { throw new HttpError(400, error instanceof Error ? error.message : "Invalid shipping quote"); }
      const setting = await db.query.commerceSettings.findFirst({ where: and(eq(schema.commerceSettings.projectId, project.id), eq(schema.commerceSettings.kind, "shipping")) });
      origin = shippingOrigin(setting?.data);
    }
    const subtotal = lines.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const shippingAmount = rate?.amount ?? 0;
    const total = Math.round((subtotal + shippingAmount) * 1_000_000) / 1_000_000;

    const repeated = await db.query.orders.findFirst({ where: and(eq(schema.orders.projectId, project.id), eq(schema.orders.idempotencyKey, idempotencyKey)) });
    if (repeated) {
      const repeatedMetadata = (repeated.metadata as Record<string, any> | null) ?? {};
      if (repeatedMetadata.checkoutUrl) return response.json({ orderId: repeated.id, checkoutUrl: repeatedMetadata.checkoutUrl, reused: true });
      throw new HttpError(409, "A checkout request with this key is already processing");
    }

    let contact = await db.query.contacts.findFirst({ where: and(eq(schema.contacts.projectId, project.id), eq(schema.contacts.email, customer.email)) });
    if (contact) {
      [contact] = await db.update(schema.contacts).set({ name: customer.name, phone: customer.phone || null, updatedAt: new Date() }).where(eq(schema.contacts.id, contact.id)).returning();
    } else {
      [contact] = await db.insert(schema.contacts).values({ projectId: project.id, name: customer.name, email: customer.email, phone: customer.phone || null }).returning();
    }

    const paymentRows = await db.query.integrations.findMany({ where: eq(schema.integrations.projectId, project.id) });
    const paymentCandidates = paymentRows.filter((integration) => {
      const current = (integration.settings as Record<string, any> | null) ?? {};
      if (!["stripe", "razorpay", "dodo"].includes(integration.provider) || integration.status !== "connected" || current.enabled !== true) return false;
      if (integration.provider === "razorpay" && project.currency !== "INR") return false;
      if (integration.provider === "dodo" && lines.some((item) => item.productKind === "physical")) return false;
      return true;
    }).sort((left, right) => {
      const country = shippingAddress?.country ?? customer.country;
      const rank = (provider: string) => provider === "razorpay" && country === "IN" && project.currency === "INR" ? 0 : provider === "stripe" ? 1 : provider === "razorpay" ? 2 : 3;
      const a = (left.settings as Record<string, any> | null)?.priority ?? 100;
      const b = (right.settings as Record<string, any> | null)?.priority ?? 100;
      return rank(left.provider) - rank(right.provider) || a - b;
    });
    const paymentProvider = paymentCandidates[0];
    if (!paymentProvider) throw new HttpError(409, "No enabled payment provider supports this order currency and product type");
    const siteUrl = requestSiteUrl || await publicProjectUrl(project, db);
    const shippingMetadata = physical ? { shippingAddress, shippingOrigin: origin, shippingRate: rate } : {};
    const metadata = { ...shippingMetadata, lineItems: lines, currency: project.currency, subtotal, shipping: shippingAmount };
    let order: typeof schema.orders.$inferSelect;
    try {
      [order] = await db.transaction(async (tx) => {
        const [created] = await tx.insert(schema.orders).values({ projectId: project.id, contactId: contact?.id, status: "pending", currency: project.currency, subtotal: String(subtotal), total: String(total), provider: paymentProvider.provider, idempotencyKey, metadata }).returning();
        await tx.insert(schema.orderItems).values(lines.map((item) => ({ orderId: created.id, productId: item.id, name: item.name, quantity: item.quantity, unitPrice: String(item.unitPrice), metadata: { productKind: item.productKind, weight: item.weight, dimensions: item.dimensions } })));
        return [created];
      });
    } catch (error) {
      if ((error as { code?: string })?.code === "23505") throw new HttpError(409, "This checkout request was already submitted");
      throw error;
    }
    try {
      const session = await startHostedCheckout(environment, paymentProvider, { orderId: order.id, projectId: project.id, siteUrl, currency: project.currency, total, email: customer.email, items: lines });
      const checkoutMetadata = { ...metadata, checkoutUrl: session.url, providerMode: (paymentProvider.settings as Record<string, any>)?.mode ?? "test" };
      await db.update(schema.orders).set({ providerReference: session.reference, metadata: checkoutMetadata, updatedAt: new Date() }).where(and(eq(schema.orders.id, order.id), eq(schema.orders.projectId, project.id)));
      response.status(201).json({ orderId: order.id, checkoutUrl: session.url });
    } catch (error) {
      await db.update(schema.orders).set({ status: "checkout_failed", updatedAt: new Date() }).where(eq(schema.orders.id, order.id));
      throw new HttpError(502, error instanceof Error ? error.message : "Payment session could not be created", "checkout_provider_error");
    }
  });

  router.get("/public/projects/:projectId/orders/:orderId", async (request, response) => {
    const project = await loadProject(request.params.projectId);
    await allowedOrigin(request, project, db);
    const orderId = z.string().uuid().parse(request.params.orderId);
    const order = await db.query.orders.findFirst({ where: and(eq(schema.orders.projectId, project.id), eq(schema.orders.id, orderId)) });
    if (!order) throw new HttpError(404, "Order not found");
    response.json({ order: { id: order.id, status: order.status, currency: order.currency, total: order.total, provider: order.provider, createdAt: order.createdAt }, shipment: await db.query.shipments.findFirst({ where: eq(schema.shipments.orderId, order.id) }).then((shipment) => shipment ? { status: shipment.status, trackingNumber: shipment.trackingNumber, trackingUrl: shipment.trackingUrl } : null) });
  });

  return router;
}
