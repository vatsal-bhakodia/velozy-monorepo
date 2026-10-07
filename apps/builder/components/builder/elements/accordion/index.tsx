import React from "react";
import { useNode } from "@craftjs/core";
import { cn } from "@/lib/utils";
import {
  Accordion as AccordionPrimitive,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AccordionProps } from "./types";
import ToolBar from "@/components/builder/toolbar/index";
import { List } from "lucide-react";
import { AccordionSettings } from "./settings";

export const Accordion = ({
  items = [],
  collapsible = true,
  className,
  style,
}: AccordionProps) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn("w-full", className)}
      style={style}
    >
      <AccordionPrimitive
        type="single"
        collapsible={collapsible}
        className="w-full"
      >
        {items.map((item) => (
          <AccordionItem key={item.id} value={item.id}>
            <AccordionTrigger>{item.title}</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4 text-balance">
              <div dangerouslySetInnerHTML={{ __html: item.content }} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </AccordionPrimitive>
    </div>
  );
};

Accordion.craft = {
  displayName: "Accordion",
  props: {
    items: [
      { id: "item-1", title: "Item 1", content: "Content for item 1" },
      { id: "item-2", title: "Item 2", content: "Content for item 2" },
    ],
    collapsible: true,
  },
  rules: {
    canDrag: () => true,
  },
  related: {
    toolbar: ToolBar,
  },
  toolbarSections: ["typography", "colors"],
  customToolbarSections: [
    {
      key: "accordionSettings",
      label: "Accordion Settings",
      icon: List,
      component: <AccordionSettings />,
      priority: 1,
    },
  ],
};

export default Accordion;
