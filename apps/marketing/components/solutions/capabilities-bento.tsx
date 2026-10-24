import {
  ArrowUpRight,
  CalendarDays,
  Clock3,
  MapPin,
  Menu,
  Plus,
  Sparkles,
} from "lucide-react";
import type { CSSProperties } from "react";
import { IndustryImage } from "./industry-image";

const styles = {
  section:
    "border-t border-[var(--bento-border)] bg-[var(--bento-canvas)] px-5 py-20 text-[var(--bento-text)] sm:px-8 sm:py-24 lg:px-12 lg:py-28",
  heading: "mx-auto max-w-[840px] text-center",
  eyebrow:
    "mb-4 text-[11px] font-semibold uppercase tracking-[.18em] text-[var(--bento-accent-text)]",
  headline:
    "text-[clamp(2rem,4.2vw,4rem)] font-medium leading-[1.08] tracking-[-.06em]",
  description:
    "mx-auto mt-5 max-w-[680px] text-[15px] leading-[1.8] text-[var(--bento-muted)]",
  note: "mx-auto mt-[18px] max-w-[920px] text-center text-xs leading-[1.7] text-[var(--bento-muted)]",
  grid: "mt-14 grid grid-cols-12 gap-4 max-[1100px]:grid-cols-2 max-[639px]:mt-8 max-[639px]:grid-cols-1",
  card: "group min-w-0 overflow-hidden rounded-md border border-[var(--bento-border)] bg-[var(--bento-card)]",
  cardLayout: [
    "col-span-6 max-[1100px]:col-span-1",
    "col-span-3 max-[1100px]:col-span-1",
    "col-span-3 max-[1100px]:col-span-1",
    "col-span-3 max-[1100px]:col-span-1",
    "col-span-5 max-[1100px]:col-span-1",
    "col-span-4 max-[1100px]:col-span-1",
  ],
  visual:
    "relative h-[280px] overflow-hidden bg-[var(--bento-dark-surface)] max-[639px]:h-[260px]",
  copy: "p-[26px_28px_30px]",
  title: "text-2xl font-medium leading-[1.2] tracking-[-.04em]",
  body: "mt-3 text-sm leading-[1.8] text-[var(--bento-muted)]",
  photo:
    "object-cover transition-transform duration-[600ms] motion-safe:group-hover:scale-[1.035]",
  services: "relative h-full",
  subscription: "relative h-full",
  serviceMenu:
    "absolute inset-[20px_auto_20px_20px] w-[54%] rounded-md border border-[var(--bento-light-border)] bg-[var(--bento-light-surface)] p-[22px] text-[var(--bento-light-text)] shadow-[0_12px_30px_color-mix(in_srgb,var(--bento-dark-surface)_80%,transparent)] max-[1100px]:w-[65%] max-[639px]:inset-[14px_auto_14px_14px] max-[639px]:w-[62%] max-[639px]:p-[18px]",
  miniLabel: "block text-[8px] font-semibold uppercase tracking-[.16em]",
  previewHeading:
    "my-[10px] mb-4 text-[25px] font-medium leading-[1.1] tracking-[-.055em]",
  menuRow:
    "flex items-center justify-between border-t border-[var(--bento-light-border)] py-2 text-[10px]",
  miniNote: "mt-2 flex items-center gap-2 text-[8px] font-semibold",
  membershipCard:
    "absolute inset-3 flex flex-col overflow-hidden rounded-md border border-[var(--bento-light-border)] bg-[var(--bento-light-surface)] text-[var(--bento-light-text)] shadow-[0_12px_30px_color-mix(in_srgb,var(--bento-dark-surface)_60%,transparent)]",
  membershipImage: "relative flex-[0_0_82px] overflow-hidden",
  membershipContent: "flex min-h-0 flex-1 flex-col px-[13px] pt-[9px]",
  membershipTitle:
    "mt-[5px] text-lg font-medium leading-[1.05] tracking-[-.055em]",
  membershipDescription:
    "mt-1 text-[9px] leading-[1.5] text-[var(--bento-light-muted)]",
  membershipPlans: "-mx-[13px] mt-2 grid",
  membershipPlan:
    "flex min-h-11 items-center justify-between gap-2 border-t border-[var(--bento-light-border)] px-[13px] py-1.5",
  planTitle: "text-[9px] font-semibold leading-[1.2]",
  planPrice: "text-[8px] leading-[1.2] text-[var(--bento-light-muted)]",
  planAction:
    "inline-flex shrink-0 items-center gap-[5px] whitespace-nowrap rounded-md bg-[var(--bento-accent)] px-[10px] py-[7px] text-[8px] font-semibold text-[var(--bento-light-surface)]",
  portfolio:
    "relative flex h-full items-center gap-[10px] bg-[var(--bento-dark-surface)] p-5",
  galleryPhoto:
    "relative h-[200px] flex-1 overflow-hidden rounded-md border-[5px] border-[var(--bento-light-surface)] shadow-[0_15px_25px_#0003]",
  galleryTilt: [
    "-rotate-[8deg] -translate-y-3",
    "ml-[-35px] rotate-[8deg] translate-y-3",
  ],
  galleryLabel:
    "absolute inset-x-5 bottom-[15px] flex justify-between text-[10px] text-[var(--bento-light-surface)]",
  location:
    "relative h-full bg-[var(--bento-map)] text-[var(--bento-light-text)]",
  map: "absolute inset-0 overflow-hidden bg-[repeating-linear-gradient(0deg,transparent_0_42px,var(--bento-map-road)_42px_48px),repeating-linear-gradient(90deg,transparent_0_55px,var(--bento-map-road)_55px_61px)]",
  park: "absolute left-[18px] top-[18px] h-[92px] w-20 rounded-md bg-[var(--bento-map-park)]",
  roadOne:
    "absolute -top-20 left-[48%] h-[420px] w-[13px] rotate-[35deg] bg-[var(--bento-map-road)]",
  roadTwo:
    "absolute -top-20 left-[65%] h-[420px] w-[13px] -rotate-[50deg] bg-[var(--bento-map-road)]",
  pin: "absolute left-[48%] top-[65px] grid h-12 w-12 place-items-center rounded-full border-[6px] border-[var(--bento-map-road)] bg-[var(--bento-accent)] text-[var(--bento-light-surface)] shadow-[0_6px_0_color-mix(in_srgb,var(--bento-light-text)_13%,transparent)]",
  locationLabel:
    "absolute inset-x-[14px] bottom-[14px] rounded-md bg-[var(--bento-light-surface)] p-4",
  locationCopy:
    "mt-2 text-[13px] font-medium leading-[1.5] tracking-[-.03em] text-[var(--bento-light-text)]",
  enquiry: "relative flex h-full bg-[var(--bento-dark-surface)] p-5",
  enquiryPhoto: "relative w-[38%] overflow-hidden rounded-l-md",
  enquiryForm:
    "min-w-0 flex-1 rounded-r-md bg-[var(--bento-light-surface)] p-5 text-[var(--bento-light-text)]",
  enquiryHeading:
    "my-[10px] mb-3 text-[22px] font-medium leading-[1.1] tracking-[-.055em]",
  field:
    "border-b border-[var(--bento-light-border)] py-[9px] text-[9px] text-[var(--bento-light-muted)]",
  send: "mt-3 flex items-center justify-between rounded-md bg-[var(--bento-accent)] px-[10px] py-[9px] text-[9px] text-[var(--bento-light-surface)]",
  mobile:
    "relative h-full bg-[radial-gradient(ellipse_at_bottom_right,var(--bento-accent),var(--bento-dark-surface)_70%)]",
  mobileWord:
    "absolute left-[22px] top-[35px] text-[clamp(24px,2.3vw,32px)] leading-[1.05] tracking-[-.07em] text-[var(--bento-accent-text)] max-[1100px]:text-[26px] max-[639px]:text-[30px]",
  phone:
    "absolute right-6 top-[30px] w-[145px] rotate-[9deg] rounded-[20px] border border-[var(--bento-light-border)] bg-[var(--bento-dark-surface)] p-1 shadow-[-14px_18px_35px_#0004] max-[1100px]:right-3 max-[1100px]:w-[120px]",
  phoneNav:
    "flex items-center justify-between p-[10px] text-[var(--bento-light-surface)]",
  phonePhoto: "relative h-[100px] overflow-hidden rounded-md",
  phoneCopy: "p-[12px_10px] text-[var(--bento-light-surface)]",
  phoneHeading: "my-2 text-[19px] font-medium leading-[1.05] tracking-[-.05em]",
  phoneMiniLabel: "text-[6px]",
  phoneAction: "flex justify-between text-[6px]",
} as const;

