"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/src/lib/api";
import { useAdmin } from "@/src/admin-context";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const options = [
  {
    key: "abandonedCartRecovery",
    title: "Enable Abandoned Cart Recovery",
    description: "Send 3 reminder emails to customers who left a product in their cart but did not complete their purchase.",
  },
  {
    key: "dunning",
    title: "Enable Dunning",
    description: "When a payment becomes “unpaid”, send a series of emails designed to encourage customers to fix the issue.",
  },
  {
    key: "paymentRetries",
    title: "Enable Payment Retries",
    description: "Automatically retry failed subscription renewal payments to recover revenue.",
  },
  {
    key: "subscriptionGracePeriod",
    title: "Subscription Grace Period",
    description: "The time during which a subscription payment has not yet been received but its benefits have not yet been revoked.",
  },
] as const;

type RecoveryKey = (typeof options)[number]["key"];
type RecoverySettings = Record<RecoveryKey, boolean>;
const defaults: RecoverySettings = {
  abandonedCartRecovery: false,
  dunning: false,
  paymentRetries: false,
  subscriptionGracePeriod: false,
};

export default function RecoverySettingsPage() {
  const { selectedProjectId } = useAdmin();
  const [settings, setSettings] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<RecoveryKey | null>(null);

  useEffect(() => {
    let active = true;
    if (!selectedProjectId) {
      setSettings(defaults);
      setLoading(false);
      return;
    }
    setLoading(true);
    apiFetch(`/api/admin/commerce-settings?projectId=${selectedProjectId}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load recovery settings");
        const data = await response.json();
        const saved = data.settings?.find((item: { kind: string }) => item.kind === "recovery")?.data;
        if (active) {
          setSettings({
            ...defaults,
            ...(saved && typeof saved === "object" ? saved : {}),
          });
        }
      })
      .catch(() => {
        if (active) toast.error("Could not load recovery settings");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [selectedProjectId]);

  const updateSetting = async (key: RecoveryKey, value: boolean) => {
    if (!selectedProjectId || saving) return;
    const previous = settings[key];
    setSettings((current) => ({ ...current, [key]: value }));
    setSaving(key);
    try {
      const response = await apiFetch("/api/admin/commerce-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProjectId, kind: "recovery", data: { [key]: value } }),
      });
      if (!response.ok) throw new Error("Could not save recovery setting");
      toast.success("Recovery setting saved");
    } catch {
      setSettings((current) => ({ ...current, [key]: previous }));
      toast.error("Could not save recovery setting");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="-mx-4">
      <div className="admin-editor mx-auto w-full max-w-[1600px] px-5 pb-8 sm:px-8 lg:px-12">
        <h1 className="mb-8 mt-2 text-2xl font-medium text-neutral-950 dark:text-neutral-50">Recovery Settings</h1>
        <div className="space-y-5">
          {options.map(({ key, title, description }) => (
            <section key={key} className="flex min-h-[86px] items-center justify-between gap-6 rounded-xl border border-neutral-200 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-[#151515] sm:px-5">
              <div className="min-w-0 space-y-1">
                <Label htmlFor={`recovery-${key}`} className="cursor-pointer text-sm font-medium text-neutral-900 dark:text-neutral-100">{title}</Label>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
              </div>
              <Switch
                id={`recovery-${key}`}
                checked={settings[key]}
                disabled={loading || saving !== null || !selectedProjectId}
                onCheckedChange={(checked) => void updateSetting(key, checked)}
                aria-label={title}
              />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
