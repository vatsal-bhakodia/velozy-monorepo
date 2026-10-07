import React, { useEffect, useState } from "react";

interface ContentLoadingOverlayProps {
  isVisible: boolean;
}

const BUILD_MESSAGES = [
  "Laying the foundation...",
  "Arranging components...",
  "Wiring up interactions...",
  "Polishing the pixels...",
  "Almost canvas-ready...",
];

export const ContentLoadingOverlay = ({
  isVisible,
}: ContentLoadingOverlayProps) => {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    // Pick an initial random message
    let currentIndex = Math.floor(Math.random() * BUILD_MESSAGES.length);
    setMsgIndex(currentIndex);

    const msgInterval = setInterval(() => {
      let nextIndex = Math.floor(Math.random() * BUILD_MESSAGES.length);
      // Ensure we don't pick the same message twice in a row
      while (nextIndex === currentIndex && BUILD_MESSAGES.length > 1) {
        nextIndex = Math.floor(Math.random() * BUILD_MESSAGES.length);
      }
      currentIndex = nextIndex;
      setMsgIndex(currentIndex);
    }, 1800);

    return () => {
      clearInterval(msgInterval);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <>
      <style>{`
        @keyframes blockSnap {
          0%, 100% { opacity: 0.15; transform: scale(0.85) translateY(4px); }
          50% { opacity: 1; transform: scale(1) translateY(0px); }
        }
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; } 50% { opacity: 0; }
        }
        @keyframes scaffoldRise {
          0% { transform: scaleY(0); opacity: 0; }
          100% { transform: scaleY(1); opacity: 1; }
        }
        @keyframes floatDot {
          0%, 100% { transform: translateY(0px); } 
          50% { transform: translateY(-6px); }
        }
        @keyframes progressFill {
          from { width: 0%; }
        }
      `}</style>

      <div className="absolute inset-0 z-50 flex items-center justify-center bg-neutral-100 overflow-hidden">
        {/* Main content */}
        <div className="relative flex flex-col items-center gap-8 px-8">
          {/* Builder illustration */}
          <div className="relative flex flex-col items-center gap-2">
            {/* Scaffold / browser chrome mockup */}
            <div
              className="w-56 h-36 rounded-lg border border-neutral-700 bg-neutral-900 overflow-hidden shadow-2xl shadow-cyan-500/10"
              style={{ animation: "scaffoldRise 0.6s ease-out forwards" }}
            >
              {/* Browser bar */}
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-neutral-800 bg-neutral-950">
                <div className="w-2 h-2 rounded-full bg-red-500/60" />
                <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
                <div className="w-2 h-2 rounded-full bg-green-500/60" />
                <div className="flex-1 mx-2 h-1.5 rounded-full bg-neutral-800" />
              </div>

              {/* Canvas area — animated blocks snapping in */}
              <div className="p-3 flex flex-col gap-2">
                {/* Header row */}
                <div className="flex gap-2 items-center">
                  <div
                    className="w-6 h-6 rounded bg-cyan-500/30"
                    style={{
                      animation: "blockSnap 2s ease-in-out 0.1s infinite",
                    }}
                  />
                  <div
                    className="flex-1 h-2 rounded-full bg-neutral-700/80"
                    style={{
                      animation: "blockSnap 2s ease-in-out 0.3s infinite",
                    }}
                  />
                </div>
                {/* Body blocks */}
                <div className="flex gap-2">
                  <div
                    className="w-16 h-10 rounded bg-blue-500/20"
                    style={{
                      animation: "blockSnap 2s ease-in-out 0.5s infinite",
                    }}
                  />
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div
                      className="h-2 rounded-full bg-neutral-700/80"
                      style={{
                        animation: "blockSnap 2s ease-in-out 0.7s infinite",
                      }}
                    />
                    <div
                      className="h-2 rounded-full bg-neutral-700/50 w-3/4"
                      style={{
                        animation: "blockSnap 2s ease-in-out 0.9s infinite",
                      }}
                    />
                    <div
                      className="h-2 rounded-full bg-neutral-700/30 w-1/2"
                      style={{
                        animation: "blockSnap 2s ease-in-out 1.1s infinite",
                      }}
                    />
                  </div>
                </div>
                {/* Footer row */}
                <div className="flex gap-1.5 mt-0.5">
                  <div
                    className="h-3 w-10 rounded bg-cyan-400/40"
                    style={{
                      animation: "blockSnap 2s ease-in-out 1.3s infinite",
                    }}
                  />
                  <div
                    className="h-3 w-8 rounded bg-neutral-700/50"
                    style={{
                      animation: "blockSnap 2s ease-in-out 1.5s infinite",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Message + cursor */}
          <div className="flex items-center gap-1 h-5">
            <span
              className="text-sm text-gray-500 tracking-wide transition-all duration-500"
              key={msgIndex}
              style={{ animation: "scaffoldRise 0.4s ease-out" }}
            >
              {BUILD_MESSAGES[msgIndex]}
            </span>
            <span
              className="inline-block w-0.5 h-4 bg-blue-500 ml-0.5"
              style={{ animation: "cursorBlink 1s step-end infinite" }}
            />
          </div>
        </div>
      </div>
    </>
  );
};