type MenuVisual = {
  image: string | null;
  imagePosition?: string;
  eyebrow: string;
  headline: string[];
  rows: string[];
  link: string;
};

type SubscriptionVisual = {
  image: string | null;
  imagePosition?: string;
  eyebrow: string;
  title: string;
  description: string;
  plans: [
    { title: string; price: string; action: string },
    { title: string; price: string; action: string },
  ];
};

type PortfolioVisual = {
  images: [string | null, string | null];
  label: string;
};

type LocationVisual = {
  eyebrow: string;
  lines: [string, string];
};

type EnquiryVisual = {
  image: string | null;
  imagePosition?: string;
  eyebrow: string;
  headline: string[];
  fields: [string, string];
  action: string;
};

type MobileVisual = {
  image: string | null;
  imagePosition?: string;
  display: [string, string];
  eyebrow: string;
  headline: [string, string];
  action: string;
};

type ScheduleVisual = {
  eyebrow: string;
  title: string;
  date: string;
  time: string;
  detail: string;
  action: string;
  note: string;
};

type CapabilityVisuals = {
  services: MenuVisual;
  subscription: SubscriptionVisual;
  portfolio: PortfolioVisual;
  location: LocationVisual;
  enquiry: EnquiryVisual;
  mobile: MobileVisual;
  schedule?: ScheduleVisual;
};

