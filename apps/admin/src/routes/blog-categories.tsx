"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/src/lib/api";
import { useSession } from "@/src/lib/auth";
import { useAdmin } from "@/src/admin-context";
import { generateSlug } from "@/src/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Edit, FolderTree, Trash2 } from "lucide-react";
import RecordTable from "@/components/admin/manage/record-table";
import type {
  DataTableActions,
  DataTableColumn,
} from "@/components/admin/manage/table";

type BlogCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  sortOrder: number | null;
  isActive: boolean | null;
};
type CategoryForm = Omit<BlogCategory, "id">;
const EMPTY_FORM: CategoryForm = {
  name: "",
  slug: "",
  description: "",
  image: "",
  sortOrder: 0,
  isActive: true,
};
const API_PATH = "/api/admin/blog-categories";

export default function BlogCategoriesPage() {
  const { data: session } = useSession();
  const { selectedProjectId } = useAdmin();
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [postCounts, setPostCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BlogCategory | null>(null);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);

  const fetchCategories = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const response = await apiFetch(
        `${API_PATH}?projectId=${selectedProjectId}`,
      );
      if (!response.ok) throw new Error("Failed to load categories");
      const data = await response.json();
      setCategories(data.categories ?? []);
      const postsResponse = await apiFetch(
        `/api/admin/blogs?projectId=${selectedProjectId}`,
      );
      if (postsResponse.ok) {
        const postsData = await postsResponse.json();
        setPostCounts(
          (postsData.blogs ?? []).reduce(
            (
              counts: Record<string, number>,
              post: { categoryId?: string | null },
            ) => {
              if (post.categoryId)
                counts[post.categoryId] = (counts[post.categoryId] ?? 0) + 1;
              return counts;
            },
            {},
          ),
        );
      }
    } catch (error) {
      console.error("Error loading blog categories:", error);
      toast.error("Failed to load blog categories");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchCategories();
  }, [selectedProjectId]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };
  const openEdit = (category: BlogCategory) => {
    setEditing(category);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      image: category.image ?? "",
      sortOrder: category.sortOrder ?? 0,
      isActive: category.isActive ?? true,
    });
    setDialogOpen(true);
  };
  const save = async () => {
    if (!selectedProjectId || !form.name.trim() || !form.slug.trim()) {
      toast.error("Name and slug are required");
      return;
    }
    setSaving(true);
    try {
      const response = await apiFetch(API_PATH, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          name: form.name.trim(),
          slug: form.slug.trim(),
          projectId: selectedProjectId,
          ...(editing ? { id: editing.id } : {}),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error || "Failed to save category");
      toast.success(editing ? "Category updated" : "Category created");
      setDialogOpen(false);
      await fetchCategories();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save category",
      );
    } finally {
      setSaving(false);
    }
  };
  const remove = async (category: BlogCategory) => {
    if (!confirm(`Delete “${category.name}”?`)) return;
    try {
      const response = await apiFetch(API_PATH, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: category.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error || "Failed to delete category");
      toast.success("Category deleted");
      await fetchCategories();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete category",
      );
    }
  };

  const columns: DataTableColumn<BlogCategory>[] = [
    {
      header: "Category",
      accessor: "name",
      render: (category) => (
        <div>
          <div className="font-medium">{category.name}</div>
          {category.description && (
            <div className="mt-1 max-w-sm truncate text-sm text-neutral-500">
              {category.description}
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Slug",
      accessor: "slug",
      render: (category) => <code className="text-sm">/{category.slug}</code>,
    },
    {
      header: "Posts",
      accessor: "id",
      render: (category) => postCounts[category.id] ?? 0,
    },
    {
      header: "Order",
      accessor: "sortOrder",
      render: (category) => category.sortOrder ?? 0,
    },
    {
      header: "Status",
      accessor: "isActive",
      render: (category) => (category.isActive ? "Active" : "Inactive"),
    },
  ];
  const actions: DataTableActions<BlogCategory> = {
    primary: { icon: Edit, title: () => "Edit category", onClick: openEdit },
    menu: [{ icon: Trash2, label: "Delete", onClick: remove }],
  };

  if (!session || !selectedProjectId)
    return <div className="py-12 text-center text-neutral-500">Loading...</div>;
  return (
    <>
      <RecordTable
        title="Blog Categories"
        description="Organize posts into clear sections for readers."
        data={categories}
        columns={columns}
        loading={loading}
        primaryAction={{ label: "Add category", onClick: openCreate }}
        actions={actions}
        emptyState={{
          icon: FolderTree,
          message: "No categories yet",
          description: "Create a category to organize your blog posts.",
        }}
      />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit category" : "Add blog category"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="category-name">Name *</Label>
              <Input
                id="category-name"
                autoFocus
                value={form.name}
                onChange={(event) =>
                  setForm({
                    ...form,
                    name: event.target.value,
                    ...(editing
                      ? {}
                      : { slug: generateSlug(event.target.value) }),
                  })
                }
                placeholder="Guides"
              />
            </div>
            <div>
              <Label htmlFor="category-slug">Slug *</Label>
              <Input
                id="category-slug"
                value={form.slug}
                onChange={(event) =>
                  setForm({ ...form, slug: generateSlug(event.target.value) })
                }
                placeholder="guides"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Used in the category URL. Use lowercase letters, numbers, and
                hyphens.
              </p>
            </div>
            <div>
              <Label htmlFor="category-description">Description</Label>
              <Textarea
                id="category-description"
                value={form.description ?? ""}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                rows={3}
                placeholder="What readers will find in this category"
              />
            </div>
            <div>
              <Label htmlFor="category-image">Image URL</Label>
              <Input
                id="category-image"
                value={form.image ?? ""}
                onChange={(event) =>
                  setForm({ ...form, image: event.target.value })
                }
                placeholder="https://example.com/category.jpg"
              />
            </div>
            <div>
              <Label htmlFor="category-order">Display order</Label>
              <Input
                id="category-order"
                type="number"
                min="0"
                value={form.sortOrder ?? 0}
                onChange={(event) =>
                  setForm({
                    ...form,
                    sortOrder: Number(event.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="category-active">Visible to readers</Label>
              <Switch
                id="category-active"
                checked={form.isActive ?? true}
                onCheckedChange={(isActive) => setForm({ ...form, isActive })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving
                ? "Saving..."
                : editing
                  ? "Save changes"
                  : "Create category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
