import type { Metadata } from "next";
import { headers } from "next/headers";
import Pricing from "@/components/landing/pricing";
import FAQ from "@/components/landing/faq";

export const metadata: Metadata = {
  title: "Pricing Plans | Velozy",
  description:
    "Choose a Velozy plan to build, publish, and scale your website with AI.",
};

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const country = (await headers()).get("cf-ipcountry")?.trim().toUpperCase();
  const initialRegion = country === "IN" ? "india" : "international";

  return (
    <main className="font-[var(--font-montserrat)] min-h-screen overflow-x-clip bg-black text-white">
      <Pricing initialRegion={initialRegion} />
      <FAQ />
    </main>
  );
}
