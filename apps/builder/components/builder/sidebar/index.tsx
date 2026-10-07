"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ElementsPanel } from "./elements";
import { LayersPanel } from "./layers";
import { PropertiesPanel } from "./properties";
import { AiPanel } from "./ai";
import { Theme } from "@/components/common/theme-manager/types";
import { Layers as LayersIcon, Settings, Sparkles } from "lucide-react";
import { ResponsiveDevice } from "../toolbar/responsive";

interface SideBarProps {
  activeTab: string;
  setActiveTab: (viewport: string) => void;
  isCollapsed: boolean;
  currentTheme?: Theme;
  onThemeChange: (theme: Theme) => void;
  projectId: string | null;
  viewport: ResponsiveDevice;
  setViewport: (viewport: ResponsiveDevice) => void;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  isCollapsed,
  currentTheme,
  onThemeChange,
  projectId,
  viewport,
  setViewport,
}: SideBarProps) {
  return (
    <div
      className={`border-r bg-muted/10 h-[calc(100vh-3.5rem)] transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-0" : "w-[22rem]"
      }`}
    >
      {/* Sidebar Content */}
      <Tabs
        className={`h-full flex flex-col transition-opacity duration-300 ${
          isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="grid w-full grid-cols-4 rounded-none border-b px-2 h-14">
          <TabsTrigger value="ai" className="flex items-center px-2 text-xs">
            <Sparkles className="h-4 w-4 mr-1.5" /> AI
          </TabsTrigger>
          <TabsTrigger
            value="elements"
            className="flex items-center px-2 text-xs"
          >
            Elements
          </TabsTrigger>
          <TabsTrigger
            value="layers"
            className="flex items-center px-2 text-xs"
          >
            <LayersIcon className="h-4 w-4 mr-1.5" />
            Layers
          </TabsTrigger>
          <TabsTrigger
            value="properties"
            className="flex items-center px-2 text-xs"
          >
            <Settings className="h-4 w-4 mr-1.5" />
            Properties
          </TabsTrigger>
        </TabsList>
        <TabsContent
          forceMount
          value="ai"
          className="m-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
        >
          <AiPanel
            currentTheme={currentTheme}
            onThemeChange={onThemeChange}
            projectId={projectId}
          />
        </TabsContent>
        <TabsContent
          value="elements"
          className="m-0 min-h-0 flex-1 overflow-hidden"
        >
          <ScrollArea className="h-full">
            <ElementsPanel />
          </ScrollArea>
        </TabsContent>
        <TabsContent
          value="layers"
          className="m-0 min-h-0 flex-1 overflow-hidden"
        >
          <ScrollArea className="h-full">
            <LayersPanel
              onOpenProperties={() => {
                setActiveTab("properties");
              }}
            />
          </ScrollArea>
        </TabsContent>
        <TabsContent
          value="properties"
          className="m-0 min-h-0 flex-1 overflow-hidden"
        >
          <ScrollArea className="h-full">
            <PropertiesPanel viewport={viewport} setViewport={setViewport} />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
