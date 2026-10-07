"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Columns3, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DataTable, {
  type DataTableActions,
  type DataTableBulkAction,
  type DataTableColumn,
  type DataTableEmptyState,
  type DataTableSelection,
} from "./table";
import { AdminToolbar } from "./admin-toolbar";
import { DateRangePopover } from "./date-range-popover";
import { FilterPopover, type FilterField } from "./filter-popover";
import { ToolbarButton } from "./toolbar-button";

export type RecordFilter<T> = Omit<FilterField, "key"> & { key: keyof T };

type RecordTableProps<T extends { id: string | number }> = {
  title: string;
  description?: string;
  data: T[];
  columns: DataTableColumn<T>[];
  loading?: boolean;
  leadingActions?: ReactNode;
  manualSorting?: boolean;
  serverPagination?: {
    currentPage: number;
    itemsPerPage: number;
    totalItems: number;
    onPageChange: (page: number) => void;
  };
  headerAside?: ReactNode;
  headerActions?: ReactNode;
  trailingActions?: ReactNode;
  subNavigation?: ReactNode;
  aboveTable?: ReactNode;
  primaryAction?: { label: string; onClick: () => void };
  filters?: RecordFilter<T>[];
  dateRange?: keyof T;
  dateRangeLabel?: string;
  exportName?: string;
  actions?: DataTableActions<T>;
  selection?: DataTableSelection<T>;
  bulkActions?: DataTableBulkAction<T>[];
  emptyState?: DataTableEmptyState;
  /** Render inside an existing page frame without full-page margins or padding. */
  contained?: boolean;
};

