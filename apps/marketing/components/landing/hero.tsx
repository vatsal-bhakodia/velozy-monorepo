"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { websiteScreenshots } from "@/constants/website-screenshots";
import { AnimatedShinyText } from "@/components/magicui/animated-shiny-text";
import { adminUrl } from "@/lib/admin-url";
import { PrimaryLink } from "./primary-link";

function BrowserPreview({
  image,
  index,
  generated = false,
  reduceMotion = false,
}: {
  image: string;
  index: number;
  generated?: boolean;
  reduceMotion?: boolean;
}) {
  return (
    <div className="relative aspect-[1.58/1] overflow-hidden rounded-[18px] border border-white/15 bg-[#050505] shadow-2xl shadow-black/50">
      <div className="flex h-9 items-center gap-1.5 border-b border-white/10 bg-black/20 px-4">
        <i className="h-2 w-2 rounded-full bg-white/25" />
        <i className="h-2 w-2 rounded-full bg-white/25" />
        <i className="h-2 w-2 rounded-full bg-white/25" />
      </div>
      <Image
        src={image}
        alt={`Website created with Velozy, example ${index + 1}`}
        width={1600}
        height={1000}
        className="h-[calc(100%-2.25rem)] w-full rounded-b-[18px] object-cover object-top"
      />
      <AnimatePresence>
        {generated && (
          <motion.div
            key={`generated-glow-${index}`}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={reduceMotion ? { opacity: 0 } : { opacity: [0, 0.62, 0] }}
            exit={{ opacity: 0 }}
            transition={{
              duration: reduceMotion ? 0.2 : 1.35,
              delay: reduceMotion ? 0 : 0.42,
              times: [0, 0.42, 1],
              ease: "easeOut",
            }}
            className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_70%_35%,rgba(103,232,249,.85),transparent_38%),linear-gradient(115deg,transparent_20%,rgba(125,211,252,.62)_48%,transparent_74%)] mix-blend-screen"
          >
            {!reduceMotion && (
              <motion.i
                initial={{ x: "-120%" }}
                animate={{ x: "220%" }}
                transition={{
                  duration: 1.05,
                  delay: 0.48,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="absolute -inset-y-1/2 left-0 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/25 to-transparent blur-xl"
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Hero() {
  const [active, setActive] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % websiteScreenshots.length),
      5200,
    );
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  const select = (index: number) =>
    setActive((index + websiteScreenshots.length) % websiteScreenshots.length);

  return (
    <section className="relative isolate min-h-[900px] overflow-hidden bg-black pt-[72px] sm:min-h-[1080px]">
      <div className="landing-grid pointer-events-none absolute inset-0 -z-30 opacity-55 [mask-image:linear-gradient(to_bottom,black_5%,black_38%,transparent_72%)]" />
      <div className="pointer-events-none absolute left-1/2 top-20 -z-20 h-[640px] w-[min(1100px,110vw)] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,.20),rgba(34,211,238,.08)_35%,transparent_70%)] blur-2xl" />

      <div className="mx-auto max-w-[1440px] px-5 pb-28 pt-16 text-center sm:px-8 sm:pt-24 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative z-10"
        >
          {/* Top Badge */}
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <AnimatedShinyText className="inline-flex items-center justify-center text-xs font-medium uppercase tracking-[0.16em] transition ease-out hover:text-neutral-600 hover:duration-300 hover:dark:text-neutral-400">
                AI-Powered Website Builder
              </AnimatedShinyText>
            </div>
          </div>
          <h1 className="mx-auto max-w-[1100px] text-[3.5rem] font-medium leading-[.88] tracking-[-.078em] text-white sm:text-7xl lg:text-[7.8rem]">
            From idea to live
            <span className="relative mx-auto mt-1 block w-fit bg-gradient-to-r from-white via-cyan-100 to-blue-400 bg-clip-text pr-[.08em] text-transparent">
              Website with AI.
              <motion.span
                aria-hidden="true"
                animate={reduceMotion ? undefined : { x: ["-15%", "115%"] }}
                transition={{
                  duration: 3.2,
                  repeat: Infinity,
                  repeatDelay: 1.4,
                  ease: "easeInOut",
                }}
                className="absolute bottom-[-.08em] left-0 h-px w-1/3 bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_14px_#22d3ee]"
              />
            </span>
          </h1>
          <p className="mx-auto mt-7 max-w-[680px] text-[15px] leading-7 text-white/52 sm:text-lg">
            Your website, SEO, and marketing all in one place.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <PrimaryLink
              href={adminUrl("/onboard")}
              size="large"
              icon={
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              }
            >
              Start building
            </PrimaryLink>
            <span className="text-xs text-white/35">No code · Start free</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          className="relative isolate mx-auto mt-14 h-[355px] max-w-[1240px] sm:mt-20 sm:h-[570px] lg:h-[670px]"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-[-18%] -z-10 h-[48rem] bg-[radial-gradient(ellipse_at_50%_38%,rgba(34,211,238,0.14),transparent_38%),radial-gradient(ellipse_at_12%_68%,rgba(37,99,235,0.22),transparent_34%),radial-gradient(ellipse_at_88%_70%,rgba(99,102,241,0.18),transparent_34%)] blur-3xl"
          />

          <motion.div className="absolute inset-0 z-20">
            <AnimatePresence initial={false}>
              {[-1, 0, 1].map((offset) => {
                const index =
                  (active + offset + websiteScreenshots.length) %
                  websiteScreenshots.length;
                const isActive = offset === 0;

                return (
                  <motion.div
                    key={index}
                    initial={{
                      opacity: 0,
                      scale: 0.7,
                      x: "26%",
                      y: "-42%",
                      filter: "blur(2px)",
                    }}
                    animate={{
                      opacity: isActive ? 1 : 0.32,
                      scale: isActive ? 1 : 0.7,
                      x: isActive ? "-50%" : offset < 0 ? "-126%" : "26%",
                      y: isActive ? "-50%" : "-42%",
                      filter: isActive ? "blur(0px)" : "blur(2px)",
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.66,
                      x: "-162%",
                      y: "-40%",
                      filter: "blur(3px)",
                    }}
                    transition={{
                      duration: reduceMotion ? 0.01 : 0.82,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className={`absolute left-1/2 top-1/2 w-[88%] sm:w-[76%] lg:w-[70%] ${isActive ? "z-20" : "z-10"}`}
                  >
                    <BrowserPreview
                      image={websiteScreenshots[index]}
                      index={index}
                      generated={isActive}
                      reduceMotion={Boolean(reduceMotion)}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>

          <div className="absolute inset-x-0 -bottom-8 z-40 flex items-center justify-center gap-3 sm:gap-4">
            <button
              aria-label="Previous website"
              onClick={() => select(active - 1)}
              className="rounded-full border border-white/10 bg-black/50 p-2.5 text-white/50 backdrop-blur transition hover:border-cyan-300/50 hover:text-cyan-200"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5 rounded-full border border-white/[.08] bg-black/45 px-3 py-2 backdrop-blur-xl">
              {websiteScreenshots.map((image, index) => (
                <button
                  key={image}
                  aria-label={`Show website example ${index + 1}`}
                  onClick={() => select(index)}
                  className={`h-1 rounded-full transition-all duration-500 ${index === active ? "w-8 bg-cyan-300 shadow-[0_0_8px_#22d3ee]" : "w-2 bg-white/20 hover:bg-white/40"}`}
                />
              ))}
            </div>
            <button
              aria-label="Next website"
              onClick={() => select(active + 1)}
              className="rounded-full border border-white/10 bg-black/50 p-2.5 text-white/50 backdrop-blur transition hover:border-cyan-300/50 hover:text-cyan-200"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="mt-10 text-[10px] uppercase tracking-[.24em] text-white/25 sm:mt-14 sm:text-xs"
        >
          From first thought to first customer
        </motion.p>
      </div>
    </section>
  );
}
