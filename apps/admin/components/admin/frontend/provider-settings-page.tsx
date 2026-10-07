"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, CircleAlert, Loader2, PlugZap, Trash2 } from "lucide-react";
import { apiFetch } from "@/src/lib/api";
import { useAdmin } from "@/src/admin-context";
import { PageFrame } from "@/components/admin/frontend/page-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";

type ProviderId =
  "stripe" | "razorpay" | "dodo" | "shiprocket" | "shippo" | "easypost";
type Provider = {
  id: ProviderId;
  name: string;
  description: string;
  fields: Array<{ key: string; label: string }>;
};
type Integration = {
  id: string;
  provider: ProviderId;
  status: string;
  connected: boolean;
  credentialsConfigured: boolean;
  enabled: boolean;
  mode: "test" | "live";
  priority: number;
  settings: { productMap?: Record<string, string> };
};

const paymentProviders: Provider[] = [
  {
    id: "stripe",
    name: "Stripe",
    description: "Hosted checkout for US and international payments.",
    fields: [
      { key: "secretKey", label: "Secret key" },
      { key: "webhookSecret", label: "Webhook signing secret" },
    ],
  },
  {
    id: "razorpay",
    name: "Razorpay",
    description:
      "Payment links for India and supported international payments.",
    fields: [
      { key: "keyId", label: "Key ID" },
      { key: "keySecret", label: "Key secret" },
      { key: "webhookSecret", label: "Webhook secret" },
    ],
  },
  {
    id: "dodo",
    name: "Dodo Payments",
    description:
      "Merchant-of-record checkout for digital, service, and membership products.",
    fields: [
      { key: "apiKey", label: "API key" },
      { key: "webhookSecret", label: "Webhook secret" },
    ],
  },
];
const deliveryProviders: Provider[] = [
  {
    id: "shiprocket",
    name: "Shiprocket",
    description: "Live India shipping rates, labels, and tracking.",
    fields: [
      { key: "email", label: "Account email" },
      { key: "password", label: "Account password" },
      { key: "webhookSecret", label: "Webhook secret" },
    ],
  },
  {
    id: "shippo",
    name: "Shippo",
    description: "US carrier rates, labels, and tracking.",
    fields: [
      { key: "apiToken", label: "API token" },
      { key: "webhookSecret", label: "Webhook secret" },
    ],
  },
  {
    id: "easypost",
    name: "EasyPost",
    description: "US carrier rates, labels, and tracking.",
    fields: [
      { key: "apiKey", label: "API key" },
      { key: "webhookSecret", label: "Webhook secret" },
    ],
  },
];
const providerIcons: Partial<Record<ProviderId, string>> = {
  stripe: "stipe-icon.jpeg",
  razorpay: "razorpay-icon.jpeg",
  dodo: "dodo-payments-icon.svg",
  shiprocket: "shiprocket-icon.png",
  shippo: "shippo-icon.png",
  easypost: "easypost-icon.png",
};

const countryCodes =
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(
    " ",
  );
const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
const countries = countryCodes
  .map((code) => ({
    code,
    name: countryNames.of(code) ?? code,
    flag: String.fromCodePoint(
      ...[...code].map((letter) => 127397 + letter.charCodeAt(0)),
    ),
  }))
  .sort((left, right) => left.name.localeCompare(right.name));

