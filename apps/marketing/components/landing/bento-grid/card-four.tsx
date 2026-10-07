"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { TrendingUp, Eye, ArrowUp } from "lucide-react";

export const CardFour = () => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [siteViews, setSiteViews] = useState(0);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    let frameId = 0;
    let hasEntered = false;
    const target = 1200;

    const countUp = () => {
      const startedAt = performance.now();
      const duration = 1400;

      const animate = (now: number) => {
        const progress = Math.min((now - startedAt) / duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        setSiteViews(Math.round(target * easedProgress));

        if (progress < 1) frameId = window.requestAnimationFrame(animate);
      };

      frameId = window.requestAnimationFrame(animate);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasEntered) {
          hasEntered = true;
          setSiteViews(0);
          countUp();
        } else if (!entry.isIntersecting) {
          hasEntered = false;
          window.cancelAnimationFrame(frameId);
        }
      },
      { threshold: 0.45 },
    );

    observer.observe(card);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  const formattedViews =
    siteViews >= 1000
      ? `${(siteViews / 1000).toFixed(1)}K+`
      : siteViews.toLocaleString();

  return (
    <div ref={cardRef} className="group relative h-full overflow-hidden p-8">
      <div className="absolute inset-0 -top-[2rem] -right-[10rem]">
        <DotPattern
          className={cn(
            "[mask-image:radial-gradient(125px_circle_at_center,white,transparent)] opacity-50",
          )}
        />
      </div>

      <div className="relative z-10 h-full flex flex-col">
        <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">
          Insights / 04
        </p>
        <h3 className="mb-3 text-3xl font-medium leading-[1.02] tracking-[-.05em] text-white">
          Analytics
          <br />
          <span className="text-cyan-200">Dashboard</span>
        </h3>

        <p className="mb-6 flex-1 text-sm font-normal leading-6 text-gray-400">
          Track your website performance with real-time visitor insights
        </p>

        <div className="mt-auto">
          <div className="relative bg-neutral-950/80 border-t border-gray-700/50 backdrop-blur-xl rounded-2xl p-6 border shadow-inner overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-gray-400 font-medium text-sm flex items-center gap-2">
                  Site Views
                  <Eye className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-white mb-1">
                  <TrendingUp className="text-cyan-400 inline-block w-6 h-6 mr-3" />
                  {formattedViews}
                </div>
                <div className="w-fit text-cyan-400 font-semibold text-sm bg-cyan-400/20 rounded-full px-3 py-1">
                  <ArrowUp className="inline-block w-4 h-4 mr-2" />
                  +95%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
