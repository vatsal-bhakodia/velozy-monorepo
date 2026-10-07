import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Brain,
  Zap,
  CheckCircle2,
  Layers,
  Wand2,
  Cpu,
  Paintbrush,
} from "lucide-react";
import { Confetti } from "./confetti";

interface GeneratingOverlayProps {
  isVisible: boolean;
  currentStep: number;
  totalSteps: number;
  currentStepText: string;
}

export const GeneratingOverlay = ({
  isVisible,
  currentStep,
  totalSteps,
  currentStepText,
}: GeneratingOverlayProps) => {
  if (!isVisible) return null;

  // Determine if we're in analysis phase (before structured steps are available)
  const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;
  const isComplete = progress === 100;

  // Rotating icons for generation phase
  const generationIcons = [Layers, Zap, Wand2, Cpu, Paintbrush, Brain];
  const [currentIconIndex, setCurrentIconIndex] = useState(0);

  useEffect(() => {
    if (!isComplete) {
      const interval = setInterval(() => {
        setCurrentIconIndex((prev) => (prev + 1) % generationIcons.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isComplete]);

  const CurrentGenerationIcon = generationIcons[currentIconIndex];

  return (
    <>
      <Confetti isVisible={isComplete} />
      <div className="absolute bottom-6 left-1/2 z-50 w-[min(92%,620px)] -translate-x-1/2 overflow-hidden rounded-2xl border border-white/[.14] bg-[#050505]/95 px-4 py-3.5 text-white shadow-[0_20px_70px_rgba(0,0,0,.65)] backdrop-blur-2xl sm:bottom-8 sm:px-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(34,211,238,.12),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(37,99,235,.12),transparent_36%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent"
        />

        <div className="relative flex w-full items-center gap-3.5">
          {/* Icon Section */}
          <div className="relative flex-shrink-0">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-cyan-400/20 blur-md animate-pulse"></div>
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
                {isComplete ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <CurrentGenerationIcon className="h-4 w-4 animate-pulse" />
                )}
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-1 min-w-0">
            {/* Unified Layout - Same Structure for Both Phases */}
            <div className="space-y-2.5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={currentStepText}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -14 }}
                      transition={{ duration: 0.28, ease: "easeOut" }}
                      className="block max-w-[34vw] truncate text-xs font-medium text-white/65 sm:max-w-none"
                    >
                      {currentStepText}
                    </motion.span>
                  </AnimatePresence>
                </div>

                <div className="flex items-center gap-2">
                  {totalSteps > 0 ? (
                    <div className="flex gap-1 text-2xl font-medium leading-none tracking-[-.08em] text-white">
                      {Math.round(progress)}
                      <span className="text-base text-cyan-300">%</span>
                    </div>
                  ) : (
                    <>
                      <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300"></div>
                      <span className="text-[10px] font-semibold uppercase tracking-[.16em] text-cyan-300">
                        Processing
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Progress Bar - Only show during generation phase */}
              {totalSteps > 0 && (
                <div className="relative">
                  <div className="w-full h-2 bg-gray-800/80 rounded-full overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-blue-500/10 rounded-full"></div>
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-cyan-200 transition-[width] duration-700 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div
                    aria-hidden="true"
                    className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300 bg-white shadow-[0_0_10px_rgba(103,232,249,.8)] transition-[left] duration-700 ease-out"
                    style={{ left: `${progress}%` }}
                  >
                    <div className="absolute inset-0 rounded-full bg-cyan-300/70 animate-pulse" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <style>{`
          @keyframes shimmer {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100%);
            }
          }

          @keyframes reverse {
            from {
              transform: rotate(360deg);
            }
            to {
              transform: rotate(0deg);
            }
          }

          .animate-shimmer {
            animation: shimmer 2s infinite;
          }

          .animate-reverse {
            animation: reverse 2s linear infinite;
          }
        `}</style>
      </div>
    </>
  );
};