export type BentoTheme = {
  canvas: string;
  card: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  darkSurface: string;
  lightSurface: string;
  lightText: string;
  lightMuted: string;
  lightBorder: string;
  map: string;
  mapRoad: string;
  mapPark: string;
};

export type CapabilitiesBentoContent = {
  eyebrow: string;
  headline: string;
  description: string;
  note?: string;
  items: {
    title: string;
    description: string;
    visual: keyof CapabilityVisuals;
  }[];
  visuals: CapabilityVisuals;
};

type BentoStyle = CSSProperties & {
  [key: `--bento-${string}`]: string;
};

function Photo({ src, position }: { src: string | null; position?: string }) {
  return (
    <IndustryImage
      src={src}
      alt=""
      sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 600px"
      className={styles.photo}
      position={position}
    />
  );
}

function Lines({ children }: { children: string[] }) {
  return (
    <>
      {children.map((line, index) => (
        <span key={`${line}-${index}`}>
          {index > 0 ? <br /> : null}
          {line}
        </span>
      ))}
    </>
  );
}

function Visual({
  kind,
  content,
}: {
  kind: keyof CapabilityVisuals;
  content: CapabilityVisuals[keyof CapabilityVisuals];
}) {
  switch (kind) {
    case "services": {
      const visual = content as MenuVisual;
      return (
        <div className={styles.services}>
          <Photo
            src={visual.image}
            position={visual.imagePosition ?? "85% 35%"}
          />
          <div className={styles.serviceMenu}>
            <span className={styles.miniLabel}>{visual.eyebrow}</span>
            <p className={styles.previewHeading}>
              <Lines>{visual.headline}</Lines>
            </p>
            {visual.rows.map((row) => (
              <div className={styles.menuRow} key={row}>
                <span>{row}</span>
                <Plus size={12} />
              </div>
            ))}
            <span className={styles.miniNote}>
              {visual.link}
              <ArrowUpRight size={12} />
            </span>
          </div>
        </div>
      );
    }
    case "subscription": {
      const visual = content as SubscriptionVisual;
      return (
        <div className={styles.subscription}>
          <div className={styles.membershipCard}>
            <div className={styles.membershipImage}>
              <Photo src={visual.image} position={visual.imagePosition} />
            </div>
            <div className={styles.membershipContent}>
              <span className={styles.miniLabel}>{visual.eyebrow}</span>
              <p className={styles.membershipTitle}>{visual.title}</p>
              <p className={styles.membershipDescription}>
                {visual.description}
              </p>
              <div className={styles.membershipPlans}>
                {visual.plans.map((plan) => (
                  <div className={styles.membershipPlan} key={plan.title}>
                    <div>
                      <span className={styles.planTitle}>{plan.title}</span>
                      <span className={styles.planPrice}>{plan.price}</span>
                    </div>
                    <span className={styles.planAction}>
                      {plan.action}
                      <ArrowUpRight size={11} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }
    case "portfolio": {
      const visual = content as PortfolioVisual;
      return (
        <div className={styles.portfolio}>
          {visual.images.map((image, index) => (
            <div
              className={`${styles.galleryPhoto} ${styles.galleryTilt[index]}`}
              key={`${image}-${index}`}
            >
              <Photo src={image} />
            </div>
          ))}
          <div className={styles.galleryLabel}>
            {visual.label}
            <ArrowUpRight size={15} />
          </div>
        </div>
      );
    }
    case "location": {
      const visual = content as LocationVisual;
      return (
        <div className={styles.location}>
          <div className={styles.map}>
            <span className={styles.park} />
            <span className={styles.roadOne} />
            <span className={styles.roadTwo} />
            <span className={styles.pin}>
              <MapPin size={23} />
            </span>
          </div>
          <div className={styles.locationLabel}>
            <span className={styles.miniLabel}>{visual.eyebrow}</span>
            <p className={styles.locationCopy}>
              <Lines>{visual.lines}</Lines>
            </p>
          </div>
        </div>
      );
    }
    case "enquiry": {
      const visual = content as EnquiryVisual;
      return (
        <div className={styles.enquiry}>
          <div className={styles.enquiryPhoto}>
            <Photo src={visual.image} position={visual.imagePosition} />
          </div>
          <div className={styles.enquiryForm}>
            <span className={styles.miniLabel}>{visual.eyebrow}</span>
            <p className={styles.enquiryHeading}>
              <Lines>{visual.headline}</Lines>
            </p>
            {visual.fields.map((field) => (
              <div className={styles.field} key={field}>
                {field}
              </div>
            ))}
            <div className={styles.send}>
              {visual.action}
              <ArrowUpRight size={13} />
            </div>
          </div>
        </div>
      );
    }
    case "mobile": {
      const visual = content as MobileVisual;
      return (
        <div className={styles.mobile}>
          <span className={styles.mobileWord}>
            <Lines>{visual.display}</Lines>
          </span>
          <div className={styles.phone}>
            <div className={styles.phoneNav}>
              <Sparkles size={13} />
              <Menu size={13} />
            </div>
            <div className={styles.phonePhoto}>
              <Photo src={visual.image} position={visual.imagePosition} />
            </div>
            <div className={styles.phoneCopy}>
              <span className={`${styles.miniLabel} ${styles.phoneMiniLabel}`}>
                {visual.eyebrow}
              </span>
              <p className={styles.phoneHeading}>
                <Lines>{visual.headline}</Lines>
              </p>
              <span className={styles.phoneAction}>
                {visual.action}
                <ArrowUpRight size={10} />
              </span>
            </div>
          </div>
        </div>
      );
    }
    case "schedule": {
      const visual = content as ScheduleVisual;
      return (
        <div className="flex h-full items-center justify-center bg-[var(--bento-dark-surface)] p-5">
          <div className="w-full max-w-[360px] rounded-md border border-[var(--bento-light-border)] bg-[var(--bento-light-surface)] p-5 text-[var(--bento-light-text)] shadow-[0_12px_30px_#0003]">
            <span className={styles.miniLabel}>{visual.eyebrow}</span>
            <div className="mt-3 flex items-center gap-2">
              <CalendarDays
                size={17}
                className="text-[var(--bento-accent)]"
                aria-hidden="true"
              />
              <p className="text-lg font-medium leading-tight tracking-[-.04em]">
                {visual.title}
              </p>
            </div>
            <div className="mt-4 rounded-md border border-[var(--bento-light-border)] p-3">
              <p className="text-[10px] font-semibold">{visual.date}</p>
              <div className="mt-2 flex items-center gap-2 text-[10px]">
                <Clock3
                  size={13}
                  className="text-[var(--bento-accent)]"
                  aria-hidden="true"
                />
                <span className="font-semibold">{visual.time}</span>
                <span className="text-[var(--bento-light-muted)]">
                  {visual.detail}
                </span>
              </div>
            </div>
            <div className="mt-3 rounded-md bg-[var(--bento-accent)] px-3 py-2 text-center text-[9px] font-semibold text-[var(--bento-light-surface)]">
              {visual.action}
            </div>
            <p className="mt-2 text-[8px] leading-3 text-[var(--bento-light-muted)]">
              {visual.note}
            </p>
          </div>
        </div>
      );
    }
  }
}

export function CapabilitiesBento({
  content,
  theme,
}: {
  content: CapabilitiesBentoContent;
  theme: BentoTheme;
}) {
  const style: BentoStyle = {
    "--bento-canvas": theme.canvas,
    "--bento-card": theme.card,
    "--bento-border": theme.border,
    "--bento-text": theme.text,
    "--bento-muted": theme.muted,
    "--bento-accent": theme.accent,
    "--bento-accent-text": theme.accentText,
    "--bento-dark-surface": theme.darkSurface,
    "--bento-light-surface": theme.lightSurface,
    "--bento-light-text": theme.lightText,
    "--bento-light-muted": theme.lightMuted,
    "--bento-light-border": theme.lightBorder,
    "--bento-map": theme.map,
    "--bento-map-road": theme.mapRoad,
    "--bento-map-park": theme.mapPark,
  };
  return (
    <section className={styles.section} style={style}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>{content.eyebrow}</p>
        <h2 className={styles.headline}>{content.headline}</h2>
        <p className={styles.description}>{content.description}</p>
      </div>
      <div className={styles.grid}>
        {content.items.map((item, index) => (
          <article
            className={`${styles.card} ${styles.cardLayout[index] ?? "col-span-4 max-[1100px]:col-span-1"}`}
            key={item.title}
          >
            <div className={styles.visual} aria-hidden="true">
              <Visual
                kind={item.visual}
                content={content.visuals[item.visual]!}
              />
            </div>
            <div className={styles.copy}>
              <h3 className={styles.title}>{item.title}</h3>
              <p className={styles.body}>{item.description}</p>
            </div>
          </article>
        ))}
      </div>
      {content.note ? <p className={styles.note}>{content.note}</p> : null}
    </section>
  );
}
