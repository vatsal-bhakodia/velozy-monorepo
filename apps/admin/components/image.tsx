import type { ImgHTMLAttributes } from "react";

type ImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fill?: boolean;
  priority?: boolean;
  placeholder?: string;
  blurDataURL?: string;
  unoptimized?: boolean;
};

export default function Image({ fill, priority: _priority, placeholder: _placeholder, blurDataURL: _blurDataURL, unoptimized: _unoptimized, style, ...props }: ImageProps) {
  return <img {...props} style={fill ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...style } : style} />;
}
