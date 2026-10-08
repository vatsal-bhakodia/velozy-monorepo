"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Send, X, SkipForward } from "lucide-react";
import { ThemeDropdown } from "./theme-dropdown";
import { StyleSelection } from "./style-selection";
import { siteStyles } from "@/src/onboard/constants/site-style";
import { motion, AnimatePresence } from "framer-motion";
import type { StructureStage } from "@/src/onboard/types";

const BotMsg = ({
  content,
  onComplete,
}: {
  content: string;
  onComplete?: () => void;
}) => {
  const [displayedContent, setDisplayedContent] = useState("");
  const hasStreamed = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Already streamed before — show instantly and fire complete
    if (hasStreamed.current) {
      setDisplayedContent(content);
      onCompleteRef.current?.();
      return;
    }

    let i = 0;
    const interval = setInterval(() => {
      setDisplayedContent(content.substring(0, i + 1));
      i++;
      if (i >= content.length) {
        clearInterval(interval);
        hasStreamed.current = true;
        onCompleteRef.current?.();
      }
    }, 15);

    return () => clearInterval(interval);
  }, [content]);

  return <p className="text-sm">{displayedContent}</p>;
};

export const ChatPanel = ({
  chatContainerRef,
  chatMessages,
  currentStep,
  isChatOpen,
  setIsChatOpen,
  currentInput,
  setCurrentInput,
  handleInputSubmit,
  structureStage,
  showInput,
  isProcessing,
  onSkip,
  siteStyles: siteStylesProp,
  selectedStyle,
  isStyleConfirmed,
  handleStyleSelect,
  confirmStyleSelection,
  selectedTheme,
  isThemeConfirmed,
  handleThemeSelect,
  confirmThemeSelect,
  customThemes,
  activeTheme,
}: {
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  chatMessages: any[];
  currentStep: number;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  currentInput: string;
  setCurrentInput: (val: string) => void;
  handleInputSubmit: (e: any) => void;
  structureStage?: StructureStage;
  showInput: boolean;
  isProcessing: boolean;
  onSkip?: () => void;
  siteStyles?: typeof siteStyles;
  selectedStyle?: string;
  isStyleConfirmed?: boolean;
  handleStyleSelect?: (style: any) => void;
  confirmStyleSelection?: () => void;
  selectedTheme?: string;
  isThemeConfirmed?: boolean;
  handleThemeSelect?: (theme: any) => void;
  confirmThemeSelect?: () => void;
  customThemes?: any[];
  activeTheme?: any;
}) => {
  // Track which message index has finished streaming
  const [lastStreamedIndex, setLastStreamedIndex] = useState<number>(-1);

  // The last bot message index in the list
  const lastBotIndex = chatMessages.reduce(
    (acc, msg, i) => (msg.type === "bot" ? i : acc),
    -1,
  );

  // All streaming is done when the very last bot message has completed
  const isStreamingComplete = lastStreamedIndex >= lastBotIndex;

  // Whenever new messages arrive, reset streaming-complete state
  useEffect(() => {
    if (chatMessages.length === 0) {
      setLastStreamedIndex(-1);
    }
  }, [chatMessages.length]);

  // Should we show the style picker?
  const showStyleSelection =
    currentStep === 3 &&
    siteStylesProp &&
    isThemeConfirmed &&
    !isStyleConfirmed &&
    !isProcessing &&
    isStreamingComplete;

  // Should we show the theme picker?
  const showThemeSelection =
    currentStep === 3 &&
    !isThemeConfirmed &&
    !isProcessing &&
    isStreamingComplete;

  return (
    <div className="flex h-full flex-col bg-white dark:bg-[#202124]">
      {/* Chat Header */}
      <div className="relative flex flex-shrink-0 items-center gap-3.5 border-b border-gray-200/80 bg-gray-50/70 px-5 py-5 dark:border-white/[0.08] dark:bg-white/[0.015]">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient text-white sm:h-12 sm:w-12">
          <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-medium leading-6 text-neutral-950 dark:text-neutral-50">
            {currentStep === 1 && "Tell us about your business"}
            {currentStep === 2 &&
              (structureStage === "pages"
                ? "Plan your pages"
                : "Homepage structure")}
            {currentStep === 3 && "Choose your design"}
          </h3>

          <p className="text-sm text-gray-600 dark:text-neutral-400">
            Creative Assistant
          </p>
        </div>
        <button
          onClick={() => setIsChatOpen(false)}
          className="flex h-9 w-9 items-center justify-center rounded-md bg-gray-100 text-gray-500 transition-colors duration-200 hover:bg-gray-200 hover:text-gray-700 dark:bg-white/[0.06] dark:text-neutral-300 dark:hover:bg-white/[0.1] lg:hidden"
          aria-label="Close chat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-neutral-50/70 p-4 dark:bg-[#202124] sm:p-5"
      >
        {chatMessages.map((message: any, index: number) => (
          <div
            key={index}
            className={`flex items-end gap-2.5 ${message.type === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`relative max-w-[85%] rounded-lg px-4 py-3 ${
                message.type === "user"
                  ? "rounded-tr-none bg-[#cbe1f9] text-blue-950 after:absolute after:-right-1.5 after:top-0 after:h-2.5 after:w-2.5 after:bg-[#cbe1f9] after:[clip-path:polygon(0_100%,0_0,100%_0)] after:content-['']"
                  : "rounded-tl-none bg-white text-neutral-800 before:absolute before:-left-1.5 before:top-0 before:h-2.5 before:w-2.5 before:bg-white before:[clip-path:polygon(100%_100%,100%_0,0_0)] before:content-[''] dark:bg-[#303236] dark:text-neutral-100 dark:before:bg-[#303236]"
              }`}
            >
              {message.type === "bot" ? (
                <BotMsg
                  content={message.content}
                  onComplete={() => {
                    // Only advance the pointer forward, never back
                    setLastStreamedIndex((prev) => Math.max(prev, index));
                  }}
                />
              ) : (
                <p className="text-sm">{message.content}</p>
              )}
            </div>
          </div>
        ))}

        {/* Style Selection — appears only after all streaming is done */}
        <AnimatePresence>
          {showStyleSelection && (
            <motion.div
              key="style-selection"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{
                duration: 0.45,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <StyleSelection
                siteStyles={siteStylesProp}
                handleStyleSelect={handleStyleSelect!}
                selectedStyle={selectedStyle!}
                confirmStyleSelection={confirmStyleSelection!}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Theme Selection — appears only after style is confirmed & streaming done */}
        <AnimatePresence>
          {showThemeSelection && (
            <motion.div
              key="theme-selection"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{
                duration: 0.45,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <ThemeDropdown
                selectedTheme={selectedTheme!}
                handleThemeSelect={handleThemeSelect!}
                confirmThemeSelect={confirmThemeSelect!}
                customThemes={customThemes || []}
                activeTheme={activeTheme}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      {showInput && (
        <div className="flex-shrink-0 border-t border-gray-200/80 bg-white px-4 pt-4 pb-0 dark:border-white/[0.08] dark:bg-[#202124]">
          <div className="flex gap-2.5">
            <input
              type="text"
              maxLength={
                currentStep === 1 ? 2000 : currentStep === 2 ? 1000 : 500
              }
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInputSubmit(e)}
              placeholder={
                currentStep === 1
                  ? "Tell us about your business..."
                  : currentStep === 2
                    ? structureStage === "pages"
                      ? "Tell me which pages to add or remove..."
                      : "Describe what homepage sections to add or change..."
                    : isThemeConfirmed
                      ? "Ask for a color or palette change..."
                      : "Tell me your color or mood preferences..."
              }
              className="min-w-0 flex-1 rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.1] dark:bg-[#292a2d] dark:text-neutral-50 dark:placeholder:text-neutral-400 dark:focus:border-cyan-400 dark:focus:bg-[#292a2d]"
              autoFocus
            />
            {currentStep === 1 && onSkip && (
              <button
                onClick={onSkip}
                className="flex items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-600 transition-colors hover:border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-[#252527] dark:text-neutral-300 dark:hover:bg-[#303033]"
                title="Skip this step"
              >
                <SkipForward className="w-4 h-4" />
                <span className="hidden sm:inline">Skip</span>
              </button>
            )}
            <button
              onClick={handleInputSubmit}
              disabled={!currentInput.trim() || isProcessing}
              aria-label="Send message"
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md bg-gradient text-white shadow-sm transition-[filter,opacity] duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
