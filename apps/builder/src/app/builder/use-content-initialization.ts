import React from "react";
import { useEffect } from "react";
import { sectionToReactElements } from "@/lib/sectionToReactElements";
import { BuilderElements } from "@/components/builder/elements";
import { Navbar } from "@/components/builder/elements/navbar";
import {
  pauseTailwindObserver,
  resumeTailwindObserver,
  primeTailwindWithClasses,
} from "@/components/builder/canvas";

/** Recursively extract all CSS class names from section JSON data */
function extractClassNames(obj: any): string[] {
  const classes = new Set<string>();
  function traverse(node: any) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(traverse);
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      if (
        (key === "className" || key === "class") &&
        typeof value === "string"
      ) {
        value.split(/\s+/).forEach((cls) => {
          if (cls) classes.add(cls);
        });
      } else if (typeof value === "object") {
        traverse(value);
      }
    }
  }
  traverse(obj);
  return Array.from(classes);
}

function extractClassNamesFromCraftState(
  craftState: Record<string, any>,
): string[] {
  const classes = new Set<string>();
  Object.values(craftState).forEach((node: any) => {
    const className = node?.props?.className || node?.props?.class;
    if (typeof className === "string") {
      className.split(/\s+/).forEach((cls: string) => {
        if (cls) classes.add(cls);
      });
    }
  });
  return Array.from(classes);
}

export const __pageDataCache = new Map<string, Promise<any>>();

export function getSharedPageData(pageId: string) {
  if (!__pageDataCache.has(pageId)) {
    __pageDataCache.set(
      pageId,
      fetch(`/api/pages/data?pageId=${pageId}`).then((res) =>
        res.ok ? res.json() : null,
      ),
    );
  }
  return __pageDataCache.get(pageId);
}

/**
 * Converts each section into a Craft node tree and mounts its root directly
 * under ROOT. A section already has its own layout root, so adding a
 * synthetic Container here would create an unwanted page-level wrapper.
 */
async function loadSectionsToCanvas(sections: any[], actions: any, query: any) {
  if (!actions || !query) {
    console.warn("Craft.js actions/query not available");
    return;
  }

  const start = performance.now();

  // ── Step 1: Convert DB sections → React elements (pure JS, no DOM) ──────────
  const allSectionElements: React.ReactElement[] = [];
  for (const section of sections) {
    const elements = sectionToReactElements(section, BuilderElements);
    allSectionElements.push(...elements);
  }

  if (allSectionElements.length === 0) return;

  // ── Step 2: Parse each section element into its own NodeTree (pure JS) ───────
  // Each parse is isolated — no DOM reads, no re-renders
  const sectionTrees: any[] = [];

  for (const el of allSectionElements) {
    // Yield back to the event loop so loading animations and setIntervals keep firing
    await new Promise((resolve) => setTimeout(resolve, 10));

    const tree = query.parseReactElement(el).toNodeTree();

    sectionTrees.push(tree);
  }

  // ── Step 3: Add each section root directly to ROOT ───────────────────────────
  // The sections already own their layout containers, so a synthetic
  // Container here would become an extra page-level node.
  for (const tree of sectionTrees) {
    actions.history.ignore().addNodeTree(tree, "ROOT");
  }
}

/** Add the site navbar once, outside the user-facing Elements palette. */
export function ensureNavbarOnCanvas(
  actions: any,
  query: any,
  projectId?: string | null,
) {
  if (!actions || !query) return false;
  const nodes = query.getNodes();
  const hasNavbar = Object.values(nodes).some(
    (node: any) => node?.data?.displayName === "Navbar",
  );
  if (hasNavbar) return false;

  const tree = query
    .parseReactElement(
      React.createElement(Navbar, { projectId: projectId || "" }),
    )
    .toNodeTree();
  actions.history.ignore().addNodeTree(tree, "ROOT");
  // The root receives new nodes at the end; the navbar is a page-level header.
  actions.history.ignore().move(tree.rootNodeId, "ROOT", 0);
  return true;
}

