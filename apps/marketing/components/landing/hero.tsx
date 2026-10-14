"use client";

import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { adminUrl } from "@/lib/admin-url";
import { AnimatedShinyText } from "@/components/magicui/animated-shiny-text";
import { PrimaryLink } from "./primary-link";
import WebsiteShowcase from "./website-showcase";

export default function Hero({ showGlow = false }: { showGlow?: boolean }) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative isolate min-h-[900px] overflow-hidden pt-[73px] sm:min-h-[1080px]">
      {showGlow && (
        <>
          <div className="pointer-events-none absolute left-1/2 top-20 -z-20 h-[640px] w-[min(1100px,110vw)] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,.20),rgba(59,130,246,.08)_35%,transparent_70%)] blur-2xl" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[270px] z-0 h-[1400px] w-[1400px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,.22)_0%,rgba(59,130,246,.14)_42%,transparent_70%)] blur-3xl"
          />
        </>
      )}

      <div className="relative z-10 mx-auto max-w-[1440px] px-5 pb-12 pt-6 text-center sm:px-8 sm:pt-10 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative z-10"
        >
          <div className="mb-6 text-center">
            <AnimatedShinyText className="text-xs font-medium uppercase tracking-[.16em] text-white/80">
              AI-Powered Website Builder
            </AnimatedShinyText>
          </div>
          <h1 className="mx-auto max-w-[1100px] text-[3.5rem] font-medium leading-[.88] tracking-[-.078em] text-white sm:text-7xl lg:text-[7.8rem]">
            From idea to live
            <span className="relative mx-auto mt-1 block w-fit bg-gradient-to-r from-white via-cyan-100 to-blue-400 bg-clip-text pr-[.08em] text-transparent">
              Website with AI.
              {showGlow && (
                <motion.span
                  aria-hidden="true"
                  animate={reduceMotion ? undefined : { x: ["-15%", "115%"] }}
                  transition={{
                    duration: 3.2,
                    repeat: Infinity,
                    repeatDelay: 1.4,
                    ease: "easeInOut",
                  }}
                  className="absolute bottom-[-.08em] left-0 h-px w-1/3 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_14px_#3b82f6]"
                />
              )}
            </span>
          </h1>
          <p className="mx-auto mt-7 max-w-[680px] text-[15px] leading-7 text-white/52 sm:text-lg">
            Your website, SEO, and marketing all in one place.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3">
            <PrimaryLink
              href={adminUrl("/onboard")}
              size="large"
              variant="brand"
              icon={
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              }
            >
              Start building
            </PrimaryLink>
            <span className="text-xs text-white/35">No code · Start free</span>
          </div>
        </motion.div>
        <div className="mt-16">
          <WebsiteShowcase showGlow />
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="mt-8 text-[10px] uppercase tracking-[.24em] text-white/25 sm:text-xs"
        >
          From first thought to first customer
        </motion.p>
      </div>
    </section>
  );
}
