import React, { useState } from "react";
import { Palette, Paintbrush } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ThemeManager } from "@/components/common/theme-manager";
import { FontManager } from "@/components/common/font-manager";
import { Theme } from "@/components/common/theme-manager/types";

export interface ThemeSelectorProps {
  allThemes: Theme[];
  selectedThemeId: string;
  setSelectedThemeId: React.Dispatch<React.SetStateAction<string>>;
  setCustomThemes: React.Dispatch<React.SetStateAction<Theme[]>>;
  onThemeChange?: (theme: Theme) => void;
}

export default function ThemeSelectorModal({
  allThemes,
  selectedThemeId,
  setSelectedThemeId,
  setCustomThemes,
  onThemeChange,
}: ThemeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempSelectedThemeId, setTempSelectedThemeId] =
    useState(selectedThemeId);

  const handleApply = () => {
    setSelectedThemeId(tempSelectedThemeId);
    setIsOpen(false);
    const theme = allThemes.find((t) => t.id === tempSelectedThemeId);
    if (theme && onThemeChange) {
      onThemeChange(theme);
    }
    console.log("Applied theme:", theme);
  };

  const handleClose = () => {
    setTempSelectedThemeId(selectedThemeId);
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setTempSelectedThemeId(selectedThemeId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-muted/50 h-9 w-9 transition-all duration-200 hover:scale-105"
        >
          <Palette className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] max-h-[95vh] flex flex-col">
        <DialogHeader className="pb-4 border-b border-neutral-200 dark:border-neutral-700">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Palette className="h-5 w-5 text-blue-600 dark:text-cyan-400" />
            </div>
            Choose Theme
          </DialogTitle>
          <DialogDescription className="text-neutral-600 dark:text-neutral-400">
            Select a theme from the dropdown below and preview it before
            applying.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <ThemeManager
            allThemes={allThemes}
            selectedThemeId={tempSelectedThemeId}
            onThemeSelect={setTempSelectedThemeId}
            setCustomThemes={setCustomThemes}
          />
          <FontManager
            allThemes={allThemes}
            selectedThemeId={tempSelectedThemeId}
            onThemeSelect={setTempSelectedThemeId}
            setCustomThemes={setCustomThemes}
          />
        </div>

        <DialogFooter className="pt-4 border-t border-neutral-200 dark:border-neutral-700 gap-2">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          <Button
            onClick={handleApply}
            className="gap-2 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white border-0 p-2"
          >
            Apply Theme
            <Paintbrush className="w-5 h-5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
