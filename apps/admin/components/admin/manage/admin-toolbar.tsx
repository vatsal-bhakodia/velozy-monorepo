import type { ReactNode } from "react";
import { cn } from "@/src/lib/utils";

export function AdminToolbar({
  leading,
  actions,
  className = "",
}: {
  leading?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-center justify-between gap-3", className)}>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{leading}</div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </div>
  );
}
