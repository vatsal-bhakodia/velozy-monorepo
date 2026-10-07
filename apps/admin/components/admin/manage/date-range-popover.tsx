"use client";

import { CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ToolbarButton } from "./toolbar-button";

export function DateRangePopover({
  from,
  to,
  label,
  onFromChange,
  onToChange,
  onClear,
}: {
  from: string;
  to: string;
  label: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <ToolbarButton icon={CalendarDays}>Date Range</ToolbarButton>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[255px] space-y-4 border-neutral-200 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
      >
        <p className="text-xs text-neutral-500 dark:text-neutral-400">Filter by {label}</p>
        <label className="block text-xs text-neutral-600 dark:text-neutral-400">
          From
          <Input
            className="mt-2 h-9"
            type="date"
            value={from}
            onChange={(event) => onFromChange(event.target.value)}
          />
        </label>
        <label className="block text-xs text-neutral-600 dark:text-neutral-400">
          To
          <Input
            className="mt-2 h-9"
            type="date"
            min={from || undefined}
            value={to}
            onChange={(event) => onToChange(event.target.value)}
          />
        </label>
        <Button variant="outline" size="sm" onClick={onClear}>Clear dates</Button>
      </PopoverContent>
    </Popover>
  );
}
