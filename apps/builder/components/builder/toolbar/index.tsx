import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

import {
  Layout,
  AlignVerticalJustifyCenter,
  Maximize2,
  Move,
  Type,
  Palette,
  Image as ImageIcon,
} from "lucide-react";

import AiRevise from "./aiRevise";
import Display from "./display";
import Alignment from "./alignment";
import Dimensions from "./dimensions";
import Spacing from "./spacing";
import Typography from "./typography";
import Colors from "./colors";
import { useNode } from "@craftjs/core";

// Define all available toolbar sections
const allToolbarSections = {
  display: {
    key: "display",
    label: "Display",
    icon: Layout,
    component: <Display />,
  },
  alignment: {
    key: "alignment",
    label: "Alignment",
    icon: AlignVerticalJustifyCenter,
    component: <Alignment />,
  },
  dimensions: {
    key: "dimensions",
    label: "Dimensions",
    icon: Maximize2,
    component: <Dimensions />,
  },
  spacing: {
    key: "spacing",
    label: "Spacing",
    icon: Move,
    component: <Spacing />,
  },
  typography: {
    key: "typography",
    label: "Typography",
    icon: Type,
    component: <Typography />,
  },
  colors: {
    key: "colors",
    label: "Colors",
    icon: Palette,
    component: <Colors />,
  },
  // Add other common sections here
};

// Map of icon names to components for resolving dynamic icons
const iconMap = {
  Layout,
  AlignVerticalJustifyCenter,
  Maximize2,
  Move,
  Type,
  Palette,
  ImageIcon,
};

export default function SettingsPanel() {
  const { node } = useNode((node) => ({
    node,
  }));

  // Access the craft settings with type assertion since TypeScript doesn't recognize craft property
  const nodeType = node.data.type as any;
  const craftSettings = nodeType?.craft || {};

  // Get the visible sections for this component
  const visibleSectionKeys = craftSettings.toolbarSections || [];

  // Get custom sections specific to this component
  const customSections = craftSettings.customToolbarSections || [];

  // Map the section keys to actual section objects
  const visibleSections = visibleSectionKeys
    .map(
      (key: string) =>
        allToolbarSections[key as keyof typeof allToolbarSections],
    )
    .filter(Boolean); // Filter out any undefined sections

  // Process custom sections to resolve dynamic icons
  const processedCustomSections = customSections.map(
    (section: {
      key: string;
      label: string;
      icon: string | React.ComponentType;
      component: React.ReactNode;
      priority?: number;
    }) => {
      // If the icon is a string, try to resolve it from our icon map
      if (typeof section.icon === "string") {
        const IconComponent =
          iconMap[section.icon as keyof typeof iconMap] || Type;
        return {
          ...section,
          icon: IconComponent,
        };
      }
      return section;
    },
  );

  // Combine and sort sections by priority
  const allSections = [...processedCustomSections, ...visibleSections].sort(
    (a, b) => {
      const priorityA = a.priority || 10;
      const priorityB = b.priority || 10;
      return priorityA - priorityB;
    },
  );

  return (
    <div className="space-y-4">
      <AiRevise />

      <Accordion type="multiple" className="w-full">
        {allSections.map(({ key, label, icon: Icon, component }) => (
          <AccordionItem key={key} value={key}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  {label}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>{component}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
