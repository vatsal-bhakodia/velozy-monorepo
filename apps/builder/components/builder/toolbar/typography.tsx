import { useNode } from "@craftjs/core";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Type,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { isTextColorClass } from "@/lib/tailwind-color-utils";
import {
  classesAtBreakpoint,
  replaceBreakpointClasses,
  ResponsiveLabel,
  useResponsiveToolbar,
} from "./responsive";

// Utility function to extract classes by category
const extractClasses = (
  className: string,
  categories: Record<string, { exact: string[]; prefix?: string }>,
) => {
  if (!className) return {};

  const classes = className.split(" ");
  const result: Record<string, string | boolean> = {};

  Object.entries(categories).forEach(([category, { exact, prefix }]) => {
    // Special handling for boolean classes
    if (category === "isItalic") {
      result[category] = classes.includes("italic");
      return;
    }
    if (category === "isUnderline") {
      result[category] = classes.includes("underline");
      return;
    }
    if (category === "isHeadingFont") {
      result[category] = classes.includes("font-heading");
      return;
    }

    const matchedExact = classes.find((cls) => exact.includes(cls));
    if (matchedExact) {
      result[category] = matchedExact;
    } else if (prefix) {
      // Find arbitrary values like prefix-[...]
      const matchedPrefix = classes.find((cls) => {
        if (!cls.startsWith(`${prefix}-[`) || !cls.endsWith("]")) return false;
        if (prefix === "text" && isTextColorClass(cls)) return false;
        return true;
      });
      if (matchedPrefix) {
        result[category] = matchedPrefix;
      }
    }
  });

  return result;
};

// Font size options with user-friendly names
const fontSizeOptions = [
  { value: "text-xs", label: "Extra Small" },
  { value: "text-sm", label: "Small" },
  { value: "text-base", label: "Medium" },
  { value: "text-lg", label: "Large" },
  { value: "text-xl", label: "Extra Large" },
  { value: "text-2xl", label: "2XL" },
  { value: "text-3xl", label: "3XL" },
  { value: "text-4xl", label: "4XL" },
  { value: "text-5xl", label: "5XL" },
  { value: "text-6xl", label: "6XL" },
];

// Line height options with user-friendly names
const lineHeightOptions = [
  { value: "leading-none", label: "None" },
  { value: "leading-tight", label: "Tight" },
  { value: "leading-snug", label: "Snug" },
  { value: "leading-normal", label: "Normal" },
  { value: "leading-relaxed", label: "Relaxed" },
  { value: "leading-loose", label: "Loose" },
];

// Letter spacing options with user-friendly names
const letterSpacingOptions = [
  { value: "tracking-tighter", label: "Tighter" },
  { value: "tracking-tight", label: "Tight" },
  { value: "tracking-normal", label: "Normal" },
  { value: "tracking-wide", label: "Wide" },
  { value: "tracking-wider", label: "Wider" },
  { value: "tracking-widest", label: "Widest" },
];

const fontWeightOptions = [
  { value: "font-normal", label: "Regular" },
  { value: "font-medium", label: "Medium" },
  { value: "font-semibold", label: "Semibold" },
  { value: "font-bold", label: "Bold" },
  { value: "font-extrabold", label: "Extra Bold" },
];

const isCustomValue = (val: string, options: { value: string }[]) =>
  !options.some((o) => o.value === val);

