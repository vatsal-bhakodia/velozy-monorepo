import React from "react";
import { useNode } from "@craftjs/core";
import { IframeProps } from "./types";
import ToolBar from "@/components/builder/toolbar/index";
import { AppWindowIcon, ExternalLink } from "lucide-react";
import { IframeSettings } from "./settings";
import { cn } from "@/lib/utils";

export const Iframe = ({
  src,
  allowFullScreen = true,
  loading = "lazy",
  isEditorEnabled = false,
  className,
  style,
}: IframeProps) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn(
        className,
        isEditorEnabled
          ? "overflow-hidden relative cursor-move"
          : "cursor-default",
      )}
      style={style}
    >
      {src ? (
        <iframe
          src={src}
          width="100%"
          height="100%"
          allowFullScreen={allowFullScreen}
          loading={loading}
          className="border border-border rounded-md bg-background w-full h-full"
        />
      ) : (
        <div className="w-full h-full border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center text-muted-foreground">
          <div className="text-center p-4">
            <ExternalLink className="w-8 h-8 mx-auto mb-2" />
            <p>No URL configured</p>
            <p className="text-sm">Add a URL in the settings panel</p>
          </div>
        </div>
      )}
      {isEditorEnabled && <div className="absolute inset-0" />}
    </div>
  );
};

Iframe.craft = {
  displayName: "Iframe",
  props: {
    src: "",
    allowFullScreen: true,
    loading: "lazy",
    isEditorEnabled: true,
  },
  rules: {
    canDrag: () => true,
  },
  related: {
    toolbar: ToolBar,
  },
  toolbarSections: ["dimensions"], // Dimensions handled here
  customToolbarSections: [
    {
      key: "iframeSettings",
      label: "Iframe Settings",
      icon: AppWindowIcon,
      component: <IframeSettings />,
      priority: 1,
    },
  ],
};

export default Iframe;
