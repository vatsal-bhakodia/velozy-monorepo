import { useCallback } from "react";
import { useRouter } from "next/navigation";
import React from "react";
import { Section, GenerationState } from "./types";
import themes from "@/constants/themes";
import { Theme } from "@/components/common/theme-manager/types";
import { sectionToReactElements } from "@/lib/sectionToReactElements";
import { refreshTailwind } from "@/components/builder/canvas";
import { ensureNavbarOnCanvas } from "./use-content-initialization";
import { normalizeGeneratedFormFields } from "@/lib/form-utils";

export const useContentGeneration = (
  setContentReady: (ready: boolean) => void,
  setIsLoading: (loading: boolean) => void,
  setGenerationError: (error: string | null) => void,
  setCurrentStep: (step: number) => void,
  setCurrentStepText: (text: string) => void,
  setTotalSteps: (steps: number) => void,
  setCompletedSections: (sections: string[]) => void,
  generationStateRef: React.MutableRefObject<any>,
  completedSections: string[],
  setCustomThemes: React.Dispatch<React.SetStateAction<Theme[]>>,
  setSelectedThemeId: React.Dispatch<React.SetStateAction<string>>,
  actions?: any, // Craft.js actions
  query?: any, // Craft.js query
  isGenerating?: boolean, // Flag to determine if we're in live generation mode
) => {
  const router = useRouter();

  const linkGeneratedForms = useCallback(async (section: any, projectId: string) => {
    const visit = async (node: any): Promise<void> => {
      if (node?.type === "Form" && Array.isArray(node.props?.fields) && !node.props.formId) {
        const fields = normalizeGeneratedFormFields(node.props.fields);
        const purpose = /quote|request pricing/i.test(section.name || "") ? "quote" : "general";
        const response = await fetch("/api/admin/forms/resolve", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, name: `${section.name || "Contact"} form`, purpose, fields }),
        });
        const data = await response.json();
        if (!response.ok || !data.form?.id) throw new Error(data.error || "Could not save the generated form");
        node.props.formId = data.form.id;
        node.props.formName = data.form.name;
        node.props.formPurpose = data.form.purpose || purpose;
        node.props.fields = data.form.fields.map((field: any) => ({ type: field.fieldType, name: field.key, label: field.label, required: field.required, options: field.options || [], placeholder: field.placeholder || "", colSpan: field.layout || "col-span-full" }));
      }
      if (Array.isArray(node?.props?.children)) await Promise.all(node.props.children.map(visit));
    };
    await Promise.all((section.components || []).map(visit));
    return section;
  }, []);

  // Live append for generation mode - directly adds to Craft.js canvas
  const appendSectionLive = useCallback(
    async (section: any) => {
      if (!actions || !query || !isGenerating) {
        console.warn(
          "Craft.js actions/query not available or not in generation mode",
        );
        return;
      }

      try {
        const { BuilderElements } = await import("@/components/builder/elements");
        const reactElements = sectionToReactElements(section, BuilderElements);

        for (const element of reactElements) {
          const nodeTree = query.parseReactElement(element).toNodeTree();
          actions.setCustom(nodeTree.rootNodeId, (custom: Record<string, unknown>) => {
            custom.displayName = String(section.name || "Section").slice(0, 80);
          });
          // Prevent history state from bloating and causing huge memory spikes
          actions.history.ignore().addNodeTree(nodeTree, "ROOT");
          await new Promise((resolve) => setTimeout(resolve, 5));
        }

        refreshTailwind();
        console.log(`Appended section with ${reactElements.length} components to canvas`);
      } catch (error) {
        console.error("Error appending section to canvas:", error);
        throw error;
      }
    },
    [actions, query, isGenerating],
  );

  // Update generation state helper
  const updateGenerationState = useCallback(
    (updates: Partial<GenerationState>) => {
      if (generationStateRef.current) {
        generationStateRef.current = {
          ...generationStateRef.current,
          ...updates,
        };
      }
    },
    [generationStateRef],
  );

  const generateContent = useCallback(
    async (prompt: string) => {
      setIsLoading(true);
      setGenerationError(null);

      // Initialize with analysis phase
      setCurrentStep(0);
      setCurrentStepText("Loading your selected sections...");
      setTotalSteps(0);
      setCompletedSections([]);

      try {
        // Get pre-selected sections and theme from session storage
        const siteSectionsData = sessionStorage.getItem("siteSections");
        const selectedThemeData = sessionStorage.getItem("selectedTheme");

        if (!siteSectionsData) {
          throw new Error("Missing required data from onboarding process");
        }

        const sectionsToGenerate: Section[] = JSON.parse(siteSectionsData);
        const generatedSections = sectionsToGenerate.filter(
          (section: any) => !/(?:^|[-_\s])footer(?:$|[-_\s])/i.test(`${section?.id || ""} ${section?.name || ""}`),
        );
        const theme: Theme = selectedThemeData
          ? JSON.parse(selectedThemeData)
          : themes[0];

        // Persist theme to localStorage so it survives the post-generation
        // page reload
        if (typeof window !== "undefined") {
          localStorage.setItem("selectedThemeConfig", JSON.stringify(theme));
        }

        // Update theme in state
        setCustomThemes((prev) => {
          const existingTheme = prev.find((t) => t.id === theme.id);
          if (!existingTheme) {
            return [...prev, theme];
          }
          return prev;
        });
        setSelectedThemeId(theme.id);

        const pageId = sessionStorage.getItem("pageId");
        const projectId = sessionStorage.getItem("projectId");

        if (projectId) {
          const themeResponse = await fetch("/api/admin/projects/theme", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId, theme }),
          });
          if (!themeResponse.ok) {
            throw new Error("Could not save the selected site theme");
          }
        }

        // The navbar is the first page section. Generated sections follow it.
        // Reserve a final step for durable page/theme persistence so the bar
        // reaches 100% only after the generated page is safe to reload.
        const totalSteps = generatedSections.length + 2;
        setTotalSteps(totalSteps);
        setCurrentStep(1);
        setCurrentStepText("Adding navbar...");

        ensureNavbarOnCanvas(actions, query, projectId);
        const navbarCompletedSections = ["Navbar"];
        setCompletedSections(navbarCompletedSections);

        // Initialize generation state
        generationStateRef.current = {
          userPrompt: prompt,
          currentStep: 1,
          totalSteps,
          currentStepText: "Navbar added",
          completedSections: navbarCompletedSections,
          sectionsToGenerate: generatedSections,
        };

        // Small delay to show setup completion
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Resume from sections persisted by earlier attempts. This keeps a retry
        // from duplicating work in the page data or on the live canvas.
        let sectionsAccumulator: any[] = [];
        const existingPageResponse = pageId
          ? await fetch(`/api/pages/data?pageId=${encodeURIComponent(pageId)}`)
          : null;
        if (existingPageResponse && !existingPageResponse.ok) {
          throw new Error("Could not load saved homepage sections. Please retry.");
        }
        const existingPageData = existingPageResponse
          ? await existingPageResponse.json()
          : null;
        const existingSections = Array.isArray(existingPageData?.pageData?.sections)
          ? existingPageData.pageData.sections
          : [];
        const existingFooterSections = existingSections.filter(
          (section: any) => /(?:^|[-_\s])footer(?:$|[-_\s])/i.test(`${section?.id || ""} ${section?.name || ""}`),
        );
        const existingById = new Map(
          existingSections
            .filter((section: any) => typeof section?.id === "string")
            .map((section: any) => [section.id, section]),
        );
        sectionsAccumulator = generatedSections
          .map((section: any) => existingById.get(section.id))
          .filter(Boolean);
        if (isGenerating && actions && query) {
          for (const section of sectionsAccumulator) {
            await appendSectionLive(section);
          }
        }
        const failedSections: string[] = [];

        for (let i = 0; i < generatedSections.length; i++) {
          const section = generatedSections[i];
          if (existingById.has(section.id)) continue;
          const stepNumber = i + 2;
          const isLastSection = i === generatedSections.length - 1;

          setCurrentStep(stepNumber);
          setCurrentStepText(`Creating ${section.name}...`);
          updateGenerationState({
            currentStep: stepNumber,
            currentStepText: `Creating ${section.name}...`,
          });

          try {
            const sectionResponse = await fetch("/api/generate/section", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Idempotency-Key": crypto.randomUUID(),
              },
              body: JSON.stringify({
                prompt: generationStateRef.current?.userPrompt || prompt,
                sectionId: section.id,
                sectionName: section.name,
                sectionDescription: section.description,
                themeColors: theme.colors,
                kind: section.kind || "static",
                dynamicConfig: section.dynamic,
                neighborSections: generatedSections
                  .map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
                  .filter(({ candidate }) => candidate.id !== section.id)
                  .map(({ candidate, candidateIndex }) => ({
                    name: candidate.name,
                    description: candidate.description,
                    position: candidateIndex < i ? "before" : "after",
                  }))
                  .slice(0, 12),
                projectId,
              }),
            });

            if (!sectionResponse.ok) {
              const error = await sectionResponse.json().catch(() => ({}));
              const message = error.error || `Failed to generate ${section.name}`;
              throw new Error(error.code === "insufficient_ai_credits"
                ? `${message} Open Settings → Billing & usage to upgrade or add credits.`
                : message);
            }

            let sectionWithImages = (await sectionResponse.json()).section;
            if (projectId) sectionWithImages = await linkGeneratedForms(sectionWithImages, projectId);

            // Persist each completed section so an interrupted generation can resume.
            if (pageId) {
              const savedSection = await fetch("/api/pages/data", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pageId, section: sectionWithImages }),
              });
              if (!savedSection.ok) throw new Error(`Could not save ${section.name}`);
            }

            // The section is safe to add to the live canvas only after it is
            // durable, so a retry can discover it and avoid appending it twice.
            sectionsAccumulator.push(sectionWithImages);
            if (isGenerating && actions && query) {
              await appendSectionLive(sectionWithImages);
            }

            // Update completed sections
            const newCompletedSections = [
              ...navbarCompletedSections,
              ...generatedSections.slice(0, i).map((item) => item.name),
              section.name,
            ];
            setCompletedSections(newCompletedSections);

            // Update step text to show completion
            updateGenerationState({
              completedSections: newCompletedSections,
              currentStepText: `${section.name} completed`,
            });

            // Progress delay - shorter for last section
            await new Promise((resolve) =>
              setTimeout(resolve, isLastSection ? 500 : 1000),
            );
          } catch (sectionError) {
            console.error(`Error generating ${section.name}:`, sectionError);
            failedSections.push(section.name);
            setCurrentStepText(`Could not create ${section.name}; this section can be retried.`);
          }
        }

        if (failedSections.length) {
          throw new Error(
            `Some homepage sections could not be created: ${failedSections.join(", ")}. Retry generation to continue.`,
          );
        }

        // All page sections are complete; finalize and store complete data.
        setCurrentStep(totalSteps - 1);
        setCurrentStepText("Finalizing your page...");

        if (generatedSections.length > 0 && sectionsAccumulator.length === 0) {
          throw new Error("No sections could be generated. Check the AI provider configuration and try again.");
        }

        // Create final landing page data
        const pageData = {
          sections: [...sectionsAccumulator, ...existingFooterSections],
          metadata: {
            prompt,
            sectionsGenerated: generatedSections.length,
            completedSections: sectionsAccumulator.length,
            isComplete: true,
          },
        };

        if (pageId) {
          const savedPage = await fetch("/api/pages/data", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pageId, pageData }),
          });
          if (!savedPage.ok) throw new Error("Could not save the generated page");
        }

        setCurrentStep(totalSteps);

        // Store data as draft in localStorage (page-specific key for unsaved changes)
        const currentPageId = sessionStorage.getItem("pageId");
        if (currentPageId) {
          localStorage.setItem(
            `pg_cache_${currentPageId}`,
            JSON.stringify(pageData),
          );
        }

        // Also keep sessionStorage copy for backward compat during this session
        sessionStorage.setItem("pageData", JSON.stringify(pageData));

        // Clear the data we've used
        sessionStorage.removeItem("generationPrompt");
        sessionStorage.removeItem("siteSections");
        sessionStorage.removeItem("selectedTheme");

        // Mark as ready
        setContentReady(true);

        // Final step completed
        setCurrentStepText("Generation complete!");
        setCompletedSections([
          "Navbar",
          ...generatedSections.map((s) => s.name),
          "Footer",
        ]);

        // Show completion state briefly
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Clean URL — only keep pageId
        const generatedPageId = sessionStorage.getItem("pageId");
        if (generatedPageId) {
          router.replace(`/?id=${generatedPageId}`);
        }
      } catch (error) {
        console.error("Error generating landing page:", error);
        setGenerationError(
          error instanceof Error ? error.message : "Failed to generate content",
        );
        setContentReady(true);
      } finally {
        // Delay before hiding loading to show completion
        setTimeout(() => {
          setIsLoading(false);
        }, 1000);
      }
    },
    [
      router,
      completedSections,
      appendSectionLive,
      setIsLoading,
      setContentReady,
      setGenerationError,
      setCurrentStep,
      setCurrentStepText,
      setTotalSteps,
      setCompletedSections,
      updateGenerationState,
      actions,
      query,
      isGenerating,
      setCustomThemes,
      setSelectedThemeId,
      generationStateRef,
      linkGeneratedForms,
    ],
  );

  return { generateContent, appendSectionLive };
};
