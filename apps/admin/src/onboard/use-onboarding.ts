import { useRouter } from "@/src/lib/navigation";
import { useCallback, useEffect, useRef } from "react";
import { supabase, useSession } from "@/src/lib/auth";
import { apiFetch } from "@/src/lib/api";
import { SiteSection, Question } from "./types";
import { isValidSiteChrome, isValidSiteNavigation } from "@velozy/site-chrome";
import themes from "@/src/onboard/constants/themes";
import { getSiteStyleGuidance } from "@/src/onboard/constants/site-style";
import {
  ONBOARDING_DRAFT_STORAGE_KEY,
  useOnboardingStore,
} from "./onboarding-store";
import { queryClient } from "@/src/lib/query-client";
import { adminQueryKeys } from "@/src/lib/query";
import { useProjectStore } from "@/src/lib/project-store";
import {
  ONBOARDING_AUTH_PENDING_KEY,
  ONBOARDING_PROJECT_CREATION_KEY,
  PENDING_LOGO_STORAGE_KEY,
} from "./storage-keys";

type PendingLogo = {
  dataUrl: string;
  name: string;
  type: string;
};

function dataUrlToFile({ dataUrl, name, type }: PendingLogo): File {
  const [header, data] = dataUrl.split(",");
  const mimeType = type || header.match(/data:(.*?);/)?.[1] || "image/png";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++)
    bytes[index] = binary.charCodeAt(index);
  return new File([bytes], name || "logo", { type: mimeType });
}

function validateGeneratedSections(value: unknown): SiteSection[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 12) {
    throw new Error(
      "The generated homepage structure was empty or too large. Please retry.",
    );
  }
  const ids = new Set<string>();
  const sections = value.map((section: any) => {
    if (
      !section ||
      typeof section !== "object" ||
      typeof section.id !== "string" ||
      !section.id.trim() ||
      section.id.length > 255 ||
      typeof section.name !== "string" ||
      !section.name.trim() ||
      section.name.length > 255 ||
      typeof section.description !== "string" ||
      !section.description.trim() ||
      section.description.length > 2000
    ) {
      throw new Error(
        "The generated homepage structure was invalid. Please retry.",
      );
    }
    const id = section.id.trim();
    if (ids.has(id)) {
      throw new Error(
        "The generated homepage structure contained duplicate sections. Please retry.",
      );
    }
    ids.add(id);
    if (section.kind === "dynamic") {
      if (
        !section.dynamic ||
        !["products", "productCategories", "blogs", "custom"].includes(
          section.dynamic.source,
        ) ||
        !["grid", "list", "carousel"].includes(section.dynamic.layout)
      ) {
        throw new Error(
          "The generated homepage included an unsupported content section. Please retry.",
        );
      }
      if (
        section.dynamic.source === "custom" &&
        (!section.dynamic.collection ||
          !Array.isArray(section.dynamic.collection.fields) ||
          !section.dynamic.collection.fields.length)
      ) {
        throw new Error(
          "The generated collection schema was incomplete. Please retry.",
        );
      }
    }
    return { ...section, id } as SiteSection;
  });
  return sections;
}

function validateGeneratedPages(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    value.length > 11 ||
    value.some((page) => typeof page !== "string")
  ) {
    throw new Error("The page plan was invalid. Please retry your request.");
  }

  const seen = new Set<string>();
  return value.flatMap((rawPage) => {
    const page = rawPage.trim().replace(/\s+/g, " ");
    if (!page || page.length > 80) {
      throw new Error(
        "The page plan included an invalid page name. Please retry.",
      );
    }
    const key = page.toLowerCase();
    if (key === "home" || seen.has(key)) return [];
    seen.add(key);
    return [page];
  });
}

