import { useState, useEffect, useRef } from "react";
import { useNode } from "@craftjs/core";
import { ArrowDown, ArrowRight, Columns, LayoutGrid } from "lucide-react";
import {
  classesAtBreakpoint,
  replaceBreakpointClasses,
  ResponsiveLabel,
  useResponsiveToolbar,
} from "./responsive";

// Available display options
const DISPLAY_OPTIONS = [
  { value: "block", label: "Block" },
  { value: "inline", label: "Inline" },
  { value: "inline-block", label: "Inline Block" },
  { value: "flex", label: "Flex" },
  { value: "inline-flex", label: "Inline Flex" },
  { value: "grid", label: "Grid" },
  { value: "inline-grid", label: "Inline Grid" },
  { value: "contents", label: "Contents" },
  { value: "hidden", label: "Hidden" },
] as const;

type DisplayValue = (typeof DISPLAY_OPTIONS)[number]["value"];

// Flex direction options
const FLEX_DIRECTION_OPTIONS = [
  { value: "row", label: "Row", icon: ArrowRight },
  { value: "row-reverse", label: "Row Reverse", icon: ArrowRight },
  { value: "col", label: "Column", icon: ArrowDown },
  { value: "col-reverse", label: "Column Reverse", icon: ArrowDown },
] as const;

type FlexDirectionValue = (typeof FLEX_DIRECTION_OPTIONS)[number]["value"];

// Flex wrap options
const FLEX_WRAP_OPTIONS = [
  { value: "nowrap", label: "No Wrap" },
  { value: "wrap", label: "Wrap" },
  { value: "wrap-reverse", label: "Wrap Reverse" },
] as const;

type FlexWrapValue = (typeof FLEX_WRAP_OPTIONS)[number]["value"];

// Grid template columns presets
const GRID_COLUMNS_OPTIONS = [
  { value: "1", label: "1 Column" },
  { value: "2", label: "2 Columns" },
  { value: "3", label: "3 Columns" },
  { value: "4", label: "4 Columns" },
  { value: "5", label: "5 Columns" },
  { value: "6", label: "6 Columns" },
  { value: "none", label: "Custom" },
] as const;

type GridColumnsValue = (typeof GRID_COLUMNS_OPTIONS)[number]["value"];

// Grid template rows presets
const GRID_ROWS_OPTIONS = [
  { value: "1", label: "1 Row" },
  { value: "2", label: "2 Rows" },
  { value: "3", label: "3 Rows" },
  { value: "4", label: "4 Rows" },
  { value: "5", label: "5 Rows" },
  { value: "none", label: "Custom" },
] as const;

type GridRowsValue = (typeof GRID_ROWS_OPTIONS)[number]["value"];

// Grid gap sizes
const GRID_GAP_OPTIONS = [
  { value: "0", label: "None" },
  { value: "1", label: "XS" },
  { value: "2", label: "S" },
  { value: "4", label: "M" },
  { value: "6", label: "L" },
  { value: "8", label: "XL" },
] as const;

type GridGapValue = (typeof GRID_GAP_OPTIONS)[number]["value"];

interface DisplayState {
  display: DisplayValue;
  flexDirection: FlexDirectionValue;
  flexWrap: FlexWrapValue;
  gridColumns: GridColumnsValue;
  customGridColumns: string;
  gridRows: GridRowsValue;
  customGridRows: string;
  gridGap: GridGapValue;
}

