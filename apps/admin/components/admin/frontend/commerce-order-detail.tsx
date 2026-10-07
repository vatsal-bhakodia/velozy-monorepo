"use client";

import { apiFetch } from "@/src/lib/api";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "@/src/lib/navigation";
import { toast } from "sonner";
import { useAdmin } from "@/src/admin-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageFrame, SectionCard, StatusPill } from "./page-frame";

type Mode = "order" | "payment" | "fulfillment" | "invoice";
type Order = {
  id: string;
  status: string;
  currency: string;
  total: string;
  provider: string | null;
  createdAt: string;
  customerName: string | null;
  customerEmail: string | null;
  metadata?: Record<string, unknown> | null;
};
type DeliveryRate = { provider: string; label: string; amount: number; currency: string; quoteToken: string; estimatedDays?: number };
type Shipment = { id: string; provider: string; status: string; trackingNumber: string | null; trackingUrl: string | null; labelUrl: string | null; amount: string | null; currency: string | null };
const statuses: Record<Mode, string[]> = {
  order: [
    "pending",
    "processing",
    "paid",
    "fulfilled",
    "completed",
    "cancelled",
    "refunded",
  ],
  payment: ["pending", "paid", "failed", "refunded"],
  fulfillment: ["pending", "processing", "fulfilled", "cancelled"],
  invoice: ["pending", "issued", "paid", "void"],
};

