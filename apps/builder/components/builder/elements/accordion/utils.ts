import { AccordionItemType } from "./types";

export const generateAccordionId = () =>
  `accordion-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

export const getDefaultItems = (): AccordionItemType[] => [
  { id: generateAccordionId(), title: "Item 1", content: "Content for item 1" },
  { id: generateAccordionId(), title: "Item 2", content: "Content for item 2" },
];
