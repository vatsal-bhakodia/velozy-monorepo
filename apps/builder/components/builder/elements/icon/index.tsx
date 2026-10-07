import { useNode } from "@craftjs/core";
import ToolBar from "@/components/builder/toolbar";
import { IconSettings } from "./settings";
import * as LucideIcons from "lucide-react";

export const Icon = ({
  style = {},
  className = "",
}: {
  style?: React.CSSProperties;
  className?: string;
}) => {
  const {
    connectors: { connect, drag },
    props,
  } = useNode((node) => ({
    props: node.data.props,
  }));

  // Get the icon component from Lucide with fallback
  const IconComponent =
    (LucideIcons as any)[props.iconName] || LucideIcons.Square;

  return (
    <IconComponent
      size={props.size}
      strokeWidth={props.strokeWidth}
      ref={(ref: SVGSVGElement | null) => {
        if (ref) connect(drag(ref as unknown as HTMLElement));
      }}
      style={{
        ...style,
      }}
      className={className}
    />
  );
};

Icon.craft = {
  displayName: "Icon",
  props: {
    iconName: "Smile",
    size: 24,
    strokeWidth: 2,
  },
  rules: {
    canDrag: () => true,
  },
  related: {
    toolbar: ToolBar,
  },
  toolbarSections: ["colors"],
  customToolbarSections: [
    {
      key: "iconSettings",
      label: "Icon Settings",
      icon: "Settings",
      component: <IconSettings />,
      priority: 1,
    },
  ],
};
