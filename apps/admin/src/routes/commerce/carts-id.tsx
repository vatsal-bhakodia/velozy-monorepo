"use client";

import { apiFetch } from "@/src/lib/api";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "@/src/lib/navigation";
import { toast } from "sonner";
import { useAdmin } from "@/src/admin-context";
import { Button } from "@/components/ui/button";
import {
  PageFrame,
  SectionCard,
  StatusPill,
} from "@/components/admin/frontend/page-frame";

type Cart = { id: string; status: string; customerName: string | null };

export default function CartDetailPage() {
  const { selectedProjectId } = useAdmin();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [status, setStatus] = useState("active");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!selectedProjectId) return;
    apiFetch(`/api/admin/carts?projectId=${selectedProjectId}`)
      .then(async (response) => {
        const item = ((await response.json()).carts ?? []).find(
          (candidate: Cart) => candidate.id === params.id,
        );
        if (!item) throw new Error("Cart not found");
        setCart(item);
        setStatus(item.status);
      })
      .catch(() => {
        toast.error("Failed to load cart");
        router.push("/commerce/carts");
      });
  }, [params.id, router, selectedProjectId]);
  const save = async () => {
    if (!cart || !selectedProjectId) return;
    setSaving(true);
    try {
      const response = await apiFetch("/api/admin/carts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          id: cart.id,
          status,
        }),
      });
      if (!response.ok) throw new Error();
      setCart({ ...cart, status });
      toast.success("Cart updated");
    } catch {
      toast.error("Failed to update cart");
    } finally {
      setSaving(false);
    }
  };
  return (
    <PageFrame
      title="Cart details"
      description={
        cart
          ? `Cart #${cart.id.slice(0, 8)} · ${cart.customerName ?? "Guest customer"}`
          : "Review and update this cart."
      }
    >
      {!cart ? (
        <p className="py-12 text-center text-sm text-neutral-400">
          Loading cart…
        </p>
      ) : (
        <SectionCard
          title="Cart workflow"
          description="Cart totals remain calculated from its items."
        >
          <div className="max-w-xl space-y-5">
            <div>
              <label className="text-sm text-neutral-300">Status</label>
              <select
                className="mt-2 h-10 w-full rounded-md border border-neutral-600 bg-neutral-800 px-3 text-sm text-white"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {["active", "abandoned", "converted"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <StatusPill>{cart.status}</StatusPill>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button onClick={save} disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </div>
          </div>
        </SectionCard>
      )}
    </PageFrame>
  );
}
