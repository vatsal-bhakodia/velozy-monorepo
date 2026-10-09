import { Vibrant } from "node-vibrant/browser";

type PaletteTheme = {
  id: string;
  name: string;
  colors: Record<string, string>;
  headingFont?: string;
  bodyFont?: string;
  isCustom: true;
};

const hex = (rgb?: number[]) =>
  rgb
    ? `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`
    : "";

export async function themeFromLogo(
  dataUrl: string,
): Promise<PaletteTheme | null> {
  try {
    const palette = await Vibrant.from(dataUrl).getPalette();
    const primary = hex(palette.Vibrant?.rgb) || hex(palette.DarkVibrant?.rgb);
    const secondary =
      hex(palette.DarkVibrant?.rgb) || hex(palette.Muted?.rgb) || primary;
    const accent =
      hex(palette.LightVibrant?.rgb) || hex(palette.LightMuted?.rgb) || primary;
    const muted =
      hex(palette.Muted?.rgb) || hex(palette.LightMuted?.rgb) || "#F1F5F9";
    if (!primary) return null;

    return {
      id: "logo-palette",
      name: "Logo Palette",
      colors: {
        primary,
        secondary,
        background: "#FFFFFF",
        foreground: "#111827",
        accent,
        muted,
        border: muted,
        ring: primary,
      },
      isCustom: true,
    };
  } catch (error) {
    console.error("Could not extract logo palette:", error);
    return null;
  }
}
