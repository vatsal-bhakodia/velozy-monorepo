import { useState, useEffect, useMemo } from "react";
import { Theme } from "./types";

interface UseThemeManagerOptions {
  themes: Theme[];
  /** Initial theme loaded from DB (designPreference.theme) */
  initialTheme?: Theme | null;
}

export function useThemeManager({
  themes,
  initialTheme,
}: UseThemeManagerOptions) {
  // Custom themes: seed from initialTheme if it's custom, else empty
  const [customThemes, setCustomThemes] = useState<Theme[]>(() => {
    if (initialTheme?.isCustom) {
      return [initialTheme];
    }
    // Fallback: check localStorage for legacy data during generation flow
    if (typeof window !== "undefined") {
      try {
        const storedThemeConfig = localStorage.getItem("selectedThemeConfig");
        if (storedThemeConfig) {
          const parsedTheme = JSON.parse(storedThemeConfig);
          if (parsedTheme?.isCustom) {
            return [parsedTheme];
          }
        }
      } catch (error) {
        console.error("Failed to parse theme config from localStorage:", error);
      }
    }
    return [];
  });

  // Combine default + custom themes
  const allThemes = useMemo(() => {
    const customThemeIds = new Set(customThemes.map((theme) => theme.id));
    const defaultThemes = themes
      .filter((theme) => !customThemeIds.has(theme.id))
      .map((t) => ({ ...t, isCustom: false }));
    return [...defaultThemes, ...customThemes];
  }, [themes, customThemes]);

  // Selected theme id
  const [selectedThemeId, setSelectedThemeId] = useState(() => {
    // Priority 1: initialTheme from DB
    if (initialTheme?.id) {
      return initialTheme.id;
    }

    // Priority 2: localStorage (fallback for generation flow)
    if (typeof window !== "undefined") {
      try {
        const storedThemeConfig = localStorage.getItem("selectedThemeConfig");
        if (storedThemeConfig) {
          const parsedTheme = JSON.parse(storedThemeConfig);
          if (parsedTheme?.id) {
            return parsedTheme.id;
          }
        }
      } catch (error) {
        console.error("Failed to parse theme config from localStorage:", error);
      }
    }

    return themes.find((theme) => theme.id === "light")?.id ?? themes[0]?.id;
  });

  // When initialTheme changes (e.g. loaded from DB after mount), update state
  useEffect(() => {
    if (initialTheme?.id) {
      setSelectedThemeId(initialTheme.id);
      if (initialTheme.isCustom) {
        setCustomThemes((prev) => {
          // Replace any existing custom themes with the DB one
          const withoutOld = prev.filter((t) => t.id !== initialTheme.id);
          return [...withoutOld, initialTheme];
        });
      }
    }
  }, [initialTheme?.id]);

  // Persist selection in localStorage (for legacy/generation compatibility)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const selectedTheme = allThemes.find(
        (theme) => theme.id === selectedThemeId,
      );
      if (selectedTheme) {
        localStorage.setItem(
          "selectedThemeConfig",
          JSON.stringify(selectedTheme),
        );
      }
    }
  }, [selectedThemeId, allThemes]);

  // Helpers
  const currentTheme = allThemes.find((theme) => theme.id === selectedThemeId);
  const themeColors = currentTheme?.colors;

  const handleThemeChange = (theme: Theme) => {
    setSelectedThemeId(theme.id);

    if (theme.isCustom && !customThemes.some((t) => t.id === theme.id)) {
      setCustomThemes((prev) => [...prev, theme]);
    }
  };

  return {
    allThemes,
    customThemes,
    selectedThemeId,
    currentTheme,
    themeColors,
    setSelectedThemeId,
    handleThemeChange,
    setCustomThemes,
  };
}
