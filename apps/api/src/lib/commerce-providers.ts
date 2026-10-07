import { createHmac, timingSafeEqual } from "node:crypto";
import type { Environment } from "../config/env.js";
import type { EncryptedCredentials } from "./integration-secrets.js";
import { decryptCredentials } from "./integration-secrets.js";

export type CommerceProvider = "stripe" | "razorpay" | "dodo" | "shiprocket" | "shippo" | "easypost";
export type CartLine = { id: string; name: string; quantity: number; unitPrice: number; productKind: string; weight: number | null; dimensions: unknown };
export type Address = { name: string; email?: string; phone?: string; address1: string; address2?: string; city: string; state: string; postalCode: string; country: string };
export type Rate = { provider: CommerceProvider | "manual"; rateId: string; shipmentId?: string; label: string; amount: number; currency: string; estimatedDays?: number };

type Integration = { provider: string; status: string; encryptedCredentials: unknown; settings: unknown };

function credentials(environment: Environment, integration: Integration) {
  return decryptCredentials(environment.INTEGRATION_ENCRYPTION_KEY, integration.encryptedCredentials);
}

function settings(integration: Integration) {
  return (integration.settings as Record<string, any> | null) ?? {};
}

async function requestJson(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message ?? data?.message ?? data?.detail ?? `Provider returned ${response.status}`;
    throw new Error(String(message).slice(0, 300));
  }
  return data;
}

