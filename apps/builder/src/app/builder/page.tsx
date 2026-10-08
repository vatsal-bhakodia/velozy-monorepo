"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Editor, Frame, Element, useEditor } from "@craftjs/core";
import { Viewport, VIEWPORT_PRESETS, GenerationState } from "./types";
import themes from "@/constants/themes";
import { Theme } from "@/components/common/theme-manager/types";

// Components
import { TopBar } from "@/components/builder/topbar";
import { Sidebar } from "@/components/builder/sidebar";
import { Canvas } from "@/components/builder/canvas";
import { GeneratingOverlay } from "@/components/builder/canvas/content-generation-overlay";
import { ContentLoadingOverlay } from "@/components/builder/canvas/content-loading-overlay";
import { ErrorOverlay } from "@/components/builder/canvas/error-overlay";
import { ViewportOverlay } from "@/components/builder/render/viewport-overlay";
import { BuilderElements } from "@/components/builder/elements";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Hooks
import { useContentGeneration } from "./use-content-generation";
import {
  useContentInitialization,
  getSharedPageData,
} from "./use-content-initialization";
import { ensureNavbarOnCanvas } from "./use-content-initialization";
import { useThemeManager } from "@/components/common/theme-manager/hook";

/** Read draft page data from localStorage, returns {} if none or corrupted */
function readDraft(pageId: string): Record<string, any> {
  const cached = localStorage.getItem(`pg_cache_${pageId}`);
  if (!cached) return {};
  try {
    return JSON.parse(cached);
  } catch {
    return {};
  }
}

