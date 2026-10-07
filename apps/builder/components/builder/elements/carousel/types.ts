import { ReactNode } from "react";

export interface SlideType {
  id: string;
  name: string;
  backgroundImage?: string;
  children?: ReactNode;
}

export interface SlidesToShowType {
  desktop: number;
  tablet: number;
  mobile: number;
}

export interface CarouselProps {
  slides: SlideType[];
  showArrows: boolean;
  showDots: boolean;
  autoplay: boolean;
  autoplaySpeed: number;
  slidesToShow: SlidesToShowType;
  style: React.CSSProperties;
}

export interface CarouselComponentProps {
  className?: string;
}