export function ProviderSettingsPage({
  kind,
}: {
  kind: "payments" | "delivery";
}) {
  const { selectedProjectId } = useAdmin();
  const providers = kind === "payments" ? paymentProviders : deliveryProviders;
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [credentials, setCredentials] = useState<
    Record<string, Record<string, string>>
  >({});
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [mode, setMode] = useState<Record<string, "test" | "live">>({});
  const [priority, setPriority] = useState<Record<string, number>>({});
  const [productMap, setProductMap] = useState<
    Record<string, Record<string, string>>
  >({});
  const [products, setProducts] = useState<
    Array<{ id: string; name: string; productKind: string }>
  >([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const title =
    kind === "payments" ? "Payment Providers" : "Delivery Providers";

  const load = async () => {
    if (!selectedProjectId) {
      setIntegrations([]);
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [integrationResponse, productsResponse] = await Promise.all([
        apiFetch(`/api/admin/integrations?projectId=${selectedProjectId}`, {
          cache: "no-store",
        }),
        kind === "payments"
          ? apiFetch(`/api/admin/products?projectId=${selectedProjectId}`, {
              cache: "no-store",
            })
          : Promise.resolve(null),
      ]);
      if (!integrationResponse.ok)
        throw new Error("Could not load provider settings");
      const data = await integrationResponse.json();
      const current: Integration[] = data.integrations ?? [];
      setIntegrations(current);
      setEnabled(
        Object.fromEntries(
          current.map((item) => [item.provider, item.enabled]),
        ),
      );
      setMode(
        Object.fromEntries(current.map((item) => [item.provider, item.mode])),
      );
      setPriority(
        Object.fromEntries(
          current.map((item) => [item.provider, item.priority]),
        ),
      );
      setProductMap(
        Object.fromEntries(
          current.map((item) => [
            item.provider,
            item.settings.productMap ?? {},
          ]),
        ),
      );
      if (productsResponse?.ok) {
        const productData = await productsResponse.json();
        setProducts(productData.products ?? []);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not load provider settings",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [selectedProjectId, kind]);

  const integrationByProvider = useMemo(
    () => new Map(integrations.map((item) => [item.provider, item])),
    [integrations],
  );
  const setCredential = (provider: ProviderId, field: string, value: string) =>
    setCredentials((current) => ({
      ...current,
      [provider]: { ...current[provider], [field]: value },
    }));
  const save = async (provider: Provider) => {
    if (!selectedProjectId) return;
    setSaving(provider.id);
    try {
      const response = await apiFetch("/api/admin/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          provider: provider.id,
          mode: mode[provider.id] ?? "test",
          enabled: enabled[provider.id] ?? true,
          priority: priority[provider.id] ?? 100,
          productMap: productMap[provider.id] ?? {},
          credentials: credentials[provider.id],
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not save provider");
      setCredentials((current) => ({ ...current, [provider.id]: {} }));
      toast.success(`${provider.name} credentials saved`);
      const testResponse = await apiFetch(
        `/api/admin/integrations/${provider.id}/test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: selectedProjectId }),
        },
      );
      const testData = await testResponse.json();
      if (!testResponse.ok)
        throw new Error(
          testData.error || "Credentials saved, but verification failed",
        );
      toast.success(`${provider.name} connection verified`);
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save provider",
      );
      await load();
    } finally {
      setSaving(null);
    }
  };
  const disconnect = async (provider: Provider) => {
    if (!selectedProjectId) return;
    setSaving(provider.id);
    try {
      const response = await apiFetch(
        `/api/admin/integrations/${provider.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: selectedProjectId }),
        },
      );
      if (!response.ok) throw new Error("Could not disconnect provider");
      toast.success(`${provider.name} disconnected`);
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not disconnect provider",
      );
    } finally {
      setSaving(null);
    }
  };

  return (
    <PageFrame
      title={title}
      description={
        kind === "payments"
          ? "Connect payment providers for hosted customer checkout."
          : "Connect shipping services for live rates, labels, and tracking."
      }
    >
      {kind === "delivery" && <OriginAddress projectId={selectedProjectId} />}
      {loading ? (
        <div className="space-y-3">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="h-20 animate-pulse rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#151515]"
            />
          ))}
        </div>
      ) : (
        <Accordion type="single" collapsible className="space-y-3">
          {providers.map((provider) => {
            const connected = integrationByProvider.get(provider.id);
            const busy = saving === provider.id;
            const credentialFields = provider.fields.filter(
              (field) => field.key !== "webhookSecret",
            );
            const webhookField = provider.fields.find(
              (field) => field.key === "webhookSecret",
            );
            return (
              <AccordionItem
                key={provider.id}
                value={provider.id}
                className="rounded-xl border border-neutral-200 bg-white px-5 dark:border-neutral-800 dark:bg-[#151515] sm:px-6"
              >
                <AccordionTrigger className="gap-4 py-5 text-left hover:no-underline">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    {providerIcons[provider.id] && (
                      <img
                        src={`/icons/${providerIcons[provider.id]}`}
                        alt=""
                        className="mt-0.5 h-8 w-8 shrink-0 object-contain"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {provider.name}
                        </h2>
                        <span
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] ${connected?.connected ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300" : connected?.status === "error" ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"}`}
                        >
                          {connected?.connected ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <CircleAlert className="h-3.5 w-3.5" />
                          )}
                          {connected?.connected
                            ? "Connected"
                            : connected?.status === "error"
                              ? "Needs attention"
                              : "Not connected"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-normal text-neutral-500 dark:text-neutral-400">
                        {provider.description}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="border-t border-neutral-200 pt-5 dark:border-neutral-800">
                  <div className="space-y-4">
                    <div>
                      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        Credentials
                      </p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {credentialFields.map((field) => (
                          <div className="space-y-2" key={field.key}>
                            <Label htmlFor={`${provider.id}-${field.key}`}>
                              {field.label}
                            </Label>
                            <Input
                              id={`${provider.id}-${field.key}`}
                              type="password"
                              autoComplete="new-password"
                              value={
                                credentials[provider.id]?.[field.key] ?? ""
                              }
                              onChange={(event) =>
                                setCredential(
                                  provider.id,
                                  field.key,
                                  event.target.value,
                                )
                              }
                              placeholder={
                                connected?.credentialsConfigured
                                  ? "Saved securely · enter to replace"
                                  : `Enter ${field.label.toLowerCase()}`
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    {webhookField && (
                      <div className="space-y-2">
                        <Label htmlFor={`${provider.id}-${webhookField.key}`}>
                          {webhookField.label}
                        </Label>
                        <Input
                          id={`${provider.id}-${webhookField.key}`}
                          type="password"
                          autoComplete="new-password"
                          value={
                            credentials[provider.id]?.[webhookField.key] ?? ""
                          }
                          onChange={(event) =>
                            setCredential(
                              provider.id,
                              webhookField.key,
                              event.target.value,
                            )
                          }
                          placeholder={
                            connected?.credentialsConfigured
                              ? "Saved securely · enter to replace"
                              : `Enter ${webhookField.label.toLowerCase()}`
                          }
                        />
                      </div>
                    )}
                  </div>
                  {kind === "payments" && (
                    <div className="mt-5 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        Payment routing
                      </p>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                          <Label htmlFor={`${provider.id}-mode`}>
                            Environment
                          </Label>
                          <select
                            id={`${provider.id}-mode`}
                            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
                            value={mode[provider.id] ?? "test"}
                            onChange={(event) =>
                              setMode((current) => ({
                                ...current,
                                [provider.id]: event.target.value as
                                  "test" | "live",
                              }))
                            }
                          >
                            <option value="test">Test</option>
                            <option value="live">Live</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`${provider.id}-priority`}>
                            Routing priority
                          </Label>
                          <Input
                            id={`${provider.id}-priority`}
                            type="number"
                            min={0}
                            max={1000}
                            value={priority[provider.id] ?? 100}
                            onChange={(event) =>
                              setPriority((current) => ({
                                ...current,
                                [provider.id]: Number(event.target.value),
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`${provider.id}-enabled`}>
                            Automatic routing
                          </Label>
                          <div className="flex h-10 items-center justify-between rounded-lg border border-neutral-200 px-3 dark:border-neutral-700">
                            <span className="text-sm text-neutral-600 dark:text-neutral-300">
                              Allow routing
                            </span>
                            <Switch
                              id={`${provider.id}-enabled`}
                              checked={enabled[provider.id] ?? true}
                              disabled={busy}
                              onCheckedChange={(checked) =>
                                setEnabled((current) => ({
                                  ...current,
                                  [provider.id]: checked,
                                }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {provider.id === "dodo" && (
                    <div className="mt-5 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                      <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                        Product catalog mapping
                      </h3>
                      <p className="mb-3 mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                        Map non-physical products to Dodo catalog products.
                        Match each product’s price and currency to this store.
                      </p>
                      <div className="space-y-3">
                        {products
                          .filter(
                            (product) => product.productKind !== "physical",
                          )
                          .map((product) => (
                            <div
                              key={product.id}
                              className="grid gap-2 sm:grid-cols-[1fr_1fr] sm:items-center"
                            >
                              <Label htmlFor={`dodo-${product.id}`}>
                                {product.name}
                              </Label>
                              <Input
                                id={`dodo-${product.id}`}
                                value={productMap.dodo?.[product.id] ?? ""}
                                onChange={(event) =>
                                  setProductMap((current) => ({
                                    ...current,
                                    dodo: {
                                      ...current.dodo,
                                      [product.id]: event.target.value,
                                    },
                                  }))
                                }
                                placeholder="Dodo product ID"
                              />
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                    {connected?.credentialsConfigured && (
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => void disconnect(provider)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Disconnect
                      </Button>
                    )}
                    <Button
                      disabled={
                        busy ||
                        provider.fields.some(
                          (field) =>
                            !credentials[provider.id]?.[field.key] &&
                            !connected?.credentialsConfigured,
                        )
                      }
                      onClick={() => void save(provider)}
                    >
                      {busy ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <PlugZap className="mr-2 h-4 w-4" />
                          {connected?.credentialsConfigured
                            ? "Save and verify"
                            : "Connect and verify"}
                        </>
                      )}
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </PageFrame>
  );
}

function OriginAddress({ projectId }: { projectId?: string }) {
  const [origin, setOrigin] = useState({
    name: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "IN",
  });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!projectId) return;
    apiFetch(`/api/admin/commerce-settings?projectId=${projectId}`, {
      cache: "no-store",
    })
      .then((response) => response.json())
      .then(({ settings = [] }) => {
        const value = settings.find(
          (item: { kind: string }) => item.kind === "shipping",
        )?.data?.origin;
        if (value) setOrigin((current) => ({ ...current, ...value }));
      })
      .catch(() => toast.error("Could not load shipping origin"));
  }, [projectId]);
  const save = async () => {
    if (!projectId) return;
    setSaving(true);
    try {
      const response = await apiFetch("/api/admin/commerce-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, kind: "shipping", data: { origin } }),
      });
      if (!response.ok) throw new Error("Could not save shipping origin");
      toast.success("Shipping origin saved");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not save shipping origin",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="mb-5 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-[#151515] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base text-neutral-900 dark:text-neutral-100">
            Ship-from address
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Used to calculate rates and create shipping labels.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void save()}
          disabled={saving || !projectId}
        >
          {saving ? "Saving..." : "Save address"}
        </Button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(
          [
            ["name", "Contact name", "shipping name"],
            ["phone", "Phone", "shipping tel"],
            ["address1", "Address", "shipping address-line1"],
            ["address2", "Apartment / suite", "shipping address-line2"],
            ["city", "City", "shipping address-level2"],
            ["state", "State / province", "shipping address-level1"],
            ["postalCode", "Postal code", "shipping postal-code"],
          ] as const
        ).map(([key, label, autoComplete]) => (
          <div className="space-y-2" key={key}>
            <Label htmlFor={`origin-${key}`}>{label}</Label>
            <Input
              id={`origin-${key}`}
              autoComplete={autoComplete}
              value={origin[key]}
              disabled={!projectId || saving}
              onChange={(event) =>
                setOrigin((current) => ({
                  ...current,
                  [key]: event.target.value,
                }))
              }
            />
          </div>
        ))}
        <div className="space-y-2">
          <Label htmlFor="origin-country">Country</Label>
          <Select
            value={origin.country}
            disabled={!projectId || saving}
            onValueChange={(country) =>
              setOrigin((current) => ({ ...current, country }))
            }
          >
            <SelectTrigger id="origin-country">
              <SelectValue placeholder="Select a country" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {countries.map(({ code, name, flag }) => (
                <SelectItem key={code} value={code}>
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="text-base leading-none"
                    >
                      {flag}
                    </span>
                    <span>{name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {code}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
}
