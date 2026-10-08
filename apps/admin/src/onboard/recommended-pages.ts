import type { SiteArchetype, SiteProfile, SiteSubType, StoreType } from "./types";

type PageProfile = Pick<SiteProfile, "archetype" | "subType" | "storeType">;

const pagesByArchetype: Record<SiteArchetype, string[]> = {
  business: ["About", "Services", "Contact", "FAQ"],
  landing: ["About", "Contact"],
  store: ["Shop", "About", "Shipping & Returns", "Contact"],
  blog: ["Blog", "About", "Contact"],
  portfolio: ["Work", "About", "Contact"],
  booking: ["Services", "Book an Appointment", "About", "Contact"],
};

const pagesBySubType: Partial<Record<SiteSubType, string[]>> = {
  "local-business": ["Services", "Location", "Reviews", "Contact"],
  "lead-generation": ["How It Works", "Case Studies", "Contact"],
  "product-launch": ["Features", "Pricing", "Contact"],
  event: ["Event Details", "Schedule", "Tickets", "Contact"],
  "personal-blog": ["Blog", "About", "Contact"],
  "news-magazine": ["News", "Topics", "About", "Contact"],
  "company-blog": ["Blog", "About", "Services", "Contact"],
  "creative-work": ["Portfolio", "About", "Contact"],
  "case-studies": ["Case Studies", "Services", "About", "Contact"],
  resume: ["Resume", "Projects", "Contact"],
  appointments: ["Services", "Book an Appointment", "About", "Contact"],
  "classes-events": ["Classes", "Schedule", "Book a Class", "Contact"],
  rentals: ["Rentals", "Availability", "Policies", "Contact"],
};

export function recommendedPagesForProfile(profile: PageProfile): string[] {
  if (!profile.archetype) return [];

  if (profile.archetype === "store") {
    if (profile.storeType === "enquiry")
      return ["Catalogue", "About", "Contact"];
    if (profile.storeType === "enquiry-cart")
      return ["Catalogue", "About", "Shipping & Returns", "Contact"];
  }

  const subTypePages = profile.subType ? pagesBySubType[profile.subType] : undefined;
  return [...(subTypePages ?? pagesByArchetype[profile.archetype])];
}

export function profileWithSiteTypeChange(
  profile: SiteProfile,
  change: { archetype?: SiteArchetype | ""; subType?: SiteSubType | ""; storeType?: StoreType | "" },
): SiteProfile {
  const nextProfile = { ...profile, ...change };
  return {
    ...nextProfile,
    plannedPages: recommendedPagesForProfile(nextProfile),
  };
}
