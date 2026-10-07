import React, { useState, useEffect } from "react";

export const Confetti = ({ isVisible }: { isVisible: boolean }) => {
  const [particles, setParticles] = useState<
    Array<{
      id: number;
      x: number;
      y: number;
      color: string;
      width: number;
      height: number;
      rotation: number;
      rotationSpeed: number;
      velocity: { x: number; y: number };
      gravity: number;
      life: number;
      maxLife: number;
    }>
  >([]);

  useEffect(() => {
    if (isVisible) {
      const colors = [
        "#ff6b6b", // Red
        "#4ecdc4", // Teal
        "#45b7d1", // Blue
        "#96ceb4", // Green
        "#feca57", // Yellow
        "#ff9ff3", // Pink
        "#54a0ff", // Light Blue
        "#5f27cd", // Purple
        "#00d2d3", // Cyan
        "#ff9f43", // Orange
        "#ffd93d", // Bright Yellow
        "#6c5ce7", // Violet
      ];

      // Start from bottom center with slight spread
      const centerX = window.innerWidth / 2;
      const bottomY = window.innerHeight;

      const newParticles = Array.from({ length: 80 }, (_, i) => {
        // Create reverse cone spread - tighter at bottom, wider at top
        const spreadAngle = (Math.random() - 0.5) * Math.PI * 0.6; // 108 degrees spread
        const initialSpeed = Math.random() * 12 + 8; // 8-20 speed

        return {
          id: i,
          x: centerX + (Math.random() - 0.5) * 100, // Small initial spread at bottom
          y: bottomY - 50, // Start slightly above bottom
          color: colors[Math.floor(Math.random() * colors.length)],
          width: Math.random() * 8 + 6, // 6-14px width
          height: Math.random() * 12 + 8, // 8-20px height (rectangles)
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 15, // -7.5 to 7.5 degrees per frame
          velocity: {
            x: Math.sin(spreadAngle) * initialSpeed,
            y: -Math.cos(spreadAngle) * initialSpeed, // Negative for upward movement
          },
          gravity: Math.random() * 0.3 + 0.2, // 0.2-0.5 gravity
          life: 0,
          maxLife: Math.random() * 120 + 180, // 3-5 seconds at 60fps
        };
      });

      setParticles(newParticles);

      const interval = setInterval(() => {
        setParticles((prev) =>
          prev
            .map((particle) => ({
              ...particle,
              x: particle.x + particle.velocity.x,
              y: particle.y + particle.velocity.y,
              rotation: particle.rotation + particle.rotationSpeed,
              velocity: {
                x: particle.velocity.x * 0.995, // Air resistance
                y: particle.velocity.y + particle.gravity, // Gravity pulls down
              },
              life: particle.life + 1,
            }))
            .filter(
              (particle) =>
                particle.life < particle.maxLife &&
                particle.y < window.innerHeight + 100 &&
                particle.x > -50 &&
                particle.x < window.innerWidth + 50,
            ),
        );
      }, 16); // ~60fps

      const timeout = setTimeout(() => {
        setParticles([]);
      }, 5000); // Clean up after 5 seconds

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [isVisible]);

  if (!isVisible || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {particles.map((particle) => {
        // Calculate opacity based on life (fade out near end)
        const opacity = Math.max(
          0,
          1 - (particle.life / particle.maxLife) * 0.3,
        );

        return (
          <div
            key={particle.id}
            className="absolute"
            style={{
              left: particle.x - particle.width / 2,
              top: particle.y - particle.height / 2,
              width: particle.width,
              height: particle.height,
              backgroundColor: particle.color,
              transform: `rotate(${particle.rotation}deg)`,
              opacity: opacity,
              borderRadius: "1px", // Slight rounding for realistic look
              boxShadow: `0 0 4px ${particle.color}30`,
            }}
          />
        );
      })}
    </div>
  );
};
