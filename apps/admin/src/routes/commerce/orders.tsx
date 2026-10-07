"use client";

import { apiFetch } from "@/src/lib/api";
import { useAdmin } from "@/src/admin-context";
import RecordTable, { type RecordFilter } from "@/components/admin/manage/record-table";
import type { DataTableActions, DataTableColumn } from "@/components/admin/manage/table";
import { PageTabs, StatusPill } from "@/components/admin/frontend/page-frame";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { FileText, PackageCheck, ShoppingBag, Wallet } from "lucide-react";

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

type View = "orders" | "payments" | "fulfillment" | "invoices";
const viewDetails: Record<View, { title: string; description: string }> = {
  orders: { title: "Orders", description: "Review and manage orders placed through your store." },
  payments: { title: "Payments", description: "Review payment status and provider details from each order." },
  fulfillment: { title: "Fulfillment", description: "Work through orders that need packing or shipment." },
  invoices: { title: "Invoices", description: "Review invoice status and numbers stored with each order." },
};
const tabs = [
  { label: "Orders", view: "orders" as const, icon: ShoppingBag },
  { label: "Payments", view: "payments" as const, icon: Wallet },
  { label: "Fulfillment", view: "fulfillment" as const, icon: PackageCheck },
  { label: "Invoices", view: "invoices" as const, icon: FileText },
];
const statusTone = (status: string) => {
  if (["paid", "completed", "fulfilled", "issued"].includes(status.toLowerCase())) return "green" as const;
  if (["cancelled", "refunded", "failed", "void"].includes(status.toLowerCase())) return "red" as const;
  if (["pending", "processing", "requested"].includes(status.toLowerCase())) return "amber" as const;
  return "neutral" as const;
};
const formatMoney = (amount: string, currency: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format(Number(amount));

export default function OrdersPage() {
  const { selectedProjectId } = useAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const rawView = new URLSearchParams(location.search).get("view");
  const view: View = tabs.some((tab) => tab.view === rawView) ? rawView as View : "orders";

  useEffect(() => {
    let active = true;
    if (!selectedProjectId) {
      setOrders([]);
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    apiFetch(`/api/admin/orders?projectId=${encodeURIComponent(selectedProjectId)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to fetch orders");
        const data = await response.json();
        if (active) setOrders(data.orders ?? []);
      })
      .catch((error) => {
        console.error("Error fetching orders:", error);
        if (active) toast.error("Failed to fetch orders");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedProjectId]);

  const visibleOrders = useMemo(() => {
    if (view === "fulfillment") return orders.filter((order) => ["paid", "processing", "pending"].includes(order.status.toLowerCase()));
    if (view === "invoices") return orders.filter((order) => ["paid", "completed", "fulfilled"].includes(order.status.toLowerCase()));
    return orders;
  }, [orders, view]);

  const columns = useMemo<DataTableColumn<Order>[]>(() => [
    { header: view === "invoices" ? "Invoice / Order" : "Order", accessor: "id", width: "190px", render: (order) => <span className="font-mono text-[13px] text-neutral-700 dark:text-neutral-200">#{order.id.slice(0, 8)}{view === "invoices" && order.metadata?.invoiceNumber ? ` · ${String(order.metadata.invoiceNumber)}` : ""}</span> },
    { header: "Customer", accessor: "customerName", width: "230px", render: (order) => <div className="text-[13px]"><p className="text-neutral-800 dark:text-neutral-200">{order.customerName ?? "Guest customer"}</p>{order.customerEmail && <p className="mt-1 text-xs text-neutral-500">{order.customerEmail}</p>}</div> },
    { header: "Total", accessor: "total", width: "140px", render: (order) => <span className="text-[13px] text-neutral-700 dark:text-neutral-300">{formatMoney(order.total, order.currency)}</span> },
    { header: view === "invoices" ? "Invoice status" : "Status", accessor: "status", width: "150px", render: (order) => <StatusPill tone={statusTone(view === "invoices" ? String(order.metadata?.invoiceStatus ?? "pending") : order.status)}>{view === "invoices" ? String(order.metadata?.invoiceStatus ?? "pending") : order.status}</StatusPill> },
    { header: "Provider", accessor: "provider", width: "150px", render: (order) => <span className="text-[13px] text-neutral-500 dark:text-neutral-400">{order.provider ?? "—"}</span> },
    { header: "Placed", accessor: "createdAt", width: "170px", render: (order) => <span className="whitespace-nowrap text-[13px] text-neutral-500 dark:text-neutral-400">{new Date(order.createdAt).toLocaleDateString()}</span> },
  ], [view]);
  const filters = useMemo<RecordFilter<Order>[]>(() => [
    { key: "id", label: "Order", placeholder: "Search order ID..." },
    { key: "customerName", label: "Customer", placeholder: "Search customer..." },
    { key: "status", label: "Status", type: "select", options: [...new Set(orders.map((order) => order.status))].map((status) => ({ label: status, value: status })) },
  ], [orders]);
  const actions = useMemo<DataTableActions<Order>>(() => ({
    header: "Order",
    primary: {
      label: "Open",
      onClick: (order) => navigate(`/commerce/${view === "orders" ? "orders" : view}/${order.id}`),
    },
    menu: [],
  }), [navigate, view]);

  return (
    <RecordTable<Order>
      key={view}
      title={viewDetails[view].title}
      description={viewDetails[view].description}
      data={visibleOrders}
      columns={columns}
      filters={filters}
      dateRange="createdAt"
      dateRangeLabel="Order date"
      exportName={`commerce-${view}`}
      actions={actions}
      loading={loading}
      subNavigation={<PageTabs items={tabs.map((tab) => ({ label: tab.label, href: `/commerce/sales?view=${tab.view}`, active: view === tab.view }))} />}
      emptyState={{
        icon: tabs.find((tab) => tab.view === view)?.icon ?? ShoppingBag,
        message: orders.length === 0 ? "No orders yet" : `No ${view} match these filters`,
        description: orders.length === 0 ? "Orders from your storefront will appear here." : "Adjust the filters or choose another Sales view.",
      }}
    />
  );
}
