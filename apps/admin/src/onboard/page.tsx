"use client";

import React, { useState } from "react";
import { useTheme } from "@/src/lib/theme";
import { MessageCircle } from "lucide-react";
import { BottomNav } from "@/components/onboard/botttom-nav";
import { ChatPanel } from "@/components/onboard/chat-panel";
import { SiteProfileInput } from "@/components/onboard/site-profile-input";
import { SiteProfileCard } from "@/components/onboard/site-profile-card";
import { SiteSectionsPanel } from "@/components/onboard/site-sections-panel";
import { PremiumModal } from "@/components/onboard/premium-modal";
import { siteStyles } from "@/src/onboard/constants/site-style";
import { SitePreview } from "@/components/onboard/site-preview";
import { useOnboarding } from "./use-onboarding";
import { useChatHandlers } from "./use-chat-handlers";
import { useLogoHandlers } from "./use-logo-handlers";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { useSession } from "@/src/lib/auth";
import { ONBOARDING_AUTH_PENDING_KEY } from "./storage-keys";
import { OnboardingAuthModal } from "@/components/onboard/onboarding-auth-modal";

const OnBoard = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { status } = useSession();
  const onboardingState = useOnboarding(() => setIsAuthModalOpen(true));
  const { resolvedTheme, setTheme } = useTheme();
  const chatHandlers = useChatHandlers(onboardingState);
  const logoHandlers = useLogoHandlers(onboardingState);

  const {
    currentStep,
    chatMessages,
    currentInput,
    setCurrentInput,
    currentQuestion,
    isProcessing,
    siteProfile,
    setSiteProfile,
    setCurrentStep,
    siteSections,
    setSiteSections,
    selectedStyle,
    isStyleConfirmed,
    setIsStyleConfirmed,
    selectedTheme,
    isThemeConfirmed,
    setIsThemeConfirmed,
    dragActive,
    logoFile,
    logoPreview,
    logoChoice,
    step1Questions,
    canProceedFromStep0,
    canProceedFromStep1,
    canProceedFromStep2,
    nextStep,
    prevStep,
    generatePrompt,
    generateSections,
    isCreatingProject,
    customThemes,
    setCustomThemes,
    activeTheme,
    setActiveTheme,
    hasOnboardingData,
    isStep0FormComplete,
    sectionsGenerated,
    canProceedFromStep3,
  } = onboardingState;

  const {
    chatContainerRef,
    fileInputRef,
    handleInputSubmit,
    handleStyleSelect,
    confirmStyleSelection,
    handleThemeSelect,
    confirmThemeSelect,
  } = chatHandlers;

  const {
    handleDrag,
    handleDrop,
    handleFileInputChange,
    handleLogoUpload,
    handleLogoGenerate,
    clearLogo,
  } = logoHandlers;

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  React.useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated" && currentStep > 1) {
      setCurrentStep(1);
      localStorage.setItem(ONBOARDING_AUTH_PENDING_KEY, "1");
      setIsAuthModalOpen(true);
      return;
    }
    if (localStorage.getItem(ONBOARDING_AUTH_PENDING_KEY) !== "1") return;
    if (status === "authenticated") {
      localStorage.removeItem(ONBOARDING_AUTH_PENDING_KEY);
      setIsAuthModalOpen(false);
      setCurrentStep(2);
    } else {
      setIsAuthModalOpen(true);
    }
  }, [status, currentStep, setCurrentStep]);

  // Default to open on desktop
  React.useEffect(() => {
    if (window.innerWidth >= 1024) {
      setIsChatOpen(true);
    }
  }, []);

  // Update unread count when messages arrive and chat is closed
  React.useEffect(() => {
    if (!isChatOpen && chatMessages.length > 0) {
      setUnreadCount((prev) => prev + 1);
    } else {
      setUnreadCount(0);
    }
  }, [chatMessages, isChatOpen]);

  // Handle auto-opening chat on specific steps
  React.useEffect(() => {
    // Open when entering visual design step or entering business details initially
    if (currentStep === 3 || currentStep === 1) {
      setIsChatOpen(true);
    } else if (currentStep === 2 && window.innerWidth < 1024) {
      // Step 2 features site structure which takes up screen space on mobile; close chat by default to allow preview
      setIsChatOpen(false);
    }
  }, [currentStep]);

  React.useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasOnboardingData) return;
      event.preventDefault();
      event.returnValue =
        "Your onboarding data will be lost if you leave this page.";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasOnboardingData]);

  // Determine if chatbox should be visible
  // Step 1: always visible for chat
  // Step 2: only after sections are generated
  // Step 3: always visible
  const shouldShowChat =
    currentStep === 1 ||
    (currentStep === 2 && sectionsGenerated) ||
    currentStep === 3;

  // Whether we need a input field for current step/state
  const shouldShowInput =
    currentStep === 1 ||
    (currentStep === 2 && sectionsGenerated) ||
    (currentStep === 3 && !isThemeConfirmed);

  const handleProfileChange = (
    field: keyof typeof siteProfile,
    value: string | string[],
  ) => {
    setSiteProfile((prev: typeof siteProfile) => {
      if (field !== "archetype") return { ...prev, [field]: value };

      const requiredModule: (typeof prev.modules)[number] | null =
        value === "blog" ? "blog" : value === "store" ? "ecommerce" : null;

      return {
        ...prev,
        archetype: value as typeof prev.archetype,
        storeType: value === "store" ? prev.storeType : "",
        subType: value === "store" ? "" : prev.subType,
        modules: [
          ...prev.modules.filter(
            (module) => module !== "blog" && module !== "ecommerce",
          ),
          ...(requiredModule ? [requiredModule] : []),
        ],
      };
    });
  };

  const handleSkipDescription = () => {
    setSiteProfile((prev: typeof siteProfile) => ({
      ...prev,
      businessDescription: "",
    }));
    continueOnboarding();
  };

  const continueOnboarding = () => {
    nextStep();
  };

  return (
    <div className="relative h-screen max-h-screen overflow-hidden bg-[#f4f5f5] text-gray-900 transition-colors duration-300 dark:bg-[#171717] dark:text-neutral-100">
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute inset-x-[-18%] top-[-12%] h-[34rem] bg-[radial-gradient(ellipse_at_38%_24%,rgba(103,232,249,.2),transparent_34%),radial-gradient(ellipse_at_66%_42%,rgba(37,99,235,.14),transparent_42%),radial-gradient(ellipse_at_52%_78%,rgba(99,102,241,.1),transparent_48%)] blur-3xl" />
        <div className="absolute -left-28 top-[8%] h-80 w-80 rounded-full bg-cyan-400/[0.07] blur-[90px] dark:bg-cyan-400/[0.045]" />
        <div className="absolute right-[5%] top-[14%] h-96 w-96 rounded-full bg-sky-400/[0.06] blur-[110px] dark:bg-sky-500/[0.035]" />
        <div className="absolute inset-0 opacity-[0.018] dark:opacity-[0.035] [background-image:radial-gradient(currentColor_0.7px,transparent_0.7px)] [background-size:18px_18px]" />
      </div>
      <div className="absolute right-4 top-4 z-[60] sm:right-6 sm:top-5">
        <div className="rounded-xl border border-gray-200/80 bg-white/80 p-0.5 shadow-[0_8px_30px_rgba(15,23,42,0.08)] backdrop-blur-md dark:border-neutral-700/80 dark:bg-neutral-800/90 dark:shadow-black/20">
          <AnimatedThemeToggler
            theme={resolvedTheme === "dark" ? "dark" : "light"}
            onThemeChange={setTheme}
            variant="circle"
            duration={450}
            aria-label="Toggle theme"
            className="flex h-9 w-9 items-center justify-center rounded-lg p-2 text-neutral-700 transition-colors hover:bg-neutral-200 dark:text-neutral-200 dark:hover:bg-neutral-700"
          />
        </div>
      </div>
      {/* Main Content */}
      <div className="relative z-10 mx-auto flex h-[calc(100vh-4rem)] max-w-7xl flex-col px-4 py-5 sm:px-6 sm:py-6">
        <div className="grid min-h-0 flex-1 grid-cols-1 items-center gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(410px,0.95fr)] lg:gap-9">
          {/* Chat Panel */}
          <div
            className={`
              h-full w-full lg:relative lg:h-[min(680px,calc(100vh-9rem))] lg:overflow-hidden lg:rounded-[1.75rem] lg:border lg:border-gray-200/80 lg:bg-white lg:shadow-[0_24px_70px_rgba(15,23,42,0.12)] lg:flex lg:flex-col dark:lg:border-neutral-700 dark:lg:bg-neutral-800 dark:lg:shadow-[0_24px_70px_rgba(0,0,0,0.3)]
              fixed inset-x-0 top-0 bottom-[64px] pb-4 sm:bottom-[76px] z-40 bg-white/95 backdrop-blur-lg flex flex-col transition-all duration-500 ease-out dark:bg-neutral-800/95 dark:lg:bg-neutral-800/95 dark:lg:border-neutral-700/70
              ${shouldShowChat ? "lg:!static lg:!z-auto lg:!bg-white dark:lg:!bg-neutral-800" : "absolute -left-[9999px] opacity-0 pointer-events-none lg:hidden"}
              ${isChatOpen ? "translate-y-0 opacity-100" : "translate-y-full lg:translate-y-0 opacity-0 lg:opacity-100"}
            `}
            style={{
              display: !shouldShowChat ? "none" : "flex",
            }}
          >
            <ChatPanel
              chatContainerRef={chatContainerRef}
              chatMessages={chatMessages}
              currentStep={currentStep}
              isChatOpen={isChatOpen}
              setIsChatOpen={setIsChatOpen}
              currentInput={currentInput}
              setCurrentInput={setCurrentInput}
              handleInputSubmit={handleInputSubmit}
              showInput={shouldShowInput}
              isProcessing={isProcessing}
              onSkip={currentStep === 1 ? handleSkipDescription : undefined}
              siteStyles={siteStyles}
              selectedStyle={selectedStyle}
              isStyleConfirmed={isStyleConfirmed}
              handleStyleSelect={handleStyleSelect}
              confirmStyleSelection={confirmStyleSelection}
              selectedTheme={selectedTheme}
              isThemeConfirmed={isThemeConfirmed}
              handleThemeSelect={handleThemeSelect}
              confirmThemeSelect={confirmThemeSelect}
              siteProfile={siteProfile}
              customThemes={customThemes}
              setCustomThemes={setCustomThemes}
              activeTheme={activeTheme}
              setActiveTheme={setActiveTheme}
              logoPreview={logoPreview}
            />
          </div>

          {currentStep === 0 && (
            <div
              className={`${!shouldShowChat ? "lg:col-span-2" : ""} min-h-0 overflow-y-auto w-full flex items-start justify-center`}
            >
              <SiteProfileInput
                siteProfile={siteProfile}
                onProfileChange={handleProfileChange}
                dragActive={dragActive}
                logoPreview={logoPreview}
                logoFile={logoFile}
                fileInputRef={fileInputRef}
                handleDrag={handleDrag}
                handleDrop={handleDrop}
                handleFileInputChange={handleFileInputChange}
                handleLogoUpload={handleLogoUpload}
                clearLogo={clearLogo}
                showPremiumModal={() => setIsPremiumModalOpen(true)}
              />
            </div>
          )}

          {currentStep === 1 && (
            <div
              className={`${!shouldShowChat ? "lg:col-span-2" : ""} min-h-0 overflow-y-auto w-full flex items-start justify-center`}
            >
              <SiteProfileCard
                siteProfile={siteProfile}
                logoPreview={logoPreview}
              />
            </div>
          )}

          {currentStep === 2 && (
            <div
              className={`${!shouldShowChat ? "lg:col-span-2" : ""} mx-auto flex h-[min(680px,calc(100vh-9rem))] min-h-0 w-full max-w-xl items-center justify-center`}
            >
              <SiteSectionsPanel
                isProcessing={isProcessing}
                siteSections={siteSections}
                setSiteSections={setSiteSections}
              />
            </div>
          )}

          {currentStep === 3 && (
            <div
              className={`${!shouldShowChat ? "lg:col-span-2" : ""} mx-auto h-[min(680px,calc(100vh-9rem))] min-h-0 w-full max-w-xl`}
            >
              <SitePreview
                selectedTheme={selectedTheme}
                selectedStyle={selectedStyle}
                customThemes={customThemes}
                isThemeConfirmed={isThemeConfirmed}
                activeTheme={activeTheme}
                onThemeChange={(theme) => {
                  setActiveTheme(theme);
                  setCustomThemes((previous: any[]) =>
                    previous.map((item) =>
                      item.id === theme.id ? theme : item,
                    ),
                  );
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Floating Chat Toggle Button - visible only on mobile when chat is closed & should be shown */}
      {!isChatOpen && shouldShowChat && (
        <button
          onClick={() => {
            setIsChatOpen(true);
            setUnreadCount(0);
          }}
          className="lg:hidden fixed bottom-20 right-4 z-50 w-14 h-14 flex items-center justify-center bg-gradient rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 group"
          aria-label="Open chat"
        >
          <div className="relative flex items-center justify-center">
            <MessageCircle className="w-7 h-7 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-4 -right-4 flex items-center justify-center h-5 w-5 rounded-full bg-red-500 border-2 border-white text-white text-[10px] font-bold shadow-sm">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
        </button>
      )}

      {/* Premium Modal */}
      <PremiumModal
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
      />

      <OnboardingAuthModal
        open={isAuthModalOpen}
        onOpenChange={(open) => {
          setIsAuthModalOpen(open);
          if (!open && status !== "authenticated") localStorage.removeItem(ONBOARDING_AUTH_PENDING_KEY);
        }}
        onAuthenticated={() => {
          setIsAuthModalOpen(false);
        }}
      />

      <BottomNav
        currentStep={currentStep}
        prevStep={prevStep}
        nextStep={nextStep}
        generatePrompt={generatePrompt}
        canProceedFromStep0={!!canProceedFromStep0}
        canProceedFromStep1={!!canProceedFromStep1}
        canProceedFromStep2={!!canProceedFromStep2}
        canProceedFromStep3={!!canProceedFromStep3}
        isCreatingProject={isCreatingProject}
        onNext={continueOnboarding}
      />
    </div>
  );
};

export default OnBoard;
