import { ComponentPropsWithoutRef, FC } from "react";

import { cn } from "@/lib/utils";
import { AnimatedShinyText } from "@/components/magicui/animated-shiny-text";

export interface PillProps extends ComponentPropsWithoutRef<"span"> {
  textClassName?: string;
}

export const Pill: FC<PillProps> = ({
  children,
  className,
  textClassName,
  ...props
}) => (
  <span
    className={cn(
      "inline-flex rounded-full border border-white/15 bg-[#050505]/70 px-4 py-2 backdrop-blur-sm",
      className,
    )}
    {...props}
  >
    <AnimatedShinyText
      className={cn(
        "text-xs font-medium uppercase tracking-[.16em] text-white/80",
        textClassName,
      )}
    >
      {children}
    </AnimatedShinyText>
  </span>
);
