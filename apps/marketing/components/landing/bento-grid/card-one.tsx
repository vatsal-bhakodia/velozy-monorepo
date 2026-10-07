"use client";

import React from "react";
import {
  AnimatePresence,
  MotionValue,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Zap, TrendingUp, Rocket, Gauge, Search } from "lucide-react";
import { DotPattern } from "@/components/magicui/dot-pattern";

type DockIconProps = {
  mouseX: MotionValue<number>;
  icon: React.ReactNode;
  title: string;
  active: boolean;
  onHoverChange: (hovered: boolean) => void;
  featured?: boolean;
};

const DockIcon = ({
  mouseX,
  icon,
  title,
  active,
  onHoverChange,
  featured = false,
}: DockIconProps) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const distance = useTransform(mouseX, (value) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return value - bounds.x - bounds.width / 2;
  });

  const baseSize = featured ? 64 : 48;
  const hoveredSize = featured ? 82 : 68;
  const baseIconSize = featured ? 32 : 20;
  const hoveredIconSize = featured ? 42 : 30;
  const size = useSpring(
    useTransform(distance, [-150, 0, 150], [baseSize, hoveredSize, baseSize]),
    { mass: 0.1, stiffness: 150, damping: 12 },
  );
  const iconSize = useSpring(
    useTransform(
      distance,
      [-150, 0, 150],
      [baseIconSize, hoveredIconSize, baseIconSize],
    ),
    { mass: 0.1, stiffness: 150, damping: 12 },
  );

  return (
    <motion.div
      ref={ref}
      style={{ width: size, height: size }}
      onMouseEnter={() => {
        setHovered(true);
        onHoverChange(true);
      }}
      onMouseLeave={() => {
        setHovered(false);
        onHoverChange(false);
      }}
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 shadow-lg backdrop-blur-xl",
        active && "border-2 border-cyan-400/60 bg-gray-800/80 shadow-2xl",
      )}
    >
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 8, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 2, x: "-50%" }}
            transition={{ duration: 0.18 }}
            className="absolute -top-9 left-1/2 z-30 w-max rounded-md border border-gray-700 bg-gray-900 px-2.5 py-1 text-[10px] font-medium text-white shadow-xl"
          >
            {title}
          </motion.div>
        )}
      </AnimatePresence>
      {active && (
        <>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400/60 via-blue-500/60 to-cyan-400/60 blur-2xl" />
          <div className="absolute inset-0 animate-ping rounded-full bg-cyan-300/30 blur-xl" />
          <div className="absolute inset-0 rounded-full bg-cyan-500/25 blur-lg" />
        </>
      )}
      <motion.div
        style={{ width: iconSize, height: iconSize }}
        className="relative z-10 flex items-center justify-center"
      >
        {icon}
      </motion.div>
    </motion.div>
  );
};

export const CardOne = () => {
  const mouseX = useMotionValue(Infinity);
  const [hoveredIcon, setHoveredIcon] = useState<number | null>(null);

  const handleHoverChange = (index: number, hovered: boolean) => {
    setHoveredIcon(hovered ? index : null);
  };

  return (
    <div className="group relative h-full overflow-hidden">
      <div className="absolute inset-0 -top-[2rem] -right-[10rem]">
        <DotPattern
          className={cn(
            "[mask-image:radial-gradient(125px_circle_at_center,white,transparent)] opacity-50",
          )}
        />
      </div>

      <div className="relative z-10 h-full flex flex-col">
        <div className="p-8">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">
            Generate / 01
          </p>
          <h3 className="mb-3 text-3xl font-medium leading-[1.02] tracking-[-.05em] text-white">
            Lightning fast
            <br />
            <span className="text-cyan-200">site generation</span>
          </h3>
          <p className="mb-6 flex-1 text-sm font-normal leading-6 text-gray-400">
            Next.js powered sites built for SEO and speed optimization
          </p>
        </div>

        {/* Tech Icons Row */}
        <div
          onMouseMove={(event) => mouseX.set(event.pageX)}
          onMouseLeave={() => mouseX.set(Infinity)}
          className="relative z-10 mt-auto flex h-28 items-center justify-center overflow-visible border-t border-white/10 bg-black/20 px-8 pb-7 pt-6"
        >
          <div className="flex items-center justify-center gap-2">
            <DockIcon
              title="Performance"
              active={hoveredIcon === 0}
              onHoverChange={(hovered) => handleHoverChange(0, hovered)}
              mouseX={mouseX}
              icon={<TrendingUp className="h-full w-full text-white/90" />}
            />
            <DockIcon
              title="Optimization"
              active={hoveredIcon === 1}
              onHoverChange={(hovered) => handleHoverChange(1, hovered)}
              mouseX={mouseX}
              icon={<Gauge className="h-full w-full text-white/90" />}
            />
            <DockIcon
              title="Lightning fast"
              featured
              active={hoveredIcon === null || hoveredIcon === 2}
              onHoverChange={(hovered) => handleHoverChange(2, hovered)}
              mouseX={mouseX}
              icon={<Zap className="h-full w-full text-white drop-shadow-lg" />}
            />
            <DockIcon
              title="Deploy"
              active={hoveredIcon === 3}
              onHoverChange={(hovered) => handleHoverChange(3, hovered)}
              mouseX={mouseX}
              icon={<Rocket className="h-full w-full text-white/90" />}
            />
            <DockIcon
              title="SEO ready"
              active={hoveredIcon === 4}
              onHoverChange={(hovered) => handleHoverChange(4, hovered)}
              mouseX={mouseX}
              icon={<Search className="h-full w-full text-white/90" />}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