function authBasic(user: string, password: string) {
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

function minorUnits(amount: number, currency: string) {
  const zeroDecimal = ["BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF"].includes(currency.toUpperCase());
  return Math.round(amount * (zeroDecimal ? 1 : 100));
}

function normalizedAddress(address: Address) {
  return {
    name: address.name,
    phone: address.phone || "",
    street1: address.address1,
    street2: address.address2 || "",
    city: address.city,
    state: address.state,
    zip: address.postalCode,
    country: address.country.toUpperCase(),
    email: address.email || "",
  };
}

function parcelFor(items: CartLine[]) {
  const physical = items.filter((item) => item.productKind === "physical");
  const weightGrams = Math.max(500, physical.reduce((sum, item) => sum + Math.max(1, item.weight ?? 500) * item.quantity, 0));
  const dimensions = physical.map((item) => {
    const value = item.dimensions && typeof item.dimensions === "object" ? item.dimensions as Record<string, unknown> : {};
    const dimension = (key: string, fallback: number) => {
      const parsed = Number(value[key]);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    };
    return { length: dimension("length", 20), width: dimension("width", 15), height: dimension("height", 10), quantity: item.quantity };
  });
  return {
    weightGrams,
    lengthCm: Math.max(20, ...dimensions.map((item) => item.length)),
    widthCm: Math.max(15, ...dimensions.map((item) => item.width)),
    heightCm: Math.max(10, dimensions.reduce((sum, item) => sum + item.height * item.quantity, 0)),
  };
}

export function issueQuoteToken(environment: Environment, projectId: string, address: Address, rate: Rate, expiresAt = Date.now() + 30 * 60_000) {
  if (!environment.INTEGRATION_ENCRYPTION_KEY) throw new Error("Shipping quote signing is unavailable");
  const body = Buffer.from(JSON.stringify({ projectId, address: normalizedAddress(address), rate, expiresAt })).toString("base64url");
  const key = Buffer.from(environment.INTEGRATION_ENCRYPTION_KEY, "hex");
  const signature = createHmac("sha256", key).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function readQuoteToken(environment: Environment, token: string, projectId: string, address?: Address) {
  const [body, signature] = token.split(".");
  if (!body || !signature || !environment.INTEGRATION_ENCRYPTION_KEY) throw new Error("Invalid shipping quote");
  const key = Buffer.from(environment.INTEGRATION_ENCRYPTION_KEY, "hex");
  const expected = createHmac("sha256", key).update(body).digest();
  const supplied = Buffer.from(signature, "base64url");
  if (supplied.length !== expected.length || !timingSafeEqual(expected, supplied)) throw new Error("Invalid shipping quote");
  const value = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { projectId: string; address: ReturnType<typeof normalizedAddress>; rate: Rate; expiresAt: number };
  if (value.projectId !== projectId || value.expiresAt < Date.now()) throw new Error("Shipping quote has expired; request rates again");
  if (address && JSON.stringify(value.address) !== JSON.stringify(normalizedAddress(address))) throw new Error("Shipping quote does not match this address");
  return value.rate;
}

async function shiprocketToken(environment: Environment, integration: Integration) {
  const secret = credentials(environment, integration);
  const data = await requestJson("https://apiv2.shiprocket.in/v1/external/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: secret.email, password: secret.password }),
  });
  return data.token as string;
}

export async function shippingRates(
  environment: Environment,
  integrations: Integration[],
  origin: Address,
  destination: Address,
  items: CartLine[],
  currency: string,
): Promise<Rate[]> {
  const result: Rate[] = [];
  const physical = items.filter((item) => item.productKind === "physical");
  if (!physical.length) return result;
  const parcel = parcelFor(physical);
  const { weightGrams } = parcel;
  const candidates = integrations.filter((item) => item.status === "connected" && settings(item).enabled === true);
  for (const integration of candidates) {
    try {
      if (integration.provider === "shiprocket" && destination.country.toUpperCase() === "IN" && currency.toUpperCase() === "INR") {
        const token = await shiprocketToken(environment, integration);
        const params = new URLSearchParams({ pickup_postcode: origin.postalCode, delivery_postcode: destination.postalCode, weight: String(weightGrams / 1000), cod: "0", declared_value: String(physical.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)) });
        const data = await requestJson(`https://apiv2.shiprocket.in/v1/external/courier/serviceability/?${params}`, { headers: { Authorization: `Bearer ${token}` } });
        for (const courier of data.data?.available_courier_companies ?? []) result.push({ provider: "shiprocket", rateId: String(courier.courier_company_id), label: String(courier.courier_name), amount: Number(courier.rate), currency, estimatedDays: Number(courier.etd?.match?.(/\d+/)?.[0]) || undefined });
      } else if (integration.provider === "shippo" && destination.country.toUpperCase() === "US") {
        const secret = credentials(environment, integration);
        const shippoParcel = { length: String(parcel.lengthCm), width: String(parcel.widthCm), height: String(parcel.heightCm), distance_unit: "cm", weight: String(weightGrams), mass_unit: "g" };
        const data = await requestJson("https://api.goshippo.com/shipments/", { method: "POST", headers: { Authorization: `ShippoToken ${secret.apiToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ address_from: normalizedAddress(origin), address_to: normalizedAddress(destination), parcels: [shippoParcel], async: false }) });
        for (const rate of data.rates ?? []) result.push({ provider: "shippo", rateId: String(rate.object_id), shipmentId: String(data.object_id), label: `${rate.provider} ${rate.servicelevel?.name ?? "Shipping"}`, amount: Number(rate.amount), currency: String(rate.currency), estimatedDays: Number(rate.estimated_days) || undefined });
      } else if (integration.provider === "easypost" && destination.country.toUpperCase() === "US") {
        const secret = credentials(environment, integration);
        const data = await requestJson("https://api.easypost.com/v2/shipments", { method: "POST", headers: { Authorization: authBasic(secret.apiKey, ""), "Content-Type": "application/json" }, body: JSON.stringify({ shipment: { to_address: normalizedAddress(destination), from_address: normalizedAddress(origin), parcel: { length: parcel.lengthCm / 2.54, width: parcel.widthCm / 2.54, height: parcel.heightCm / 2.54, weight: weightGrams / 28.3495 } } }) });
        for (const rate of data.rates ?? []) result.push({ provider: "easypost", rateId: String(rate.id), shipmentId: String(data.id), label: `${rate.carrier} ${rate.service}`, amount: Number(rate.rate), currency: String(rate.currency), estimatedDays: Number(rate.delivery_days) || undefined });
      }
    } catch (error) {
      console.error(`Shipping rate lookup failed for ${integration.provider}:`, error);
    }
  }
  return result.filter((rate) => Number.isFinite(rate.amount) && rate.amount >= 0 && rate.currency.toUpperCase() === currency.toUpperCase()).sort((left, right) => left.amount - right.amount);
}

export async function startHostedCheckout(
  environment: Environment,
  integration: Integration,
  input: { orderId: string; projectId: string; siteUrl: string; currency: string; total: number; email: string; items: CartLine[] },
) {
  const secret = credentials(environment, integration);
  const mode = settings(integration).mode === "live" ? "live" : "test";
  if (integration.provider === "stripe") {
    const base = new URLSearchParams();
    base.set("mode", "payment");
    base.set("success_url", `${input.siteUrl}/checkout/success?order=${input.orderId}&session_id={CHECKOUT_SESSION_ID}`);
    base.set("cancel_url", `${input.siteUrl}/checkout/cancel?order=${input.orderId}`);
    base.set("customer_email", input.email);
    base.set("client_reference_id", input.orderId);
    base.set("metadata[orderId]", input.orderId);
    base.set("metadata[projectId]", input.projectId);
    input.items.forEach((item, index) => {
      base.set(`line_items[${index}][price_data][currency]`, input.currency.toLowerCase());
      base.set(`line_items[${index}][price_data][unit_amount]`, String(minorUnits(item.unitPrice, input.currency)));
      base.set(`line_items[${index}][price_data][product_data][name]`, item.name);
      base.set(`line_items[${index}][quantity]`, String(item.quantity));
    });
    const shipAmount = Math.max(0, input.total - input.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0));
    if (shipAmount) {
      const index = input.items.length;
      base.set(`line_items[${index}][price_data][currency]`, input.currency.toLowerCase());
      base.set(`line_items[${index}][price_data][unit_amount]`, String(minorUnits(shipAmount, input.currency)));
      base.set(`line_items[${index}][price_data][product_data][name]`, "Shipping");
      base.set(`line_items[${index}][quantity]`, "1");
    }
    const data = await requestJson("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { Authorization: `Bearer ${secret.secretKey}`, "Content-Type": "application/x-www-form-urlencoded" }, body: base });
    return { url: String(data.url), reference: String(data.id) };
  }
  if (integration.provider === "razorpay") {
    const notes = { orderId: input.orderId, projectId: input.projectId };
    const data = await requestJson("https://api.razorpay.com/v1/payment_links", { method: "POST", headers: { Authorization: authBasic(secret.keyId, secret.keySecret), "Content-Type": "application/json" }, body: JSON.stringify({ amount: minorUnits(input.total, input.currency), currency: input.currency.toUpperCase(), reference_id: input.orderId, description: `Order ${input.orderId}`, customer: { email: input.email }, notes, callback_url: `${input.siteUrl}/checkout/success?order=${input.orderId}`, callback_method: "get" }) });
    return { url: String(data.short_url), reference: String(data.id) };
  }
  if (integration.provider === "dodo") {
    const base = mode === "live" ? "https://live.dodopayments.com" : "https://test.dodopayments.com";
    const map = settings(integration).productMap ?? {};
    const productCart = input.items.map((item) => ({ product_id: map[item.id], quantity: item.quantity }));
    if (productCart.some((item) => !item.product_id)) throw new Error("Map each non-physical product to a Dodo product before using Dodo checkout");
    const data = await requestJson(`${base}/checkouts`, { method: "POST", headers: { Authorization: `Bearer ${secret.apiKey}`, "Dodo-Version": "2025-03-01", "Content-Type": "application/json" }, body: JSON.stringify({ product_cart: productCart, customer: { email: input.email }, return_url: `${input.siteUrl}/checkout/success?order=${input.orderId}`, metadata: { orderId: input.orderId, projectId: input.projectId } }) });
    return { url: String(data.checkout_url), reference: String(data.session_id ?? data.id) };
  }
  throw new Error("The selected integration is not a payment provider");
}

export async function buyShippingLabel(environment: Environment, integration: Integration, order: { id: string; projectId: string; currency: string; total: string; metadata: unknown; items: CartLine[] }, rate: Rate) {
  const secret = credentials(environment, integration);
  if (rate.provider === "shippo") {
    const data = await requestJson("https://api.goshippo.com/transactions/", { method: "POST", headers: { Authorization: `ShippoToken ${secret.apiToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ rate: rate.rateId, label_file_type: "PDF", async: false }) });
    if (data.status !== "SUCCESS") throw new Error(data.messages?.[0]?.text || "Shippo could not purchase this label");
    return { provider: "shippo", externalShipmentId: String(data.object_id), trackingNumber: String(data.tracking_number || ""), trackingUrl: String(data.tracking_url_provider || ""), labelUrl: String(data.label_url || ""), amount: rate.amount, currency: rate.currency, status: "label_created", metadata: { rateId: rate.rateId } };
  }
  if (rate.provider === "easypost") {
    const data = await requestJson(`https://api.easypost.com/v2/shipments/${rate.shipmentId}/buy`, { method: "POST", headers: { Authorization: authBasic(secret.apiKey, ""), "Content-Type": "application/json" }, body: JSON.stringify({ rate: { id: rate.rateId } }) });
    return { provider: "easypost", externalShipmentId: String(data.id), trackingNumber: String(data.tracking_code || ""), trackingUrl: String(data.tracker?.public_url || ""), labelUrl: String(data.postage_label?.label_url || ""), amount: rate.amount, currency: rate.currency, status: "label_created", metadata: { rateId: rate.rateId } };
  }
  if (rate.provider === "shiprocket") {
    const token = await shiprocketToken(environment, integration);
    const data = (order.metadata as Record<string, any>) ?? {};
    const destination = data.shippingAddress as Address;
    const origin = data.shippingOrigin as Address;
    const parcel = parcelFor(order.items);
    const orderData = await requestJson("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ order_id: order.id, order_date: new Date().toISOString().slice(0, 10), pickup_location: "Primary", billing_customer_name: destination.name, billing_last_name: "", billing_address: `${destination.address1} ${destination.address2 || ""}`.trim(), billing_city: destination.city, billing_pincode: destination.postalCode, billing_state: destination.state, billing_country: destination.country, billing_email: destination.email || "", billing_phone: destination.phone || "", shipping_is_billing: true, order_items: order.items.map((item) => ({ name: item.name, sku: item.id, units: item.quantity, selling_price: item.unitPrice })), payment_method: "Prepaid", sub_total: Number(data.subtotal ?? order.total), length: parcel.lengthCm, breadth: parcel.widthCm, height: parcel.heightCm, weight: parcel.weightGrams / 1000, pickup_postcode: origin.postalCode }) });
    const shipmentId = String(orderData.shipment_id ?? orderData.order_id);
    const awb = await requestJson("https://apiv2.shiprocket.in/v1/external/courier/assign/awb", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ shipment_id: shipmentId, courier_id: Number(rate.rateId) }) });
    const awbData = awb.response?.data ?? awb.data ?? {};
    const trackingNumber = String(awbData.awb_code || "");
    const label = await requestJson("https://apiv2.shiprocket.in/v1/external/courier/generate/label", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ shipment_id: [shipmentId] }) });
    return { provider: "shiprocket", externalShipmentId: shipmentId, trackingNumber, trackingUrl: trackingNumber ? `https://www.shiprocket.in/shipment-tracking/${trackingNumber}` : "", labelUrl: String(label.label_url || label.url || ""), amount: rate.amount, currency: rate.currency, status: "label_created", metadata: { courierId: rate.rateId, shiprocketOrderId: String(orderData.order_id ?? "") } };
  }
  throw new Error("Unsupported shipping provider");
}
