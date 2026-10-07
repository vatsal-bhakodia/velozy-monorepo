import type { ThemePreset } from "@velozy/theme-presets";

export type Theme = ThemePreset;

export interface ThemeSelectorProps {
  allThemes: Theme[];
  selectedThemeId: string;
  onThemeSelect: (themeId: string) => void;
  setCustomThemes: React.Dispatch<React.SetStateAction<Theme[]>>;
}
