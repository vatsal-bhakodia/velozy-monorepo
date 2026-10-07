"use client";

import { useNode } from "@craftjs/core";
import { Sparkles, WandSparkles } from "lucide-react";

export function AiLoadingSection() {
  const {
    connectors: { connect },
  } = useNode();
  return (
    <section
      ref={(element) => {
        if (element) connect(element);
      }}
      className="relative isolate flex min-h-[360px] w-full items-center justify-center overflow-hidden border-y border-cyan-200/10 bg-[#090d13] text-white"
      aria-label="AI is creating this section"
      aria-busy="true"
    >
      <style>{`
        @keyframes ai-loader-sweep { 0% { transform: translateX(-160%) rotate(12deg); } 55%, 100% { transform: translateX(360%) rotate(12deg); } }
        @keyframes ai-loader-glow { 0%, 100% { opacity: .42; transform: scale(.92); } 50% { opacity: .9; transform: scale(1.08); } }
        @keyframes ai-loader-progress { 0% { transform: translateX(-105%); } 100% { transform: translateX(260%); } }
        @media (prefers-reduced-motion: reduce) { [data-ai-motion] { animation: none !important; } }
      `}</style>

      <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(103,232,249,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,0.07)_1px,transparent_1px)] [background-size:38px_38px] [mask-image:radial-gradient(circle_at_center,black,transparent_72%)]" />
      <div
        data-ai-motion
        className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,.23),rgba(37,99,235,.12)_42%,transparent_72%)] blur-3xl [animation:ai-loader-glow_3.4s_ease-in-out_infinite]"
      />

      <div className="relative z-10 w-[min(88%,420px)] overflow-hidden rounded-[24px] border border-white/10 bg-[#0d1219]/80 px-7 py-6 shadow-[0_28px_90px_rgba(0,0,0,.48),0_0_60px_rgba(34,211,238,.08)] backdrop-blur-2xl">
        <div
          data-ai-motion
          className="pointer-events-none absolute -inset-y-1/2 left-0 w-1/3 bg-gradient-to-r from-transparent via-cyan-100/15 to-transparent blur-xl [animation:ai-loader-sweep_2.8s_cubic-bezier(.22,1,.36,1)_infinite]"
        />
        <div className="relative flex items-center gap-4">
          <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-cyan-200/20 bg-gradient-to-br from-cyan-300/15 via-blue-500/10 to-transparent text-cyan-200 shadow-[0_0_30px_rgba(34,211,238,.12)]">
            <WandSparkles className="h-5 w-5" />
            <span
              data-ai-motion
              className="absolute inset-[-5px] rounded-[19px] border border-cyan-300/20 [animation:ai-loader-glow_2s_ease-in-out_infinite]"
            />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-cyan-300/70">
              <Sparkles className="h-3 w-3" /> AI canvas
            </div>
            <p className="mt-1.5 text-base font-semibold tracking-tight text-white">
              Creating your section
            </p>
            <p className="mt-1 text-xs leading-5 text-white/45">
              Composing layout, content and visual details…
            </p>
          </div>
        </div>
        <div className="relative mt-5 h-px overflow-hidden bg-white/10">
          <div
            data-ai-motion
            className="absolute inset-y-0 left-0 w-2/5 bg-gradient-to-r from-transparent via-cyan-300 to-blue-400 shadow-[0_0_12px_#22d3ee] [animation:ai-loader-progress_1.8s_ease-in-out_infinite]"
          />
        </div>
      </div>
    </section>
  );
}

AiLoadingSection.craft = {
  displayName: "Creating section",
  rules: { canDrag: () => false, canMoveIn: () => false },
};
