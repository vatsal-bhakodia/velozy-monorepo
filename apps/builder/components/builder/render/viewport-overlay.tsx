import { useEditor, useNode, NodeProvider } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import React, { useEffect, useRef, useCallback, useMemo } from "react";
import ReactDOM from "react-dom";
import { ArrowUp, Move, Delete } from "lucide-react";
import { TextToolbar } from "./text-toolbar";
import { overlayManager } from "./overlay-manager";

const ActiveNodeToolbar = ({ id }: { id: string }) => {
  const { actions, query } = useEditor(() => ({}));
  const {
    dom,
    name,
    moveable,
    deletable,
    connectors: { drag },
    parent,
    isTextComponent,
    isPageComponent,
  } = useNode((node) => ({
    dom: node.dom as HTMLElement | null,
    name: node.data.custom?.displayName || node.data.displayName,
    moveable: query.node(node.id).isDraggable(),
    deletable: query.node(node.id).isDeletable(),
    parent: node.data.parent,
    isTextComponent:
      node.data.displayName === "Text" || node.data.displayName === "List",
    isPageComponent: node.data.custom?.displayName === "Page",
  }));

  const labelRef = useRef<HTMLDivElement | null>(null);

  const getPosition = useCallback((element: HTMLElement | null) => {
    if (!element) return { top: "0px", left: "0px" };

    const iframe = document.getElementById("canvas");
    const container = document.getElementById("page-container");
    if (!iframe || !container) return { top: "0px", left: "0px" };

    const iframeRect = iframe.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const ABOVE_OFFSET = 38;
    const BELOW_GAP = 8;
    const left = iframeRect.left + elementRect.left - containerRect.left;
    const topAbove =
      iframeRect.top + elementRect.top - containerRect.top - ABOVE_OFFSET;
    const shouldPlaceBelow = topAbove < 0;
    const top = shouldPlaceBelow
      ? iframeRect.top + elementRect.bottom - containerRect.top + BELOW_GAP
      : topAbove;

    return { top: `${top}px`, left: `${left}px` };
  }, []);

  const updateLabelPosition = useCallback(() => {
    if (!labelRef.current || !dom) return;
    const pos = getPosition(dom);
    labelRef.current.style.top = pos.top;
    labelRef.current.style.left = pos.left;
  }, [dom, getPosition]);

  useEffect(() => {
    if (isPageComponent || !dom) return;
    overlayManager.notify(id, dom, false, true, updateLabelPosition);
    return () => {
      overlayManager.unregister(id);
    };
  }, [id, dom, isPageComponent, updateLabelPosition]);

  const handleDelete = useCallback(() => {
    if (!deletable) return;
    overlayManager.clearActive();
    actions.delete(id);
  }, [deletable, actions, id]);

  const labelPosition = useMemo(
    () => (!isPageComponent && dom ? getPosition(dom) : null),
    [isPageComponent, dom, getPosition],
  );

  if (isPageComponent || !labelPosition) return null;

  return ReactDOM.createPortal(
    <div
      ref={labelRef}
      className="absolute z-[49] h-9 flex items-center px-3 bg-neutral-800 text-white rounded-lg shadow-lg border border-neutral-600/50 backdrop-blur-sm"
      style={labelPosition}
    >
      <div className="flex items-center w-full">
        <h2
          className="font-medium text-xs text-slate-200 whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px] mr-3"
          title={name}
        >
          {name}
        </h2>

        <div className="flex items-center ml-auto gap-1">
          {moveable && (
            <button
              ref={(ref) => {
                if (ref) drag(ref);
              }}
              className="p-1.5 rounded-md hover:bg-white/10 active:bg-white/20 transition-colors duration-200 cursor-move group"
              title="Move"
            >
              <Move className="w-3.5 h-3.5 text-slate-300 group-hover:text-white transition-colors" />
            </button>
          )}

          {id !== ROOT_NODE && parent && (
            <button
              className="p-1.5 rounded-md hover:bg-white/10 active:bg-white/20 transition-colors duration-200 group"
              onClick={() => actions.selectNode(parent)}
              title="Select Parent"
            >
              <ArrowUp className="w-3.5 h-3.5 text-slate-300 group-hover:text-white transition-colors" />
            </button>
          )}

          {deletable && (
            <button
              className="p-1.5 rounded-md hover:bg-red-500/20 active:bg-red-500/30 transition-colors duration-200 group"
              onMouseDown={(e: React.MouseEvent) => {
                e.stopPropagation();
                handleDelete();
              }}
              title="Delete"
            >
              <Delete className="w-3.5 h-3.5 text-slate-300 group-hover:text-red-400 transition-colors" />
            </button>
          )}

          {isTextComponent && <TextToolbar />}
        </div>
      </div>
    </div>,
    document.getElementById("page-container") as Element | DocumentFragment,
  );
};

export const ViewportOverlay = () => {
  const { query, activeNodeId, hoveredNodeId } = useEditor((state) => {
    let hoveredNodeId = null;
    let activeNodeId = null;

    if (state.events.hovered && state.events.hovered.size > 0) {
      hoveredNodeId = Array.from(state.events.hovered)[0];
    }
    if (state.events.selected && state.events.selected.size > 0) {
      activeNodeId = Array.from(state.events.selected)[0];
    }

    return { activeNodeId, hoveredNodeId };
  });

  // Sync hovered node outline with overlay manager
  useEffect(() => {
    if (hoveredNodeId && hoveredNodeId !== activeNodeId) {
      let node;
      try {
        node = query.node(hoveredNodeId).get();
      } catch (e) {
        // Node might not exist if deleted
      }
      if (node && node.dom) {
        const dom = node.dom;
        const isPage = node.data.custom?.displayName === "Page";
        if (!isPage) {
          overlayManager.notify(hoveredNodeId, dom, true, false, null);
          return () => overlayManager.unregister(hoveredNodeId);
        }
      }
    }
  }, [hoveredNodeId, activeNodeId, query]);

  return (
    <>
      {activeNodeId && (
        <NodeProvider id={activeNodeId}>
          <ActiveNodeToolbar id={activeNodeId} />
        </NodeProvider>
      )}
    </>
  );
};
