import React from "react";
import { useNode } from "@craftjs/core";
import { CarouselProps, SlideType } from "./types";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Plus, Trash2 } from "lucide-react";
import { generateUniqueId } from "./utils";

export const CarouselSettings = () => {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({
    props: node.data.props as CarouselProps,
  }));

  return (
    <div className="space-y-4">
      {/* Slides Settings */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Slides
        </label>
        {props.slides.length > 0 && (
          <Accordion type="multiple" className="w-full space-y-2">
            {props.slides.map((slide: SlideType, index: number) => (
              <AccordionItem
                key={slide.id}
                value={`slide-${index}`}
                className="border border-neutral-200 dark:border-neutral-700 rounded-md"
              >
                <AccordionTrigger className="px-4 py-2 text-sm text-neutral-800 dark:text-neutral-200 w-full">
                  <div className="flex items-center justify-between w-full mr-3">
                    <span>{slide.name || `Slide ${index + 1}`}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setProp((props: CarouselProps) => {
                          props.slides = props.slides.filter(
                            (_: SlideType, i: number) => i !== index,
                          );
                        });
                      }}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 space-y-4 bg-neutral-900 rounded-b-md">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      Slide Name
                    </label>
                    <input
                      type="text"
                      value={slide.name || ""}
                      onChange={(e) => {
                        setProp((props: CarouselProps) => {
                          props.slides[index].name = e.target.value;
                        });
                      }}
                      className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-white"
                      placeholder="Slide name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      Background Image URL
                    </label>
                    <input
                      type="text"
                      value={slide.backgroundImage || ""}
                      onChange={(e) => {
                        setProp((props: CarouselProps) => {
                          props.slides[index].backgroundImage = e.target.value;
                        });
                      }}
                      className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-white"
                      placeholder="Enter image URL"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
        <button
          onClick={() => {
            setProp((props: CarouselProps) => {
              const newSlideId = generateUniqueId();
              props.slides = [
                ...props.slides,
                {
                  id: newSlideId,
                  name: `Slide ${props.slides.length + 1}`,
                  backgroundImage: "",
                },
              ];
            });
          }}
          className="w-full px-3 py-2 text-sm bg-blue-600 rounded-md text-neutral-900 dark:text-white flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Slide
        </button>
      </div>

      {/* Navigation Settings */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Navigation
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showArrows"
            checked={props.showArrows}
            onChange={(e) => {
              setProp((props: CarouselProps) => {
                props.showArrows = e.target.checked;
              });
            }}
            className="rounded border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-blue-600"
          />
          <label
            htmlFor="showArrows"
            className="text-sm text-neutral-800 dark:text-neutral-200"
          >
            Show Arrows
          </label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showDots"
            checked={props.showDots}
            onChange={(e) => {
              setProp((props: CarouselProps) => {
                props.showDots = e.target.checked;
              });
            }}
            className="rounded border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-blue-600"
          />
          <label
            htmlFor="showDots"
            className="text-sm text-neutral-800 dark:text-neutral-200"
          >
            Show Dots
          </label>
        </div>
      </div>

      {/* Autoplay Settings */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Autoplay
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="autoplay"
            checked={props.autoplay}
            onChange={(e) => {
              setProp((props: CarouselProps) => {
                props.autoplay = e.target.checked;
              });
            }}
            className="rounded border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-blue-600"
          />
          <label
            htmlFor="autoplay"
            className="text-sm text-neutral-800 dark:text-neutral-200"
          >
            Enable Autoplay
          </label>
        </div>
        {props.autoplay && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
              Autoplay Speed (ms)
            </label>
            <input
              type="number"
              value={props.autoplaySpeed}
              onChange={(e) => {
                setProp((props: CarouselProps) => {
                  props.autoplaySpeed = parseInt(e.target.value);
                });
              }}
              className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-white"
              min="1000"
              step="500"
            />
          </div>
        )}
      </div>

      {/* Responsive Settings */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Responsive
        </h3>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Desktop Slides (≥1024px)
          </label>
          <input
            type="number"
            value={props.slidesToShow.desktop}
            onChange={(e) => {
              setProp((props: CarouselProps) => {
                props.slidesToShow.desktop = parseInt(e.target.value);
              });
            }}
            className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-white"
            min="1"
            max={props.slides.length}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Tablet Slides (≥768px)
          </label>
          <input
            type="number"
            value={props.slidesToShow.tablet}
            onChange={(e) => {
              setProp((props: CarouselProps) => {
                props.slidesToShow.tablet = parseInt(e.target.value);
              });
            }}
            className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-white"
            min="1"
            max={props.slides.length}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Mobile Slides ({"<768px"})
          </label>
          <input
            type="number"
            value={props.slidesToShow.mobile}
            onChange={(e) => {
              setProp((props: CarouselProps) => {
                props.slidesToShow.mobile = parseInt(e.target.value);
              });
            }}
            className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-white"
            min="1"
            max={props.slides.length}
          />
        </div>
      </div>
    </div>
  );
};
