"use client";

import { useNode } from "@craftjs/core";
import { SiteFooterView } from "@velozy/site-chrome";
import { useSiteChromeData } from "../site-chrome-data";

export function SiteFooter({ projectId = "" }: { projectId?: string }) {
  const { connectors: { connect } } = useNode();
  const { navigation, siteChrome, projectLogo } = useSiteChromeData(projectId);
  return (
    <SiteFooterView
      rootRef={(element) => { if (element) connect(element); }}
      navigation={navigation}
      chrome={siteChrome}
      projectLogo={projectLogo}
      disableNavigation
    />
  );
}

SiteFooter.craft = {
  displayName: "SiteFooter",
  props: { projectId: "" },
  rules: { canDrag: () => false },
  toolbarSections: [],
  customToolbarSections: [],
};
