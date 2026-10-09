"use client";

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useAdmin } from "@/src/admin-context";
import { apiFetch } from "@/src/lib/api";
import { PageFrame } from "@/components/admin/frontend/page-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  contentCollectionsApi as api,
  type Collection,
  type RecordItem,
} from "./types";

export default function ContentCollectionRecordPage() {
  const { collectionId, recordId } = useParams();
  const navigate = useNavigate();
  const { selectedProjectId } = useAdmin();
  const isEdit = Boolean(recordId);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [record, setRecord] = useState<RecordItem | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [sortOrder, setSortOrder] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedProjectId || !collectionId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const path = isEdit
          ? `${api}/${collectionId}/records/${recordId}`
          : `${api}/${collectionId}`;
        const response = await apiFetch(path, { cache: "no-store" });
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error || "Could not load record");
        if (cancelled) return;
        const loadedCollection: Collection = body.collection;
        if (isEdit && !body.record)
          throw new Error("Could not load record");
        setCollection(loadedCollection);
        if (body.record) {
          const loadedRecord: RecordItem = body.record;
          setRecord(loadedRecord);
          setValues(loadedRecord.values || {});
          setSortOrder(loadedRecord.sortOrder || 0);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : "Could not load record",
          );
          navigate("/content-collections", { replace: true });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [collectionId, isEdit, navigate, recordId, selectedProjectId]);

  const save = async (status: "draft" | "published") => {
    if (!collection || !collectionId) return;
    if (isEdit && !record) {
      toast.error("Could not load record");
      return;
    }
    setSaving(true);
    try {
      const response = await apiFetch(
        isEdit
          ? `${api}/${collectionId}/records/${recordId}`
          : `${api}/${collectionId}/records`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            values,
            status,
            sortOrder,
            ...(isEdit ? { expectedUpdatedAt: record?.updatedAt } : {}),
          }),
        },
      );
      const body = response.status === 204 ? {} : await response.json();
      if (!response.ok) throw new Error(body.error || "Could not save record");
      toast.success(status === "published" ? "Record published" : "Draft saved");
      navigate(`/content-collections?collectionId=${collectionId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save record",
      );
    } finally {
      setSaving(false);
    }
  };

  const cancel = () =>
    navigate(
      collectionId
        ? `/content-collections?collectionId=${collectionId}`
        : "/content-collections",
    );

  return (
    <PageFrame
      title={isEdit ? "Edit record" : "Add record"}
      description={
        collection
          ? `${collection.name} · Enter the values for this record.`
          : "Enter the values for this record."
      }
      headerAction={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={cancel} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => void save("draft")}
            disabled={!collection || saving || loading}
          >
            Save draft
          </Button>
          <Button
            onClick={() => void save("published")}
            disabled={!collection || saving || loading}
          >
            {saving
              ? "Saving…"
              : record?.status === "published"
                ? "Save changes"
                : "Publish"}
          </Button>
        </div>
      }
    >
      {!selectedProjectId ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">
          Select a site before editing collection records.
        </div>
      ) : loading ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">
          Loading record…
        </div>
      ) : collection ? (
        <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
          <header className="border-b border-neutral-200 px-5 py-4 dark:border-neutral-700">
            <h2 className="text-sm font-semibold">Record details</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Fields marked with * are required.
            </p>
          </header>
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <label className="block text-sm font-medium md:col-span-2">
              Display order
              <Input
                className="mt-1 max-w-xs"
                type="number"
                min="0"
                max="100000"
                value={sortOrder}
                onChange={(event) =>
                  setSortOrder(
                    Math.max(0, Math.min(100000, Number(event.target.value) || 0)),
                  )
                }
              />
            </label>
            {collection.fields.map((field, index) => {
              const id = `record-field-${index}`;
              const setValue = (value: unknown) =>
                setValues((current) => ({ ...current, [field.key]: value }));
              return (
                <div
                  key={field.key}
                  className={field.type === "textarea" ? "md:col-span-2" : ""}
                >
                  {field.type === "boolean" ? (
                    <label className="flex min-h-10 items-center gap-2 text-sm font-medium">
                      <input
                        id={id}
                        type="checkbox"
                        checked={Boolean(values[field.key])}
                        onChange={(event) => setValue(event.target.checked)}
                      />
                      {field.label}
                      {field.required && (
                        <span className="text-destructive">*</span>
                      )}
                    </label>
                  ) : (
                    <label
                      htmlFor={id}
                      className="mb-1 block text-sm font-medium"
                    >
                      {field.label}
                      {field.required && (
                        <span className="ml-1 text-destructive">*</span>
                      )}
                    </label>
                  )}
                  {field.type === "textarea" ? (
                    <Textarea
                      id={id}
                      required={field.required}
                      value={String(values[field.key] ?? "")}
                      onChange={(event) => setValue(event.target.value)}
                    />
                  ) : field.type === "select" ? (
                    <Select
                      value={String(values[field.key] ?? "")}
                      onValueChange={setValue}
                    >
                      <SelectTrigger id={id} aria-label={field.label}>
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
                  ) : field.type !== "boolean" ? (
                    <Input
                      id={id}
                      required={field.required}
                      type={
                        field.type === "number"
                          ? "number"
                          : field.type === "date"
                            ? "date"
                            : field.type === "url" || field.type === "image"
                              ? "url"
                              : "text"
                      }
                      value={String(values[field.key] ?? "")}
                      onChange={(event) =>
                        setValue(
                          field.type === "number" && event.target.value
                            ? Number(event.target.value)
                            : event.target.value,
                        )
                      }
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">
          The collection could not be loaded.
        </div>
      )}
    </PageFrame>
  );
}
