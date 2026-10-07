// Server-side prompt vocabulary. UI font configuration remains owned by the builder app.
export function getFontClassesForPrompt() {
  return [
    "- font-sans: system sans-serif (general purpose)",
    "- font-serif: system serif (traditional and editorial)",
    "- font-mono: monospace (technical and brutalist)",
    "- font-montserrat: geometric sans-serif (modern headings)",
    "- font-grotesk: contemporary display sans-serif (bold headings)",
    "- font-open-sans: readable body sans-serif",
    "- font-poppins: friendly geometric sans-serif",
    "- font-playfair: elegant editorial serif",
    "- font-roboto: practical body sans-serif",
    "- font-raleway: refined display sans-serif",
    "- font-outfit: modern display sans-serif",
    "- font-dm-sans: modern geometric sans-serif",
  ].join("\n");
}
