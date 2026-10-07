import type { ReactNode, IframeHTMLAttributes } from "react";
import { useState, useCallback, useLayoutEffect, useEffect } from "react";
import { generateColorPaletteStr } from "@/lib/color-utils";
import { createPortal } from "react-dom";
import {
  getGoogleFontsPreconnects,
  getGoogleFontsStylesheetUrl,
  FONTS,
} from "@/constants/fonts";
import { Theme } from "@/components/common/theme-manager/types";

const GOOGLE_FONT_PRECONNECTS = getGoogleFontsPreconnects();
const GOOGLE_FONT_STYLESHEETS = [getGoogleFontsStylesheetUrl()];

declare global {
  interface Window {
    tailwind?: any;
    __twMoPaused?: boolean;
    __moWrapped?: boolean;
  }
}

// ── Tailwind observer control ─────────────────────────────────────────────────
function getIframeWindow(): any {
  const iframe = document.getElementById("canvas") as HTMLIFrameElement | null;
  return iframe?.contentWindow;
}

/** Pause Tailwind's MutationObserver (mutations silently discarded) */
export function pauseTailwindObserver() {
  const win = getIframeWindow();
  if (win) win.__twMoPaused = true;
}

/** Resume Tailwind's MutationObserver (future mutations processed) */
export function resumeTailwindObserver() {
  const win = getIframeWindow();
  if (win) win.__twMoPaused = false;
}

/** Trigger a single Tailwind refresh */
export function refreshTailwind() {
  const win = getIframeWindow();
  if (!win) return;
  try {
    if (win.tailwind && typeof win.tailwind.refresh === "function") {
      win.tailwind.refresh();
    }
  } catch (e) {
    console.warn("Could not refresh Tailwind:", e);
  }
}

/**
 * Pre-generate Tailwind CSS by injecting a hidden element with all needed classes.
 * Tailwind's MO must be ACTIVE when this is called so it picks up the classes.
 * Returns a promise that resolves after Tailwind has had time to process.
 */
export function primeTailwindWithClasses(classNames: string[]): Promise<void> {
  return new Promise((resolve) => {
    const iframe = document.getElementById(
      "canvas",
    ) as HTMLIFrameElement | null;
    const iframeDoc = iframe?.contentDocument;
    if (!iframeDoc || classNames.length === 0) {
      resolve();
      return;
    }

    iframeDoc.getElementById("__tw_primer__")?.remove();

    const primer = iframeDoc.createElement("div");
    primer.id = "__tw_primer__";
    primer.style.cssText =
      "position:fixed;width:0;height:0;overflow:hidden;pointer-events:none;opacity:0;z-index:-9999";
    primer.className = classNames.join(" ");
    iframeDoc.body.appendChild(primer);

    // Give Tailwind's MO time to observe this single element and generate CSS
    setTimeout(resolve, 500);
  });
}

// ── Canvas Component ──────────────────────────────────────────────────────────
interface CanvasProps extends IframeHTMLAttributes<HTMLIFrameElement> {
  children: ReactNode;
  title: string;
  theme?: Theme;
  contentReady?: boolean;
}

