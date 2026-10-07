"use client";

import { apiFetch } from "@/src/lib/api";
import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "@/src/lib/navigation";
import { toast } from "sonner";
import { useAdmin } from "@/src/admin-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FieldHint, PageFrame, SectionCard } from "./page-frame";

type Discount = {
  id: string;
  code: string;
  name: string;
  type: "percentage" | "fixed";
  amount: string;
  isActive: boolean;
  usageLimit: number | null;
  usageCount: number;
  startsAt: string | null;
  endsAt: string | null;
};

type DiscountFormValues = Omit<Discount, "id" | "startsAt" | "endsAt"> & {
  startsAt: string;
  endsAt: string;
};

const initialForm: DiscountFormValues = {
  code: "",
  name: "",
  type: "percentage",
  amount: "",
  isActive: true,
  usageLimit: null,
  usageCount: 0,
  startsAt: "",
  endsAt: "",
};

function toLocalDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function dateBoundary(value: string, endOfDay = false) {
  const date = new Date(`${value}T00:00:00`);
  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date;
}

function formatCurrency(amount: string, currency: string) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function generateDiscountCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const suffix = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return `SAVE-${suffix}`;
}

export function DiscountForm({ mode }: { mode: "create" | "edit" }) {
  const { selectedProjectId, projects } = useAdmin();
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const currency =
    projects.find((project) => project.id === selectedProjectId)?.currency ||
    "USD";
  const [form, setForm] = useState<DiscountFormValues>(initialForm);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode !== "edit" || !selectedProjectId || !params.id) return;
    apiFetch(`/api/admin/discounts?projectId=${selectedProjectId}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to load discount");
        const data = await response.json();
        const item = (data.discounts ?? []).find(
          (discount: Discount) => discount.id === params.id,
        ) as Discount | undefined;
        if (!item) throw new Error("Discount not found");
        setForm({
          ...item,
          amount: String(item.amount),
          startsAt: toLocalDate(item.startsAt),
          endsAt: toLocalDate(item.endsAt),
        });
      })
      .catch((error) => {
        console.error(error);
        toast.error("Failed to load discount");
        router.push("/commerce/discounts");
      })
      .finally(() => setLoading(false));
  }, [mode, params.id, router, selectedProjectId]);

  const update = <K extends keyof DiscountFormValues>(
    key: K,
    value: DiscountFormValues[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProjectId) return;

    const startsAt = form.startsAt ? dateBoundary(form.startsAt) : null;
    const endsAt = form.endsAt ? dateBoundary(form.endsAt, true) : null;
    const amount = Number(form.amount);
    if (form.type === "percentage" && amount > 100) {
      toast.error("Percentage discounts cannot exceed 100%");
      return;
    }
    if (startsAt && endsAt && form.endsAt < form.startsAt) {
      toast.error("The expiration date must be on or after the start date");
      return;
    }

    setSaving(true);
    try {
      const response = await apiFetch("/api/admin/discounts", {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: form.amount.trim(),
          code: form.code.trim().toUpperCase(),
          startsAt: startsAt?.toISOString() ?? null,
          endsAt: endsAt?.toISOString() ?? null,
          projectId: selectedProjectId,
          id: params.id,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save discount");
      }
      toast.success(
        mode === "create" ? "Discount code created" : "Discount updated",
      );
      router.push("/commerce/discounts");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save discount",
      );
    } finally {
      setSaving(false);
    }
  };

  const amountSummary =
    form.type === "percentage"
      ? form.amount
        ? `${form.amount}% off`
        : "Not set"
      : form.amount
        ? `${formatCurrency(form.amount, currency)} off`
        : "Not set";

  return (
    <PageFrame
      title={mode === "create" ? "New Discount Code" : "Edit Discount Code"}
      description="Set the value, schedule, and redemption limit for this code."
      headerAction={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/commerce/discounts")}
            className="h-10 bg-neutral-100 px-4 text-neutral-800 shadow-sm dark:bg-neutral-800 dark:text-neutral-100"
          >
            Back
          </Button>
          <Button
            type="submit"
            form="discount-form"
            disabled={saving || loading}
          >
            {saving
              ? "Saving…"
              : mode === "create"
                ? "Create Discount Code"
                : "Save Changes"}
          </Button>
        </>
      }
      aside={
        <div className="space-y-5">
          <SectionCard title="Settings">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="discount-active" className="cursor-pointer">
                  Active
                </Label>
                <FieldHint className="mb-0">
                  Inactive codes cannot be redeemed.
                </FieldHint>
              </div>
              <Switch
                id="discount-active"
                checked={form.isActive}
                onCheckedChange={(checked) => update("isActive", checked)}
              />
            </div>
          </SectionCard>
          <SectionCard
            title="Summary"
            description="A quick preview of this discount code."
          >
            <div className="border-b border-neutral-200 pb-4 dark:border-neutral-700">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Discount name
              </p>
              <p className="mt-1 font-medium text-neutral-900 dark:text-neutral-100">
                {form.name || "Discount name"}
              </p>
              <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                Discount code
              </p>
              <p className="mt-1 font-mono text-sm font-medium tracking-wide text-neutral-900 dark:text-neutral-100">
                {form.code || "CODE"}
              </p>
            </div>
            <dl className="mt-4 space-y-4">
              <div>
                <dt className="text-xs text-neutral-500 dark:text-neutral-400">
                  Value
                </dt>
                <dd className="mt-1 font-medium text-neutral-900 dark:text-neutral-100">
                  {amountSummary}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500 dark:text-neutral-400">
                  Availability
                </dt>
                <dd className="mt-1 text-sm text-neutral-900 dark:text-neutral-100">
                  {form.startsAt
                    ? new Date(form.startsAt).toLocaleDateString()
                    : "Available now"}
                  {form.endsAt && (
                    <span className="block text-neutral-500 dark:text-neutral-400">
                      Until {new Date(form.endsAt).toLocaleDateString()}
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500 dark:text-neutral-400">
                  Redemption limit
                </dt>
                <dd className="mt-1 text-sm text-neutral-900 dark:text-neutral-100">
                  {form.usageLimit ?? "Unlimited"}
                </dd>
              </div>
            </dl>
          </SectionCard>
        </div>
      }
    >
      <form id="discount-form" onSubmit={save} className="admin-editor">
        <div className="space-y-5">
          <SectionCard
            title="Discount details"
            description="Name the promotion and set what it takes off the order."
          >
            <div className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <Label htmlFor="discount-name">
                    Discount name <span className="text-red-500">*</span>
                  </Label>
                  <FieldHint>
                    A name to identify this discount in your admin.
                  </FieldHint>
                  <Input
                    id="discount-name"
                    maxLength={255}
                    required
                    value={form.name}
                    onChange={(event) => update("name", event.target.value)}
                    placeholder="Summer sale"
                  />
                </div>
                <div>
                  <Label htmlFor="discount-code">
                    Discount code <span className="text-red-500">*</span>
                  </Label>
                  <FieldHint>Customers enter this code at checkout.</FieldHint>
                  <div className="flex gap-2">
                    <Input
                      id="discount-code"
                      className="uppercase"
                      maxLength={100}
                      required
                      value={form.code}
                      onChange={(event) =>
                        update("code", event.target.value.toUpperCase())
                      }
                      placeholder="SUMMER20"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => update("code", generateDiscountCode())}
                      className="shrink-0"
                    >
                      Generate code
                    </Button>
                  </div>
                </div>
              </div>

              <fieldset>
                <legend className="mb-1 text-sm font-medium text-neutral-900 dark:text-neutral-200">
                  Discount type <span className="text-red-500">*</span>
                </legend>
                <FieldHint>Choose a percentage or a fixed amount.</FieldHint>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      [
                        "percentage",
                        "Percentage",
                        "Take a percentage off the order.",
                      ],
                      [
                        "fixed",
                        "Fixed amount",
                        `Take a set amount off in ${currency}.`,
                      ],
                    ] as const
                  ).map(([type, title, description]) => {
                    const selected = form.type === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => update("type", type)}
                        className={`rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30 ${
                          selected
                            ? "border-blue-600 dark:border-blue-400"
                            : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-500"
                        }`}
                      >
                        <span className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                              selected
                                ? "border-blue-600 dark:border-blue-400"
                                : "border-neutral-400 dark:border-neutral-500"
                            }`}
                          >
                            {selected && (
                              <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                            )}
                          </span>
                          {title}
                        </span>
                        <span className="mt-2 block pl-6 text-xs text-neutral-500 dark:text-neutral-400">
                          {description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="max-w-sm">
                <Label htmlFor="discount-amount">
                  {form.type === "percentage"
                    ? "Discount percentage"
                    : "Discount amount"}{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <FieldHint>
                  {form.type === "percentage"
                    ? "Enter a value from 0.01% to 100%."
                    : `The amount is in your store currency (${currency}).`}
                </FieldHint>
                <div className="relative">
                  <Input
                    id="discount-amount"
                    className="pr-14"
                    required
                    type="number"
                    min="0.01"
                    max={form.type === "percentage" ? 100 : undefined}
                    step="0.01"
                    value={form.amount}
                    onChange={(event) => update("amount", event.target.value)}
                    placeholder="10"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-neutral-500 dark:text-neutral-400">
                    {form.type === "percentage" ? "%" : currency}
                  </span>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Availability and usage"
            description="Set when customers can use this code and how many times it can be redeemed."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <Label htmlFor="discount-starts">Start date</Label>
                <FieldHint>
                  Leave blank to make the code available now.
                </FieldHint>
                <Input
                  id="discount-starts"
                  type="date"
                  value={form.startsAt}
                  onChange={(event) => update("startsAt", event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="discount-ends">Expiration date</Label>
                <FieldHint>
                  Leave blank for a code that does not expire.
                </FieldHint>
                <Input
                  id="discount-ends"
                  type="date"
                  min={form.startsAt || undefined}
                  value={form.endsAt}
                  onChange={(event) => update("endsAt", event.target.value)}
                />
              </div>
              <div className="md:max-w-sm">
                <Label htmlFor="discount-limit">Total redemption limit</Label>
                <FieldHint>
                  Leave blank to allow unlimited redemptions.
                </FieldHint>
                <Input
                  id="discount-limit"
                  type="number"
                  min="1"
                  step="1"
                  value={form.usageLimit ?? ""}
                  onChange={(event) =>
                    update(
                      "usageLimit",
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                    )
                  }
                  placeholder="Unlimited"
                />
              </div>
            </div>
            {mode === "edit" && (
              <p className="mt-4 border-t border-neutral-200 pt-4 text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                {form.usageCount} redemptions so far
              </p>
            )}
          </SectionCard>
        </div>
      </form>
    </PageFrame>
  );
}
