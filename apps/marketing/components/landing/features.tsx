"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { GlowCard, GlowCardGroup } from "@/components/ui/glow-card";
import { adminUrl } from "@/lib/admin-url";
import {
  ArrowUpRight,
  Layers3,
  LayoutTemplate,
  Palette,
  PenLine,
  Rocket,
  Wand2,
  Plus,
} from "lucide-react";

const features = [
  [
    "01",
    Rocket,
    "Ready for the real world",
    "Responsive output, a live preview, and a publish flow that gets your work out of the draft folder.",
    "RESPONSIVE / LIVE",
  ],
  [
    "02",
    Wand2,
    "Content that finds your voice",
    "Clear copy, useful hierarchy, and visual direction generated from your brief.",
    "COPY / IMAGERY",
  ],
  [
    "03",
    Palette,
    "A system you can actually edit",
    "Tune colors, type, spacing, dimensions, and layout in the visual builder without starting over.",
    "THEME / CONTROL",
  ],
  [
    "04",
    Layers3,
    "Business content built in",
    "Products, categories, blogs, and featured content can live inside the site you generate.",
    "CMS / CONTENT",
  ],
  [
    "05",
    LayoutTemplate,
    "A structure with intent",
    "Pages, sections, navigation, and calls to action shaped around what your business needs to say.",
    "SEO / DISCOVERABILITY",
  ],
  [
    "06",
    PenLine,
    "Revise at the right level",
    "Ask AI to rethink one section, or the whole direction while everything else stays intact.",
    "AI / REVISIONS",
  ],
] as const;

