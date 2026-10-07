import Header from "@/components/landing/header";
import Hero from "@/components/landing/hero";
import BentoGrid from "@/components/landing/bento-grid";
import Features from "@/components/landing/features";
import Process from "@/components/landing/process";
import FAQ from "@/components/landing/faq";
import FinalCTA from "@/components/landing/final-cta";
import Footer from "@/components/landing/footer";

export default function Home() {
  return (
    <main className="font-[var(--font-montserrat)] min-h-screen overflow-x-clip bg-black text-white">
      <Header />
      <Hero />
      <BentoGrid />
      <Process />
      <Features />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
