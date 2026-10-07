"use client";

import { apiFetch } from "@/src/lib/api";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAdmin } from "@/src/admin-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageFrame, SectionCard } from "./page-frame";

type Kind = "locations" | "shipping" | "notifications";
type Location = {
  id: string;
  name: string;
  code: string;
  address: string;
  active: boolean;
};
type Zone = {
  id: string;
  name: string;
  regions: string;
  rate: string;
  freeThreshold: string;
  taxRate: string;
  active: boolean;
};
type NotificationEvent = { enabled: boolean; subject: string; body: string };
const defaults = {
  locations: [
    {
      id: "default",
      name: "Default location",
      code: "DEFAULT",
      address: "",
      active: true,
    },
  ] as Location[],
  zones: [] as Zone[],
  events: {
    orderCreated: {
      enabled: true,
      subject: "Your order was received",
      body: "Thanks for your order.",
    },
    paymentStatus: {
      enabled: true,
      subject: "Payment update",
      body: "Your payment status changed.",
    },
    fulfillment: {
      enabled: true,
      subject: "Your order shipped",
      body: "Your order is on the way.",
    },
    returnRequested: {
      enabled: true,
      subject: "Return request received",
      body: "We received your return request.",
    },
  } as Record<string, NotificationEvent>,
};
const notificationDetails: Record<
  string,
  { title: string; description: string }
> = {
  orderCreated: {
    title: "Order confirmation",
    description: "Notify customers when their order has been received.",
  },
  paymentStatus: {
    title: "Payment updates",
    description: "Keep customers informed when their payment status changes.",
  },
  fulfillment: {
    title: "Fulfillment updates",
    description: "Let customers know when their order ships.",
  },
  returnRequested: {
    title: "Return requests",
    description: "Confirm when a return request has been received.",
  },
};

