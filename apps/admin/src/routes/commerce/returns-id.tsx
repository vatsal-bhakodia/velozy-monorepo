"use client";

import { apiFetch } from "@/src/lib/api";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "@/src/lib/navigation";
import { toast } from "sonner";
import { useAdmin } from "@/src/admin-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  PageFrame,
  SectionCard,
  StatusPill,
} from "@/components/admin/frontend/page-frame";

type ReturnRecord = {
  id: string;
  orderId: string;
  status: string;
  reason: string | null;
};

export default function ReturnDetailPage() {
  const { selectedProjectId } = useAdmin();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<ReturnRecord | null>(null);
  const [status, setStatus] = useState("requested");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!selectedProjectId) return;
    apiFetch(`/api/admin/returns?projectId=${selectedProjectId}`)
      .then(async (response) => {
        const record = ((await response.json()).returns ?? []).find(
          (candidate: ReturnRecord) => candidate.id === params.id,
        );
        if (!record) throw new Error("Return not found");
        setItem(record);
        setStatus(record.status);
        setReason(record.reason ?? "");
      })
      .catch(() => {
        toast.error("Failed to load return");
        router.push("/commerce/returns");
      });
  }, [params.id, router, selectedProjectId]);
  const save = async () => {
    if (!item || !selectedProjectId) return;
    setSaving(true);
    try {
      const response = await apiFetch("/api/admin/returns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          id: item.id,
          status,
          reason,
        }),
      });
      if (!response.ok) throw new Error();
      toast.success("Return updated");
      setItem({ ...item, status, reason });
    } catch {
      toast.error("Failed to update return");
    } finally {
      setSaving(false);
    }
  };
  return (
    <PageFrame
      title="Return details"
      description={
        item
          ? `Return #${item.id.slice(0, 8)} · Order #${item.orderId.slice(0, 8)}`
          : "Review and update this return."
      }
    >
      {!item ? (
        <p className="py-12 text-center text-sm text-neutral-400">
          Loading return…
        </p>
      ) : (
        <SectionCard
          title="Return workflow"
          description="Refund amount is derived from the original order."
        >
          <div className="max-w-xl space-y-5">
            <div>
              <Label>Status</Label>
              <select
                className="mt-2 h-10 w-full rounded-md border border-neutral-600 bg-neutral-800 px-3 text-sm text-white"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {[
                  "requested",
                  "approved",
                  "received",
                  "refunded",
                  "rejected",
                  "cancelled",
                ].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Reason</Label>
              <textarea
                className="mt-2 min-h-24 w-full rounded-md border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-white"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <StatusPill>{item.status}</StatusPill>
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
