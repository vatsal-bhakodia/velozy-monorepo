import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import themes from "@/src/onboard/constants/themes";

type Theme = (typeof themes)[0] & {
  headingFont?: string;
  bodyFont?: string;
  isCustom?: boolean;
};

type ThemeDropdownProps = {
  selectedTheme?: string;
  handleThemeSelect?: (theme: Theme) => void;
  confirmThemeSelect?: () => void;
  customThemes?: Theme[];
  activeTheme?: Theme;
};
const ColorPalette = ({ theme }: { theme: Theme }) => (
  <div className="flex space-x-1 shrink-0">
    {Object.entries(theme.colors)
      .slice(0, 4)
      .map(([key, color]) => (
        <div
          key={key}
          className="w-5 h-5 rounded-full border border-neutral-400 shadow-sm shrink-0"
          style={{ backgroundColor: color as string }}
        />
      ))}
  </div>
);

export function ThemeDropdown({
  selectedTheme = "",
  handleThemeSelect = () => {},
  confirmThemeSelect = () => {},
  customThemes: externalCustomThemes = [],
  activeTheme,
}: ThemeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const customThemes = externalCustomThemes;

  // Combine default and custom themes
  const allThemes: Theme[] = [
    ...themes.map((t) => ({ ...t, isCustom: false })),
    ...customThemes,
  ];

  const selectedThemeData =
    activeTheme || allThemes.find((t) => t.id === selectedTheme);
  const activeThemeId = activeTheme?.id || selectedTheme;

  const onThemeSelect = (theme: Theme) => {
    handleThemeSelect(theme);
    setIsOpen(false);
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-0 py-4 sm:px-0 sm:py-5">
      <div className="flex w-full items-start gap-3">
        {/* Dropdown Container */}
        <div className="relative flex-1 min-w-0">
          {/* Dropdown Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            disabled={allThemes.length === 0}
            className={`w-full rounded-md border bg-white p-3 text-left transition-colors duration-200 dark:bg-[#292a2d] ${
              isOpen
                ? "border-neutral-400 bg-neutral-50 dark:border-neutral-400 dark:bg-[#303033]"
                : "border-gray-200 hover:border-neutral-300 hover:bg-neutral-50 dark:border-white/[0.1] dark:hover:border-neutral-500 dark:hover:bg-[#303033]"
            } ${allThemes.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4 flex-1 min-w-0 mr-2">
                {selectedThemeData && (
                  <ColorPalette theme={selectedThemeData} />
                )}
                <span
                  className={`truncate font-medium ${
                    selectedThemeData
                      ? "text-gray-800 dark:text-neutral-50"
                      : "text-gray-500 dark:text-neutral-400"
                  }`}
                >
                  {selectedThemeData?.name || "Select a theme..."}
                </span>
              </div>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-gray-400 transition-transform duration-300 ${
                  isOpen
                    ? "rotate-180 text-neutral-700 dark:text-neutral-200"
                    : ""
                }`}
              />
            </div>
          </button>

          {/* Dropdown Menu */}
          {isOpen && allThemes.length > 0 && (
            <div className="absolute z-10 mt-2 max-h-60 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-xl dark:border-white/[0.1] dark:bg-[#202124]">
              {allThemes.map((theme, index) => (
                <button
                  key={theme.id}
                  onClick={() => onThemeSelect(theme)}
                  className={`w-full p-3 text-left transition-colors duration-200 ${
                    index === 0 ? "rounded-t-md" : ""
                  } ${index === allThemes.length - 1 ? "rounded-b-md" : ""} ${
                    activeThemeId === theme.id
                      ? "bg-neutral-100 text-neutral-900 dark:bg-[#303033] dark:text-neutral-50"
                      : "hover:bg-gray-50 dark:hover:bg-[#252527]"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-4 flex-1 min-w-0 mr-2">
                      <ColorPalette theme={theme} />
                      <div className="flex flex-col flex-1 min-w-0 text-left">
                        <span className="w-full truncate font-medium text-gray-800 dark:text-neutral-50">
                          {theme.name}
                        </span>
                        {theme.isCustom && (
                          <span className="w-full truncate text-xs text-neutral-500 dark:text-neutral-400">
                            AI Generated
                          </span>
                        )}
                      </div>
                    </div>
                    {activeThemeId === theme.id && (
                      <Check className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Confirm Button */}
        <button
          onClick={confirmThemeSelect}
          disabled={!selectedTheme}
          className={`flex items-center gap-2 whitespace-nowrap rounded-md px-4 py-3 text-sm font-medium transition-[filter,background-color] duration-200 md:px-6 ${
            selectedTheme
              ? "bg-gradient text-white hover:brightness-110"
              : "cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-neutral-700"
          }`}
        >
          Confirm
          <Check className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Preview Section */}
    </div>
  );
}
