import type { Metadata } from "next";
import { headers } from "next/headers";
import Header from "@/components/landing/header";
import Pricing from "@/components/landing/pricing";
import FAQ from "@/components/landing/faq";
import Footer from "@/components/landing/footer";

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
      <Header />
      <Pricing initialRegion={initialRegion} />
      <FAQ />
      <Footer />
    </main>
  );
}
