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
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {siteStyles.map((style) => {
          const isSelected = selectedStyle === style.id;

          return (
            <button
              key={style.id}
              onClick={() => handleStyleSelect(style)}
              className={cn(
                "relative w-full text-left p-2 border rounded-xl transition-all duration-200 hover:shadow-md",
                isSelected
                  ? "border-cyan-500 shadow-lg ring-2 ring-cyan-200 ring-opacity-50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-opacity-80 dark:border-neutral-700 dark:hover:border-neutral-600 dark:hover:bg-neutral-700",
              )}
            >
              <div className="flex items-center gap-3">
                <style.icon className="h-6 w-6 text-gray-700 dark:text-neutral-300" />
                <div className="font-medium text-gray-800 dark:text-neutral-50">
                  {style.name}
                </div>
              </div>

              {isSelected && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center shadow-lg">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedStyle && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
          <div className="mb-4 rounded-lg bg-gray-50 p-3 dark:bg-neutral-700">
            <div className="font-medium text-gray-800 dark:text-neutral-50">
              {siteStyles.find((s) => s.id === selectedStyle)?.name}
            </div>
            <div className="mt-1 text-sm text-gray-600 dark:text-neutral-400">
              {siteStyles.find((s) => s.id === selectedStyle)?.description}
            </div>
          </div>
          <button
            onClick={confirmStyleSelection}
            className="flex items-center gap-2 px-4 py-2 bg-gradient text-white rounded-lg 
            hover:shadow-lg hover:from-cyan-600 hover:to-cyan-700 transition-all duration-200 font-medium"
          >
            Confirm Selection
            <Check className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};
