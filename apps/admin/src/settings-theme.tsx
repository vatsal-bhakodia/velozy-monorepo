import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  Edit3,
  Paintbrush,
  Palette,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/color-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import sharedThemePresets from "@velozy/theme-presets";
import type { ThemePreset } from "@velozy/theme-presets";

export type Theme = ThemePreset;
export const themes: Theme[] = sharedThemePresets;

export const siteStyles = [{ id: "modern", name: "Modern", icon: Palette }];

export function useThemeManager({
  themes: defaults,
  initialTheme,
}: {
  themes: Theme[];
  initialTheme?: Theme | null;
}) {
  const [customThemes, setCustomThemes] = useState<Theme[]>(
    initialTheme?.isCustom ? [initialTheme] : [],
  );
  const allThemes = useMemo(() => {
    const themesById = new Map(defaults.map((theme) => [theme.id, theme]));
    customThemes.forEach((theme) => themesById.set(theme.id, theme));
    if (initialTheme?.isCustom && !themesById.has(initialTheme.id)) {
      themesById.set(initialTheme.id, initialTheme);
    }
    return [...themesById.values()];
  }, [defaults, customThemes, initialTheme]);
  const [selectedThemeId, setSelectedThemeId] = useState(
    initialTheme?.id ?? defaults[0]?.id ?? "default",
  );
  const currentTheme =
    allThemes.find((theme) => theme.id === selectedThemeId) ?? allThemes[0];

  return {
    allThemes,
    customThemes,
    selectedThemeId,
    currentTheme,
    themeColors: currentTheme?.colors ?? {},
    setSelectedThemeId,
    handleThemeChange: setSelectedThemeId,
    setCustomThemes,
  };
}

