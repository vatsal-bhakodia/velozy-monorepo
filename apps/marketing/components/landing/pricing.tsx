"use client";

import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { useState } from "react";
import pricingConfig from "../../../../docs/pricing_config.json";
import { adminUrl } from "@/lib/admin-url";

type Region = "india" | "international";
type FoundationPlan = (typeof pricingConfig.foundation_plans)[number];

const currencyForRegion: Record<Region, "INR" | "USD"> = {
  india: "INR",
  international: "USD",
};

function formatMinorUnits(amount: number, currency: "INR" | "USD") {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "INR" ? 0 : 2,
  }).format(amount / 100);
}

function featuresFor(plans: FoundationPlan[], region: Region, annual: boolean) {
  const currency = currencyForRegion[region];
  const paid = plans.slice(1);
  const price = (plan: FoundationPlan) =>
    plan.prices[region][annual ? "annual_monthly_equivalent" : "monthly"];
  const yesNo = (plan: FoundationPlan, feature: string) =>
    plan.features.includes(feature) ||
    (plan.id === "scale" && plan.features.includes("all_launch_features"));

  return [
    ["AI credits included / month", "One-time trial", ...paid.map((plan) => String(plan.included_ai_credits_per_month))],
    ["Homepage draft preview", "1", "1", "1"],
    ["Published pages", ...plans.map((plan) => String(plan.limits.published_pages))],
    ["Custom domains", ...plans.map((plan) => String(plan.limits.custom_domains))],
    ["Media storage", ...plans.map((plan) => `${plan.limits.media_storage_gb} GB`)],
    ["Team editors", ...plans.map((plan) => String(plan.limits.team_editors_including_owner))],
    ["Forms and enquiries", ...plans.map((plan) => yesNo(plan, "forms") || yesNo(plan, "basic_forms"))],
    ["Blog and CMS", ...plans.map((plan) => yesNo(plan, "cms_blog") || yesNo(plan, "advanced_cms"))],
    ["Manual on-page SEO", ...plans.map((plan) => yesNo(plan, "manual_onpage_seo"))],
    ["Analytics integration", ...plans.map((plan) => yesNo(plan, "analytics_integration"))],
    ["Price", ...plans.map((plan) => formatMinorUnits(price(plan), currency))],
  ] as const;
}

