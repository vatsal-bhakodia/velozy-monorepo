"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Image,
  Edit,
  LoaderCircle,
  Rocket,
  Sparkles,
} from "lucide-react";

export const CardTwo = () => {
  const [animationTick, setAnimationTick] = useState(0);
  const prompt = "Create a bold portfolio for a creative studio";
  const cycleLength = prompt.length + 18;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setAnimationTick((current) => (current + 1) % cycleLength);
    }, 35);

    return () => window.clearInterval(interval);
  }, [cycleLength]);

  const typedPrompt = prompt.slice(0, Math.min(animationTick, prompt.length));
  const isGenerating =
    animationTick > prompt.length && animationTick < prompt.length + 13;
  const isComplete = animationTick >= prompt.length + 13;

  return (
    <div className="group relative flex h-full min-h-0 flex-col overflow-hidden">
      <div className="relative z-10 flex flex-col h-full p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start justify-between">
          <div>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">
              AI builder / 02
            </p>
            <h3 className="mb-3 text-3xl font-medium leading-[1.02] tracking-[-.05em] text-white">
              Artificial Intelligence
              <br />
              <span className="text-cyan-200">Website Builder</span>
            </h3>
            <p className="max-w-xs text-sm font-normal leading-6 text-gray-400">
              Intelligent content generation and design optimization
            </p>
          </div>

          {/* Action icons */}
          <div className="pt-5 md:pt-0">
            <div className="flex items-center gap-1 rounded-xl">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-200">
                <Edit className="h-4 w-4" />
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-200">
                <Image className="h-4 w-4" />
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-200">
                <Rocket className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
        {/* Prompt-to-site generation visual */}
        <div className="relative -mb-8 -ml-8 -mr-8 mt-auto min-h-[14rem]">
          <div className="absolute bottom-0 right-0 z-10 w-[min(34rem,80%)] overflow-hidden rounded-tl-2xl border-l border-t border-white/10 bg-black/30 backdrop-blur-xl">
            <div className="flex items-center gap-4 border-b border-white/10 px-5 py-4">
              <div className="flex shrink-0 gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-400/70" />
                <span className="h-2 w-2 rounded-full bg-amber-300/70" />
                <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
              </div>
              <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-gray-400">
                Prompt to website
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex min-h-12 items-start gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3">
                <span className="mt-0.5 text-cyan-400">›</span>
                <p className="min-h-8 flex-1 text-xs leading-5 text-gray-200">
                  {typedPrompt}
                  <span className="ml-0.5 inline-block h-3.5 w-px animate-pulse bg-cyan-300 align-[-2px]" />
                </p>
                <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300/70" />
              </div>

              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 shrink-0 rounded-lg border border-blue-400/30 bg-gradient-to-br from-cyan-400/30 to-blue-600/30 p-2.5">
                  {isComplete ? (
                    <Check className="h-full w-full text-cyan-300" />
                  ) : (
                    <Sparkles className="h-full w-full text-cyan-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center justify-between text-[11px]">
                    <span className="text-gray-300">
                      {isComplete
                        ? "Website ready"
                        : isGenerating
                          ? "Generating layout..."
                          : "AI is listening..."}
                    </span>
                    {isGenerating && (
                      <LoaderCircle className="h-3 w-3 animate-spin text-cyan-300" />
                    )}
                    {isComplete && <span className="text-cyan-300">100%</span>}
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full bg-cyan-300 transition-all duration-300 ${isComplete ? "w-full" : isGenerating ? "w-4/5 animate-pulse" : "w-1/5"}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Existing AI orb */}
          <div className="absolute bottom-8 left-8 flex items-end justify-end">
            <div className="circle-big">
              <div className="circle-small">
                <Sparkles className="w-10 h-10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardTwo;