const Display = () => {
  const { prefix } = useResponsiveToolbar();
  const { actions } = useNode();
  const { props } = useNode((node) => ({ props: node.data.props }));
  const initialClassNames = classesAtBreakpoint(props?.className || "", prefix);

  // Function to extract initial display state from classes
  const extractInitialDisplayState = (): DisplayState => {
    const state: DisplayState = {
      display: "block",
      flexDirection: "row",
      flexWrap: "nowrap",
      gridColumns: "1",
      customGridColumns: "",
      gridRows: "1",
      customGridRows: "",
      gridGap: "0",
    };

    // Find display class
    for (const option of DISPLAY_OPTIONS) {
      if (initialClassNames.includes(option.value)) {
        state.display = option.value;
        break;
      }
    }

    // Find flex direction
    for (const direction of FLEX_DIRECTION_OPTIONS) {
      if (initialClassNames.includes(`flex-${direction.value}`)) {
        state.flexDirection = direction.value;
        break;
      }
    }

    // Find flex wrap
    for (const wrap of FLEX_WRAP_OPTIONS) {
      if (initialClassNames.includes(`flex-${wrap.value}`)) {
        state.flexWrap = wrap.value;
        break;
      }
    }

    // Extract grid columns
    const gridColsClass = initialClassNames.find((cls: string) =>
      cls.startsWith("grid-cols-"),
    );
    if (gridColsClass) {
      const value = gridColsClass.replace("grid-cols-", "");
      if (["1", "2", "3", "4", "5", "6"].includes(value)) {
        state.gridColumns = value as GridColumnsValue;
      } else {
        state.gridColumns = "none";
        state.customGridColumns = value;
      }
    }

    // Extract grid rows
    const gridRowsClass = initialClassNames.find((cls: string) =>
      cls.startsWith("grid-rows-"),
    );
    if (gridRowsClass) {
      const value = gridRowsClass.replace("grid-rows-", "");
      if (["1", "2", "3", "4", "5"].includes(value)) {
        state.gridRows = value as GridRowsValue;
      } else {
        state.gridRows = "none";
        state.customGridRows = value;
      }
    }

    // Extract grid gap
    const gridGapClass = initialClassNames.find((cls: string) =>
      cls.startsWith("gap-"),
    );
    if (gridGapClass) {
      const value = gridGapClass.replace("gap-", "");
      if (["0", "1", "2", "4", "6", "8"].includes(value)) {
        state.gridGap = value as GridGapValue;
      }
    }

    return state;
  };

  // State for display settings
  const [displayState, setDisplayState] = useState<DisplayState>(
    extractInitialDisplayState,
  );
  const syncingRef = useRef(true);

  useEffect(() => {
    syncingRef.current = true;
    setDisplayState(extractInitialDisplayState());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefix]);

  // Update node props when display settings change
  useEffect(() => {
    if (syncingRef.current) {
      syncingRef.current = false;
      return;
    }
    updateNodeProps();
    // updateNodeProps consumes the latest local control state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayState]);

  // Function to update the node props with new classes
  const updateNodeProps = () => {
    actions.setProp((props: any) => {
      const classes: string[] = [];

      // Add display class
      classes.push(displayState.display);

      // Add flex-related classes if display is flex or inline-flex
      if (
        displayState.display === "flex" ||
        displayState.display === "inline-flex"
      ) {
        classes.push(`flex-${displayState.flexDirection}`);
        classes.push(`flex-${displayState.flexWrap}`);
      }

      // Add grid-related classes if display is grid or inline-grid
      if (
        displayState.display === "grid" ||
        displayState.display === "inline-grid"
      ) {
        // Grid columns
        if (displayState.gridColumns !== "none") {
          classes.push(`grid-cols-${displayState.gridColumns}`);
        } else if (displayState.customGridColumns) {
          classes.push(`grid-cols-${displayState.customGridColumns}`);
        }

        // Grid rows
        if (displayState.gridRows !== "none") {
          classes.push(`grid-rows-${displayState.gridRows}`);
        } else if (displayState.customGridRows) {
          classes.push(`grid-rows-${displayState.customGridRows}`);
        }

        // Grid gap
        if (displayState.gridGap !== "0") {
          classes.push(`gap-${displayState.gridGap}`);
        }
      }

      // Update the className prop
      props.className = replaceBreakpointClasses(
        props.className || "",
        prefix,
        (cls) =>
          DISPLAY_OPTIONS.some((option) => cls === option.value) ||
          cls.startsWith("flex-") ||
          cls.startsWith("grid-cols-") ||
          cls.startsWith("grid-rows-") ||
          cls.startsWith("gap-"),
        classes,
      );
    });
  };

  // Helper function to update any display state property
  const updateDisplayState = <K extends keyof DisplayState>(
    key: K,
    value: DisplayState[K],
  ) => {
    setDisplayState((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Base style for section labels
  const labelStyle =
    "text-xs font-medium text-neutral-800 dark:text-neutral-200 mb-2";

  // Base style for selects
  const selectStyle =
    "w-full bg-neutral-200 dark:bg-neutral-800 text-neutral-300 text-sm rounded border border-neutral-600 focus:outline-none cursor-pointer p-2";

  return (
    <div className="space-y-6">
      {/* Display Type */}
      <div className="space-y-2">
        <ResponsiveLabel className={labelStyle}>Type</ResponsiveLabel>
        <select
          value={displayState.display}
          onChange={(e) =>
            updateDisplayState("display", e.target.value as DisplayValue)
          }
          className={selectStyle}
        >
          {DISPLAY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Flex Settings - only show when display is flex or inline-flex */}
      {(displayState.display === "flex" ||
        displayState.display === "inline-flex") && (
        <div className="space-y-4">
          <div className="pt-2 pb-1 border-t border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-2">
              <Columns className="h-4 w-4 text-yellow-400" />
              <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                Flex Settings
              </span>
            </div>
          </div>

          {/* Flex Direction */}
          <div className="space-y-2">
            <ResponsiveLabel className={labelStyle}>Direction</ResponsiveLabel>
            <div className="grid grid-cols-2 gap-2">
              {FLEX_DIRECTION_OPTIONS.map((option) => {
                const Icon = option.icon;
                const selected = displayState.flexDirection === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() =>
                      updateDisplayState("flexDirection", option.value)
                    }
                    className={`flex items-center justify-center gap-2 p-2 rounded border ${
                      selected
                        ? "bg-blue-600 border-blue-500 text-neutral-900 dark:text-white"
                        : "bg-neutral-100 dark:bg-neutral-800 border-neutral-600 text-neutral-300 hover:bg-neutral-600"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        selected
                          ? "text-neutral-900 dark:text-white"
                          : "text-neutral-500 dark:text-neutral-400"
                      } ${
                        option.value.includes("reverse")
                          ? "transform rotate-180"
                          : ""
                      }`}
                    />
                    <span className="text-xs">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Flex Wrap */}
          <div className="space-y-2">
            <ResponsiveLabel className={labelStyle}>Wrap</ResponsiveLabel>
            <select
              value={displayState.flexWrap}
              onChange={(e) =>
                updateDisplayState("flexWrap", e.target.value as FlexWrapValue)
              }
              className={selectStyle}
            >
              {FLEX_WRAP_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Grid Settings - only show when display is grid or inline-grid */}
      {(displayState.display === "grid" ||
        displayState.display === "inline-grid") && (
        <div className="space-y-4">
          <div className="pt-2 pb-1 border-t border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                Grid Settings
              </span>
            </div>
          </div>

          {/* Grid Columns */}
          <div className="space-y-2">
            <ResponsiveLabel className={labelStyle}>Columns</ResponsiveLabel>
            <select
              value={displayState.gridColumns}
              onChange={(e) =>
                updateDisplayState(
                  "gridColumns",
                  e.target.value as GridColumnsValue,
                )
              }
              className={selectStyle}
            >
              {GRID_COLUMNS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Custom Grid Columns Input */}
            {displayState.gridColumns === "none" && (
              <input
                type="text"
                value={displayState.customGridColumns}
                onChange={(e) =>
                  updateDisplayState("customGridColumns", e.target.value)
                }
                placeholder="e.g., repeat(3, minmax(0, 1fr))"
                className="w-full mt-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white py-2 px-2 rounded text-sm border border-neutral-200 dark:border-neutral-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            )}
          </div>

          {/* Grid Rows */}
          <div className="space-y-2">
            <ResponsiveLabel className={labelStyle}>Rows</ResponsiveLabel>
            <select
              value={displayState.gridRows}
              onChange={(e) =>
                updateDisplayState("gridRows", e.target.value as GridRowsValue)
              }
              className={selectStyle}
            >
              {GRID_ROWS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Custom Grid Rows Input */}
            {displayState.gridRows === "none" && (
              <input
                type="text"
                value={displayState.customGridRows}
                onChange={(e) =>
                  updateDisplayState("customGridRows", e.target.value)
                }
                placeholder="e.g., repeat(2, auto)"
                className="w-full mt-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white py-2 px-2 rounded text-sm border border-neutral-200 dark:border-neutral-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            )}
          </div>

          {/* Grid Gap */}
          <div className="space-y-2">
            <ResponsiveLabel className={labelStyle}>Gap</ResponsiveLabel>
            <select
              value={displayState.gridGap}
              onChange={(e) =>
                updateDisplayState("gridGap", e.target.value as GridGapValue)
              }
              className={selectStyle}
            >
              {GRID_GAP_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default Display;
