import * as React from "react";

import { cn } from "@/src/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "toolbar";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = "default", ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-500 focus-visible:border-cyan-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/30 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-400 dark:focus-visible:border-cyan-400 dark:focus-visible:ring-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-50",
          variant === "toolbar" &&
            "h-9 border-0 bg-neutral-100 text-neutral-800 placeholder:text-neutral-500 focus-visible:border-0 focus-visible:ring-cyan-600/30 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-400 dark:focus-visible:border-0 dark:focus-visible:ring-cyan-400/40",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
