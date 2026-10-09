"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ChevronRight,
  Database,
  Plus,
  Trash2,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { apiFetch } from "@/src/lib/api";
import { useAdmin } from "@/src/admin-context";
import {
  contentCollectionsApi as api,
  type Collection,
  type RecordItem,
} from "./content-collections/types";
import RecordTable, {
  type RecordFilter,
} from "@/components/admin/manage/record-table";
import type {
  DataTableActions,
  DataTableBulkAction,
  DataTableColumn,
} from "@/components/admin/manage/table";
import { Button } from "@/components/ui/button";
import { PageFrame } from "@/components/admin/frontend/page-frame";

export default function ContentCollectionsPage() {
  const { selectedProjectId } = useAdmin();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedCollectionId = searchParams.get("collectionId");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeId, setActiveId] = useState("");
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [recordPage, setRecordPage] = useState(1);
  const [recordTotal, setRecordTotal] = useState(0);
  const [selectedRecords, setSelectedRecords] = useState<Set<string | number>>(
    new Set(),
  );
  const [loading, setLoading] = useState(false);
  const active = collections.find((item) => item.id === activeId) || null;

  const loadCollections = useCallback(async () => {
    if (!selectedProjectId) return;
    try {
      const response = await apiFetch(
        `${api}?projectId=${encodeURIComponent(selectedProjectId)}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("Could not load content collections");
      const body = await response.json();
      const rows: Collection[] = body.collections || [];
      setCollections(rows);
      setActiveId((current) =>
        rows.some((item) => item.id === requestedCollectionId)
          ? requestedCollectionId!
          : rows.some((item) => item.id === current)
            ? current
            : rows[0]?.id || "",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load collections",
      );
    }
  }, [requestedCollectionId, selectedProjectId]);

  const loadRecords = useCallback(async () => {
    if (!activeId) {
      setRecords([]);
      return;
    }
    setLoading(true);
    try {
      const response = await apiFetch(
        `${api}/${activeId}/records?page=${recordPage}&pageSize=20`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("Could not load records");
      const body = await response.json();
      setRecords(body.records || []);
      setRecordTotal(body.total || 0);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load records",
      );
    } finally {
      setLoading(false);
    }
  }, [activeId, recordPage]);

  useEffect(() => {
    void loadCollections();
  }, [loadCollections]);
  useEffect(() => {
    setRecordPage(1);
  }, [activeId]);
  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const updateRecordStatus = async (
    record: RecordItem,
    status: "draft" | "published",
  ) => {
    if (!active) return;
    try {
      const response = await apiFetch(
        `${api}/${active.id}/records/${record.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, expectedUpdatedAt: record.updatedAt }),
        },
      );
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || "Could not update record status");
      }
      toast.success(
        status === "published" ? "Record published" : "Record moved to drafts",
      );
      await loadRecords();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update record status",
      );
    }
  };

  const bulkStatus = (
    status: "draft" | "published",
  ): DataTableBulkAction<RecordItem> => ({
    label:
      status === "published" ? "Publish selected" : "Move selected to drafts",
    onClick: async (selected, clearSelection) => {
      if (!active) return;
      try {
        const response = await apiFetch(`${api}/${active.id}/records/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ids: selected.map((record) => record.id),
            status,
          }),
        });
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error || "Could not update selected records");
        toast.success(`${body.updated} records updated`);
        clearSelection();
        await loadRecords();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not update selected records",
        );
      }
    },
  });

  const columns: DataTableColumn<RecordItem>[] = useMemo(
    () => [
      {
        header: "Record",
        accessor: "id",
        render: (item) => (
          <div>
            <p className="font-medium text-foreground">
              {String(
                Object.values(item.values || {}).find(
                  (value) => typeof value === "string" && value,
                ) || "Untitled record",
              )}
            </p>
            <p className="max-w-md truncate text-xs text-muted-foreground">
              {Object.entries(item.values || {})
                .slice(1, 3)
                .map(([, value]) => String(value ?? ""))
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        ),
      },
      {
        header: "Status",
        accessor: "status",
        render: (item) => (
          <span className="capitalize text-muted-foreground">
            {item.status}
          </span>
        ),
      },
      {
        header: "Updated",
        accessor: "updatedAt",
        render: (item) => (
          <span className="text-muted-foreground">
            {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
              new Date(item.updatedAt),
            )}
          </span>
        ),
      },
    ],
    [],
  );
  const filters: RecordFilter<RecordItem>[] = [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Published", value: "published" },
      ],
    },
  ];
  const actions: DataTableActions<RecordItem> = {
    primary: {
      label: "Edit",
      onClick: (record) => {
        if (!active) return;
        navigate(
          `/content-collections/${active.id}/records/${record.id}/edit`,
        );
      },
    },
    menu: [
      {
        label: "Publish",
        onClick: (record) => void updateRecordStatus(record, "published"),
        disabled: (record) => record.status === "published",
      },
      {
        label: "Move to drafts",
        onClick: (record) => void updateRecordStatus(record, "draft"),
        disabled: (record) => record.status === "draft",
      },
      { separator: true },
      {
        icon: Trash2,
        label: "Delete",
        className: "text-red-600",
        onClick: async (record) => {
          if (!confirm("Delete this record? This cannot be undone.")) return;
          const response = await apiFetch(
            `${api}/${activeId}/records/${record.id}`,
            { method: "DELETE" },
          );
          if (response.ok) {
            toast.success("Record deleted");
            void loadRecords();
          } else toast.error("Could not delete record");
        },
      },
    ],
  };
  const bulkActions: DataTableBulkAction<RecordItem>[] = [
    bulkStatus("published"),
    bulkStatus("draft"),
  ];

  const archiveCollection = async () => {
    if (
      !active ||
      !confirm(
        `Archive ${active.name}? Its records will no longer appear on the site.`,
      )
    )
      return;
    const response = await apiFetch(`${api}/${active.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isArchived: true,
        expectedUpdatedAt: active.updatedAt,
      }),
    });
    if (response.ok) {
      toast.success("Collection archived");
      void loadCollections();
    } else toast.error("Could not archive collection");
  };

  return (
    <PageFrame
      title="Content Collections"
      description="Manage repeatable content such as testimonials, team members, and FAQs. Published records appear in connected site sections."
      headerAction={
        <Button
          onClick={() => navigate("/content-collections/new")}
          disabled={!selectedProjectId}
        >
          <Plus className="mr-2 h-4 w-4" />
          New collection
        </Button>
      }
    >
      {!selectedProjectId ? (
        <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">
          Select a site to manage its content collections.
        </div>
      ) : (
        <div className="grid min-h-[520px] gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <div className="border-b border-neutral-200 px-4 py-4 dark:border-neutral-700">
              <h2 className="text-sm font-semibold">Collection types</h2>
              <p className="mt-1 text-xs text-neutral-500">
                Reusable structured content
              </p>
            </div>
            <div className="p-2">
              {collections.length ? (
                <div className="space-y-1">
                  {collections.map((collection) => (
                    <button
                      key={collection.id}
                      type="button"
                      aria-pressed={activeId === collection.id}
                      onClick={() => {
                        setActiveId(collection.id);
                        setSearchParams({ collectionId: collection.id });
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${activeId === collection.id ? "bg-blue-50 text-blue-950 dark:bg-blue-950/40 dark:text-blue-100" : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"}`}
                    >
                      <Database className="h-4 w-4 shrink-0 text-neutral-400" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {collection.name}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-neutral-500">
                          {collection.key}
                        </span>
                      </span>
                      <span className="text-xs text-neutral-500">
                        {collection.fields.length}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-10 text-center">
                  <Database className="mx-auto mb-3 h-7 w-7 text-neutral-400" />
                  <p className="text-sm font-medium">No collection types yet</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Create a type to organize repeatable site content.
                  </p>
                  <Button
                    className="mt-4"
                    size="sm"
                    onClick={() => navigate("/content-collections/new")}
                    disabled={!selectedProjectId}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Create collection
                  </Button>
                </div>
              )}
            </div>
          </section>

          {active ? (
            <section className="min-w-0 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900 sm:p-6">
              <RecordTable<RecordItem>
                title={active.name}
                description={
                  active.description ||
                  `${active.fields.length} fields · Records are stored as structured content.`
                }
                data={records}
                columns={columns}
                filters={filters}
                loading={loading}
                serverPagination={{
                  currentPage: recordPage,
                  itemsPerPage: 20,
                  totalItems: recordTotal,
                  onPageChange: setRecordPage,
                }}
                primaryAction={{
                  label: "Add record",
                  onClick: () =>
                    navigate(`/content-collections/${active.id}/records/new`),
                }}
                actions={actions}
                selection={{
                  enabled: true,
                  selectedItems: selectedRecords,
                  setSelectedItems: setSelectedRecords,
                }}
                bulkActions={bulkActions}
                contained
                headerActions={
                  <>
                    <Button
                      variant="outline"
                      onClick={() =>
                        navigate(`/content-collections/${active.id}/edit`)
                      }
                    >
                      Edit schema
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => void archiveCollection()}
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      Archive
                    </Button>
                  </>
                }
                emptyState={{
                  icon: Database,
                  message: "No records in this collection",
                  description:
                    "Add a record or keep AI generated records as drafts until reviewed.",
                }}
              />
            </section>
          ) : (
            <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
              <div>
                <Database className="mx-auto mb-3 h-8 w-8 text-neutral-400" />
                <p className="font-medium">
                  {collections.length
                    ? "Choose a collection type"
                    : "Create a collection type"}
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  {collections.length
                    ? "Its records and editing controls will appear here."
                    : "Define fields to start adding structured records."}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </PageFrame>
  );
}
