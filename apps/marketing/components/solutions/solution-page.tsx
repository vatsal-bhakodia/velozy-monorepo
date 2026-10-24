import type { CSSProperties } from "react";
import {
  CapabilitiesBento,
  type CapabilitiesBentoContent,
} from "./capabilities-bento";
import { ArrowRight } from "lucide-react";
import { adminUrl } from "@/lib/admin-url";
import { PrimaryLink } from "@/components/landing/primary-link";
import {
  HeroOfferCard,
  HeroSecondaryCard,
  type HeroSecondaryContent,
  type HeroOfferCardContent,
} from "./hero-previews";

import { CreationSteps, type CreationStepsContent } from "./creation-steps";

import {
  IndustryUseCases,
  type IndustryUseCasesContent,
} from "./industry-use-cases";

import { BusinessManagement } from "./business-management";
import { IndustryImage } from "./industry-image";
import { IndustryFaqItems } from "./industry-faq-items";
import {
  industryTheme,
  heroPreviewTheme,
  type IndustryPalette,
} from "./industry-theme";
import { managementContent } from "./management-content";

export type SolutionPageContent = {
  slug: string;
  name: string;
  metadata: { title: string; description: string };
  palette: IndustryPalette;
  hero: {
    eyebrow: string;
    headline: string;
    highlight: string;
    description: string;
    primaryAction: string;
    image: string | null;
    imageAlt: string;
    offerCard: HeroOfferCardContent;
    secondaryCard: HeroSecondaryContent;
  };
  inspiration: IndustryUseCasesContent;
  capabilities: CapabilitiesBentoContent;
  steps: CreationStepsContent;
  management: { businessName: string };
  faq: {
    eyebrow: string;
    headline: string;
    description: string;
    items: { question: string; answer: string }[];
  };
  finalCta: {
    eyebrow: string;
    headline: string;
    midHeadline: string;
    description: string;
    action: string;
  };
  related: { slug: string; label: string }[];
};

function HeroShowcase({
  content,
  palette,
}: {
  content: SolutionPageContent["hero"];
  palette: IndustryPalette;
}) {
  const previewTheme = heroPreviewTheme(palette);
  return (
    <figure className="mx-auto w-full max-w-[1440px] text-left">
      <div className="relative">
        <div className="relative mx-auto aspect-[3/2] w-full max-w-[1000px] overflow-hidden rounded-md border border-white/10 bg-black">
          <IndustryImage
            src={content.image}
            alt={content.imageAlt}
            priority
            sizes="(max-width: 768px) 92vw, (max-width: 1536px) 80vw, 1000px"
            className="object-cover"
          />
        </div>
        <div className="mt-4 grid grid-cols-1 items-start justify-items-center gap-3 px-1 sm:grid-cols-2 sm:gap-5 2xl:absolute 2xl:inset-0 2xl:mt-0 2xl:block 2xl:px-0">
          <div className="w-full max-w-[180px] 2xl:absolute 2xl:bottom-[13%] 2xl:left-[46px] 2xl:w-[180px]">
            <HeroOfferCard content={content.offerCard} theme={previewTheme} />
          </div>
          <div className="ml-auto w-full max-w-[190px] 2xl:absolute 2xl:right-[46px] 2xl:top-[14%] 2xl:w-[190px]">
            <HeroSecondaryCard
              content={content.secondaryCard}
              theme={previewTheme}
            />
          </div>
        </div>
      </div>
    </figure>
  );
}

