import { ChevronDown, ChevronUp } from "lucide-react";
import { useNode } from "@craftjs/core";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  classesAtBreakpoint,
  replaceBreakpointClasses,
  ResponsiveDeviceButton,
  useResponsiveToolbar,
} from "./responsive";

const UNITS = ["px", "%", "em", "rem", "vw", "vh"] as const;
type CSSUnit = (typeof UNITS)[number];
type DimensionName =
  | "width"
  | "height"
  | "minWidth"
  | "minHeight"
  | "maxWidth"
  | "maxHeight";
const utility: Record<DimensionName, string> = {
  width: "w",
  height: "h",
  minWidth: "min-w",
  minHeight: "min-h",
  maxWidth: "max-w",
  maxHeight: "max-h",
};

const readDimension = (classes: string[], dimension: DimensionName) => {
  const token = classes.find((item) =>
    item.startsWith(`${utility[dimension]}-[`),
  );
  const raw = token?.match(/-\[([\d.]+)(px|%|em|rem|vw|vh)\]$/);
  return { value: raw?.[1] || "", unit: (raw?.[2] || "px") as CSSUnit };
};

function DimensionInput({
  label,
  value,
  unit,
  inherited,
  onChange,
}: {
  label: string;
  value: string;
  unit: CSSUnit;
  inherited: boolean;
  onChange: (value: string, unit: CSSUnit) => void;
}) {
  const increment = (delta: number) =>
    onChange(String(Math.max(0, (parseFloat(value) || 0) + delta)), unit);
  return (
    <div className="relative flex-1">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">
          {label}
        </span>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value, unit)}
          placeholder={inherited ? "inherit" : label}
          className="w-full rounded border border-neutral-200 bg-neutral-100 py-2 pl-7 pr-16 text-right text-sm dark:border-neutral-700 dark:bg-neutral-800 [&::-webkit-inner-spin-button]:appearance-none"
        />
        <select
          value={unit}
          onChange={(e) => onChange(value, e.target.value as CSSUnit)}
          className="absolute right-7 top-1/2 w-8 -translate-y-1/2 appearance-none border-none bg-transparent text-xs text-neutral-500"
        >
          {UNITS.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <div className="absolute bottom-0 right-0 top-0 flex flex-col border-l border-neutral-200 dark:border-neutral-700">
          <button
            type="button"
            onClick={() => increment(1)}
            className="flex-1 px-2 hover:bg-neutral-200 dark:hover:bg-neutral-700"
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => increment(-1)}
            className="flex-1 px-2 hover:bg-neutral-200 dark:hover:bg-neutral-700"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dimensions() {
  const { prefix } = useResponsiveToolbar();
  const { actions, className = "" } = useNode((node) => ({
    className: node.data.props.className || "",
  }));
  const scoped = classesAtBreakpoint(className, prefix);
  const update = (dimension: DimensionName, value: string, unit: CSSUnit) =>
    actions.setProp((props: any) => {
      props.className = replaceBreakpointClasses(
        props.className || "",
        prefix,
        (item) => item.startsWith(`${utility[dimension]}-`),
        value ? [`${utility[dimension]}-[${value}${unit}]`] : [],
      );
      if (!prefix && props.style?.[dimension] !== undefined) {
        const { [dimension]: removed, ...rest } = props.style;
        props.style = rest;
      }
    });
  const pair = (names: [DimensionName, DimensionName], title: string) => (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-500">{title}</span>
        <ResponsiveDeviceButton />
      </div>
      <div className="mt-1 flex gap-2">
        {names.map((name, index) => {
          const current = readDimension(scoped, name);
          return (
            <DimensionInput
              key={name}
              label={index ? "H" : "W"}
              {...current}
              inherited={!!prefix && !current.value}
              onChange={(value, unit) => update(name, value, unit)}
            />
          );
        })}
      </div>
    </>
  );
  return (
    <Tabs defaultValue="base" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="base">Base</TabsTrigger>
        <TabsTrigger value="minimum">Min</TabsTrigger>
        <TabsTrigger value="maximum">Max</TabsTrigger>
      </TabsList>
      <TabsContent value="base" className="pt-2">
        {pair(["width", "height"], "Size")}
      </TabsContent>
      <TabsContent value="minimum" className="pt-2">
        {pair(["minWidth", "minHeight"], "Minimum size")}
      </TabsContent>
      <TabsContent value="maximum" className="pt-2">
        {pair(["maxWidth", "maxHeight"], "Maximum size")}
      </TabsContent>
    </Tabs>
  );
}
