import { ArrowUpRight } from "lucide-react";
import type { CSSProperties } from "react";
import type { BentoTheme } from "./capabilities-bento";
import { IndustryImage } from "./industry-image";

const styles = {
  section:
    "bg-[var(--use-case-canvas)] px-5 py-20 text-[var(--use-case-text)] sm:px-8 sm:py-24 lg:px-12 lg:py-28",
  inner: "mx-auto max-w-[1440px]",
  heading: "max-w-[840px]",
  eyebrow:
    "mb-4 text-[11px] font-semibold uppercase tracking-[.18em] text-[var(--use-case-accent)]",
  headline:
    "text-[clamp(2rem,4.2vw,4rem)] font-medium leading-[1.08] tracking-[-.06em]",
  description:
    "mt-[22px] max-w-[720px] text-base leading-[1.8] text-[var(--use-case-muted)]",
  grid: "mt-12 grid grid-cols-3 gap-5 min-[768px]:max-[1100px]:grid-cols-2 max-[767px]:mt-8 max-[767px]:grid-cols-1",
  card: "group flex min-w-0 flex-col overflow-hidden rounded-md border border-[var(--use-case-border)] bg-[var(--use-case-card)]",
  cardOddTablet:
    "min-[768px]:max-[1100px]:col-span-2 min-[768px]:max-[1100px]:grid min-[768px]:max-[1100px]:grid-cols-2",
  visual: "relative h-[210px] overflow-hidden bg-[var(--use-case-surface)]",
  oddTabletVisual:
    "min-[768px]:max-[1100px]:h-full min-[768px]:max-[1100px]:min-h-[240px]",
  photo:
    "object-cover transition-transform duration-[600ms] motion-safe:group-hover:scale-[1.035]",
  copy: "flex flex-1 flex-col p-6",
  title: "text-[22px] font-medium leading-[1.25] tracking-[-.04em]",
  summary: "my-3 mb-5 text-sm leading-[1.85] text-[var(--use-case-muted)]",
  action:
    "mt-auto flex min-h-12 items-center justify-between gap-[14px] rounded-sm pt-2 text-[13px] font-semibold leading-[1.5] text-[var(--use-case-accent)] hover:underline hover:underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[6px] focus-visible:outline-[var(--use-case-accent)]",
} as const;

export type IndustryUseCasesContent = {
  eyebrow: string;
  headline: string;
  description: string;
  items: {
    title: string;
    description: string;
    image: string | null;
    imageAlt: string;
    imagePosition?: string;
    action: string;
  }[];
};

export function IndustryUseCases({
  content,
  theme,
  startUrl,
}: {
  content: IndustryUseCasesContent;
  theme: BentoTheme;
  startUrl: string;
}) {
  const palette = {
    "--use-case-canvas": theme.canvas,
    "--use-case-card": theme.card,
    "--use-case-text": theme.text,
    "--use-case-muted": theme.muted,
    "--use-case-border": theme.border,
    "--use-case-accent": theme.accentText,
    "--use-case-surface": theme.darkSurface,
  } as CSSProperties;

  return (
    <section
      className={styles.section}
      style={palette}
      aria-labelledby="industry-use-cases-heading"
    >
      <div className={styles.inner}>
        <div className={styles.heading}>
          <p className={styles.eyebrow}>{content.eyebrow}</p>
          <h2 id="industry-use-cases-heading" className={styles.headline}>
            {content.headline}
          </h2>
          <p className={styles.description}>{content.description}</p>
        </div>
        <div className={styles.grid}>
          {content.items.map((item, index) => {
            const isLastOdd =
              index === content.items.length - 1 &&
              content.items.length % 2 === 1;

            return (
              <article
                className={`${styles.card} ${isLastOdd ? styles.cardOddTablet : ""}`}
                key={item.title}
              >
                <div
                  className={`${styles.visual} ${isLastOdd ? styles.oddTabletVisual : ""}`}
                >
                  <IndustryImage
                    src={item.image}
                    alt={item.imageAlt}
                    sizes="(max-width: 767px) 92vw, (max-width: 1100px) 45vw, 30vw"
                    className={styles.photo}
                    position={item.imagePosition}
                  />
                </div>
                <div className={styles.copy}>
                  <h3 className={styles.title}>{item.title}</h3>
                  <p className={styles.summary}>{item.description}</p>
                  <a className={styles.action} href={startUrl}>
                    {item.action}
                    <ArrowUpRight size={17} aria-hidden="true" />
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
