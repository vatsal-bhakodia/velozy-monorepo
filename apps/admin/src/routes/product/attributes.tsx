"use client";

import { apiFetch } from "@/src/lib/api";
import { useEffect, useState } from "react";
import { ChevronRight, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAdmin } from "@/src/admin-context";
import { Button } from "@/components/ui/button";
import { PageFrame } from "@/components/admin/frontend/page-frame";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Attribute = { id: string; label: string; value: string | null };
type AttributeType = {
  id: string;
  name: string;
  kind: string;
  attributes: Attribute[];
};
type DeleteTarget = { typeId: string } | { attributeId: string } | null;

export default function ProductAttributesPage() {
  const { selectedProjectId } = useAdmin();
  const [types, setTypes] = useState<AttributeType[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [typeDialog, setTypeDialog] = useState(false);
  const [typeName, setTypeName] = useState("");
  const [editingType, setEditingType] = useState<AttributeType | null>(null);
  const [valueDialog, setValueDialog] = useState(false);
  const [editingValue, setEditingValue] = useState<Attribute | null>(null);
  const [valueLabel, setValueLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  const load = async (projectId = selectedProjectId) => {
    if (!projectId) {
      setTypes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await apiFetch(
        `/api/admin/product-attributes?projectId=${projectId}`,
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to load attributes");
      const next: AttributeType[] = data.types || [];
      setTypes(next);
      setSelectedId((current) =>
        next.some((type) => type.id === current) ? current : next[0]?.id || "",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load attributes",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [selectedProjectId]);

  const selected = types.find((type) => type.id === selectedId);
  const isBuiltInColors = selected?.kind === "builtin_color";
  const openNewType = () => {
    setEditingType(null);
    setTypeName("");
    setTypeDialog(true);
  };
  const openEditType = (type: AttributeType) => {
    setEditingType(type);
    setTypeName(type.name);
    setTypeDialog(true);
  };
  const saveType = async () => {
    if (!selectedProjectId || !typeName.trim()) return;
    setSaving(true);
    try {
      const response = await apiFetch(
        `/api/admin/product-attributes?projectId=${selectedProjectId}`,
        {
          method: editingType ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editingType
              ? { typeId: editingType.id, name: typeName.trim() }
              : { name: typeName.trim() },
          ),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not save attribute");
      toast.success(editingType ? "Attribute updated" : "Attribute created");
      setTypeDialog(false);
      await load();
      if (data.type?.id) setSelectedId(data.type.id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save attribute",
      );
    } finally {
      setSaving(false);
    }
  };
  const saveValue = async () => {
    if (!selected || !selectedProjectId || !valueLabel.trim()) return;
    setSaving(true);
    try {
      const response = await apiFetch(
        `/api/admin/product-attributes${editingValue ? `?projectId=${selectedProjectId}` : `/values?projectId=${selectedProjectId}`}`,
        {
          method: editingValue ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editingValue
              ? { attributeId: editingValue.id, label: valueLabel.trim() }
              : { typeId: selected.id, label: valueLabel.trim() },
          ),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save value");
      toast.success(editingValue ? "Value updated" : "Value added");
      setValueDialog(false);
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save value",
      );
    } finally {
      setSaving(false);
    }
  };
  const addValue = async () => {
    if (!selected || !selectedProjectId || !newValue.trim()) return;
    setSaving(true);
    try {
      const response = await apiFetch(
        `/api/admin/product-attributes/values?projectId=${selectedProjectId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ typeId: selected.id, label: newValue.trim() }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not add value");
      setNewValue("");
      await load();
      toast.success("Value added");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not add value",
      );
    } finally {
      setSaving(false);
    }
  };
  const confirmDelete = async () => {
    if (!selectedProjectId || !deleteTarget) return;
    setSaving(true);
    try {
      const response = await apiFetch(
        `/api/admin/product-attributes?projectId=${selectedProjectId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(deleteTarget),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete");
      if ("typeId" in deleteTarget && deleteTarget.typeId === selectedId)
        setSelectedId("");
      setDeleteTarget(null);
      await load();
      toast.success("Deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageFrame
      title="Product attributes"
      description="Manage reusable options for products. Changes are shared with the product editor."
      headerAction={<Button onClick={openNewType}>New attribute</Button>}
    >
      <div className="grid min-h-[520px] gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
          <div className="border-b border-neutral-200 px-4 py-4 dark:border-neutral-700">
            <h2 className="text-sm font-semibold">Attribute groups</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Reusable product options
            </p>
          </div>
          <div className="p-2">
            {loading ? (
              <p className="px-3 py-8 text-center text-sm text-neutral-500">
                Loading attributes…
              </p>
            ) : types.length ? (
              <div className="space-y-1">
                {types.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSelectedId(type.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors ${selectedId === type.id ? "bg-blue-50 text-blue-950 dark:bg-blue-950/40 dark:text-blue-100" : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"}`}
                  >
                    {type.kind === "builtin_color" ? (
                      <span className="flex -space-x-1">
                        {type.attributes.slice(0, 3).map((color) => (
                          <span
                            key={color.id}
                            className="h-3 w-3 rounded-full border border-white dark:border-neutral-900"
                            style={
                              color.label === "Multicolor"
                                ? {
                                    backgroundImage:
                                      "conic-gradient(#e53935, #fdd835, #43a047, #1e88e5, #8e24aa, #e53935)",
                                  }
                                : { backgroundColor: color.value || "#aaa" }
                            }
                          />
                        ))}
                      </span>
                    ) : (
                      <Tags className="h-4 w-4 text-neutral-400" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {type.name}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {type.attributes.length}
                    </span>
                    <ChevronRight className="h-4 w-4 text-neutral-400" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-10 text-center">
                <Tags className="mx-auto mb-3 h-7 w-7 text-neutral-400" />
                <p className="text-sm font-medium">No attributes yet</p>
                <p className="mt-1 text-xs text-neutral-500">
                  Create groups like Size or Material to reuse in products.
                </p>
                <Button className="mt-4" size="sm" onClick={openNewType}>
                  <Plus className="mr-1 h-4 w-4" />
                  Create group
                </Button>
              </div>
            )}
          </div>
        </section>

        {selected ? (
          <section className="min-w-0 rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <header className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-200 px-5 py-5 dark:border-neutral-700 sm:px-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Attribute group
                </p>
                <h2 className="mt-1 text-xl font-semibold">{selected.name}</h2>
                <p className="mt-1 text-sm text-neutral-500">
                  {isBuiltInColors
                    ? "Standard color choices, available on every site."
                    : "Values here are available when configuring product options."}
                </p>
              </div>
              {!isBuiltInColors && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditType(selected)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Rename
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600"
                    onClick={() => setDeleteTarget({ typeId: selected.id })}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              )}
            </header>
            <div className="p-5 sm:p-6">
              {!isBuiltInColors && (
                <div className="mb-6 flex flex-col gap-2 sm:flex-row">
                  <div className="min-w-0 flex-1">
                    <Label htmlFor="new-attribute-value">Add a value</Label>
                    <Input
                      id="new-attribute-value"
                      className="mt-2"
                      value={newValue}
                      onChange={(event) => setNewValue(event.target.value)}
                      placeholder={
                        selected.attributes.length
                          ? "For example, Small"
                          : "Add the first value"
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void addValue();
                        }
                      }}
                    />
                  </div>
                  <Button
                    className="sm:mt-7"
                    disabled={!newValue.trim() || saving}
                    onClick={() => void addValue()}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add value
                  </Button>
                </div>
              )}
              {selected.attributes.length ? (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {selected.attributes.map((attribute) => (
                    <div
                      key={attribute.id}
                      className="flex min-w-0 items-center gap-3 rounded-lg border border-neutral-200 px-3 py-3 dark:border-neutral-700"
                    >
                      {selected.kind === "builtin_color" ? (
                        <span
                          className="h-7 w-7 shrink-0 rounded-full border border-neutral-300 dark:border-neutral-600"
                          style={
                            attribute.label === "Multicolor"
                              ? {
                                  backgroundImage:
                                    "conic-gradient(#e53935, #fdd835, #43a047, #1e88e5, #8e24aa, #e53935)",
                                }
                              : {
                                  backgroundColor:
                                    attribute.value || "transparent",
                                }
                          }
                        />
                      ) : (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {attribute.label}
                      </span>
                      {selected.kind === "builtin_color" ? null : (
                        <span className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${attribute.label}`}
                            onClick={() => {
                              setEditingValue(attribute);
                              setValueLabel(attribute.label);
                              setValueDialog(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${attribute.label}`}
                            className="text-red-600"
                            onClick={() =>
                              setDeleteTarget({ attributeId: attribute.id })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-neutral-300 px-6 py-12 text-center dark:border-neutral-700">
                  <p className="text-sm font-medium">No values in this group</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Add values before using this group in a variable product.
                  </p>
                </div>
              )}
            </div>
          </section>
        ) : (
          <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
            <div>
              <Tags className="mx-auto mb-3 h-8 w-8 text-neutral-400" />
              <p className="font-medium">Choose an attribute group</p>
              <p className="mt-1 text-sm text-neutral-500">
                Its values and editing controls will appear here.
              </p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={typeDialog} onOpenChange={setTypeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingType
                ? "Rename attribute group"
                : "Create attribute group"}
            </DialogTitle>
          </DialogHeader>
          <div>
            <Label htmlFor="attribute-group-name">Group name</Label>
            <Input
              id="attribute-group-name"
              autoFocus
              className="mt-2"
              value={typeName}
              onChange={(event) => setTypeName(event.target.value)}
              placeholder="For example, Size"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void saveType();
                }
              }}
            />
            <p className="mt-2 text-xs text-neutral-500">
              The name customers use to identify this option, such as Size,
              Material, or Finish.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTypeDialog(false)}>
              Cancel
            </Button>
            <Button
              disabled={!typeName.trim() || saving}
              onClick={() => void saveType()}
            >
              {editingType ? "Save name" : "Create group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={valueDialog} onOpenChange={setValueDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {selected?.name} value</DialogTitle>
          </DialogHeader>
          <div>
            <Label htmlFor="attribute-value-label">Value</Label>
            <Input
              id="attribute-value-label"
              autoFocus
              className="mt-2"
              value={valueLabel}
              onChange={(event) => setValueLabel(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void saveValue();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setValueDialog(false)}>
              Cancel
            </Button>
            <Button
              disabled={!valueLabel.trim() || saving}
              onClick={() => void saveValue()}
            >
              Save value
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete{" "}
              {deleteTarget && "typeId" in deleteTarget
                ? "attribute group"
                : "attribute value"}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes it from the shared site library. Existing product
              data is not changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              className="bg-red-600 hover:bg-red-700"
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageFrame>
  );
}
