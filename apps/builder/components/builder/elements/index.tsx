"use client";

import { Container } from "./container";
import { Image } from "./image";
import { Text } from "./text";
import { Button } from "./button";
import { Carousel } from "./carousel";
import { Form } from "./form";
import { List } from "./list";
import { Accordion } from "./accordion";
import { Icon } from "./icon";
import { Iframe } from "./iframe";
import { DynamicCollection } from "./dynamic-collection";
import { Navbar } from "./navbar";
import { SiteFooter } from "./site-footer";
import { AiLoadingSection } from "./ai-loading-section";
import {
  Type,
  RectangleHorizontal,
  Layout,
  Image as LucideImage,
  GalleryHorizontal,
  SquarePen,
  List as ListIcon,
  ListCollapse as AccordionIcon,
  Smile,
  AppWindowIcon,
  Database,
} from "lucide-react";

export const BuilderElements = {
  Text,
  Button,
  Image,
  Container,
  Carousel,
  Form,
  List,
  Accordion,
  Icon,
  Iframe,
  DynamicCollection,
  Navbar,
  SiteFooter,
  AiLoadingSection,
};

export const ELEMENTS = [
  {
    icon: <Type className="h-4 w-4" />,
    label: "Text",
    component: <Text text="Text block" />,
  },
  {
    icon: <LucideImage className="h-4 w-4" />,
    label: "Image",
    component: <Image />,
  },
  {
    icon: <RectangleHorizontal className="h-4 w-4" />,
    label: "Button",
    component: <Button text="Button" />,
  },
  {
    icon: <Layout className="h-4 w-4" />,
    label: "Container",
    component: <Container />,
  },
  {
    icon: <GalleryHorizontal className="h-4 w-4" />,
    label: "Carousel",
    component: <Carousel />,
  },
  {
    icon: <SquarePen className="h-4 w-4" />,
    label: "Form",
    component: <Form />,
  },
  {
    icon: <ListIcon className="h-4 w-4" />,
    label: "List",
    component: <List />,
  },
  {
    icon: <AccordionIcon className="h-4 w-4" />,
    label: "Accordion",
    component: <Accordion />,
  },
  {
    icon: <Smile className="h-4 w-4" />,
    label: "Icon",
    component: <Icon />,
  },
  {
    icon: <AppWindowIcon className="h-4 w-4" />,
    label: "Iframe",
    component: <Iframe />,
  },
  {
    icon: <Database className="h-4 w-4" />,
    label: "Collection",
    component: <DynamicCollection projectId="" source="products" />,
  },
];
