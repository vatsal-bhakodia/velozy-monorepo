"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Send, X, SkipForward } from "lucide-react";
import { ThemeDropdown } from "./theme-dropdown";
import { StyleSelection } from "./style-selection";
import { siteStyles } from "@/src/onboard/constants/site-style";
import { motion, AnimatePresence } from "framer-motion";

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
  siteProfile,
  customThemes,
  setCustomThemes,
  activeTheme,
  setActiveTheme,
  logoPreview,
}: {
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  chatMessages: any[];
  currentStep: number;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  currentInput: string;
  setCurrentInput: (val: string) => void;
  handleInputSubmit: (e: any) => void;
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
  siteProfile?: any;
  customThemes?: any[];
  setCustomThemes?: (themes: any[]) => void;
  activeTheme?: any;
  setActiveTheme?: (theme: any) => void;
  logoPreview?: string;
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
    !isThemeConfirmed &&
    !isProcessing &&
    isStreamingComplete;

  return (
    <div className="flex h-full flex-col bg-white dark:bg-neutral-800">
      {/* Chat Header */}
      <div className="relative flex flex-shrink-0 items-center gap-3.5 border-b border-gray-200/80 px-5 py-5 dark:border-neutral-700/80">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient text-white shadow-lg shadow-cyan-500/15">
          <Sparkles className="h-6 w-6" />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-cyan-400 dark:border-neutral-900" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="mt-1 truncate text-lg font-bold tracking-[-0.025em] text-neutral-950 dark:text-white">
            {currentStep === 1 && "Tell us about your business"}
            {currentStep === 2 && "Customize your sections"}
            {currentStep === 3 && "Choose your design"}
          </h3>

          <p className="text-sm text-gray-600 dark:text-neutral-400">
            Creative Assistant
          </p>
        </div>
        <button
          onClick={() => setIsChatOpen(false)}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition-all duration-200 hover:bg-gray-200 hover:text-gray-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 lg:hidden"
          aria-label="Close chat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 min-h-0 space-y-5 overflow-y-auto bg-neutral-50/70 p-5 dark:bg-neutral-800"
      >
        {chatMessages.map((message: any, index: number) => (
          <div
            key={index}
            className={`flex items-end gap-2.5 ${message.type === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.type === "bot" && (
              <div className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                message.type === "user"
                  ? "rounded-br-md border border-neutral-200 bg-neutral-100 text-neutral-800 shadow-sm dark:border-neutral-600 dark:bg-neutral-700 dark:text-white"
                  : "rounded-bl-md border border-neutral-200/80 bg-white text-neutral-800 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
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
                industry={siteProfile?.industry}
                styleType={selectedStyle!}
                customThemes={customThemes || []}
                setCustomThemes={setCustomThemes!}
                activeTheme={activeTheme}
                setActiveTheme={setActiveTheme}
                logoPreview={logoPreview}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      {showInput && (
        <div className="flex-shrink-0 border-t border-gray-200/80 bg-white p-4 dark:border-neutral-700/80 dark:bg-neutral-800">
          <div className="flex gap-2.5">
            <input
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInputSubmit(e)}
              placeholder={
                currentStep === 1
                  ? "Tell us about your business..."
                  : currentStep === 2
                    ? "Describe what sections you want to add or change..."
                    : "Type your answer..."
              }
              className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-cyan-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-50 dark:placeholder:text-neutral-400 dark:focus:border-cyan-400 dark:focus:bg-neutral-700"
              autoFocus
            />
            {currentStep === 1 && onSkip && (
              <button
                onClick={onSkip}
                className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-600 transition-colors hover:border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                title="Skip this step"
              >
                <SkipForward className="w-4 h-4" />
                <span className="hidden sm:inline">Skip</span>
              </button>
            )}
            <button
              onClick={handleInputSubmit}
              disabled={!currentInput.trim() || isProcessing}
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-white shadow-[0_8px_20px_rgba(6,182,212,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-cyan-400 hover:shadow-[0_12px_24px_rgba(6,182,212,0.3)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