function SectionHeading({
  eyebrow,
  headline,
  description,
  align = "left",
}: {
  eyebrow: string;
  headline: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div
      className={
        align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"
      }
    >
      <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--industry-pale)] sm:text-xs">
        {eyebrow}
      </p>
      <h2 className="text-[clamp(2rem,4.2vw,4rem)] font-medium leading-[1.08] tracking-[-0.06em]">
        {headline}
      </h2>
      {description ? (
        <p className="mt-5 max-w-[680px] text-[15px] leading-7 text-white/65 sm:text-lg sm:leading-8">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function SectionCta({ href, action }: { href: string; action: string }) {
  return (
    <PrimaryLink
      href={href}
      size="large"
      variant="white"
      className="!bg-[var(--industry-accent)] !text-white transition-[filter] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--industry-pale)]"
      icon={<ArrowRight className="h-4 w-4" />}
    >
      {action}
    </PrimaryLink>
  );
}

export function SolutionPage({ content }: { content: SolutionPageContent }) {
  const startUrl = adminUrl(
    `/onboard?industry=${encodeURIComponent(content.slug)}`,
  );
  const theme = industryTheme(content.palette);
  const pageStyle = {
    "--industry-accent": content.palette.accent,
    "--industry-pale": content.palette.pale,
    "--industry-surface": content.palette.surface,
  } as CSSProperties;

  return (
    <main
      style={pageStyle}
      className="min-h-screen overflow-x-clip bg-black font-[var(--font-montserrat)] text-white"
    >
      <section className="relative isolate min-h-[calc(100svh-72px)] overflow-hidden bg-black px-5 pb-8 pt-[clamp(1.5rem,4vh,3.5rem)] sm:px-8 sm:pb-10 lg:px-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[260px] z-0 h-[900px] w-[900px] -translate-x-1/2 rounded-full bg-[var(--industry-accent)] opacity-[.12] blur-3xl"
        />
        <div className="relative z-10 mx-auto max-w-[1440px] text-center">
          <p className="mb-5 inline-flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--industry-pale)] sm:text-xs">
            {content.hero.eyebrow}
          </p>
          <h1 className="mx-auto max-w-[1200px] text-balance text-[clamp(2.8rem,6.5vw,7rem)] font-medium leading-[.98] tracking-[-0.078em]">
            <span className="block">{content.hero.headline}</span>
            <span
              className="mx-auto mt-1 block max-w-full bg-clip-text pr-[.08em] text-[clamp(2.3rem,5.4vw,6.5rem)] leading-[1.02] text-transparent"
              style={{
                backgroundImage: `linear-gradient(90deg, ${content.palette.pale}, ${content.palette.accent})`,
              }}
            >
              {content.hero.highlight}
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-[620px] text-[15px] leading-7 text-white/65 sm:mt-7 sm:text-lg sm:leading-8">
            {content.hero.description}
          </p>
          <div className="mt-7 flex flex-col items-center">
            <PrimaryLink
              href={startUrl}
              size="large"
              variant="white"
              className="!bg-[var(--industry-accent)] !text-white transition-[filter] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--industry-pale)]"
              icon={<ArrowRight className="h-4 w-4" />}
            >
              {content.hero.primaryAction}
            </PrimaryLink>
          </div>
          <div className="mt-8 sm:mt-10">
            <HeroShowcase content={content.hero} palette={content.palette} />
          </div>
        </div>
      </section>

      <CapabilitiesBento content={content.capabilities} theme={theme} />

      <CreationSteps content={content.steps} theme={theme} />

      <section className="px-5 pb-10 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-6 rounded-md border border-[var(--industry-pale)]/25 bg-[var(--industry-surface)] p-7 sm:flex-row sm:items-center sm:p-10 lg:px-12">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--industry-pale)] sm:text-xs">
              {content.finalCta.eyebrow}
            </p>
            <h2 className="mt-3 max-w-2xl text-2xl font-medium leading-tight tracking-[-0.04em] sm:text-3xl">
              {content.finalCta.midHeadline}
            </h2>
          </div>
          <SectionCta href={startUrl} action={content.hero.primaryAction} />
        </div>
      </section>

      <IndustryUseCases
        content={content.inspiration}
        theme={theme}
        startUrl={startUrl}
      />

      <BusinessManagement
        content={managementContent(
          content.name,
          content.management.businessName,
        )}
        theme={theme}
        startUrl={startUrl}
      />

      <section
        className="bg-black px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28"
        id="faq"
      >
        <div className="mx-auto grid max-w-[1440px] gap-10 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] lg:gap-20">
          <SectionHeading
            eyebrow={content.faq.eyebrow}
            headline={content.faq.headline}
            description={content.faq.description}
          />
          <IndustryFaqItems items={content.faq.items} />
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 sm:pb-28 lg:px-12">
        <div className="mx-auto max-w-[1440px] rounded-md border border-[var(--industry-pale)]/25 bg-[var(--industry-surface)] px-6 py-12 text-center sm:px-10 sm:py-16">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--industry-pale)] sm:text-xs">
            {content.finalCta.eyebrow}
          </p>
          <h2 className="mx-auto mt-4 max-w-3xl text-[clamp(2rem,4.5vw,4rem)] font-medium leading-[1.08] tracking-[-0.06em]">
            {content.finalCta.headline}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-7 text-white/65 sm:text-lg sm:leading-8">
            {content.finalCta.description}
          </p>
          <div className="mt-8 flex justify-center">
            <SectionCta href={startUrl} action={content.finalCta.action} />
          </div>
        </div>
      </section>
    </main>
  );
}
