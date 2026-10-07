"use client";

import { apiFetch } from "@/src/lib/api";

import { useRef, useState } from "react";
import { ChevronDown, Download, FileDown, FileSpreadsheet, FileUp, Loader2 } from "lucide-react";
import { ToolbarButton } from "./toolbar-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

type CsvActionsProps = {
  endpoint: string;
  templateName: string;
  templateHeaders: string[];
  onImported?: () => void;
};

export default function CsvActions({
  endpoint,
  templateName,
  templateHeaders,
  onImported,
}: CsvActionsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const download = (url: string, fallbackName: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = fallbackName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const exportCsv = async () => {
    const response = await apiFetch(endpoint);
    if (!response.ok) {
      toast.error("Could not export CSV");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    download(url, `${templateName}-export.csv`);
    URL.revokeObjectURL(url);
  };

  const getTemplate = () => {
    const blob = new Blob(
      [`${templateHeaders.map((header) => `"${header}"`).join(",")}\r\n`],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    download(url, `${templateName}-template.csv`);
    URL.revokeObjectURL(url);
  };

  const importCsv = async (file: File) => {
    setImporting(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await apiFetch(endpoint, { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not import CSV");
      toast.success(
        `${result.imported} row${result.imported === 1 ? "" : "s"} imported${result.skipped ? `, ${result.skipped} skipped` : ""}`,
      );
      if (result.errors?.length)
        toast.warning(result.errors.slice(0, 2).join(" "));
      onImported?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not import CSV",
      );
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) =>
          event.target.files?.[0] && importCsv(event.target.files[0])
        }
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <ToolbarButton
            icon={FileSpreadsheet}
            trailingIcon={ChevronDown}
            disabled={importing}
          >
            CSV actions
          </ToolbarButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
        >
          <DropdownMenuItem
            disabled={importing}
            onSelect={() => inputRef.current?.click()}
          >
            {importing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="mr-2 h-4 w-4" />
            )}
            Import CSV
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={exportCsv}>
            <FileDown className="mr-2 h-4 w-4" /> Export CSV
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={getTemplate}>
            <Download className="mr-2 h-4 w-4" /> Get template
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
