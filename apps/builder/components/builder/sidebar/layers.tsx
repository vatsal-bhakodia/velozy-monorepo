"use client";

import { Layers, useLayer } from "@craftjs/layers";
import { useEditor } from "@craftjs/core";
import { ChevronDown, Eye, EyeOff, Settings2 } from "lucide-react";
import type { ReactNode } from "react";

function BuilderLayer({
  children,
  onOpenProperties,
}: {
  children?: ReactNode;
  onOpenProperties: () => void;
}) {
  const {
    id,
    depth,
    children: layerChildren,
    expanded,
    connectors: { layer, drag, layerHeader },
    actions: { toggleLayer },
  } = useLayer((layerState) => ({
    expanded: layerState.expanded,
  }));
  const { actions, selected, hidden, displayName, hasChildren } = useEditor(
    (state, query) => {
      const node = state.nodes[id];
      return {
        selected: query.getEvent("selected").first() === id,
        hidden: node?.data.hidden,
        displayName:
          node?.data.custom?.displayName || node?.data.displayName || "Layer",
        hasChildren: Boolean(layerChildren?.length),
      };
    },
  );

  if (!layerChildren) return null;

  return (
    <div
      ref={(element) => {
        if (element) layer(element);
      }}
      className={`builder-layer ${selected ? "is-selected" : ""}`}
    >
      <div
        ref={(element) => {
          if (element) drag(element);
        }}
        className="builder-layer-row"
        style={{ paddingLeft: `${10 + depth * 14}px` }}
      >
        <button
          type="button"
          className="builder-layer-visibility"
          aria-label={hidden ? `Show ${displayName}` : `Hide ${displayName}`}
          onClick={() => actions.setHidden(id, !hidden)}
        >
          {hidden ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
        <div
          ref={(element) => {
            if (element) layerHeader(element);
          }}
          className="builder-layer-header"
        >
          <span className="builder-layer-name">{displayName}</span>
          <button
            type="button"
            className="builder-layer-settings"
            aria-label={`Open properties for ${displayName}`}
            onClick={(event) => {
              event.stopPropagation();
              actions.selectNode(id);
              onOpenProperties();
            }}
          >
            <Settings2 aria-hidden="true" />
          </button>
          {hasChildren && (
            <button
              type="button"
              className={`builder-layer-chevron ${expanded ? "is-expanded" : ""}`}
              aria-label={`${expanded ? "Collapse" : "Expand"} ${displayName}`}
              aria-expanded={expanded}
              onMouseDown={(event) => {
                event.stopPropagation();
                toggleLayer();
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <ChevronDown aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      {expanded && <div className="builder-layer-children">{children}</div>}
    </div>
  );
}

export function LayersPanel({
  onOpenProperties,
}: {
  onOpenProperties: (id: string) => void;
}) {
  return (
    <div className="py-4">
      <div className="craft-layers-override">
        <Layers
          renderLayer={(props) => (
            <BuilderLayer {...props} onOpenProperties={onOpenProperties} />
          )}
        />
      </div>
    </div>
  );
}
