import Hero from "@/components/landing/hero";
import Platform from "@/components/landing/platform";
import Process from "@/components/landing/process";
import HowToCreate from "@/components/landing/how-to-create";
import AgenticSeo from "@/components/landing/agentic-seo";
import FAQ from "@/components/landing/faq";
import FinalCTA from "@/components/landing/final-cta";

export default function Home() {
  return (
    <main className="landing-home-canvas font-[var(--font-montserrat)] min-h-screen overflow-x-clip text-white">
      <Hero />
      <Platform />
      <Process />
      <HowToCreate />
      <AgenticSeo />
      <FAQ />
      <FinalCTA />
    </main>
  );
}
