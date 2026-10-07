"use client";

import type { HTMLAttributes, MouseEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

type GlowCardGroupProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

type GlowCardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  contentClassName?: string;
  disableGlow?: boolean;
};

export function GlowCardGroup({
  children,
  className,
  onMouseMove,
  ...props
}: GlowCardGroupProps) {
  const updateGlowPosition = (event: MouseEvent<HTMLDivElement>) => {
    onMouseMove?.(event);

    for (const card of event.currentTarget.querySelectorAll<HTMLElement>(
      "[data-glow-card]",
    )) {
      const bounds = card.getBoundingClientRect();
      card.style.setProperty("--glow-x", `${event.clientX - bounds.left}px`);
      card.style.setProperty("--glow-y", `${event.clientY - bounds.top}px`);
    }
  };

  return (
    <div
      data-glow-card-group
      onMouseMove={updateGlowPosition}
      className={cn("glow-card-group", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function GlowCard({
  children,
  className,
  contentClassName,
  disableGlow = false,
  ...props
}: GlowCardProps) {
  return (
    <article
      data-glow-card
      data-glow-disabled={disableGlow || undefined}
      className={cn(
        "glow-card relative isolate overflow-hidden rounded-2xl bg-white/10",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "glow-card-content absolute inset-px overflow-hidden bg-[#090d13]",
          contentClassName,
        )}
      >
        {children}
      </div>
    </article>
  );
}
