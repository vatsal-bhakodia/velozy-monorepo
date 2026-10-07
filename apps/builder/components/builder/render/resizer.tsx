import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";
import {
  Resizable,
  type ResizableProps,
  type ResizeCallback,
} from "re-resizable";
import { useNode } from "@craftjs/core";

interface ResizerProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  selected?: boolean;
  connect?: (ref: HTMLElement) => void;
  drag?: (ref: HTMLElement) => any;
}

const CompatibleResizable = Resizable as unknown as React.ComponentType<
  ResizableProps & { ref?: React.Ref<Resizable> }
>;

export const Resizer: React.FC<ResizerProps> = ({
  children,
  style = {},
  className,
  selected = false,
  connect,
  drag,
}) => {
  const elementRef = React.useRef<HTMLDivElement | null>(null);

  // When className is present (Tailwind-driven sizing), default to 'auto'
  // so CSS classes control the layout instead of forced inline width.
  const defaultWidth = className && !style.width ? "auto" : "100%";

  const [size, setSize] = useState({
    width: style.width || defaultWidth,
    height: style.height || "auto",
  });

  const { actions } = useNode();

  useEffect(() => {
    setSize({
      width: style.width || size.width,
      height: style.height || size.height,
    });
  }, [style.width, style.height]);

  useEffect(() => {
    if (elementRef.current && connect && drag) {
      connect(drag(elementRef.current));
    }
  }, [connect, drag]);

  function roundOffDimension(value: string): string {
    if (!value) return "";

    const numericPart = parseFloat(value);
    const rounded = numericPart.toFixed(2);
    const unit = value.replace(/[\d.\-]/g, "").trim();

    return `${rounded}${unit}`;
  }

  const handleResizeStop: ResizeCallback = (e, direction, ref, delta) => {
    let { width, height } = ref.style;

    width = roundOffDimension(width);
    height = roundOffDimension(height);

    if (width || height) {
      actions.setProp((props: any) => {
        if (!props.style) props.style = {};
        if (width) props.style.width = width;
        if (height) props.style.height = height;
      });
    }

    setSize({
      width: width || size.width,
      height: height || size.height,
    });
  };

  const handleDotStyle = {
    width: "10px",
    height: "10px",
    backgroundColor: "#ffffff",
    border: "2px solid #3b82f6",
    borderRadius: "50%",
    boxShadow:
      "0 2px 8px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(59, 130, 246, 0.1)",
    zIndex: 10,
    position: "absolute" as const,
  };

  return (
    <CompatibleResizable
      ref={(resizable) => {
        if (resizable?.resizable) {
          (
            elementRef as React.MutableRefObject<HTMLDivElement | null>
          ).current = resizable.resizable as HTMLDivElement;
        }
      }}
      size={size}
      onResizeStop={handleResizeStop}
      enable={{
        topLeft: selected,
        topRight: selected,
        bottomLeft: selected,
        bottomRight: selected,
      }}
      handleStyles={{
        topLeft: {
          ...handleDotStyle,
          cursor: "nw-resize",
          top: "0",
          left: "0",
          transform: "translate(-50%, -50%)",
        },
        topRight: {
          ...handleDotStyle,
          cursor: "ne-resize",
          top: "0",
          right: "0",
          transform: "translate(50%, -50%)",
        },
        bottomLeft: {
          ...handleDotStyle,
          cursor: "sw-resize",
          left: "0",
          bottom: "0",
          transform: "translate(-50%, 50%)",
        },
        bottomRight: {
          ...handleDotStyle,
          cursor: "se-resize",
          right: "0",
          bottom: "0",
          transform: "translate(50%, 50%)",
        },
      }}
      style={{
        ...style,
        position: "relative",
        width: undefined,
        height: undefined,
      }}
      className={cn(className ? "" : "min-h-[50px] min-w-[50px]", className)}
    >
      {children}
    </CompatibleResizable>
  );
};
