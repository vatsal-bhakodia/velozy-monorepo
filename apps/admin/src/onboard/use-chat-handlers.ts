import { useEffect, useRef } from "react";
import { ChatMessage, SiteProfile } from "./types";
import {
  getSiteStyleGuidance,
  siteStyles,
  SiteStyleProps,
} from "@/src/onboard/constants/site-style";
import themes from "@/src/onboard/constants/themes";
import { apiFetch } from "@/src/lib/api";
import { useSession } from "@/src/lib/auth";

export const useChatHandlers = (onboardingState: any) => {
  const { status } = useSession();
  const {
    currentStep,
    chatMessages,
    setChatMessages,
    currentInput,
    setCurrentInput,
    currentQuestion,
    setCurrentQuestion,
    isProcessing,
    setIsProcessing,
    siteProfile,
    setSiteProfile,
    selectedStyle,
    setSelectedStyle,
    isStyleConfirmed,
    setIsStyleConfirmed,
    selectedTheme,
    setSelectedTheme,
    isThemeConfirmed,
    setIsThemeConfirmed,
    customThemes,
    setCustomThemes,
    activeTheme,
    setActiveTheme,
    logoFile,
    logoPreview,
    logoChoice,
    setLogoChoice,
    hasInitialized,
    hasAskedQuestion,
    step1Questions,
    generateSections,
    updatePlannedPages,
    cancelSectionGeneration,
    sectionsGenerated,
    setSectionsGenerated,
    canReuseGeneratedSections,
    structureStage,
  } = onboardingState;

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentStepRef = useRef(currentStep);
  const sectionGenerationRunRef = useRef(0);

  useEffect(() => {
    currentStepRef.current = currentStep;
    if (currentStep !== 2) {
      sectionGenerationRunRef.current += 1;
      cancelSectionGeneration();
    }
  }, [currentStep, cancelSectionGeneration]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, logoPreview]);

  // Utility functions
  const addBotMessage = (content: string) => {
    setChatMessages((prev: ChatMessage[]) => [
      ...prev,
      { type: "bot", content },
    ]);
  };

  const addUserMessage = (content: string) => {
    setChatMessages((prev: ChatMessage[]) => [
      ...prev,
      { type: "user", content },
    ]);
  };

  const simulateTyping = (callback: () => void, delay = 0) => {
    // Replaced simulated typing with direct execution as we have streaming UI now
    setTimeout(() => {
      callback();
    }, delay);
  };

  // Step 1: Ask about business description
  const step1ChatActivePrev = useRef(false);
  useEffect(() => {
    if (currentStep === 1 && !step1ChatActivePrev.current) {
      step1ChatActivePrev.current = true;
      setChatMessages([]);
      simulateTyping(() => {
        addBotMessage(
          siteProfile.businessDescription
            ? `Your current business description is: “${siteProfile.businessDescription}”. Send an updated description to change it, or click Next to keep it.`
            : "Tell us about your business and what makes it unique. This helps us create a more accurate website structure. You can also skip this step.",
        );
      });
    }
    if (currentStep !== 1) {
      step1ChatActivePrev.current = false;
    }
  }, [currentStep, siteProfile.businessDescription]);

  // Reset initialization when step changes
  useEffect(() => {
    hasInitialized.current = false;
    hasAskedQuestion.current = false;
  }, [currentStep]);

  // Handle step transitions
  useEffect(() => {
    const handleStepTransition = async () => {
      if (currentStep === 2 && structureStage === "pages") {
        if (status !== "authenticated") return;
        sectionGenerationRunRef.current += 1;
        cancelSectionGeneration();
        setChatMessages([]);
        setIsProcessing(false);
        addBotMessage(
          "I suggested pages for your site type. Review the list and tell me what to add or remove. When it looks right, click Next to build the homepage structure.",
        );
      } else if (currentStep === 2 && structureStage === "sections") {
        if (status !== "authenticated") return;
        const runId = ++sectionGenerationRunRef.current;
        setChatMessages([]);

        if (canReuseGeneratedSections) {
          setSectionsGenerated(true);
          setIsProcessing(false);
          addBotMessage(
            "Your homepage structure is ready. Drag to reorder sections or tell me what to add, remove, or change.",
          );
          return;
        }

        setIsProcessing(true);
        setSectionsGenerated(false);

        try {
          const generated = await generateSections();
          if (
            !generated ||
            currentStepRef.current !== 2 ||
            sectionGenerationRunRef.current !== runId
          )
            return;
          setSectionsGenerated(true);
          addBotMessage(
            "Your homepage structure is ready. Drag to reorder sections or tell me what to add, remove, or change.",
          );
        } catch (error) {
          if (
            currentStepRef.current !== 2 ||
            sectionGenerationRunRef.current !== runId
          )
            return;
          console.error("Error generating sections:", error);
          addBotMessage(
            "Sorry, I encountered an error while generating your website structure. Please try again.",
          );
          setSectionsGenerated(true); // Show chat even on error so user can see message
        } finally {
          if (
            currentStepRef.current === 2 &&
            sectionGenerationRunRef.current === runId
          ) {
            setIsProcessing(false);
          }
        }
      } else if (currentStep === 3) {
        setChatMessages([]);
        addBotMessage(
          isThemeConfirmed
            ? "Your selected visual style and color theme are saved. You can make any final changes before continuing."
            : isStyleConfirmed
              ? "Your visual style is saved. What colors or mood do you prefer? Tell me and I’ll create a matching palette, or choose a preset and edit it."
              : "Choose a visual style for your website. If you have color preferences, tell me your colors or mood and I’ll create a palette; you can also start with a preset.",
        );
      }
    };

    handleStepTransition();
  }, [currentStep, structureStage, status]);

  const askQuestion = (questionIndex: number) => {
    // No longer used for step 0 (form-based now), kept for compatibility
    if (currentStep !== 1) return;
    if (questionIndex >= step1Questions.length || hasAskedQuestion.current)
      return;

    hasAskedQuestion.current = true;
    const question = step1Questions[questionIndex];

    simulateTyping(() => {
      if (currentStep === 1) {
        addBotMessage(question.question);
      }
      hasAskedQuestion.current = false;
    });
  };

  const askStyleQuestion = () => {
    simulateTyping(() => {
      addBotMessage(
        "Now let's choose the visual style for your website. Which design style appeals to you most?",
      );
    });
  };

  const handleInputSubmit = async (
    e: React.FormEvent | React.KeyboardEvent,
  ) => {
    e.preventDefault();
    const normalizedInput = currentInput.trim();
    const maximumLength =
      currentStep === 1 ? 2000 : currentStep === 2 ? 1000 : 500;
    if (!normalizedInput || isProcessing) return;
    if (normalizedInput.length > maximumLength) {
      addBotMessage(
        `Please keep this response under ${maximumLength} characters.`,
      );
      return;
    }

    setIsProcessing(true);

    const tempCurrentInput = normalizedInput;
    setCurrentInput("");

    addUserMessage(tempCurrentInput);

    if (currentStep === 1) {
      // Step 1: user answered the business description question
      setSiteProfile((prev: SiteProfile) => ({
        ...prev,
        businessDescription: tempCurrentInput,
      }));

      addBotMessage(
        "Thanks, I’ve saved that description. Review it above or click Next when you’re ready.",
      );
      setIsProcessing(false);
    } else if (currentStep === 2 && structureStage === "pages") {
      try {
        const runId = ++sectionGenerationRunRef.current;
        const updated = await updatePlannedPages(tempCurrentInput);
        if (
          !updated ||
          currentStepRef.current !== 2 ||
          sectionGenerationRunRef.current !== runId
        )
          return;
        addBotMessage(
          "I updated the page plan. You can remove pages from the list or tell me what else to change.",
        );
      } catch (error) {
        if (currentStepRef.current !== 2) return;
        addBotMessage(
          error instanceof Error
            ? `${error.message} Try again or describe a different page change.`
            : "I couldn't update the page plan. Please try again.",
        );
      } finally {
        if (currentStepRef.current === 2) setIsProcessing(false);
      }
    } else if (currentStep === 2) {
      setSectionsGenerated(false);
      setIsProcessing(true);
      try {
        const runId = ++sectionGenerationRunRef.current;
        const generated = await generateSections(tempCurrentInput);
        if (
          !generated ||
          currentStepRef.current !== 2 ||
          sectionGenerationRunRef.current !== runId
        )
          return;
        setSectionsGenerated(true);
        addBotMessage(
          "I updated the homepage sections. Drag to reorder them or tell me what else to change.",
        );
      } catch (error) {
        if (currentStepRef.current !== 2) return;
        setSectionsGenerated(true);
        addBotMessage(
          error instanceof Error
            ? `${error.message} Enter “Try again” to retry, or describe the change you want.`
            : "I couldn't update the homepage sections. Enter “Try again” to retry.",
        );
      } finally {
        if (currentStepRef.current === 2) setIsProcessing(false);
      }
    } else if (currentStep === 3) {
      // Require a fresh confirmation before allowing the user to finish with
      // a palette that is currently being changed.
      setIsThemeConfirmed(false);
      try {
        const response = await apiFetch("/api/generate/theme", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": crypto.randomUUID(),
          },
          body: JSON.stringify({
            projectId: sessionStorage.getItem("projectId"),
            industry: siteProfile.industry,
            styleType: getSiteStyleGuidance(selectedStyle),
            userRequest: tempCurrentInput,
            currentTheme: activeTheme,
          }),
        });
        const data = await response.json();
        if (!response.ok || !data.theme)
          throw new Error(data.error || "Could not update palette");
        const nextTheme = { ...data.theme, isCustom: true };
        setActiveTheme(nextTheme);
        setSelectedTheme(nextTheme.id);
        setCustomThemes((previous: any[]) => [
          ...previous.filter((theme) => theme.id !== nextTheme.id),
          nextTheme,
        ]);
        setIsThemeConfirmed(false);
        addBotMessage(
          "I updated the palette. Review the new colors and confirm them when they feel right.",
        );
      } catch (error) {
        console.error("Error updating theme:", error);
        addBotMessage(
          error instanceof Error && error.message.includes("AI credits")
            ? `${error.message} Open Settings → Billing & usage to upgrade or add credits.`
            : "I couldn't update the palette. You can try another request or edit the colors directly.",
        );
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleStyleSelect = (style: SiteStyleProps) => {
    if (isProcessing) return;
    setSelectedStyle(style.id);
  };

  const confirmStyleSelection = () => {
    if (!selectedStyle) return;

    setIsProcessing(true);
    setIsStyleConfirmed(true);

    const selectedStyleName =
      siteStyles.find((s) => s.id === selectedStyle)?.name || "";
    addUserMessage(selectedStyleName);

    setTimeout(() => {
      simulateTyping(() => {
        addBotMessage(
          "Your visual style and palette are ready. You can request color changes below or continue when everything looks right.",
        );
        setIsProcessing(false);
      });
    }, 500);
  };

  const handleThemeSelect = (theme: any) => {
    if (isProcessing) return;
    setSelectedTheme(theme.id);
    setActiveTheme(theme);

    // Store the full theme object (including fonts) temporarily
    // This will be persisted to localStorage when confirmed
    if (typeof window !== "undefined") {
      sessionStorage.setItem("pendingTheme", JSON.stringify(theme));
    }
  };

  const confirmThemeSelect = () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setIsThemeConfirmed(true);

    // Get the full theme object (with fonts) from sessionStorage
    let selectedThemeData: any = null;
    if (typeof window !== "undefined") {
      const pendingTheme = sessionStorage.getItem("pendingTheme");
      if (pendingTheme) {
        try {
          selectedThemeData = JSON.parse(pendingTheme);
        } catch (e) {
          console.error("Failed to parse pending theme:", e);
        }
      }

      // Fallback to finding from themes array (including custom themes) if not in sessionStorage
      if (!selectedThemeData) {
        // Check custom themes first, then default themes
        const allThemes = [...(customThemes || []), ...themes];
        selectedThemeData =
          activeTheme || allThemes.find((t) => t.id === selectedTheme);
      }
    }

    // Store the complete theme (with fonts) in localStorage for next page
    // This ensures the next page can access the theme with fonts
    if (selectedThemeData && typeof window !== "undefined") {
      localStorage.setItem(
        "selectedThemeConfig",
        JSON.stringify(selectedThemeData),
      );
      // Also store in sessionStorage as "selectedTheme"
      sessionStorage.setItem(
        "selectedTheme",
        JSON.stringify(selectedThemeData),
      );
      // Clean up sessionStorage
      sessionStorage.removeItem("pendingTheme");
    }

    setChatMessages([]);

    setTimeout(() => {
      simulateTyping(() => {
        addBotMessage(
          isStyleConfirmed
            ? "Your updated palette is confirmed. Your visual style is still selected, and you can continue when you’re ready."
            : "Your palette is ready. Now choose a visual style that fits it best.",
        );
        setIsProcessing(false);
      });
    }, 500);
  };

  return {
    chatContainerRef,
    fileInputRef,
    askQuestion,
    askStyleQuestion,
    handleInputSubmit,
    handleStyleSelect,
    confirmStyleSelection,
    handleThemeSelect,
    confirmThemeSelect,
  };
};
