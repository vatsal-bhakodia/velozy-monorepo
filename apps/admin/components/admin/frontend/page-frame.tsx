"use client";

import { ReactNode } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import Link from "@/components/router-link";

export function PageTabs({
  items,
}: {
  items: Array<{ label: string; href: string; active: boolean }>;
}) {
  return (
    <nav
      aria-label="Page sections"
      className="flex flex-wrap gap-1 border-b border-neutral-200 dark:border-neutral-700"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/40 ${
            item.active
              ? "border-neutral-900 font-medium text-neutral-900 dark:border-white dark:text-white"
              : "border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function PageFrame({
  title,
  eyebrow,
  description,
  action,
  headerAction,
  aside,
  containerClassName,
  children,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  action?: string;
  headerAction?: ReactNode;
  aside?: ReactNode;
  containerClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className={aside ? undefined : "-mx-4"}>
      <div
        className={cn(
          "admin-editor mx-auto grid w-full max-w-[1600px] pb-8",
          aside
            ? "gap-x-0 lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_1fr]"
            : "px-5 sm:px-8 lg:px-12",
          containerClassName,
        )}
      >
        <header
          className={`mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-start ${aside ? "px-4 sm:px-6 lg:col-start-1 lg:row-start-1 lg:px-8" : ""}`}
        >
          <div>
            {eyebrow && (
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                {eyebrow}
              </p>
            )}
            <h1 className="text-lg font-medium text-neutral-950 dark:text-neutral-50">
              {title}
            </h1>
            {description && (
              <p className="mt-1.5 max-w-2xl text-sm text-neutral-500 dark:text-neutral-400">
                {description}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {headerAction}
            {action && (
              <button
                onClick={() =>
                  toast.success(`${action} is ready for backend integration`)
                }
                className="inline-flex items-center gap-2 rounded-md border border-neutral-900 bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-white"
              >
                <Plus className="h-4 w-4" />
                {action}
              </button>
            )}
          </div>
        </header>
        <main
          className={`min-w-0 ${aside ? "px-4 sm:px-6 lg:col-start-1 lg:row-start-2 lg:px-8" : ""}`}
        >
          {children}
        </main>
        {aside && (
          <aside className="min-w-0 lg:col-start-2 lg:row-start-2 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto lg:pr-6">
            {aside}
          </aside>
        )}
      </div>
    </div>
  );
}

export type StatCardItem = {
  label: string;
  value: string;
  note?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  noteTone?: "positive" | "negative" | "review" | "neutral";
};

export function StatCard({
  label,
  value,
  note,
  icon: Icon,
  iconColor = "text-neutral-500 dark:text-neutral-400",
  noteTone = "neutral",
}: StatCardItem) {
  const noteColor = {
    positive: "text-green-700 dark:text-green-400",
    negative: "text-red-700 dark:text-red-400",
    review: "text-amber-700 dark:text-amber-400",
    neutral: "text-neutral-500 dark:text-neutral-400",
  }[noteTone];

  return (
    <article className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
      {Icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800">
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </span>
      )}
      <p
        className={`text-sm font-medium text-neutral-600 dark:text-neutral-300 ${Icon ? "mt-5" : ""}`}
      >
        {label}
      </p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="text-2xl font-medium tracking-tight text-neutral-900 dark:text-white">
          {value}
        </p>
        {note && (
          <p className={`pb-1 text-[11px] font-normal ${noteColor}`}>{note}</p>
        )}
      </div>
    </article>
  );
}

export function StatStrip({ items }: { items: StatCardItem[] }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
      {items.map((item) => (
        <StatCard key={item.label} {...item} />
      ))}
    </div>
  );
}

export function StatusPill({
  children,
  tone = "cyan",
}: {
  children: ReactNode;
  tone?: "cyan" | "green" | "amber" | "red" | "neutral";
}) {
  const tones = {
    cyan: "border border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-300",
    green:
      "border border-green-200 bg-green-50 text-green-800 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300",
    amber:
      "border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
    red: "border border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
    neutral:
      "border border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${tones[tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export function SectionCard({
  title,
  description,
  headerAction,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  headerAction?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900 sm:p-6",
        className,
      )}
    >
      <div
        className={cn(
          children != null && "mb-5",
          Boolean(headerAction) &&
            "flex flex-wrap items-start justify-between gap-3",
        )}
      >
        <div>
          <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {description}
            </p>
          )}
        </div>
        {headerAction}
      </div>
      {children}
    </section>
  );
}

export function FieldHint({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`-mt-1 mb-2 text-xs text-neutral-500 dark:text-neutral-400 ${className}`}
    >
      {children}
    </p>
  );
}