export function CommerceSettingsPage({ kind }: { kind: Kind }) {
  const { selectedProjectId } = useAdmin();
  const [locations, setLocations] = useState<Location[]>(defaults.locations);
  const [zones, setZones] = useState<Zone[]>(defaults.zones);
  const [events, setEvents] = useState(defaults.events);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    if (!selectedProjectId) {
      setLoading(false);
      return () => {
        active = false;
      };
    }
    setLoading(true);
    apiFetch(`/api/admin/commerce-settings?projectId=${selectedProjectId}`)
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load settings");
        return response.json();
      })
      .then(({ settings = [] }) => {
        if (!active) return;
        const setting = settings.find(
          (item: { kind: string }) => item.kind === kind,
        );
        if (setting?.data) {
          if (kind === "locations")
            setLocations(setting.data.locations ?? defaults.locations);
          if (kind === "shipping") setZones(setting.data.zones ?? []);
          if (kind === "notifications")
            setEvents(setting.data.events ?? defaults.events);
        }
      })
      .catch(() => {
        if (active) toast.error("Failed to load settings");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [kind, selectedProjectId]);
  const save = async () => {
    if (!selectedProjectId) return;
    setSaving(true);
    const data =
      kind === "locations"
        ? { locations }
        : kind === "shipping"
          ? { zones }
          : { events };
    try {
      const response = await apiFetch("/api/admin/commerce-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProjectId, kind, data }),
      });
      if (!response.ok) throw new Error();
      toast.success("Commerce settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };
  const title =
    kind === "locations"
      ? "Inventory Locations"
      : kind === "shipping"
        ? "Shipping & Taxes"
        : "Notifications";
  const description =
    kind === "locations"
      ? "Define where project inventory is stored."
      : kind === "shipping"
        ? "Configure regional shipping rates and tax inputs."
        : "Control event notifications and their message templates.";

  if (kind === "notifications") {
    return (
      <PageFrame title={title} description={description}>
        <div className="space-y-4">
          {Object.entries(events).map(([key, event]) => {
            const detail = notificationDetails[key] ?? {
              title: key.replace(/([A-Z])/g, " $1"),
              description: "Choose whether to send this customer notification.",
            };
            const subjectId = `notification-${key}-subject`;
            const messageId = `notification-${key}-message`;
            return (
              <section
                key={key}
                className="rounded-xl border border-neutral-200 bg-white px-5 py-5 dark:border-neutral-800 dark:bg-[#151515] sm:px-5"
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0 space-y-1">
                    <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {detail.title}
                    </h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {detail.description}
                    </p>
                  </div>
                  <Switch
                    id={`notification-${key}-enabled`}
                    checked={event.enabled}
                    disabled={loading || saving || !selectedProjectId}
                    onCheckedChange={(enabled) =>
                      setEvents((current) => ({
                        ...current,
                        [key]: { ...current[key], enabled },
                      }))
                    }
                    aria-label={`Enable ${detail.title.toLowerCase()}`}
                  />
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor={subjectId}>Email subject</Label>
                    <Input
                      id={subjectId}
                      className="mt-2"
                      value={event.subject}
                      disabled={loading || saving || !selectedProjectId}
                      onChange={(input) =>
                        setEvents((current) => ({
                          ...current,
                          [key]: {
                            ...current[key],
                            subject: input.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor={messageId}>Message</Label>
                    <Input
                      id={messageId}
                      className="mt-2"
                      value={event.body}
                      disabled={loading || saving || !selectedProjectId}
                      onChange={(input) =>
                        setEvents((current) => ({
                          ...current,
                          [key]: { ...current[key], body: input.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
              </section>
            );
          })}
        </div>
        <div className="mt-5 flex justify-end">
          <Button
            onClick={save}
            disabled={saving || loading || !selectedProjectId}
          >
            {saving ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame title={title} description={description}>
      <SectionCard
        title={
          kind === "locations"
            ? "Locations"
            : kind === "shipping"
              ? "Shipping zones and rates"
              : "Event templates"
        }
        description={loading ? "Loading saved settings…" : undefined}
      >
        {kind === "locations" && (
          <div className="space-y-3">
            {locations.map((location, index) => (
              <div
                key={location.id}
                className="grid gap-3 rounded-lg border border-neutral-700 p-4 md:grid-cols-[1fr_140px_1.5fr_auto]"
              >
                <div>
                  <Label>Name</Label>
                  <Input
                    className="mt-2"
                    value={location.name}
                    onChange={(event) =>
                      setLocations((items) =>
                        items.map((item, i) =>
                          i === index
                            ? { ...item, name: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
                <div>
                  <Label>Code</Label>
                  <Input
                    className="mt-2"
                    value={location.code}
                    onChange={(event) =>
                      setLocations((items) =>
                        items.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                code: event.target.value.toUpperCase(),
                              }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input
                    className="mt-2"
                    value={location.address}
                    onChange={(event) =>
                      setLocations((items) =>
                        items.map((item, i) =>
                          i === index
                            ? { ...item, address: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
                <Button
                  variant="ghost"
                  className="self-end"
                  onClick={() =>
                    setLocations((items) => items.filter((_, i) => i !== index))
                  }
                  disabled={locations.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() =>
                setLocations((items) => [
                  ...items,
                  {
                    id: crypto.randomUUID(),
                    name: "New location",
                    code: "NEW",
                    address: "",
                    active: true,
                  },
                ])
              }
            >
              <Plus className="mr-1 h-4 w-4" />
              Add location
            </Button>
          </div>
        )}
        {kind === "shipping" && (
          <div className="space-y-3">
            {zones.map((zone, index) => (
              <div
                key={zone.id}
                className="grid gap-3 rounded-lg border border-neutral-700 p-4 md:grid-cols-[1fr_1fr_110px_110px_110px_auto]"
              >
                <div>
                  <Label>Zone</Label>
                  <Input
                    className="mt-2"
                    value={zone.name}
                    onChange={(event) =>
                      setZones((items) =>
                        items.map((item, i) =>
                          i === index
                            ? { ...item, name: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
                <div>
                  <Label>Regions</Label>
                  <Input
                    className="mt-2"
                    placeholder="US, CA"
                    value={zone.regions}
                    onChange={(event) =>
                      setZones((items) =>
                        items.map((item, i) =>
                          i === index
                            ? { ...item, regions: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
                <div>
                  <Label>Rate</Label>
                  <Input
                    className="mt-2"
                    type="number"
                    min="0"
                    step="0.01"
                    value={zone.rate}
                    onChange={(event) =>
                      setZones((items) =>
                        items.map((item, i) =>
                          i === index
                            ? { ...item, rate: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
                <div>
                  <Label>Free over</Label>
                  <Input
                    className="mt-2"
                    type="number"
                    min="0"
                    step="0.01"
                    value={zone.freeThreshold}
                    onChange={(event) =>
                      setZones((items) =>
                        items.map((item, i) =>
                          i === index
                            ? { ...item, freeThreshold: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
                <div>
                  <Label>Tax %</Label>
                  <Input
                    className="mt-2"
                    type="number"
                    min="0"
                    step="0.01"
                    value={zone.taxRate}
                    onChange={(event) =>
                      setZones((items) =>
                        items.map((item, i) =>
                          i === index
                            ? { ...item, taxRate: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
                <Button
                  variant="ghost"
                  className="self-end"
                  onClick={() =>
                    setZones((items) => items.filter((_, i) => i !== index))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() =>
                setZones((items) => [
                  ...items,
                  {
                    id: crypto.randomUUID(),
                    name: "New zone",
                    regions: "",
                    rate: "0",
                    freeThreshold: "0",
                    taxRate: "0",
                    active: true,
                  },
                ])
              }
            >
              <Plus className="mr-1 h-4 w-4" />
              Add zone
            </Button>
            <p className="pt-2 text-xs text-neutral-500">
              Shipping and tax values are persisted as project rules and can be
              applied by checkout when calculation is connected.
            </p>
          </div>
        )}
      </SectionCard>
      <div className="mt-5 flex justify-end">
        <Button onClick={save} disabled={saving || loading}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </PageFrame>
  );
}
