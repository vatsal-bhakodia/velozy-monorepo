import { ColorPicker } from "@/components/color-picker";

const COLOR_FIELDS = [
  "primary",
  "secondary",
  "background",
  "foreground",
  "accent",
  "muted",
  "border",
  "ring",
] as const;

export function ThemePaletteEditor({
  theme,
  onChange,
}: {
  theme: any;
  onChange: (theme: any) => void;
}) {
  if (!theme) return null;
  return (
    <div className="grid grid-cols-2 gap-3">
      {COLOR_FIELDS.map((field) => (
        <ColorPicker
          key={field}
          label={field}
          color={theme.colors[field]}
          clearColor={theme.colors[field]}
          resetColor={theme.colors[field]}
          onChange={(color) => {
            if (/^#[0-9a-fA-F]{6}$/.test(color)) {
              onChange({
                ...theme,
                colors: { ...theme.colors, [field]: color },
              });
            }
          }}
        />
      ))}
    </div>
  );
}
