import React, { useState, useEffect, useRef } from "react";
import { GripVertical, Layout, X } from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  type DraggableProvided,
  type DroppableProvided,
} from "@hello-pangea/dnd";
import type { DynamicSource, SiteSection } from "@/src/onboard/types";

const dynamicSourceLabels: Record<DynamicSource, string> = {
  products: "Products",
  productCategories: "Collections",
  blogs: "Blogs",
};

interface SiteSectionsPanelProps {
  siteSections: SiteSection[];
  setSiteSections: React.Dispatch<React.SetStateAction<SiteSection[]>>;
  isProcessing: boolean;
}

// Skeleton loading component with animations
const SkeletonLoader = ({
  count,
  onFirstCardRef,
}: {
  count: number;
  onFirstCardRef?: (ref: HTMLDivElement | null) => void;
}) => {
  const titleWidths = [82, 68, 76, 61, 88, 72];
  const descriptionWidths = [91, 78, 86, 72, 83, 76];

  return (
    <div className="w-full space-y-3">
      {/* Animated section skeletons */}
      {[...Array(count)].map((_, index) => (
        <div
          key={index}
          ref={index === 0 ? onFirstCardRef : undefined}
          className="flex items-center space-x-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 animate-pulse dark:border-neutral-700 dark:bg-neutral-800"
          style={{
            animationDelay: `${index * 0.1}s`,
            animationDuration: "1.5s",
          }}
        >
          <div className="h-4 w-4 rounded bg-gray-300 animate-shimmer dark:bg-neutral-600"></div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center space-x-2">
              <div
                className="h-4 rounded-lg bg-gray-300 animate-shimmer dark:bg-neutral-600"
                style={{ width: `${titleWidths[index % titleWidths.length]}%` }}
              ></div>
            </div>
            <div
              className="h-3 rounded-lg bg-gray-200 animate-shimmer dark:bg-neutral-700"
              style={{
                width: `${descriptionWidths[index % descriptionWidths.length]}%`,
              }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const SiteSectionsPanel = ({
  isProcessing,
  siteSections,
  setSiteSections,
}: SiteSectionsPanelProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const skeletonCardRef = useRef<HTMLDivElement | null>(null);
  const [skeletonCount, setSkeletonCount] = useState(5);

  // Calculate how many skeleton cards can fit in the container
  const calculateSkeletonCount = React.useCallback(() => {
    if (!containerRef.current) return;

    const containerHeight = containerRef.current.clientHeight;

    // If we have a reference card, use its measured height
    if (skeletonCardRef.current) {
      const cardHeight = skeletonCardRef.current.offsetHeight;
      const spacing = 16; // space-y-4 = 1rem = 16px

      if (cardHeight > 0) {
        // Calculate how many cards fit, accounting for spacing between cards
        const count = Math.floor(
          (containerHeight + spacing) / (cardHeight + spacing),
        );
        // Ensure at least 3 skeletons are shown, and add 1 extra to fill the space
        setSkeletonCount(Math.max(3, count + 1));
        return;
      }
    }

    // Fallback: estimate based on typical card height (~80px with padding and content)
    // p-4 = 16px top + 16px bottom = 32px, content ~48px, total ~80px
    const estimatedCardHeight = 80;
    const spacing = 16;
    const count = Math.floor(
      (containerHeight + spacing) / (estimatedCardHeight + spacing),
    );
    setSkeletonCount(Math.max(3, count + 1));
  }, []);

  // Handle first skeleton card ref callback
  const handleFirstCardRef = React.useCallback(
    (ref: HTMLDivElement | null) => {
      skeletonCardRef.current = ref;
      if (ref && isProcessing) {
        // Measure after the card is rendered
        requestAnimationFrame(() => {
          calculateSkeletonCount();
        });
      }
    },
    [isProcessing, calculateSkeletonCount],
  );

  useEffect(() => {
    // Calculate on mount and when processing starts
    if (isProcessing) {
      // Initial calculation with fallback
      calculateSkeletonCount();

      // Recalculate after a short delay to ensure DOM is fully rendered
      const timeoutId = setTimeout(() => {
        calculateSkeletonCount();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [isProcessing, calculateSkeletonCount]);

  useEffect(() => {
    // Recalculate on window resize
    const handleResize = () => {
      if (isProcessing) {
        calculateSkeletonCount();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isProcessing, calculateSkeletonCount]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(siteSections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSiteSections(items);
  };

  const handleDelete = (sectionId: string) => {
    setSiteSections(siteSections.filter((section) => section.id !== sectionId));
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white py-4 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
      <div className="flex items-center space-x-3 border-b border-gray-200/50 px-6 pb-4 animate-slideIn dark:border-neutral-700">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient text-white shadow-lg shadow-cyan-500/15">
          <Layout className="h-6 w-6" />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-cyan-400 dark:border-neutral-900" />
        </div>

        <div>
          <h3 className="truncate text-lg font-bold tracking-[-0.025em] text-neutral-950 dark:text-white">
            Site Structure
          </h3>
          {isProcessing ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium text-gray-600 dark:text-neutral-400 animate-pulse">
                Generating Sections...
              </span>
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-neutral-400">
              Drag to reorder sections
            </p>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        className="my-3 flex min-h-0 flex-1 items-start justify-center overflow-hidden px-6"
      >
        {isProcessing ? (
          <SkeletonLoader
            count={skeletonCount}
            onFirstCardRef={handleFirstCardRef}
          />
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="sections">
              {(provided: DroppableProvided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="h-full w-full space-y-3 overflow-y-auto pr-2 select-none"
                >
                  {siteSections.map((section, index) => (
                    <Draggable
                      key={section.id}
                      draggableId={section.id}
                      index={index}
                    >
                      {(provided: DraggableProvided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="group relative flex items-center space-x-3 rounded-xl border border-gray-200 bg-gray-50 p-4 transition-colors hover:bg-gray-100 dark:border-neutral-700 dark:bg-neutral-700 dark:hover:bg-neutral-600"
                        >
                          <div {...provided.dragHandleProps}>
                            <GripVertical className="w-4 h-4 text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium text-gray-800 dark:text-neutral-50">
                                {section.name}
                              </h4>
                              {section.kind === "dynamic" && (
                                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-cyan-100 text-cyan-700">
                                  {section.dynamic?.source
                                    ? dynamicSourceLabels[
                                        section.dynamic.source
                                      ]
                                    : "Dynamic"}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-neutral-400">
                              {section.description}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDelete(section.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 
                            p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 
                            flex items-center justify-center"
                            title="Delete section"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>
    </div>
  );
};
