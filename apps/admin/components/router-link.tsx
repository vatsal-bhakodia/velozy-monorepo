import { Link as RouterLink } from "react-router-dom";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children?: ReactNode };

export default function Link({ href, children, ...props }: Props) {
  if (/^(https?:|mailto:|tel:)/.test(href)) return <a href={href} {...props}>{children}</a>;
  return <RouterLink to={href} {...props}>{children}</RouterLink>;
}
