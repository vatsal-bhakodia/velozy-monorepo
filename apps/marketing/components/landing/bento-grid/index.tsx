import React from "react";
import { CardOne } from "./card-one";
import { CardTwo } from "./card-two";
import { CardThree } from "./card-three";
import { CardFour } from "./card-four";
import { GlowCard, GlowCardGroup } from "@/components/ui/glow-card";

const BentoGrid = () => {
  return (
    <section className="relative isolate overflow-hidden bg-black py-20 text-white sm:py-28">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[64rem] bg-[radial-gradient(ellipse_at_52%_32%,rgba(34,211,238,.14),transparent_38%),radial-gradient(ellipse_at_10%_78%,rgba(37,99,235,.22),transparent_36%),radial-gradient(ellipse_at_92%_76%,rgba(49,46,129,.18),transparent_34%)] blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-[1280px] px-4 sm:px-10 xl:px-0">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-[2.5rem] font-medium leading-[.96] tracking-[-.06em] text-white sm:text-5xl lg:text-[4.25rem]">
            Built for momentum.
            <span className="mx-auto block w-fit bg-gradient-to-r from-white via-cyan-100 to-blue-400 bg-clip-text pb-[.08em] text-transparent">
              Ready for the real world.
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-[520px] text-[15px] leading-7 text-white/50 sm:text-base">
            Generate, customize, publish, and understand your website from one
            focused workspace built for performance.
          </p>
        </div>

        <div className="mt-14">
          <GlowCardGroup className="bento-glow-grid glow-card-group-joined grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <GlowCard
              className="bento-glow-card min-h-[380px] sm:min-h-[400px]"
              contentClassName="bento-glow-card-content bg-[#050505]"
            >
              <CardOne />
            </GlowCard>
            <GlowCard
              className="bento-glow-card min-h-[420px] sm:min-h-[400px] lg:col-span-2"
              contentClassName="bento-glow-card-content bg-[#050505]"
            >
              <CardTwo />
            </GlowCard>
            <GlowCard
              className="bento-glow-card min-h-[420px] sm:min-h-[400px] lg:col-span-2"
              contentClassName="bento-glow-card-content bg-[#050505]"
            >
              <CardThree />
            </GlowCard>
            <GlowCard
              className="bento-glow-card min-h-[380px] sm:min-h-[400px]"
              contentClassName="bento-glow-card-content bg-[#050505]"
            >
              <CardFour />
            </GlowCard>
          </GlowCardGroup>
        </div>
      </div>
    </section>
  );
};

export default BentoGrid;
