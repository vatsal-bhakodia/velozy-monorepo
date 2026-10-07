import type { Metadata } from "next";
import Header from "@/components/landing/header";
import Pricing from "@/components/landing/pricing";
import FAQ from "@/components/landing/faq";
import Footer from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Pricing Plans | Velozy",
  description:
    "Choose a Velozy plan to build, publish, and scale your website with AI.",
};

export default function PricingPage() {
  return (
    <main className="font-[var(--font-montserrat)] min-h-screen overflow-x-clip bg-black text-white">
      <Header />
      <Pricing />
      <FAQ />
      <Footer />
    </main>
  );
}
