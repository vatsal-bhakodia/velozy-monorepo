"use client";

import { apiFetch } from "@/src/lib/api";

import { useState, useEffect } from "react";
import { useSession } from "@/src/lib/auth";
import { useRouter, useParams } from "@/src/lib/navigation";
import { useAdmin } from "@/src/admin-context";
import { RotateCcw, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FieldHint, PageFrame } from "@/components/admin/frontend/page-frame";
import { TextEditor } from "@/components/textEditor";
import {
  ProductCategories,
  ProductCategoriesFormData,
} from "@/src/lib/db/schema";
import { generateSlug } from "@/src/lib/utils";
import { MediaPicker } from "@/components/admin/media-picker";

const INITIAL_FORM_DATA: Partial<ProductCategoriesFormData> = {
  name: "",
  heading: "",
  slug: "",
  description: "",
  metaTitle: "",
  metaKeywords: "",
  metaDescription: "",
  image: "",
  sortOrder: 0,
  isActive: true,
};

export default function EditCollectionPage() {
  const API_PATH = "/api/admin/product-categories";
  const { data: session } = useSession();
  const { selectedProjectId } = useAdmin();
  const router = useRouter();
  const params = useParams();
  const categoryIdParam = params?.slug as string;

  // Determine if we're in create or edit mode
  const isCreateMode = categoryIdParam === "new";
  const isEditMode = Boolean(!isCreateMode && categoryIdParam);

  // State
  const [loading, setLoading] = useState<boolean>(isEditMode);
  const [saving, setSaving] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [formData, setFormData] =
    useState<Partial<ProductCategoriesFormData>>(INITIAL_FORM_DATA);
  const [parentCategories, setParentCategories] = useState<ProductCategories[]>(
    [],
  );
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  // Fetch category by ID (only in edit mode)
  useEffect(() => {
    if (isEditMode && categoryIdParam && selectedProjectId) {
      fetchCategory();
    } else if (isCreateMode) {
      setFormData(INITIAL_FORM_DATA);
      setLoading(false);
    }
  }, [categoryIdParam, selectedProjectId, isEditMode, isCreateMode]);

  // Fetch parent categories
  useEffect(() => {
    if (selectedProjectId) {
      fetchParentCategories();
    }
  }, [selectedProjectId]);

  const fetchParentCategories = async () => {
    if (!selectedProjectId) return;
    try {
      const response = await apiFetch(
        `${API_PATH}?projectId=${selectedProjectId}`,
      );
      if (response.ok) {
        const data = await response.json();
        // Filter out current category from parent options
        const cats = (data.categories || []).filter(
          (c: ProductCategories) => c.id !== categoryIdParam,
        );
        setParentCategories(cats);
      }
    } catch (error) {
      console.error("Error fetching parent categories:", error);
    }
  };

  const fetchCategory = async () => {
    if (!categoryIdParam || !selectedProjectId) return;

    setLoading(true);
    try {
      const response = await apiFetch(
        `${API_PATH}/${categoryIdParam}?projectId=${selectedProjectId}`,
      );
      if (response.ok) {
        const data = await response.json();
        const category = data.category;
        setCategoryId(category.id);
        setSelectedParentId(category.parentId || "");
        setFormData({
          name: category.name,
          heading: category.heading || "",
          slug: category.slug,
          description: category.description || "",
          metaTitle: category.metaTitle || "",
          metaKeywords: category.metaKeywords || "",
          metaDescription: category.metaDescription || "",
          image: category.image || "",
          sortOrder: category.sortOrder ?? 0,
          isActive: category.isActive ?? true,
        });
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to fetch collection");
        router.push("/collections");
      }
    } catch (error) {
      console.error("Error fetching category:", error);
      toast.error("Failed to fetch collection");
      router.push("/collections");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.slug || !formData.name) {
      toast.error("Slug and name are required");
      return;
    }

    if (!selectedProjectId) {
      toast.error("Project ID is required");
      return;
    }

    setSaving(true);
    try {
      if (isCreateMode) {
        const response = await apiFetch(API_PATH, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            projectId: selectedProjectId,
            parentId: selectedParentId || null,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          toast.success("Collection created successfully");
          router.push(`/collections/${data.category.id}`);
        } else {
          const error = await response.json();
          toast.error(error.error || "Failed to create collection");
        }
      } else {
        if (!categoryId) {
          toast.error("Collection ID not found");
          setSaving(false);
          return;
        }

        const response = await apiFetch(API_PATH, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: categoryId,
            ...formData,
            parentId: selectedParentId || null,
          }),
        });

        if (response.ok) {
          toast.success("Collection updated successfully");
        } else {
          const error = await response.json();
          toast.error(error.error || "Failed to update collection");
        }
      }
    } catch (error) {
      console.error(
        `Error ${isCreateMode ? "creating" : "updating"} category:`,
        error,
      );
      toast.error(`Failed to ${isCreateMode ? "create" : "update"} collection`);
    } finally {
      setSaving(false);
    }
  };

  const generateSlugFromName = () => {
    setFormData({ ...formData, slug: generateSlug(formData.name || "") });
  };

  if (!session || !selectedProjectId) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (loading && isEditMode) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600 dark:text-gray-400">
          Loading collection...
        </p>
      </div>
    );
  }

  return (
    <>
      <PageFrame
        title={isCreateMode ? "Create Collection" : "Edit Collection"}
        description="Organize products into clear, easy-to-browse collections."
        headerAction={
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="h-10 shadow-sm"
          >
            {saving
              ? isCreateMode
                ? "Creating..."
                : "Saving..."
              : isCreateMode
                ? "Create Collection"
                : "Save Changes"}
          </Button>
        }
        aside={
          <div className="space-y-6 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 sm:p-6">
            <h2 className="text-lg font-semibold text-neutral-950 dark:text-neutral-50">
              Settings
            </h2>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive" className="cursor-pointer">
                  Active
                </Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive ?? true}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
              </div>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Inactive collections are hidden from your storefront.
              </p>
            </div>
            <div>
              <Label htmlFor="parentCollection">Parent Collection</Label>
              <FieldHint>Choose a parent to nest this collection.</FieldHint>
              <Select
                value={selectedParentId || "none"}
                onValueChange={(value) =>
                  setSelectedParentId(value === "none" ? "" : value)
                }
              >
                <SelectTrigger id="parentCollection">
                  <SelectValue placeholder="Select parent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Parent (Top Level)</SelectItem>
                  {parentCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sortOrder">Sort Order</Label>
              <FieldHint>Lower numbers appear before higher numbers.</FieldHint>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder ?? 0}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sortOrder: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="image">Collection Image</Label>
              <FieldHint>
                Choose an image from your media library or paste its URL below.
              </FieldHint>
              <button
                type="button"
                onClick={() => setMediaPickerOpen(true)}
                aria-label={
                  formData.image
                    ? "Replace collection image"
                    : "Choose collection image"
                }
                className="group relative mt-2 flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-md border border-dashed border-neutral-300 bg-neutral-50 text-neutral-500 transition-colors hover:border-neutral-400 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:bg-neutral-900"
              >
                {formData.image ? (
                  <>
                    <img
                      src={formData.image}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-neutral-950/70 px-3 py-2 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                      Replace image
                    </span>
                  </>
                ) : (
                  <span className="flex flex-col items-center gap-2 px-4 text-center">
                    <ImageIcon className="h-8 w-8" />
                    <span className="text-sm font-medium">Choose an image</span>
                    <span className="text-xs text-neutral-400">
                      Browse media library
                    </span>
                  </span>
                )}
              </button>
              <Input
                id="image"
                value={formData.image || ""}
                onChange={(e) =>
                  setFormData({ ...formData, image: e.target.value })
                }
                placeholder="https://example.com/image.jpg"
                className="mt-3"
              />
            </div>
          </div>
        }
      >
        <div className="admin-collection-editor min-w-0">
          <div className="space-y-7 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 sm:p-7">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <Label htmlFor="name">
                  Name <span className="text-red-500">*</span>
                </Label>
                <FieldHint>Use a clear name shoppers will recognize.</FieldHint>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Collection name"
                />
              </div>
              <div>
                <Label htmlFor="slug">
                  Slug <span className="text-red-500">*</span>
                </Label>
                <FieldHint>This appears in the collection URL.</FieldHint>
                <div className="flex gap-2">
                  <Input
                    id="slug"
                    value={formData.slug || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    placeholder="collection-url"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={generateSlugFromName}
                    title="Generate slug from name"
                    aria-label="Generate slug from name"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="heading">Page Heading (H1)</Label>
              <FieldHint>
                This heading appears at the top of the collection page. Leave
                blank to use the collection name.
              </FieldHint>
              <Input
                id="heading"
                maxLength={255}
                value={formData.heading || ""}
                onChange={(e) =>
                  setFormData({ ...formData, heading: e.target.value })
                }
                placeholder={formData.name || "Collection heading"}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <FieldHint>
                Describe the products customers will find here.
              </FieldHint>
              <TextEditor
                htmlContent={formData.description || ""}
                setHtmlContent={(description) =>
                  setFormData((current) => ({ ...current, description }))
                }
              />
            </div>
            <div className="border-t border-neutral-200 pt-6 dark:border-neutral-700">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                Search appearance
              </h2>
              <p className="mb-5 mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Customize how this collection may appear in search results.
              </p>
              <div className="space-y-5">
                <div>
                  <Label htmlFor="metaTitle">Meta Title</Label>
                  <FieldHint>Leave blank to use the collection name.</FieldHint>
                  <Input
                    id="metaTitle"
                    maxLength={255}
                    value={formData.metaTitle || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, metaTitle: e.target.value })
                    }
                    placeholder={formData.name || "Collection title"}
                  />
                </div>
                <div>
                  <Label htmlFor="metaKeywords">Meta Keywords</Label>
                  <FieldHint>Separate keywords with commas.</FieldHint>
                  <Input
                    id="metaKeywords"
                    value={formData.metaKeywords || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, metaKeywords: e.target.value })
                    }
                    placeholder="home, kitchen, storage"
                  />
                </div>
                <div>
                  <Label htmlFor="metaDescription">Meta Description</Label>
                  <FieldHint>
                    Write a concise summary for search results.
                  </FieldHint>
                  <Textarea
                    id="metaDescription"
                    value={formData.metaDescription || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        metaDescription: e.target.value,
                      })
                    }
                    placeholder="Describe this collection for search results."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageFrame>
      <MediaPicker
        projectId={selectedProjectId}
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(item) =>
          setFormData((current) => ({ ...current, image: item.url }))
        }
      />
    </>
  );
}
