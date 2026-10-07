// types.ts
export type ChatMessage = {
  type: "bot" | "user";
  content: string;
  timestamp?: string;
};

export type SiteArchetype =
  | "business"
  | "landing"
  | "store"
  | "blog"
  | "portfolio"
  | "booking";

export type StoreType = "enquiry" | "enquiry-cart" | "ecommerce";

export type SiteSubType =
  | "services"
  | "company"
  | "local-business"
  | "lead-generation"
  | "product-launch"
  | "event"
  | "personal-blog"
  | "news-magazine"
  | "company-blog"
  | "creative-work"
  | "case-studies"
  | "resume"
  | "appointments"
  | "classes-events"
  | "rentals";

export type SiteModule = "blog" | "ecommerce";

export type SiteGoal =
  | "enquiries"
  | "service"
  | "portfolio"
  | "content"
  | "sell-products"
  | "campaign"
  | "bookings"
  | "quotes";

export type SiteCapability =
  | "enquiries"
  | "bookings"
  | "quotes"
  | "products"
  | "checkout"
  | "memberships"
  | "digital-products"
  | "seo"
  | "analytics";

export type DynamicSource = "products" | "productCategories" | "blogs";

export type DynamicSectionConfig = {
  source: DynamicSource;
  layout: "grid" | "list" | "carousel";
  limit: number;
  featuredOnly?: boolean;
};

export type SiteProfile = {
  name: string;
  industry: string;
  archetype: SiteArchetype | "";
  storeType: StoreType | "";
  subType: SiteSubType | "";
  modules: SiteModule[];
  capabilities: SiteCapability[];
  logo: string;
  businessDescription: string;
};

export type SiteSection = {
  id: string;
  name: string;
  description: string;
  kind?: "static" | "dynamic";
  dynamic?: DynamicSectionConfig;
};

export type Step = {
  id: number;
  name: string;
  icon: any;
  completed: boolean;
};

export type Question = {
  field: keyof SiteProfile;
  question: string;
  placeholder: string;
};
