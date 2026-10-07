"use client";

import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { useState } from "react";
import { adminUrl } from "@/lib/admin-url";

type Plan = {
  name: string;
  eyebrow: string;
  monthly: number | null;
  annual: number | null;
  description: string;
  featured?: boolean;
  cta: string;
};

const plans: Plan[] = [
  {
    name: "Launch",
    eyebrow: "For getting started",
    monthly: 19,
    annual: 15,
    description: "Everything you need to turn one great idea into a live site.",
    cta: "Start building",
  },
  {
    name: "Studio",
    eyebrow: "For growing teams",
    monthly: 49,
    annual: 39,
    description:
      "More room to experiment, iterate, and ship polished work faster.",
    featured: true,
    cta: "Choose Studio",
  },
  {
    name: "Scale",
    eyebrow: "For serious production",
    monthly: null,
    annual: null,
    description:
      "A flexible setup for teams building across brands and clients.",
    cta: "Talk to sales",
  },
];

const features = [
  ["AI website generations", "5", "Unlimited", "Unlimited"],
  ["Published websites", "1", "10", "Unlimited"],
  ["Visual editor & customization", true, true, true],
  ["Premium components", false, true, true],
  ["Custom domains", false, true, true],
  ["Brand kit & shared assets", false, true, true],
  ["Priority support", false, true, true],
  ["Team workspaces", false, false, true],
];

export default function Pricing() {
  const [annual, setAnnual] = useState(true);

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
            <p className="ml-auto max-w-[440px] text-[15px] leading-7 text-white/50 sm:text-base">
              Start on any tier. Move up or down whenever your work demands it.
            </p>

            <div className="mt-6 inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.045] p-1 text-xs text-slate-400 shadow-2xl shadow-cyan-950/20">
              <button
                onClick={() => setAnnual(false)}
                className={`rounded-lg px-4 py-2 transition ${!annual ? "bg-white text-slate-950" : "hover:text-white"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`rounded-lg px-4 py-2 transition ${annual ? "bg-white text-slate-950" : "hover:text-white"}`}
              >
                Yearly
                <span
                  className={`ml-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${annual ? "bg-blue-100 text-blue-700" : "bg-blue-400/15 text-blue-300"}`}
                >
                  save 20%
                </span>
              </button>
            </div>
            <p className="mt-2 text-[11px] text-white/35">
              Billed {annual ? "yearly" : "monthly"} · cancel anytime
            </p>
          </div>
        </div>

        <div className="mt-16 overflow-hidden rounded-[28px] border border-white/10 bg-[#050505] shadow-[0_30px_100px_rgba(0,0,0,.45)] backdrop-blur-xl">
          <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-3 md:gap-0 md:p-0">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`relative flex min-h-[340px] flex-col border-t border-white/10 p-7 first:border-t-0 sm:p-9 md:border-l md:border-t-0 md:first:border-l-0 ${plan.featured ? "bg-[linear-gradient(145deg,rgba(34,211,238,0.15),rgba(37,99,235,0.08)_48%,rgba(255,255,255,0.025))]" : "bg-[linear-gradient(145deg,rgba(255,255,255,0.035),rgba(255,255,255,0.012))]"}`}
              >
                <span
                  aria-hidden="true"
                  className="plan-grain pointer-events-none absolute inset-0 z-[1]"
                ></span>
                {plan.featured && (
                  <div className="absolute right-7 top-7 rounded-full bg-cyan-300 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-950">
                    Most popular
                  </div>
                )}
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  {plan.eyebrow}
                </p>
                <h2 className="mt-5 text-2xl font-medium tracking-tight">
                  {plan.name}
                </h2>
                <p className="mt-3 max-w-[240px] text-sm leading-6 text-slate-400">
                  {plan.description}
                </p>
                <div className="mt-auto pt-8">
                  {plan.monthly ? (
                    <>
                      <span className="text-5xl font-semibold tracking-[-0.06em]">
                        ${annual ? plan.annual : plan.monthly}
                      </span>
                      <span className="ml-2 text-sm text-slate-500">
                        / month
                      </span>
                    </>
                  ) : (
                    <span className="text-4xl font-semibold tracking-[-0.05em]">
                      Let&apos;s talk
                    </span>
                  )}
                  <Link
                    href={
                      plan.monthly
                        ? adminUrl("/signup")
                        : "mailto:hello@aibuilder.dev"
                    }
                    className={`mt-6 flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5 ${plan.featured ? "bg-white text-slate-950 hover:bg-cyan-100" : "border border-white/20 bg-white/[0.04] text-white hover:border-cyan-300/60 hover:bg-cyan-300/10"}`}
                  >
                    {plan.cta}
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <div className="border-t border-white/10 px-5 py-5 sm:px-9">
            <div className="mb-3 grid grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))] gap-3 text-[10px] uppercase tracking-[0.18em] text-slate-500 sm:text-xs">
              <span>Everything included</span>
              <span className="text-center">Launch</span>
              <span className="text-center text-cyan-300">Studio</span>
              <span className="text-center">Scale</span>
            </div>
            {features.map(([label, ...values], index) => (
              <div
                key={label as string}
                className={`feature-row grid grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))] items-center gap-3 rounded-xl px-3 py-4 text-xs sm:px-4 sm:text-sm ${index % 2 === 0 ? "bg-white/[0.035]" : ""}`}
              >
                <span className="text-slate-300">{label}</span>
                {values.map((value, i) => (
                  <span
                    key={`${label}-${i}`}
                    className="flex justify-center text-center text-slate-400"
                  >
                    {typeof value === "boolean" ? (
                      value ? (
                        <Check className="h-4 w-4 text-cyan-300" />
                      ) : (
                        <span className="text-slate-700">—</span>
                      )
                    ) : (
                      value
                    )}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
        <p className="mt-7 text-center text-xs text-slate-600">
          All plans include secure hosting, SSL, and access to the AI assistant.
          Cancel anytime.
        </p>
      </div>
    </section>
  );
}