export const useOnboarding = (onAuthenticationRequired: () => void) => {
  const router = useRouter();
  const { status } = useSession();
  const onboarding = useOnboardingStore();
  const {
    currentStep,
    setCurrentStep,
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
    siteSections,
    setSiteSections,
    siteChrome,
    setSiteChrome,
    siteNavigation,
    setSiteNavigation,
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
    dragActive,
    setDragActive,
    logoFile,
    setLogoFile,
    logoPreview,
    setLogoPreview,
    logoChoice,
    setLogoChoice,
    isCreatingProject,
    setIsCreatingProject,
    isChatOpen,
    setIsChatOpen,
    unreadCount,
    setUnreadCount,
    isPremiumModalOpen,
    setIsPremiumModalOpen,
    isAuthModalOpen,
    setIsAuthModalOpen,
    sectionsGenerated,
    setSectionsGenerated,
    structureStage,
    setStructureStage,
    generatedSectionsKey,
    setGeneratedSectionsKey,
  } = onboarding;
  const sectionsAbortControllerRef = useRef<AbortController | null>(null);
  const pagesAbortControllerRef = useRef<AbortController | null>(null);
  const createdProjectRef = useRef<any | null>(null);
  const uploadedLogoUrlRef = useRef<string | null>(null);
  const completionInProgressRef = useRef(false);
  const projectCreationKeyRef = useRef<string | null>(null);

  // Refs to track initialization
  const hasInitialized = useRef(false);
  const hasAskedQuestion = useRef(false);

  const hasOnboardingData = !!(
    siteProfile.name ||
    siteProfile.industry ||
    siteProfile.businessDescription ||
    siteProfile.logo ||
    siteSections.length ||
    logoPreview
  );

  // Step 0: form is filled, show chatbox for business description
  const isValidProfileText = (value: string) => {
    const normalized = value.trim();
    return (
      normalized.length >= 2 &&
      normalized.length <= 120 &&
      /[\p{L}\p{N}]/u.test(normalized) &&
      !/^(.)\1+$/u.test(normalized)
    );
  };

  const isStep0FormComplete =
    isValidProfileText(siteProfile.name) &&
    isValidProfileText(siteProfile.industry) &&
    !!siteProfile.archetype &&
    (siteProfile.archetype === "store"
      ? !!siteProfile.storeType
      : !!siteProfile.subType);

  // Step 1: track if sections have been generated (chatbox hidden until done)
  const getSectionsGenerationKey = useCallback(
    () =>
      JSON.stringify({
        name: siteProfile.name,
        industry: siteProfile.industry,
        archetype: siteProfile.archetype,
        storeType: siteProfile.storeType,
        subType: siteProfile.subType,
        modules: siteProfile.modules,
        capabilities: siteProfile.capabilities,
        businessDescription: siteProfile.businessDescription,
      }),
    [siteProfile],
  );

  const canReuseGeneratedSections =
    siteSections.length > 0 &&
    generatedSectionsKey === getSectionsGenerationKey();

  // Keep step1Questions for type compatibility but it's no longer used for chat-based form
  const step1Questions: Question[] = [];

  const canProceedFromStep0 = isStep0FormComplete;
  const canProceedFromStep1 = true; // User can just click next
  const canProceedFromStep2 =
    structureStage === "pages"
      ? !isProcessing
      : siteSections.length > 0 && !isProcessing;
  const canProceedFromStep3 = isStyleConfirmed && isThemeConfirmed;

  const cancelSectionGeneration = useCallback(() => {
    sectionsAbortControllerRef.current?.abort();
    sectionsAbortControllerRef.current = null;
    pagesAbortControllerRef.current?.abort();
    pagesAbortControllerRef.current = null;
  }, []);

  useEffect(() => cancelSectionGeneration, [cancelSectionGeneration]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PENDING_LOGO_STORAGE_KEY);
      if (!raw) return;
      const logo = JSON.parse(raw) as PendingLogo;
      if (!logo.dataUrl) return;
      setLogoPreview(logo.dataUrl);
      setSiteProfile((profile) => ({ ...profile, logo: logo.dataUrl }));
    } catch (error) {
      console.error("Could not restore the selected logo:", error);
    }
  }, [setLogoPreview, setSiteProfile]);

  // nextStep can be called with allowAuto parameter
  // allowAuto: true = automatic progression
  // allowAuto: false/undefined = user-initiated click (allowed from any step)
  const nextStep = (allowAuto: boolean = false) => {
    if (currentStep < 3) {
      if (currentStep === 1 && status !== "authenticated") {
        if (status === "loading") return;
        localStorage.setItem(ONBOARDING_AUTH_PENDING_KEY, "1");
        onAuthenticationRequired();
        return;
      }
      // Prevent automatic progression from step 2 to step 3 (sections to design)
      if (currentStep === 2 && allowAuto) {
        return;
      }

      if (currentStep === 2) cancelSectionGeneration();
      if (currentStep === 1) setStructureStage("pages");

      setCurrentStep((prev) => prev + 1);
      setCurrentQuestion(0);
      setIsProcessing(false);
      hasInitialized.current = false;
      hasAskedQuestion.current = false;
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      cancelSectionGeneration();
      setCurrentStep((prev) => prev - 1);
      setChatMessages([]);
      setCurrentQuestion(0);
      setIsProcessing(false);
      hasInitialized.current = false;
      hasAskedQuestion.current = false;
    }
  };

  const resetForStep = () => {
    hasInitialized.current = false;
    hasAskedQuestion.current = false;
  };

  const generateSections = async (userInput?: string) => {
    cancelSectionGeneration();
    const controller = new AbortController();
    sectionsAbortControllerRef.current = controller;

    try {
      const project = await createProject();
      if (!project)
        throw new Error(
          "Sign in and create a project before generating its homepage.",
        );
      const billingResponse = await apiFetch(
        `/api/admin/billing?projectId=${encodeURIComponent(project.id)}`,
      );
      const billing = await billingResponse.json().catch(() => ({}));
      if (!billingResponse.ok) {
        throw new Error(billing.error || "Could not check the project plan.");
      }
      if (!billing.subscription) {
        const planResponse = await apiFetch("/api/admin/billing/free", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: project.id }),
        });
        if (!planResponse.ok) {
          const error = await planResponse.json().catch(() => ({}));
          throw new Error(
            error.error ||
              "Could not prepare the project for homepage generation.",
          );
        }
      }
      let prompt =
        `website name is ${siteProfile.name}, industry of website is ${siteProfile.industry}, site archetype is ${siteProfile.archetype}` +
        (siteProfile.modules.length > 0
          ? `, enabled dynamic modules: ${siteProfile.modules.join(", ")}`
          : ", enabled dynamic modules: none") +
        (siteProfile.storeType
          ? `, store model: ${siteProfile.storeType}`
          : "") +
        (siteProfile.subType ? `, site focus: ${siteProfile.subType}` : "") +
        (siteProfile.plannedPages.length
          ? `, planned pages to create after the homepage: ${siteProfile.plannedPages.join(", ")}. Generate only the homepage structure for this onboarding preview.`
          : "") +
        (siteProfile.businessDescription
          ? `, about the business: ${siteProfile.businessDescription}`
          : "") +
        (userInput ? `, user input: ${userInput}` : "");

      // Add siteSections to the prompt only if it's a non-empty array
      if (Array.isArray(siteSections) && siteSections.length > 0) {
        prompt += `, site sections: ${JSON.stringify(siteSections)}`;
      }

      const sectionsStructureResponse = await apiFetch(
        "/api/generate/sections-structure",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": crypto.randomUUID(),
          },
          body: JSON.stringify({ prompt, projectId: project.id }),
          signal: controller.signal,
        },
      );

      if (!sectionsStructureResponse.ok) {
        const error = await sectionsStructureResponse.json().catch(() => ({}));
        if (
          sectionsStructureResponse.status === 402 &&
          error.code === "insufficient_ai_credits"
        ) {
          const { data } = await supabase.auth.getUser();
          if (data.user)
            useProjectStore.getState().selectProject(data.user.id, project.id);
          await queryClient.invalidateQueries({
            queryKey: adminQueryKeys.projects,
          });
          router.push("/settings/plan-usage");
          return false;
        }
        throw new Error(error.error || "Failed to analyze components");
      }

      const analysisData = await sectionsStructureResponse.json();
      if (controller.signal.aborted) return false;
      const sectionsToGenerate = validateGeneratedSections(
        analysisData.sections,
      );
      if (!isValidSiteChrome(analysisData.siteChrome) ||
        !isValidSiteNavigation(analysisData.navigation)) {
        throw new Error("The generated navbar or footer design was invalid. Please retry.");
      }
      setSiteSections(sectionsToGenerate);
      setSiteChrome(analysisData.siteChrome);
      setSiteNavigation(analysisData.navigation);
      setGeneratedSectionsKey(getSectionsGenerationKey());
      setSectionsGenerated(true);
      return true;
    } catch (error) {
      if (controller.signal.aborted) return false;
      console.error("Error generating sections:", error);
      throw error;
    } finally {
      if (sectionsAbortControllerRef.current === controller) {
        sectionsAbortControllerRef.current = null;
      }
    }
  };

  const updatePlannedPages = async (userRequest: string) => {
    pagesAbortControllerRef.current?.abort();
    const controller = new AbortController();
    pagesAbortControllerRef.current = controller;
    try {
      const response = await apiFetch("/api/generate/pages-structure", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          projectId:
            createdProjectRef.current?.id ??
            sessionStorage.getItem("projectId"),
          request: userRequest,
          pages: siteProfile.plannedPages,
          profile: {
            name: siteProfile.name,
            industry: siteProfile.industry,
            archetype: siteProfile.archetype,
            storeType: siteProfile.storeType,
            subType: siteProfile.subType,
            businessDescription: siteProfile.businessDescription,
          },
        }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) {
        const message =
          data.code === "plan_limit_reached" ||
          data.code === "subscription_required"
            ? `${data.error || "An active paid plan is required for additional pages."} Open Settings → Billing & usage to choose a plan.`
            : data.error || "Could not update the page plan.";
        throw new Error(message);
      }
      if (controller.signal.aborted) return false;
      const pages = validateGeneratedPages(data.pages);
      setSiteProfile((current) => ({ ...current, plannedPages: pages }));
      return true;
    } catch (error) {
      if (controller.signal.aborted) return false;
      console.error("Error updating planned pages:", error);
      throw error;
    } finally {
      if (pagesAbortControllerRef.current === controller) {
        pagesAbortControllerRef.current = null;
      }
    }
  };

  const createProject = async (persistSiteChrome = false): Promise<any | null> => {
    if (!siteSections) return null;

    setIsCreatingProject(true);
    try {
      if (!projectCreationKeyRef.current) {
        try {
          projectCreationKeyRef.current = sessionStorage.getItem(
            ONBOARDING_PROJECT_CREATION_KEY,
          );
        } catch {
          // The in-memory key still prevents duplicate submissions in this tab.
        }
        projectCreationKeyRef.current ||= crypto.randomUUID();
        try {
          sessionStorage.setItem(
            ONBOARDING_PROJECT_CREATION_KEY,
            projectCreationKeyRef.current,
          );
        } catch {
          // Continue with the in-memory key when browser storage is unavailable.
        }
      }
      let pendingLogo: PendingLogo | null = null;
      if (typeof window !== "undefined") {
        try {
          const storedLogo = localStorage.getItem(PENDING_LOGO_STORAGE_KEY);
          pendingLogo = storedLogo ? JSON.parse(storedLogo) : null;
        } catch {
          pendingLogo = null;
        }
      }
      const uploadFile =
        logoFile || (pendingLogo ? dataUrlToFile(pendingLogo) : null);
      const previousDesignPreference =
        (createdProjectRef.current?.designPreference as Record<string, unknown> | undefined) || {};
      const projectData = {
        name: siteProfile.name,
        industry: siteProfile.industry,
        // Uploaded logos are moved into the media library immediately after
        // the project is created, instead of persisting a base64 preview.
        logo: uploadFile ? "" : siteProfile.logo,
        siteArchetype: siteProfile.archetype,
        storeType: siteProfile.storeType || null,
        capabilities: siteProfile.capabilities,
        creationKey: projectCreationKeyRef.current,
        designPreference: {
          ...previousDesignPreference,
          style: selectedStyle,
          sections: siteSections,
          businessDescription: siteProfile.businessDescription,
          theme:
            activeTheme ||
            [...themes, ...customThemes].find((t) => t.id === selectedTheme),
          siteConfig: {
            archetype: siteProfile.archetype,
            storeType: siteProfile.storeType,
            subType: siteProfile.subType,
            modules: siteProfile.modules,
            capabilities: siteProfile.capabilities,
            plannedPages: siteProfile.plannedPages,
          },
        },
      };

      const existingProject = Boolean(createdProjectRef.current);
      if (!createdProjectRef.current) {
        const response = await apiFetch("/api/admin/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(projectData),
        });
        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 401) {
            router.push("/signin");
            return null;
          }
          throw new Error(errorData.error || "Failed to create project");
        }
        const { project } = await response.json();
        createdProjectRef.current = project;
      }

      const project = createdProjectRef.current;
      sessionStorage.setItem("projectId", project.id);

      if (existingProject) {
        const { creationKey: _creationKey, ...updateData } = projectData;
        const updateResponse = await apiFetch("/api/admin/projects", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: project.id, ...updateData }),
        });
        if (!updateResponse.ok)
          throw new Error(
            "Could not save the latest homepage design to the project.",
          );
      }

      const designSystemResponse = await apiFetch("/api/generate/design-system", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ projectId: project.id }),
      });
      const designSystemData = await designSystemResponse.json();
      if (!designSystemResponse.ok)
        throw new Error(designSystemData.error || "Could not save the confirmed theme design system.");
      sessionStorage.setItem("designSystem", designSystemData.designSystem || "");

      if (persistSiteChrome && siteChrome) {
        const chromeResponse = await apiFetch("/api/admin/projects/site-chrome", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: project.id, siteChrome }),
        });
        if (!chromeResponse.ok) throw new Error("Could not save the shared navbar and footer design.");
      }
      if (persistSiteChrome && siteNavigation) {
        const navigationResponse = await apiFetch(
          `/api/admin/navigation?projectId=${encodeURIComponent(project.id)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ navigation: siteNavigation, initialize: true }),
          },
        );
        if (!navigationResponse.ok) throw new Error("Could not save the generated navigation menus.");
      }

      if (uploadFile && !project.logo) {
        if (!uploadedLogoUrlRef.current) {
          const mediaBody = new FormData();
          mediaBody.append("projectId", project.id);
          mediaBody.append("file", uploadFile);
          const mediaResponse = await apiFetch("/api/admin/media", {
            method: "POST",
            body: mediaBody,
          });
          const mediaData = await mediaResponse.json();
          if (!mediaResponse.ok) {
            throw new Error(mediaData.error || "Failed to save logo");
          }
          uploadedLogoUrlRef.current = mediaData.media.url;
        }

        const logoResponse = await apiFetch("/api/admin/projects", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: project.id,
            name: project.name,
            industry: project.industry,
            logo: uploadedLogoUrlRef.current,
            designPreference: project.designPreference,
          }),
        });
        if (!logoResponse.ok)
          throw new Error("Failed to attach logo to project");
        project.logo = uploadedLogoUrlRef.current;
        localStorage.removeItem(PENDING_LOGO_STORAGE_KEY);
      }
      return project;
    } catch (error) {
      console.error("Error creating project:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
      return null;
    } finally {
      setIsCreatingProject(false);
    }
  };

  const generatePrompt = async () => {
    if (!siteSections || completionInProgressRef.current) return;
    completionInProgressRef.current = true;

    try {
      // Create project first
      const project = await createProject(true);

      if (!project) {
        return; // Project creation failed, error already handled
      }
      setIsCreatingProject(true);

      // A retry can resume after the project was already created.
      const pagesResponse = await apiFetch(
        `/api/admin/pages?projectId=${project.id}`,
      );
      if (!pagesResponse.ok) throw new Error("Could not load project pages.");
      const { pages } = await pagesResponse.json();
      let homePage = pages.find(
        (page: { slug: string; id: string }) => page.slug === "home",
      );
      if (!homePage) {
        const pageResponse = await apiFetch("/api/admin/pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: project.id,
            slug: "home",
            title: "Home",
          }),
        });
        if (!pageResponse.ok)
          throw new Error("Could not create the home page.");
        homePage = (await pageResponse.json()).page;
      }
      if (!homePage?.id) throw new Error("Home page could not be opened.");
      const designSystem = sessionStorage.getItem("designSystem") || "";
      const prompt = `My business name is ${siteProfile.name}, industry is ${siteProfile.industry}, and site archetype is ${siteProfile.archetype}. ${siteProfile.businessDescription ? `About the business: ${siteProfile.businessDescription}.` : ""} Enabled modules: ${siteProfile.modules.join(", ") || "none"}. ${siteProfile.storeType ? `Store model: ${siteProfile.storeType}.` : ""} ${siteProfile.subType ? `Site focus: ${siteProfile.subType}.` : ""} Planned pages after the homepage: ${siteProfile.plannedPages.join(", ") || "not provided"}. Generate and preview the homepage only. ${getSiteStyleGuidance(selectedStyle)}\n\nConfirmed design system:\n${designSystem}`;
      sessionStorage.removeItem("pageData");
      sessionStorage.setItem("generationPrompt", prompt);
      sessionStorage.setItem("siteSections", JSON.stringify(siteSections));
      sessionStorage.setItem(
        "selectedTheme",
        JSON.stringify(
          activeTheme ||
            [...themes, ...customThemes].find(
              (theme) => theme.id === selectedTheme,
            ),
        ),
      );
      sessionStorage.removeItem(ONBOARDING_PROJECT_CREATION_KEY);
      sessionStorage.setItem("pageId", homePage.id);
      const { data } = await supabase.auth.getUser();
      if (data.user)
        useProjectStore.getState().selectProject(data.user.id, project.id);
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.projects,
      });
      window.addEventListener(
        "pagehide",
        () => localStorage.removeItem(ONBOARDING_DRAFT_STORAGE_KEY),
        { once: true },
      );
      window.location.assign(
        `/page-builder?id=${encodeURIComponent(homePage.id)}&generating=true`,
      );
    } catch (error) {
      setIsCreatingProject(false);
      console.error("Error generating prompt:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      completionInProgressRef.current = false;
    }
  };

  return {
    // State
    currentStep,
    setCurrentStep,
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
    siteSections,
    setSiteSections,
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
    dragActive,
    setDragActive,
    logoFile,
    setLogoFile,
    logoPreview,
    setLogoPreview,
    logoChoice,
    setLogoChoice,
    isCreatingProject,
    isChatOpen,
    setIsChatOpen,
    unreadCount,
    setUnreadCount,
    isPremiumModalOpen,
    setIsPremiumModalOpen,
    isAuthModalOpen,
    setIsAuthModalOpen,
    hasOnboardingData,

    // Step 0 form state
    isStep0FormComplete,
    sectionsGenerated,
    setSectionsGenerated,
    structureStage,
    setStructureStage,
    canReuseGeneratedSections,
    setGeneratedSectionsKey,
    getSectionsGenerationKey,

    // Refs
    hasInitialized,
    hasAskedQuestion,

    // Constants
    step1Questions,

    // Computed
    canProceedFromStep0,
    canProceedFromStep1,
    canProceedFromStep2,
    canProceedFromStep3,

    // Methods
    nextStep,
    prevStep,
    resetForStep,
    cancelSectionGeneration,

    //ai generation
    generateSections,
    updatePlannedPages,
    generatePrompt,
    createProject,
  };
};
