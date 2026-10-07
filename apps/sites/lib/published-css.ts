import { unstable_cache } from "next/cache";
import postcss from "postcss";
import tailwindcss from "tailwindcss";

type Colors = Record<string, string>;

function palette(value: string) {
  const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const shade = (factor: number) =>
    `#${channels.map((channel) => Math.round(factor >= 0
      ? channel + (255 - channel) * factor
      : channel * (1 + factor)).toString(16).padStart(2, "0")).join("")}`;
  return {
    DEFAULT: hex,
    50: shade(.95), 100: shade(.9), 200: shade(.8),
    300: shade(.6), 400: shade(.4), 500: hex,
    600: shade(-.1), 700: shade(-.2), 800: shade(-.3), 900: shade(-.4),
  };
}

const color = (value: unknown, fallback: string) =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

const compile = unstable_cache(async (pageJson: string, themeJson: string) => {
  const theme = JSON.parse(themeJson);
  const colors: Colors = theme?.colors || {};
  const foreground = color(colors.foreground, "#111827");
  const css = await postcss([tailwindcss({
    content: [{ raw: pageJson, extension: "html" }, {
      raw: 'grid gap-6 md:grid-cols-2 xl:grid-cols-3 overflow-hidden rounded-3xl border border-border bg-white/70 shadow-sm h-56 w-full object-cover space-y-3 p-6 font-heading text-2xl font-semibold text-foreground text-sm leading-6 text-muted-foreground',
      extension: "html",
    }],
    theme: { extend: {
      fontFamily: { heading: ["var(--font-heading)"], body: ["var(--font-body)"] },
      colors: {
        primary: palette(color(colors.primary, "#000000")),
        secondary: palette(color(colors.secondary, "#000000")),
        background: color(colors.background, "#ffffff"),
        foreground,
        accent: { DEFAULT: color(colors.accent, "#f3f4f6"), foreground },
        muted: { DEFAULT: color(colors.muted, "#f3f4f6"), foreground },
        border: color(colors.border, "#e5e7eb"),
        ring: color(colors.ring, "#000000"),
      },
    } },
  })]).process("@tailwind base; @tailwind components; @tailwind utilities;", { from: undefined });
  return `${css.css}\nmain { --font-heading: sans-serif; --font-body: sans-serif; background: ${color(colors.background, "#ffffff")}; color: ${foreground}; min-height: 100vh; font-family: var(--font-body); }`;
}, ["published-page-css"]);

export function publishedPageCss(pageData: unknown, theme: unknown) {
  return compile(JSON.stringify(pageData || {}), JSON.stringify(theme || {}));
}
