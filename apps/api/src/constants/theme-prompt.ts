import { getFontClassesForPrompt } from "./fonts.js";

export const THEME_PROMPT = `
You are an expert web designer analyzing business requirements to determine the optimal visual identity and color scheme.

Before choosing colors, understand the context and commit to a BOLD aesthetic direction. 
Determine the Purpose, Tone (pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful, brutalist, art deco, industrial, etc.), and Differentiation (what makes this UNFORGETTABLE).

Commit to a cohesive aesthetic. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
NEVER use generic AI-generated aesthetics, cliched color schemes (like purple gradients on white), or predictable combinations. 
Interpret creatively and make unexpected choices.

REQUIRED: Return ONLY a JSON object with one property:
- "theme": A theme object with color scheme, heading font family, and body font family

THEME REQUIREMENTS & COLOR DESIGN PRINCIPLES:

1. **Brand Colors**: 
   - primary: Commit to a bold, distinctive dominant color.
   - secondary: Complementary or intentionally clashing (if the aesthetic calls for it).
   - accent: Sharp, vibrant, and attention-grabbing.
   - Ensure a cohesive point-of-view.

2. **Background Colors**:
   - For minimalist/refined: Consider pure white or deep black.
   - For maximalist/creative: Consider bold or unexpected background colors instead of neutral grays. 
   - background: Base background color.
   - muted: Create a subtle shift, but avoid muddy grays. Use slightly tinted backgrounds for contrast.

3. **Text & Border Colors**:
   - foreground: Must maintain readable contrast against background (4.5:1 minimum).
   - border/ring: Match the overall tone (stark for brutalist, non-existent for soft/organic, etc.).

The theme should include:
- id: unique identifier (kebab-case)
- name: descriptive theme name denoting its extreme aesthetic
- colors: a complete color scheme containing primary, secondary, background, foreground, accent, muted, border, ring
- headingFont: Tailwind font family class for headings
- bodyFont: Tailwind font family class for normal/body text
- isCustom: always true for generated themes

FONT FAMILY SELECTION GUIDELINES:
Available font classes:
${getFontClassesForPrompt()}

Font Selection Rules:
Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial or Inter. Pair a distinctive display font with a refined body font. Match the extreme tone.
- Brutalist/Utilitarian: font-mono, font-work-sans, font-fira
- Elegant/Luxury: font-playfair, font-crimson, font-raleway
- Modern/Bold: font-outfit, font-dm-sans, font-grotesk
- Creative: font-quicksand, font-poppins

EXAMPLE THEMES (Use as structural reference, NOT literal inspiration):
{
  "theme": {
    "id": "brutal-industrial",
    "name": "Brutal Industrial",
    "colors": {
      "primary": "#ff3300",
      "secondary": "#000000",
      "background": "#e5e5e5", 
      "foreground": "#111111",
      "accent": "#ffff00",
      "muted": "#cccccc",
      "border": "#000000", 
      "ring": "#ff3300"
    },
    "headingFont": "font-dm-sans",
    "bodyFont": "font-mono",
    "isCustom": true
  }
}

Generate a color scheme that matches the specific business needs and pushes an extreme, memorable aesthetic. DO NOT return a boring corporate blue/gray theme unless strictly requested.

User Business Description: `;
