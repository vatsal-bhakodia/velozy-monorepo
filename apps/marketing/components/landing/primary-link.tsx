import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type PrimaryLinkProps = {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
  size?: "default" | "large";
  variant?: "brand" | "white";
};

export function PrimaryLink({
  href,
  children,
  icon,
  className,
  size = "default",
  variant = "brand",
}: PrimaryLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center justify-center rounded-md font-semibold",
        variant === "white"
          ? "bg-white text-neutral-950 hover:bg-neutral-100"
          : "brand-gradient text-white",
        size === "large"
          ? "gap-3 px-6 py-3 text-base"
          : "gap-2 px-4 py-2 text-sm",
        className,
      )}
    >
      {children}
      {icon}
    </Link>
  );
}
