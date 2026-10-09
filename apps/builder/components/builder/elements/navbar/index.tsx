"use client";

import { useNode } from "@craftjs/core";
import ToolBar from "@/components/builder/toolbar";
import { SiteNavbarView } from "@velozy/site-chrome";
import { NavbarSettings } from "./settings";
import { useSiteChromeData } from "../site-chrome-data";

type NavbarProps = { projectId?: string; className?: string };

export function Navbar({ projectId = "", className = "" }: NavbarProps) {
  const { connectors: { connect } } = useNode();
  const { navigation, siteChrome, projectLogo } = useSiteChromeData(projectId);
  return (
    <SiteNavbarView
      rootRef={(element) => { if (element) connect(element); }}
      navigation={navigation}
      chrome={siteChrome}
      projectLogo={projectLogo}
      className={className}
      disableNavigation
    />
  );
}

Navbar.craft = {
  displayName: "Navbar",
  props: { projectId: "" },
  rules: { canDrag: () => false },
  related: { toolbar: ToolBar },
  toolbarSections: [],
  customToolbarSections: [{
    key: "navbarSettings",
    label: "Navbar items",
    icon: "Menu",
    component: <NavbarSettings />,
    priority: 1,
  }],
};
