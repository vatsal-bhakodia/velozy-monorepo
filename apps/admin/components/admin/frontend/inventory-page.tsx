"use client";

import { apiFetch } from "@/src/lib/api";
import { useAdmin } from "@/src/admin-context";
import RecordTable, { type RecordFilter } from "@/components/admin/manage/record-table";
import type { DataTableActions, DataTableColumn } from "@/components/admin/manage/table";
import { PageTabs, StatStrip, StatusPill } from "./page-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CircleX, ClipboardCheck, Package, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  inventoryQuantity: number | null;
  lowStockThreshold: number | null;
  trackInventory?: boolean;
};

export default function InventoryPageContent() {
  const { selectedProjectId } = useAdmin();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    if (!selectedProjectId) { setProducts([]); setLoading(false); return () => { active = false; }; }
    setLoading(true);
    apiFetch(`/api/admin/products?projectId=${encodeURIComponent(selectedProjectId)}`)
      .then(async (response) => { if (!response.ok) throw new Error("Failed to load inventory"); const result = await response.json(); if (active) setProducts(result.products ?? []); })
      .catch((error) => { console.error("Error loading inventory:", error); if (active) toast.error("Failed to load inventory"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedProjectId]);

  const tracked = products.filter((product) => product.trackInventory);
  const lowStock = tracked.filter((product) => (product.inventoryQuantity ?? 0) <= (product.lowStockThreshold ?? 5));
  const outOfStock = tracked.filter((product) => (product.inventoryQuantity ?? 0) <= 0);
  const columns = useMemo<DataTableColumn<Product>[]>(() => [
    { header: "Product", accessor: "name", width: "300px", cellClassName: "text-[13px] font-medium text-neutral-800 dark:text-neutral-200" },
    { header: "SKU", accessor: "sku", width: "190px", cellClassName: "font-mono text-[13px] text-neutral-500 dark:text-neutral-400", render: (product) => product.sku || "—" },
    { header: "Stock", accessor: "inventoryQuantity", width: "120px", cellClassName: "text-[13px] tabular-nums text-neutral-800 dark:text-neutral-200", render: (product) => String(product.inventoryQuantity ?? 0) },
    { header: "Threshold", accessor: "lowStockThreshold", width: "130px", cellClassName: "text-[13px] tabular-nums text-neutral-500 dark:text-neutral-400", render: (product) => String(product.lowStockThreshold ?? 5) },
    { header: "Status", accessor: "trackInventory", width: "150px", render: (product) => {
      const quantity = product.inventoryQuantity ?? 0;
      const low = quantity <= (product.lowStockThreshold ?? 5);
      return <StatusPill tone={!product.trackInventory ? "neutral" : quantity <= 0 ? "red" : low ? "amber" : "green"}>{!product.trackInventory ? "Not tracked" : quantity <= 0 ? "Out of stock" : low ? "Low stock" : "Healthy"}</StatusPill>;
    } },
  ], []);
  const filters = useMemo<RecordFilter<Product>[]>(() => [
    { key: "name", label: "Product", placeholder: "Search product..." },
    { key: "sku", label: "SKU", placeholder: "Search SKU..." },
  ], []);
  const actions = useMemo<DataTableActions<Product>>(() => ({
    header: "Inventory",
    primary: { label: "Edit stock", onClick: (product) => setEditing(product) },
    menu: [],
  }), []);
  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const response = await apiFetch("/api/admin/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id, inventoryQuantity: editing.inventoryQuantity, lowStockThreshold: editing.lowStockThreshold }),
      });
      if (!response.ok) throw new Error("Failed to update inventory");
      const { product } = await response.json();
      setProducts((items) => items.map((item) => item.id === product.id ? { ...item, ...product } : item));
      setEditing(null);
      toast.success("Inventory updated");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update inventory");
    } finally { setSaving(false); }
  };

  return <>
    <RecordTable<Product>
      title="Inventory"
      description="Monitor stock levels and low stock thresholds across your products."
      data={products}
      columns={columns}
      filters={filters}
      exportName="inventory"
      actions={actions}
      loading={loading}
      aboveTable={<StatStrip items={[
        { label: "Products", value: String(products.length), note: "In catalogue", icon: Package, iconColor: "text-blue-600 dark:text-blue-400" },
        { label: "Tracked", value: String(tracked.length), note: "Inventory enabled", icon: ClipboardCheck, iconColor: "text-green-600 dark:text-green-400" },
        { label: "Low stock", value: String(lowStock.length), note: "At or below threshold", icon: TriangleAlert, iconColor: "text-amber-600 dark:text-amber-400" },
        { label: "Out of stock", value: String(outOfStock.length), note: "Tracked products", icon: CircleX, iconColor: "text-red-600 dark:text-red-400" },
      ]} />}
      subNavigation={<PageTabs items={[
        { label: "Stock", href: "/commerce/inventory", active: true },
        { label: "Locations", href: "/commerce/inventory/locations", active: false },
      ]} />}
      emptyState={{ icon: Package, message: "No products yet", description: "Add products to manage their stock levels here." }}
    />
    <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit inventory</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label htmlFor="inventory-quantity">Stock quantity</Label><Input id="inventory-quantity" className="mt-2" type="number" min="0" value={editing?.inventoryQuantity ?? 0} onChange={(event) => setEditing((item) => item ? { ...item, inventoryQuantity: Number(event.target.value) } : item)} /></div>
          <div><Label htmlFor="inventory-threshold">Low stock threshold</Label><Input id="inventory-threshold" className="mt-2" type="number" min="0" value={editing?.lowStockThreshold ?? 5} onChange={(event) => setEditing((item) => item ? { ...item, lowStockThreshold: Number(event.target.value) } : item)} /></div>
          <p className="text-xs text-neutral-500">Changing total stock adjusts the default location.</p>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