export function ThemeManager({
  allThemes,
  selectedThemeId,
  onThemeSelect,
  setCustomThemes,
}: {
  allThemes: Theme[];
  selectedThemeId: string;
  onThemeSelect: (id: string) => void;
  setCustomThemes: Dispatch<SetStateAction<Theme[]>>;
}) {
  const [draftThemeId, setDraftThemeId] = useState(selectedThemeId);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const selectedTheme =
    allThemes.find((theme) => theme.id === selectedThemeId) ?? allThemes[0];
  const draftTheme =
    allThemes.find((theme) => theme.id === draftThemeId) ?? selectedTheme;
  const isEditing = editingTheme !== null;
  const currentTheme = editingTheme ?? draftTheme;

  useEffect(() => {
    setDraftThemeId(selectedThemeId);
    setEditingTheme(null);
  }, [selectedThemeId]);

  if (!selectedTheme || !draftTheme || !currentTheme) return null;

  const beginEditing = () => {
    setEditingTheme(
      draftTheme.isCustom
        ? { ...draftTheme, colors: { ...draftTheme.colors } }
        : {
            ...draftTheme,
            id: `custom-${draftTheme.id}-${Date.now()}`,
            isCustom: true,
            colors: { ...draftTheme.colors },
          },
    );
  };

  const createCustomTheme = () => {
    const existingCustom = allThemes.find((theme) => theme.isCustom);
    if (existingCustom) {
      setEditingTheme({
        ...existingCustom,
        colors: { ...existingCustom.colors },
      });
      return;
    }

    setEditingTheme({
      id: `custom-${Date.now()}`,
      name: "Custom Theme",
      colors: { ...(themes[0]?.colors ?? draftTheme.colors) },
      isCustom: true,
    });
  };

  const saveCustomTheme = () => {
    if (!editingTheme) return;
    const savedTheme = { ...editingTheme, isCustom: true };
    setCustomThemes((current) => [
      ...current.filter((theme) => theme.id !== savedTheme.id),
      savedTheme,
    ]);
    setDraftThemeId(savedTheme.id);
    setEditingTheme(null);
  };

  const deleteCustomTheme = (themeId: string) => {
    const fallback = allThemes.find((theme) => !theme.isCustom) ?? themes[0];
    setCustomThemes((current) =>
      current.filter((theme) => theme.id !== themeId),
    );
    if (draftThemeId === themeId && fallback) setDraftThemeId(fallback.id);
    if (selectedThemeId === themeId && fallback) onThemeSelect(fallback.id);
    setEditingTheme(null);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {!isEditing ? (
            <>
              <div className="space-y-3">
                <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  Select theme
                </label>
                <div className="flex gap-2">
                  <Select
                    value={draftTheme.id}
                    onValueChange={(id) => {
                      setDraftThemeId(id);
                      setEditingTheme(null);
                    }}
                  >
                    <SelectTrigger className="flex-1 bg-neutral-50 dark:bg-neutral-800/50">
                      <SelectValue>
                        <span className="flex items-center gap-2">
                          <span className="flex gap-1">
                            {Object.values(draftTheme.colors)
                              .slice(0, 4)
                              .map((color, index) => (
                                <span
                                  key={`${draftTheme.id}-${index}`}
                                  className="h-3 w-3 rounded-full border border-black/10 dark:border-white/20"
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                          </span>
                          <span className="text-xs font-medium">
                            {draftTheme.name}
                          </span>
                          {draftTheme.isCustom && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                              Custom
                            </span>
                          )}
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
                      {allThemes.map((theme) => (
                        <SelectItem
                          key={theme.id}
                          value={theme.id}
                          className="hover:bg-neutral-50 dark:hover:bg-neutral-800"
                        >
                          <span className="flex items-center gap-3 py-1">
                            <span className="flex gap-1">
                              {Object.values(theme.colors)
                                .slice(0, 4)
                                .map((color, index) => (
                                  <span
                                    key={`${theme.id}-option-${index}`}
                                    className="h-4 w-4 rounded-full border border-black/10 dark:border-white/20"
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                            </span>
                            <span className="text-xs font-medium">
                              {theme.name}
                            </span>
                            {theme.isCustom && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                                Custom
                              </span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={beginEditing}
                    title="Edit theme"
                    aria-label="Edit theme"
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  {!allThemes.some((theme) => theme.isCustom) && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={createCustomTheme}
                      title="Create custom theme"
                      aria-label="Create custom theme"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                  {draftTheme.isCustom && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => deleteCustomTheme(draftTheme.id)}
                      className="border-red-200 text-red-600 dark:border-red-900 dark:text-red-400"
                      title="Delete custom theme"
                      aria-label="Delete custom theme"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  Configuration values
                </h3>
                <div className="space-y-2 rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800/50">
                  {Object.entries(draftTheme.colors).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-3 text-xs">
                      <span
                        className="h-5 w-5 shrink-0 rounded-md border border-neutral-200 dark:border-neutral-600"
                        style={{ backgroundColor: value }}
                      />
                      <span className="min-w-0 flex-1 font-mono text-neutral-600 dark:text-neutral-400">
                        <span className="font-semibold">{key}:</span> {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
                  Theme editor
                </h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setEditingTheme(null)}
                    title="Cancel edits"
                    aria-label="Cancel edits"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setEditingTheme((current) =>
                        current
                          ? {
                              ...current,
                              colors: {
                                ...(themes[0]?.colors ?? current.colors),
                              },
                            }
                          : current,
                      )
                    }
                    title="Reset colors"
                    aria-label="Reset colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    onClick={saveCustomTheme}
                    title="Save custom theme"
                    aria-label="Save custom theme"
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-theme-name">Theme name</Label>
                <Input
                  id="custom-theme-name"
                  value={editingTheme.name}
                  onChange={(event) =>
                    setEditingTheme((current) =>
                      current
                        ? { ...current, name: event.target.value }
                        : current,
                    )
                  }
                  className="bg-neutral-50 dark:bg-neutral-800/50"
                />
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  Color configuration
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(editingTheme.colors).map(([key, value]) => (
                    <ColorPicker
                      key={key}
                      label={key.replace(/([A-Z])/g, " $1").trim()}
                      color={value}
                      onChange={(color) =>
                        setEditingTheme((current) =>
                          current
                            ? {
                                ...current,
                                colors: { ...current.colors, [key]: color },
                              }
                            : current,
                        )
                      }
                      clearColor="#000000"
                      resetColor={
                        themes[0]?.colors[key as keyof Theme["colors"]] ?? value
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Interface preview
          </h3>
          <div
            className="space-y-4 rounded-xl border p-5 shadow-sm"
            style={{
              backgroundColor: currentTheme.colors.background,
              color: currentTheme.colors.foreground,
              borderColor: currentTheme.colors.border,
            }}
          >
            <div className="text-lg font-bold">Sample interface</div>
            <p className="text-sm opacity-75">
              This preview shows the selected theme colors together.
            </p>
            <div className="flex flex-wrap gap-2">
              <span
                className="rounded-md px-3 py-2 text-xs font-medium text-white"
                style={{ backgroundColor: currentTheme.colors.primary }}
              >
                Primary
              </span>
              <span
                className="rounded-md px-3 py-2 text-xs font-medium text-white"
                style={{ backgroundColor: currentTheme.colors.secondary }}
              >
                Secondary
              </span>
              <span
                className="rounded-md px-3 py-2 text-xs"
                style={{
                  backgroundColor: currentTheme.colors.accent,
                  color: currentTheme.colors.foreground,
                }}
              >
                Accent
              </span>
            </div>
            <div
              className="rounded-md p-3 text-xs"
              style={{
                backgroundColor: currentTheme.colors.muted,
                color: currentTheme.colors.foreground,
              }}
            >
              Muted background
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end border-t border-neutral-200 pt-4 dark:border-neutral-700">
        <Button
          onClick={() => {
            onThemeSelect(draftTheme.id);
          }}
          className="gap-2"
          disabled={draftTheme.id === selectedThemeId}
        >
          Apply theme
          <Paintbrush className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
