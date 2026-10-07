import React, { useState, ReactNode } from "react";
import {
  FileText,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ArrowDown,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUp,
  ArrowUpDown,
  MoveLeft,
  MoveRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

// --- Types ---
export interface DataTableColumn<T> {
  header: string;
  accessor: keyof T;
  render?: (item: T) => ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
  className?: string;
  cellClassName?: string;
}

export interface DataTableAction<T> {
  icon?: React.ComponentType<{ className?: string }>;
  label?: string;
  onClick?: (item: T) => void;
  className?: string;
  separator?: boolean;
  disabled?: (item: T) => boolean;
}

export interface DataTableEmptyState {
  icon: React.ComponentType<{ className?: string }>;
  message: string;
  description?: string;
}

export interface DataTableSelection<T> {
  enabled: boolean;
  selectedItems: Set<string | number>;
  setSelectedItems: (items: Set<string | number>) => void;
}

export interface DataTableActions<T> {
  primary?: {
    icon?: React.ComponentType<{ className?: string }>;
    label?: string;
    disabled?: (item: T) => boolean;
    title?: (item: T) => string;
    onClick: (item: T) => void;
  };
  menu: DataTableAction<T>[];
  header?: string;
}

export interface DataTableBulkAction<T> {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  /**
   * Called with the currently selected items and a helper to clear the selection.
   */
  onClick: (
    selectedItems: T[],
    clearSelection: () => void,
  ) => void | Promise<void>;
  variant?: "default" | "outline" | "destructive";
}

export interface DataTablePagination {
  enabled: boolean;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  manual?: boolean;
  totalItems?: number;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  loading?: boolean;
  emptyState?: DataTableEmptyState;
  selection?: DataTableSelection<T>;
  actions?: DataTableActions<T>;
  pagination?: DataTablePagination;
  /**
   * Optional bulk actions configuration. Actions will be shown when selection is enabled
   * and at least one row is selected.
   */
  bulkActions?: DataTableBulkAction<T>[];
  /**
   * Optional search term applied on the client.
   * If provided, it will be matched (case-insensitive) against all searchable columns.
   */
  searchTerm?: string;
  /**
   * Optional list of columns to include in the search.
   * If not provided, all columns' accessors will be searched.
   */
  searchableColumns?: (keyof T)[];
  /**
   * Optional custom filter function for advanced use‑cases.
   * If provided, it will be used instead of the default text search.
   */
  customFilter?: (item: T, searchTerm: string) => boolean;
  /** Disable local sorting when rows are already sorted by the server. */
  manualSorting?: boolean;
}

// --- Component ---
const DataTable = <T extends { id: string | number }>({
  data = [],
  columns = [],
  loading = false,
  emptyState = {
    icon: FileText,
    message: "No data found",
    description: undefined,
  },
  selection = {
    enabled: false,
    selectedItems: new Set(),
    setSelectedItems: () => {},
  },
  actions = {
    primary: undefined,
    menu: [],
  },
  pagination = {
    enabled: true,
    currentPage: 1,
    itemsPerPage: 10,
    onPageChange: () => {},
  },
  bulkActions = [],
  searchTerm,
  searchableColumns,
  customFilter,
  manualSorting = false,
}: DataTableProps<T>) => {
  const [openMenuId, setOpenMenuId] = useState<string | number | null>(null);
  const [sort, setSort] = useState<
    { accessor: keyof T; direction: "asc" | "desc" } | undefined
  >();
  const [columnOrder, setColumnOrder] = useState<(keyof T)[]>(() =>
    columns.map((column) => column.accessor),
  );
  const [pinned, setPinned] = useState<
    Partial<Record<keyof T, "left" | "right">>
  >({});

  const orderedColumns = [
    ...columnOrder
      .map((accessor) => columns.find((column) => column.accessor === accessor))
      .filter((column): column is DataTableColumn<T> => Boolean(column)),
    ...columns.filter((column) => !columnOrder.includes(column.accessor)),
  ];

  const moveColumn = (accessor: keyof T, direction: -1 | 1) => {
    const accessors = orderedColumns.map((column) => column.accessor);
    const index = accessors.indexOf(accessor);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= accessors.length) return;
    [accessors[index], accessors[target]] = [
      accessors[target],
      accessors[index],
    ];
    setColumnOrder(accessors);
  };

  const pinOffsets = (side: "left" | "right") => {
    let offset = side === "left" && selection.enabled ? 52 : 0;
    const result = new Map<keyof T, number>();
    const sideColumns = orderedColumns.filter(
      (column) => pinned[column.accessor] === side,
    );
    const measured =
      side === "right" ? [...sideColumns].reverse() : sideColumns;
    for (const column of measured) {
      result.set(column.accessor, offset);
      const width = Number.parseFloat(column.width || "180");
      offset += Number.isFinite(width) ? width : 180;
    }
    return result;
  };
  const leftOffsets = pinOffsets("left");
  const rightOffsets = pinOffsets("right");
  const columnStyle = (
    column: DataTableColumn<T>,
    isHeader: boolean,
  ): React.CSSProperties => {
    const side = pinned[column.accessor];
    if (!side) return { width: column.width };
    const offset =
      side === "left"
        ? leftOffsets.get(column.accessor)
        : rightOffsets.get(column.accessor);
    return {
      width: column.width,
      position: "sticky",
      ...(side === "left" ? { left: offset } : { right: offset }),
      zIndex: isHeader ? 3 : 1,
    };
  };

  // --- Filtering ---
  const normalizedSearch = searchTerm?.trim().toLowerCase() ?? "";

  const derivedSearchableColumns: (keyof T)[] =
    searchableColumns && searchableColumns.length > 0
      ? searchableColumns
      : columns.map((column) => column.accessor);

  const filteredData =
    normalizedSearch && (customFilter || derivedSearchableColumns.length > 0)
      ? data.filter((item) => {
          if (customFilter) {
            return customFilter(item, normalizedSearch);
          }

          return derivedSearchableColumns.some((key) => {
            const value = item[key];
            if (value === null || value === undefined) return false;

            // Convert value to string for comparison
            const valueString =
              typeof value === "string"
                ? value
                : typeof value === "number"
                  ? value.toString()
                  : value instanceof Date
                    ? value.toISOString()
                    : JSON.stringify(value);

            return valueString.toLowerCase().includes(normalizedSearch);
          });
        })
      : data;

  // Calculate pagination based on filtered data
  const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
  const endIndex = startIndex + pagination.itemsPerPage;
  const sortedData = sort && !manualSorting
    ? [...filteredData].sort((left, right) => {
        const leftValue = left[sort.accessor];
        const rightValue = right[sort.accessor];
        if (leftValue == null) return rightValue == null ? 0 : 1;
        if (rightValue == null) return -1;
        let comparison: number;
        if (typeof leftValue === "number" && typeof rightValue === "number") {
          comparison = leftValue - rightValue;
        } else if (
          leftValue instanceof Date ||
          rightValue instanceof Date ||
          (typeof leftValue === "string" && /^\d{4}-\d\d-\d\d/.test(leftValue))
        ) {
          comparison =
            new Date(leftValue as string | number | Date).getTime() -
            new Date(rightValue as string | number | Date).getTime();
        } else {
          comparison = String(leftValue).localeCompare(
            String(rightValue),
            undefined,
            {
              numeric: true,
              sensitivity: "base",
            },
          );
        }
        return sort.direction === "asc" ? comparison : -comparison;
      })
    : filteredData;
  const paginatedData = pagination.enabled && !pagination.manual
    ? sortedData.slice(startIndex, endIndex)
    : sortedData;
  const totalPages = pagination.enabled
    ? Math.max(
        1,
        Math.ceil(
          (pagination.totalItems ?? filteredData.length) /
            pagination.itemsPerPage,
        ),
      )
    : 1;

  const hasSelection =
    selection.enabled &&
    selection.selectedItems.size > 0 &&
    bulkActions.length > 0;

  const selectedItemsData: T[] = hasSelection
    ? data.filter((item) => selection.selectedItems.has(item.id))
    : [];

  const clearSelection = () => {
    selection.setSelectedItems(new Set());
  };

  // Check if all items are selected
  const allSelected =
    selection.enabled &&
    paginatedData.length > 0 &&
    paginatedData.every((item) => selection.selectedItems.has(item.id));

  const EmptyIcon = emptyState.icon;

  // Selection functions
  const toggleItemSelection = (itemId: string | number) => {
    const newSelection = new Set(selection.selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    selection.setSelectedItems(newSelection);
  };

  const toggleAllSelection = () => {
    const pageIds = paginatedData.map((item) => item.id);
    if (pageIds.every((id) => selection.selectedItems.has(id))) {
      const next = new Set(selection.selectedItems);
      pageIds.forEach((id) => next.delete(id));
      selection.setSelectedItems(next);
    } else {
      selection.setSelectedItems(
        new Set([...selection.selectedItems, ...pageIds]),
      );
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-700 dark:bg-[#1e1e1f]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Loading...
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white text-neutral-900 dark:border-[#3a3a3d] dark:bg-[#1e1e1f] dark:text-neutral-100">
        {/* Bulk actions header */}
        {hasSelection && (
          <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-700 dark:bg-[#171719]">
            <div className="text-sm text-neutral-700 dark:text-neutral-300">
              Selected{" "}
              <span className="font-semibold">
                {selection.selectedItems.size}
              </span>{" "}
              item{selection.selectedItems.size > 1 ? "s" : ""}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  Bulk actions
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {bulkActions.map((action, index) => (
                  <DropdownMenuItem
                    key={index}
                    onClick={() =>
                      action.onClick(selectedItemsData, clearSelection)
                    }
                    className={
                      action.variant === "destructive"
                        ? "text-red-600 focus:text-red-600"
                        : ""
                    }
                  >
                    {action.icon && <action.icon className="w-4 h-4 mr-2" />}
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0">
            <thead className="bg-neutral-100 dark:bg-[#151517]">
              <tr>
                {selection.enabled && (
                  <th className="sticky left-0 z-[4] w-[52px] bg-neutral-100 px-4 py-3 dark:bg-[#151517]">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={() => toggleAllSelection()}
                    />
                  </th>
                )}
                {orderedColumns.map((column, index) => (
                  <th
                    key={String(column.accessor)}
                    className={`px-4 py-3 text-${column.align || "left"} text-xs font-normal uppercase tracking-wider text-neutral-500 dark:text-neutral-400 ${pinned[column.accessor] ? "bg-neutral-100 dark:bg-[#151517]" : ""} ${column.className || ""}`}
                    style={columnStyle(column, true)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
                        {column.header}
                        {sort?.accessor === column.accessor &&
                          (sort.direction === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5" />
                          ))}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 dark:hover:bg-neutral-700 dark:hover:text-white"
                            aria-label={`${column.header} column options`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                          {!manualSorting && (
                            <>
                              <DropdownMenuLabel className="text-xs text-neutral-500">
                                Sort
                              </DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() =>
                                  setSort({
                                    accessor: column.accessor,
                                    direction: "asc",
                                  })
                                }
                              >
                                <ArrowUp className="mr-2 h-4 w-4" /> Asc
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  setSort({
                                    accessor: column.accessor,
                                    direction: "desc",
                                  })
                                }
                              >
                                <ArrowDown className="mr-2 h-4 w-4" /> Desc
                              </DropdownMenuItem>
                            </>
                          )}
                          {!manualSorting && sort?.accessor === column.accessor && (
                            <DropdownMenuItem
                              onClick={() => setSort(undefined)}
                            >
                              <ArrowUpDown className="mr-2 h-4 w-4" /> Clear
                              sort
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              setPinned((current) => ({
                                ...current,
                                [column.accessor]: "left",
                              }))
                            }
                          >
                            <ArrowLeftToLine className="mr-2 h-4 w-4" /> Pin to
                            left
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              setPinned((current) => ({
                                ...current,
                                [column.accessor]: "right",
                              }))
                            }
                          >
                            <ArrowRightToLine className="mr-2 h-4 w-4" /> Pin to
                            right
                          </DropdownMenuItem>
                          {pinned[column.accessor] && (
                            <DropdownMenuItem
                              onClick={() =>
                                setPinned((current) => {
                                  const next = { ...current };
                                  delete next[column.accessor];
                                  return next;
                                })
                              }
                            >
                              Unpin column
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={index === 0}
                            onClick={() => moveColumn(column.accessor, -1)}
                          >
                            <MoveLeft className="mr-2 h-4 w-4" /> Move to Left
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={index === orderedColumns.length - 1}
                            onClick={() => moveColumn(column.accessor, 1)}
                          >
                            <MoveRight className="mr-2 h-4 w-4" /> Move to Right
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </th>
                ))}
                {(actions.primary || actions.menu.length > 0) && (
                  <th className="bg-neutral-100 px-4 py-3 text-right text-xs font-normal uppercase tracking-wider text-neutral-500 dark:bg-[#151517] dark:text-neutral-400">
                    {actions.header || "Actions"}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-[#303034]">
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      columns.length +
                      Number(selection.enabled) +
                      Number(
                        Boolean(actions.primary || actions.menu.length > 0),
                      )
                    }
                    className="px-4 py-12 text-center"
                  >
                    <EmptyIcon className="mx-auto mb-3 h-8 w-8 text-neutral-400" />
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">
                      {emptyState.message}
                    </p>
                    {emptyState.description && (
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        {emptyState.description}
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => (
                  <tr
                    key={item.id}
                    className="group h-[80px] transition-colors hover:bg-neutral-50 dark:hover:bg-[#252527]"
                  >
                    {selection.enabled && (
                      <td className="sticky left-0 z-[2] bg-white px-4 py-4 group-hover:bg-neutral-50 dark:bg-[#1e1e1f] dark:group-hover:bg-[#252527]">
                        <Checkbox
                          checked={selection.selectedItems.has(item.id)}
                          onCheckedChange={() => toggleItemSelection(item.id)}
                        />
                      </td>
                    )}
                    {orderedColumns.map((column, index) => (
                      <td
                        key={String(column.accessor)}
                        className={`px-4 py-4 ${pinned[column.accessor] ? "bg-white group-hover:bg-neutral-50 dark:bg-[#1e1e1f] dark:group-hover:bg-[#252527]" : ""} ${column.cellClassName || ""}`}
                        style={columnStyle(column, false)}
                      >
                        {column.render
                          ? column.render(item)
                          : (item[
                              column.accessor
                            ] as unknown as React.ReactNode)}
                      </td>
                    ))}
                    {(actions.primary || actions.menu.length > 0) && (
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {actions.primary && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={actions.primary.disabled?.(item)}
                              title={actions.primary.title?.(item)}
                              onClick={() => actions.primary!.onClick(item)}
                            >
                              {actions.primary.icon && (
                                <actions.primary.icon className="w-4 h-4" />
                              )}
                              {actions.primary.label}
                            </Button>
                          )}

                          {actions.menu.length > 0 && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setOpenMenuId(
                                      openMenuId === item.id ? null : item.id,
                                    )
                                  }
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              {openMenuId === item.id && (
                                <DropdownMenuContent align="end">
                                  {actions.menu.map((action, actionIndex) => (
                                    <React.Fragment key={actionIndex}>
                                      {action.separator ? (
                                        <DropdownMenuSeparator />
                                      ) : (
                                        <DropdownMenuItem
                                          onClick={() => {
                                            action.onClick?.(item);
                                            setOpenMenuId(null);
                                          }}
                                          disabled={action.disabled?.(item)}
                                          className={action.className || ""}
                                        >
                                          {action.icon && (
                                            <action.icon className="w-4 h-4 mr-2" />
                                          )}
                                          {action.label}
                                        </DropdownMenuItem>
                                      )}
                                    </React.Fragment>
                                  ))}
                                </DropdownMenuContent>
                              )}
                            </DropdownMenu>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination stays separate from the table border. */}
      {pagination.enabled && (
        <div className="mt-3 px-2 py-1 text-neutral-800 dark:text-neutral-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              Rows per page
              {pagination.onItemsPerPageChange && (
                <select
                  className="h-8 rounded-md border border-neutral-300 bg-white px-2 text-neutral-800 dark:border-[#36363a] dark:bg-transparent dark:text-neutral-200"
                  value={pagination.itemsPerPage}
                  onChange={(event) =>
                    pagination.onItemsPerPageChange?.(
                      Number(event.target.value),
                    )
                  }
                >
                  {[10, 25, 50, 100].map((size) => (
                    <option
                      key={size}
                      value={size}
                      className="bg-white dark:bg-[#171719]"
                    >
                      {size}
                    </option>
                  ))}
                </select>
              )}
              {hasSelection && (
                <span className="ml-3 text-xs text-neutral-500 dark:text-neutral-400">
                  {selection.selectedItems.size} item
                  {selection.selectedItems.size > 1 ? "s" : ""} selected
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300">
              <span>
                Viewing ({
                  filteredData.length === 0 ? 0 : startIndex + 1
                } -{" "}
                {pagination.manual
                  ? Math.min(
                      startIndex + filteredData.length,
                      pagination.totalItems ?? filteredData.length,
                    )
                  : Math.min(endIndex, filteredData.length)}
                ) of {pagination.totalItems ?? filteredData.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-[#252527] dark:text-neutral-300 dark:hover:bg-[#353538]"
                onClick={() =>
                  pagination.onPageChange(pagination.currentPage - 1)
                }
                disabled={pagination.currentPage === 1}
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-[#252527] dark:text-neutral-300 dark:hover:bg-[#353538]"
                onClick={() =>
                  pagination.onPageChange(pagination.currentPage + 1)
                }
                disabled={pagination.currentPage === totalPages}
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DataTable;
