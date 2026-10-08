import {
  Building2,
  Sparkles,
  Smartphone,
  Flower,
  LucideIcon,
} from "lucide-react";

export type SiteStyleProps = {
  id: string;
  name: string;
  description: string;
  traits: string[];
  generationGuidance: string;
  icon: LucideIcon;
};

export const siteStyles: SiteStyleProps[] = [
  {
    id: "modern",
    name: "Modern",
    description: "Bold typography, open spacing, and an asymmetric hero.",
    traits: ["Bold headings", "Offset layouts", "Open space"],
    generationGuidance:
      "Use bold sans-serif typography, generous whitespace, strong hierarchy, and asymmetric split layouts. Prefer a spacious editorial hero and crisp, restrained surfaces.",
    icon: Sparkles,
  },
  {
    id: "classic",
    name: "Classic",
    description: "Editorial typography and balanced, structured layouts.",
    traits: ["Editorial headings", "Clear navigation", "Balanced columns"],
    generationGuidance:
      "Use an editorial serif-led heading hierarchy, centered hero content, clear traditional navigation, balanced columns, and fine dividers. Keep the composition symmetrical and professional.",
    icon: Building2,
  },
  {
    id: "flat",
    name: "Flat",
    description: "Square geometry, solid color blocks, and crisp edges.",
    traits: ["Square corners", "Solid surfaces", "No shadows"],
    generationGuidance:
      "Use square geometry, solid color blocks, crisp borders, and a direct grid. Avoid decorative shadows, gradients, and rounded cards; keep each surface simple and functional.",
    icon: Smartphone,
  },
  {
    id: "soft",
    name: "Soft",
    description: "Rounded surfaces, gentle depth, and a friendly rhythm.",
    traits: ["Rounded cards", "Layered depth", "Airy sections"],
    generationGuidance:
      "Use generous corner radii, softly layered cards, gentle shadows, and airy spacing. Build a friendly, flowing composition with rounded controls and calm transitions.",
    icon: Flower,
  },
];

export const getSiteStyle = (styleId?: string) =>
  siteStyles.find((style) => style.id === styleId) ?? siteStyles[0];

export const getSiteStyleGuidance = (styleId?: string) => {
  const style = getSiteStyle(styleId);
  return `${style.name} design direction: ${style.generationGuidance}`;
};
