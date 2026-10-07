"use client";

import { apiFetch } from "@/src/lib/api";
import { useAdmin } from "@/src/admin-context";
import RecordTable, { type RecordFilter } from "@/components/admin/manage/record-table";
import type { DataTableActions, DataTableColumn } from "@/components/admin/manage/table";
import { PageTabs, StatusPill } from "@/components/admin/frontend/page-frame";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { RotateCcw, ShoppingCart } from "lucide-react";

type Cart = { id: string; status: string; currency: string; total: string; createdAt: string; customerName: string | null; customerEmail: string | null };
type ReturnRecord = { id: string; status: string; reason: string | null; total: string; createdAt: string; orderId: string; currency: string; customerName: string | null };
type View = "carts" | "returns";
const tabs: Array<{ label: string; view: View }> = [{ label: "Carts", view: "carts" }, { label: "Returns", view: "returns" }];
const formatMoney = (amount: string, currency: string) => new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format(Number(amount));
const statusTone = (status: string) => {
  const value = status.toLowerCase();
  if (["active", "refunded"].includes(value)) return "green" as const;
  if (["requested", "approved", "received", "abandoned"].includes(value)) return "amber" as const;
  if (["rejected", "cancelled"].includes(value)) return "red" as const;
  return "neutral" as const;
};

export default function CommerceRecoveryPage() {
  const { selectedProjectId } = useAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  const [carts, setCarts] = useState<Cart[]>([]);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const view: View = new URLSearchParams(location.search).get("view") === "returns" ? "returns" : "carts";

  useEffect(() => {
    let active = true;
    if (!selectedProjectId) { setCarts([]); setReturns([]); setLoading(false); return () => { active = false; }; }
    setLoading(true);
    const resource = view === "carts" ? "carts" : "returns";
    apiFetch(`/api/admin/${resource}?projectId=${encodeURIComponent(selectedProjectId)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Failed to fetch ${resource}`);
        const result = await response.json();
        if (!active) return;
        if (view === "carts") setCarts(result.carts ?? []);
        else setReturns(result.returns ?? []);
      })
      .catch((error) => { console.error(`Error fetching ${resource}:`, error); if (active) toast.error(`Failed to fetch ${resource}`); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedProjectId, view]);

  const tabNavigation = <PageTabs items={tabs.map((tab) => ({ label: tab.label, href: tab.view === "carts" ? "/commerce/carts" : "/commerce/carts?view=returns", active: tab.view === view }))} />;
  if (view === "carts") {
    const columns: DataTableColumn<Cart>[] = [
      { header: "Cart", accessor: "id", width: "190px", render: (cart) => <span className="font-mono text-[13px] text-neutral-700 dark:text-neutral-200">#{cart.id.slice(0, 8)}</span> },
      { header: "Customer", accessor: "customerName", width: "250px", render: (cart) => <div className="text-[13px]"><p className="text-neutral-800 dark:text-neutral-200">{cart.customerName ?? "Guest customer"}</p>{cart.customerEmail && <p className="mt-1 text-xs text-neutral-500">{cart.customerEmail}</p>}</div> },
      { header: "Total", accessor: "total", width: "150px", render: (cart) => <span className="text-[13px] text-neutral-700 dark:text-neutral-300">{formatMoney(cart.total, cart.currency)}</span> },
      { header: "Status", accessor: "status", width: "150px", render: (cart) => <StatusPill tone={statusTone(cart.status)}>{cart.status}</StatusPill> },
      { header: "Created", accessor: "createdAt", width: "170px", render: (cart) => <span className="whitespace-nowrap text-[13px] text-neutral-500 dark:text-neutral-400">{new Date(cart.createdAt).toLocaleDateString()}</span> },
    ];
    const filters: RecordFilter<Cart>[] = [
      { key: "id", label: "Cart", placeholder: "Search cart ID..." },
      { key: "customerName", label: "Customer", placeholder: "Search customer..." },
      { key: "status", label: "Status", type: "select", options: [...new Set(carts.map((cart) => cart.status))].map((status) => ({ label: status, value: status })) },
    ];
    const actions: DataTableActions<Cart> = { header: "Cart", primary: { label: "Open", onClick: (cart) => navigate(`/commerce/carts/${cart.id}`) }, menu: [] };
    return <RecordTable<Cart> key="carts" title="Carts & Returns" description="Review storefront carts and customer return requests." data={carts} columns={columns} filters={filters} dateRange="createdAt" dateRangeLabel="Cart date" exportName="commerce-carts" actions={actions} loading={loading} subNavigation={tabNavigation} emptyState={{ icon: ShoppingCart, message: "No carts found", description: "Carts created by your storefront will appear here." }} />;
  }

  const columns: DataTableColumn<ReturnRecord>[] = [
    { header: "Return", accessor: "id", width: "170px", render: (item) => <span className="font-mono text-[13px] text-neutral-700 dark:text-neutral-200">#{item.id.slice(0, 8)}</span> },
    { header: "Order", accessor: "orderId", width: "170px", render: (item) => <span className="font-mono text-[13px] text-neutral-600 dark:text-neutral-300">#{item.orderId.slice(0, 8)}</span> },
    { header: "Customer", accessor: "customerName", width: "210px", render: (item) => <span className="text-[13px] text-neutral-800 dark:text-neutral-200">{item.customerName ?? "Guest customer"}</span> },
    { header: "Value", accessor: "total", width: "140px", render: (item) => <span className="text-[13px] text-neutral-700 dark:text-neutral-300">{formatMoney(item.total, item.currency)}</span> },
    { header: "Status", accessor: "status", width: "150px", render: (item) => <StatusPill tone={statusTone(item.status)}>{item.status}</StatusPill> },
    { header: "Reason", accessor: "reason", width: "240px", cellClassName: "max-w-[240px] truncate text-[13px] text-neutral-500 dark:text-neutral-400", render: (item) => item.reason || "—" },
  ];
  const filters: RecordFilter<ReturnRecord>[] = [
    { key: "id", label: "Return", placeholder: "Search return ID..." },
    { key: "orderId", label: "Order", placeholder: "Search order ID..." },
    { key: "customerName", label: "Customer", placeholder: "Search customer..." },
    { key: "status", label: "Status", type: "select", options: [...new Set(returns.map((item) => item.status))].map((status) => ({ label: status, value: status })) },
  ];
  const actions: DataTableActions<ReturnRecord> = { header: "Return", primary: { label: "Open", onClick: (item) => navigate(`/commerce/returns/${item.id}`) }, menu: [] };
  return <RecordTable<ReturnRecord> key="returns" title="Carts & Returns" description="Review storefront carts and customer return requests." data={returns} columns={columns} filters={filters} dateRange="createdAt" dateRangeLabel="Request date" exportName="commerce-returns" actions={actions} loading={loading} subNavigation={tabNavigation} emptyState={{ icon: RotateCcw, message: "No returns found", description: "Return requests from your customers will appear here." }} />;
}
