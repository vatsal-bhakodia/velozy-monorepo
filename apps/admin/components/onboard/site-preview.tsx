import React from "react";
import { Layout } from "lucide-react";
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
  const allThemes = [...themes, ...customThemes];
  const selectedThemeObj =
    activeTheme ||
    allThemes.find((theme) => theme.id === selectedTheme) ||
    themes[0];
  const colors = selectedThemeObj.colors;
  const renderStyleOverview = () => {
    switch (selectedStyle) {
      case "classic":
        return (
          <div
            className="flex h-full min-h-[20rem] flex-col px-5 py-6 sm:px-10 sm:py-9"
            style={{ color: colors.foreground }}
          >
            <div
              className="flex items-center justify-between border-y py-3 text-[9px] uppercase tracking-[0.16em]"
              style={{ borderColor: colors.border }}
            >
              <span>Lorem ipsum</span>
              <span>Dolor sit amet</span>
            </div>
            <div className="grid flex-1 grid-cols-[1.1fr_0.9fr] items-center gap-4 py-6 sm:gap-8 sm:py-9">
              <div>
                <p
                  className="mb-3 text-[9px] uppercase tracking-[0.22em]"
                  style={{ color: colors.primary }}
                >
                  Lorem ipsum dolor
                </p>
                <h4 className="font-serif text-4xl leading-[0.98] tracking-tight sm:text-6xl">
                  Lorem ipsum.
                </h4>
                <div
                  className="my-4 h-px w-10"
                  style={{ backgroundColor: colors.primary }}
                />
                <p className="max-w-sm font-serif text-xs leading-relaxed opacity-75 sm:text-sm">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                </p>
              </div>
              <div
                className="h-full min-h-48 sm:min-h-64"
                style={{ backgroundColor: colors.secondary }}
              />
            </div>
            <div
              className="grid grid-cols-3 border-y text-[9px]"
              style={{ borderColor: colors.border }}
            >
              {["Lorem ipsum", "Dolor sit amet", "Consectetur"].map(
                (item, index) => (
                  <span
                    key={item}
                    className="py-3 text-center uppercase tracking-[0.1em]"
                    style={{
                      borderRight:
                        index < 2 ? `1px solid ${colors.border}` : undefined,
                    }}
                  >
                    {item}
                  </span>
                ),
              )}
            </div>
          </div>
        );

      case "flat":
        return (
          <div
            className="flex h-full min-h-[20rem] flex-col p-5 sm:p-8"
            style={{ color: colors.foreground }}
          >
            <div
              className="flex items-center justify-between border-b-2 pb-3 text-[9px] font-bold uppercase tracking-[0.14em]"
              style={{ borderColor: colors.foreground }}
            >
              <span>Lorem ipsum</span>
              <span>Dolor sit amet</span>
            </div>
            <div
              className="my-4 grid flex-1 grid-cols-[1.15fr_0.85fr] border"
              style={{ borderColor: colors.foreground }}
            >
              <div
                className="flex flex-col justify-between border-r p-4 sm:p-6"
                style={{ borderColor: colors.foreground }}
              >
                <span className="text-[9px] font-bold uppercase tracking-[0.12em] opacity-60">
                  Lorem ipsum
                </span>
                <div className="py-4">
                  <h4 className="text-3xl font-bold leading-[0.95] tracking-tight sm:text-5xl">
                    Lorem
                    <br />
                    ipsum.
                  </h4>
                  <div
                    className="mt-4 h-1 w-10"
                    style={{ backgroundColor: colors.primary }}
                  />
                </div>
                <span className="text-[9px] font-semibold uppercase tracking-wider">
                  Dolor sit amet
                </span>
              </div>
              <div
                className="grid grid-cols-2 grid-rows-2"
                style={{ backgroundColor: colors.background }}
              >
                <div
                  className="border-b border-r"
                  style={{ borderColor: colors.border }}
                />
                <div
                  className="border-b"
                  style={{
                    backgroundColor: colors.muted,
                    borderColor: colors.border,
                  }}
                />
                <div
                  className="border-r"
                  style={{
                    backgroundColor: colors.primary,
                    borderColor: colors.border,
                  }}
                />
                <div />
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-current text-[9px] font-semibold uppercase tracking-wide">
              {["Lorem ipsum", "Dolor sit", "Amet"].map((item) => (
                <span key={item} className="px-2 first:pl-0 last:pr-0">
                  {item}
                </span>
              ))}
            </div>
          </div>
        );

      case "soft":
        return (
          <div
            className="flex h-full min-h-[20rem] flex-col p-4 sm:p-7"
            style={{ color: colors.foreground }}
          >
            <div className="flex items-center justify-between px-2 text-[9px] font-medium">
              <span>Lorem ipsum</span>
              <span>Dolor sit amet</span>
            </div>
            <div className="my-4 grid flex-1 grid-cols-[1.15fr_0.85fr] gap-3 sm:gap-5">
              <div
                className="flex flex-col justify-between rounded-[1.5rem] border p-4 sm:p-6"
                style={{
                  backgroundColor: colors.muted,
                  borderColor: colors.border,
                  boxShadow: `0 5px 18px ${colors.foreground}0a`,
                }}
              >
                <div>
                  <div
                    className="mb-4 h-1 w-8 rounded-full"
                    style={{ backgroundColor: colors.primary }}
                  />
                  <h4 className="max-w-xs text-2xl font-medium leading-tight sm:text-3xl">
                    Lorem ipsum
                    <br />
                    dolor sit amet.
                  </h4>
                  <p className="mt-3 max-w-xs text-[10px] leading-relaxed opacity-65 sm:text-xs">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  </p>
                </div>
                <span
                  className="mt-5 inline-flex w-fit items-center rounded-full px-4 py-2 text-[9px] font-medium"
                  style={{
                    backgroundColor: colors.primary,
                    color: colors.background,
                  }}
                >
                  Lorem ipsum <span className="ml-3">↗</span>
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {["Lorem ipsum", "Dolor sit amet"].map((item, index) => (
                  <div
                    key={item}
                    className="flex min-h-0 flex-1 flex-col justify-between rounded-2xl border p-3 sm:p-4"
                    style={{
                      backgroundColor:
                        index === 0 ? colors.background : colors.muted,
                      borderColor: colors.border,
                      boxShadow: `0 4px 14px ${colors.foreground}08`,
                    }}
                  >
                    <div
                      className="h-8 w-8 rounded-xl"
                      style={{ backgroundColor: colors.accent }}
                    />
                    <div>
                      <div className="text-[10px] font-medium">{item}</div>
                      <div
                        className="mt-2 h-1 w-3/4 rounded-full opacity-30"
                        style={{ backgroundColor: colors.foreground }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between px-1 text-[9px] font-medium opacity-65">
              <span>Soft corners</span>
              <span>Gentle depth</span>
              <span>Airy spacing</span>
            </div>
          </div>
        );

      case "modern":
      default:
        return (
          <div
            className="flex h-full min-h-[20rem] flex-col p-4 sm:p-7"
            style={{ color: colors.foreground }}
          >
            <div className="flex items-center justify-between text-[9px] font-medium">
              <span>Lorem ipsum</span>
              <span>Dolor sit amet</span>
            </div>
            <div className="my-3 grid flex-1 grid-cols-[1.15fr_0.85fr] items-center gap-3 sm:gap-6">
              <div>
                <p
                  className="mb-3 text-[9px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: colors.primary }}
                >
                  Lorem ipsum dolor
                </p>
                <h4 className="text-3xl font-semibold leading-[0.98] tracking-tight sm:text-5xl">
                  Lorem
                  <br />
                  ipsum
                  <br />
                  dolor.
                </h4>
                <p className="mt-4 max-w-[16rem] text-xs leading-relaxed opacity-65">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                </p>
              </div>
              <div
                className="relative h-4/5 min-h-36"
                style={{ backgroundColor: colors.muted }}
              >
                <div
                  className="absolute right-0 top-0 h-[72%] w-[72%]"
                  style={{ backgroundColor: colors.secondary }}
                />
                <div
                  className="absolute bottom-0 left-0 h-[55%] w-[62%] border-[5px]"
                  style={{
                    backgroundColor: colors.background,
                    borderColor: colors.background,
                  }}
                />
                <div
                  className="absolute bottom-[12%] left-[14%] h-[3px] w-8"
                  style={{ backgroundColor: colors.primary }}
                />
              </div>
            </div>
            <div
              className="flex items-center justify-between border-t pt-3 text-[9px]"
              style={{ borderColor: colors.border }}
            >
              <span>Lorem ipsum</span>
              <span>Dolor sit amet</span>
              <span>Consectetur</span>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-full w-full max-w-full flex-col overflow-hidden rounded-lg border border-gray-200/80 bg-white p-4 shadow-[0_20px_55px_rgba(15,23,42,0.12)] dark:border-white/[0.09] dark:bg-[#202124] dark:shadow-[0_20px_55px_rgba(0,0,0,0.3)] sm:p-6">
      <div className="mb-4 flex shrink-0 items-center space-x-3 sm:mb-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient text-white sm:h-12 sm:w-12">
          <Layout className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-medium leading-6 text-neutral-950 dark:text-neutral-50">
            Style overview
          </h3>
          <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">
            A guide to the layout and colors this style uses.
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-gray-200 bg-white p-3 text-neutral-900 dark:border-white/[0.08] dark:bg-[#202124] dark:text-neutral-100 sm:p-4">
        <div className="flex min-h-full w-full flex-col gap-3 rounded-md bg-transparent p-1 sm:p-2">
          {!isThemeConfirmed ? (
            <div className="flex h-full min-h-[16rem] flex-col justify-center gap-5 p-4 sm:p-8">
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {Object.entries(colors)
                  .slice(0, 4)
                  .map(([name, color]) => (
                    <div
                      key={name}
                      className="group relative overflow-hidden rounded-md border border-gray-200 bg-transparent p-1.5 dark:border-white/[0.08]"
                    >
                      <div
                        className="relative flex aspect-square items-end overflow-hidden rounded-sm p-1.5"
                        style={{ backgroundColor: color as string }}
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
            <div
              className="min-h-[22rem] flex-1 overflow-hidden rounded-md border"
              style={{
                backgroundColor: colors.background,
                borderColor: colors.border,
              }}
            >
              {renderStyleOverview()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
