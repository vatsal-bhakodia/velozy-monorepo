import type { BentoTheme } from "./capabilities-bento";
import type { HeroPreviewTheme } from "./hero-previews";

export type IndustryPalette = {
  accent: string;
  pale: string;
  surface: string;
  ink: string;
};

export function industryTheme(palette: IndustryPalette): BentoTheme {
  const mix = (first: string, amount: number, second: string) =>
    `color-mix(in srgb, ${first} ${amount}%, ${second})`;

  return {
    canvas: mix(palette.surface, 35, "#000000"),
    card: palette.surface,
    border: mix(palette.pale, 18, "transparent"),
    text: "#ffffff",
    muted: "#b8bdb8",
    accent: palette.accent,
    accentText: palette.pale,
    darkSurface: mix(palette.surface, 80, "#000000"),
    lightSurface: mix(palette.pale, 72, "#ffffff"),
    lightText: palette.ink,
    lightMuted: mix(palette.ink, 72, palette.pale),
    lightBorder: mix(palette.ink, 18, "transparent"),
    map: mix(palette.pale, 82, palette.accent),
    mapRoad: mix(palette.pale, 35, "#ffffff"),
    mapPark: mix(palette.pale, 60, palette.accent),
  };
}

export function heroPreviewTheme(palette: IndustryPalette): HeroPreviewTheme {
  return {
    accent: palette.accent,
    text: palette.ink,
    muted: palette.ink,
    border: `color-mix(in srgb, ${palette.ink} 18%, transparent)`,
    softSurface: `color-mix(in srgb, ${palette.pale} 72%, #ffffff)`,
  };
}
