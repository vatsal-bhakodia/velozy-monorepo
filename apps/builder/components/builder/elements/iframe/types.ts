export interface IframeProps {
  src?: string;
  allowFullScreen?: boolean;
  loading?: "eager" | "lazy";
  isEditorEnabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}
