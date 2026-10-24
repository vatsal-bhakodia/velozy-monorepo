import type { MetadataRoute } from "next";
import { getSolutionSlugs } from "@/src/content/solutions";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = (
    process.env.NEXT_PUBLIC_MARKETING_URL ?? "https://velozy.com"
  ).replace(/\/$/, "");
  return [
    { url: origin },
    { url: `${origin}/pricing` },
    { url: `${origin}/industries` },
    ...getSolutionSlugs().map((slug) => ({
      url: `${origin}/industries/${slug}`,
    })),
  ];
}
