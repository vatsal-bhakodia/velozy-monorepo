"use client";

import React, { useState, useEffect } from "react";
import {
  Mouse,
  MousePointer2,
  Palette,
  Layers,
  GripVertical,
  Rocket,
  Edit,
} from "lucide-react";

export const CardThree = () => {
  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationPhase((prev) => (prev + 1) % 8);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  // Animation phases:
  // 0: Initial state
  // 1: Cursor appears and hovers over first card
  // 2: First card gets selected (highlighted)
  // 3: First card starts moving down, cursor follows
  // 4: Cards swap positions, first card is now second
  // 5: Second card (originally first) gets selected
  // 6: Second card moves down, cursor follows
  // 7: Cards return to original positions

  const getCursorPosition = () => {
    switch (animationPhase) {
      case 1:
      case 2:
        return { x: "85%", y: "35%" }; // Over first card
      case 3:
        return { x: "85%", y: "65%" }; // Following first card down
      case 4:
        return { x: "85%", y: "65%" }; // At bottom position
      case 5:
        return { x: "85%", y: "35%" }; // Over second card (now at bottom)
      case 6:
        return { x: "85%", y: "65%" }; // Following second card down
      case 7:
        return { x: "85%", y: "65%" }; // At final position
      default:
        return { x: "85%", y: "35%" }; // Default position
    }
  };

  const getFirstCardTransform = () => {
    switch (animationPhase) {
      case 3:
        return "translateY(4rem) scale(1.05)"; // Moving down
      case 4:
      case 5:
        return "translateY(4.5rem)"; // At bottom position
      case 6: // Quick snap up when second card starts moving
        return "translateY(0)"; // Quick move back to original position
      case 7:
        return "translateY(0)"; // Back to original position
      default:
        return "translateY(0)"; // Original position
    }
  };

  const getSecondCardTransform = () => {
    switch (animationPhase) {
      case 3: // Quick snap up when first card starts moving
        return "translateY(-4rem)"; // Quick move up to first position
      case 4:
      case 5:
        return "translateY(-4rem)"; // Stay at first position
      case 6:
        return "translateY(0) scale(1.05)"; // Moving back down
      case 7:
        return "translateY(0)"; // Back to original position
      default:
        return "translateY(0)"; // Original position
    }
  };

  const isFirstCardActive = () => animationPhase >= 2 && animationPhase <= 4;
  const isSecondCardActive = () => animationPhase >= 5 && animationPhase <= 6;
  const showCursor = () => animationPhase >= 1 && animationPhase <= 6;

  return (
    <div className="group relative flex h-full min-h-0 flex-col overflow-hidden">
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start justify-between p-8 md:pb-0">
          <div>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">
              Visual editor / 03
            </p>
            <h3 className="mb-3 text-3xl font-medium leading-[1.02] tracking-[-.05em] text-white">
              Highly Customizable
              <br />
              <span className="text-cyan-200">drag &amp; drop</span>
            </h3>
            <p className="max-w-xs text-sm font-normal leading-6 text-gray-400">
              Intuitive visual editor for complete design control
            </p>
          </div>

          {/* Action icons */}
          <div className="pt-5 md:pt-0">
            <div className="flex items-center gap-1 rounded-xl">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-200">
                <Mouse className="h-4 w-4" />
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-200">
                <Palette className="h-4 w-4" />
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-200">
                <Layers className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
        {/* Website Builder Interface */}
        <div className="relative mt-auto">
          <div className="flex items-end justify-end">
            {/* Builder Window */}
            <div className="relative h-48 w-[min(30rem,80%)] overflow-hidden rounded-tl-2xl border-l border-t border-white/10 bg-black/30 backdrop-blur-xl">
              {/* Window header */}
              <div className="border-b border-white/10 p-4 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex shrink-0 gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-400/70" />
                    <span className="h-2 w-2 rounded-full bg-amber-300/70" />
                    <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
                  </div>
                  <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-gray-400">
                    Layers
                  </div>
                </div>
              </div>

              {/* Builder content with drag animation */}
              <div className="p-4 space-y-3 relative">
                {/* First card - Hero Section */}
                <div
                  className={`
                relative p-3 rounded-lg border z-10
                ${
                  isFirstCardActive()
                    ? "border-cyan-400/50 bg-white/[0.06]"
                    : "border-white/10 bg-white/[0.035]"
                }
                transition-all duration-300
              `}
                  style={{
                    transform: getFirstCardTransform(),
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-md w-8 h-8 flex items-center justify-center bg-gray-700/30 px-2 py-1">
                      <Rocket className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="text-gray-200 text-xs font-medium">
                        Hero Section
                      </div>
                      <div className="text-gray-400 text-xs">
                        Header Component
                      </div>
                    </div>
                    <div
                      className={`
                    ml-auto transition-all duration-300
                    ${isFirstCardActive() ? "opacity-100" : "opacity-50"}
                  `}
                    >
                      <GripVertical className="w-3 h-3 text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Second card - About Block */}
                <div
                  className={`
                relative p-3 rounded-lg border z-10
                ${
                  isSecondCardActive()
                    ? "border-cyan-400/50 bg-white/[0.06]"
                    : "border-white/10 bg-white/[0.035]"
                }
                transition-all duration-300
              `}
                  style={{
                    transform: getSecondCardTransform(),
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-md w-8 h-8 flex items-center justify-center bg-gray-700/30 px-2 py-1">
                      <Edit className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="text-gray-200 text-xs font-medium">
                        About Block
                      </div>
                      <div className="text-gray-400 text-xs">Content</div>
                    </div>
                    <div
                      className={`
                    ml-auto transition-all duration-300
                    ${isSecondCardActive() ? "opacity-100" : "opacity-50"}
                  `}
                    >
                      <GripVertical className="w-3 h-3 text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Animated cursor */}
                {showCursor() && (
                  <div
                    className="absolute pointer-events-none z-20 transition-all duration-300 ease-in-out"
                    style={{
                      left: getCursorPosition().x,
                      top: getCursorPosition().y,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <div className="relative">
                      {/* Cursor icon */}
                      <MousePointer2 className="relative z-10 h-5 w-5 rotate-12 text-cyan-400" />
                    </div>
                  </div>
                )}

                {/* Drop zone indicators */}
                {(animationPhase === 3 || animationPhase === 6) && (
                  <>
                    <div className="absolute top-16 left-4 right-4 h-1 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent rounded-full">
                      <div className="w-full h-full bg-cyan-400/30 rounded-full animate-pulse"></div>
                    </div>
                    <div className="absolute bottom-16 left-4 right-4 h-1 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent rounded-full">
                      <div className="w-full h-full bg-cyan-400/30 rounded-full animate-pulse"></div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          {/* Connection lines */}
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: -1 }}
          >
            <defs>
              <linearGradient
                id="lineGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop
                  offset="0%"
                  stopColor="rgb(34, 211, 238)"
                  stopOpacity="0.2"
                />
                <stop
                  offset="50%"
                  stopColor="rgb(56, 189, 248)"
                  stopOpacity="0.3"
                />
                <stop
                  offset="100%"
                  stopColor="rgb(59, 130, 246)"
                  stopOpacity="0.2"
                />
              </linearGradient>
            </defs>

            {/* Animated connection lines */}
            {[...Array(3)].map((_, i) => (
              <line
                key={i}
                x1={`${20 + i * 30}%`}
                y1="20%"
                x2={`${80 - i * 20}%`}
                y2="80%"
                stroke="url(#lineGradient)"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
};

export default CardThree;
