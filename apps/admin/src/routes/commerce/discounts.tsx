"use client";

import { apiFetch } from "@/src/lib/api";
import { useAdmin } from "@/src/admin-context";
import RecordTable, { type RecordFilter } from "@/components/admin/manage/record-table";
import type { DataTableActions, DataTableColumn } from "@/components/admin/manage/table";
import { StatStrip, StatusPill } from "@/components/admin/frontend/page-frame";
import { Pencil, Tag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type Discount = { id: string; code: string; name: string; type: string; amount: string; isActive: boolean; usageLimit: number | null; usageCount: number; endsAt: string | null };

export default function DiscountsPage() {
  const { selectedProjectId, projects } = useAdmin();
  const navigate = useNavigate();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const currency = projects.find((project) => project.id === selectedProjectId)?.currency || "USD";
  useEffect(() => {
    let active = true;
    if (!selectedProjectId) { setDiscounts([]); setLoading(false); return () => { active = false; }; }
    setLoading(true);
    apiFetch(`/api/admin/discounts?projectId=${encodeURIComponent(selectedProjectId)}`)
      .then(async (response) => { if (!response.ok) throw new Error("Failed to fetch discounts"); const result = await response.json(); if (active) setDiscounts(result.discounts ?? []); })
      .catch((error) => { console.error("Error fetching discounts:", error); if (active) toast.error("Failed to fetch discounts"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedProjectId]);

  const columns = useMemo<DataTableColumn<Discount>[]>(() => [
    { header: "Code", accessor: "code", width: "250px", render: (discount) => <div><p className="font-mono text-[13px] text-neutral-800 dark:text-neutral-200">{discount.code}</p><p className="mt-1 text-xs text-neutral-500">{discount.name}</p></div> },
    { header: "Discount", accessor: "amount", width: "150px", render: (discount) => <span className="text-[13px] text-neutral-700 dark:text-neutral-300">{discount.type === "percentage" ? `${discount.amount}%` : new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(discount.amount))}</span> },
    { header: "Status", accessor: "isActive", width: "140px", render: (discount) => <StatusPill tone={discount.isActive ? "green" : "neutral"}>{discount.isActive ? "Active" : "Inactive"}</StatusPill> },
    { header: "Usage", accessor: "usageCount", width: "140px", render: (discount) => <span className="text-[13px] text-neutral-600 dark:text-neutral-300">{discount.usageCount}{discount.usageLimit !== null ? ` / ${discount.usageLimit}` : ""}</span> },
    { header: "Expires", accessor: "endsAt", width: "170px", render: (discount) => <span className="text-[13px] text-neutral-500 dark:text-neutral-400">{discount.endsAt ? new Date(discount.endsAt).toLocaleDateString() : "Never"}</span> },
  ], [currency]);
  const filters = useMemo<RecordFilter<Discount>[]>(() => [
    { key: "code", label: "Code", placeholder: "Search discount code..." },
    { key: "name", label: "Name", placeholder: "Search discount name..." },
    { key: "isActive", label: "Status", type: "select", options: [{ label: "Active", value: "true" }, { label: "Inactive", value: "false" }] },
  ], []);
  const actions = useMemo<DataTableActions<Discount>>(() => ({
    header: "Discount",
    primary: { icon: Pencil, label: "Edit", onClick: (discount) => navigate(`/commerce/discounts/${discount.id}`) },
    menu: [],
  }), [navigate]);
  return <RecordTable<Discount>
    title="Discounts"
    description="Manage promotional codes and review their usage."
    data={discounts}
    columns={columns}
    filters={filters}
    exportName="discounts"
    actions={actions}
    loading={loading}
    primaryAction={{ label: "Create discount", onClick: () => navigate("/commerce/discounts/new") }}
    aboveTable={<StatStrip items={[
      { label: "Discounts", value: String(discounts.length), note: "All codes" },
      { label: "Active", value: String(discounts.filter((discount) => discount.isActive).length), note: "Available to customers" },
      { label: "Redemptions", value: String(discounts.reduce((sum, discount) => sum + discount.usageCount, 0)), note: "Recorded uses" },
      { label: "Limited", value: String(discounts.filter((discount) => discount.usageLimit !== null).length), note: "Usage caps applied" },
    ]} />}
    emptyState={{ icon: Tag, message: "No discounts found", description: "Create a discount code to make it available to customers." }}
  />;
}
