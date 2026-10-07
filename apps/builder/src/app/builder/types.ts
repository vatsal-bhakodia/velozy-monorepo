export type DynamicSectionConfig = {
  source: "products" | "productCategories" | "blogs";
  layout: "grid" | "list" | "carousel";
  limit: number;
  featuredOnly?: boolean;
};

export interface Viewport {
  type: "mobile" | "tablet" | "desktop";
  width: string;
  height: string;
}

export const VIEWPORT_PRESETS: Record<string, Viewport> = {
  // Common portrait device viewport sizes. The builder canvas is scrollable
  // when these exceed the available editor height, just like a real device.
  mobile: { type: "mobile", width: "375px", height: "812px" },
  tablet: { type: "tablet", width: "768px", height: "1024px" },
  desktop: { type: "desktop", width: "100%", height: "calc(100vh - 3.5rem)" },
};

export interface Section {
  id: string;
  name: string;
  description: string;
  kind?: "static" | "dynamic";
  dynamic?: DynamicSectionConfig;
}

export interface GenerationState {
  userPrompt: string;
  currentStep: number;
  totalSteps: number;
  currentStepText: string;
  completedSections: string[];
  sectionsToGenerate: Section[];
}
