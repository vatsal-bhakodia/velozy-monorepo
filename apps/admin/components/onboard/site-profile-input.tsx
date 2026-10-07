import React from "react";
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
    description: "A complete company or service website.",
    icon: Building2,
  },
  {
    id: "landing",
    label: "Landing Page",
    description: "A focused page for a campaign or promotion.",
    icon: Briefcase,
  },
  {
    id: "store",
    label: "Store",
    description: "Commerce-first product website.",
    icon: ShoppingBag,
  },
  {
    id: "blog",
    label: "Blog",
    description: "Content-heavy publishing website.",
    icon: Newspaper,
  },
  {
    id: "portfolio",
    label: "Portfolio",
    description: "Personal or studio showcase.",
    icon: LayoutTemplate,
  },
  {
    id: "booking",
    label: "Booking",
    description: "Appointments, consultations, or classes.",
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
    description: "Products with quote requests.",
    icon: MessageSquare,
  },
  {
    id: "enquiry-cart",
    label: "Enquiry cart",
    description: "Cart-based enquiries, no payments.",
    icon: List,
  },
  {
    id: "ecommerce",
    label: "Full ecommerce",
    description: "Checkout, payments, and orders.",
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
      description: "Professional services.",
      icon: Briefcase,
    },
    {
      id: "company",
      label: "Company",
      description: "Company and capabilities.",
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
      description: "Collect interest and enquiries.",
      icon: MessageSquare,
    },
    {
      id: "product-launch",
      label: "Product launch",
      description: "Introduce an offer or release.",
      icon: WandSparkles,
    },
    {
      id: "event",
      label: "Event",
      description: "Promote one event or date.",
      icon: CalendarDays,
    },
  ],
  blog: [
    {
      id: "personal-blog",
      label: "Personal blog",
      description: "Share thoughts and stories.",
      icon: UserRound,
    },
    {
      id: "news-magazine",
      label: "News & magazine",
      description: "Publish stories and updates.",
      icon: Newspaper,
    },
    {
      id: "company-blog",
      label: "Company blog",
      description: "Share expertise and news.",
      icon: Building2,
    },
  ],
  portfolio: [
    {
      id: "creative-work",
      label: "Creative work",
      description: "Show projects and selected work.",
      icon: ImageIcon,
    },
    {
      id: "case-studies",
      label: "Case studies",
      description: "Explain process and results.",
      icon: FileText,
    },
    {
      id: "resume",
      label: "Resume",
      description: "Present skills and experience.",
      icon: UserRound,
    },
  ],
  booking: [
    {
      id: "appointments",
      label: "Appointments",
      description: "Book a time with you.",
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
      description: "Reserve spaces or equipment.",
      icon: ShoppingBag,
    },
  ],
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
  const isMeaningful = (value: string) => {
    const normalized = value.trim();
    return (
      normalized.length >= 3 &&
      /[A-Za-z]/.test(normalized) &&
      !/^(.)\1+$/.test(normalized)
    );
  };
  const nameInvalid =
    siteProfile.name.length > 0 && !isMeaningful(siteProfile.name);
  const industryInvalid =
    siteProfile.industry.length > 0 && !isMeaningful(siteProfile.industry);

  return (
    <>
      {/* Card */}
      <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-neutral-700 dark:bg-neutral-800">
        <div className="relative p-4 sm:p-6 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-start sm:items-center justify-between gap-2">
            <div className="relative flex items-center space-x-3 sm:space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                <Globe className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </div>
              <div className="text-gray-800 dark:text-neutral-50">
                <h3 className="text-lg sm:text-xl font-bold leading-tight">
                  Site Profile
                </h3>
                <p className="text-xs sm:text-sm mt-0.5">
                  Your website information
                </p>
              </div>
            </div>
            {/* Step badge */}
            <span className="hidden h-fit shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-300 sm:px-3 sm:py-1.5 md:block md:text-[11px]">
              Step 1 of 3
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:px-8 sm:py-7 flex flex-col gap-5 sm:gap-6">
          {/* Site Name */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-400">
              Site Name
            </label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200 group-focus-within:text-slate-600 dark:group-focus-within:text-neutral-200">
                <Globe />
              </span>
              <input
                autoFocus
                type="text"
                spellCheck={false}
                value={siteProfile.name}
                onChange={(e) => onProfileChange("name", e.target.value)}
                aria-invalid={nameInvalid}
                placeholder="e.g., My Awesome Website"
                className="w-full rounded-xl border-[1.5px] border-slate-200/80 bg-slate-50/80 px-11 py-3 text-[14px] text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-300 focus:border-slate-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(100,116,139,0.08)] dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-50 dark:focus:border-neutral-400 dark:focus:bg-neutral-700 sm:rounded-2xl sm:py-3.5 sm:text-[15px]"
              />
            </div>
            {nameInvalid && (
              <p className="text-xs font-medium text-rose-500" role="alert">
                Enter at least 3 meaningful characters.
              </p>
            )}
          </div>

          {/* Industry */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-400">
              Industry / Project Type
            </label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200 group-focus-within:text-slate-600 dark:group-focus-within:text-neutral-200">
                <Tag />
              </span>
              <input
                type="text"
                spellCheck={false}
                value={siteProfile.industry}
                onChange={(e) => onProfileChange("industry", e.target.value)}
                aria-invalid={industryInvalid}
                placeholder="e.g., Restaurant, Tech..."
                className="w-full rounded-xl border-[1.5px] border-slate-200/80 bg-slate-50/80 px-11 py-3 text-[14px] text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-300 focus:border-slate-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(100,116,139,0.08)] dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-50 dark:focus:border-neutral-400 dark:focus:bg-neutral-700 sm:rounded-2xl sm:py-3.5 sm:text-[15px]"
              />
            </div>
            {industryInvalid && (
              <p className="text-xs font-medium text-rose-500" role="alert">
                Enter at least 3 meaningful characters.
              </p>
            )}
          </div>

          {/* Site Archetype */}
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-400">
              <LayoutTemplate className="w-4 h-4" />
              Site Type
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
              title="Refine your site"
              description="Choose the structure that fits best."
              icon={WandSparkles}
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
              title="Store model"
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
            <label className="flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-400">
              <ImageIcon />
              Logo
              <span className="text-slate-400 normal-case tracking-normal font-normal text-[11px] ml-1">
                — optional
              </span>
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
                className={`onboarding-dropzone relative rounded-xl sm:rounded-2xl border-2 border-dashed items-center justify-center cursor-pointer overflow-hidden transition-all duration-200 h-[100px] min-h-[100px] sm:min-h-0 sm:max-h-28
                  ${!logoPreview ? "hidden sm:flex" : "flex"}
                  ${
                    dragActive
                      ? "border-cyan-400 bg-gray-50 shadow-[0_0_0_4px_rgba(14,165,233,0.1)] dark:bg-neutral-800"
                      : logoPreview
                        ? "border-slate-300 bg-gray-50 dark:border-neutral-600 dark:bg-neutral-800"
                        : "border-slate-200 bg-slate-50/60 hover:border-slate-400 hover:bg-gray-50 hover:shadow-[0_0_0_4px_rgba(100,116,139,0.06)] dark:border-neutral-600 dark:bg-neutral-800 dark:hover:border-neutral-500 dark:hover:bg-neutral-700"
                  }`}
              >
                {logoPreview ? (
                  <>
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-full h-full object-contain p-2 rounded-xl sm:rounded-2xl"
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
                  <div className="flex flex-col items-center gap-1.5">
                    <span
                      className={`transition-colors duration-200 ${dragActive ? "text-cyan-400" : "text-slate-300 dark:text-neutral-400"}`}
                    >
                      <Upload />
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium text-center leading-tight">
                      Drag &<br />
                      Drop
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
                  className={`${logoPreview ? "hidden sm:flex" : "flex"} flex-[1] items-center justify-center gap-2 rounded-lg border-[1.5px] border-slate-200/80 bg-slate-50/80 px-3 py-2.5 text-[12px] font-semibold text-slate-600 transition-all duration-200 hover:border-slate-400 hover:bg-white hover:text-slate-800 hover:shadow-[0_2px_8px_rgba(15,23,42,0.08)] dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-500 dark:hover:bg-neutral-600 sm:rounded-xl sm:px-4 sm:py-3 sm:text-[13px]`}
                >
                  <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                  Upload from device
                </button>
                <button
                  onClick={showPremiumModal}
                  className="flex-[1] flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-[12px] sm:text-[13px] font-semibold text-white bg-gradient hover:bg-gradient border-none shadow-[0_4px_14px_rgba(6,182,212,0.35)] hover:shadow-[0_6px_20px_rgba(6,182,212,0.45)] hover:-translate-y-px active:translate-y-0 transition-all duration-200"
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
