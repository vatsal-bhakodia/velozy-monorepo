import { ComponentPropsWithoutRef, CSSProperties, FC } from "react";

import { cn } from "@/lib/utils";

export interface AnimatedShinyTextProps
  extends ComponentPropsWithoutRef<"span"> {
  shimmerWidth?: number;
}

export const AnimatedShinyText: FC<AnimatedShinyTextProps> = ({
  children,
  className,
  shimmerWidth = 60,
  ...props
}) => {
  return (
    <span
      style={
        {
          "--shiny-width": `${shimmerWidth}px`,
        } as CSSProperties
      }
      className={cn(
        "relative inline-block",
        className,
      )}
      {...props}
    >
      {children}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/90 to-transparent bg-no-repeat bg-clip-text text-transparent motion-safe:animate-shiny-text motion-reduce:animate-none motion-reduce:[background-position:50%_0] [background-size:var(--shiny-width)_100%]"
      >
        {children}
      </span>
    </span>
  );
};
