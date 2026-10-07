import React, { useMemo, useState } from "react";
import { Edit3, Plus, Save, X, RotateCcw, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { ColorPicker } from "@/components/color-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import themes from "@/constants/themes";
import { Theme, ThemeSelectorProps } from "./types";

export function ThemeManager({
  allThemes,
  selectedThemeId,
  onThemeSelect,
  setCustomThemes,
}: ThemeSelectorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);

  // Default color values for reset functionality
  const defaultColors =
    themes.find((theme) => theme.id === "light")?.colors ?? themes[0].colors;

  const selectedTheme = useMemo(
    () => allThemes.find((t) => t.id === selectedThemeId) || allThemes[0],
    [selectedThemeId, allThemes],
  );

  const handleThemeSelect = (themeId: string) => {
    onThemeSelect(themeId);
    setIsEditing(false);
    setEditingTheme(null);
  };

  const handleEditTheme = () => {
    const themeToEdit = { ...selectedTheme };
    setEditingTheme(themeToEdit);
    setIsEditing(true);
  };

  const handleCreateCustomTheme = () => {
    // Limit to 1 custom theme — replace existing if any
    const existingCustom = allThemes.find((t) => t.isCustom);
    if (existingCustom) {
      // Edit existing custom theme instead of creating new
      setEditingTheme({ ...existingCustom });
      setIsEditing(true);
      return;
    }
    const newTheme: Theme = {
      id: `custom-${Date.now()}`,
      name: "Custom Theme",
      colors: { ...defaultColors },
      isCustom: true,
    };
    setEditingTheme(newTheme);
    setIsEditing(true);
  };

  const handleDeleteCustomTheme = (themeId: string) => {
    setCustomThemes((prev) => prev.filter((t) => t.id !== themeId));
    if (selectedThemeId === themeId) {
      onThemeSelect(allThemes[0].id);
    }
  };

  const handleSaveCustomTheme = () => {
    if (!editingTheme) return;

    const isNewTheme = !allThemes.find((t) => t.id === editingTheme.id);

    if (isNewTheme) {
      // Limit to 1 custom theme — replace any existing custom themes
      setCustomThemes((prev) => {
        const withoutCustom = prev.filter((t) => !t.isCustom);
        return [...withoutCustom, { ...editingTheme, isCustom: true }];
      });
    } else {
      if (!editingTheme.isCustom) {
        // Editing a default theme → save as custom (replacing any existing custom)
        const customVersion = {
          ...editingTheme,
          id: `custom-${editingTheme.id}-${Date.now()}`,
          name: `${editingTheme.name}`,
          isCustom: true,
        };
        setCustomThemes((prev) => {
          const withoutCustom = prev.filter((t) => !t.isCustom);
          return [...withoutCustom, customVersion];
        });
        onThemeSelect(customVersion.id);
      } else {
        setCustomThemes((prev) =>
          prev.map((t) =>
            t.id === editingTheme.id ? { ...editingTheme, isCustom: true } : t,
          ),
        );
      }
    }

    if (isNewTheme) {
      onThemeSelect(editingTheme.id);
    }

    setIsEditing(false);
    setEditingTheme(null);
  };

  const handleColorChange = (configKey: string, color: string) => {
    if (!editingTheme) return;

    setEditingTheme((prev) => ({
      ...prev!,
      colors: {
        ...prev!.colors,
        [configKey]: color,
      },
    }));
  };

  const handleNameChange = (name: string) => {
    if (!editingTheme) return;
    setEditingTheme((prev) => ({ ...prev!, name }));
  };

  const handleResetTheme = () => {
    if (!editingTheme) return;
    setEditingTheme((prev) => ({
      ...prev!,
      colors: { ...defaultColors },
    }));
  };

  const currentTheme = isEditing && editingTheme ? editingTheme : selectedTheme;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column - Controls */}
      <div className="space-y-6">
        {!isEditing ? (
          <>
            {/* Theme Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                Select Theme
              </Label>
              <div className="flex gap-2">
                <Select
                  value={selectedTheme.id}
                  onValueChange={handleThemeSelect}
                >
                  <SelectTrigger className="flex-1 bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors duration-200">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {Object.values(selectedTheme.colors)
                            .slice(0, 4)
                            .map((color, index) => (
                              <div
                                key={index}
                                className="w-3 h-3 rounded-full border border-white dark:border-neutral-800 shadow-sm"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                        </div>
                        <span className="text-xs font-medium">
                          {selectedTheme.name}
                        </span>
                        {selectedTheme.isCustom && (
                          <span className="text-xs bg-gradient-to-r from-blue-500 to-purple-500 text-white px-2 py-1 rounded-full">
                            Custom
                          </span>
                        )}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700">
                    {allThemes.map((theme) => (
                      <SelectItem
                        key={theme.id}
                        value={theme.id}
                        className="dark:hover:bg-neutral-800 hover:bg-neutral-50 transition-colors duration-200"
                      >
                        <div className="flex items-center gap-3 py-1">
                          <div className="flex gap-1">
                            {Object.values(theme.colors)
                              .slice(0, 4)
                              .map((color, index) => (
                                <div
                                  key={index}
                                  className="w-4 h-4 rounded-full border-2 border-white dark:border-neutral-800 shadow-sm"
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                          </div>
                          <span className="text-xs font-medium">
                            {theme.name}
                          </span>
                          {theme.isCustom && (
                            <span className="text-xs bg-gradient-to-r from-blue-500 to-purple-500 text-white px-1 py-0.5 rounded-full">
                              Custom
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleEditTheme}
                  className="border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all duration-200 hover:scale-105"
                  title="Edit theme"
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
                {!selectedTheme.isCustom &&
                  !allThemes.some((t) => t.isCustom) && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCreateCustomTheme}
                      className="border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all duration-200 hover:scale-105"
                      title="Create custom theme"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                {selectedTheme.isCustom && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDeleteCustomTheme(selectedTheme.id)}
                    className="border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 hover:scale-105"
                    title="Delete custom theme"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Configuration Display */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                Configuration Values
              </h4>
              <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 space-y-2">
                {Object.entries(currentTheme.colors).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-3 text-xs">
                    <div
                      className="w-5 h-5 rounded-md border-2 border-neutral-200 dark:border-neutral-600 flex-shrink-0"
                      style={{ backgroundColor: value }}
                    />
                    <span className="font-mono text-neutral-600 dark:text-neutral-400 min-w-0 flex-1">
                      <span className="font-semibold">{key}:</span> {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Theme Editor */
          <div className="space-y-6">
            <TooltipProvider>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
                  Theme Editor
                </h3>
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditing(false);
                          setEditingTheme(null);
                        }}
                        className="p-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Cancel</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetTheme}
                        className="border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Reset</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleSaveCustomTheme}
                        className="bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white border-0 p-2"
                      >
                        <Save className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Save Theme</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </TooltipProvider>
            <div className="space-y-4">
              <div>
                <Label
                  htmlFor="theme-name"
                  className="text-sm font-semibold text-neutral-700 dark:text-neutral-300"
                >
                  Theme Name
                </Label>
                <Input
                  id="theme-name"
                  value={editingTheme?.name || ""}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Enter theme name"
                  className="mt-2 bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                />
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  Color Configuration
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(editingTheme?.colors || {}).map(
                    ([key, value]) => (
                      <ColorPicker
                        key={key}
                        label={key.replace(/([A-Z])/g, " $1").trim()}
                        color={value}
                        onChange={(color) => handleColorChange(key, color)}
                        clearColor="#000000"
                        resetColor={
                          defaultColors[key as keyof typeof defaultColors]
                        }
                      />
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Column - Preview */}
      <div className="space-y-6">
        <div className="sticky top-0">
          {/* UI Component Preview */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Interface Preview
            </h4>
            <div
              className="p-6 rounded-xl border-2 space-y-4 shadow-lg"
              style={{
                backgroundColor: currentTheme.colors.background,
                color: currentTheme.colors.foreground,
                borderColor: currentTheme.colors.border,
              }}
            >
              <div className="text-xl font-bold">Sample Interface</div>
              <p className="text-sm opacity-75">
                This preview shows how your interface will look with the
                selected theme configuration.
              </p>
              <div className="flex gap-3 flex-wrap">
                <button
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm hover:shadow-md transition-all duration-200"
                  style={{
                    backgroundColor: currentTheme.colors.primary,
                  }}
                >
                  Primary Button
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm hover:shadow-md transition-all duration-200"
                  style={{
                    backgroundColor: currentTheme.colors.secondary,
                  }}
                >
                  Secondary
                </button>
                <div
                  className="px-4 py-2 rounded-lg text-sm shadow-sm"
                  style={{
                    backgroundColor: currentTheme.colors.accent,
                    color: currentTheme.colors.foreground,
                  }}
                >
                  Accent Element
                </div>
              </div>
              <div
                className="p-3 rounded-lg text-sm"
                style={{
                  backgroundColor: currentTheme.colors.muted,
                  color: currentTheme.colors.foreground,
                }}
              >
                Muted background section
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
