import { useNode } from "@craftjs/core";
import { useState, useMemo } from "react";
import * as LucideIcons from "lucide-react";
import { ALL_LUCIDE_ICONS } from "@/constants/icons";

export const IconSettings = () => {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({
    props: node.data.props,
  }));

  const [searchTerm, setSearchTerm] = useState("");

  // Memoize filtered icons for performance
  const filteredIcons = useMemo(
    () =>
      ALL_LUCIDE_ICONS.filter((iconName) =>
        iconName.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [searchTerm],
  );

  const handleIconSelect = (iconName: string) => {
    setProp((props: any) => {
      props.iconName = iconName;
    });
  };

  const handleSizeChange = (value: string) => {
    setProp((props: any) => {
      props.size = parseInt(value);
    });
  };

  const handleStrokeWidthChange = (value: string) => {
    setProp((props: any) => {
      props.strokeWidth = parseFloat(value);
    });
  };

  const renderIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    if (!IconComponent) return null;

    const isSelected = props.iconName === iconName;

    return (
      <button
        key={iconName}
        onClick={() => handleIconSelect(iconName)}
        className={`p-2 rounded-md border transition-all duration-200 hover:scale-105 ${
          isSelected
            ? "border-blue-500 bg-blue-500/20 shadow-md"
            : "border-neutral-600 hover:border-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700"
        }`}
        title={iconName}
        aria-label={`Select ${iconName} icon`}
      >
        <IconComponent size={20} className="text-neutral-900 dark:text-white" />
      </button>
    );
  };

  const renderCurrentIcon = () => {
    const IconComponent = (LucideIcons as any)[props.iconName];
    return IconComponent ? (
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-md bg-neutral-700">
          <IconComponent
            size={props.size}
            strokeWidth={props.strokeWidth}
            className="text-neutral-900 dark:text-white"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            {props.iconName}
          </span>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {props.size}px • {props.strokeWidth} stroke
          </span>
        </div>
      </div>
    ) : (
      <span className="text-sm text-neutral-500 dark:text-neutral-400">
        No icon selected
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Icon Search */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Search Icons
        </label>
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 px-3 py-2 pr-10 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Search for icons..."
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:text-neutral-200"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Icon Grid */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Choose Icon ({filteredIcons.length} available)
        </label>
        <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded-md p-3 bg-neutral-100 dark:bg-neutral-800/50">
          {filteredIcons.map(renderIcon)}
        </div>
        {filteredIcons.length === 0 && (
          <div className="text-center py-8">
            <div className="text-neutral-500 dark:text-neutral-400 text-sm">
              No icons found for "{searchTerm}"
            </div>
            <button
              onClick={() => setSearchTerm("")}
              className="mt-2 text-xs text-blue-400 hover:text-blue-300"
            >
              Clear search
            </button>
          </div>
        )}
      </div>

      {/* Size Control */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Size: {props.size}px
        </label>
        <input
          type="range"
          min="12"
          max="64"
          value={props.size}
          onChange={(e) => handleSizeChange(e.target.value)}
          className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400">
          <span>12px</span>
          <span>64px</span>
        </div>
      </div>

      {/* Stroke Width Control */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Stroke Width: {props.strokeWidth}
        </label>
        <input
          type="range"
          min="0.5"
          max="4"
          step="0.5"
          value={props.strokeWidth}
          onChange={(e) => handleStrokeWidthChange(e.target.value)}
          className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400">
          <span>0.5</span>
          <span>4.0</span>
        </div>
      </div>

      {/* Current Selection Display */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Current Selection
        </label>
        <div className="p-4 rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800">
          {renderCurrentIcon()}
        </div>
      </div>
    </div>
  );
};
