import type { ButtonHTMLAttributes, ComponentType, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/src/lib/utils";

type ToolbarButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ComponentType<{ className?: string }>;
  trailingIcon?: ComponentType<{ className?: string }>;
  children: ReactNode;
};

export function ToolbarButton({ icon: Icon, trailingIcon: TrailingIcon, children, className, ...props }: ToolbarButtonProps) {
  return (
    <Button variant="toolbar" size="sm" className={cn("h-11 px-4 md:h-9", className)} {...props}>
      {Icon && <Icon className="mr-2 h-3.5 w-3.5 shrink-0" />}
      {children}
      {TrailingIcon && <TrailingIcon className="ml-2 h-3.5 w-3.5 shrink-0" />}
    </Button>
  );
}
