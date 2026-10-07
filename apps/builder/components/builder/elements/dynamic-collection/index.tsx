import React from "react";
import { useNode } from "@craftjs/core";
import { Database } from "lucide-react";
import ToolBar from "@/components/builder/toolbar";
import {
  DynamicCollection as DynamicCollectionView,
  DynamicCollectionProps,
} from "@/components/dynamic-collection";
import { DynamicCollectionSettings } from "./settings";

export const DynamicCollection = (props: DynamicCollectionProps) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  return (
    <div
      ref={(ref: HTMLDivElement | null) => {
        if (ref) {
          connect(drag(ref));
        }
      }}
      className="w-full"
    >
      <DynamicCollectionView {...props} />
    </div>
  );
};

DynamicCollection.craft = {
  displayName: "DynamicCollection",
  props: {
    projectId: "",
    source: "products",
    heading: "Dynamic Collection",
    description: "This section is populated from your published content.",
    limit: 6,
    columns: 3,
    featuredOnly: false,
    apiBaseUrl: "",
    sectionClassName:
      "w-full px-6 py-20 md:px-10 lg:px-16 bg-background text-foreground",
    headerClassName: "",
    headingClassName:
      "font-heading text-4xl md:text-5xl font-semibold tracking-tight text-foreground",
    descriptionClassName:
      "mt-4 max-w-2xl text-base md:text-lg text-muted-foreground",
    itemsContainerClassName: "mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3",
    emptyStateText: "No content has been published for this section yet.",
    itemTemplateHtml: "",
  },
  custom: {
    importPath: "@/components/dynamic-collection",
  },
  related: {
    toolbar: ToolBar,
  },
  toolbarSections: [],
  customToolbarSections: [
    {
      key: "dynamicCollectionSettings",
      label: "Dynamic Collection",
      icon: Database,
      component: <DynamicCollectionSettings />,
      priority: 1,
    },
  ],
};

export default DynamicCollection;
