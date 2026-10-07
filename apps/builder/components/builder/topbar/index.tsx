"use client";

import { useState, useEffect } from "react";
import { useEditor } from "@craftjs/core";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ArrowLeft,
  Code,
  Laptop,
  TabletIcon,
  Smartphone,
  ExternalLink,
  Share,
  Save,
  Check,
  Loader2,
  Undo2,
  Redo2,
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react";

import { CodeView } from "./code-viewer";
import { PublishDialog } from "./publish-dialog";
import { useTheme } from "next-themes";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import ThemeSelectorModal from "./theme-manager-modal";
import { Theme } from "@/components/common/theme-manager/types";

interface TopBarProps {
  // viewport
  viewport: string;
  setViewport: (viewport: string) => void;
  // sidebar
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  // theme
  allThemes: Theme[];
  selectedThemeId: string;
  setSelectedThemeId: React.Dispatch<React.SetStateAction<string>>;
  setCustomThemes: React.Dispatch<React.SetStateAction<Theme[]>>;
  onThemeChange?: (theme: Theme) => void;
  // save
  onSave?: () => Promise<void>;
}

export function TopBar({
  viewport,
  setViewport,
  onToggleSidebar,
  isSidebarCollapsed,
  allThemes,
  selectedThemeId,
  setSelectedThemeId,
  setCustomThemes,
  onThemeChange,
  onSave,
}: TopBarProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  const handleSave = async () => {
    if (!onSave || isSaving) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSave();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setIsSaving(false);
    }
  };
  // undo / redo
  const { canUndo, canRedo, actions } = useEditor((state, query) => ({
    canUndo: query.history.canUndo(),
    canRedo: query.history.canRedo(),
  }));

  // undo/redo with keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (canUndo && (event.ctrlKey || event.metaKey) && event.key === "z") {
        event.preventDefault();
        actions.history.undo();
      } else if (
        canRedo &&
        (event.ctrlKey || event.metaKey) &&
        event.key === "y"
      ) {
        event.preventDefault();
        actions.history.redo();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [actions, canUndo, canRedo]);

  // Dialog states
  const [codeViewerOpen, setCodeViewerOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);

  // Handle theme changes
  const handleThemeChange = (theme: Theme) => {
    console.log("Theme changed:", theme);
    if (onThemeChange) {
      onThemeChange(theme);
    }
  };

  return (
    <div className="border-b bg-background">
      <div className="mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left side controls */}
        <div className="flex items-center gap-3">
          {/* Back button */}
          <a href="/pages">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-muted/50 h-9 w-9"
              title="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </a>

          {/* Sidebar toggle button */}
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-lg"
            onClick={onToggleSidebar}
            title={isSidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>

          <div className="h-6 w-px bg-border mx-1" />

          {/* Viewport toggle */}
          <ToggleGroup
            type="single"
            value={viewport}
            onValueChange={setViewport}
            className="border bg-muted/50 rounded-lg p-0.5"
          >
            <ToggleGroupItem
              value="desktop"
              className="h-8 w-8 p-0 data-[state=on]:bg-muted"
              title="Desktop view"
            >
              <Laptop className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="tablet"
              className="h-8 w-8 p-0 data-[state=on]:bg-muted"
              title="Tablet view"
            >
              <TabletIcon className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="mobile"
              className="h-8 w-8 p-0 data-[state=on]:bg-muted"
              title="Mobile view"
            >
              <Smartphone className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>

          <div className="h-6 w-px bg-border mx-1" />

          {/* Undo/Redo buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 rounded-lg"
              onClick={() => actions.history.undo()}
              disabled={!canUndo}
              title="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 rounded-lg"
              onClick={() => actions.history.redo()}
              disabled={!canRedo}
              title="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2 pl-3 ml-3">
          {/* Theme Switch */}
          <AnimatedThemeToggler
            theme={resolvedTheme === "dark" ? "dark" : "light"}
            onThemeChange={setTheme}
            variant="circle"
            duration={450}
            aria-label="Toggle theme"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted/60 [&_svg]:h-4 [&_svg]:w-4"
          />

          {/* Enhanced Theme Selector */}
          <ThemeSelectorModal
            allThemes={allThemes}
            selectedThemeId={selectedThemeId}
            setSelectedThemeId={setSelectedThemeId}
            setCustomThemes={setCustomThemes}
            onThemeChange={handleThemeChange}
          />

          <div className="h-6 w-px bg-border mx-1" />

          {/* View Code */}
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-muted/50 h-9 w-9"
            onClick={() => setCodeViewerOpen(true)}
            title="View code"
          >
            <Code className="h-[1.2rem] w-[1.2rem]" />
          </Button>

          {/* Code Viewer Component */}
          <CodeView open={codeViewerOpen} onOpenChange={setCodeViewerOpen} />

          {/* View Deployed */}
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-muted/50 h-9 w-9"
            title="View deployed"
          >
            <ExternalLink className="h-[1.2rem] w-[1.2rem]" />
          </Button>

          {/* Save Button */}
          <button
            className="flex items-center justify-center gap-2 rounded-md text-sm font-semibold border border-border px-4 py-2 hover:bg-muted/50 transition-colors disabled:opacity-50"
            onClick={handleSave}
            disabled={isSaving}
            title="Save changes"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saveSuccess ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>
              {isSaving ? "Saving..." : saveSuccess ? "Saved" : "Save"}
            </span>
          </button>

          {/* Publish Button */}
          <button
            className="bg-gradient hover:bg-gradient flex align-center justify-center gap-2 rounded-md text-sm font-semibold text-white px-4 py-2"
            onClick={() => setPublishDialogOpen(true)}
            title="Publish your project"
          >
            <span>Publish</span>
            <Share className="h-4 w-4" />
          </button>

          {/* Publish Dialog */}
          <PublishDialog
            open={publishDialogOpen}
            onOpenChange={setPublishDialogOpen}
          />
        </div>
      </div>
    </div>
  );
}
