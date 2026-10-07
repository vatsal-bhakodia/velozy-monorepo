export interface AccordionItemType {
  id: string;
  title: string;
  content: string;
}

export interface AccordionProps {
  items?: AccordionItemType[];
  collapsible?: boolean;
  className?: string;
  style?: React.CSSProperties;
}
