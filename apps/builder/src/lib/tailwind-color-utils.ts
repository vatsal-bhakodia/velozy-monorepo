export const TAILWIND_COLORS = [
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
  "white",
  "black",
  "transparent",
  "current",
  "inherit",
  "primary",
  "secondary",
  "accent",
  "muted",
  "foreground",
  "background",
  "border",
  "ring",
];

export const isTextColorClass = (cls: string) => {
  if (!cls.startsWith("text-")) return false;

  if (cls.startsWith("text-[")) {
    const val = cls.slice(6, -1);
    return (
      val.startsWith("#") ||
      val.startsWith("rgb") ||
      val.startsWith("hsl") ||
      val.startsWith("var") ||
      val.startsWith("color")
    );
  }

  const parts = cls.split("-");
  return parts.length > 1 && TAILWIND_COLORS.includes(parts[1]);
};

export const isBgColorClass = (cls: string) => {
  if (!cls.startsWith("bg-")) return false;

  if (cls.startsWith("bg-[")) {
    const val = cls.slice(4, -1);
    return (
      val.startsWith("#") ||
      val.startsWith("rgb") ||
      val.startsWith("hsl") ||
      val.startsWith("var") ||
      val.startsWith("color")
    );
  }

  const parts = cls.split("-");
  return parts.length > 1 && TAILWIND_COLORS.includes(parts[1]);
};

export const isArbitraryTextSizeClass = (cls: string) => {
  return (
    cls.startsWith("text-[") && cls.endsWith("]") && !isTextColorClass(cls)
  );
};