// Inner component that has access to useEditor
function BuilderInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isGenerating = searchParams.get("generating") === "true";
  const pageId = searchParams.get("id");

  // Get Craft.js editor actions and query.
  // Using an empty selector avoids re-rendering BuilderInner on every single node hover and selection.
  const { actions, query } = useEditor(() => ({}));

  // Use refs to track initialization and prevent multiple executions
  const hasInitialized = useRef(false);
  const isInitializing = useRef(false);
  const generationStateRef = useRef<GenerationState | null>(null);
  const autosaveBaselineRef = useRef<string | null>(null);

  // State management
  const [viewport, setViewport] = useState<Viewport>(VIEWPORT_PRESETS.desktop);
  const [activeTab, setActiveTab] = useState("elements");
  const [isLoading, setIsLoading] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isLoadingFromStorage, setIsLoadingFromStorage] = useState(false);
  const [pageTitle, setPageTitle] = useState<string | null>(null);

  // Keep the browser tab title tied to the page currently being edited.
  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} | Page Builder` : "Page Builder";
  }, [pageTitle]);

  // Sidebar collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = isGenerating
    ? useState(true)
    : useState(false);

  // Multi-step generation state
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [currentStepText, setCurrentStepText] = useState("");
  const [completedSections, setCompletedSections] = useState<string[]>([]);

  const [unsavedChoice, setUnsavedChoice] = useState<
    "pending" | "recover" | "discard" | "none"
  >("pending");
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && pageId && !isGenerating) {
      if (localStorage.getItem(`pg_draft_${pageId}`) === "true") {
        setShowUnsavedModal(true);
      } else {
        setUnsavedChoice("none");
      }
    } else {
      setUnsavedChoice("none");
    }
  }, [pageId, isGenerating]);

  const handleRecover = () => {
    setShowUnsavedModal(false);
    setUnsavedChoice("recover");
  };

  const handleDiscard = () => {
    localStorage.removeItem(`pg_draft_${pageId}`);
    localStorage.removeItem(`pg_cache_${pageId}`);
    setShowUnsavedModal(false);
    setUnsavedChoice("discard");
  };

  // Autosave draft to localStorage every 5s when canvas has changes
  useEffect(() => {
    if (!pageId || isGenerating || !contentReady) return;

    const interval = setInterval(() => {
      const craftStateStr = query.serialize();
      if (!craftStateStr || craftStateStr === "{}") return;

      // The first snapshot is the loaded canvas, not an edit. Without this
      // baseline, an empty local cache makes every existing page look dirty.
      if (autosaveBaselineRef.current === null) {
        autosaveBaselineRef.current = craftStateStr;
        return;
      }

      if (autosaveBaselineRef.current === craftStateStr) return;

      const pageData = readDraft(pageId);
      pageData.craftState = JSON.parse(craftStateStr);
      localStorage.setItem(`pg_cache_${pageId}`, JSON.stringify(pageData));
      localStorage.setItem(`pg_draft_${pageId}`, "true");
      autosaveBaselineRef.current = craftStateStr;
    }, 5000);

    return () => clearInterval(interval);
  }, [pageId, isGenerating, query, contentReady]);

  // Project and theme state (loaded from DB)
  const [projectId, setProjectId] = useState<string | null>(null);
  const [initialTheme, setInitialTheme] = useState<Theme | null>(null);

  // Fetch project theme from DB when we have a pageId
  useEffect(() => {
    if (!pageId || isGenerating) return;

    const fetchProjectTheme = async () => {
      try {
        // Get page info (includes projectId)
        const pageData = await getSharedPageData(pageId);
        if (!pageData) return;
        setPageTitle(pageData.page?.title || null);
        const pid = pageData.page?.projectId;
        if (!pid) return;
        setProjectId(pid);
        sessionStorage.setItem("projectId", pid);

        // Fetch project to get designPreference
        const projRes = await fetch(`/api/admin/projects?projectId=${pid}`);
        if (!projRes.ok) return;
        const projData = await projRes.json();
        const dbTheme = projData.project?.designPreference?.theme;
        if (dbTheme) {
          setInitialTheme(dbTheme);
        }
      } catch (err) {
        console.warn("Failed to load project theme from DB:", err);
      }
    };

    fetchProjectTheme();
  }, [pageId, isGenerating]);

  // Also capture projectId from sessionStorage during generation flow
  useEffect(() => {
    if (isGenerating && typeof window !== "undefined") {
      const pid = sessionStorage.getItem("projectId");
      if (pid) setProjectId(pid);
    }
  }, [isGenerating]);

  const {
    allThemes,
    customThemes,
    selectedThemeId,
    currentTheme,
    themeColors,
    setSelectedThemeId,
    handleThemeChange: baseHandleThemeChange,
    setCustomThemes,
  } = useThemeManager({ themes, initialTheme });

  // Wrap handleThemeChange to also persist to DB
  const handleThemeChange = useCallback(
    (theme: Theme) => {
      baseHandleThemeChange(theme);

      // Persist to DB
      if (projectId) {
        fetch("/api/admin/projects/theme", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, theme }),
        }).catch((err) => console.warn("Failed to persist theme to DB:", err));
      }
    },
    [baseHandleThemeChange, projectId],
  );

  // Auto-uncollapse sidebar when content becomes ready (after generation)
  useEffect(() => {
    if (contentReady && !isGenerating) {
      setIsSidebarCollapsed(false);
    }
  }, [contentReady, isGenerating]);

  // Show loading overlay when opening an existing page (not generating)
  useEffect(() => {
    if (pageId && !isGenerating && typeof window !== "undefined") {
      setIsLoadingFromStorage(true);
    }
  }, [pageId, isGenerating]);

  // Hide loading overlay when content is ready
  useEffect(() => {
    if (contentReady && isLoadingFromStorage) {
      setIsLoadingFromStorage(false);
    }
  }, [contentReady, isLoadingFromStorage]);

  const { generateContent } = useContentGeneration(
    setContentReady,
    setIsLoading,
    setGenerationError,
    setCurrentStep,
    setCurrentStepText,
    setTotalSteps,
    setCompletedSections,
    generationStateRef,
    completedSections,
    setCustomThemes,
    setSelectedThemeId,
    actions,
    query,
    isGenerating,
  );

  // Content initialization
  useContentInitialization(
    isGenerating,
    generateContent,
    hasInitialized,
    isInitializing,
    setContentReady,
    setGenerationError,
    router,
    actions,
    query,
    pageId,
    unsavedChoice,
  );

  // Navbar is a page-level system component. It is inserted automatically once
  // the initial canvas content is ready, but never duplicated on existing pages.
  const navbarEnsured = useRef(false);
  useEffect(() => {
    if (!contentReady || navbarEnsured.current || !actions || !query) return;
    ensureNavbarOnCanvas(actions, query, projectId);
    navbarEnsured.current = true;
    // Include automatic canvas setup in the loaded baseline. It is not a
    // user edit and must not create an unsaved-changes prompt on refresh.
    autosaveBaselineRef.current = query.serialize();
  }, [contentReady, actions, query, projectId]);

  // Viewport handler
  const handleViewportChange = useCallback(
    (type: string) => {
      if (type in VIEWPORT_PRESETS) {
        setViewport(VIEWPORT_PRESETS[type]);
      }
    },
    [setViewport],
  );

  // Sidebar toggle handler
  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev);
  }, []);

  // Save handler - persists current page data to DB
  const handleSave = useCallback(async () => {
    if (!pageId) {
      console.warn("No pageId in URL — cannot save to DB");
      return;
    }

    const craftStateStr = query.serialize();
    if (!craftStateStr || craftStateStr === "{}") {
      console.warn("No canvas data to save");
      return;
    }

    const pageData = readDraft(pageId);
    pageData.craftState = JSON.parse(craftStateStr);

    const res = await fetch("/api/pages/data", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId, pageData }),
    });

    if (!res.ok) {
      throw new Error("Failed to save page data");
    }

    localStorage.removeItem(`pg_draft_${pageId}`);
    localStorage.setItem(`pg_cache_${pageId}`, JSON.stringify(pageData));
    console.log("Page data saved to DB successfully");
  }, [pageId, query]);

  return (
    <>
      <TopBar
        viewport={viewport.type}
        setViewport={handleViewportChange}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={handleToggleSidebar}
        allThemes={allThemes}
        selectedThemeId={selectedThemeId}
        setSelectedThemeId={setSelectedThemeId}
        setCustomThemes={setCustomThemes}
        onThemeChange={handleThemeChange}
        onSave={handleSave}
      />

      <div className="flex flex-1">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isCollapsed={isSidebarCollapsed}
          currentTheme={currentTheme}
          onThemeChange={handleThemeChange}
          projectId={projectId}
          viewport={viewport.type}
          setViewport={handleViewportChange}
        />

        <div className="flex-1 p-4 overflow-auto bg-neutral-300 dark:bg-neutral-600">
          <div
            id="page-container"
            data-viewport={viewport.type}
            className={`device-frame w-full max-w-full transition-[width,height,border-radius,box-shadow] duration-300 ease-in-out mx-auto relative overflow-hidden ${viewport.type === "desktop" ? "" : "device-frame--mockup"}`}
            style={{ width: viewport.width, height: viewport.height }}
          >
            <div
              id="page-container-inner"
              className="relative h-full w-full overflow-hidden"
            >
              <GeneratingOverlay
                isVisible={isLoading}
                currentStep={currentStep}
                totalSteps={totalSteps}
                currentStepText={currentStepText}
              />

              <ContentLoadingOverlay
                isVisible={isLoadingFromStorage && !contentReady}
              />

              <Canvas
                title="Canvas"
                className="w-full h-full border-none bg-background"
                theme={currentTheme}
                contentReady={contentReady}
              >
                <Frame>
                  <Element
                    is="div"
                    id="ROOT"
                    canvas
                    style={{ height: "100%" }}
                    custom={{ displayName: "Page" }}
                  />
                </Frame>
              </Canvas>

              {/* Error Overlay */}
              <ErrorOverlay
                generationError={generationError}
                onRetry={() => window.location.reload()}
                onGoBack={() => {
                  setGenerationError(null);
                  window.location.assign("/pages");
                }}
              />

              <ViewportOverlay />
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showUnsavedModal} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unsaved Changes Detected</DialogTitle>
            <DialogDescription>
              We found unsaved progress from your last session. Would you like
              to pick up where you left off or discard these changes?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-between">
            <Button variant="outline" onClick={handleDiscard}>
              Discard Changes
            </Button>
            <Button onClick={handleRecover}>Continue Editing</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function BuilderPage() {
  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-background">
      <Editor resolver={BuilderElements}>
        <Suspense fallback={null}>
          <BuilderInner />
        </Suspense>
      </Editor>
    </div>
  );
}