export const Canvas = ({
  children,
  title,
  theme,
  contentReady = false,
  ...props
}: CanvasProps) => {
  const themeColors = theme?.colors;
  const [contentRef, setContentRef] = useState<HTMLIFrameElement | null>(null);
  const [tailwindLoaded, setTailwindLoaded] = useState(false);
  const mountNode = contentRef?.contentWindow?.document?.body;
  const iframeDoc = contentRef?.contentWindow?.document;

  // Initial setup — runs once when iframe doc is available
  useLayoutEffect(() => {
    if (!iframeDoc) return;
    const iframeWin = contentRef?.contentWindow as any;

    iframeDoc.head.innerHTML = "";

    // ── Wrap MutationObserver BEFORE Tailwind loads ────────────────────
    // This lets us pause/resume Tailwind's internal observer at will.
    if (iframeWin && !iframeWin.__moWrapped) {
      const RealMO = iframeWin.MutationObserver;
      iframeWin.__twMoPaused = false;
      iframeWin.__moWrapped = true;

      iframeWin.MutationObserver = class ControlledMO {
        _real: MutationObserver;
        constructor(cb: MutationCallback) {
          this._real = new RealMO(
            (mutations: MutationRecord[], observer: MutationObserver) => {
              if (!iframeWin.__twMoPaused) {
                cb(mutations, observer);
              }
            },
          );
        }
        observe(target: Node, options?: MutationObserverInit) {
          this._real.observe(target, options);
        }
        disconnect() {
          this._real.disconnect();
        }
        takeRecords(): MutationRecord[] {
          return this._real.takeRecords();
        }
      };
    }

    // Clone styles, meta, stylesheets from parent
    document.head.querySelectorAll("style").forEach((s) => {
      iframeDoc.head.appendChild(s.cloneNode(true));
    });
    document.head.querySelectorAll("meta").forEach((m) => {
      iframeDoc.head.appendChild(m.cloneNode(true));
    });
    document.head.querySelectorAll('link[rel="stylesheet"]').forEach((l) => {
      iframeDoc.head.appendChild(l.cloneNode(true));
    });

    GOOGLE_FONT_PRECONNECTS.forEach((href) => {
      const link = document.createElement("link");
      link.rel = "preconnect";
      link.href = href;
      if (href.includes("gstatic")) link.crossOrigin = "anonymous";
      iframeDoc.head.appendChild(link);
    });

    GOOGLE_FONT_STYLESHEETS.forEach((href) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      iframeDoc.head.appendChild(link);
    });

    const customStyles = document.createElement("style");
    customStyles.textContent = `
            *:focus, *:focus-visible, *:active, *[tabindex]:focus {
                outline: none !important; box-shadow: none !important;
            }
            button:focus, input:focus, textarea:focus, select:focus,
            a:focus, [role="button"]:focus, [role="link"]:focus,
            [role="tab"]:focus, [role="menuitem"]:focus {
                outline: none !important; box-shadow: none !important;
            }
        `;
    iframeDoc.head.appendChild(customStyles);

    // Tailwind CDN — uses our wrapped MO
    const tailwindScript = document.createElement("script");
    tailwindScript.src = "https://cdn.tailwindcss.com";
    tailwindScript.onload = () => setTailwindLoaded(true);
    iframeDoc.head.appendChild(tailwindScript);

    iframeDoc.body.classList.add("overflow-x-hidden", "overflow-y-auto");
    if (themeColors) {
      iframeDoc.body.style.backgroundColor = themeColors.background;
      iframeDoc.body.style.color = themeColors.foreground;
      iframeDoc.documentElement.style.setProperty(
        "--site-primary",
        themeColors.primary,
      );
      iframeDoc.documentElement.style.setProperty(
        "--site-secondary",
        themeColors.secondary,
      );
      iframeDoc.documentElement.style.setProperty(
        "--site-background",
        themeColors.background,
      );
      iframeDoc.documentElement.style.setProperty(
        "--site-foreground",
        themeColors.foreground,
      );
      iframeDoc.documentElement.style.setProperty(
        "--site-border",
        themeColors.border,
      );
      iframeDoc.documentElement.style.setProperty(
        "--site-muted",
        themeColors.muted,
      );
    }
  }, [iframeDoc]);

  // Configure Tailwind with theme
  const configureTailwind = useCallback(() => {
    if (
      theme &&
      themeColors &&
      (contentRef?.contentWindow as Window & { tailwind?: any })?.tailwind
    ) {
      const existing = iframeDoc?.head.querySelector(
        "script[data-tailwind-config]",
      );
      if (existing) existing.remove();

      const configScript = document.createElement("script");
      configScript.setAttribute("data-tailwind-config", "true");
      configScript.innerHTML = `
        tailwind.config = {
          theme: {
            extend: {
              fontFamily: {
                heading: ['var(--font-heading)'],
                body: ['var(--font-body)'],
              },
              colors: {
                primary: {
                ${generateColorPaletteStr(themeColors.primary)},
                },
                secondary: {
                  ${generateColorPaletteStr(themeColors.secondary)},
                },
                background: '${themeColors.background}',
                foreground: '${themeColors.foreground}',
                accent: {
                  DEFAULT: '${themeColors.accent}',
                  foreground: '${themeColors.foreground}',
                },
                muted: {
                  DEFAULT: '${themeColors.muted}',
                  foreground: '${themeColors.foreground}',
                },
                border: '${themeColors.border}',
                ring: '${themeColors.ring}',
              }
            }
          }
        }
      `;
      iframeDoc?.head.appendChild(configScript);
    }
  }, [theme, contentRef, iframeDoc, themeColors]);

  // Configure on initial Tailwind load
  useEffect(() => {
    if (tailwindLoaded) configureTailwind();
  }, [tailwindLoaded, configureTailwind]);

  // Update theme when user changes it (only after content is ready)
  useEffect(() => {
    if (!contentReady || !tailwindLoaded || !theme) return;

    configureTailwind();

    const headingFontClass = theme.headingFont || "font-sans";
    const bodyFontClass = theme.bodyFont || "font-sans";
    const headingFF =
      FONTS.find((f: any) => f.tailwindClass === headingFontClass)
        ?.fontFamily || "sans-serif";
    const bodyFF =
      FONTS.find((f: any) => f.tailwindClass === bodyFontClass)?.fontFamily ||
      "sans-serif";

    let fontStyleEl = iframeDoc?.head.querySelector("#theme-font-styles");
    if (!fontStyleEl && iframeDoc) {
      fontStyleEl = document.createElement("style");
      fontStyleEl.id = "theme-font-styles";
      iframeDoc.head.appendChild(fontStyleEl);
    }
    if (fontStyleEl) {
      fontStyleEl.textContent = `
                :root { --font-heading: ${headingFF}; --font-body: ${bodyFF}; }
                body { font-family: var(--font-body); }
            `;
    }
    if (iframeDoc?.body) {
      iframeDoc.body.style.backgroundColor = themeColors?.background || "";
      iframeDoc.body.style.color = themeColors?.foreground || "";
    }
    if (iframeDoc?.documentElement && themeColors) {
      iframeDoc.documentElement.style.setProperty(
        "--site-primary",
        themeColors.primary,
      );
      iframeDoc.documentElement.style.setProperty(
        "--site-secondary",
        themeColors.secondary,
      );
      iframeDoc.documentElement.style.setProperty(
        "--site-background",
        themeColors.background,
      );
      iframeDoc.documentElement.style.setProperty(
        "--site-foreground",
        themeColors.foreground,
      );
      iframeDoc.documentElement.style.setProperty(
        "--site-border",
        themeColors.border,
      );
      iframeDoc.documentElement.style.setProperty(
        "--site-muted",
        themeColors.muted,
      );
    }

    // Single refresh for user-initiated theme change (body is already loaded, this is fine)
    refreshTailwind();
  }, [
    theme,
    tailwindLoaded,
    configureTailwind,
    iframeDoc,
    themeColors,
    contentReady,
  ]);

  const mountRef = useCallback((node: HTMLIFrameElement | null) => {
    setContentRef(node);
  }, []);

  return (
    <iframe title={title} id="canvas" {...props} ref={mountRef}>
      {mountNode && createPortal(children, mountNode)}
    </iframe>
  );
};