export function CommerceOrderDetail({ mode }: { mode: Mode }) {
  const { selectedProjectId } = useAdmin();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState("pending");
  const [note, setNote] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deliveryRates, setDeliveryRates] = useState<DeliveryRate[]>([]);
  const [selectedRate, setSelectedRate] = useState("");
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [buyingLabel, setBuyingLabel] = useState(false);

  useEffect(() => {
    if (!selectedProjectId || !params.id) return;
    apiFetch(`/api/admin/orders?projectId=${selectedProjectId}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to load order");
        const item = ((await response.json()).orders ?? []).find(
          (candidate: Order) => candidate.id === params.id,
        );
        if (!item) throw new Error("Order not found");
        setOrder(item);
        setStatus(
          mode === "invoice"
            ? String(item.metadata?.invoiceStatus ?? "pending")
            : item.status,
        );
        setNote(String(item.metadata?.adminNote ?? ""));
        setTrackingNumber(String(item.metadata?.trackingNumber ?? ""));
        setInvoiceNumber(String(item.metadata?.invoiceNumber ?? ""));
        const [shipmentResponse] = await Promise.all([
          apiFetch(`/api/admin/orders/${item.id}/shipments?projectId=${selectedProjectId}`),
        ]);
        if (shipmentResponse.ok) setShipment((await shipmentResponse.json()).shipments?.[0] ?? null);
      })
      .catch((error) => {
        console.error(error);
        toast.error("Failed to load order");
        const view = {
          order: "orders",
          payment: "payments",
          fulfillment: "fulfillment",
          invoice: "invoices",
        }[mode];
        router.push(`/commerce/sales?view=${view}`);
      })
      .finally(() => setLoading(false));
  }, [mode, params.id, router, selectedProjectId]);

  const save = async () => {
    if (!order || !selectedProjectId) return;
    setSaving(true);
    try {
      const response = await apiFetch("/api/admin/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          id: order.id,
          status: mode === "invoice" ? order.status : status,
          invoiceStatus: mode === "invoice" ? status : undefined,
          invoiceNumber: mode === "invoice" ? invoiceNumber : undefined,
          note,
          trackingNumber,
        }),
      });
      if (!response.ok) throw new Error("Failed to update order");
      setOrder((current) =>
        current
          ? {
              ...current,
              status: mode === "invoice" ? current.status : status,
              metadata: {
                ...(current.metadata ?? {}),
                adminNote: note,
                trackingNumber,
                ...(mode === "invoice"
                  ? { invoiceStatus: status, invoiceNumber }
                  : {}),
              },
            }
          : current,
      );
      toast.success("Order workflow updated");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update order");
    } finally {
      setSaving(false);
    }
  };

  const loadShippingRates = async () => {
    if (!order || !selectedProjectId) return;
    setLoadingRates(true);
    try {
      const response = await apiFetch(`/api/admin/orders/${order.id}/shipping-rates?projectId=${selectedProjectId}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load delivery rates");
      setDeliveryRates(data.rates ?? []);
      setSelectedRate(data.rates?.[0]?.quoteToken ?? "");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not load delivery rates"); }
    finally { setLoadingRates(false); }
  };

  const purchaseLabel = async () => {
    if (!order || !selectedProjectId || !selectedRate) return;
    setBuyingLabel(true);
    try {
      const response = await apiFetch(`/api/admin/orders/${order.id}/shipments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: selectedProjectId, quoteToken: selectedRate }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not purchase label");
      setShipment(data.shipment);
      toast.success("Shipping label created");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not purchase shipping label"); }
    finally { setBuyingLabel(false); }
  };

  const title =
    mode === "order"
      ? "Order details"
      : mode === "payment"
        ? "Payment details"
        : mode === "fulfillment"
          ? "Fulfillment details"
          : "Invoice details";
  return (
    <PageFrame
      title={title}
      description={
        order
          ? `Order #${order.id.slice(0, 8)} · ${order.customerName ?? "Guest customer"}`
          : "Review and update this commerce record."
      }
    >
      {loading ? (
        <p className="py-12 text-center text-sm text-neutral-400">
          Loading order…
        </p>
      ) : !order ? null : (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          {(mode === "order" || mode === "fulfillment") && Boolean(order.metadata?.shippingAddress) && (
            <div className="space-y-5 lg:col-span-2">
              <SectionCard title="Delivery" description="Get live rates, purchase a label, and follow shipment tracking.">
                {shipment ? <div className="flex flex-wrap items-center justify-between gap-4 text-sm"><div><p className="flex items-center gap-2 capitalize">{shipment.provider === "easypost" ? <img src="/icons/easypost-logo.svg" alt="EasyPost" className="h-5 w-auto" /> : <span>{shipment.provider}</span>}<span>· {shipment.status.replaceAll("_", " ")}</span></p>{shipment.trackingNumber && <p className="mt-1 text-neutral-500">Tracking: {shipment.trackingNumber}</p>}</div><div className="flex gap-2">{shipment.labelUrl && <a className="inline-flex h-9 items-center rounded-md border border-neutral-200 px-3 dark:border-neutral-700" href={shipment.labelUrl} target="_blank" rel="noreferrer">Download label</a>}{shipment.trackingUrl && <a className="inline-flex h-9 items-center rounded-md border border-neutral-200 px-3 dark:border-neutral-700" href={shipment.trackingUrl} target="_blank" rel="noreferrer">Track shipment</a>}</div></div> : <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-neutral-500">No carrier label has been created yet.</p><Button variant="outline" onClick={() => void loadShippingRates()} disabled={loadingRates}>{loadingRates ? "Loading rates…" : "Get delivery rates"}</Button></div>{deliveryRates.length > 0 && <div className="space-y-2">{deliveryRates.map((rate) => <label key={rate.quoteToken} className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-neutral-200 p-3 text-sm dark:border-neutral-700"><span className="flex items-center gap-2"><input type="radio" name="delivery-rate" checked={selectedRate === rate.quoteToken} onChange={() => setSelectedRate(rate.quoteToken)} />{rate.label}<span className="text-neutral-500">{rate.provider}{rate.estimatedDays ? ` · ${rate.estimatedDays} days` : ""}</span></span><span>{new Intl.NumberFormat(undefined, { style: "currency", currency: rate.currency }).format(rate.amount)}</span></label>)}<div className="flex justify-end"><Button onClick={() => void purchaseLabel()} disabled={!selectedRate || buyingLabel}>{buyingLabel ? "Purchasing label…" : "Buy label"}</Button></div></div>}</div>}
              </SectionCard>
            </div>
          )}
          <SectionCard
            title="Workflow"
            description="Operational state can be changed; financial totals remain read-only."
          >
            <div className="space-y-5">
              <div>
                <Label htmlFor="record-status">Status</Label>
                <select
                  id="record-status"
                  className="mt-2 h-10 w-full rounded-md border border-neutral-600 bg-neutral-800 px-3 text-sm text-white"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  {statuses[mode].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              {mode === "invoice" && (
                <div>
                  <Label htmlFor="invoice-number">Invoice number</Label>
                  <Input
                    id="invoice-number"
                    className="mt-2"
                    value={invoiceNumber}
                    onChange={(event) => setInvoiceNumber(event.target.value)}
                  />
                </div>
              )}
              <div>
                <Label htmlFor="record-note">Internal note</Label>
                <textarea
                  id="record-note"
                  className="mt-2 min-h-28 w-full rounded-md border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-white"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>
              {mode === "fulfillment" && (
                <div>
                  <Label htmlFor="tracking-number">Tracking number</Label>
                  <Input
                    id="tracking-number"
                    className="mt-2"
                    value={trackingNumber}
                    onChange={(event) => setTrackingNumber(event.target.value)}
                  />
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button onClick={save} disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </div>
          </SectionCard>
          <SectionCard
            title="Record summary"
            description="Values are sourced from the original order."
          >
            <dl className="space-y-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Status</dt>
                <dd>
                  <StatusPill>
                    {mode === "invoice"
                      ? String(order.metadata?.invoiceStatus ?? "pending")
                      : order.status}
                  </StatusPill>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Total</dt>
                <dd className="font-medium text-white">
                  {new Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency: order.currency,
                  }).format(Number(order.total))}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Provider</dt>
                <dd className="text-right text-neutral-300">
                  {order.provider ?? "Not connected"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Placed</dt>
                <dd className="text-right text-neutral-300">
                  {new Date(order.createdAt).toLocaleString()}
                </dd>
              </div>
            </dl>
          </SectionCard>
        </div>
      )}
    </PageFrame>
  );
}