export default function Pricing({ initialRegion }: { initialRegion: Region }) {
  const [annual, setAnnual] = useState(true);
  const region = initialRegion;
  const plans = pricingConfig.foundation_plans as FoundationPlan[];
  const currency = currencyForRegion[region];
  const rows = featuresFor(plans, region, annual);

  return (
    <section className="relative isolate min-h-screen overflow-hidden bg-black px-4 pb-24 pt-32 text-white sm:px-8 lg:px-12">
      <div
        className="pointer-events-none absolute inset-x-0 top-32 -z-20 h-[42rem] bg-[radial-gradient(ellipse_at_50%_45%,rgba(34,211,238,0.16),transparent_38%),radial-gradient(ellipse_at_18%_74%,rgba(37,99,235,0.25),transparent_36%),radial-gradient(ellipse_at_84%_74%,rgba(99,102,241,0.2),transparent_35%)] blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(100,180,220,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(100,180,220,0.06)_1px,transparent_1px)] bg-[size:54px_54px] opacity-30 [mask-image:linear-gradient(to_bottom,black,transparent_80%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-[1280px]">
        <div className="grid items-end gap-10 md:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)] md:gap-16">
          <h1 className="text-[3rem] font-medium leading-[.92] tracking-[-.07em] text-white sm:text-6xl lg:text-[5.25rem]">
            Simple pricing,
            <span className="block w-fit bg-gradient-to-r from-white via-cyan-100 to-blue-400 bg-clip-text pr-[.08em] text-transparent">
              real results.
            </span>
          </h1>

          <div className="pb-1 text-left md:text-right">
            <p className="ml-auto max-w-[440px] text-[15px] leading-7 text-white/60 sm:text-base">
              Preview your homepage, then publish it free on a Velozy subdomain. Upgrade when you need more pages or a custom domain.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3 md:justify-end">
              <div
                className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.045] p-1 text-xs text-slate-400 shadow-2xl shadow-cyan-950/20"
                aria-label="Billing interval"
              >
                <button
                  type="button"
                  aria-pressed={!annual}
                  onClick={() => setAnnual(false)}
                  className={`rounded-lg px-4 py-2 transition ${!annual ? "bg-white text-slate-950" : "hover:text-white"}`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  aria-pressed={annual}
                  onClick={() => setAnnual(true)}
                  className={`rounded-lg px-4 py-2 transition ${annual ? "bg-white text-slate-950" : "hover:text-white"}`}
                >
                  Yearly
                  <span
                    className={`ml-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${annual ? "bg-blue-100 text-blue-700" : "bg-blue-400/15 text-blue-300"}`}
                  >
                    annual billing
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 overflow-hidden rounded-[28px] border border-white/10 bg-[#050505] shadow-[0_30px_100px_rgba(0,0,0,.45)] backdrop-blur-xl">
          <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-3 md:gap-0 md:p-0">
            {plans.map((plan) => {
              const selectedPrice = plan.prices[region];
              const isFree = plan.id === "free";
              const amount = selectedPrice[annual ? "annual_monthly_equivalent" : "monthly"];

              return (
                <article
                  key={plan.id}
                  className={`relative flex min-h-[340px] flex-col border-t border-white/10 p-7 first:border-t-0 sm:p-9 md:border-l md:border-t-0 md:first:border-l-0 ${plan.id === "launch" ? "bg-[linear-gradient(145deg,rgba(34,211,238,0.15),rgba(37,99,235,0.08)_48%,rgba(255,255,255,0.025))]" : "bg-[linear-gradient(145deg,rgba(255,255,255,0.035),rgba(255,255,255,0.012))]"}`}
                >
                  <span aria-hidden="true" className="plan-grain pointer-events-none absolute inset-0 z-[1]" />
                  {plan.id === "launch" && (
                    <div className="absolute right-7 top-7 rounded-full bg-cyan-300 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-950">
                      Most popular
                    </div>
                  )}
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    {plan.id === "free" ? "Publish on a Velozy subdomain" : plan.id === "launch" ? "For getting started" : "For growing sites"}
                  </p>
                  <h2 className="mt-5 text-2xl font-medium tracking-tight">{plan.name}</h2>
                  <p className="mt-3 max-w-[240px] text-sm leading-6 text-slate-300/80">
                    {plan.id === "free"
                      ? "Create, preview, and publish one homepage for free."
                      : plan.id === "launch"
                        ? "Publish your site with the core tools to build and grow."
                        : "More publishing capacity and tools for established sites."}
                  </p>
                  <div className="mt-auto pt-8">
                    {isFree ? (
                      <span className="text-4xl font-semibold tracking-[-0.05em]">Free</span>
                    ) : (
                      <>
                        <span className="text-5xl font-semibold tracking-[-0.06em]">
                          {formatMinorUnits(amount, currency)}
                        </span>
                        <span className="ml-2 text-sm text-slate-400">/ month</span>
                        {annual && (
                          <p className="mt-1 text-xs text-slate-400">
                            {formatMinorUnits(selectedPrice.annual_total, currency)} billed yearly
                          </p>
                        )}
                      </>
                    )}
                    <Link
                      href={adminUrl("/signup")}
                      className={`relative z-10 mt-6 flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5 ${plan.id === "launch" ? "bg-white text-slate-950 hover:bg-cyan-100" : "border border-white/20 bg-white/[0.04] text-white hover:border-cyan-300/60 hover:bg-cyan-300/10"}`}
                    >
                      {isFree ? "Start free" : `Choose ${plan.name}`}
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="border-t border-white/10 px-5 py-5 sm:px-9">
            <div className="overflow-x-auto">
              <div className="min-w-[620px]">
                <div className="mb-3 grid grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))] gap-3 text-[10px] uppercase tracking-[0.18em] text-slate-400 sm:text-xs">
                  <span>Plan details</span>
                  {plans.map((plan) => (
                    <span key={plan.id} className={`text-center ${plan.id === "launch" ? "text-cyan-300" : ""}`}>
                      {plan.name}
                    </span>
                  ))}
                </div>
                {rows.map(([label, ...values], index) => (
                  <div
                    key={label}
                    className={`feature-row grid grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))] items-center gap-3 rounded-xl px-3 py-4 text-xs sm:px-4 sm:text-sm ${index % 2 === 0 ? "bg-white/[0.035]" : ""}`}
                  >
                    <span className="text-slate-300">{label}</span>
                    {values.map((value, valueIndex) => (
                      <span key={`${label}-${valueIndex}`} className="flex justify-center text-center text-slate-300/80">
                        {typeof value === "boolean" ? (
                          value ? <Check aria-label="Included" className="h-4 w-4 text-cyan-300" /> : <span aria-label="Not included" className="text-slate-500">—</span>
                        ) : value}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <p className="mt-7 text-center text-xs text-slate-400">
          Free includes one published homepage on a Velozy subdomain. Additional pages and custom domains require a paid plan.
        </p>
      </div>
    </section>
  );
}
