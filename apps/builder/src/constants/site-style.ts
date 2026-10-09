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
  preview: string;
  backgroundColor: string;
  icon: LucideIcon;
};

export const siteStyles: SiteStyleProps[] = [
  {
    id: "modern",
    name: "Modern",
    description: "Contemporary design with bold typography and layouts",
    preview: "Clean, minimalist design with plenty of white space",
    backgroundColor: "bg-blue-50",
    icon: Sparkles,
  },
  {
    id: "classic",
    name: "Classic",
    description: "Traditional, professional design with clean lines",
    preview: "Traditional layout with header, navigation, and footer",
    backgroundColor: "bg-slate-50",
    icon: Building2,
  },
  {
    id: "flat",
    name: "Flat",
    description: "Minimalist design with flat colors and simple elements",
    preview: "Simple, flat design with minimal shadows and effects",
    backgroundColor: "bg-green-50",
    icon: Smartphone,
  },
  {
    id: "soft",
    name: "Soft",
    description: "Gentle design with rounded corners and soft shadows",
    preview: "Rounded corners, soft shadows, and gentle transitions",
    backgroundColor: "bg-pink-50",
    icon: Flower,
  },
];
