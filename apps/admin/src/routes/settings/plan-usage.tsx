import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Check, Clock3, FileText, Sparkles, Zap } from "lucide-react";
import { PageFrame } from "@/components/admin/frontend/page-frame";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/src/admin-context";
import { apiRequest } from "@/src/lib/api";

type Plan = {
  id: string;
  name: string;
  monthly: number;
  annualTotal: number;
  annualMonthlyEquivalent: number;
  includedCredits: number;
  oneTimeTrialCredits: number;
  limits: Record<string, number | string>;
  features: string[];
  paidCreditsPurchaseAllowed: boolean;
};
type Topup = { id: string; credits: number; amount: number };
type Billing = {
  project: { id: string; name: string };
  region: "india" | "international";
  currency: "INR" | "USD";
  subscription: null | {
    plan: string;
    planName: string;
    interval: "month" | "year";
    status: string;
    currency: string;
    priceAmount: number;
    currentPeriodStart: string | null;
    activeUntil: string | null;
    cancelAtPeriodEnd: string | null;
    scheduledPlan: string | null;
    scheduledInterval: string | null;
  };
  usage: {
    cycleStart: string;
    cycleEnd: string | null;
    aiCredits: { subscriptionBalance: number; purchasedBalance: number; reservedBalance: number; used: number; monthlyAllowance: number };
    publishedPages: number;
  };
  plans: Plan[];
  topups: Topup[];
  billingConfigured: boolean;
};
type PageViews = { period: { from: string; to: string }; pageViews: string; daily: Array<{ periodStart: string; pageViews: string }> };

const card = "rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900";
const money = (amount: number, currency: string) => new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount / 100);
const date = (value: string | null | undefined) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)) : null;
const featureNames: Record<string, string> = {
  velozy_subdomain: "Velozy subdomain",
  branding_required: "Velozy branding on your site",
  responsive_builder: "Responsive website builder",
  basic_forms: "Basic contact forms",
  manual_onpage_seo: "On-page SEO controls",
  seo_sitemap: "XML sitemap",
  ssl: "SSL security",
  custom_domain: "Custom domain",
  cms_blog: "Blog and content management",
  forms: "Forms and lead capture",
  sitemap: "XML sitemap",
  robots_controls: "Robots.txt controls",
  canonical_urls: "Canonical URLs",
  redirects: "URL redirects",
  basic_seo_checks: "SEO checks",
  analytics_integration: "Analytics integration",
  all_launch_features: "Everything in Launch",
  advanced_cms: "Advanced content management",
  staging: "Staging site",
  enhanced_backups: "Enhanced backups",
  higher_site_usage: "Higher usage limits",
  priority_job_queue: "Priority AI job queue",
};
const featureLabel = (feature: string) => featureNames[feature] ?? feature.replaceAll("_", " ");

