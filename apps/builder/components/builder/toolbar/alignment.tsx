import { useNode } from "@craftjs/core";

import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignHorizontalSpaceBetween,
  AlignHorizontalSpaceAround,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  Baseline,
  StretchHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";
import {
  classesAtBreakpoint,
  replaceBreakpointClasses,
  ResponsiveDeviceButton,
  useResponsiveToolbar,
} from "./responsive";

const horizontalAlignments = [
  { label: "Left", icon: AlignLeft, class: "justify-start" },
  { label: "Center", icon: AlignCenter, class: "justify-center" },
  { label: "Right", icon: AlignRight, class: "justify-end" },
  {
    label: "Space Between",
    icon: AlignHorizontalSpaceBetween,
    class: "justify-between",
  },
  {
    label: "Space Around",
    icon: AlignHorizontalSpaceAround,
    class: "justify-around",
  },
  {
    label: "Space Evenly",
    icon: AlignHorizontalDistributeCenter,
    class: "justify-evenly",
  },
];

const verticalAlignments = [
  { label: "Top", icon: AlignStartHorizontal, class: "items-start" },
  { label: "Center", icon: AlignCenterHorizontal, class: "items-center" },
  { label: "Bottom", icon: AlignEndHorizontal, class: "items-end" },
  { label: "Stretch", icon: StretchHorizontal, class: "items-stretch" },
  { label: "Baseline", icon: Baseline, class: "items-baseline" },
];

// Utility to remove previous alignment classes
const Alignment = () => {
  const { prefix } = useResponsiveToolbar();
  const { actions, className = "" } = useNode((node) => ({
    className: node.data.props.className || "",
  }));

  const scopedClasses = classesAtBreakpoint(className, prefix);
  const activeHorizontalAlign = horizontalAlignments.find((item) =>
    scopedClasses.includes(item.class),
  )?.label;
  const activeVerticalAlign = verticalAlignments.find((item) =>
    scopedClasses.includes(item.class),
  )?.label;

  const updateAlignment = (
    newClass: string,
    label: string,
    type: "horizontal" | "vertical",
  ) => {
    actions.setProp((props: any) => {
      const options =
        type === "horizontal" ? horizontalAlignments : verticalAlignments;
      props.className = replaceBreakpointClasses(
        props.className || "",
        prefix,
        (item) => options.some((option) => option.class === item),
        [newClass],
      );
    });
  };

  return (
    <div className="flex gap-4">
      {/* Horizontal */}
      <div className="space-y-4 w-1/2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs text-neutral-500 dark:text-neutral-400">
            Horizontal
          </label>
          <ResponsiveDeviceButton />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {horizontalAlignments.map(({ label, icon: Icon, class: cls }) => (
            <TooltipProvider key={label}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "flex-1",
                      activeHorizontalAlign === label &&
                        "bg-accent text-accent-foreground",
                    )}
                    onClick={() => updateAlignment(cls, label, "horizontal")}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{label}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>

      {/* Vertical */}
      <div className="space-y-4 w-1/2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs text-neutral-500 dark:text-neutral-400">
            Vertical
          </label>
          <ResponsiveDeviceButton />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {verticalAlignments.map(({ label, icon: Icon, class: cls }) => (
            <TooltipProvider key={label}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "flex-1",
                      activeVerticalAlign === label &&
                        "bg-accent text-accent-foreground",
                    )}
                    onClick={() => updateAlignment(cls, label, "vertical")}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{label}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Alignment;
