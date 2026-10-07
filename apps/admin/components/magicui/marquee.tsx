import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/src/lib/utils";

export function Marquee({ children, className, repeat = 4, pauseOnHover: _pauseOnHover, reverse: _reverse, ...props }: ComponentPropsWithoutRef<"div"> & { children: ReactNode; repeat?: number; pauseOnHover?: boolean; reverse?: boolean }) {
  return (
    <div
      {...props}
      className={cn(
        "flex overflow-hidden",
        _pauseOnHover && "marquee-pause",
        className,
      )}
    >
      <div
        className={cn(
          "marquee-track flex w-max shrink-0 gap-2 pr-2",
          _reverse && "marquee-track-reverse",
        )}
      >
        {Array.from({ length: repeat }, (_, index) => (
          <div key={index} className="flex shrink-0 gap-2">
            {children}
          </div>
        ))}
      </div>
    </div>
  );
}
