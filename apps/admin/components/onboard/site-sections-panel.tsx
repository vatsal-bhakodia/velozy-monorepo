import React, { useState, useEffect, useRef } from "react";
import { FileText, GripVertical, Home, Layout, X } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  type DraggableProvided,
  type DroppableProvided,
} from "@hello-pangea/dnd";
import type { DynamicSource, SiteSection, StructureStage } from "@/src/onboard/types";

const dynamicSourceLabels: Record<DynamicSource, string> = {
  products: "Products",
  productCategories: "Collections",
  blogs: "Blogs",
  custom: "Custom collection",
};

interface SiteSectionsPanelProps {
  siteSections: SiteSection[];
  setSiteSections: React.Dispatch<React.SetStateAction<SiteSection[]>>;
  plannedPages: string[];
  setPlannedPages: React.Dispatch<React.SetStateAction<string[]>>;
  structureStage: StructureStage;
  isProcessing: boolean;
}

// Quiet placeholders keep the panel structure visible while sections generate.
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
          aria-hidden="true"
          className="flex items-center gap-3 rounded-md border border-neutral-200/80 bg-white/70 px-4 py-3 dark:border-white/[0.07] dark:bg-white/[0.025]"
        >
          <div className="h-8 w-8 shrink-0 rounded-md bg-neutral-200/80 motion-safe:animate-pulse motion-reduce:animate-none dark:bg-white/[0.07]" />
          <div className="min-w-0 flex-1 space-y-2">
            <div
              className="h-3 rounded-full bg-neutral-200 motion-safe:animate-pulse motion-reduce:animate-none dark:bg-white/[0.09]"
              style={{
                width: `${titleWidths[index % titleWidths.length]}%`,
                animationDelay: `${index * 0.1}s`,
                animationDuration: "2s",
              }}
            />
            <div
              className="h-2.5 rounded-full bg-neutral-100 motion-safe:animate-pulse motion-reduce:animate-none dark:bg-white/[0.05]"
              style={{
                width: `${descriptionWidths[index % descriptionWidths.length]}%`,
                animationDelay: `${index * 0.1 + 0.08}s`,
                animationDuration: "2s",
              }}
            />
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
  plannedPages,
  setPlannedPages,
  structureStage,
}: SiteSectionsPanelProps) => {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const skeletonCardRef = useRef<HTMLDivElement | null>(null);
  const [skeletonCount, setSkeletonCount] = useState(5);
  const [deletedSection, setDeletedSection] = useState<{
    section: SiteSection;
    index: number;
  } | null>(null);
  const [deletedPage, setDeletedPage] = useState<{
    page: string;
    index: number;
  } | null>(null);

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
    const index = siteSections.findIndex((section) => section.id === sectionId);
    if (index < 0) return;
    setDeletedSection({ section: siteSections[index], index });
    setSiteSections(siteSections.filter((section) => section.id !== sectionId));
  };

  const undoDelete = () => {
    if (!deletedSection) return;
    setSiteSections((current) => {
      if (current.some((section) => section.id === deletedSection.section.id))
        return current;
      const restored = [...current];
      restored.splice(deletedSection.index, 0, deletedSection.section);
      return restored;
    });
    setDeletedSection(null);
  };

  const handleDeletePage = (page: string, index: number) => {
    setDeletedPage({ page, index });
    setPlannedPages((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const undoDeletePage = () => {
    if (!deletedPage) return;
    setPlannedPages((current) => {
      if (current.some((page) => page.toLowerCase() === deletedPage.page.toLowerCase())) return current;
      const restored = [...current];
      restored.splice(deletedPage.index, 0, deletedPage.page);
      return restored;
    });
    setDeletedPage(null);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-gray-200/80 bg-white shadow-[0_20px_55px_rgba(15,23,42,0.12)] dark:border-white/[0.09] dark:bg-[#202124] dark:shadow-[0_20px_55px_rgba(0,0,0,0.3)]">
      <div className="flex shrink-0 items-center space-x-3 border-b border-gray-200/80 bg-gray-50/70 px-5 py-5 animate-slideIn dark:border-white/[0.08] dark:bg-white/[0.015] sm:px-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient text-white sm:h-12 sm:w-12">
          <Layout className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-lg font-medium leading-6 text-neutral-950 dark:text-neutral-50">
            Site Structure
          </h3>
          {isProcessing && structureStage === "sections" ? (
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-500 border-t-transparent dark:border-neutral-400 dark:border-t-transparent"></div>
              <span className="text-sm font-medium text-gray-600 dark:text-neutral-400 animate-pulse">
                Generating homepage sections...
              </span>
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-neutral-400">
              {structureStage === "pages" ? "Review your suggested pages" : "Review your homepage sections"}
            </p>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        className="my-3 flex min-h-0 flex-1 items-start justify-center overflow-hidden px-6"
      >
        {structureStage === "pages" ? (
          <div className="h-full w-full space-y-3 overflow-y-auto pr-2">
            <p className="mb-4 text-sm leading-6 text-gray-600 dark:text-neutral-400">
              Suggested for your site type. Home is always included; your homepage preview is generated first.
            </p>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: reduceMotion ? 0 : 0.08 }}
              className="flex items-center gap-3 rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-white/[0.08] dark:bg-[#252527]"
            >
              <Home className="h-4 w-4 shrink-0 text-neutral-500" />
              <div className="min-w-0 flex-1">
                <h4 className="font-medium text-gray-800 dark:text-neutral-50">Home</h4>
                <p className="text-sm text-gray-600 dark:text-neutral-400">Your first page preview</p>
              </div>
              <span className="rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wide bg-neutral-200 text-neutral-700 dark:bg-white/[0.08] dark:text-neutral-300">Included</span>
            </motion.div>
            {plannedPages.map((page, index) => (
              <motion.div
                key={`${page.toLowerCase()}-${index}`}
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: reduceMotion ? 0 : Math.min(0.16 + index * 0.11, 0.6) }}
                className="group flex items-center gap-3 rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-white/[0.08] dark:bg-[#252527]"
              >
                <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-gray-800 dark:text-neutral-50">{page}</h4>
                  <p className="text-sm text-gray-600 dark:text-neutral-400">Planned site page</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeletePage(page, index)}
                  disabled={isProcessing}
                  aria-label={`Remove ${page} page`}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-100 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
            {plannedPages.length === 0 && (
              <div className="rounded-md border border-dashed border-gray-300 px-4 py-7 text-center text-sm text-gray-500 dark:border-white/[0.12] dark:text-neutral-400">
                Home is your only planned page. Ask the assistant to add another page when you need one.
              </div>
            )}
          </div>
        ) : isProcessing ? (
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
                          className="group relative flex items-center space-x-3 rounded-md border border-gray-200 bg-gray-50 p-4 transition-colors hover:bg-gray-100 dark:border-white/[0.08] dark:bg-[#252527] dark:hover:bg-[#303033]"
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
                                <span className="rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-neutral-200 text-neutral-700 dark:bg-white/[0.08] dark:text-neutral-300">
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
                            p-1.5 rounded-md hover:bg-red-100 text-gray-400 hover:text-red-500 dark:hover:bg-red-950/40 dark:hover:text-red-300
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
      {structureStage === "pages" && deletedPage && !isProcessing && (
        <div className="flex shrink-0 items-center justify-between border-t border-gray-200/80 px-5 py-3 text-sm dark:border-white/[0.08]">
          <span className="truncate text-neutral-600 dark:text-neutral-300">Removed {deletedPage.page}</span>
          <button type="button" onClick={undoDeletePage} className="ml-3 shrink-0 font-medium text-neutral-900 underline underline-offset-4 hover:text-neutral-600 dark:text-neutral-100 dark:hover:text-neutral-300">Undo</button>
        </div>
      )}
      {structureStage === "sections" && deletedSection && !isProcessing && (
        <div className="flex shrink-0 items-center justify-between border-t border-gray-200/80 px-5 py-3 text-sm dark:border-white/[0.08]">
          <span className="truncate text-neutral-600 dark:text-neutral-300">
            Removed {deletedSection.section.name}
          </span>
          <button
            type="button"
            onClick={undoDelete}
            className="ml-3 shrink-0 font-medium text-neutral-900 underline underline-offset-4 hover:text-neutral-600 dark:text-neutral-100 dark:hover:text-neutral-300"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
};
