import type { ReactNode } from "react";

export default function Label({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mb-5 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.22em] text-cyan-300 ${className}`}
    >
      <span className="h-px w-8 bg-cyan-300/70" />
      {children}
    </div>
  );
}