const TypographySettings = () => {
  const { prefix } = useResponsiveToolbar();
  const { actions, className = "" } = useNode((node) => ({
    className: node.data.props.className || "",
  }));

  // Define category mappings for Tailwind classes
  const categoryMappings = {
    fontSize: {
      exact: fontSizeOptions.map((opt) => opt.value),
      prefix: "text",
    },
    fontWeight: { exact: fontWeightOptions.map((opt) => opt.value) },
    textAlign: {
      exact: ["text-left", "text-center", "text-right", "text-justify"],
    },
    lineHeight: {
      exact: lineHeightOptions.map((opt) => opt.value),
      prefix: "leading",
    },
    letterSpacing: {
      exact: letterSpacingOptions.map((opt) => opt.value),
      prefix: "tracking",
    },
    isItalic: { exact: ["italic"] },
    isUnderline: { exact: ["underline"] },
    isHeadingFont: { exact: ["font-heading"] },
  };

  // Tailwind class states with defaults from current className
  const [fontSize, setFontSize] = useState("text-base");
  const [fontWeight, setFontWeight] = useState("font-normal");
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isHeadingFont, setIsHeadingFont] = useState(false);
  const [textAlign, setTextAlign] = useState("text-left");
  const [lineHeight, setLineHeight] = useState("leading-normal");
  const [letterSpacing, setLetterSpacing] = useState("tracking-normal");

  // Ref for debouncing
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const syncingRef = useRef(true);

  // Update states when the node changes (e.g., when reselected)
  useEffect(() => {
    syncingRef.current = true;
    const extractedClasses = extractClasses(
      classesAtBreakpoint(className, prefix).join(" "),
      categoryMappings,
    );

    setFontSize((extractedClasses.fontSize as string) || "text-base");
    setFontWeight((extractedClasses.fontWeight as string) || "font-normal");
    setIsItalic(!!extractedClasses.isItalic);
    setIsUnderline(!!extractedClasses.isUnderline);
    setIsHeadingFont(!!extractedClasses.isHeadingFont);
    setTextAlign((extractedClasses.textAlign as string) || "text-left");
    setLineHeight((extractedClasses.lineHeight as string) || "leading-normal");
    setLetterSpacing(
      (extractedClasses.letterSpacing as string) || "tracking-normal",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [className, prefix]);

  // Debounced update node props. categoryMappings is derived from static option lists.
  useEffect(() => {
    if (syncingRef.current) {
      syncingRef.current = false;
      return;
    }
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      // Remove existing typography classes before adding new ones
      const isTypographyClass = (cls: string) => {
        const isExact = Object.values(categoryMappings)
          .flatMap((c: any) => c.exact || [])
          .includes(cls);
        const isArbitraryText =
          cls.startsWith("text-[") &&
          cls.endsWith("]") &&
          !isTextColorClass(cls);
        const isArbitraryLeading =
          cls.startsWith("leading-[") && cls.endsWith("]");
        const isArbitraryTracking =
          cls.startsWith("tracking-[") && cls.endsWith("]");
        const isHeadingClass = cls === "font-heading";

        return (
          isExact ||
          isArbitraryText ||
          isArbitraryLeading ||
          isArbitraryTracking ||
          isHeadingClass
        );
      };
      const additions = cn(
        fontSize,
        fontWeight,
        isItalic && "italic",
        isUnderline && "underline",
        isHeadingFont && "font-heading",
        textAlign,
        lineHeight,
        letterSpacing,
      )
        .replace(/\s+/g, " ")
        .trim()
        .split(" ");

      actions.setProp((props: any) => {
        props.className = replaceBreakpointClasses(
          props.className || "",
          prefix,
          isTypographyClass,
          additions,
        );
      });
    }, 300); // 300ms delay

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fontSize,
    fontWeight,
    isItalic,
    isUnderline,
    isHeadingFont,
    textAlign,
    lineHeight,
    letterSpacing,
    className,
    actions,
    prefix,
  ]);

  const alignments = [
    { value: "text-left", icon: AlignLeft },
    { value: "text-center", icon: AlignCenter },
    { value: "text-right", icon: AlignRight },
    { value: "text-justify", icon: AlignJustify },
  ];

  const isFontSizeCustom = isCustomValue(fontSize, fontSizeOptions);
  const isLineHeightCustom = isCustomValue(lineHeight, lineHeightOptions);
  const isLetterSpacingCustom = isCustomValue(
    letterSpacing,
    letterSpacingOptions,
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <ResponsiveLabel className="text-xs text-neutral-500 dark:text-neutral-400">
          Typography Font
        </ResponsiveLabel>
        <div className="flex bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 rounded-md p-1 border">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "flex-1 h-8 text-xs font-medium rounded",
              !isHeadingFont
                ? "bg-accent text-accent-foreground"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:text-white",
            )}
            onClick={() => setIsHeadingFont(false)}
          >
            Body Font
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "flex-1 h-8 text-xs font-medium rounded",
              isHeadingFont
                ? "bg-accent text-accent-foreground"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:text-white",
            )}
            onClick={() => setIsHeadingFont(true)}
          >
            Heading Font
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <ResponsiveLabel className="text-xs text-neutral-500 dark:text-neutral-400">
          Settings
        </ResponsiveLabel>
        <div className="flex items-start gap-4">
          <div className="flex-1 space-y-2">
            <div className="relative flex items-center bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded">
              <span className="text-neutral-500 dark:text-neutral-400 text-xs mx-2 whitespace-nowrap">
                size
              </span>
              <select
                value={isFontSizeCustom ? "custom" : fontSize}
                onChange={(e) => {
                  if (e.target.value === "custom") setFontSize("text-[1.5rem]");
                  else setFontSize(e.target.value);
                }}
                className="flex-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white py-2 px-1 rounded text-sm outline-none focus:outline-none focus:ring-0"
              >
                {fontSizeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                <option value="custom">Custom</option>
              </select>
            </div>
            {isFontSizeCustom && (
              <div className="relative flex items-center bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded">
                <span className="text-neutral-500 dark:text-neutral-400 text-[10px] mx-2 whitespace-nowrap">
                  val
                </span>
                <input
                  className="flex-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white py-1.5 px-1 rounded text-sm outline-none w-full"
                  value={fontSize.replace(/^text-\[?(.*?)\]?$/, "$1")}
                  onChange={(e) => setFontSize(`text-[${e.target.value}]`)}
                  placeholder="e.g. 2rem, clamp(..)"
                />
              </div>
            )}
          </div>

          <div className="flex-1 space-y-2">
            <div className="relative flex items-center bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded">
              <span className="text-neutral-500 dark:text-neutral-400 text-xs mx-2 whitespace-nowrap">
                weight
              </span>
              <select
                value={fontWeight}
                onChange={(e) => setFontWeight(e.target.value)}
                className="flex-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white py-2 px-1 rounded text-sm outline-none focus:outline-none focus:ring-0"
              >
                {fontWeightOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <ResponsiveLabel className="text-xs text-neutral-500 dark:text-neutral-400">
          Text Style
        </ResponsiveLabel>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "flex-1 p-2 rounded-2xl",
              fontWeight === "font-bold" && "bg-accent text-accent-foreground",
            )}
            onClick={() =>
              setFontWeight(
                fontWeight === "font-bold" ? "font-normal" : "font-bold",
              )
            }
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "flex-1 p-2 rounded-2xl",
              isItalic && "bg-accent text-accent-foreground",
            )}
            onClick={() => setIsItalic(!isItalic)}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "flex-1 p-2 rounded-2xl",
              isUnderline && "bg-accent text-accent-foreground",
            )}
            onClick={() => setIsUnderline(!isUnderline)}
          >
            <Underline className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <ResponsiveLabel className="text-xs text-neutral-500 dark:text-neutral-400">
          Text Alignment
        </ResponsiveLabel>
        <div className="flex items-center gap-2">
          {alignments.map(({ value, icon: Icon }) => (
            <Button
              key={value}
              variant="outline"
              size="sm"
              className={cn(
                "flex-1 p-2 rounded-2xl",
                textAlign === value && "bg-accent text-accent-foreground",
              )}
              onClick={() => setTextAlign(value)}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <ResponsiveLabel className="text-xs text-neutral-500 dark:text-neutral-400">
          Spacing Controls
        </ResponsiveLabel>
        <div className="flex items-start gap-2">
          <div className="flex-1 space-y-2">
            <div className="relative flex items-center bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded">
              <span className="text-neutral-500 dark:text-neutral-400 text-xs mx-2 whitespace-nowrap">
                Line
              </span>
              <select
                value={isLineHeightCustom ? "custom" : lineHeight}
                onChange={(e) => {
                  if (e.target.value === "custom")
                    setLineHeight("leading-[1.5]");
                  else setLineHeight(e.target.value);
                }}
                className="flex-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white py-2 px-1 rounded text-sm outline-none focus:outline-none focus:ring-0"
              >
                {lineHeightOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                <option value="custom">Custom</option>
              </select>
            </div>
            {isLineHeightCustom && (
              <div className="relative flex items-center bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded">
                <span className="text-neutral-500 dark:text-neutral-400 text-[10px] mx-2 whitespace-nowrap">
                  val
                </span>
                <input
                  className="flex-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white py-1.5 px-1 rounded text-sm outline-none w-full"
                  value={lineHeight.replace(/^leading-\[?(.*?)\]?$/, "$1")}
                  onChange={(e) => setLineHeight(`leading-[${e.target.value}]`)}
                  placeholder="e.g. 1.2"
                />
              </div>
            )}
          </div>

          <div className="flex-1 space-y-2">
            <div className="relative flex items-center bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded">
              <span className="text-neutral-500 dark:text-neutral-400 text-xs mx-2 whitespace-nowrap">
                Space
              </span>
              <select
                value={isLetterSpacingCustom ? "custom" : letterSpacing}
                onChange={(e) => {
                  if (e.target.value === "custom")
                    setLetterSpacing("tracking-[0.1em]");
                  else setLetterSpacing(e.target.value);
                }}
                className="flex-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white py-2 px-1 rounded text-sm outline-none focus:outline-none focus:ring-0"
              >
                {letterSpacingOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                <option value="custom">Custom</option>
              </select>
            </div>
            {isLetterSpacingCustom && (
              <div className="relative flex items-center bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded">
                <span className="text-neutral-500 dark:text-neutral-400 text-[10px] mx-2 whitespace-nowrap">
                  val
                </span>
                <input
                  className="flex-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white py-1.5 px-1 rounded text-sm outline-none w-full"
                  value={letterSpacing.replace(/^tracking-\[?(.*?)\]?$/, "$1")}
                  onChange={(e) =>
                    setLetterSpacing(`tracking-[${e.target.value}]`)
                  }
                  placeholder="e.g. 0.05em"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypographySettings;
