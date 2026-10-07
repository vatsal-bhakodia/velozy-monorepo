import React from "react";
import { useNode } from "@craftjs/core";

// toolbar
import ToolBar from "@/components/builder/toolbar";

type ContainerTag =
  | "div"
  | "section"
  | "article"
  | "header"
  | "footer"
  | "main"
  | "nav"
  | "aside";

export const Container = ({
  children,
  style = {},
  className,
  tag = "div",
}: React.PropsWithChildren<{
  style?: React.CSSProperties;
  className?: string;
  tag?: ContainerTag;
}>) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const Tag = tag;

  return (
    <Tag
      ref={(ref: HTMLElement | null) => {
        if (ref) connect(drag(ref));
      }}
      style={style}
      className={className}
    >
      {children}
    </Tag>
  );
};

Container.craft = {
  displayName: "Container",
  props: {
    tag: "div" as ContainerTag,
  },
  rules: {
    canDrag: () => true,
  },
  isCanvas: true,
  related: {
    toolbar: ToolBar,
  },
  toolbarSections: [
    "display",
    "alignment",
    "dimensions",
    "spacing",
    "typography",
    "colors",
  ],
  customToolbarSections: [],
};
