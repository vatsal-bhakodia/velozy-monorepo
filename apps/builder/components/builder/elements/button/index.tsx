import { useEffect, useRef } from "react";
import { useNode } from "@craftjs/core";
import ToolBar from "@/components/builder/toolbar";
import { ButtonProps, ButtonVariant, ButtonSize } from "./types";
import { getButtonClasses } from "./utils";
import { ButtonSettings } from "./settings";

export const LoadingSpinner = ({ size }: { size: ButtonSize }) => {
  const spinnerSize = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <svg
      className={`animate-spin ${spinnerSize[size] || spinnerSize.md} mr-2`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
};

export const Button = ({
  text = "Button",
  style,
  className = "",
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  href,
  target,
  onClick,
  type = "button",
}: ButtonProps) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const ref = useRef<HTMLButtonElement | HTMLAnchorElement>(null);

  useEffect(() => {
    if (ref.current) {
      connect(drag(ref.current));
    }
  }, [connect, drag]);

  const buttonClasses = `${getButtonClasses(
    variant,
    size,
    disabled,
    loading,
  )} ${className}`;

  const content = (
    <>
      {loading && <LoadingSpinner size={size} />}
      {text}
    </>
  );

  // Render as link if href is provided
  if (href) {
    return (
      <a
        ref={ref as React.RefObject<HTMLAnchorElement>}
        href={disabled ? undefined : href}
        target={target}
        className={buttonClasses}
        style={style}
        onClick={(e) => {
          e.preventDefault();
          if (!disabled && onClick) {
            onClick();
          }
        }}
        aria-disabled={disabled || loading}
        role="button"
        tabIndex={disabled ? -1 : 0}
      >
        {content}
      </a>
    );
  }

  // Render as button
  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      className={buttonClasses}
      style={style}
      disabled={disabled || loading}
      onClick={onClick}
      type={type}
      aria-label={loading ? `${text} (loading)` : text}
    >
      {content}
    </button>
  );
};

Button.craft = {
  displayName: "Button",
  props: {
    text: "Button",
    variant: "primary" as ButtonVariant,
    size: "md" as ButtonSize,
    disabled: false,
    loading: false,
    type: "button" as const,
  },
  rules: {
    canDrag: () => true,
  },
  related: {
    toolbar: ToolBar,
  },
  toolbarSections: ["typography", "colors", "spacing"],
  customToolbarSections: [
    {
      key: "buttonSettings",
      label: "Button Settings",
      icon: "ButtonIcon",
      component: <ButtonSettings />,
      priority: 1,
    },
  ],
};
