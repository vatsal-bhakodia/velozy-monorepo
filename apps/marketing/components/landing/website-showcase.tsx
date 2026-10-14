"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Monitor, Smartphone } from "lucide-react";
import { websiteShowcaseSlides } from "@/constants/website-screenshots";

function BrowserPreview({
  image,
  index,
  generated = false,
  reduceMotion = false,
  appearance = "dark",
}: {
  image: string;
  index: number;
  generated?: boolean;
  reduceMotion?: boolean;
  appearance?: "dark" | "light";
}) {
  const light = appearance === "light";

  return (
    <div
      className={`relative aspect-[855/508] overflow-hidden rounded-md shadow-2xl ${
        light
          ? "border border-black/10 bg-white shadow-black/15"
          : "border-0 bg-[#050505] shadow-black/50"
      }`}
    >
      <div
        className={`absolute inset-x-0 top-0 z-10 flex h-6 items-center justify-between border-b px-3 sm:h-7 ${
          light ? "border-neutral-200 bg-white" : "border-white/10 bg-[#050505]"
        }`}
      >
        <Image
          src="/logo-icon.png"
          alt="Velozy"
          width={20}
          height={20}
          className="h-4 w-4 rounded-md object-cover sm:h-5 sm:w-5"
        />
        <div
          aria-hidden="true"
          className={`flex items-center gap-0 rounded-md border p-px ${
            light
              ? "border-neutral-200 bg-neutral-50"
              : "border-white/10 bg-white/5"
          }`}
        >
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-sm shadow-sm ${
              light
                ? "bg-blue-50 text-blue-600"
                : "bg-blue-400/15 text-blue-400"
            }`}
          >
            <Monitor className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          </span>
          <span
            className={`flex h-5 w-5 items-center justify-center ${light ? "text-neutral-400" : "text-white/40"}`}
          >
            <Smartphone className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          </span>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 top-6 sm:top-7">
        <Image
          src={image}
          alt={`Website created with Velozy, example ${index + 1}`}
          fill
          className="rounded-b-md object-cover object-top"
        />
      </div>
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
            className={`pointer-events-none absolute inset-0 z-10 mix-blend-screen ${
              light
                ? "bg-[radial-gradient(circle_at_70%_35%,rgba(59,130,246,.75),transparent_38%),linear-gradient(115deg,transparent_20%,rgba(59,130,246,.5)_48%,transparent_74%)]"
                : "bg-[radial-gradient(circle_at_70%_35%,rgba(59,130,246,.85),transparent_38%),linear-gradient(115deg,transparent_20%,rgba(59,130,246,.62)_48%,transparent_74%)]"
            }`}
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

export default function WebsiteShowcase({
  appearance = "dark",
  showGlow = true,
}: {
  appearance?: "dark" | "light";
  showGlow?: boolean;
}) {
  const [active, setActive] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(
      () =>
        setActive((current) => (current + 1) % websiteShowcaseSlides.length),
      3000,
    );
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 50, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: reduceMotion ? 0 : 1,
        delay: reduceMotion ? 0 : 0.22,
        ease: [0.2, 0.8, 0.2, 1],
      }}
      className="relative isolate mx-auto h-[280px] max-w-[1240px] sm:h-[430px] lg:h-[540px]"
    >
      {showGlow && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[36%] -z-10 aspect-[2/1] w-[120%] max-w-none -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,.5),rgba(59,130,246,.2)_42%,transparent_72%)] blur-[35px] sm:blur-[80px]"
        />
      )}
      <div className="absolute inset-0 z-20">
        <AnimatePresence initial={false}>
          {[-1, 0, 1].map((offset) => {
            const index =
              (active + offset + websiteShowcaseSlides.length) %
              websiteShowcaseSlides.length;
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
                  opacity: 1,
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
                  image={websiteShowcaseSlides[index].image}
                  index={index}
                  generated={showGlow && isActive}
                  reduceMotion={Boolean(reduceMotion)}
                  appearance={appearance}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