function asFilterText(value: unknown) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function csvCell(value: unknown) {
  let text = asFilterText(value);
  if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export default function RecordTable<T extends { id: string | number }>({
  title,
  description,
  data,
  columns,
  loading = false,
  leadingActions,
  manualSorting = false,
  serverPagination,
  headerAside,
  headerActions,
  trailingActions,
  subNavigation,
  aboveTable,
  primaryAction,
  filters = [],
  dateRange,
  dateRangeLabel = "Created At",
  exportName,
  actions,
  selection,
  bulkActions,
  emptyState,
  contained = false,
}: RecordTableProps<T>) {
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>(
    {},
  );
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [actionsVisible, setActionsVisible] = useState(true);
  const [visibleKeys, setVisibleKeys] = useState<string[]>(() =>
    columns.map((column) => String(column.accessor)),
  );

  const filteredData = useMemo(
    () =>
      data.filter((item) => {
        const matchesFields = filters.every((filter) => {
          const query = (appliedFilters[String(filter.key)] || "")
            .trim()
            .toLowerCase();
          if (!query) return true;
          const value = asFilterText(item[filter.key]);
          return filter.type === "select"
            ? value.toLowerCase() === query
            : value.toLowerCase().includes(query);
        });
        if (!matchesFields || !dateRange) return matchesFields;
        const timestamp = new Date(
          item[dateRange] as string | number | Date,
        ).getTime();
        const afterFrom =
          !fromDate || timestamp >= new Date(`${fromDate}T00:00:00`).getTime();
        const beforeTo =
          !toDate || timestamp <= new Date(`${toDate}T23:59:59.999`).getTime();
        return afterFrom && beforeTo;
      }),
    [appliedFilters, data, dateRange, filters, fromDate, toDate],
  );

  useEffect(() => setPage(1), [appliedFilters, fromDate, pageSize, toDate]);

  const pageCount = Math.max(1, Math.ceil(filteredData.length / pageSize));
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const visibleColumns = columns.filter((column) =>
    visibleKeys.includes(String(column.accessor)),
  );

  const toggleColumn = (key: string, checked: boolean) => {
    setVisibleKeys((current) => {
      if (checked) return current.includes(key) ? current : [...current, key];
      if (current.length <= 1) return current;
      return current.filter((item) => item !== key);
    });
  };

  const exportCsv = () => {
    if (filteredData.length === 0) return;
    const rows = [
      visibleColumns.map((column) => column.header),
      ...filteredData.map((item) =>
        visibleColumns.map((column) => item[column.accessor]),
      ),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${exportName || "records"}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    toast.success("Export downloaded");
  };

  return (
    <section className={contained ? "min-w-0 text-neutral-900 dark:text-[#f0f0f0]" : "-m-4 min-h-[calc(100vh-48px)] bg-white text-neutral-900 dark:bg-[#111111] dark:text-[#f0f0f0]"}>
      <div className={contained ? "w-full pb-2" : "mx-auto w-full max-w-[1600px] px-5 pb-5 pt-5 sm:px-8 lg:px-12"}>
        <header className={`mb-6 flex flex-col justify-between gap-4 sm:flex-row ${headerAside ? "sm:items-center" : "sm:items-start"}`}>
          <div>
            <h1 className="text-[18px] font-medium leading-6">{title}</h1>
            {description && (
              <p className="mt-1.5 max-w-2xl text-sm text-neutral-500 dark:text-neutral-400">
                {description}
              </p>
            )}
          </div>
          {headerAside && <div className="shrink-0">{headerAside}</div>}
        </header>

        {subNavigation && <div className="mb-5">{subNavigation}</div>}
        {aboveTable}

        <AdminToolbar
          leading={
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <ToolbarButton icon={Columns3}>Edit Columns</ToolbarButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  {columns.map((column) => {
                    const key = String(column.accessor);
                    return (
                      <DropdownMenuCheckboxItem
                        key={key}
                        checked={visibleKeys.includes(key)}
                        onCheckedChange={(checked) =>
                          toggleColumn(key, checked === true)
                        }
                        onSelect={(event) => event.preventDefault()}
                      >
                        {column.header}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
                  {actions && (actions.primary || actions.menu.length > 0) && (
                    <DropdownMenuCheckboxItem
                      checked={actionsVisible}
                      onCheckedChange={(checked) =>
                        setActionsVisible(checked === true)
                      }
                      onSelect={(event) => event.preventDefault()}
                    >
                      {actions.header || "Actions"}
                    </DropdownMenuCheckboxItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              {leadingActions}
            </>
          }
          actions={
            <>
              {filters.length > 0 && (
                <FilterPopover
                  filters={filters.map((filter) => ({
                    ...filter,
                    key: String(filter.key),
                  }))}
                  value={appliedFilters}
                  onApply={(next) => setAppliedFilters(next)}
                  onClear={() => setAppliedFilters({})}
                />
              )}

              {dateRange && (
                <DateRangePopover
                  from={fromDate}
                  to={toDate}
                  label={dateRangeLabel}
                  onFromChange={setFromDate}
                  onToChange={setToDate}
                  onClear={() => {
                    setFromDate("");
                    setToDate("");
                  }}
                />
              )}

              {exportName && (
                <ToolbarButton
                  icon={Download}
                  onClick={exportCsv}
                  disabled={loading || filteredData.length === 0}
                >
                  Export
                </ToolbarButton>
              )}
              {headerActions && (
                <div className="flex flex-wrap items-center gap-2">
                  {headerActions}
                </div>
              )}
              {trailingActions}
              {primaryAction && (
                <Button onClick={primaryAction.onClick} className="h-9">
                  {primaryAction.label}
                </Button>
              )}
            </>
          }
        />

        <DataTable<T>
          data={filteredData}
          columns={visibleColumns}
          loading={loading}
          emptyState={emptyState}
          actions={actionsVisible ? actions : undefined}
          selection={selection}
          bulkActions={bulkActions}
          manualSorting={manualSorting}
          pagination={
            serverPagination
              ? {
                  enabled: true,
                  manual: true,
                  currentPage: serverPagination.currentPage,
                  itemsPerPage: serverPagination.itemsPerPage,
                  totalItems: serverPagination.totalItems,
                  onPageChange: serverPagination.onPageChange,
                }
              : {
                  enabled: true,
                  currentPage: page,
                  itemsPerPage: pageSize,
                  onPageChange: setPage,
                  onItemsPerPageChange: setPageSize,
                }
          }
        />
      </div>
    </section>
  );
}
