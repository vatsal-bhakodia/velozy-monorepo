import React, { useState } from "react";
import {
  Upload,
  WandSparkles,
  X,
  Globe,
  Image as ImageIcon,
  Tag,
  Check,
  LayoutTemplate,
  Newspaper,
  ShoppingBag,
  Briefcase,
  CreditCard,
  CalendarDays,
  Building2,
  List,
  MessageSquare,
  FileText,
  UserRound,
  Users,
} from "lucide-react";
import type {
  SiteArchetype,
  SiteProfile,
  SiteSubType,
  StoreType,
} from "@/src/onboard/types";
import { OptionCard, OptionGroup } from "./option-card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ARCHETYPE_OPTIONS: Array<{
  id: SiteArchetype;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "business",
    label: "Business",
    description: "Company or service website.",
    icon: Building2,
  },
  {
    id: "landing",
    label: "Landing Page",
    description: "Focused page for one offer.",
    icon: Briefcase,
  },
  {
    id: "store",
    label: "Store",
    description: "Sell products online.",
    icon: ShoppingBag,
  },
  {
    id: "blog",
    label: "Blog",
    description: "Articles, news and stories.",
    icon: Newspaper,
  },
  {
    id: "portfolio",
    label: "Portfolio",
    description: "Showcase work and projects.",
    icon: LayoutTemplate,
  },
  {
    id: "booking",
    label: "Booking",
    description: "Appointments and classes.",
    icon: CalendarDays,
  },
];

const STORE_TYPE_OPTIONS: Array<{
  id: StoreType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "enquiry",
    label: "Catalogue + enquiries",
    description: "Product quotes and enquiries.",
    icon: MessageSquare,
  },
  {
    id: "enquiry-cart",
    label: "Enquiry cart",
    description: "Cart-based enquiries.",
    icon: List,
  },
  {
    id: "ecommerce",
    label: "Full ecommerce",
    description: "Online checkout and payments.",
    icon: CreditCard,
  },
];

const SUBTYPE_OPTIONS: Record<
  Exclude<SiteArchetype, "store">,
  Array<{
    id: SiteSubType;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }>
> = {
  business: [
    {
      id: "services",
      label: "Services",
      description: "Promote your services.",
      icon: Briefcase,
    },
    {
      id: "company",
      label: "Company",
      description: "Share company details.",
      icon: Building2,
    },
    {
      id: "local-business",
      label: "Local business",
      description: "Reach nearby customers.",
      icon: Globe,
    },
  ],
  landing: [
    {
      id: "lead-generation",
      label: "Lead generation",
      description: "Collect leads and enquiries.",
      icon: MessageSquare,
    },
    {
      id: "product-launch",
      label: "Product launch",
      description: "Promote a new product.",
      icon: WandSparkles,
    },
    {
      id: "event",
      label: "Event",
      description: "Promote an event.",
      icon: CalendarDays,
    },
  ],
  blog: [
    {
      id: "personal-blog",
      label: "Personal blog",
      description: "Share stories and ideas.",
      icon: UserRound,
    },
    {
      id: "news-magazine",
      label: "News & magazine",
      description: "Publish news and articles.",
      icon: Newspaper,
    },
    {
      id: "company-blog",
      label: "Company blog",
      description: "Share company insights.",
      icon: Building2,
    },
  ],
  portfolio: [
    {
      id: "creative-work",
      label: "Creative work",
      description: "Showcase selected work.",
      icon: ImageIcon,
    },
    {
      id: "case-studies",
      label: "Case studies",
      description: "Highlight process and results.",
      icon: FileText,
    },
    {
      id: "resume",
      label: "Resume",
      description: "Share skills and experience.",
      icon: UserRound,
    },
  ],
  booking: [
    {
      id: "appointments",
      label: "Appointments",
      description: "Let customers book a time.",
      icon: CalendarDays,
    },
    {
      id: "classes-events",
      label: "Classes & events",
      description: "Manage group sessions.",
      icon: Users,
    },
    {
      id: "rentals",
      label: "Rentals",
      description: "Book spaces or equipment.",
      icon: ShoppingBag,
    },
  ],
};

const SUBTYPE_GROUP_CONFIG: Record<
  Exclude<SiteArchetype, "store">,
  {
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  business: {
    description: "What kind of business site are you building?",
    icon: Briefcase,
  },
  landing: {
    description: "What should your landing page focus on?",
    icon: WandSparkles,
  },
  blog: {
    description: "What kind of content will you publish?",
    icon: Newspaper,
  },
  portfolio: {
    description: "What work do you want to showcase?",
    icon: ImageIcon,
  },
  booking: {
    description: "What kind of bookings will you offer?",
    icon: CalendarDays,
  },
};

export type SiteProfileInput = {
  siteProfile: SiteProfile;
  onProfileChange: (field: keyof SiteProfile, value: string | string[]) => void;
  // Logo props
  dragActive: boolean;
  logoPreview: string | null;
  logoFile: File | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleDrag: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleLogoUpload: () => void;
  clearLogo: () => void;
  showPremiumModal: () => void;
};

