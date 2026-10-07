"use client";

import { useEditor } from "@craftjs/core";
import {
  ResponsiveDevice,
  ResponsiveToolbarProvider,
} from "../toolbar/responsive";

export function PropertiesPanel({
  viewport,
  setViewport,
}: {
  viewport: ResponsiveDevice;
  setViewport: (device: ResponsiveDevice) => void;
}) {
  const { selectedNode } = useEditor((state) => {
    const [currentNodeId] = Array.from(state.events.selected);
    return {
      selectedNode: currentNodeId ? state.nodes[currentNodeId] : null,
    };
  });

  if (!selectedNode) {
    return (
      <div className="p-4 border-l">
        <div className="text-sm">No element selected</div>
      </div>
    );
  }

  const Toolbar = selectedNode.related?.toolbar;

  return (
    <ResponsiveToolbarProvider device={viewport} setDevice={setViewport}>
      <div className="p-4 border-l">
        {Toolbar ? (
          <Toolbar />
        ) : (
          <div className="text-sm">
            Selected element: {selectedNode.data.displayName}
          </div>
        )}
      </div>
    </ResponsiveToolbarProvider>
  );
}
