import { Check } from "lucide-react";
import type { ReactNode } from "react";

type OptionCardProps = {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
};

export function OptionCard({
  label,
  description,
  icon: Icon,
  active,
  onClick,
}: OptionCardProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`relative flex min-h-16 w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ${
        active
          ? "border-cyan-400 bg-white shadow-[0_0_0_3px_rgba(14,165,233,0.1)] dark:border-cyan-400 dark:bg-neutral-700"
          : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white dark:border-neutral-700 dark:bg-neutral-700 dark:hover:border-neutral-500 dark:hover:bg-neutral-600"
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${active ? "bg-cyan-500 text-white" : "border border-slate-200 bg-white text-slate-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold leading-tight text-slate-800 dark:text-neutral-50">
          {label}
        </p>
        <p className="mt-0.5 text-[10px] leading-snug text-slate-500 dark:text-neutral-400">
          {description}
        </p>
      </div>
      {active && <Check className="h-4 w-4 shrink-0 text-cyan-500" />}
    </button>
  );
}

type OptionGroupProps = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  children: ReactNode;
};

export function OptionGroup({
  title,
  description,
  icon: Icon,
  children,
}: OptionGroupProps) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-neutral-400">
          <Icon className="h-4 w-4 text-slate-500 dark:text-neutral-400" />
          {title}
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}
