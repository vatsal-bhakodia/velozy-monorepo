"use client";

import React from "react";
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
import { profileWithSiteTypeChange } from "./recommended-pages";
import { apiFetch } from "@/src/lib/api";

const marketingUrl = (import.meta.env.VITE_MARKETING_URL ?? "http://localhost:3000").replace(/\/$/, "");

const OnBoard = () => {
  const { status } = useSession();
  const [projectEligibilityChecked, setProjectEligibilityChecked] = React.useState(false);
  const onboardingState = useOnboarding(() => setIsAuthModalOpen(true));
  const { resolvedTheme, setTheme } = useTheme();
  const chatHandlers = useChatHandlers(onboardingState);
  const logoHandlers = useLogoHandlers(onboardingState);

  React.useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      setProjectEligibilityChecked(true);
      return;
    }
    let cancelled = false;
    void apiFetch("/api/admin/projects", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not check project eligibility");
        const result = await response.json();
        if (cancelled) return;
        if (result.canCreateProject === false) {
          window.location.replace(`${marketingUrl}/pricing?reason=additional-project`);
          return;
        }
        setProjectEligibilityChecked(true);
      })
      .catch(() => {
        if (!cancelled) setProjectEligibilityChecked(true);
      });
    return () => { cancelled = true; };
  }, [status]);

  const {
    currentStep,
    chatMessages,
    currentInput,
    setCurrentInput,
    currentQuestion,
    isProcessing,
    isChatOpen,
    setIsChatOpen,
    unreadCount,
    setUnreadCount,
    isPremiumModalOpen,
    setIsPremiumModalOpen,
    isAuthModalOpen,
    setIsAuthModalOpen,
    siteProfile,
    setSiteProfile,
    setCurrentStep,
    structureStage,
    setStructureStage,
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

  const setPlannedPages: React.Dispatch<React.SetStateAction<string[]>> = (
    value,
  ) =>
    setSiteProfile((current) => ({
      ...current,
      plannedPages:
        typeof value === "function" ? value(current.plannedPages) : value,
    }));

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
  // Page planning is immediate; the homepage sections chat appears after generation.
  // Step 3: always visible
  const shouldShowChat =
    currentStep === 1 ||
    (currentStep === 2 &&
      (structureStage === "pages" || (sectionsGenerated && !isProcessing))) ||
    currentStep === 3;

  // Whether we need a input field for current step/state
  const shouldShowInput =
    currentStep === 1 ||
    (currentStep === 2 &&
      (structureStage === "pages" || (sectionsGenerated && !isProcessing))) ||
    (currentStep === 3 && (!isThemeConfirmed || isStyleConfirmed));

  const handleProfileChange = (
    field: keyof typeof siteProfile,
    value: string | string[],
  ) => {
    setSiteProfile((prev: typeof siteProfile) => {
      if (field === "storeType") {
        const selectedStoreType = value as typeof prev.storeType;
        const capabilities: typeof prev.capabilities = prev.capabilities.filter(
          (capability) =>
            capability !== "products" && capability !== "checkout",
        );
        if (selectedStoreType) capabilities.push("products");
        if (selectedStoreType === "ecommerce") capabilities.push("checkout");
        return profileWithSiteTypeChange(
          { ...prev, capabilities },
          { storeType: selectedStoreType },
        );
      }
      if (field === "subType") {
        return profileWithSiteTypeChange(prev, {
          subType: value as typeof prev.subType,
        });
      }
      if (field !== "archetype") return { ...prev, [field]: value };

      const requiredModule: (typeof prev.modules)[number] | null =
        value === "blog" ? "blog" : value === "store" ? "ecommerce" : null;
      const capabilities: typeof prev.capabilities = prev.capabilities.filter(
        (capability) =>
          !["bookings", "products", "checkout"].includes(capability),
      );
      if (value === "booking") capabilities.push("bookings");
      if (value === "store") capabilities.push("products");

      return profileWithSiteTypeChange(
        {
          ...prev,
          storeType:
            value === prev.archetype && value === "store" ? prev.storeType : "",
          subType: value === prev.archetype ? prev.subType : "",
          modules: [
            ...prev.modules.filter(
              (module) => module !== "blog" && module !== "ecommerce",
            ),
            ...(requiredModule ? [requiredModule] : []),
          ],
          capabilities,
        },
        { archetype: value as typeof prev.archetype },
      );
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

  const handleNext = () => {
    if (currentStep === 2 && structureStage === "pages") {
      onboardingState.setChatMessages([]);
      onboardingState.setIsProcessing(true);
      setStructureStage("sections");
      return;
    }
    continueOnboarding();
  };

  const handlePrevious = () => {
    if (currentStep === 2 && structureStage === "sections") {
      onboardingState.cancelSectionGeneration();
      onboardingState.setChatMessages([]);
      onboardingState.setIsProcessing(false);
      setStructureStage("pages");
      return;
    }
    prevStep();
  };

  if (status === "authenticated" && !projectEligibilityChecked) return null;

  return (
    <div className="relative h-screen max-h-screen overflow-hidden bg-[#fbfcfd] text-gray-900 transition-colors duration-300 dark:bg-[#171717] dark:text-neutral-100">
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute inset-[-14%] bg-[radial-gradient(ellipse_at_12%_42%,rgba(18,222,223,.24),transparent_48%),radial-gradient(ellipse_at_52%_46%,rgba(8,169,237,.18),transparent_48%),radial-gradient(ellipse_at_88%_88%,rgba(21,87,245,.2),transparent_46%),radial-gradient(ellipse_at_18%_96%,rgba(18,169,237,.16),transparent_44%),radial-gradient(ellipse_at_52%_35%,rgba(255,255,255,.84),transparent_55%)] blur-3xl dark:hidden" />
        <div className="absolute inset-x-[-18%] top-[-12%] hidden h-[34rem] bg-[radial-gradient(ellipse_at_38%_24%,rgba(103,232,249,.2),transparent_34%),radial-gradient(ellipse_at_66%_42%,rgba(37,99,235,.14),transparent_42%),radial-gradient(ellipse_at_52%_78%,rgba(99,102,241,.1),transparent_48%)] blur-3xl dark:block" />
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
              h-full w-full lg:relative lg:h-[min(680px,calc(100vh-9rem))] lg:overflow-hidden lg:rounded-lg lg:border lg:border-gray-200/80 lg:bg-white lg:shadow-[0_24px_70px_rgba(15,23,42,0.12)] lg:flex lg:flex-col dark:lg:border-white/[0.09] dark:lg:bg-[#202124] dark:lg:shadow-[0_24px_70px_rgba(0,0,0,0.3)]
              fixed inset-x-0 top-0 bottom-[64px] pb-4 sm:bottom-[76px] z-40 bg-white/95 backdrop-blur-lg flex flex-col transition-all duration-500 ease-out dark:bg-[#202124]/95 dark:lg:bg-[#202124]/95 dark:lg:border-white/[0.09]
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
              structureStage={structureStage}
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
              customThemes={customThemes}
              activeTheme={activeTheme}
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
                plannedPages={siteProfile.plannedPages}
                setPlannedPages={setPlannedPages}
                structureStage={structureStage}
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
          if (!open && status !== "authenticated")
            localStorage.removeItem(ONBOARDING_AUTH_PENDING_KEY);
        }}
        onAuthenticated={() => {
          setIsAuthModalOpen(false);
        }}
      />

      <BottomNav
        currentStep={currentStep}
        prevStep={handlePrevious}
        nextStep={nextStep}
        generatePrompt={generatePrompt}
        canProceedFromStep0={!!canProceedFromStep0}
        canProceedFromStep1={!!canProceedFromStep1}
        canProceedFromStep2={!!canProceedFromStep2}
        canProceedFromStep3={!!canProceedFromStep3}
        isCreatingProject={isCreatingProject}
        nextStepDescription={
          currentStep === 2 && structureStage === "pages"
            ? "Click Next to generate your homepage structure."
            : undefined
        }
        onNext={handleNext}
      />
    </div>
  );
};

export default OnBoard;
