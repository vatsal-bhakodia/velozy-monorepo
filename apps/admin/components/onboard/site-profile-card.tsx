"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Image as ImageIcon,
  LayoutTemplate,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import type { SiteProfile } from "@/src/onboard/types";

type SnapshotItemProps = {
  index: string;
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  iconTone: string;
  className?: string;
};

function SnapshotItem({
  index,
  label,
  value,
  icon: Icon,
  iconTone,
  className = "",
}: SnapshotItemProps) {
  return (
    <div
      className={`group relative min-w-0 overflow-hidden rounded-lg border border-neutral-200/80 bg-neutral-50/80 p-4 transition-colors hover:border-neutral-300 dark:border-neutral-700 dark:bg-[#252527] dark:hover:border-neutral-600 ${className}`}
    >
      <span className="absolute right-3 top-2.5 font-mono text-[9px] font-medium tracking-widest text-neutral-300 dark:text-neutral-600">
        {index}
      </span>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${iconTone}`}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {label}
          </p>
          <p className="mt-1 truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
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
  const siteTypeLabels: Record<string, string> = {
    business: "Business",
    landing: "Landing page",
    store: "Store",
    blog: "Blog",
    portfolio: "Portfolio",
    booking: "Booking",
  };
  const storeTypeLabels: Record<string, string> = {
    enquiry: "Catalogue + enquiries",
    "enquiry-cart": "Enquiry cart",
    ecommerce: "Full ecommerce",
  };
  const siteType = siteProfile.archetype
    ? siteTypeLabels[siteProfile.archetype]
    : "Not specified";
  const siteFocus = siteProfile.subType
    ? siteProfile.subType
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    : "";
  const hasAdditionalSiteDetail = Boolean(
    (siteProfile.archetype === "store" && siteProfile.storeType) || siteFocus,
  );
  const logo = logoPreview || siteProfile.logo;
  const hasImageLogo = logo?.startsWith("data:image/");

  return (
    <motion.article
      initial={{ opacity: 0, y: 18, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto flex h-full w-full max-w-[520px] flex-col overflow-hidden rounded-lg border border-neutral-200/90 bg-white shadow-[0_20px_55px_rgba(15,23,42,0.12)] dark:border-white/[0.09] dark:bg-[#202124] dark:shadow-[0_20px_55px_rgba(0,0,0,0.3)]"
    >
      <header className="relative flex shrink-0 items-center gap-3.5 border-b border-neutral-200/80 bg-neutral-50/70 px-5 py-5 dark:border-white/[0.08] dark:bg-white/[0.015] sm:px-6">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 sm:h-12 sm:w-12">
          <Building2 className="h-5 w-5 sm:h-[22px] sm:w-[22px]" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-medium leading-6 text-neutral-950 dark:text-neutral-50">
            Site Profile
          </h3>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Your business profile at a glance
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 dark:border-neutral-700 dark:bg-neutral-800">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-neutral-600 dark:text-neutral-300">
            Ready
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <SnapshotItem
            index="01"
            label="Business name"
            value={siteProfile.name || "Not specified"}
            icon={UserRound}
            iconTone="bg-blue-500/10 text-blue-600 dark:text-blue-300"
          />
          <SnapshotItem
            index="02"
            label="Industry"
            value={siteProfile.industry || "Not specified"}
            icon={Building2}
            iconTone="bg-violet-500/10 text-violet-600 dark:text-violet-300"
          />
        </div>

        <SnapshotItem
          index="03"
          label="Site type"
          value={siteType}
          icon={LayoutTemplate}
          iconTone="bg-amber-500/10 text-amber-600 dark:text-amber-300"
        />

        {siteProfile.archetype === "store" && siteProfile.storeType && (
          <SnapshotItem
            index="04"
            label="Store model"
            value={storeTypeLabels[siteProfile.storeType]}
            icon={ShoppingBag}
            iconTone="bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
          />
        )}

        {siteFocus && (
          <SnapshotItem
            index="04"
            label="Site focus"
            value={siteFocus}
            icon={LayoutTemplate}
            iconTone="bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
          />
        )}

        <div className="relative flex min-h-[220px] flex-1 flex-col overflow-hidden rounded-lg border border-neutral-200/80 bg-neutral-50/80 p-4 dark:border-neutral-700 dark:bg-[#252527]">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
                <ImageIcon aria-hidden="true" className="h-4 w-4" />
              </div>
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Logo
              </p>
            </div>
            <span className="font-mono text-[9px] font-medium tracking-widest text-neutral-300 dark:text-neutral-600">
              {hasAdditionalSiteDetail ? "05" : "04"}
            </span>
          </div>

          <div className="relative flex min-h-[154px] w-full flex-1 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-neutral-100 dark:border-white/[0.08] dark:bg-[#292a2d]">
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
