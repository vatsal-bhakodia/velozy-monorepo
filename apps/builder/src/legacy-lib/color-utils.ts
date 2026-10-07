export function hexToRgb(
  hex: string,
): { r: number; g: number; b: number } | null {
  // Handle both #RRGGBB and RRGGBB formats
  const cleanHex = hex.replace("#", "");

  // Validate hex format
  if (!/^[a-f\d]{6}$/i.test(cleanHex)) {
    return null;
  }

  return {
    r: parseInt(cleanHex.substring(0, 2), 16),
    g: parseInt(cleanHex.substring(2, 4), 16),
    b: parseInt(cleanHex.substring(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  // Clamp values to valid range
  const clamp = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)));

  const toHex = (value: number) => clamp(value).toString(16).padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function lightenColor(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  // Clamp factor between 0 and 1
  const clampedFactor = Math.max(0, Math.min(1, factor));

  const r = rgb.r + (255 - rgb.r) * clampedFactor;
  const g = rgb.g + (255 - rgb.g) * clampedFactor;
  const b = rgb.b + (255 - rgb.b) * clampedFactor;

  return rgbToHex(r, g, b);
}

export function darkenColor(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  // Clamp factor between 0 and 1
  const clampedFactor = Math.max(0, Math.min(1, factor));

  const r = rgb.r * (1 - clampedFactor);
  const g = rgb.g * (1 - clampedFactor);
  const b = rgb.b * (1 - clampedFactor);

  return rgbToHex(r, g, b);
}

export function generateColorPalette(
  baseColor: string,
): Record<string, string> {
  return {
    50: lightenColor(baseColor, 0.95),
    100: lightenColor(baseColor, 0.9),
    200: lightenColor(baseColor, 0.8),
    300: lightenColor(baseColor, 0.6),
    400: lightenColor(baseColor, 0.4),
    500: baseColor,
    600: darkenColor(baseColor, 0.1),
    700: darkenColor(baseColor, 0.2),
    800: darkenColor(baseColor, 0.3),
    900: darkenColor(baseColor, 0.4),
  };
}

export function generateColorPaletteStr(baseColor: string): string {
  return `DEFAULT: '${baseColor}',
    50: '${lightenColor(baseColor, 0.95)}',
    100: '${lightenColor(baseColor, 0.9)}',
    200: '${lightenColor(baseColor, 0.8)}',
    300: '${lightenColor(baseColor, 0.6)}',
    400: '${lightenColor(baseColor, 0.4)}',
    500: '${baseColor}',
    600: '${darkenColor(baseColor, 0.1)}',
    700: '${darkenColor(baseColor, 0.2)}',
    800: '${darkenColor(baseColor, 0.3)}',
    900: '${darkenColor(baseColor, 0.4)}'`;
}