function FeatureVisual({ index }: { index: number }) {
  if (index === 0)
    return (
      <div className="relative mt-8 h-36 overflow-hidden rounded-2xl border border-gray-700/50 bg-black/30 p-4">
        <div className="flex items-center gap-2 font-mono text-[9px] text-gray-500">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
          home / generated structure
        </div>
        <div className="mt-5 flex h-20 items-end gap-2">
          {[30, 46, 38, 67, 54].map((height, i) => (
            <motion.div
              key={height}
              initial={{ height: 12 }}
              whileInView={{ height }}
              transition={{ duration: 1, delay: i * 0.08 }}
              className="flex-1 rounded-t bg-gradient-to-t from-blue-600/50 to-cyan-300/90"
            />
          ))}
        </div>
        <div className="absolute bottom-3 left-4 right-4 border-t border-dashed border-gray-700/70" />
      </div>
    );
  if (index === 1)
    return (
      <div className="relative mt-8 h-36 overflow-hidden rounded-2xl border border-gray-700/50 bg-black/30 p-4">
        <div className="font-mono text-[9px] text-gray-500">
          brand voice / clarity index
        </div>
        <div className="mt-6 flex items-center gap-3">
          <span className="text-3xl font-medium tracking-[-0.07em] text-white">
            clear
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-cyan-300 to-transparent" />
          <span className="font-mono text-[10px] text-cyan-300">94%</span>
        </div>
        <div className="mt-5 h-1 overflow-hidden rounded-full bg-gray-700/70">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "94%" }}
            transition={{ duration: 1.2 }}
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-300"
          />
        </div>
      </div>
    );
  if (index === 2)
    return (
      <div className="relative mt-8 h-36 overflow-hidden rounded-2xl border border-gray-700/50 bg-black/30 p-4">
        <div className="flex justify-between font-mono text-[9px] text-gray-500">
          <span>theme tokens</span>
          <span className="text-cyan-300">synced</span>
        </div>
        <div className="mt-6 flex items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-cyan-300 shadow-[0_0_24px_rgba(103,232,249,0.45)]" />
          <div className="h-10 w-10 rounded-full bg-blue-500" />
          <div className="h-7 w-7 rounded-full border border-white/30 bg-gray-800" />
          <div className="ml-auto space-y-2">
            <div className="h-1.5 w-20 rounded bg-white/20" />
            <div className="h-1.5 w-14 rounded bg-white/10" />
          </div>
        </div>
      </div>
    );
  if (index === 4)
    return (
      <div className="relative mt-8 h-36 overflow-hidden rounded-2xl border border-gray-700/50 bg-black/30 p-4">
        <div className="flex items-center justify-between font-mono text-[9px] text-gray-500">
          <span>search readiness</span>
          <span className="text-cyan-300">optimized</span>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <span className="text-3xl font-medium tracking-[-0.07em] text-white">
            SEO score
          </span>
          <span className="font-mono text-[10px] text-cyan-300">96 / 100</span>
        </div>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-gray-700/70">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "96%" }}
            viewport={{ once: true }}
            transition={{ duration: 1.1 }}
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-300"
          />
        </div>
      </div>
    );
  if (index === 5)
    return (
      <div className="relative mt-8 h-36 overflow-hidden rounded-2xl border border-gray-700/50 bg-black/30 p-4">
        <div className="flex items-center justify-between font-mono text-[9px] text-gray-500">
          <span>AI revision layer</span>
          <span className="text-cyan-300">component only</span>
        </div>
        <div className="mt-6 rounded-lg border border-gray-700/50 bg-white/[0.03] p-3">
          <div className="mb-3 flex items-center justify-between font-mono text-[9px] text-gray-500">
            <span>hero.subtitle</span>
            <span className="text-cyan-300">revised</span>
          </div>
          <div className="space-y-2">
            <div className="h-1.5 w-3/5 rounded bg-gray-700" />
            <motion.div
              initial={{ width: "20%" }}
              whileInView={{ width: "78%" }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-1.5 rounded bg-gradient-to-r from-blue-500 to-cyan-300"
            />
          </div>
        </div>
      </div>
    );
  return (
    <div className="relative mt-8 h-36 overflow-hidden rounded-2xl border border-gray-700/50 bg-black/30 p-4">
      <div className="flex items-center justify-between font-mono text-[9px] text-gray-500">
        <span>content collection</span>
        <Plus className="h-3.5 w-3.5 text-cyan-300" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {["Products", "Blog", "Featured"].map((item, i) => (
          <div
            key={item}
            className="rounded-lg border border-gray-700/50 bg-white/[0.03] p-2"
          >
            <div
              className={`mb-3 h-7 rounded bg-gradient-to-br ${i === 0 ? "from-cyan-300/60 to-blue-500/20" : "from-gray-600/60 to-gray-800/30"}`}
            />
            <span className="text-[9px] text-gray-400">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Features() {
  return (
    <section
      id="features"
      className="relative isolate scroll-mt-20 overflow-hidden px-5 py-20 text-white sm:px-8 sm:py-28 lg:px-[4.65vw]"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-20 h-[48rem] bg-[radial-gradient(ellipse_at_50%_28%,rgba(34,211,238,.12),transparent_42%),radial-gradient(ellipse_at_12%_72%,rgba(37,99,235,.18),transparent_36%)] blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_10%,rgba(34,211,238,.035),transparent_55%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full">
        <div className="grid items-end gap-8 md:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)] md:gap-16">
          <h2 className="pb-2 text-[clamp(2.5rem,6vw,5.2rem)] font-medium leading-[.94] tracking-[-.07em] text-white">
            More than templates,
            <span className="block w-fit bg-gradient-to-r from-white via-cyan-100 to-blue-400 bg-clip-text pr-[.08em] text-transparent">
              built to evolve.
            </span>
          </h2>

          <div className="pb-1 md:text-right">
            <p className="ml-auto max-w-[440px] text-[15px] leading-7 text-white/50 sm:text-base">
              Every layer stays editable, so your first draft can grow sharper
              without sending you back to the beginning.
            </p>
            <Link
              href={adminUrl("/onboard")}
              className="group mt-5 inline-flex items-center gap-2 text-sm font-medium text-cyan-300 transition hover:text-cyan-100"
            >
              Start with your idea
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        <div className="mt-14 overflow-hidden rounded-[24px] border border-white/[.12] bg-[#050505]/95 shadow-[0_24px_80px_rgba(0,0,0,.35)]">
          <GlowCardGroup className="glow-card-group-joined grid sm:grid-cols-2 lg:grid-cols-3">
            {features.map(([id, Icon, title, copy, label], index) => (
              <GlowCard
                key={id}
                className="min-h-[440px] rounded-none"
                contentClassName="bg-[#050505] p-6 sm:p-8"
              >
                <div className="relative z-10 mb-10 flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-300/[0.08] text-cyan-200 shadow-lg shadow-cyan-950/30">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="font-mono text-[10px] tracking-[0.16em] text-slate-600">
                    {id}
                  </span>
                </div>
                <div className="relative z-10">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-300">
                    {label}
                  </div>
                  <h3 className="mt-3 text-xl font-medium tracking-[-0.035em] text-white">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    {copy}
                  </p>
                  <FeatureVisual index={index} />
                </div>
              </GlowCard>
            ))}
          </GlowCardGroup>
        </div>
      </div>
    </section>
  );
}