export const SiteProfileInput = ({
  siteProfile,
  onProfileChange,
  dragActive,
  logoPreview,
  logoFile,
  fileInputRef,
  handleDrag,
  handleDrop,
  handleFileInputChange,
  handleLogoUpload,
  clearLogo,
  showPremiumModal,
}: SiteProfileInput) => {
  const [touched, setTouched] = useState({ name: false, industry: false });
  const isMeaningful = (value: string) => {
    const normalized = value.trim();
    return (
      normalized.length >= 2 &&
      normalized.length <= 120 &&
      /[\p{L}\p{N}]/u.test(normalized) &&
      !/^(.)\1+$/u.test(normalized)
    );
  };
  const nameInvalid = touched.name && !isMeaningful(siteProfile.name);
  const industryInvalid = touched.industry && !isMeaningful(siteProfile.industry);

  return (
    <>
      {/* Card */}
      <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-lg border border-gray-200/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12)] dark:border-white/[0.09] dark:bg-[#202124] dark:shadow-[0_28px_90px_rgba(0,0,0,0.38)]">
        <div className="relative border-b border-gray-200/80 bg-gray-50/70 p-4 dark:border-white/[0.08] dark:bg-white/[0.015] sm:p-6">
          <div className="flex items-start sm:items-center justify-between gap-2">
            <div className="relative flex items-center space-x-3 sm:space-x-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient text-white sm:h-12 sm:w-12">
                <Globe className="h-5 w-5 sm:h-7 sm:w-7" />
              </div>
              <div className="text-gray-800 dark:text-neutral-50">
                <h3 className="text-lg font-medium leading-6 text-neutral-950 dark:text-neutral-50">
                  Site Profile
                </h3>
                <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                  Tell us about your business and the site you want to create.
                </p>
              </div>
            </div>
            {/* Step badge */}
            <span className="hidden h-fit shrink-0 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-neutral-500 dark:border-white/[0.09] dark:bg-white/[0.04] dark:text-neutral-300 md:block">
              Step 1 of 3
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 p-4 sm:gap-6 sm:px-8 sm:py-7">
          {/* Site Name */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Site Name
            </label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 transition-colors duration-200 group-focus-within:text-neutral-600 dark:group-focus-within:text-neutral-300">
                <Globe />
              </span>
              <input
                id="onboarding-site-name"
                autoFocus
                type="text"
                spellCheck={false}
                maxLength={120}
                value={siteProfile.name}
                onChange={(e) => onProfileChange("name", e.target.value)}
                onBlur={() => setTouched((current) => ({ ...current, name: true }))}
                aria-invalid={nameInvalid}
                aria-describedby="onboarding-site-name-error"
                placeholder="e.g., My Awesome Website"
                className="w-full rounded-md border border-slate-200 bg-slate-50/80 px-11 py-3 text-[14px] text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-neutral-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(115,115,115,0.1)] dark:border-white/[0.1] dark:bg-[#292a2d] dark:text-neutral-50 dark:placeholder:text-neutral-500 dark:focus:border-neutral-400 dark:focus:bg-[#292a2d] dark:focus:shadow-[0_0_0_3px_rgba(255,255,255,0.08)] sm:py-3.5 sm:text-[15px]"
              />
            </div>
            <p id="onboarding-site-name-error" className={`text-xs ${nameInvalid ? "font-medium text-rose-500" : "text-neutral-500 dark:text-neutral-400"}`}>
              {nameInvalid ? "Enter at least 2 letters or numbers (up to 120 characters)." : "This is the name shown to visitors."}
            </p>
          </div>

          {/* Industry */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Industry / Project Type
            </label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 transition-colors duration-200 group-focus-within:text-neutral-600 dark:group-focus-within:text-neutral-300">
                <Tag />
              </span>
              <input
                id="onboarding-industry"
                type="text"
                spellCheck={false}
                maxLength={120}
                value={siteProfile.industry}
                onChange={(e) => onProfileChange("industry", e.target.value)}
                onBlur={() => setTouched((current) => ({ ...current, industry: true }))}
                aria-invalid={industryInvalid}
                aria-describedby="onboarding-industry-error"
                placeholder="e.g., Restaurant, Tech..."
                className="w-full rounded-md border border-slate-200 bg-slate-50/80 px-11 py-3 text-[14px] text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-neutral-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(115,115,115,0.1)] dark:border-white/[0.1] dark:bg-[#292a2d] dark:text-neutral-50 dark:placeholder:text-neutral-500 dark:focus:border-neutral-400 dark:focus:bg-[#292a2d] dark:focus:shadow-[0_0_0_3px_rgba(255,255,255,0.08)] sm:py-3.5 sm:text-[15px]"
              />
            </div>
            <p id="onboarding-industry-error" className={`text-xs ${industryInvalid ? "font-medium text-rose-500" : "text-neutral-500 dark:text-neutral-400"}`}>
              {industryInvalid ? "Enter at least 2 letters or numbers (up to 120 characters)." : "For example, restaurant, consulting, or photography."}
            </p>
          </div>

          {/* Site Archetype */}
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-1.5 text-sm leading-5 text-neutral-500 dark:text-neutral-400">
              <LayoutTemplate className="w-4 h-4" />
              What kind of site are you creating?
            </label>

            <div className="grid grid-cols-3 gap-2">
              {ARCHETYPE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isActive = siteProfile.archetype === option.id;

                return (
                  <TooltipProvider key={option.id} delayDuration={180}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <OptionCard
                          label={option.label}
                          description={option.description}
                          icon={Icon}
                          active={isActive}
                          onClick={() =>
                            onProfileChange("archetype", option.id)
                          }
                        />
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="max-w-[220px] text-xs leading-relaxed"
                      >
                        {option.description}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </div>

          {siteProfile.archetype && siteProfile.archetype !== "store" && (
            <OptionGroup
              description={SUBTYPE_GROUP_CONFIG[siteProfile.archetype].description}
              icon={SUBTYPE_GROUP_CONFIG[siteProfile.archetype].icon}
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {SUBTYPE_OPTIONS[siteProfile.archetype].map((option) => {
                  const isActive = siteProfile.subType === option.id;
                  return (
                    <OptionCard
                      key={option.id}
                      label={option.label}
                      description={option.description}
                      icon={option.icon}
                      active={isActive}
                      onClick={() => onProfileChange("subType", option.id)}
                    />
                  );
                })}
              </div>
            </OptionGroup>
          )}

          {siteProfile.archetype === "store" && (
            <OptionGroup
              description="How should customers buy from you?"
              icon={ShoppingBag}
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {STORE_TYPE_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isActive = siteProfile.storeType === option.id;

                  return (
                    <OptionCard
                      key={option.id}
                      label={option.label}
                      description={option.description}
                      icon={Icon}
                      active={isActive}
                      onClick={() => onProfileChange("storeType", option.id)}
                    />
                  );
                })}
              </div>
            </OptionGroup>
          )}

          {/* Logo Upload */}
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              <ImageIcon />
              Logo
            </label>

            <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3 sm:gap-4 items-stretch">
              {/* Drop zone */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() =>
                  !logoPreview &&
                  (
                    fileInputRef as React.RefObject<HTMLInputElement>
                  )?.current?.click()
                }
                className={`onboarding-dropzone relative rounded-lg border-2 border-dashed items-center justify-center cursor-pointer overflow-hidden transition-all duration-200 h-[100px] min-h-[100px] sm:min-h-0 sm:max-h-28
                  ${!logoPreview ? "hidden sm:flex" : "flex"}
                  ${
                    dragActive
                      ? "border-neutral-400 bg-gray-50 shadow-[0_0_0_3px_rgba(115,115,115,0.08)] dark:border-neutral-400 dark:bg-[#252527]"
                      : logoPreview
                        ? "border-slate-300 bg-gray-50 dark:border-[#36363a] dark:bg-[#252527]"
                        : "border-slate-200 bg-slate-50/60 hover:border-slate-400 hover:bg-gray-50 hover:shadow-[0_0_0_4px_rgba(100,116,139,0.06)] dark:border-[#36363a] dark:bg-[#252527] dark:hover:border-neutral-500 dark:hover:bg-[#353538]"
                  }`}
              >
                {logoPreview ? (
                  <>
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-full h-full rounded-md object-contain p-2"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearLogo();
                      }}
                      className="absolute top-1.5 right-1.5 w-6 h-6 sm:w-5 sm:h-5 rounded-full bg-slate-800/50 hover:bg-red-500/80 flex items-center justify-center text-white transition-colors duration-150"
                    >
                      <X />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span
                      className={`transition-colors duration-200 ${dragActive ? "text-neutral-200" : "text-slate-300 dark:text-neutral-400"}`}
                    >
                      <Upload />
                    </span>
                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      Drop logo here
                    </span>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef as React.Ref<HTMLInputElement>}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />

              {/* Action buttons */}
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() =>
                    (
                      fileInputRef as React.RefObject<HTMLInputElement>
                    )?.current?.click()
                  }
                  className={`${logoPreview ? "hidden sm:flex" : "flex"} flex-[1] items-center justify-center gap-2 rounded-md border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:border-slate-400 hover:bg-white hover:text-slate-800 hover:shadow-[0_2px_8px_rgba(15,23,42,0.08)] dark:border-[#36363a] dark:bg-[#252527] dark:text-neutral-200 dark:hover:border-neutral-500 dark:hover:bg-[#353538] sm:px-4 sm:py-3`}
                >
                  <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                  Upload from device
                </button>
                <button
                  onClick={showPremiumModal}
                  className="flex flex-[1] items-center justify-center gap-2 rounded-md bg-gradient px-3 py-2.5 text-sm font-medium text-white shadow-sm transition-[filter] duration-200 hover:brightness-110 sm:px-4 sm:py-3"
                >
                  <WandSparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                  Generate with AI
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