export default function PlanUsage() {
  const { selectedProjectId } = useAdmin();
  const queryClient = useQueryClient();
  const [interval, setInterval] = useState<"month" | "year">("year");
  const [message, setMessage] = useState("");
  const billing = useQuery({
    queryKey: ["billing", selectedProjectId],
    queryFn: () => apiRequest<Billing>(`/api/admin/billing?projectId=${selectedProjectId}`),
    enabled: Boolean(selectedProjectId),
    staleTime: 20_000,
  });
  const pageViews = useQuery({
    queryKey: ["plan-usage", selectedProjectId],
    queryFn: () => apiRequest<PageViews>(`/api/admin/growth/usage?projectId=${selectedProjectId}`),
    enabled: Boolean(selectedProjectId),
    staleTime: 60_000,
  });

  const purchase = useMutation({
    mutationFn: async ({ path, body, idempotent }: { path: string; body: Record<string, string>; idempotent?: boolean }) => {
      const headers = new Headers({ "Content-Type": "application/json" });
      if (idempotent) headers.set("Idempotency-Key", crypto.randomUUID());
      const result = await apiRequest<{ checkoutUrl?: string; scheduled?: boolean; message?: string }>(path, { method: "POST", headers, body: JSON.stringify(body) });
      if (result.checkoutUrl) window.location.assign(result.checkoutUrl);
      else setMessage(result.message || (path.endsWith("/free") ? "Free plan activated." : "Plan updated."));
      await queryClient.invalidateQueries({ queryKey: ["billing", selectedProjectId] });
      return result;
    },
  });

  const result = billing.data;
  const subscription = result?.subscription;
  const activePaid = Boolean(subscription && subscription.plan !== "free" && ["active", "trialing", "cancelled", "canceled"].includes(subscription.status));
  const canBuyCredits = Boolean(activePaid && result?.plans.find((plan) => plan.id === subscription?.plan)?.paidCreditsPurchaseAllowed);
  const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
  const returnedFromCheckout = params.get("billing") === "return";

  return (
    <PageFrame title="Billing & usage">
      {!selectedProjectId ? (
        <div className={`${card} p-8 text-center text-sm text-neutral-500`}>Select a project to manage billing.</div>
      ) : billing.isLoading ? (
        <div className="py-12 text-sm text-neutral-500">Loading billing details…</div>
      ) : billing.error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Billing details could not be loaded. {billing.error.message}</div>
      ) : result ? (
        <div className="space-y-7">
          {returnedFromCheckout && <div role="status" className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200">Checkout returned. Dodo is confirming payment; this page updates when its signed webhook arrives.</div>}
          {message && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">{message}</div>}
          {purchase.error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">{purchase.error.message}</div>}

          <section className={`${card} overflow-hidden shadow-sm`}>
            <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-[1.4fr_1fr] md:items-center md:p-7">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-3xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">{subscription?.planName ?? "No plan selected"}</h2>
                  {subscription && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300">{subscription.status === "cancelled" || subscription.status === "canceled" ? "Ending" : "Active"}</span>}
                </div>
                {subscription && subscription.plan !== "free" && <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{subscription.interval === "year" ? "Billed annually" : "Billed monthly"} · {money(subscription.priceAmount, subscription.currency)} per billing cycle</p>}
              </div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-950/60">
                <p className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400"><Clock3 className="h-4 w-4" /> {subscription?.cancelAtPeriodEnd ? "Access ends" : "Active through"}</p>
                <p className="mt-2 text-xl font-medium text-neutral-950 dark:text-neutral-50">{subscription ? subscription.plan === "free" ? "No scheduled end" : date(subscription.activeUntil) ?? "Waiting for billing confirmation" : "No active plan"}</p>
                {subscription?.scheduledPlan && <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{subscription.scheduledPlan} {subscription.scheduledInterval} starts at renewal.</p>}
              </div>
            </div>
          </section>

          {!result.billingConfigured && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">Plan and credit checkout is not configured yet. You can still choose the Free plan.</p>}

          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-xl font-semibold tracking-tight">Credits and project limits</h2>
              <div className="text-xs text-neutral-500">{date(result.usage.cycleStart)}{result.usage.cycleEnd ? ` – ${date(result.usage.cycleEnd)}` : " · Current month"}</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <article className={`${card} p-4`}>
                <p className="flex items-center gap-2 text-xs text-neutral-500"><Sparkles className="h-4 w-4" /> Available AI credits</p>
                <p className="mt-3 text-3xl font-semibold tabular-nums">{result.usage.aiCredits.subscriptionBalance + result.usage.aiCredits.purchasedBalance}</p>
                <p className="mt-1 text-xs text-neutral-500">{result.usage.aiCredits.subscriptionBalance} plan · {result.usage.aiCredits.purchasedBalance} purchased</p>
              </article>
              <article className={`${card} p-4`}>
                <p className="flex items-center gap-2 text-xs text-neutral-500"><Zap className="h-4 w-4" /> AI credits used</p>
                <p className="mt-3 text-3xl font-semibold tabular-nums">{result.usage.aiCredits.used}</p>
                <p className="mt-1 text-xs text-neutral-500">{subscription?.plan === "free" ? "Free trial credits are granted once; no monthly refill" : `${result.usage.aiCredits.monthlyAllowance} included each month`}</p>
              </article>
              <article className={`${card} p-4`}>
                <p className="flex items-center gap-2 text-xs text-neutral-500"><FileText className="h-4 w-4" /> Published pages</p>
                <p className="mt-3 text-3xl font-semibold tabular-nums">{result.usage.publishedPages}</p>
                <p className="mt-1 text-xs text-neutral-500">of {subscription ? result.plans.find((plan) => plan.id === subscription.plan)?.limits.published_pages ?? 0 : 0} included</p>
              </article>
              <article className={`${card} p-4`}>
                <p className="flex items-center gap-2 text-xs text-neutral-500"><BarChartIcon /> Published page views</p>
                <p className="mt-3 text-3xl font-semibold tabular-nums">{Number(pageViews.data?.pageViews ?? 0).toLocaleString()}</p>
                <p className="mt-1 text-xs text-neutral-500">Current 30-day reporting window</p>
              </article>
            </div>
          </section>

          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-xl font-semibold tracking-tight">Plans</h2>
              <div className="inline-flex rounded-full border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-800 dark:bg-neutral-950" aria-label="Billing interval">
                {(["month", "year"] as const).map((option) => <button key={option} type="button" aria-pressed={interval === option} onClick={() => setInterval(option)} className={`rounded-full px-4 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${interval === option ? "bg-white text-neutral-950 shadow-sm dark:bg-neutral-800 dark:text-white" : "text-neutral-500"}`}>{option === "month" ? "Monthly" : "Annual"}</button>)}
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {result.plans.map((plan) => {
                const amount = interval === "month" ? plan.monthly : plan.annualMonthlyEquivalent;
                const current = subscription?.plan === plan.id && subscription.interval === interval;
                const isFree = plan.id === "free";
                const disabled = purchase.isPending || current || (isFree && Boolean(subscription)) || (!isFree && !result.billingConfigured);
                const annualSavings = plan.monthly > 0 ? Math.round((1 - plan.annualTotal / (plan.monthly * 12)) * 100) : 0;
                return <article key={plan.id} className={`${card} relative flex flex-col p-5 ${plan.id === "scale" ? "border-emerald-500/70 shadow-md dark:border-emerald-500/60" : ""}`}>
                  {plan.id === "scale" && <span className="absolute right-4 top-4 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-900">More room</span>}
                  <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">{plan.name}</h3>
                  <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <p className="text-3xl font-semibold tracking-tight">{isFree ? "Free" : money(amount, result.currency)}<span className="ml-1 text-sm font-normal text-neutral-500">{isFree ? "" : "/ month"}</span></p>
                    {interval === "year" && !isFree && annualSavings > 0 && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">Save {annualSavings}%</span>}
                  </div>
                  {!isFree && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{interval === "year" ? `Billed ${money(plan.annualTotal, result.currency)} yearly` : "Billed monthly"}</p>}
                  <p className="mt-4 flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-emerald-600" /> {isFree ? `${plan.oneTimeTrialCredits} one-time AI credits` : `${plan.includedCredits} AI credits each month`}</p>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{plan.limits.published_pages} published pages · {plan.limits.custom_domains} custom domains</p>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{plan.limits.team_editors_including_owner} team members</p>
                  <ul className="mt-4 space-y-2 border-t border-neutral-200 pt-4 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
                    {plan.features.map((feature) => <li key={feature} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" /><span>{featureLabel(feature)}</span></li>)}
                  </ul>
                  <div className="mt-auto pt-6">
                    <Button className="w-full" variant={current ? "secondary" : "default"} disabled={disabled} onClick={() => {
                      setMessage("");
                      if (isFree) purchase.mutate({ path: "/api/admin/billing/free", body: { projectId: selectedProjectId! } });
                      else purchase.mutate({ path: "/api/admin/billing/checkout", body: { projectId: selectedProjectId!, planId: plan.id, interval }, idempotent: true });
                    }}>{current ? "Current plan" : isFree ? subscription ? "Free plan unavailable" : "Choose Free" : subscription ? `Switch to ${plan.name}` : `Choose ${plan.name}`}{!current && !isFree && <ArrowUpRight className="ml-2 h-4 w-4" />}</Button>
                    {isFree && <p className="mt-2 text-center text-[11px] text-neutral-500">One-time trial credits do not refill monthly</p>}
                  </div>
                </article>;
              })}
            </div>
          </section>

          {canBuyCredits && <section className={`${card} overflow-hidden`}>
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-200 p-5 dark:border-neutral-800">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">AI credit packs</h2>
                <p className="mt-1 text-sm text-neutral-500">Purchased credits carry forward while this project remains active.</p>
              </div>
              {!canBuyCredits && <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">Launch or Scale required</span>}
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
              {result.topups.map((pack) => <article key={pack.id} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                <p className="text-2xl font-semibold tabular-nums">{pack.credits.toLocaleString()}</p>
                <p className="text-xs text-neutral-500">AI credits</p>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{money(pack.amount, result.currency)}</span>
                  <Button size="sm" variant="outline" disabled={!canBuyCredits || purchase.isPending || !result.billingConfigured} onClick={() => purchase.mutate({ path: "/api/admin/billing/topups/checkout", body: { projectId: selectedProjectId!, packId: pack.id }, idempotent: true })}>Add credits</Button>
                </div>
              </article>)}
            </div>
          </section>}

          <p className="text-xs leading-5 text-neutral-500">Prices are {result.currency} and exclude applicable taxes. Plan changes and credit purchases are confirmed by Dodo before balances or access change.</p>
        </div>
      ) : null}
    </PageFrame>
  );
}

function BarChartIcon() {
  return <span aria-hidden="true" className="inline-flex h-4 w-4 items-end gap-0.5"><i className="h-2 w-1 rounded-sm bg-current"/><i className="h-3 w-1 rounded-sm bg-current"/><i className="h-4 w-1 rounded-sm bg-current"/></span>;
}
