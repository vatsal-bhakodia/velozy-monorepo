import { useCallback } from "react";
import { useRouter } from "next/navigation";
import React from "react";
import { Section, GenerationState } from "./types";
import themes from "@/constants/themes";
import { Theme } from "@/components/common/theme-manager/types";
import { sectionToReactElements } from "@/lib/sectionToReactElements";
import { refreshTailwind } from "@/components/builder/canvas";
import { ensureNavbarOnCanvas } from "./use-content-initialization";
import { normalizeGeneratedFormFields } from "@/src/legacy-lib/form-utils";

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
    (section: any) => {
      if (!actions || !query || !isGenerating) {
        console.warn(
          "Craft.js actions/query not available or not in generation mode",
        );
        return;
      }

      try {
        // Import BuilderElements dynamically to access component mapping
        import("@/components/builder/elements").then(({ BuilderElements }) => {
          // Convert section components to React elements
          const reactElements = sectionToReactElements(
            section,
            BuilderElements,
          );

          // Process elements asynchronously to prevent UI freezing
          const processElements = async () => {
            for (const element of reactElements) {
              const nodeTree = query.parseReactElement(element).toNodeTree();
              // Prevent history state from bloating and causing huge memory spikes
              actions.history.ignore().addNodeTree(nodeTree, "ROOT");
              await new Promise((resolve) => setTimeout(resolve, 5));
            }

            // One refresh after the entire section is mounted
            refreshTailwind();

            console.log(
              `Appended section with ${reactElements.length} components to canvas`,
            );
          };

          processElements();
        });
      } catch (error) {
        console.error("Error appending section to canvas:", error);
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

        // The navbar is the first page section. Generated sections follow it.
        const totalSteps = sectionsToGenerate.length + 1;
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
          sectionsToGenerate,
        };

        // Small delay to show setup completion
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Generate sections one by one. The navbar occupies step 1.
        let sectionsAccumulator: any[] = [];

        for (let i = 0; i < sectionsToGenerate.length; i++) {
          const section = sectionsToGenerate[i];
          const stepNumber = i + 2;
          const isLastSection = i === sectionsToGenerate.length - 1;

          setCurrentStep(stepNumber);
          setCurrentStepText(`Creating ${section.name}...`);
          updateGenerationState({
            currentStep: stepNumber,
            currentStepText: `Creating ${section.name}...`,
          });

          try {
            const sectionResponse = await fetch("/api/generate/section", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                prompt: generationStateRef.current?.userPrompt || prompt,
                sectionId: section.id,
                sectionName: section.name,
                sectionDescription: section.description,
                themeColors: theme.colors,
                kind: section.kind || "static",
                dynamicConfig: section.dynamic,
                projectId,
              }),
            });

            if (!sectionResponse.ok) {
              throw new Error(`Failed to generate ${section.name}`);
            }

            let sectionWithImages = (await sectionResponse.json()).section;
            if (projectId) sectionWithImages = await linkGeneratedForms(sectionWithImages, projectId);

            // Add the new section to our accumulator (images already enriched server-side)
            sectionsAccumulator.push(sectionWithImages);

            // OPTIMIZED: Append only the new section to canvas (for live generation mode)
            if (isGenerating && actions && query) {
              appendSectionLive(sectionWithImages);
            }

            // Persist each completed section so an interrupted generation can resume.
            if (pageId) {
              const savedSection = await fetch("/api/pages/data", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pageId, section: sectionWithImages }),
              });
              if (!savedSection.ok) throw new Error(`Could not save ${section.name}`);
            }

            // Update completed sections
            const newCompletedSections = [
              ...navbarCompletedSections,
              ...sectionsToGenerate.slice(0, i).map((item) => item.name),
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
            // Continue with other sections rather than failing completely
            setCurrentStepText(
              `Warning: ${section.name} generation failed, continuing...`,
            );
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }

        // All page sections are complete; finalize and store complete data.
        setCurrentStep(totalSteps);
        setCurrentStepText("Finalizing your page...");

        // If the user included dynamic sections (blogs/products/categories),
        // seed some initial published sample content so the landing page preview
        // isn't empty.
        if (projectId) {
          const dynamicSources = Array.from(
            new Set(
              sectionsToGenerate
                .filter((s: any) => s?.kind === "dynamic" && s?.dynamic?.source)
                .map((s: any) => s.dynamic.source),
            ),
          );

          if (dynamicSources.length > 0) {
            try {
              await fetch("/api/admin/projects/seed-sample-content", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  projectId,
                  sources: dynamicSources,
                  prompt: generationStateRef.current?.userPrompt || prompt,
                }),
              });
            } catch (err) {
              console.warn("Failed to seed sample content:", err);
            }
          }
        }

        if (sectionsToGenerate.length > 0 && sectionsAccumulator.length === 0) {
          throw new Error("No sections could be generated. Check the AI provider configuration and try again.");
        }

        // Create final landing page data
        const pageData = {
          sections: sectionsAccumulator,
          metadata: {
            prompt,
            sectionsGenerated: sectionsToGenerate.length,
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
          ...sectionsToGenerate.map((s) => s.name),
        ]);

        // Show completion state briefly
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Clean URL — only keep pageId
        const generatedPageId = sessionStorage.getItem("pageId");
        if (generatedPageId) {
          router.replace(`/builder?id=${generatedPageId}`);
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
