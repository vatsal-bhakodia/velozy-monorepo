import beautySalon from "./beauty-salon.json";
import cafe from "./cafe.json";
import church from "./church.json";
import construction from "./construction.json";
import education from "./education.json";
import event from "./event.json";
import fitnessCoaching from "./fitness-coaching.json";
import healthcare from "./healthcare.json";
import hotel from "./hotel.json";
import insuranceAgency from "./insurance-agency.json";
import lawFirm from "./law-firm.json";
import nonprofit from "./nonprofit.json";
import realEstate from "./real-estate.json";
import restaurant from "./restaurant.json";
import type { SolutionPageContent } from "@/components/solutions/solution-page";

// JSON imports widen the fixed-length preview tuples; the registry checks their
// structural invariants before exposing an entry to routes, directory, or sitemap.
const authored = [
  beautySalon,
  cafe,
  church,
  construction,
  education,
  event,
  fitnessCoaching,
  healthcare,
  hotel,
  insuranceAgency,
  lawFirm,
  nonprofit,
  realEstate,
  restaurant,
] as unknown as SolutionPageContent[];

const solutions = new Map<string, SolutionPageContent>();
for (const solution of authored) {
  if (
    !/^[a-z0-9-]+-website-builder$/.test(solution.slug) ||
    solutions.has(solution.slug)
  ) {
    throw new Error(`Invalid or duplicate industry slug: ${solution.slug}`);
  }
  const palette = solution.palette;
  const colors = palette && [
    palette.accent,
    palette.pale,
    palette.surface,
    palette.ink,
  ];
  const images = [
    [solution.hero?.image, solution.hero?.imageAlt],
    [solution.hero?.offerCard?.image, solution.hero?.offerCard?.imageAlt],
    [solution.steps?.preview?.image, solution.steps?.preview?.imageAlt],
    ...(solution.inspiration?.items ?? []).map((item) => [
      item.image,
      item.imageAlt,
    ]),
  ];
  if (
    !solution.name ||
    !solution.metadata?.title ||
    !solution.metadata?.description ||
    !solution.hero?.highlight?.endsWith("Website Builder") ||
    !solution.capabilities ||
    solution.capabilities.items?.length !== 6 ||
    !solution.capabilities.items?.every(
      (item) => solution.capabilities.visuals?.[item.visual],
    ) ||
    solution.steps?.items?.length !== 3 ||
    solution.inspiration?.items?.length !== 3 ||
    !solution.faq?.items?.length ||
    !solution.related?.length ||
    !colors?.every(
      (value) => typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value),
    ) ||
    !images.every(
      ([src, alt]) =>
        src === null ||
        (typeof src === "string" && src.startsWith("/") && !!alt),
    )
  ) {
    throw new Error(`Invalid industry page content: ${solution.slug}`);
  }
  solutions.set(solution.slug, solution);
}
for (const solution of authored) {
  if (
    solution.related.some(
      (item) =>
        !solutions.has(item.slug) || item.slug === solution.slug || !item.label,
    )
  ) {
    throw new Error(`Invalid related industry link: ${solution.slug}`);
  }
}

export function getSolutionSlugs() {
  return [...solutions.keys()];
}

export function getSolutionBySlug(slug: string) {
  return solutions.get(slug);
}

export function getIndustryDirectory() {
  return [...solutions.values()].map(({ slug, name, metadata, hero }) => ({
    slug,
    name,
    description: metadata.description,
    image: hero.image,
  }));
}