// ── Fetch page data from DB ───────────────────────────────────────────────────
async function fetchPageDataFromDB(
  pageId: string,
): Promise<{ sections: any[]; metadata?: any } | null> {
  try {
    const data = await getSharedPageData(pageId);
    return data?.pageData || null;
  } catch (err) {
    console.warn("Failed to fetch page data from DB:", err);
    return null;
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export const useContentInitialization = (
  isGenerating: boolean,
  generateContent: (prompt: string) => Promise<void>,
  hasInitialized: React.MutableRefObject<boolean>,
  isInitializing: React.MutableRefObject<boolean>,
  setContentReady: (ready: boolean) => void,
  setGenerationError: (error: string | null) => void,
  router: any,
  actions?: any, // Craft.js actions
  query?: any, // Craft.js query
  pageId?: string | null, // Page ID from URL
  unsavedChoice?: "pending" | "recover" | "discard" | "none",
) => {
  useEffect(() => {
    if (unsavedChoice === "pending") return;
    if (hasInitialized.current || isInitializing.current) return;
    isInitializing.current = true;

    const processContent = async () => {
      try {
        // A requested onboarding handoff takes precedence over a partially
        // saved page from an interrupted generation attempt.
        if (isGenerating) {
          const prompt = sessionStorage.getItem("generationPrompt");
          if (prompt && sessionStorage.getItem("siteSections") && sessionStorage.getItem("selectedTheme")) {
            await generateContent(prompt);
            return;
          }
        }
        let pageData: any = null;

        // Priority 1: localStorage draft (unsaved local changes)
        if (pageId && unsavedChoice !== "discard") {
          const draftData = localStorage.getItem(`pg_cache_${pageId}`);
          if (draftData) {
            try {
              pageData = JSON.parse(draftData);
              console.log("Loaded unsaved draft from localStorage");
            } catch {
              pageData = null;
            }
          }
        }

        // Priority 2: DB (source of truth)
        if (!pageData && pageId) {
          pageData = await fetchPageDataFromDB(pageId);
        }

        // Priority 3: sessionStorage (during active generation session)
        if (!pageData) {
          const sessionData = sessionStorage.getItem("pageData");
          if (sessionData) {
            try {
              pageData = JSON.parse(sessionData);
            } catch {
              pageData = null;
            }
          }
        }

        if (pageData?.craftState || pageData?.sections?.length > 0) {
          if (!actions || !query) {
            isInitializing.current = false;
            return;
          }

          const startTime = performance.now();
          const hasCraftState = !!pageData.craftState;

          // Extract CSS classes from whichever data format we have
          const allClasses = hasCraftState
            ? extractClassNamesFromCraftState(pageData.craftState)
            : extractClassNames(pageData.sections);
          console.log(
            `📋 Extracted ${allClasses.length} unique Tailwind classes`,
          );

          // Prime Tailwind with all classes, then pause observer during bulk mount
          await primeTailwindWithClasses(allClasses);
          pauseTailwindObserver();

          try {
            if (hasCraftState) {
              const stateStr =
                typeof pageData.craftState === "string"
                  ? pageData.craftState
                  : JSON.stringify(pageData.craftState);
              actions.history.ignore().deserialize(stateStr);
            } else {
              await loadSectionsToCanvas(pageData.sections, actions, query);
            }
          } catch (error) {
            console.error("Error loading content to canvas:", error);
          }

          // Resume observer for future user edits
          resumeTailwindObserver();

          setContentReady(true);
          hasInitialized.current = true;
          isInitializing.current = false;

          setTimeout(() => {
            const endTime = performance.now();
            const label = hasCraftState
              ? "Craft state"
              : `${pageData.sections.length} sections`;
            console.log(
              `⏱️ Total time to load ${label} on canvas: ${(endTime - startTime).toFixed(2)}ms`,
            );
          }, 0);

          if (pageId) router.replace(`/builder?id=${pageId}`);
        } else if (isGenerating) {
          const prompt = sessionStorage.getItem("generationPrompt");
          const siteSections = sessionStorage.getItem("siteSections");
          const selectedTheme = sessionStorage.getItem("selectedTheme");

          if (prompt && siteSections && selectedTheme) {
            await generateContent(prompt);
          } else {
            console.warn("Missing required data for generation");
            setGenerationError("Missing required data from onboarding process");
            setContentReady(true);
            hasInitialized.current = true;
            isInitializing.current = false;
          }
        } else {
          setContentReady(true);
          hasInitialized.current = true;
          isInitializing.current = false;
        }
      } catch (error) {
        console.error("Error processing content:", error);
        setGenerationError("Failed to process content");
        setContentReady(true);
        hasInitialized.current = true;
        isInitializing.current = false;
      }
    };

    // Removed the 100ms setTimeout — queueMicrotask lets the current render
    // commit first without an arbitrary delay
    queueMicrotask(processContent);
  }, [
    isGenerating,
    generateContent,
    router,
    actions,
    query,
    pageId,
    unsavedChoice,
  ]);
};
