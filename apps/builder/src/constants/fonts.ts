/**
 * Centralized font configuration for the website builder
 * All fonts are defined here for easy management and updates
 */

export type FontCategory =
  | "heading"
  | "body"
  | "serif"
  | "mono"
  | "display"
  | "system";

export interface FontConfig {
  /** Display name for the font */
  name: string;
  /** Tailwind CSS class (e.g., "font-montserrat") */
  tailwindClass: string;
  /** Google Fonts family name (for Google Fonts) or CSS font stack (for system fonts) */
  fontFamily: string;
  /** Font category */
  category: FontCategory;
  /** Whether this is a Google Font */
  isGoogleFont: boolean;
  /** Description of the font's characteristics */
  description: string;
  /** Best use cases */
  useCases: string[];
}

/**
 * All available fonts in the system
 */
export const FONTS: FontConfig[] = [
  // System fonts
  {
    name: "Sans (Default)",
    tailwindClass: "font-sans",
    fontFamily:
      "Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    category: "system",
    isGoogleFont: false,
    description: "System default sans-serif font stack",
    useCases: ["Default text", "Body text", "General purpose"],
  },
  {
    name: "Serif",
    tailwindClass: "font-serif",
    fontFamily: "Georgia, 'Times New Roman', Times, serif",
    category: "serif",
    isGoogleFont: false,
    description: "System default serif font stack",
    useCases: ["Traditional text", "Body text", "Formal content"],
  },
  {
    name: "Monospace",
    tailwindClass: "font-mono",
    fontFamily: "'Courier New', Courier, monospace",
    category: "mono",
    isGoogleFont: false,
    description: "System default monospace font stack",
    useCases: ["Code", "Technical content", "Terminal text"],
  },
  {
    name: "Helvetica",
    tailwindClass: "font-helvetica",
    fontFamily: "Helvetica, Arial, sans-serif",
    category: "system",
    isGoogleFont: false,
    description: "Classic, professional sans-serif",
    useCases: ["Corporate", "Professional", "Headings"],
  },

  // Google Fonts - Existing
  {
    name: "Montserrat",
    tailwindClass: "font-montserrat",
    fontFamily: "Montserrat, sans-serif",
    category: "heading",
    isGoogleFont: true,
    description: "Modern, geometric sans-serif",
    useCases: ["Headings", "Modern/Tech", "Corporate"],
  },
  {
    name: "Space Grotesk",
    tailwindClass: "font-grotesk",
    fontFamily: "var(--font-power-grotesk), sans-serif",
    category: "heading",
    isGoogleFont: false,
    description: "Bold, contemporary sans-serif",
    useCases: ["Headings", "Creative", "Modern"],
  },
  {
    name: "Open Sans",
    tailwindClass: "font-open-sans",
    fontFamily: '"Open Sans", sans-serif',
    category: "body",
    isGoogleFont: true,
    description: "Clean, readable sans-serif",
    useCases: ["Body text", "Modern/Tech", "Corporate"],
  },
  {
    name: "Poppins",
    tailwindClass: "font-poppins",
    fontFamily: "Poppins, sans-serif",
    category: "heading",
    isGoogleFont: true,
    description: "Modern, friendly sans-serif",
    useCases: ["Headings", "Body text", "Versatile"],
  },
  {
    name: "Playfair Display",
    tailwindClass: "font-playfair",
    fontFamily: '"Playfair Display", serif',
    category: "serif",
    isGoogleFont: true,
    description: "Elegant serif",
    useCases: ["Headings", "Luxury", "Elegant"],
  },
  {
    name: "Roboto",
    tailwindClass: "font-roboto",
    fontFamily: "Roboto, sans-serif",
    category: "body",
    isGoogleFont: true,
    description: "Clean, modern sans-serif",
    useCases: ["Body text", "Modern/Tech", "Corporate"],
  },
  {
    name: "Lato",
    tailwindClass: "font-lato",
    fontFamily: "Lato, sans-serif",
    category: "body",
    isGoogleFont: true,
    description: "Friendly, rounded sans-serif",
    useCases: ["Body text", "Creative", "Friendly"],
  },
  {
    name: "Raleway",
    tailwindClass: "font-raleway",
    fontFamily: "Raleway, sans-serif",
    category: "display",
    isGoogleFont: true,
    description: "Elegant, refined sans-serif",
    useCases: ["Headings", "Body text", "Elegant"],
  },

  // New Google Fonts - Modern & Professional
  {
    name: "Inter",
    tailwindClass: "font-inter",
    fontFamily: "Inter, sans-serif",
    category: "body",
    isGoogleFont: true,
    description: "Highly optimized for screens, excellent readability",
    useCases: ["Body text", "UI/UX", "Modern/Tech"],
  },
  {
    name: "Nunito",
    tailwindClass: "font-nunito",
    fontFamily: "Nunito, sans-serif",
    category: "body",
    isGoogleFont: true,
    description: "Friendly, rounded sans-serif",
    useCases: ["Body text", "Creative", "Friendly"],
  },
  {
    name: "Work Sans",
    tailwindClass: "font-work-sans",
    fontFamily: '"Work Sans", sans-serif',
    category: "body",
    isGoogleFont: true,
    description: "Clean, professional sans-serif",
    useCases: ["Body text", "Corporate", "Professional"],
  },
  {
    name: "Source Sans Pro",
    tailwindClass: "font-source-sans",
    fontFamily: '"Source Sans Pro", sans-serif',
    category: "body",
    isGoogleFont: true,
    description: "Adobe's clean, readable sans-serif",
    useCases: ["Body text", "Professional", "Corporate"],
  },
  {
    name: "DM Sans",
    tailwindClass: "font-dm-sans",
    fontFamily: '"DM Sans", sans-serif',
    category: "heading",
    isGoogleFont: true,
    description: "Modern, geometric sans-serif",
    useCases: ["Headings", "Modern/Tech", "Creative"],
  },
  {
    name: "Outfit",
    tailwindClass: "font-outfit",
    fontFamily: "Outfit, sans-serif",
    category: "display",
    isGoogleFont: true,
    description: "Modern, versatile sans-serif",
    useCases: ["Headings", "Body text", "Modern"],
  },
  {
    name: "Plus Jakarta Sans",
    tailwindClass: "font-jakarta",
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    category: "heading",
    isGoogleFont: true,
    description: "Contemporary, geometric sans-serif",
    useCases: ["Headings", "Modern/Tech", "Creative"],
  },
  {
    name: "Manrope",
    tailwindClass: "font-manrope",
    fontFamily: "Manrope, sans-serif",
    category: "body",
    isGoogleFont: true,
    description: "Geometric, clean sans-serif",
    useCases: ["Body text", "Modern/Tech", "UI/UX"],
  },
  {
    name: "Cabin",
    tailwindClass: "font-cabin",
    fontFamily: "Cabin, sans-serif",
    category: "body",
    isGoogleFont: true,
    description: "Friendly sans-serif with humanist qualities",
    useCases: ["Body text", "Creative", "Friendly"],
  },
  {
    name: "Quicksand",
    tailwindClass: "font-quicksand",
    fontFamily: "Quicksand, sans-serif",
    category: "display",
    isGoogleFont: true,
    description: "Rounded, modern sans-serif",
    useCases: ["Headings", "Creative", "Friendly"],
  },
  {
    name: "Ubuntu",
    tailwindClass: "font-ubuntu",
    fontFamily: "Ubuntu, sans-serif",
    category: "body",
    isGoogleFont: true,
    description: "Distinctive, friendly sans-serif",
    useCases: ["Body text", "Creative", "Tech"],
  },
  {
    name: "Fira Sans",
    tailwindClass: "font-fira",
    fontFamily: '"Fira Sans", sans-serif',
    category: "body",
    isGoogleFont: true,
    description: "Technical, readable sans-serif",
    useCases: ["Body text", "Technical", "UI/UX"],
  },
  {
    name: "IBM Plex Sans",
    tailwindClass: "font-ibm-plex",
    fontFamily: '"IBM Plex Sans", sans-serif',
    category: "body",
    isGoogleFont: true,
    description: "Professional, technical sans-serif",
    useCases: ["Body text", "Technical", "Corporate"],
  },

  // Serif fonts
  {
    name: "Merriweather",
    tailwindClass: "font-merriweather",
    fontFamily: "Merriweather, serif",
    category: "serif",
    isGoogleFont: true,
    description: "Highly readable serif",
    useCases: ["Body text", "Long-form content", "Traditional"],
  },
  {
    name: "Crimson Pro",
    tailwindClass: "font-crimson",
    fontFamily: '"Crimson Pro", serif',
    category: "serif",
    isGoogleFont: true,
    description: "Elegant serif with modern feel",
    useCases: ["Headings", "Body text", "Elegant"],
  },
];

