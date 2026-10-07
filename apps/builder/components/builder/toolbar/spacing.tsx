import { useState, useEffect, useRef } from "react";
import { useNode } from "@craftjs/core";
import { Link, ChevronUp, ChevronDown } from "lucide-react";
import {
  classesAtBreakpoint,
  replaceBreakpointClasses,
  ResponsiveDeviceButton,
  useResponsiveToolbar,
} from "./responsive";

// CSS units for dimensions
const UNITS = ["Default", "px", "%", "em", "rem", "vw", "vh"] as const;
type CSSUnit = (typeof UNITS)[number];

// Simplified Tailwind spacing scale with just the key values
const TAILWIND_SCALE = [
  "0",
  "0.5",
  "1",
  "1.5",
  "2",
  "2.5",
  "3",
  "3.5",
  "4",
  "5",
  "6",
  "8",
  "10",
  "12",
  "16",
  "20",
  "24",
  "32",
  "40",
  "48",
  "64",
  "80",
  "96",
];

// Spacing input component for individual side controls
const SpacingInput = ({
  value,
  onChange,
  side,
  unit,
}: {
  value: string;
  onChange: (value: string) => void;
  side: string;
  unit: CSSUnit;
}) => {
  // Handle increment/decrement using the simplified scale
  const handleIncrement = () => {
    if (unit === "Default") {
      const currentIndex = TAILWIND_SCALE.indexOf(value);
      if (currentIndex < TAILWIND_SCALE.length - 1) {
        onChange(TAILWIND_SCALE[currentIndex + 1]);
      }
    } else {
      const numValue = value === "" ? 0 : parseFloat(value);
      onChange((numValue + 1).toString());
    }
  };

  const handleDecrement = () => {
    if (unit === "Default") {
      const currentIndex = TAILWIND_SCALE.indexOf(value);
      if (currentIndex > 0) {
        onChange(TAILWIND_SCALE[currentIndex - 1]);
      }
    } else {
      const numValue = value === "" ? 0 : parseFloat(value);
      if (numValue > 0) {
        onChange((numValue - 1).toString());
      }
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full flex">
        <input
          type={unit === "Default" ? "text" : "number"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-center bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white py-2 pl-2 pr-6 rounded-l text-xs border border-neutral-200 dark:border-neutral-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500
          [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          placeholder="0"
          step={unit === "Default" ? undefined : "1"}
        />
        <div className="absolute right-0 top-0 bottom-0 flex flex-col">
          <button
            onClick={handleIncrement}
            className="flex-1 px-1 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-tr"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            onClick={handleDecrement}
            className="flex-1 px-1 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-br"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>
      <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 capitalize">
        {side}
      </span>
    </div>
  );
};

// Spacing group component (reusable for margin and padding)
const SpacingGroup = ({
  title,
  values,
  unit,
  onChange,
  onChangeUnit,
  linked,
  setLinked,
}: {
  title: string;
  values: Record<string, string>;
  unit: CSSUnit;
  onChange: (side: string, value: string) => void;
  onChangeUnit: (unit: CSSUnit) => void;
  linked: boolean;
  setLinked: (linked: boolean) => void;
}) => {
  const sides = ["top", "right", "bottom", "left"] as const;

  const handleChange = (side: string, value: string) => {
    // If linked, update all sides with the same value
    if (linked) {
      sides.forEach((s) => {
        onChange(s, value);
      });
    } else {
      // Update only the changed side
      onChange(side, value);
    }
  };

  const handleUnitChange = (newUnit: CSSUnit) => {
    // First reset all values to empty
    sides.forEach((side) => {
      onChange(side, "");
    });

    // Then change the unit
    onChangeUnit(newUnit);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
          {title}
        </span>
        <div className="flex items-center gap-2">
          <ResponsiveDeviceButton />
          <button
            className={`p-1 rounded ${
              linked ? "bg-blue-600" : "bg-neutral-700"
            } transition-colors`}
            onClick={() => setLinked(!linked)}
            title={linked ? "Unlink values" : "Link values"}
          >
            <Link className="w-3 h-3 text-neutral-100" />
          </button>
          <select
            value={unit}
            onChange={(e) => handleUnitChange(e.target.value as CSSUnit)}
            className="bg-neutral-200 dark:bg-neutral-700 text-neutral-300 text-xs rounded border border-neutral-600 focus:outline-none cursor-pointer"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {sides.map((side) => (
          <SpacingInput
            key={side}
            side={side}
            value={values[side]}
            onChange={(value) => handleChange(side, value)}
            unit={unit}
          />
        ))}
      </div>
    </div>
  );
};

const SpacingSection = () => {
  const { prefix } = useResponsiveToolbar();
  const { actions, id } = useNode();
  const { props } = useNode((node) => ({ props: node.data.props }));
  const initialClassNames = classesAtBreakpoint(props?.className || "", prefix);

  // Spacing state with utility functions
  const createSpacingState = (prefix: string) => {
    const initialState = {
      top: "",
      right: "",
      bottom: "",
      left: "",
      unit: "Default" as CSSUnit,
      linked: true,
    };

    // Extract existing spacing classes
    initialClassNames.forEach((cls: string) => {
      if (cls.startsWith(`${prefix}-`)) {
        // Handle linked spacing (e.g., m-4)
        initialState.top = cls.replace(`${prefix}-`, "");
        initialState.right = initialState.top;
        initialState.bottom = initialState.top;
        initialState.left = initialState.top;
      } else if (cls.startsWith(`${prefix}t-`)) {
        initialState.top = cls.replace(`${prefix}t-`, "");
        initialState.linked = false;
      } else if (cls.startsWith(`${prefix}r-`)) {
        initialState.right = cls.replace(`${prefix}r-`, "");
        initialState.linked = false;
      } else if (cls.startsWith(`${prefix}b-`)) {
        initialState.bottom = cls.replace(`${prefix}b-`, "");
        initialState.linked = false;
      } else if (cls.startsWith(`${prefix}l-`)) {
        initialState.left = cls.replace(`${prefix}l-`, "");
        initialState.linked = false;
      }
    });

    return initialState;
  };

  // State for margin and padding
  const [margin, setMargin] = useState(() => createSpacingState("m"));
  const [padding, setPadding] = useState(() => createSpacingState("p"));
  const syncingRef = useRef(true);

  useEffect(() => {
    syncingRef.current = true;
    setMargin(createSpacingState("m"));
    setPadding(createSpacingState("p"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefix]);

  // Update node props when spacing changes
  useEffect(() => {
    if (syncingRef.current) {
      syncingRef.current = false;
      return;
    }
    updateNodeProps();
    // updateNodeProps consumes the latest local control state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [margin, padding]);

  // Helper function to update specific spacing value
  const updateSpacing = (
    type: "margin" | "padding",
    side: string,
    value: string,
  ) => {
    if (type === "margin") {
      setMargin((prev) => ({
        ...prev,
        [side]: value,
      }));
    } else {
      setPadding((prev) => ({
        ...prev,
        [side]: value,
      }));
    }
  };

  // Helper function to update unit
  const updateUnit = (type: "margin" | "padding", unit: CSSUnit) => {
    if (type === "margin") {
      setMargin((prev) => ({
        ...prev,
        unit,
      }));
    } else {
      setPadding((prev) => ({
        ...prev,
        unit,
      }));
    }
  };

  // Helper function to update linked state
  const updateLinked = (type: "margin" | "padding", linked: boolean) => {
    if (type === "margin") {
      setMargin((prev) => ({
        ...prev,
        linked,
      }));
    } else {
      setPadding((prev) => ({
        ...prev,
        linked,
      }));
    }
  };

  // Generate Tailwind classes for spacing
  const generateSpacingClasses = (
    prefix: string,
    values: Record<string, string>,
    unit: CSSUnit,
    linked: boolean,
  ) => {
    const classes: string[] = [];
    const sides = ["top", "right", "bottom", "left"] as const;
    const prefixes = {
      top: `${prefix}t`,
      right: `${prefix}r`,
      bottom: `${prefix}b`,
      left: `${prefix}l`,
    };

    if (linked) {
      // For linked values, use a single class
      const value = values.top || values.right || values.bottom || values.left;
      if (value) {
        const className =
          unit === "Default"
            ? `${prefix}-${value}`
            : `${prefix}-[${value}${unit}]`;
        classes.push(className);
      }
    } else {
      // For unlinked values, use individual classes
      sides.forEach((side) => {
        if (values[side]) {
          const className =
            unit === "Default"
              ? `${prefixes[side]}-${values[side]}`
              : `${prefixes[side]}-[${values[side]}${unit}]`;
          classes.push(className);
        }
      });
    }

    return classes;
  };

  // Function to update the node props with new classes
  const updateNodeProps = () => {
    actions.setProp((props: any) => {
      const classes: string[] = [];

      // Add margin classes
      classes.push(
        ...generateSpacingClasses(
          "m",
          {
            top: margin.top,
            right: margin.right,
            bottom: margin.bottom,
            left: margin.left,
          },
          margin.unit,
          margin.linked,
        ),
      );

      // Add padding classes
      classes.push(
        ...generateSpacingClasses(
          "p",
          {
            top: padding.top,
            right: padding.right,
            bottom: padding.bottom,
            left: padding.left,
          },
          padding.unit,
          padding.linked,
        ),
      );

      // Update the className prop
      props.className = replaceBreakpointClasses(
        props.className || "",
        prefix,
        (cls) => /^(m[trbl]?|p[trbl]?)-/.test(cls),
        classes,
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Margin Section */}
      <SpacingGroup
        title="Margin"
        values={{
          top: margin.top,
          right: margin.right,
          bottom: margin.bottom,
          left: margin.left,
        }}
        unit={margin.unit}
        onChange={(side, value) => updateSpacing("margin", side, value)}
        onChangeUnit={(unit) => updateUnit("margin", unit)}
        linked={margin.linked}
        setLinked={(linked) => updateLinked("margin", linked)}
      />

      {/* Padding Section */}
      <SpacingGroup
        title="Padding"
        values={{
          top: padding.top,
          right: padding.right,
          bottom: padding.bottom,
          left: padding.left,
        }}
        unit={padding.unit}
        onChange={(side, value) => updateSpacing("padding", side, value)}
        onChangeUnit={(unit) => updateUnit("padding", unit)}
        linked={padding.linked}
        setLinked={(linked) => updateLinked("padding", linked)}
      />
    </div>
  );
};

export default SpacingSection;
