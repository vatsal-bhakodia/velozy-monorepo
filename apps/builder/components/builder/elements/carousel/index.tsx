import React, { useState, useEffect, useRef } from "react";
import { useNode, Element } from "@craftjs/core";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Container } from "../container";
import { cn } from "@/lib/utils";
import { CarouselProps, CarouselComponentProps } from "./types";
import { CarouselSettings } from "./settings";
import ToolBar from "@/components/builder/toolbar";
import { GalleryHorizontal } from "lucide-react";
import { BuilderElements } from "../index";

// Helper function to render component objects as Craft.js Elements
const renderComponent = (component: any, index: number) => {
  if (!component || typeof component !== "object") {
    return null;
  }

  // If it's already a React element, return it as is
  if (React.isValidElement(component)) {
    return component;
  }

  // If it's a component object with type and props, render it as an Element
  if (component.type && component.props) {
    const { children, ...otherProps } = component.props;

    // Get the actual component from BuilderElements registry
    const ComponentType =
      BuilderElements[component.type as keyof typeof BuilderElements];

    if (!ComponentType) {
      console.warn(
        `Component type "${component.type}" not found in BuilderElements registry`,
      );
      return null;
    }

    return (
      <Element key={`component-${index}`} is={ComponentType} {...otherProps}>
        {children && Array.isArray(children)
          ? children.map((child, childIndex) =>
              renderComponent(child, childIndex),
            )
          : children}
      </Element>
    );
  }

  return null;
};

export const Carousel = ({ className }: CarouselComponentProps) => {
  const {
    connectors: { connect, drag },
    props,
  } = useNode((node) => ({
    props: node.data.props as CarouselProps,
  }));

  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [slidesToShow, setSlidesToShow] = useState<number>(
    props.slidesToShow.desktop,
  );
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 1024) {
        setSlidesToShow(props.slidesToShow.desktop);
      } else if (width >= 768) {
        setSlidesToShow(props.slidesToShow.tablet);
      } else {
        setSlidesToShow(props.slidesToShow.mobile);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [props.slidesToShow]);

  // Handle autoplay
  useEffect(() => {
    if (props.autoplay) {
      autoplayTimerRef.current = setInterval(() => {
        goToNextSlide();
      }, props.autoplaySpeed);
    }

    return () => {
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
      }
    };
  }, [props.autoplay, props.autoplaySpeed, currentSlide, props.slides.length]);

  const goToPrevSlide = () => {
    setCurrentSlide((prev) =>
      prev === 0 ? Math.max(0, props.slides.length - slidesToShow) : prev - 1,
    );
  };

  const goToNextSlide = () => {
    setCurrentSlide((prev) =>
      prev >= props.slides.length - slidesToShow ? 0 : prev + 1,
    );
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  // Reset current slide when slides change
  useEffect(() => {
    if (currentSlide >= props.slides.length) {
      setCurrentSlide(0);
    }
  }, [props.slides, currentSlide]);

  if (props.slides.length === 0) {
    return (
      <div
        ref={(ref) => {
          if (ref) connect(drag(ref));
        }}
        className="border-2 border-dashed border-gray-300 bg-gray-100 p-4 text-center text-gray-500 rounded-md min-h-32 flex items-center justify-center"
      >
        No slides added. Configure carousel in settings.
      </div>
    );
  }

  const carouselStyle = {
    ...props.style,
    height: props.style?.height ?? "auto",
  };

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn("relative w-full min-h-64 overflow-hidden", className)}
      style={carouselStyle}
    >
      <div
        className="flex transition-transform duration-300 gap-4"
        style={{
          transform: `translateX(-${currentSlide * (100 / slidesToShow)}%)`,
        }}
      >
        {props.slides.map((slide) => (
          <div
            key={slide.id}
            className="flex-shrink-0"
            style={{
              width: `${100 / slidesToShow}%`,
            }}
          >
            <div
              className="slide-background-wrapper relative w-full"
              style={{
                backgroundImage: slide.backgroundImage
                  ? `url(${slide.backgroundImage})`
                  : "none",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
            >
              <Element
                id={`carousel-slide-${slide.id}`}
                is={Container}
                canvas
                style={{ width: "100%", position: "relative", zIndex: 1 }}
              >
                {/* Fixed: Properly render component objects */}
                {slide.children && Array.isArray(slide.children)
                  ? slide.children.map((child, index) =>
                      renderComponent(child, index),
                    )
                  : slide.children && typeof slide.children === "object"
                    ? renderComponent(slide.children, 0)
                    : slide.children}
              </Element>
            </div>
          </div>
        ))}
      </div>

      {/* Arrow Navigation */}
      {props.showArrows && props.slides.length > slidesToShow && (
        <>
          <button
            onClick={goToPrevSlide}
            className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-2 text-gray-800 hover:bg-opacity-100 z-10"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={goToNextSlide}
            className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-2 text-gray-800 hover:bg-opacity-100 z-10"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Dot Navigation */}
      {props.showDots && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
          {Array.from({
            length: Math.ceil(props.slides.length - slidesToShow + 1),
          }).map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full ${
                currentSlide === index
                  ? "bg-primary-600"
                  : "bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

Carousel.craft = {
  displayName: "Carousel",
  props: {
    slides: [
      { id: "slide-1", name: "Slide 1", backgroundImage: "" },
      { id: "slide-2", name: "Slide 2", backgroundImage: "" },
      { id: "slide-3", name: "Slide 3", backgroundImage: "" },
    ],
    showArrows: true,
    showDots: true,
    autoplay: false,
    autoplaySpeed: 3000,
    slidesToShow: {
      desktop: 1,
      tablet: 1,
      mobile: 1,
    },
    style: {
      width: "100%",
    },
  },
  rules: {
    canDrag: () => true,
  },
  isCanvas: true,
  related: {
    toolbar: ToolBar,
  },
  toolbarSections: ["dimensions"],
  customToolbarSections: [
    {
      key: "carouselSettings",
      label: "Carousel Settings",
      icon: GalleryHorizontal,
      component: <CarouselSettings />,
      priority: 1,
    },
  ],
};
