"use client";

import { apiFetch } from "@/src/lib/api";

import { useEffect, useMemo, useState } from "react";
import Link from "@/components/router-link";
import {
  Bell,
  CircleDollarSign,
  ClipboardList,
  Package,
  Pencil,
  Search,
  Settings2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { useAdmin } from "@/src/admin-context";
import { PageFrame, SectionCard, StatStrip, StatusPill } from "./page-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Variant =
  | "inventory"
  | "payments"
  | "fulfillment"
  | "shipping-tax"
  | "checkout"
  | "invoices"
  | "notifications";
type Product = {
  id: string;
  name: string;
  sku: string | null;
  inventoryQuantity: number | null;
  lowStockThreshold: number | null;
  price: string | null;
  weight: number | null;
  isActive: boolean;
  trackInventory?: boolean;
};
type Order = {
  id: string;
  status: string;
  currency: string;
  total: string;
  provider: string | null;
  createdAt: string;
  customerName: string | null;
  customerEmail: string | null;
};
type Project = {
  id: string;
  name: string;
  currency: string;
  purchaseMode: string;
  contactEmail?: string | null;
};

const pageCopy: Record<Variant, { title: string; description: string }> = {
  inventory: {
    title: "Inventory",
    description:
      "Monitor total product stock and low-stock thresholds across the selected project.",
  },
  payments: {
    title: "Payments",
    description:
      "Review payment providers and the payment state of your orders.",
  },
  fulfillment: {
    title: "Fulfillment",
    description: "Track orders that need packing, shipping, or completion.",
  },
  "shipping-tax": {
    title: "Shipping & Taxes",
    description:
      "Review the shipping and tax information currently available to checkout.",
  },
  checkout: {
    title: "Checkout",
    description:
      "Review the buying mode and storefront settings used by checkout.",
  },
  invoices: {
    title: "Invoices",
    description: "Review invoice readiness for completed and paid orders.",
  },
  notifications: {
    title: "Notifications",
    description:
      "Review the customer notification surface for commerce events.",
  },
};

const toneForStatus = (status: string) => {
  const value = status.toLowerCase();
  if (["paid", "completed", "fulfilled", "sent"].includes(value))
    return "green" as const;
  if (["failed", "cancelled", "refunded"].includes(value))
    return "red" as const;
  if (["pending", "processing", "requested"].includes(value))
    return "amber" as const;
  return "neutral" as const;
};

export function CommerceSystemPage({ variant }: { variant: Variant }) {
  const { selectedProjectId } = useAdmin();
  const [project, setProject] = useState<Project | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [paymentProviders, setPaymentProviders] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingProject, setEditingProject] = useState(false);
  const [saving, setSaving] = useState(false);
  const copy = pageCopy[variant];

  useEffect(() => {
    if (!selectedProjectId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [
          projectResponse,
          productsResponse,
          ordersResponse,
          providersResponse,
        ] = await Promise.all([
          apiFetch(`/api/admin/projects?projectId=${selectedProjectId}`),
          apiFetch(`/api/admin/products?projectId=${selectedProjectId}`),
          apiFetch(`/api/admin/orders?projectId=${selectedProjectId}`),
          apiFetch(`/api/admin/integrations?projectId=${selectedProjectId}`),
        ]);
        if (
          !projectResponse.ok ||
          !productsResponse.ok ||
          !ordersResponse.ok ||
          !providersResponse.ok
        )
          throw new Error("Failed to load commerce data");
        const [projectData, productsData, ordersData, providersData] =
          await Promise.all([
            projectResponse.json(),
            productsResponse.json(),
            ordersResponse.json(),
            providersResponse.json(),
          ]);
        setProject(projectData.project ?? null);
        setProducts(productsData.products ?? []);
        setOrders(ordersData.orders ?? []);
        setPaymentProviders(
          (providersData.integrations ?? [])
            .filter(
              (integration: {
                provider: string;
                connected: boolean;
                enabled: boolean;
              }) =>
                ["stripe", "razorpay", "dodo"].includes(integration.provider) &&
                integration.connected &&
                integration.enabled,
            )
            .map((integration: { provider: string }) => integration.provider),
        );
      } catch (error) {
        console.error("Error loading commerce data:", error);
        toast.error("Failed to load commerce data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedProjectId]);

  const filteredOrders = useMemo(
    () =>
      orders.filter((order) =>
        [
          order.id,
          order.status,
          order.provider,
          order.customerName,
          order.customerEmail,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [orders, query],
  );
  const lowStock = products.filter(
    (product) =>
      product.trackInventory &&
      (product.inventoryQuantity ?? 0) <= (product.lowStockThreshold ?? 5),
  );
  const paidOrders = orders.filter((order) =>
    ["paid", "completed", "fulfilled"].includes(order.status.toLowerCase()),
  );
  const money = (value: string, currency = project?.currency || "USD") =>
    new Intl.NumberFormat(undefined, { style: "currency", currency }).format(
      Number(value),
    );
  const saveInventory = async () => {
    if (!editingProduct) return;
    setSaving(true);
    try {
      const response = await apiFetch("/api/admin/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingProduct.id,
          inventoryQuantity: editingProduct.inventoryQuantity,
          lowStockThreshold: editingProduct.lowStockThreshold,
        }),
      });
      if (!response.ok) throw new Error("Failed to update inventory");
      const { product } = await response.json();
      setProducts((items) =>
        items.map((item) =>
          item.id === product.id ? { ...item, ...product } : item,
        ),
      );
      setEditingProduct(null);
      toast.success("Inventory updated");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update inventory");
    } finally {
      setSaving(false);
    }
  };
  const saveCheckout = async () => {
    if (!project) return;
    setSaving(true);
    try {
      const response = await apiFetch("/api/admin/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: project.id,
          currency: project.currency,
          purchaseMode: project.purchaseMode,
        }),
      });
      if (!response.ok) throw new Error("Failed to update checkout");
      setProject((await response.json()).project);
      setEditingProject(false);
      toast.success("Checkout settings updated");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update checkout settings");
    } finally {
      setSaving(false);
    }
  };

  const renderOrders = (
    title: string,
    description: string,
    statuses?: string[],
  ) => {
    const rows = statuses
      ? filteredOrders.filter((order) =>
          statuses.includes(order.status.toLowerCase()),
        )
      : filteredOrders;
    const detailBase =
      variant === "payments"
        ? "payments"
        : variant === "fulfillment"
          ? "fulfillment"
          : variant === "invoices"
            ? "invoices"
            : "orders";
    return (
      <SectionCard title={title} description={description}>
        <div className="relative mb-5">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search order, customer, provider, or status"
            className="h-9 w-full rounded-lg border border-neutral-600 bg-neutral-700 pl-9 pr-3 text-xs text-white placeholder:text-neutral-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>
        {loading ? (
          <p className="py-12 text-center text-sm text-neutral-400">
            Loading commerce data…
          </p>
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-neutral-400">
            No matching orders yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead className="text-[11px] uppercase tracking-wider text-neutral-500">
                <tr>
                  {[
                    "Order",
                    "Customer",
                    "Total",
                    "Status",
                    "Provider",
                    "Placed",
                    "",
                  ].map((label) => (
                    <th
                      key={label}
                      className="border-b border-neutral-700 px-3 py-3 font-medium"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((order) => (
                  <tr key={order.id} className="border-b border-neutral-700/70">
                    <td className="px-3 py-4 font-mono text-xs text-cyan-300">
                      #{order.id.slice(0, 8)}
                    </td>
                    <td className="px-3 py-4 text-sm text-neutral-200">
                      {order.customerName ?? "Guest customer"}
                    </td>
                    <td className="px-3 py-4 text-sm text-neutral-200">
                      {money(order.total, order.currency)}
                    </td>
                    <td className="px-3 py-4">
                      <StatusPill tone={toneForStatus(order.status)}>
                        {order.status}
                      </StatusPill>
                    </td>
                    <td className="px-3 py-4 text-sm text-neutral-400">
                      {order.provider ?? "Not connected"}
                    </td>
                    <td className="px-3 py-4 text-sm text-neutral-400">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-4 text-right">
                      <Link
                        href={`/commerce/${detailBase}/${order.id}`}
                        className="text-xs text-cyan-300 hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    );
  };

  let content: React.ReactNode;
  if (variant === "inventory")
    content = (
      <SectionCard
        title="Stock levels"
        description="Totals include stock at every location. Editing a total adjusts the default location."
        className="dark:bg-neutral-900"
      >
        <Link
          href="/commerce/inventory/locations"
          className="mb-4 inline-flex items-center rounded-md bg-neutral-100 px-4 py-2 text-xs font-normal text-neutral-800 transition-colors hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/40 dark:bg-[#202022] dark:text-neutral-100 dark:hover:bg-[#2b2b2e]"
        >
          Manage locations and transfers
        </Link>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-neutral-100 text-[11px] uppercase tracking-wider text-neutral-500 dark:bg-[#151517] dark:text-neutral-400">
              <tr>
                {["Product", "SKU", "Stock", "Threshold", "Status", ""].map(
                  (label) => (
                    <th
                      key={label}
                      className="border-b border-neutral-200 px-3 py-3 font-medium dark:border-[#303034]"
                    >
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-[#303034]">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-12 text-center text-sm text-neutral-500 dark:text-neutral-400"
                  >
                    Loading inventory…
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center">
                    <Package className="mx-auto h-5 w-5 text-neutral-400" />
                    <p className="mt-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      No products yet
                    </p>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      Add products to see stock levels here.
                    </p>
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const quantity = product.inventoryQuantity ?? 0;
                  const isLow =
                    product.trackInventory &&
                    quantity <= (product.lowStockThreshold ?? 5);
                  return (
                    <tr
                      key={product.id}
                      className="transition-colors hover:bg-neutral-50 dark:hover:bg-[#1e1e1f]"
                    >
                      <td className="px-3 py-4 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {product.name}
                      </td>
                      <td className="px-3 py-4 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                        {product.sku ?? "—"}
                      </td>
                      <td className="px-3 py-4 text-sm tabular-nums text-neutral-900 dark:text-neutral-100">
                        {quantity}
                      </td>
                      <td className="px-3 py-4 text-sm tabular-nums text-neutral-600 dark:text-neutral-400">
                        {product.lowStockThreshold ?? 5}
                      </td>
                      <td className="px-3 py-4">
                        <StatusPill
                          tone={
                            !product.trackInventory
                              ? "neutral"
                              : isLow
                                ? "amber"
                                : "green"
                          }
                        >
                          {!product.trackInventory
                            ? "Not tracked"
                            : isLow
                              ? "Low stock"
                              : "Healthy"}
                        </StatusPill>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingProduct(product)}
                          className="text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950 focus-visible:ring-cyan-600/40 dark:text-neutral-200 dark:hover:bg-neutral-800 dark:hover:text-white"
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    );
  else if (variant === "payments") {
    content = renderOrders(
      "Payment activity",
      "Payment state is derived from order status and provider metadata.",
    );
  } else if (variant === "fulfillment") {
    content = renderOrders(
      "Fulfillment queue",
      "Orders that still need fulfillment appear here.",
      ["paid", "processing", "pending"],
    );
  } else if (variant === "invoices") {
    content = renderOrders(
      "Invoice register",
      "Paid and completed orders are ready for invoice generation.",
      ["paid", "completed", "fulfilled"],
    );
  } else if (variant === "shipping-tax")
    content = (
      <SectionCard
        title="Checkout inputs"
        description="Product shipping data and project currency currently available to the storefront."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg bg-neutral-900 p-4">
            <p className="text-xs text-neutral-500">Currency</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {project?.currency ?? "—"}
            </p>
          </div>
          <div className="rounded-lg bg-neutral-900 p-4">
            <p className="text-xs text-neutral-500">Products with weight</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {products.filter((product) => product.weight !== null).length}
            </p>
          </div>
          <div className="rounded-lg bg-neutral-900 p-4">
            <p className="text-xs text-neutral-500">Tax rules</p>
            <p className="mt-2 text-lg font-semibold text-amber-300">
              Not configured
            </p>
          </div>
        </div>
        <p className="mt-5 text-sm text-neutral-400">
          Shipping rates and tax rules are not stored yet. Checkout can use the
          project currency, while physical shipping and tax calculation still
          need configuration.
        </p>
      </SectionCard>
    );
  else if (variant === "checkout")
    content = (
      <>
        <SectionCard
          title="Checkout configuration"
          description="These settings control how customers are expected to buy from this project."
          className="dark:bg-[#151515]"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start">
            <div className="grid w-full flex-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Purchase mode
                </p>
                <p className="mt-2 text-lg font-semibold capitalize text-neutral-900 dark:text-neutral-100">
                  {project?.purchaseMode ?? "—"}
                </p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Currency
                </p>
                <p className="mt-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  {project?.currency ?? "—"}
                </p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Payment gateway
                </p>
                <p
                  className={`mt-2 text-lg ${paymentProviders.length ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-300"}`}
                >
                  {paymentProviders.length
                    ? paymentProviders
                        .map((provider) =>
                          provider === "dodo"
                            ? "Dodo"
                            : provider[0].toUpperCase() + provider.slice(1),
                        )
                        .join(", ")
                    : "Not connected"}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setEditingProject(true)}
              disabled={!project || loading}
            >
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
          <div className="mt-5 flex items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <Settings2 className="mt-0.5 h-5 w-5 shrink-0 text-neutral-500 dark:text-neutral-400" />
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Checkout is currently a project setting.{" "}
              {paymentProviders.length
                ? "Enabled providers are routed automatically by currency and product type."
                : "Connect a payment provider before enabling paid checkout."}{" "}
              <Link
                className="font-medium text-neutral-900 underline underline-offset-2 dark:text-neutral-100"
                href="/settings/payments"
              >
                Manage payment providers
              </Link>
              .
            </p>
          </div>
        </SectionCard>
        <Dialog open={editingProject} onOpenChange={setEditingProject}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit checkout settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Purchase mode</Label>
                <select
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                  value={project?.purchaseMode ?? "catalogue"}
                  onChange={(event) =>
                    setProject((item) =>
                      item
                        ? { ...item, purchaseMode: event.target.value }
                        : item,
                    )
                  }
                >
                  <option value="catalogue">Catalogue</option>
                  <option value="enquiry">Enquiry</option>
                  <option value="quote">Quote cart</option>
                  <option value="checkout">Checkout</option>
                </select>
              </div>
              <div>
                <Label htmlFor="checkout-currency">Currency</Label>
                <Input
                  id="checkout-currency"
                  className="mt-2"
                  maxLength={3}
                  value={project?.currency ?? "USD"}
                  onChange={(event) =>
                    setProject((item) =>
                      item
                        ? {
                            ...item,
                            currency: event.target.value.toUpperCase(),
                          }
                        : item,
                    )
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditingProject(false)}
              >
                Cancel
              </Button>
              <Button onClick={saveCheckout} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  else
    content = (
      <SectionCard
        title="Notification coverage"
        description="Commerce events currently available for customer notifications."
      >
        <div className="space-y-3">
          {[
            "Order created",
            "Payment status changed",
            "Order fulfilled",
            "Return requested",
          ].map((event) => (
            <div
              key={event}
              className="flex items-center justify-between rounded-lg bg-neutral-900 p-4"
            >
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-cyan-400" />
                <span className="text-sm text-neutral-200">{event}</span>
              </div>
              <StatusPill tone="amber">Not configured</StatusPill>
            </div>
          ))}
        </div>
        <p className="mt-5 text-sm text-neutral-400">
          Email delivery and notification templates are not stored yet. This
          page is ready to become the control surface for those settings.
        </p>
      </SectionCard>
    );

  return (
    <>
      <PageFrame title={copy.title} description={copy.description}>
        <StatStrip
          items={
            variant === "inventory"
              ? [
                  {
                    label: "Products",
                    value: String(products.length),
                    note: "In the catalogue",
                    icon: Package,
                  },
                  {
                    label: "Low stock",
                    value: String(lowStock.length),
                    note: "At or below threshold",
                    icon: TriangleAlert,
                  },
                  {
                    label: "Tracked orders",
                    value: String(orders.length),
                    note: "Project-wide",
                    icon: ClipboardList,
                  },
                  {
                    label: "Project",
                    value: project?.currency ?? "—",
                    note: project?.name ?? "Selected project",
                    icon: CircleDollarSign,
                  },
                ]
              : [
                  {
                    label: "Orders",
                    value: String(orders.length),
                    note: "Project-wide",
                  },
                  {
                    label: "Paid",
                    value: String(paidOrders.length),
                    note: "Paid or completed",
                  },
                  {
                    label: "Order value",
                    value: money(
                      String(
                        orders.reduce(
                          (sum, order) => sum + Number(order.total),
                          0,
                        ),
                      ),
                    ),
                    note: "Across all orders",
                  },
                  {
                    label: "Project",
                    value: project?.currency ?? "—",
                    note: project?.name ?? "Selected project",
                  },
                ]
          }
        />
        {content}
      </PageFrame>
      <Dialog
        open={editingProduct !== null}
        onOpenChange={(open) => !open && setEditingProduct(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit inventory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="inventory-quantity">Quantity</Label>
              <Input
                id="inventory-quantity"
                type="number"
                min="0"
                className="mt-2"
                value={editingProduct?.inventoryQuantity ?? 0}
                onChange={(event) =>
                  setEditingProduct((item) =>
                    item
                      ? {
                          ...item,
                          inventoryQuantity: Number(event.target.value) || 0,
                        }
                      : item,
                  )
                }
              />
            </div>
            <div>
              <Label htmlFor="inventory-threshold">Low-stock threshold</Label>
              <Input
                id="inventory-threshold"
                type="number"
                min="0"
                className="mt-2"
                value={editingProduct?.lowStockThreshold ?? 5}
                onChange={(event) =>
                  setEditingProduct((item) =>
                    item
                      ? {
                          ...item,
                          lowStockThreshold: Number(event.target.value) || 0,
                        }
                      : item,
                  )
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(null)}>
              Cancel
            </Button>
            <Button onClick={saveInventory} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export type { Variant };
