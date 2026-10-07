import { useRouter } from "@/src/lib/navigation";
import { useCallback, useEffect, useRef } from "react";
import { supabase, useSession } from "@/src/lib/auth";
import { apiFetch } from "@/src/lib/api";
import { SiteSection, Question } from "./types";
import themes from "@/src/onboard/constants/themes";
import { siteStyles } from "@/src/onboard/constants/site-style";
import { useOnboardingStore } from "./onboarding-store";
import { queryClient } from "@/src/lib/query-client";
import { adminQueryKeys } from "@/src/lib/query";
import { useProjectStore } from "@/src/lib/project-store";
import {
  ONBOARDING_AUTH_PENDING_KEY,
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
    sectionsGenerated,
    setSectionsGenerated,
    generatedSectionsKey,
    setGeneratedSectionsKey,
    resetWorkflow,
  } = onboarding;
  const sectionsAbortControllerRef = useRef<AbortController | null>(null);
  const createdProjectRef = useRef<any | null>(null);
  const uploadedLogoUrlRef = useRef<string | null>(null);
  const completionInProgressRef = useRef(false);

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
      normalized.length >= 3 &&
      /[A-Za-z]/.test(normalized) &&
      !/^(.)\1+$/.test(normalized)
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
  const canProceedFromStep2 = siteSections.length > 0 && !isProcessing;
  const canProceedFromStep3 = isStyleConfirmed && isThemeConfirmed;

  const cancelSectionGeneration = useCallback(() => {
    sectionsAbortControllerRef.current?.abort();
    sectionsAbortControllerRef.current = null;
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
      setSelectedStyle(siteStyles[0].id);
      setIsStyleConfirmed(false);
      setSectionsGenerated(false);
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
      let prompt =
        `website name is ${siteProfile.name}, industry of website is ${siteProfile.industry}, site archetype is ${siteProfile.archetype}` +
        (siteProfile.modules.length > 0
          ? `, enabled dynamic modules: ${siteProfile.modules.join(", ")}`
          : ", enabled dynamic modules: none") +
        (siteProfile.storeType
          ? `, store model: ${siteProfile.storeType}`
          : "") +
        (siteProfile.subType ? `, site focus: ${siteProfile.subType}` : "") +
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
          signal: controller.signal,
        },
      );

      if (!sectionsStructureResponse.ok) {
        throw new Error("Failed to analyze components");
      }

      const analysisData = await sectionsStructureResponse.json();
      if (controller.signal.aborted) return false;
      const sectionsToGenerate: SiteSection[] = analysisData.sections || [];
      setSiteSections(sectionsToGenerate);
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

  const createProject = async (): Promise<any | null> => {
    if (!siteSections) return null;

    setIsCreatingProject(true);
    try {
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
      const projectData = {
        name: siteProfile.name,
        industry: siteProfile.industry,
        // Uploaded logos are moved into the media library immediately after
        // the project is created, instead of persisting a base64 preview.
        logo: uploadFile ? "" : siteProfile.logo,
        siteArchetype: siteProfile.archetype,
        storeType: siteProfile.storeType || null,
        capabilities: siteProfile.capabilities,
        designPreference: {
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
          },
        },
      };

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
      const project = await createProject();

      if (!project) {
        return; // Project creation failed, error already handled
      }

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
      const prompt = `My business name is ${siteProfile.name}, industry is ${siteProfile.industry}, and site archetype is ${siteProfile.archetype}. ${siteProfile.businessDescription ? `About the business: ${siteProfile.businessDescription}.` : ""} Enabled modules: ${siteProfile.modules.join(", ") || "none"}. ${siteProfile.storeType ? `Store model: ${siteProfile.storeType}.` : ""} ${siteProfile.subType ? `Site focus: ${siteProfile.subType}.` : ""} Visual style: ${selectedStyle}.`;
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
      sessionStorage.setItem("projectId", project.id);
      sessionStorage.setItem("pageId", homePage.id);
      const { data } = await supabase.auth.getUser();
      if (data.user)
        useProjectStore.getState().selectProject(data.user.id, project.id);
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.projects,
      });
      resetWorkflow();
      window.location.assign(
        `/page-builder/builder?id=${encodeURIComponent(homePage.id)}&generating=true`,
      );
    } catch (error) {
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
    hasOnboardingData,

    // Step 0 form state
    isStep0FormComplete,
    sectionsGenerated,
    setSectionsGenerated,
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
    generatePrompt,
    createProject,
  };
};
