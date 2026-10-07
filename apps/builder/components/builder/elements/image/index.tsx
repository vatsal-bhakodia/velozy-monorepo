import { useNode } from "@craftjs/core";
import ToolBar from "@/components/builder/toolbar";
import { ImageSettings } from "./settings";

export const Image = ({
  src,
  alt,
  style,
  className,
}: {
  src?: string;
  alt?: string;
  style?: React.CSSProperties;
  className?: string;
}) => {
  const {
    connectors: { connect, drag },
    props,
  } = useNode((node) => ({
    props: node.data.props,
  }));

  // Merge: direct function props take priority, then node props, then defaults
  const resolvedSrc =
    src || props.src || "https://placehold.co/600x400?text=No+Image";
  const resolvedAlt = alt || props.alt || "placeholder-image";
  const resolvedStyle = style || props.style;
  const resolvedClassName = className || props.className || "";

  return (
    <img
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      src={resolvedSrc}
      alt={resolvedAlt}
      style={resolvedStyle}
      className={resolvedClassName}
    />
  );
};

Image.craft = {
  displayName: "Image",
  props: {
    src: "",
    alt: "placeholder-image",
    className: "",
  },
  rules: {
    canDrag: () => true,
  },
  related: {
    toolbar: ToolBar,
  },
  // Use the new toolbarSections pattern
  toolbarSections: ["dimensions", "spacing"],
  customToolbarSections: [
    {
      key: "imageSettings",
      label: "Image Settings",
      icon: "ImageIcon",
      component: <ImageSettings />,
      priority: 1,
    },
  ],
};
