"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { useInView } from "framer-motion";
import {
  ArrowUpRight,
  Check,
  Globe2,
  GripVertical,
  LayoutTemplate,
  MousePointer2,
  Plus,
  MessageSquare,
} from "lucide-react";
import type { BentoTheme } from "./capabilities-bento";
import { IndustryImage } from "./industry-image";

const styles = {
  section:
    "px-5 py-[88px] text-[var(--steps-text)] sm:px-8 sm:py-24 lg:px-12 lg:py-28",
  inner: "mx-auto max-w-[1440px]",
  heading: "mx-auto max-w-[850px] text-center",
  eyebrow:
    "mb-4 text-xs font-semibold uppercase tracking-[.2em] text-[var(--steps-highlight)]",
  headline:
    "text-[clamp(2rem,4.2vw,4rem)] font-medium leading-[1.08] tracking-[-.06em]",
  description:
    "mx-auto mt-[22px] max-w-[660px] text-[15px] leading-[1.8] text-[var(--steps-muted)]",
  grid: "mt-[52px] grid list-none grid-cols-3 gap-[18px] p-0 max-[1023px]:mt-9 max-[1023px]:grid-cols-1",
  card: "flex min-w-0 flex-col overflow-hidden rounded-md border border-[var(--steps-border)] bg-[var(--steps-card)]",
  copy: "flex-1 p-7 min-[1024px]:max-[1100px]:p-5 max-[1023px]:px-6 max-[1023px]:pt-6 max-[1023px]:pb-0",
  stepLine:
    "mb-[26px] flex items-center justify-between text-[var(--steps-highlight)] max-[1023px]:mb-[18px]",
  number:
    "grid h-[38px] w-[38px] place-items-center rounded-md border border-[var(--steps-border)] bg-[var(--steps-surface)] text-xs tabular-nums",
  title:
    "max-w-[290px] text-[clamp(21px,2vw,27px)] font-medium leading-[1.2] tracking-[-.04em] max-[1023px]:max-w-none",
  body: "mt-[14px] text-sm leading-[1.8] text-[var(--steps-muted)]",
  visual:
    "relative flex min-h-[310px] items-center overflow-hidden bg-[radial-gradient(ellipse_at_50%_110%,color-mix(in_srgb,var(--steps-accent)_45%,transparent),transparent_75%)] p-7 min-[1024px]:max-[1100px]:p-4",
  previewSurface:
    "relative w-full rounded-md border border-[var(--steps-border)] bg-[var(--steps-surface)] shadow-[0_16px_30px_#0003] max-[1023px]:mx-auto max-[1023px]:max-w-[350px]",
  brief: "p-5 min-[1024px]:max-[1100px]:p-[14px]",
  visualLabel:
    "flex items-center gap-2 text-xs font-medium text-[var(--steps-highlight)]",
  conversation: "mt-5 grid gap-4",
  exchange: "flex flex-col gap-3",
  question:
    "m-0 max-w-[95%] text-[13px] leading-[1.65] text-[var(--steps-text)]",
  answer:
    "m-0 max-w-[90%] self-end rounded-md border border-[var(--steps-border)] bg-[var(--steps-accent)] px-[14px] py-[10px] text-[13px] leading-[1.5] text-[var(--steps-text)]",
  focusLabel:
    "mb-[10px] mt-5 text-[13px] leading-[1.65] text-[var(--steps-text)]",
  options: "flex flex-wrap gap-2",
  option:
    "inline-flex items-center gap-1.5 rounded-md border border-[var(--steps-border)] px-[10px] py-2 text-xs leading-[1.4]",
  selectedOption:
    "border-[var(--steps-highlight)] bg-[var(--steps-accent)] text-[var(--steps-text)]",
  plan: "p-5 min-[1024px]:max-[1100px]:p-[14px]",
  pages: "mt-[18px] grid gap-2",
  page: "flex items-center gap-[9px] rounded-md border border-[var(--steps-border)] bg-[var(--steps-card)] px-[10px] py-[11px] text-[var(--steps-highlight)]",
  pageTitle: "min-w-0 flex-1 text-xs text-[var(--steps-text)]",
  addPage:
    "mt-[10px] flex items-center justify-center gap-2 text-[var(--steps-muted)]",
  addPageLine: "h-[3px] w-[34px] bg-[var(--steps-border)]",
  editor:
    "relative w-full rounded-md border border-[var(--steps-border)] bg-[var(--steps-surface)] shadow-[0_16px_30px_#0003]",
  toolbar:
    "flex items-center justify-between p-3 text-[11px] text-[var(--steps-highlight)]",
  toolbarLabel: "flex items-center gap-1.5",
  dot: "h-[5px] w-[5px] rounded-full bg-[var(--steps-highlight)]",
  website:
    "relative mx-[7px] mb-[7px] rounded-md bg-[var(--steps-paper)] p-[14px] text-[var(--steps-ink)] min-[1024px]:max-[1100px]:p-[10px]",
  brand: "flex justify-between text-[11px] font-semibold tracking-[.08em]",
  siteHero:
    "mt-4 grid grid-cols-2 items-center gap-3 min-[1024px]:max-[1100px]:gap-2",
  siteHeadline:
    "text-[clamp(19px,1.9vw,28px)] font-medium leading-[1.05] tracking-[-.06em] max-[1023px]:text-[28px]",
  siteLink: "mt-5 flex items-center gap-2",
  siteLinkLine: "h-[3px] w-[30px] bg-[var(--steps-accent)]",
  photo:
    "relative h-[142px] overflow-hidden rounded-md outline outline-1 outline-[var(--steps-accent)] [outline-offset:3px]",
  cursor:
    "absolute bottom-[14px] right-4 text-[var(--steps-paper)] [filter:drop-shadow(0_2px_2px_#0004)] [&>path]:fill-[var(--steps-accent)]",
  published:
    "absolute -bottom-[18px] right-2 flex items-center gap-2 rounded-md border border-[var(--steps-border)] bg-[var(--steps-paper)] px-[14px] py-[10px] text-xs font-semibold text-[var(--steps-ink)] shadow-[0_8px_18px_#0003]",
  publishedIcon:
    "grid h-[22px] w-[22px] place-items-center rounded-full bg-[var(--steps-accent)] text-[var(--steps-paper)]",
  revealAnswer: "group-data-[visible=true]:motion-safe:animate-steps-answer",
  revealContent: "group-data-[visible=true]:motion-safe:animate-steps-content",
  revealPage:
    "group-data-[visible=true]:motion-safe:animate-steps-page group-data-[visible=true]:motion-safe:[animation-delay:calc(.4s_+_var(--row)_*_0.16s)]",
  moveCursor: "group-data-[visible=true]:motion-safe:animate-steps-cursor",
  revealPublished:
    "group-data-[visible=true]:motion-safe:animate-steps-published",
} as const;

