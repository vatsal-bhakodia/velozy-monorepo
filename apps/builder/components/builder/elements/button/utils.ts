import { ButtonVariant, ButtonSize } from "./types";

export const getButtonClasses = (
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  disabled: boolean = false,
  loading: boolean = false,
): string => {
  const baseClasses = [
    "inline-flex",
    "items-center",
    "justify-center",
    "rounded-md",
    "font-medium",
    "transition-all",
    "duration-200",
    "focus:outline-none",
    "focus:ring-2",
    "focus:ring-offset-2",
    "cursor-pointer",
    "select-none",
    "whitespace-nowrap",
  ];

  // Size classes
  const sizeClasses = {
    sm: ["px-3", "py-1.5", "text-sm", "h-8"],
    md: ["px-4", "py-2", "text-sm", "h-10"],
    lg: ["px-6", "py-3", "text-base", "h-12"],
  };

  // Variant classes
  const variantClasses = {
    primary: [
      "bg-primary",
      "text-white",
      "hover:bg-primary-600",
      "active:bg-primary-700",
      "focus:ring-primary",
      "focus:ring-2",
      "focus:ring-offset-2",
      "shadow-sm",
    ],
    secondary: [
      "bg-secondary",
      "text-white",
      "hover:bg-secondary-600",
      "active:bg-secondary-700",
      "focus:ring-secondary",
      "focus:ring-2",
      "focus:ring-offset-2",
      "shadow-sm",
    ],
    outline: [
      "border",
      "border-border",
      "bg-transparent",
      "text-foreground",
      "hover:bg-muted",
      "active:bg-muted",
      "hover:text-foreground",
      "focus:ring-primary",
      "focus:ring-2",
      "focus:ring-offset-2",
      "transition-colors",
    ],
    ghost: [
      "bg-transparent",
      "text-foreground",
      "hover:bg-muted",
      "active:bg-muted",
      "hover:text-foreground",
      "focus:ring-primary",
      "focus:ring-2",
      "focus:ring-offset-2",
      "transition-colors",
    ],
    destructive: [
      "bg-red-600",
      "text-white",
      "hover:bg-red-700",
      "active:bg-red-800",
      "focus:ring-red-500",
      "focus:ring-2",
      "focus:ring-offset-2",
      "shadow-sm",
    ],
    accent: [
      "bg-accent",
      "text-accent-foreground",
      "hover:bg-accent/80",
      "active:bg-accent/70",
      "focus:ring-accent",
      "focus:ring-2",
      "focus:ring-offset-2",
      "shadow-sm",
    ],
    muted: [
      "bg-muted",
      "text-muted-foreground",
      "hover:bg-muted/80",
      "active:bg-muted/70",
      "focus:ring-muted",
      "focus:ring-2",
      "focus:ring-offset-2",
      "border",
      "border-border",
    ],
  };

  // Disabled state classes
  const disabledClasses =
    disabled || loading
      ? ["opacity-50", "cursor-not-allowed", "pointer-events-none"]
      : [];

  // Loading state classes
  const loadingClasses = loading ? ["relative"] : [];

  return [
    ...baseClasses,
    ...(sizeClasses[size] || []),
    ...(variantClasses[variant] || []),
    ...disabledClasses,
    ...loadingClasses,
  ].join(" ");
};
