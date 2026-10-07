"use client";

import { createContext, useContext, useMemo } from "react";
import { Check, ChevronDown, Monitor, Smartphone, Tablet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type ResponsiveDevice = "desktop" | "tablet" | "mobile";

const DEVICES = [
  { value: "desktop" as const, label: "Desktop", icon: Monitor, prefix: "" },
  {
    value: "tablet" as const,
    label: "Tablet",
    icon: Tablet,
    prefix: "max-lg:",
  },
  {
    value: "mobile" as const,
    label: "Mobile",
    icon: Smartphone,
    prefix: "max-md:",
  },
];

const ResponsiveContext = createContext<{
  device: ResponsiveDevice;
  prefix: string;
  setDevice: (device: ResponsiveDevice) => void;
}>({ device: "desktop", prefix: "", setDevice: () => undefined });

export const prefixClass = (value: string, prefix: string) =>
  value ? `${prefix}${value}` : value;
const isResponsiveClass = (item: string) =>
  /^(sm|md|lg|xl|2xl|max-sm|max-md|max-lg|max-xl|max-2xl):/.test(item);

export const classesAtBreakpoint = (className: string, prefix: string) =>
  className
    .split(/\s+/)
    .filter(Boolean)
    .filter((item) =>
      prefix ? item.startsWith(prefix) : !isResponsiveClass(item),
    )
    .map((item) => (prefix ? item.slice(prefix.length) : item));

export const replaceBreakpointClasses = (
  className: string,
  prefix: string,
  shouldRemove: (value: string) => boolean,
  additions: string[],
) => {
  const kept = className
    .split(/\s+/)
    .filter(Boolean)
    .filter((item) => {
      const atBreakpoint = prefix
        ? item.startsWith(prefix)
        : !isResponsiveClass(item);
      const raw = prefix && atBreakpoint ? item.slice(prefix.length) : item;
      return !(atBreakpoint && shouldRemove(raw));
    });
  return [
    ...kept,
    ...additions.filter(Boolean).map((item) => prefixClass(item, prefix)),
  ].join(" ");
};

export function useResponsiveToolbar() {
  return useContext(ResponsiveContext);
}

export function ResponsiveToolbarProvider({
  device,
  setDevice,
  children,
}: {
  device: ResponsiveDevice;
  setDevice: (device: ResponsiveDevice) => void;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({
      device,
      prefix: DEVICES.find((item) => item.value === device)?.prefix || "",
      setDevice,
    }),
    [device, setDevice],
  );
  return (
    <ResponsiveContext.Provider value={value}>
      {children}
    </ResponsiveContext.Provider>
  );
}

export function ResponsiveDeviceButton({ className }: { className?: string }) {
  const { device, setDevice } = useResponsiveToolbar();
  const current = DEVICES.find((item) => item.value === device) || DEVICES[0];
  const CurrentIcon = current.icon;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(event) => event.stopPropagation()}
          className={cn(
            "h-6 gap-1 rounded-md px-1.5 text-neutral-400 hover:bg-cyan-500/10 hover:text-cyan-600 dark:hover:text-cyan-300",
            device !== "desktop" &&
              "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
            className,
          )}
          title={`Responsive setting: ${current.label}`}
          aria-label={`Edit this setting for ${current.label}`}
        >
          <CurrentIcon className="h-3.5 w-3.5" />
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-36"
        onClick={(event) => event.stopPropagation()}
      >
        {DEVICES.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onSelect={() => setDevice(value)}
            className="gap-2 text-xs"
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="flex-1">{label}</span>
            {device === value && (
              <Check className="h-3.5 w-3.5 text-cyan-500" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ResponsiveLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <span>{children}</span>
      <ResponsiveDeviceButton />
    </div>
  );
}
