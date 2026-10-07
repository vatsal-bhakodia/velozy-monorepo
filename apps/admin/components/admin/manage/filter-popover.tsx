"use client";

import { useState } from "react";
import { Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ToolbarButton } from "./toolbar-button";

export type FilterField = {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "select";
  options?: Array<{ label: string; value: string }>;
};

export function FilterPopover({
  filters,
  value,
  onApply,
  onClear,
}: {
  filters: FilterField[];
  value: Record<string, string>;
  onApply: (value: Record<string, string>) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const update = (key: string, nextValue: string) =>
    setDraft((current) => ({ ...current, [key]: nextValue }));

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) setDraft(value);
      }}
    >
      <PopoverTrigger asChild>
        <ToolbarButton icon={Filter}>Filters</ToolbarButton>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[255px] space-y-3 rounded-lg border border-neutral-200 bg-white p-3 text-neutral-900 shadow-xl dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
      >
        <p className="border-b border-neutral-200 pb-2 text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          Filter by:
        </p>
        {filters.map((field) => (
          <label className="block text-xs text-neutral-600 dark:text-neutral-400" key={field.key}>
            {field.label}
            {field.type === "select" ? (
              <Select
                value={draft[field.key] || undefined}
                onValueChange={(nextValue) => update(field.key, nextValue)}
              >
                <SelectTrigger className="mt-1.5 h-8 bg-white px-3 text-xs dark:bg-neutral-700">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                className="mt-1.5 h-8 rounded-lg px-3 py-2 text-xs"
                value={draft[field.key] || ""}
                onChange={(event) => update(field.key, event.target.value)}
                placeholder={field.placeholder || `Search by ${field.label.toLowerCase()}...`}
              />
            )}
          </label>
        ))}
        <div className="flex items-center justify-between pt-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setDraft({});
              onClear();
              setOpen(false);
            }}
          >
            Clear
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onApply(draft);
              setOpen(false);
            }}
          >
            Filter
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
