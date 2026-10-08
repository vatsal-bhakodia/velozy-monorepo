"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Database, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/src/lib/api";
import { useAdmin } from "@/src/admin-context";
import RecordTable, {
  type RecordFilter,
} from "@/components/admin/manage/record-table";
import type {
  DataTableActions,
  DataTableBulkAction,
  DataTableColumn,
} from "@/components/admin/manage/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "date"
  | "url"
  | "image"
  | "select";
type Field = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
};
type Collection = {
  id: string;
  name: string;
  key: string;
  description?: string | null;
  fields: Field[];
  isArchived?: boolean;
  updatedAt: string;
};
type RecordItem = {
  id: string;
  values: Record<string, unknown>;
  status: "draft" | "published";
  sortOrder: number;
  updatedAt: string;
};
const api = "/api/admin/content-collections";
const blankField = (index = 1): Field => ({
  key: `field_${index}`,
  label: `New field ${index}`,
  type: "text",
  required: false,
});

export default function ContentCollectionsPage() {
  const { selectedProjectId } = useAdmin();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeId, setActiveId] = useState("");
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [recordPage, setRecordPage] = useState(1);
  const [recordTotal, setRecordTotal] = useState(0);
  const [selectedRecords, setSelectedRecords] = useState<Set<string | number>>(
    new Set(),
  );
  const [loading, setLoading] = useState(false);
  const [collectionDialog, setCollectionDialog] = useState(false);
  const [recordDialog, setRecordDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RecordItem | null>(null);
  const [collectionDraft, setCollectionDraft] = useState<Partial<Collection>>({
    name: "",
    description: "",
    fields: [blankField()],
  });
  const [recordValues, setRecordValues] = useState<Record<string, unknown>>({});
  const [recordSortOrder, setRecordSortOrder] = useState(0);
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
        rows.some((item) => item.id === current) ? current : rows[0]?.id || "",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load collections",
      );
    }
  }, [selectedProjectId]);

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

  const saveCollection = async () => {
    if (!selectedProjectId || !collectionDraft.name?.trim())
      return toast.error("Enter a collection name");
    const fields = (collectionDraft.fields || []).map((field) => ({
      ...field,
      key: field.key
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_")
        .replace(/^\d/, "f_"),
    }));
    try {
      const isEdit = Boolean(collectionDraft.id);
      const response = await apiFetch(
        isEdit ? `${api}/${collectionDraft.id}` : api,
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isEdit
              ? {
                  name: collectionDraft.name,
                  description: collectionDraft.description,
                  fields,
                  expectedUpdatedAt: collectionDraft.updatedAt,
                }
              : {
                  projectId: selectedProjectId,
                  name: collectionDraft.name,
                  description: collectionDraft.description,
                  fields,
                },
          ),
        },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "Could not save collection");
      toast.success(isEdit ? "Collection updated" : "Collection created");
      setCollectionDialog(false);
      await loadCollections();
      setActiveId(body.collection.id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save collection",
      );
    }
  };

  const saveRecord = async (status: "draft" | "published" = "draft") => {
    if (!active) return;
    try {
      const response = await apiFetch(
        editingRecord
          ? `${api}/${active.id}/records/${editingRecord.id}`
          : `${api}/${active.id}/records`,
        {
          method: editingRecord ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            values: recordValues,
            status,
            sortOrder: recordSortOrder,
            ...(editingRecord
              ? { expectedUpdatedAt: editingRecord.updatedAt }
              : {}),
          }),
        },
      );
      const body = response.status === 204 ? {} : await response.json();
      if (!response.ok) throw new Error(body.error || "Could not save record");
      toast.success(
        status === "published" ? "Record published" : "Draft saved",
      );
      setRecordDialog(false);
      await loadRecords();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save record",
      );
    }
  };

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
        setEditingRecord(record);
        setRecordValues(record.values || {});
        setRecordSortOrder(record.sortOrder || 0);
        setRecordDialog(true);
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

  const openNewCollection = () => {
    setCollectionDraft({ name: "", description: "", fields: [blankField()] });
    setCollectionDialog(true);
  };
  const openSchema = () => {
    if (active) {
      setCollectionDraft(active);
      setCollectionDialog(true);
    }
  };
  const openNewRecord = () => {
    setEditingRecord(null);
    setRecordValues({});
    setRecordSortOrder(0);
    setRecordDialog(true);
  };
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

  if (!selectedProjectId)
    return (
      <div className="p-8 text-sm text-muted-foreground">
        Select a site to manage its content collections.
      </div>
    );
  return (
    <div className="space-y-6 p-6 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            CONTENT / STRUCTURED RECORDS
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Content Collections
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Manage repeatable content such as testimonials, team members, and
            FAQs. Published records appear in connected site sections.
          </p>
        </div>
        <Button onClick={openNewCollection}>
          <Plus className="mr-2 h-4 w-4" />
          New collection
        </Button>
      </header>
      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-2 rounded-xl border bg-card p-3">
          <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Collection groups
          </div>
          {collections.map((collection) => (
            <button
              key={collection.id}
              onClick={() => setActiveId(collection.id)}
              className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${activeId === collection.id ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
            >
              <span className="flex items-center justify-between gap-2 text-sm font-medium">
                <span className="truncate">{collection.name}</span>
                <span className="text-xs">{collection.fields.length}</span>
              </span>
              <span className="mt-1 block truncate text-xs text-muted-foreground">
                {collection.key}
              </span>
            </button>
          ))}
          {!collections.length && (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              No collections yet. Create one or generate a site section that
              needs repeatable content.
            </p>
          )}
        </aside>
        <main className="min-w-0">
          {active ? (
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
              primaryAction={{ label: "Add record", onClick: openNewRecord }}
              actions={actions}
              selection={{
                enabled: true,
                selectedItems: selectedRecords,
                setSelectedItems: setSelectedRecords,
              }}
              bulkActions={bulkActions}
              headerActions={
                <>
                  <Button variant="outline" onClick={openSchema}>
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
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed bg-card text-center">
              <Database className="h-8 w-8 text-muted-foreground" />
              <p className="mt-4 font-medium">Choose a collection group</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a collection to start managing structured records.
              </p>
            </div>
          )}
        </main>
      </div>
      <Dialog open={collectionDialog} onOpenChange={setCollectionDialog}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {collectionDraft.id ? "Edit collection schema" : "New collection"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <label className="block text-sm font-medium">
              Name
              <Input
                className="mt-1"
                value={collectionDraft.name || ""}
                onChange={(event) =>
                  setCollectionDraft({
                    ...collectionDraft,
                    name: event.target.value,
                  })
                }
              />
            </label>
            <label className="block text-sm font-medium">
              Description
              <Textarea
                className="mt-1"
                value={collectionDraft.description || ""}
                onChange={(event) =>
                  setCollectionDraft({
                    ...collectionDraft,
                    description: event.target.value,
                  })
                }
              />
            </label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Fields</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCollectionDraft({
                      ...collectionDraft,
                      fields: [
                        ...(collectionDraft.fields || []),
                        blankField((collectionDraft.fields || []).length + 1),
                      ],
                    })
                  }
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add field
                </Button>
              </div>
              {(collectionDraft.fields || []).map((field, index) => (
                <div
                  key={`${index}-${field.key}`}
                  className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1fr_1fr_150px_auto]"
                >
                  <Input
                    aria-label="Field label"
                    value={field.label}
                    placeholder="Field label"
                    onChange={(event) => {
                      const fields = [...(collectionDraft.fields || [])];
                      fields[index] = {
                        ...field,
                        label: event.target.value,
                        key:
                          field.key === "field"
                            ? event.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9]+/g, "_")
                                .replace(/^\d/, "f_")
                            : field.key,
                      };
                      setCollectionDraft({ ...collectionDraft, fields });
                    }}
                  />
                  <Input
                    aria-label="Field key"
                    value={field.key}
                    placeholder="field_key"
                    disabled={Boolean(
                      collectionDraft.id &&
                      active?.fields.some(
                        (existing) => existing.key === field.key,
                      ),
                    )}
                    onChange={(event) => {
                      const fields = [...(collectionDraft.fields || [])];
                      fields[index] = {
                        ...field,
                        key: event.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9_]+/g, "_")
                          .replace(/^\d/, "f_"),
                      };
                      setCollectionDraft({ ...collectionDraft, fields });
                    }}
                  />
                  <Select
                    value={field.type}
                    disabled={Boolean(
                      collectionDraft.id &&
                      active?.fields.some(
                        (existing) => existing.key === field.key,
                      ),
                    )}
                    onValueChange={(value: FieldType) => {
                      const fields = [...(collectionDraft.fields || [])];
                      fields[index] = {
                        ...field,
                        type: value,
                        options:
                          value === "select"
                            ? field.options || ["Option 1"]
                            : undefined,
                      };
                      setCollectionDraft({ ...collectionDraft, fields });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        [
                          "text",
                          "textarea",
                          "number",
                          "boolean",
                          "date",
                          "url",
                          "image",
                          "select",
                        ] as FieldType[]
                      ).map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    aria-label="Remove field"
                    variant="ghost"
                    size="icon"
                    disabled={
                      (collectionDraft.fields || []).length <= 1 ||
                      Boolean(
                        collectionDraft.id &&
                        active?.fields.some(
                          (existing) => existing.key === field.key,
                        ),
                      )
                    }
                    onClick={() =>
                      setCollectionDraft({
                        ...collectionDraft,
                        fields: collectionDraft.fields?.filter(
                          (_, fieldIndex) => fieldIndex !== index,
                        ),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  {field.type === "select" && (
                    <Input
                      className="md:col-span-4"
                      placeholder="Options, separated by commas"
                      value={(field.options || []).join(", ")}
                      onChange={(event) => {
                        const fields = [...(collectionDraft.fields || [])];
                        fields[index] = {
                          ...field,
                          options: event.target.value
                            .split(",")
                            .map((option) => option.trim())
                            .filter(Boolean),
                        };
                        setCollectionDraft({ ...collectionDraft, fields });
                      }}
                    />
                  )}
                  <label className="flex items-center gap-2 text-xs text-muted-foreground md:col-span-4">
                    <input
                      type="checkbox"
                      checked={Boolean(field.required)}
                      onChange={(event) => {
                        const fields = [...(collectionDraft.fields || [])];
                        fields[index] = {
                          ...field,
                          required: event.target.checked,
                        };
                        setCollectionDraft({ ...collectionDraft, fields });
                      }}
                    />
                    Required field
                  </label>
                </div>
              ))}
            </div>
            {collectionDraft.id && (
              <p className="text-xs text-muted-foreground">
                Existing field keys and types are locked to protect saved record
                data. Add new fields or update labels and options.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCollectionDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => void saveCollection()}>
              <Save className="mr-2 h-4 w-4" />
              Save collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={recordDialog} onOpenChange={setRecordDialog}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecord
                ? "Edit record"
                : `Add ${active?.name || "record"}`}
            </DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-4">
              <label className="block text-sm font-medium">
                Display order
                <Input
                  className="mt-1"
                  type="number"
                  min="0"
                  max="100000"
                  value={recordSortOrder}
                  onChange={(event) =>
                    setRecordSortOrder(
                      Math.max(
                        0,
                        Math.min(100000, Number(event.target.value) || 0),
                      ),
                    )
                  }
                />
              </label>
              {active.fields.map((field) => (
                <label key={field.key} className="block text-sm font-medium">
                  {field.label}
                  {field.required && (
                    <span className="ml-1 text-destructive">*</span>
                  )}
                  {field.type === "textarea" ? (
                    <Textarea
                      className="mt-1"
                      value={String(recordValues[field.key] ?? "")}
                      onChange={(event) =>
                        setRecordValues({
                          ...recordValues,
                          [field.key]: event.target.value,
                        })
                      }
                    />
                  ) : field.type === "boolean" ? (
                    <span className="mt-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(recordValues[field.key])}
                        onChange={(event) =>
                          setRecordValues({
                            ...recordValues,
                            [field.key]: event.target.checked,
                          })
                        }
                      />{" "}
                      Yes
                    </span>
                  ) : field.type === "select" ? (
                    <Select
                      value={String(recordValues[field.key] ?? "")}
                      onValueChange={(value) =>
                        setRecordValues({ ...recordValues, [field.key]: value })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choose an option" />
                      </SelectTrigger>
                      <SelectContent>
                        {(field.options || []).map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      className="mt-1"
                      type={
                        field.type === "number"
                          ? "number"
                          : field.type === "date"
                            ? "date"
                            : field.type === "url" || field.type === "image"
                              ? "url"
                              : "text"
                      }
                      value={String(recordValues[field.key] ?? "")}
                      onChange={(event) =>
                        setRecordValues({
                          ...recordValues,
                          [field.key]:
                            field.type === "number" && event.target.value
                              ? Number(event.target.value)
                              : event.target.value,
                        })
                      }
                    />
                  )}
                </label>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordDialog(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => void saveRecord("draft")}>
              Save draft
            </Button>
            <Button onClick={() => void saveRecord("published")}>
              {editingRecord?.status === "published"
                ? "Save changes"
                : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
