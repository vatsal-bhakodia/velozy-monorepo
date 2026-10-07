import { useEffect, useRef } from "react";
import { ChatMessage, SiteProfile } from "./types";
import { siteStyles, SiteStyleProps } from "@/src/onboard/constants/site-style";
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
    nextStep,
    generateSections,
    cancelSectionGeneration,
    sectionsGenerated,
    setSectionsGenerated,
    canReuseGeneratedSections,
  } = onboardingState;

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoProgressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const currentStepRef = useRef(currentStep);
  const sectionGenerationRunRef = useRef(0);

  useEffect(() => {
    currentStepRef.current = currentStep;
    if (currentStep !== 2) {
      sectionGenerationRunRef.current += 1;
      cancelSectionGeneration();
    }
    if (currentStep !== 0 && autoProgressTimeoutRef.current) {
      clearTimeout(autoProgressTimeoutRef.current);
      autoProgressTimeoutRef.current = null;
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
          "Great! Now tell us about your business — what makes it unique? This helps us create a better website structure for you. You can also skip this step.",
        );
      });
    }
    if (currentStep !== 1) {
      step1ChatActivePrev.current = false;
    }
  }, [currentStep]);

  // Reset initialization when step changes
  useEffect(() => {
    hasInitialized.current = false;
    hasAskedQuestion.current = false;
  }, [currentStep]);

  // Handle step transitions
  useEffect(() => {
    const handleStepTransition = async () => {
      if (currentStep === 2) {
        if (status !== "authenticated") return;
        const runId = ++sectionGenerationRunRef.current;
        setChatMessages([]);

        if (canReuseGeneratedSections) {
          setSectionsGenerated(true);
          setIsProcessing(false);
          addBotMessage(
            "Your website structure is ready. You can drag sections to reorder them, or let me know if you'd like to add or change any sections.",
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
            "Great! I've created a basic structure for your website. You can drag sections to reorder them, or let me know if you'd like to add or change any sections. Click 'Next' when you're ready to proceed.",
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
        setSelectedStyle(siteStyles[0].id);
        setSelectedTheme(themes[0].id);
        setIsStyleConfirmed(false);
        setIsThemeConfirmed(false);
        addBotMessage(
          "Let's start with a color palette. You can edit each color directly or tell me how you want it to feel.",
        );
      }
    };

    handleStepTransition();
  }, [currentStep, status]);

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
    if (!currentInput.trim() || isProcessing) return;

    setIsProcessing(true);

    const tempCurrentInput = currentInput;
    setCurrentInput("");

    addUserMessage(tempCurrentInput);

    if (currentStep === 1) {
      // Step 1: user answered the business description question
      setSiteProfile((prev: SiteProfile) => ({
        ...prev,
        businessDescription: tempCurrentInput,
      }));

      setTimeout(() => {
        simulateTyping(() => {
          addBotMessage(
            "Thanks for sharing! This will help us create a great website structure. Moving to the next step...",
          );
          setIsProcessing(false);

          autoProgressTimeoutRef.current = setTimeout(() => {
            if (currentStepRef.current === 1) {
              nextStep(true);
            }
          }, 2000);
        });
      }, 500);
    } else if (currentStep === 2) {
      // Step 2: user wants to modify sections
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
        setTimeout(() => {
          simulateTyping(() => {
            if (
              currentStepRef.current !== 2 ||
              sectionGenerationRunRef.current !== runId
            )
              return;
            addBotMessage(
              "I've updated the structure for your website. You can drag sections to reorder them, or let me know if you'd like to make more changes. Click 'Next' when you're ready to proceed.",
            );
            setIsProcessing(false);
          });
        }, 500);
      } catch (error) {
        if (currentStepRef.current !== 2) return;
        setSectionsGenerated(true);
        setIsProcessing(false);
        addBotMessage("Sorry, I encountered an error. Please try again.");
      }
    } else if (currentStep === 3 && !isThemeConfirmed) {
      try {
        const response = await apiFetch("/api/generate/theme", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            industry: siteProfile.industry,
            styleType: selectedStyle || "logo-palette",
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
        addBotMessage(
          "I updated the palette. You can keep refining it or confirm it when it feels right.",
        );
      } catch (error) {
        console.error("Error updating theme:", error);
        addBotMessage(
          "I couldn't update the palette. You can try another request or edit the colors directly.",
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
          "Excellent choice! Now let's select a color theme that matches your style.",
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

    const selectedThemeName =
      selectedThemeData?.name ||
      themes.find((t) => t.id === selectedTheme)?.name;
    addUserMessage(selectedThemeName || "");

    setTimeout(() => {
      simulateTyping(() => {
        addBotMessage(
          "Your palette is ready. Now choose a visual style that fits it best.",
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