export type CreationStepsContent = {
  eyebrow: string;
  headline: string;
  description: string;
  items: [
    { title: string; description: string },
    { title: string; description: string },
    { title: string; description: string },
  ];
  preview: {
    briefLabel: string;
    conversation: { question: string; answer: string }[];
    focusLabel: string;
    focusOptions: { label: string; selected: boolean }[];
    planLabel: string;
    pages: string[];
    editorLabel: string;
    brand: string;
    headline: string;
    image: string | null;
    imageAlt: string;
    publishLabel: string;
  };
};

function StepCard({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLLIElement>(null);
  const visible = useInView(ref, { once: true, amount: 0.35 });

  return (
    <li
      ref={ref}
      data-visible={visible ? "true" : "false"}
      className={`group ${styles.card}`}
    >
      {children}
    </li>
  );
}

export function CreationSteps({
  content,
  theme,
}: {
  content: CreationStepsContent;
  theme: BentoTheme;
}) {
  const palette = {
    "--steps-card": theme.card,
    "--steps-border": theme.border,
    "--steps-text": theme.text,
    "--steps-muted": theme.muted,
    "--steps-accent": theme.accent,
    "--steps-highlight": theme.accentText,
    "--steps-surface": theme.darkSurface,
    "--steps-paper": theme.lightSurface,
    "--steps-ink": theme.lightText,
  } as CSSProperties;
  const preview = content.preview;

  return (
    <section
      className={styles.section}
      style={palette}
      aria-labelledby="creation-steps-heading"
    >
      <div className={styles.inner}>
        <div className={styles.heading}>
          <p className={styles.eyebrow}>{content.eyebrow}</p>
          <h2 id="creation-steps-heading" className={styles.headline}>
            {content.headline}
          </h2>
          <p className={styles.description}>{content.description}</p>
        </div>
        <ol className={styles.grid}>
          {content.items.map((item, index) => (
            <StepCard key={item.title}>
              <div className={styles.copy}>
                <div className={styles.stepLine}>
                  <span className={styles.number}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {index < content.items.length - 1 ? (
                    <ArrowUpRight size={18} aria-hidden="true" />
                  ) : (
                    <Check size={18} aria-hidden="true" />
                  )}
                </div>
                <h3 className={styles.title}>{item.title}</h3>
                <p className={styles.body}>{item.description}</p>
              </div>
              <div className={styles.visual} aria-hidden="true">
                {index === 0 && (
                  <div className={`${styles.previewSurface} ${styles.brief}`}>
                    <div className={styles.visualLabel}>
                      <MessageSquare size={16} />
                      {preview.briefLabel}
                    </div>
                    <div className={styles.conversation}>
                      {preview.conversation.map((exchange) => (
                        <div
                          className={styles.exchange}
                          key={exchange.question}
                        >
                          <p className={styles.question}>{exchange.question}</p>
                          <p
                            className={`${styles.answer} ${styles.revealAnswer}`}
                          >
                            {exchange.answer}
                          </p>
                        </div>
                      ))}
                    </div>
                    <p
                      className={`${styles.focusLabel} ${styles.revealContent}`}
                    >
                      {preview.focusLabel}
                    </p>
                    <div
                      className={`${styles.options} ${styles.revealContent}`}
                    >
                      {preview.focusOptions.map((option) => (
                        <span
                          key={option.label}
                          className={`${styles.option} ${option.selected ? styles.selectedOption : ""}`}
                        >
                          {option.selected && <Check size={13} />}
                          {option.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {index === 1 && (
                  <div className={`${styles.previewSurface} ${styles.plan}`}>
                    <div className={styles.visualLabel}>
                      <LayoutTemplate size={14} />
                      {preview.planLabel}
                    </div>
                    <div className={styles.pages}>
                      {preview.pages.map((page, i) => (
                        <div
                          key={page}
                          className={styles.page}
                          style={{ "--row": i } as CSSProperties}
                        >
                          <GripVertical size={13} />
                          <span className={styles.pageTitle}>{page}</span>
                          <Check size={13} className={styles.revealPage} />
                        </div>
                      ))}
                    </div>
                    <div className={styles.addPage}>
                      <Plus size={14} />
                      <span className={styles.addPageLine} />
                    </div>
                  </div>
                )}
                {index === 2 && (
                  <div className={`${styles.previewSurface} ${styles.editor}`}>
                    <div className={styles.toolbar}>
                      <span className={styles.toolbarLabel}>
                        <span className={styles.dot} />
                        {preview.editorLabel}
                      </span>
                      <Globe2 size={12} />
                    </div>
                    <div className={styles.website}>
                      <div className={styles.brand}>
                        {preview.brand}
                        <span>—</span>
                      </div>
                      <div className={styles.siteHero}>
                        <div>
                          <p className={styles.siteHeadline}>
                            {preview.headline}
                          </p>
                          <span className={styles.siteLink}>
                            <span className={styles.siteLinkLine} />
                            <ArrowUpRight size={12} />
                          </span>
                        </div>
                        <div className={styles.photo}>
                          <IndustryImage
                            src={preview.image}
                            alt={preview.imageAlt}
                            sizes="(max-width: 1023px) 160px, 220px"
                          />
                        </div>
                      </div>
                      <MousePointer2
                        className={`${styles.cursor} ${styles.moveCursor}`}
                        size={23}
                      />
                    </div>
                    <div
                      className={`${styles.published} ${styles.revealPublished}`}
                    >
                      <span className={styles.publishedIcon}>
                        <Check size={13} />
                      </span>
                      {preview.publishLabel}
                    </div>
                  </div>
                )}
              </div>
            </StepCard>
          ))}
        </ol>
      </div>
    </section>
  );
}
