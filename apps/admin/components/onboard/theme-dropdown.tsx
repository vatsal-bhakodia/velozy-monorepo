import { useState, useEffect, useRef } from "react";
import { ChevronDown, Check, Loader2 } from "lucide-react";
import themes from "@/src/onboard/constants/themes";
import { apiFetch } from "@/src/lib/api";

type Theme = (typeof themes)[0] & {
  headingFont?: string;
  bodyFont?: string;
  isCustom?: boolean;
};

type ThemeDropdownProps = {
  selectedTheme?: string;
  handleThemeSelect?: (theme: Theme) => void;
  confirmThemeSelect?: () => void;
  industry?: string;
  styleType?: string;
  customThemes?: Theme[];
  setCustomThemes?: (themes: Theme[]) => void;
  activeTheme?: Theme;
  setActiveTheme?: (theme: Theme) => void;
  logoPreview?: string;
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
  industry = "",
  styleType = "",
  customThemes: externalCustomThemes = [],
  setCustomThemes: setExternalCustomThemes,
  activeTheme,
  setActiveTheme,
  logoPreview,
}: ThemeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localCustomThemes, setLocalCustomThemes] = useState<Theme[]>([]);
  const hasFetched = useRef(false);
  const [isLoadingCustomThemes, setIsLoadingCustomThemes] = useState(false);

  // Use external custom themes if setter is provided, otherwise use local state
  const customThemes = setExternalCustomThemes
    ? externalCustomThemes
    : localCustomThemes;
  const setCustomThemes = setExternalCustomThemes || setLocalCustomThemes;

  // Combine default and custom themes
  const allThemes: Theme[] = [
    ...themes.map((t) => ({ ...t, isCustom: false })),
    ...customThemes,
  ];

  const selectedThemeData =
    activeTheme || allThemes.find((t) => t.id === selectedTheme);
  const activeThemeId = activeTheme?.id || selectedTheme;

  // Fetch custom themes once when component mounts (after style is confirmed)
  useEffect(() => {
    if (
      industry &&
      styleType &&
      !logoPreview &&
      customThemes.length === 0 &&
      !hasFetched.current
    ) {
      hasFetched.current = true;
      fetchCustomThemes();
    }
  }, [industry, styleType, logoPreview, customThemes.length]);

  const fetchCustomThemes = async () => {
    setIsLoadingCustomThemes(true);
    try {
      const response = await apiFetch("/api/generate/theme", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          industry,
          styleType,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate custom theme");
      }

      const data = await response.json();
      if (data.theme) {
        // Add the custom theme to the list
        const customTheme: Theme = {
          ...data.theme,
          isCustom: true,
        };
        setCustomThemes([customTheme]);

        // Auto-select the custom theme once it's generated
        if (handleThemeSelect) {
          handleThemeSelect(customTheme);
        }
      }
    } catch (error) {
      console.error("Error fetching custom themes:", error);
    } finally {
      setIsLoadingCustomThemes(false);
    }
  };

  const onThemeSelect = (theme: Theme) => {
    handleThemeSelect(theme);
    setIsOpen(false);
  };

  // Show loading state while generating theme
  if (isLoadingCustomThemes) {
    return (
      <div className="p-8 max-w-2xl mx-auto w-full">
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-gray-200 bg-white px-6 py-12 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
          <p className="text-lg font-medium text-gray-800 dark:text-neutral-50">
            Generating your custom theme...
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-neutral-400">
            This may take a few moments
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto w-full">
      <div className="flex gap-4 items-start w-full">
        {/* Dropdown Container */}
        <div className="relative flex-1 min-w-0">
          {/* Dropdown Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            disabled={allThemes.length === 0}
            className={`w-full rounded-xl border-2 bg-white p-4 text-left shadow-sm transition-all duration-300 dark:bg-neutral-800 ${
              isOpen
                ? "border-cyan-400 bg-cyan-50 shadow-md dark:bg-cyan-950/40"
                : "border-gray-200 hover:border-cyan-300 hover:shadow-md dark:border-neutral-700"
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
                  isOpen ? "rotate-180 text-cyan-500" : ""
                }`}
              />
            </div>
          </button>

          {/* Dropdown Menu */}
          {isOpen && allThemes.length > 0 && (
            <div className="absolute z-10 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border-2 border-gray-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-800">
              {allThemes.map((theme, index) => (
                <button
                  key={theme.id}
                  onClick={() => onThemeSelect(theme)}
                  className={`w-full text-left p-4 transition-all duration-200 ${
                    index === 0 ? "rounded-t-xl" : ""
                  } ${index === allThemes.length - 1 ? "rounded-b-xl" : ""} ${
                    activeThemeId === theme.id
                      ? "bg-indigo-50 text-neutral-800 border-l-4 border-indigo-500 dark:bg-neutral-700 dark:text-neutral-50 dark:border-cyan-400"
                      : "border-l-4 border-transparent hover:border-cyan-300 hover:bg-gray-50 dark:hover:bg-neutral-700"
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
                          <span className="text-xs text-indigo-600 truncate w-full">
                            AI Generated
                          </span>
                        )}
                      </div>
                    </div>
                    {activeThemeId === theme.id && (
                      <Check className="shrink-0 w-5 h-5 text-indigo-600 dark:text-cyan-300" />
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
          className={`px-4 md:px-8 py-4 rounded-xl font-medium transition-all duration-300 whitespace-nowrap flex gap-2 ${
            selectedTheme
              ? "bg-gradient text-white hover:scale-105 hover:shadow-lg"
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
