"use client";

import { useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";
import { adminUrl } from "@/lib/admin-url";
import { PrimaryLink } from "./primary-link";

const circles = [
  "h-[220vw] w-[220vw]",
  "h-[170vw] w-[170vw]",
  "h-[120vw] w-[120vw]",
  "h-[75vw] w-[75vw]",
];

export default function FinalCTA() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const isInView = useInView(sectionRef, { amount: 0.2 });

  return (
    <section
      ref={sectionRef}
      className="relative isolate min-h-[620px] overflow-hidden border-b border-gray-700/50 bg-gradient px-5 py-24 sm:px-8 lg:px-12 lg:py-32"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute bottom-[-6rem] left-[6rem] h-0 w-0 sm:bottom-[-7rem] sm:left-[8rem] lg:bottom-[-8rem] lg:left-[10rem]">
          {circles.map((circle) => (
            <div
              key={circle}
              className={`absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 ${circle}`}
            >
              <div
                className={`absolute inset-0 rounded-full circle-grow ${
                  isInView ? "circle-grow-active" : ""
                }`}
                style={{
                  background: `
                  radial-gradient(
                    55.78% 55.78% at 50% 50%,
                    rgba(255, 241, 209, 0) 58.17%,
                    #ffffff99 100%
                  )
                `,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 flex min-h-[460px] items-center justify-center">
        <div className="w-full max-w-2xl rounded-3xl border border-gray-700/60 bg-[#050505] px-6 py-16 text-center sm:px-12 sm:py-20">
          <h2 className="text-4xl font-medium leading-[0.95] tracking-[-0.06em] text-white sm:text-6xl">
            So, what are we building?
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-base leading-7 text-gray-400">
            Your next website can start with a sentence. Bring the idea and
            let&apos;s give it a shape.
          </p>
          <PrimaryLink
            href={adminUrl("/onboard")}
            size="large"
            className="mt-9"
            icon={
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            }
          >
            Create your website
          </PrimaryLink>
        </div>
      </div>
    </section>
  );
}
