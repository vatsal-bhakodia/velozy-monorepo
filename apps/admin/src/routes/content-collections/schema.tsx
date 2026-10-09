"use client";

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
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
  blankField,
  contentCollectionsApi as api,
  type Collection,
  type Field,
  type FieldType,
} from "./types";

export default function ContentCollectionSchemaPage() {
  const { collectionId } = useParams();
  const navigate = useNavigate();
  const { selectedProjectId } = useAdmin();
  const isEdit = Boolean(collectionId);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<Field[]>([blankField()]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit || !collectionId || !selectedProjectId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const response = await apiFetch(`${api}/${collectionId}`, {
          cache: "no-store",
        });
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error || "Could not load collection");
        if (cancelled) return;
        const loaded: Collection = body.collection;
        setCollection(loaded);
        setName(loaded.name);
        setDescription(loaded.description || "");
        setFields(loaded.fields);
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : "Could not load collection",
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
  }, [collectionId, isEdit, navigate, selectedProjectId]);

  const updateField = (index: number, next: Field) => {
    setFields((current) => current.map((field, i) => (i === index ? next : field)));
  };

  const save = async () => {
    if (!selectedProjectId) {
      toast.error("Select a site before saving a collection");
      return;
    }
    if (!name.trim()) {
      toast.error("Enter a collection name");
      return;
    }
    const normalizedFields = fields.map((field) => ({
      ...field,
      key: field.key
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_")
        .replace(/^\d/, "f_"),
    }));
    setSaving(true);
    try {
      const response = await apiFetch(isEdit ? `${api}/${collectionId}` : api, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit
            ? {
                name: name.trim(),
                description,
                fields: normalizedFields,
                expectedUpdatedAt: collection?.updatedAt,
              }
            : {
                projectId: selectedProjectId,
                name: name.trim(),
                description,
                fields: normalizedFields,
              },
        ),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "Could not save collection");
      const saved: Collection = body.collection;
      toast.success(isEdit ? "Collection updated" : "Collection created");
      navigate(`/content-collections?collectionId=${saved.id}`, {
        replace: true,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save collection",
      );
    } finally {
      setSaving(false);
    }
  };

  const cancel = () =>
    navigate(
      isEdit && collectionId
        ? `/content-collections?collectionId=${collectionId}`
        : "/content-collections",
    );

  const existingField = (key: string) =>
    Boolean(collection?.fields.some((field) => field.key === key));

  return (
    <PageFrame
      title={isEdit ? "Edit collection" : "New collection"}
      description={
        isEdit
          ? "Update the collection name, description, and fields. Existing field keys and types stay fixed to protect saved records."
          : "Create a reusable structure for testimonials, team members, FAQs, and other site content."
      }
      headerAction={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={cancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving || loading}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create collection"}
          </Button>
        </div>
      }
    >
      {!selectedProjectId ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">
          Select a site to manage its content collections.
        </div>
      ) : loading ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">
          Loading collection…
        </div>
      ) : (
        <div className="space-y-5">
          <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <header className="border-b border-neutral-200 px-5 py-4 dark:border-neutral-700">
              <h2 className="text-sm font-semibold">Collection details</h2>
            </header>
            <div className="grid gap-4 p-5">
              <label className="block text-sm font-medium">
                Name
                <Input
                  className="mt-1"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={120}
                  autoFocus
                />
              </label>
              <label className="block text-sm font-medium">
                Description
                <Textarea
                  className="mt-1"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={2000}
                  rows={2}
                />
              </label>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4 dark:border-neutral-700">
              <div>
                <h2 className="text-sm font-semibold">Fields</h2>
                <p className="mt-1 text-xs text-neutral-500">
                  Field keys and types are fixed after records use them.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFields((current) => [...current, blankField(current.length + 1)])}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add field
              </Button>
            </header>
            <div className="space-y-3 p-5">
              {fields.map((field, index) => (
                <div
                  key={`${index}-${field.key}`}
                  className="grid gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700 md:grid-cols-[1fr_1fr_150px_auto]"
                >
                  <Input
                    aria-label="Field label"
                    value={field.label}
                    placeholder="Field label"
                    onChange={(event) =>
                      updateField(index, {
                        ...field,
                        label: event.target.value,
                        key:
                          field.key === "field"
                            ? event.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9]+/g, "_")
                                .replace(/^\d/, "f_")
                            : field.key,
                      })
                    }
                  />
                  <Input
                    aria-label="Field key"
                    value={field.key}
                    placeholder="field_key"
                    disabled={isEdit && existingField(field.key)}
                    onChange={(event) =>
                      updateField(index, {
                        ...field,
                        key: event.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9_]+/g, "_")
                          .replace(/^\d/, "f_"),
                      })
                    }
                  />
                  <Select
                    value={field.type}
                    disabled={isEdit && existingField(field.key)}
                    onValueChange={(type: FieldType) =>
                      updateField(index, {
                        ...field,
                        type,
                        options:
                          type === "select"
                            ? field.options || ["Option 1"]
                            : undefined,
                      })
                    }
                  >
                    <SelectTrigger aria-label="Field type">
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
                    type="button"
                    aria-label="Remove field"
                    variant="ghost"
                    size="icon"
                    disabled={
                      fields.length <= 1 ||
                      (isEdit && existingField(field.key))
                    }
                    onClick={() =>
                      setFields((current) =>
                        current.filter((_, fieldIndex) => fieldIndex !== index),
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  {field.type === "select" && (
                    <Input
                      aria-label="Options, separated by commas"
                      className="md:col-span-4"
                      placeholder="Options, separated by commas"
                      value={(field.options || []).join(", ")}
                      onChange={(event) =>
                        updateField(index, {
                          ...field,
                          options: event.target.value
                            .split(",")
                            .map((option) => option.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  )}
                  <label className="flex items-center gap-2 text-xs text-neutral-500 md:col-span-4">
                    <input
                      type="checkbox"
                      checked={Boolean(field.required)}
                      onChange={(event) =>
                        updateField(index, {
                          ...field,
                          required: event.target.checked,
                        })
                      }
                    />
                    Required
                  </label>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </PageFrame>
  );
}
