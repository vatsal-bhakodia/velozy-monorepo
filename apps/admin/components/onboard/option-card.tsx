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
      title={`${label}: ${description}`}
      onClick={onClick}
      className={`relative flex min-h-[4.25rem] w-full items-center gap-2.5 rounded-md border px-3 py-2.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-neutral-300 dark:focus-visible:ring-offset-[#202124] ${
        active
          ? "border-transparent bg-neutral-100 shadow-none dark:bg-[#171719]"
          : "border-slate-200/90 bg-slate-50/70 hover:border-slate-300 hover:bg-white dark:border-white/[0.09] dark:bg-white/[0.035] dark:hover:border-white/20 dark:hover:bg-white/[0.06]"
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-neutral-200 text-neutral-700 transition-colors dark:bg-[#3a3b3e] dark:text-neutral-200`}
      >
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium leading-5 text-slate-800 dark:text-neutral-50">
          {label}
        </p>
        <p className="mt-0.5 truncate whitespace-nowrap text-xs leading-4 text-slate-500 dark:text-neutral-400">
          {description}
        </p>
      </div>
    </button>
  );
}

type OptionGroupProps = {
  title?: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: ReactNode;
};

export function OptionGroup({
  title,
  description,
  icon,
  children,
}: OptionGroupProps) {
  const Icon = icon;

  return (
    <section className="flex flex-col gap-3">
      <div>
        {title ? (
          <>
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              {Icon && (
                <Icon className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
              )}
              {title}
            </div>
            <p className="mt-1 text-[13px] leading-5 text-neutral-500 dark:text-neutral-400">
              {description}
            </p>
          </>
        ) : (
          <div className="flex items-center gap-1.5 text-sm leading-5 text-neutral-500 dark:text-neutral-400">
            {Icon && (
              <Icon className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
            )}
            <p>{description}</p>
          </div>
        )}
      </div>
      {children}
    </section>
  );
}
