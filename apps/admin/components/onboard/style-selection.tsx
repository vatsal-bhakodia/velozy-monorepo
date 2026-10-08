import { cn } from "@/src/lib/utils";
import { Check } from "lucide-react";
import { SiteStyleProps } from "@/src/onboard/constants/site-style";

type StyleSelectionProps = {
  siteStyles: SiteStyleProps[];
  handleStyleSelect: (style: SiteStyleProps) => void;
  selectedStyle: string;
  confirmStyleSelection: () => void;
};

export const StyleSelection = ({
  siteStyles,
  handleStyleSelect,
  selectedStyle,
  confirmStyleSelection,
}: StyleSelectionProps) => {
  const iconColors: Record<string, string> = {
    modern: "bg-sky-100 text-sky-700",
    classic: "bg-amber-100 text-amber-700",
    flat: "bg-emerald-100 text-emerald-700",
    soft: "bg-violet-100 text-violet-700",
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2.5">
        {siteStyles.map((style) => {
          const isSelected = selectedStyle === style.id;

          return (
            <button
              key={style.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => handleStyleSelect(style)}
              className={cn(
                "relative w-full rounded-md border px-2.5 py-2.5 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-neutral-300 dark:focus-visible:ring-offset-[#202124]",
                isSelected
                  ? "border-cyan-500 bg-white ring-1 ring-cyan-500/15 dark:bg-[#252527]"
                  : "border-gray-200 bg-white hover:bg-neutral-50 dark:border-white/[0.08] dark:bg-[#252527] dark:hover:bg-[#303033]",
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                    iconColors[style.id] ??
                      "bg-neutral-200 text-neutral-700 dark:bg-white/[0.08] dark:text-neutral-200",
                  )}
                >
                  <style.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 pr-3">
                  <div className="truncate text-sm font-medium text-gray-800 dark:text-neutral-50">
                    {style.name}
                  </div>
                </div>
              </div>
              {isSelected && (
                <Check
                  aria-hidden="true"
                  className="absolute right-2 top-2 h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400"
                />
              )}
            </button>
          );
        })}
      </div>

      {selectedStyle && (
        <div className="rounded-lg border border-gray-200/80 bg-white p-4 dark:border-white/[0.08] dark:bg-[#202124]">
          <div className="mb-4 rounded-md bg-gray-50 p-3 dark:bg-[#252527]">
            <div className="text-sm font-medium text-gray-800 dark:text-neutral-50">
              What this style uses
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {siteStyles
                .find((style) => style.id === selectedStyle)
                ?.traits.map((trait) => (
                  <span
                    key={trait}
                    className="rounded-md bg-white px-2 py-1 text-xs text-gray-600 dark:bg-white/[0.06] dark:text-neutral-300"
                  >
                    {trait}
                  </span>
                ))}
            </div>
          </div>
          <button
            onClick={confirmStyleSelection}
            className="flex items-center gap-2 rounded-md bg-gradient px-4 py-2 text-sm font-medium text-white transition-[filter] duration-200 hover:brightness-110"
          >
            Confirm Selection
            <Check className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};
