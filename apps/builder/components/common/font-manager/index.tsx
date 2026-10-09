import React, { useMemo } from "react";
import { Type } from "lucide-react";
import { Label } from "@/components/ui/label";
import { ThemeSelectorProps } from "@/components/common/theme-manager/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getHeadingFonts, getBodyFonts } from "@/constants/fonts";

export function FontManager({
  allThemes,
  selectedThemeId,
  onThemeSelect,
  setCustomThemes,
}: ThemeSelectorProps) {
  const selectedTheme = useMemo(
    () => allThemes.find((t) => t.id === selectedThemeId) || allThemes[0],
    [selectedThemeId, allThemes],
  );

  const headingFonts = useMemo(() => getHeadingFonts(), []);
  const bodyFonts = useMemo(() => getBodyFonts(), []);

  const handleFontChange = (
    type: "headingFont" | "bodyFont",
    fontClass: string,
  ) => {
    const themeToEdit = { ...selectedTheme };
    themeToEdit[type] = fontClass;

    const isNewTheme = !themeToEdit.isCustom;

    if (isNewTheme) {
      const customVersion = {
        ...themeToEdit,
        id: `custom-${themeToEdit.id}-${Date.now()}`,
        name: `${themeToEdit.name} (Custom)`,
        isCustom: true,
      };
      setCustomThemes((prev) => {
        const withoutCustom = prev.filter((t) => !t.isCustom);
        return [...withoutCustom, customVersion];
      });
      onThemeSelect(customVersion.id);
    } else {
      setCustomThemes((prev) =>
        prev.map((t) => (t.id === themeToEdit.id ? themeToEdit : t)),
      );
    }
  };

  return (
    <div className="space-y-6 mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-700">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
          <Type className="h-5 w-5 text-blue-600 dark:text-cyan-400" />
          Typography Settings
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Choose the typography mapping for your website. Headings and body will
          use these selected font families.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Heading Font
          </Label>
          <Select
            value={selectedTheme.headingFont || "font-sans"}
            onValueChange={(val) => handleFontChange("headingFont", val)}
          >
            <SelectTrigger className="w-full bg-neutral-50 dark:bg-neutral-800/50">
              <SelectValue placeholder="Select Heading Font" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {headingFonts.map((font) => (
                <SelectItem key={font.tailwindClass} value={font.tailwindClass}>
                  {font.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Body Font
          </Label>
          <Select
            value={selectedTheme.bodyFont || "font-sans"}
            onValueChange={(val) => handleFontChange("bodyFont", val)}
          >
            <SelectTrigger className="w-full bg-neutral-50 dark:bg-neutral-800/50">
              <SelectValue placeholder="Select Body Font" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {bodyFonts.map((font) => (
                <SelectItem key={font.tailwindClass} value={font.tailwindClass}>
                  {font.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
