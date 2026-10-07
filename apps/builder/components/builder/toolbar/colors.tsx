import { useState, useEffect } from "react";
import { useNode } from "@craftjs/core";
import { ColorPicker } from "@/components/color-picker";
import { isTextColorClass, isBgColorClass } from "@/lib/tailwind-color-utils";
import {
  classesAtBreakpoint,
  replaceBreakpointClasses,
  ResponsiveLabel,
  useResponsiveToolbar,
} from "./responsive";

// Utility to get computed color from DOM element
const getComputedColor = (
  element: HTMLElement | null,
  styleProperty: string,
  fallback: string,
): string => {
  if (!element) return fallback;

  try {
    const computedStyle = window.getComputedStyle(element);
    const color = computedStyle.getPropertyValue(styleProperty);

    // Handle special cases
    if (color === "rgba(0, 0, 0, 0)" || color === "transparent") {
      return "transparent";
    }

    // Convert rgba to hex if needed
    if (color.startsWith("rgb")) {
      return rgbaToHex(color);
    }

    return color || fallback;
  } catch (error) {
    console.warn("Error getting computed color:", error);
    return fallback;
  }
};

// Convert rgba to hex
const rgbaToHex = (rgba: string): string => {
  try {
    // Handle rgba(r, g, b, a) format
    const match = rgba.match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/,
    );
    if (!match) return rgba;

    const [, r, g, b, a] = match;
    const alpha = a ? parseFloat(a) : 1;

    if (alpha === 0) return "transparent";

    const toHex = (n: number) => {
      const hex = n.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };

    return `#${toHex(parseInt(r))}${toHex(parseInt(g))}${toHex(parseInt(b))}`;
  } catch (error) {
    return rgba;
  }
};

const ColorsSection = () => {
  const { prefix } = useResponsiveToolbar();
  const {
    actions,
    className = "",
    style = {},
    dom,
  } = useNode((node) => ({
    className: node.data.props.className || "",
    style: node.data.props.style || {},
    dom: node.dom,
  }));

  const getInitialColors = () => {
    const scoped = classesAtBreakpoint(className, prefix);
    const textClass = scoped.find(isTextColorClass);
    const bgClass = scoped.find(isBgColorClass);
    const arbitrary = (value: string | undefined, kind: "text" | "bg") =>
      value?.match(new RegExp(`^${kind}-\\[(.*)\\]$`))?.[1] || "";
    if (prefix && !textClass && !bgClass) return { textColor: "", bgColor: "" };
    const textColor = getComputedColor(dom, "color", "#000000");
    const bgColor = getComputedColor(dom, "background-color", "transparent");
    return {
      textColor: arbitrary(textClass, "text") || textColor,
      bgColor: arbitrary(bgClass, "bg") || bgColor,
    };
  };

  // Extract initial colors from DOM
  const [initialTextColor] = useState(() => getInitialColors().textColor);
  const [initialBgColor] = useState(() => getInitialColors().bgColor);

  // Track current colors
  const [textColor, setTextColor] = useState(initialTextColor);
  const [bgColor, setBgColor] = useState(initialBgColor);

  const applyColor = (kind: "text" | "bg", color: string) => {
    actions.setProp((props: any) => {
      props.className = replaceBreakpointClasses(
        props.className || "",
        prefix,
        kind === "text" ? isTextColorClass : isBgColorClass,
        color && color !== "transparent" ? [`${kind}-[${color}]`] : [],
      );

      // Clean up any inline style colors since we're using Tailwind classes now
      if (props.style) {
        const {
          color: oldColor,
          backgroundColor,
          ...otherStyles
        } = props.style;
        props.style = otherStyles;
      }
    });
  };

  // Update color states when node props change (e.g., when selecting different component)
  useEffect(() => {
    const { textColor: newTextColor, bgColor: newBgColor } = getInitialColors();
    setTextColor(newTextColor);
    setBgColor(newBgColor);
    // getInitialColors intentionally follows the selected node's live DOM/class state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dom, prefix, className]);

  return (
    <div className="space-y-4">
      <div className="flex space-x-4">
        <div className="space-y-2">
          <ResponsiveLabel className="text-xs text-neutral-500 dark:text-neutral-400">
            Text
          </ResponsiveLabel>
          <ColorPicker
            label=""
            color={textColor}
            onChange={(color) => {
              setTextColor(color);
              applyColor("text", color);
            }}
            clearColor=""
            resetColor={initialTextColor}
          />
        </div>
        <div className="space-y-2">
          <ResponsiveLabel className="text-xs text-neutral-500 dark:text-neutral-400">
            Background
          </ResponsiveLabel>
          <ColorPicker
            label=""
            color={bgColor}
            onChange={(color) => {
              setBgColor(color);
              applyColor("bg", color);
            }}
            clearColor=""
            resetColor={initialBgColor}
          />
        </div>
      </div>
    </div>
  );
};

export default ColorsSection;
