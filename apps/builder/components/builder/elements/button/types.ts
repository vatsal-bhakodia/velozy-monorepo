export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "accent"
  | "muted";

export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = {
  text: string;
  style?: React.CSSProperties;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  href?: string;
  target?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
};
