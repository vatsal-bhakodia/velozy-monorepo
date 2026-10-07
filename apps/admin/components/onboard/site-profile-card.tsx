"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Image as ImageIcon,
  LayoutTemplate,
  UserRound,
} from "lucide-react";
import type { SiteProfile } from "@/src/onboard/types";

type SnapshotItemProps = {
  index: string;
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
};

function SnapshotItem({
  index,
  label,
  value,
  icon: Icon,
  className = "",
}: SnapshotItemProps) {
  return (
    <div
      className={`group relative min-w-0 overflow-hidden rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-4 transition-colors hover:border-cyan-400/50 dark:border-neutral-700 dark:bg-neutral-800/80 dark:hover:border-cyan-400/50 ${className}`}
    >
      <span className="absolute right-3 top-2.5 font-mono text-[9px] font-medium tracking-widest text-neutral-300 dark:text-neutral-600">
        {index}
      </span>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-600 transition-transform duration-300 group-hover:-translate-y-0.5 dark:text-cyan-400">
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
            {label}
          </p>
          <p className="mt-1 truncate text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export const SiteProfileCard = ({
  siteProfile,
  logoPreview,
}: {
  siteProfile: SiteProfile;
  logoPreview?: string | null;
}) => {
  const siteType = siteProfile.archetype
    ? siteProfile.archetype === "landing"
      ? "Landing Page"
      : siteProfile.archetype
    : "Not specified";
  const logo = logoPreview || siteProfile.logo;
  const hasImageLogo = logo?.startsWith("data:image/");

  return (
    <motion.article
      initial={{ opacity: 0, y: 18, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto w-full max-w-[520px] overflow-hidden rounded-[1.75rem] border border-neutral-200/90 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)] dark:border-neutral-700 dark:bg-neutral-900 dark:shadow-[0_24px_70px_rgba(0,0,0,0.3)]"
    >
      <header className="relative flex items-center gap-3.5 border-b border-neutral-200/80 px-5 py-5 dark:border-neutral-700/80 sm:px-6">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient text-white shadow-lg shadow-cyan-500/15">
          <Building2 className="h-[22px] w-[22px]" />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-cyan-400 dark:border-neutral-900" />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-400">
            Business dossier
          </p>
          <h3 className="mt-1 text-xl font-bold tracking-[-0.025em] text-neutral-950 dark:text-white">
            Site Profile
          </h3>
        </div>
        <div className="ml-auto flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 dark:border-neutral-700 dark:bg-neutral-800">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-neutral-600 dark:text-neutral-300">
            Ready
          </span>
        </div>
      </header>

      <div className="space-y-3 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <SnapshotItem
            index="01"
            label="Business name"
            value={siteProfile.name || "Not specified"}
            icon={UserRound}
          />
          <SnapshotItem
            index="02"
            label="Industry"
            value={siteProfile.industry || "Not specified"}
            icon={Building2}
          />
        </div>

        <SnapshotItem
          index="03"
          label="Site type"
          value={siteType.toUpperCase()}
          icon={LayoutTemplate}
        />

        <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-4 dark:border-neutral-700 dark:bg-neutral-800/80">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                <ImageIcon aria-hidden="true" className="h-4 w-4" />
              </div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
                Brand mark
              </p>
            </div>
            <span className="font-mono text-[9px] font-medium tracking-widest text-neutral-300 dark:text-neutral-600">
              04
            </span>
          </div>

          <div className="relative flex h-[154px] w-full items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:border-neutral-700 dark:bg-neutral-950">
            <div className="absolute inset-0 opacity-[0.035] dark:opacity-[0.07] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:20px_20px]" />
            {hasImageLogo ? (
              <div className="relative h-[112px] w-[78%]">
                <img
                  src={logo!}
                  alt={`${siteProfile.name || "Business"} logo`}
                  className="h-full w-full object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.14)]"
                />
              </div>
            ) : (
              <div className="relative text-center">
                <p className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
                  {logo || "No logo added"}
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  Your brand will appear here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
};
