import React from "react";
import { Eye, Palette } from "lucide-react";
import themes from "@/src/onboard/constants/themes";
import { ThemePaletteEditor } from "./theme-palette-editor";

interface SitePreviewProps {
  selectedTheme: string;
  selectedStyle: string;
  customThemes?: any[];
  isThemeConfirmed?: boolean;
  activeTheme?: any;
  onThemeChange?: (theme: any) => void;
}

export const SitePreview = ({
  selectedTheme,
  selectedStyle,
  customThemes = [],
  isThemeConfirmed = false,
  activeTheme,
  onThemeChange,
}: SitePreviewProps) => {
  // Combine default themes with custom themes
  const allThemes = [...themes, ...customThemes];

  const selectedThemeObj =
    activeTheme || allThemes.find((t) => t.id === selectedTheme) || themes[0];

  // Style-specific class configurations
  const getStyleClasses = (style: string) => {
    switch (style) {
      case "classic":
        return {
          container: "rounded-lg",
          header: "rounded-lg",
          hero: "rounded-lg",
          content: "rounded-lg",
          footer: "rounded-lg",
          shadow: "shadow-md",
        };
      case "modern":
        return {
          container: "rounded-none",
          header: "rounded-none",
          hero: "rounded-none",
          content: "rounded-none",
          footer: "rounded-none",
          shadow: "shadow-xl",
        };
      case "flat":
        return {
          container: "rounded-sm",
          header: "rounded-sm",
          hero: "rounded-sm",
          content: "rounded-sm",
          footer: "rounded-sm",
          shadow: `shadow-none border`,
        };
      case "soft":
        return {
          container: "rounded-3xl",
          header: "rounded-2xl",
          hero: "rounded-2xl",
          content: "rounded-2xl",
          footer: "rounded-2xl",
          shadow: "shadow-lg",
        };
      default:
        return {
          container: "rounded-lg",
          header: "rounded-lg",
          hero: "rounded-lg",
          content: "rounded-lg",
          footer: "rounded-lg",
          shadow: "shadow-md",
        };
    }
  };

  const styleClasses = getStyleClasses(selectedStyle);

  // Generate skeleton content based on style
  const renderSkeleton = () => {
    switch (selectedStyle) {
      case "modern":
        return (
          <div className="flex h-full flex-col gap-4">
            {/* Header */}
            <div
              className="h-10 rounded-lg"
              style={{ backgroundColor: selectedThemeObj.colors.primary }}
            >
              <div className="flex items-center justify-between h-full px-4">
                <div
                  className="w-24 h-4 rounded"
                  style={{
                    backgroundColor: selectedThemeObj.colors.background,
                    opacity: 0.3,
                  }}
                ></div>
                <div className="flex space-x-2">
                  <div
                    className="w-16 h-4 rounded"
                    style={{
                      backgroundColor: selectedThemeObj.colors.background,
                      opacity: 0.3,
                    }}
                  ></div>
                  <div
                    className="w-16 h-4 rounded"
                    style={{
                      backgroundColor: selectedThemeObj.colors.background,
                      opacity: 0.3,
                    }}
                  ></div>
                  <div
                    className="w-16 h-4 rounded"
                    style={{
                      backgroundColor: selectedThemeObj.colors.background,
                      opacity: 0.3,
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Hero Section */}
            <div
              className="flex min-h-28 flex-[1.2] items-center justify-center rounded-lg"
              style={{ backgroundColor: selectedThemeObj.colors.primary }}
            >
              <div className="text-center">
                <div
                  className="w-48 h-6 rounded mb-2 mx-auto"
                  style={{
                    backgroundColor: selectedThemeObj.colors.foreground,
                    opacity: 0.3,
                  }}
                ></div>
                <div
                  className="w-32 h-4 rounded mx-auto"
                  style={{
                    backgroundColor: selectedThemeObj.colors.foreground,
                    opacity: 0.3,
                  }}
                ></div>
              </div>
            </div>

            {/* Content Grid */}
            <div className="grid min-h-24 flex-1 grid-cols-2 gap-4">
              <div
                className="h-full rounded-lg"
                style={{ backgroundColor: selectedThemeObj.colors.muted }}
              ></div>
              <div
                className="h-full rounded-lg"
                style={{ backgroundColor: selectedThemeObj.colors.muted }}
              ></div>
            </div>

            {/* Footer */}
            <div
              className="h-12 rounded-lg"
              style={{ backgroundColor: selectedThemeObj.colors.secondary }}
            ></div>
          </div>
        );

      case "classic":
        return (
          <div className="flex h-full flex-col gap-4">
            {/* Traditional Header with Navigation */}
            <div
              className={`h-10 ${styleClasses.header} ${styleClasses.shadow}`}
              style={{ backgroundColor: selectedThemeObj.colors.primary }}
            >
              <div className="flex items-center justify-between h-full px-4">
                <div
                  className="w-24 h-4 rounded-sm"
                  style={{
                    backgroundColor: selectedThemeObj.colors.background,
                    opacity: 0.3,
                  }}
                ></div>
                <div className="flex space-x-4">
                  <div
                    className="w-16 h-4 rounded-sm"
                    style={{
                      backgroundColor: selectedThemeObj.colors.background,
                      opacity: 0.3,
                    }}
                  ></div>
                  <div
                    className="w-16 h-4 rounded-sm"
                    style={{
                      backgroundColor: selectedThemeObj.colors.background,
                      opacity: 0.3,
                    }}
                  ></div>
                  <div
                    className="w-16 h-4 rounded-sm"
                    style={{
                      backgroundColor: selectedThemeObj.colors.background,
                      opacity: 0.3,
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Hero Section */}
            <div
              className={`min-h-28 flex-[1.2] ${styleClasses.hero} ${styleClasses.shadow} flex items-center justify-center`}
              style={{ backgroundColor: selectedThemeObj.colors.primary }}
            >
              <div className="text-center">
                <div
                  className="w-48 h-6 rounded-sm mb-2 mx-auto"
                  style={{
                    backgroundColor: selectedThemeObj.colors.foreground,
                    opacity: 0.3,
                  }}
                ></div>
                <div
                  className="w-32 h-4 rounded-sm mx-auto"
                  style={{
                    backgroundColor: selectedThemeObj.colors.foreground,
                    opacity: 0.3,
                  }}
                ></div>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid min-h-24 flex-1 grid-cols-2 gap-4">
              <div
                className={`h-full ${styleClasses.content} ${styleClasses.shadow} flex items-center justify-center`}
                style={{ backgroundColor: selectedThemeObj.colors.muted }}
              >
                <div
                  className="w-20 h-4 rounded-sm"
                  style={{
                    backgroundColor: selectedThemeObj.colors.foreground,
                    opacity: 0.4,
                  }}
                ></div>
              </div>
              <div
                className={`h-full ${styleClasses.content} ${styleClasses.shadow} flex items-center justify-center`}
                style={{ backgroundColor: selectedThemeObj.colors.muted }}
              >
                <div
                  className="w-20 h-4 rounded-sm"
                  style={{
                    backgroundColor: selectedThemeObj.colors.foreground,
                    opacity: 0.4,
                  }}
                ></div>
              </div>
            </div>

            {/* Footer */}
            <div
              className={`h-12 ${styleClasses.footer} ${styleClasses.shadow} flex items-center justify-center`}
              style={{ backgroundColor: selectedThemeObj.colors.secondary }}
            >
              <div
                className="w-32 h-4 rounded-sm"
                style={{
                  backgroundColor: selectedThemeObj.colors.background,
                  opacity: 0.3,
                }}
              ></div>
            </div>
          </div>
        );

      case "flat":
        return (
          <div className="flex h-full flex-col gap-4">
            {/* Flat Header */}
            <div
              className={`h-10 ${styleClasses.header} ${styleClasses.shadow}`}
              style={{
                backgroundColor: selectedThemeObj.colors.primary,
                borderColor: selectedThemeObj.colors.border,
              }}
            >
              <div className="flex items-center justify-between h-full px-4">
                <div
                  className="w-24 h-4 rounded-none"
                  style={{
                    backgroundColor: selectedThemeObj.colors.background,
                    opacity: 0.3,
                  }}
                ></div>
                <div className="flex space-x-3">
                  <div
                    className="w-16 h-4 rounded-none"
                    style={{
                      backgroundColor: selectedThemeObj.colors.background,
                      opacity: 0.3,
                    }}
                  ></div>
                  <div
                    className="w-16 h-4 rounded-none"
                    style={{
                      backgroundColor: selectedThemeObj.colors.background,
                      opacity: 0.3,
                    }}
                  ></div>
                  <div
                    className="w-16 h-4 rounded-none"
                    style={{
                      backgroundColor: selectedThemeObj.colors.background,
                      opacity: 0.3,
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Flat Hero */}
            <div
              className={`min-h-28 flex-[1.2] ${styleClasses.hero} ${styleClasses.shadow} flex items-center justify-center`}
              style={{
                backgroundColor: selectedThemeObj.colors.primary,
                borderColor: selectedThemeObj.colors.border,
              }}
            >
              <div className="text-center">
                <div
                  className="w-48 h-6 rounded-none mb-2 mx-auto"
                  style={{
                    backgroundColor: selectedThemeObj.colors.foreground,
                    opacity: 0.3,
                  }}
                ></div>
                <div
                  className="w-32 h-4 rounded-none mx-auto"
                  style={{
                    backgroundColor: selectedThemeObj.colors.foreground,
                    opacity: 0.3,
                  }}
                ></div>
              </div>
            </div>

            {/* Flat Content Grid */}
            <div className="grid min-h-24 flex-1 grid-cols-2 gap-4">
              <div
                className={`h-full ${styleClasses.content} ${styleClasses.shadow} flex items-center justify-center`}
                style={{
                  backgroundColor: selectedThemeObj.colors.muted,
                  borderColor: selectedThemeObj.colors.border,
                }}
              >
                <div className="space-y-2">
                  <div
                    className="w-20 h-3 rounded-none"
                    style={{
                      backgroundColor: selectedThemeObj.colors.foreground,
                      opacity: 0.4,
                    }}
                  ></div>
                  <div
                    className="w-16 h-3 rounded-none"
                    style={{
                      backgroundColor: selectedThemeObj.colors.foreground,
                      opacity: 0.4,
                    }}
                  ></div>
                </div>
              </div>
              <div
                className={`h-full ${styleClasses.content} ${styleClasses.shadow} flex items-center justify-center`}
                style={{
                  backgroundColor: selectedThemeObj.colors.muted,
                  borderColor: selectedThemeObj.colors.border,
                }}
              >
                <div className="space-y-2">
                  <div
                    className="w-20 h-3 rounded-none"
                    style={{
                      backgroundColor: selectedThemeObj.colors.foreground,
                      opacity: 0.4,
                    }}
                  ></div>
                  <div
                    className="w-16 h-3 rounded-none"
                    style={{
                      backgroundColor: selectedThemeObj.colors.foreground,
                      opacity: 0.4,
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Flat Footer */}
            <div
              className={`h-12 ${styleClasses.footer} ${styleClasses.shadow} flex items-center justify-center`}
              style={{
                backgroundColor: selectedThemeObj.colors.secondary,
                borderColor: selectedThemeObj.colors.border,
              }}
            >
              <div
                className="w-32 h-4 rounded-none"
                style={{
                  backgroundColor: selectedThemeObj.colors.background,
                  opacity: 0.3,
                }}
              ></div>
            </div>
          </div>
        );

      case "soft":
        return (
          <div className="flex h-full flex-col gap-4">
            {/* Soft Header */}
            <div
              className={`h-10 ${styleClasses.header} ${styleClasses.shadow}`}
              style={{ backgroundColor: selectedThemeObj.colors.primary }}
            >
              <div className="flex items-center justify-between h-full px-4">
                <div
                  className="w-24 h-4 rounded-full"
                  style={{
                    backgroundColor: selectedThemeObj.colors.background,
                    opacity: 0.3,
                  }}
                ></div>
                <div className="flex space-x-3">
                  <div
                    className="w-16 h-4 rounded-full"
                    style={{
                      backgroundColor: selectedThemeObj.colors.background,
                      opacity: 0.3,
                    }}
                  ></div>
                  <div
                    className="w-16 h-4 rounded-full"
                    style={{
                      backgroundColor: selectedThemeObj.colors.background,
                      opacity: 0.3,
                    }}
                  ></div>
                  <div
                    className="w-16 h-4 rounded-full"
                    style={{
                      backgroundColor: selectedThemeObj.colors.background,
                      opacity: 0.3,
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Soft Hero */}
            <div
              className={`min-h-28 flex-[1.2] ${styleClasses.hero} ${styleClasses.shadow} flex items-center justify-center`}
              style={{ backgroundColor: selectedThemeObj.colors.primary }}
            >
              <div className="text-center">
                <div
                  className="w-48 h-6 rounded-full mb-2 mx-auto"
                  style={{
                    backgroundColor: selectedThemeObj.colors.foreground,
                    opacity: 0.3,
                  }}
                ></div>
                <div
                  className="w-32 h-4 rounded-full mx-auto"
                  style={{
                    backgroundColor: selectedThemeObj.colors.foreground,
                    opacity: 0.3,
                  }}
                ></div>
              </div>
            </div>

            {/* Soft Content Cards */}
            <div className="grid min-h-24 flex-1 grid-cols-2 gap-4">
              <div
                className={`h-full ${styleClasses.content} ${styleClasses.shadow} flex items-center justify-center`}
                style={{ backgroundColor: selectedThemeObj.colors.muted }}
              >
                <div className="space-y-2">
                  <div
                    className="w-20 h-4 rounded-full"
                    style={{
                      backgroundColor: selectedThemeObj.colors.foreground,
                      opacity: 0.4,
                    }}
                  ></div>
                  <div
                    className="w-16 h-3 rounded-full"
                    style={{
                      backgroundColor: selectedThemeObj.colors.foreground,
                      opacity: 0.4,
                    }}
                  ></div>
                </div>
              </div>
              <div
                className={`h-full ${styleClasses.content} ${styleClasses.shadow} flex items-center justify-center`}
                style={{ backgroundColor: selectedThemeObj.colors.muted }}
              >
                <div className="space-y-2">
                  <div
                    className="w-20 h-4 rounded-full"
                    style={{
                      backgroundColor: selectedThemeObj.colors.foreground,
                      opacity: 0.4,
                    }}
                  ></div>
                  <div
                    className="w-16 h-3 rounded-full"
                    style={{
                      backgroundColor: selectedThemeObj.colors.foreground,
                      opacity: 0.4,
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Soft Footer */}
            <div
              className={`h-12 ${styleClasses.footer} ${styleClasses.shadow} flex items-center justify-center`}
              style={{ backgroundColor: selectedThemeObj.colors.secondary }}
            >
              <div
                className="w-32 h-4 rounded-full"
                style={{
                  backgroundColor: selectedThemeObj.colors.background,
                  opacity: 0.3,
                }}
              ></div>
            </div>
          </div>
        );
    }
  };
  return (
    <div className="flex h-full w-full max-w-full flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white dark:bg-neutral-800 p-4 shadow-lg dark:border-neutral-700 sm:p-6">
      <div className="flex items-center space-x-3 mb-4 sm:mb-6 flex-shrink-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl bg-gradient text-white">
          {isThemeConfirmed ? (
            <Eye className="h-5 w-5 sm:h-6 sm:w-6" />
          ) : (
            <Palette className="h-5 w-5 sm:h-6 sm:w-6" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-gray-800 dark:text-neutral-50 sm:text-lg">
            {isThemeConfirmed ? "Preview" : "Color palette"}
          </h3>
          <p className="truncate text-xs text-gray-600 dark:text-neutral-400 sm:text-sm">
            {isThemeConfirmed
              ? "Website skeleton preview"
              : "Shape your brand colors"}
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-gray-300 bg-transparent p-2 dark:border-neutral-700 sm:rounded-2xl sm:p-3">
        <div className="h-full min-h-[16rem] w-full rounded-xl bg-transparent p-2 sm:rounded-2xl sm:p-3">
          {!isThemeConfirmed ? (
            <div
              className="flex h-full min-h-[16rem] flex-col justify-center gap-5 p-4 sm:p-8"
              style={{ color: selectedThemeObj.colors.foreground }}
            >
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {Object.entries(selectedThemeObj.colors)
                  .slice(0, 4)
                  .map(([name, color]) => (
                    <div
                      key={name}
                      className="group relative overflow-hidden rounded-xl border bg-white/40 p-1.5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 dark:bg-neutral-900/30"
                      style={{ borderColor: selectedThemeObj.colors.border }}
                    >
                      <div
                        className="relative flex aspect-square items-end overflow-hidden rounded-lg p-1.5"
                        style={{
                          backgroundColor: color as string,
                        }}
                      >
                        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-white/80 shadow-sm ring-1 ring-black/10" />
                      </div>
                      <div className="truncate px-0.5 pt-1 text-center text-[10px] font-medium capitalize text-neutral-600 dark:text-neutral-300">
                        {name}
                      </div>
                    </div>
                  ))}
              </div>
              <div className="border-t border-neutral-200/70 pt-4 dark:border-neutral-700/70">
                <ThemePaletteEditor
                  theme={selectedThemeObj}
                  onChange={(theme) => onThemeChange?.(theme)}
                />
              </div>
            </div>
          ) : (
            renderSkeleton()
          )}
        </div>
      </div>
    </div>
  );
};