/**
 * Get all Google Fonts from the fonts array
 */
export const getGoogleFonts = (): FontConfig[] => {
  return FONTS.filter((font) => font.isGoogleFont);
};

/**
 * Generate Google Fonts URL for stylesheet
 * Includes all Google Fonts with weights 400, 500, 600, 700, 800
 */
export const getGoogleFontsStylesheetUrl = (): string => {
  const googleFonts = getGoogleFonts();
  const fontFamilies = googleFonts
    .map((font) => {
      // Handle fonts with spaces in their names
      const fontName = font.fontFamily
        .replace(/['"]/g, "")
        .replace(/,.*$/, "")
        .trim();
      return `${fontName}:wght@400;500;600;700;800`;
    })
    .join("&family=");

  return `https://fonts.googleapis.com/css2?family=${fontFamilies}&display=swap`;
};

/**
 * Get Google Fonts preconnect URLs
 */
export const getGoogleFontsPreconnects = (): string[] => {
  return ["https://fonts.googleapis.com", "https://fonts.gstatic.com"];
};

/**
 * Generate Tailwind fontFamily configuration object
 */
export const getTailwindFontFamilyConfig = (): Record<string, string[]> => {
  const config: Record<string, string[]> = {};

  FONTS.forEach((font) => {
    // Extract the key from tailwindClass (e.g., "font-montserrat" -> "montserrat")
    const key = font.tailwindClass.replace("font-", "");

    // Handle special cases
    if (font.tailwindClass === "font-sans") {
      config.sans = font.fontFamily.split(",").map((f) => f.trim());
    } else if (font.tailwindClass === "font-serif") {
      config.serif = font.fontFamily.split(",").map((f) => f.trim());
    } else if (font.tailwindClass === "font-mono") {
      config.mono = font.fontFamily.split(",").map((f) => f.trim());
    } else {
      // For custom fonts, split by comma and clean up
      const fontStack = font.fontFamily.split(",").map((f) => {
        let trimmed = f.trim();
        // Remove existing quotes
        trimmed = trimmed.replace(/^["']|["']$/g, "");
        return trimmed;
      });
      config[key] = fontStack;
    }
  });

  return config;
};

/**
 * Get font options for UI dropdowns (value, label format)
 */
export const getFontOptions = (): Array<{ value: string; label: string }> => {
  return FONTS.map((font) => ({
    value: font.tailwindClass,
    label: font.name,
  }));
};

/**
 * Get fonts by category
 */
export const getFontsByCategory = (category: FontCategory): FontConfig[] => {
  return FONTS.filter((font) => font.category === category);
};

/**
 * Get heading fonts (suitable for headings)
 */
export const getHeadingFonts = (): FontConfig[] => {
  return FONTS.filter(
    (font) =>
      font.category === "heading" ||
      font.category === "display" ||
      font.category === "serif",
  );
};

/**
 * Get body fonts (suitable for body text)
 */
export const getBodyFonts = (): FontConfig[] => {
  return FONTS.filter(
    (font) =>
      font.category === "body" ||
      font.category === "system" ||
      font.tailwindClass === "font-poppins" ||
      font.tailwindClass === "font-raleway",
  );
};

/**
 * Legacy font family mapping for backward compatibility
 */
export const getLegacyFontFamilyMap = (): Record<string, string> => {
  const map: Record<string, string> = {};
  FONTS.forEach((font) => {
    if (font.isGoogleFont) {
      // Create legacy format: font-[Font_Name] -> font-fontname
      const fontName = font.fontFamily
        .replace(/['"]/g, "")
        .replace(/,.*$/, "")
        .trim()
        .replace(/\s+/g, "_");
      const legacyKey = `font-[${fontName}]`;
      map[legacyKey] = font.tailwindClass;
    }
  });
  return map;
};

/**
 * Get font description for prompt/UI
 */
export const getFontDescription = (tailwindClass: string): string => {
  const font = FONTS.find((f) => f.tailwindClass === tailwindClass);
  return font?.description || "";
};

/**
 * Get available font classes as a string for prompts
 */
export const getFontClassesForPrompt = (): string => {
  return FONTS.map((font) => {
    const description = font.description;
    const useCases = font.useCases.join(", ");
    return `- ${font.tailwindClass}: ${description} (${useCases})`;
  }).join("\n");
};
