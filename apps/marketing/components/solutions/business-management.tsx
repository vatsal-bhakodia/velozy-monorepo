"use client";

import { useId, useState, type CSSProperties } from "react";
import { ArrowRight, ChevronDown, LayoutDashboard } from "lucide-react";
import { PrimaryLink } from "@/components/landing/primary-link";
import type { BentoTheme } from "./capabilities-bento";
import {
  AnalyticsPreview,
  ClientsPreview,
  PaymentsPreview,
  SeoPreview,
  TeamPreview,
  type BusinessPreviewContent,
} from "./business-previews";

const previews = {
  clients: ClientsPreview,
  analytics: AnalyticsPreview,
  team: TeamPreview,
  seo: SeoPreview,
  payments: PaymentsPreview,
};

export type BusinessManagementContent = {
  eyebrow: string;
  headline: string;
  action: string;
  note: string;
  items: { key: keyof typeof previews; title: string; description: string }[];
  preview: BusinessPreviewContent;
};

export function BusinessManagement({
  content,
  theme,
  startUrl,
}: {
  content: BusinessManagementContent;
  theme: BentoTheme;
  startUrl: string;
}) {
  const id = useId();
  const [active, setActive] = useState(content.items[0]?.key);
  const palette = {
    "--business-canvas": theme.canvas,
    "--business-card": theme.card,
    "--business-border": theme.border,
    "--business-accent": theme.accentText,
    "--business-muted": theme.muted,
    "--business-text": theme.text,
    "--business-stage": theme.darkSurface,
    "--business-light": theme.lightSurface,
    "--business-ink": theme.lightText,
    "--business-action": theme.accent,
  } as CSSProperties;

  return (
    <section
      style={palette}
      aria-labelledby={`${id}-heading`}
      className="border-y border-[var(--business-border)] bg-[var(--business-canvas)] px-5 py-20 text-[var(--business-text)] sm:px-8 sm:py-24 lg:px-12 lg:py-28"
    >
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-10 flex flex-col items-start justify-between gap-6 sm:mb-14 lg:flex-row lg:items-center">
          <div className="max-w-[780px]">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[.18em] text-[var(--business-accent)]">
              {content.eyebrow}
            </p>
            <h2
              id={`${id}-heading`}
              className="text-[clamp(2rem,4.2vw,4rem)] font-medium leading-[1.08] tracking-[-.06em]"
            >
              {content.headline}
            </h2>
          </div>
          <PrimaryLink
            href={startUrl}
            variant="white"
            size="large"
            icon={<ArrowRight size={16} aria-hidden="true" />}
            className="shrink-0 !bg-[var(--business-action)] !text-white hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--business-accent)]"
          >
            {content.action}
          </PrimaryLink>
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)] lg:gap-x-7 lg:gap-y-3">
          {content.items.map((item, index) => {
            const expanded = active === item.key;
            const Preview = previews[item.key];
            return (
              <div key={item.key} className="contents">
                <div
                  style={{ "--item-row": index + 1 } as CSSProperties}
                  className={`self-start rounded-md border lg:col-start-1 lg:[grid-row:var(--item-row)] ${expanded ? "border-[var(--business-accent)] bg-[var(--business-card)]" : "border-[var(--business-border)] bg-[var(--business-card)]"}`}
                >
                  <h3>
                    <button
                      type="button"
                      id={`${id}-${item.key}-trigger`}
                      aria-expanded={expanded}
                      aria-disabled={expanded}
                      aria-controls={`${id}-${item.key}-panel`}
                      onClick={() => setActive(item.key)}
                      className="flex min-h-16 w-full items-center justify-between gap-4 rounded-md px-5 py-4 text-left text-lg font-medium tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--business-accent)] sm:px-6 sm:text-xl"
                    >
                      {item.title}
                      <ChevronDown
                        aria-hidden="true"
                        size={20}
                        className={`shrink-0 text-[var(--business-accent)] motion-safe:transition-transform ${expanded ? "rotate-180" : ""}`}
                      />
                    </button>
                  </h3>
                  <div
                    aria-hidden={!expanded}
                    inert={!expanded}
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none ${expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <p className="px-5 pb-6 pt-3 text-sm leading-7 text-[var(--business-muted)] sm:px-6 lg:min-h-32">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
                <div
                  id={`${id}-${item.key}-panel`}
                  role="region"
                  aria-labelledby={`${id}-${item.key}-trigger`}
                  aria-hidden={!expanded}
                  inert={!expanded}
                  style={
                    {
                      "--preview-row": `1 / span ${content.items.length}`,
                    } as CSSProperties
                  }
                  className={`grid min-w-0 overflow-hidden transition-[grid-template-rows,opacity,transform] duration-500 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none lg:col-start-2 lg:[grid-row:var(--preview-row)] lg:flex lg:items-center ${expanded ? "grid-rows-[1fr] translate-y-0 opacity-100" : "pointer-events-none grid-rows-[0fr] -translate-y-2 opacity-0"}`}
                >
                  <figure className="min-h-0 w-full min-w-0 overflow-hidden rounded-md bg-[var(--business-stage)] p-4 sm:p-8 lg:p-9">
                    <div className="overflow-hidden rounded-md bg-white text-slate-900 shadow-xl">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
                        <span className="flex items-center gap-2 text-xs font-semibold">
                          <LayoutDashboard size={16} aria-hidden="true" />
                          {content.preview.business}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Dashboard
                        </span>
                      </div>
                      <div className="min-h-[360px] p-5 sm:p-7">
                        <Preview content={content.preview} />
                      </div>
                    </div>
                    <figcaption className="pt-4 text-xs leading-5 text-[var(--business-muted)]">
                      Illustrative dashboard preview. Feature availability
                      depends on your plan and enabled modules.
                    </figcaption>
                  </figure>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-6 max-w-2xl text-xs leading-6 text-[var(--business-muted)]">
          {content.note}
        </p>
      </div>
    </section>
  );
}
