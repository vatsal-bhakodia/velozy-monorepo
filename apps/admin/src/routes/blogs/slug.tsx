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
import { Blogs, BlogsFormData } from "@/src/lib/db/schema";
import { generateSlug } from "@/src/lib/utils";
import { MediaPicker } from "@/components/admin/media-picker";

type BlogCategory = { id: string; name: string; isActive: boolean | null };

const INITIAL_FORM_DATA: Partial<BlogsFormData> = {
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  featuredImage: "",
  metaTitle: "",
  metaKeywords: "",
  metaDescription: "",
  status: "draft",
  isFeatured: false,
  categoryId: null,
  tags: [],
};

export default function EditBlogPage() {
  const API_PATH = "/api/admin/blogs";
  const { data: session } = useSession();
  const { selectedProjectId } = useAdmin();
  const router = useRouter();
  const params = useParams();
  const blogIdParam = params?.slug as string;

  // Determine if we're in create or edit mode
  const isCreateMode = blogIdParam === "new";
  const isEditMode = Boolean(!isCreateMode && blogIdParam);

  // State
  const [loading, setLoading] = useState<boolean>(isEditMode);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [blogId, setBlogId] = useState<string | null>(null);
  const [formData, setFormData] =
    useState<Partial<BlogsFormData>>(INITIAL_FORM_DATA);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [categories, setCategories] = useState<BlogCategory[]>([]);

  useEffect(() => {
    if (!selectedProjectId) return;
    apiFetch(`/api/admin/blog-categories?projectId=${selectedProjectId}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to fetch blog categories");
        const data = await response.json();
        setCategories(data.categories || []);
      })
      .catch((error) => {
        console.error("Error fetching blog categories:", error);
        toast.error("Failed to load blog categories");
      });
  }, [selectedProjectId]);

  // Fetch blog by ID (only in edit mode)
  useEffect(() => {
    if (isEditMode && blogIdParam && selectedProjectId) {
      fetchBlog();
    } else if (isCreateMode) {
      // Reset form for create mode
      setFormData(INITIAL_FORM_DATA);
      setLoading(false);
    }
  }, [blogIdParam, selectedProjectId, isEditMode, isCreateMode]);

  const fetchBlog = async () => {
    if (!blogIdParam || !selectedProjectId) return;

    setLoading(true);
    try {
      const response = await apiFetch(
        `${API_PATH}/${blogIdParam}?projectId=${selectedProjectId}`,
      );
      if (response.ok) {
        const data = await response.json();
        const blog = data.blog;
        setBlogId(blog.id);
        setFormData({
          slug: blog.slug,
          title: blog.title,
          excerpt: blog.excerpt || "",
          content: blog.content || "",
          featuredImage: blog.featuredImage || "",
          metaTitle: blog.metaTitle || "",
          metaKeywords: blog.metaKeywords || "",
          metaDescription: blog.metaDescription || "",
          status:
            (blog.status as "published" | "draft" | "archived") || "draft",
          isFeatured: blog.isFeatured || false,
          categoryId: blog.categoryId || null,
          tags: Array.isArray(blog.tags) ? blog.tags : [],
        });
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to fetch blog");
        router.push("/blogs");
      }
    } catch (error) {
      console.error("Error fetching blog:", error);
      toast.error("Failed to fetch blog");
      router.push("/blogs");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (overrides?: Partial<BlogsFormData>) => {
    const submitData = { ...formData, ...overrides };

    if (!submitData.slug || !submitData.title) {
      toast.error("Slug and title are required");
      return;
    }

    if (!selectedProjectId) {
      toast.error("Project ID is required");
      return;
    }

    setSaving(true);
    try {
      if (isCreateMode) {
        // Create new blog
        const response = await apiFetch(API_PATH, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...submitData,
            projectId: selectedProjectId,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          toast.success(
            submitData.status === "published"
              ? "Blog published successfully"
              : "Blog created successfully",
          );
          // Redirect to edit page with the blog ID
          router.push(`/blogs/${data.blog.id}`);
        } else {
          const error = await response.json();
          toast.error(error.error || "Failed to create blog");
        }
      } else {
        // Update existing blog
        if (!blogId) {
          toast.error("Blog ID not found");
          setSaving(false);
          return;
        }

        const response = await apiFetch(API_PATH, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: blogId, ...submitData }),
        });

        if (response.ok) {
          toast.success(
            submitData.status === "published"
              ? "Blog published successfully"
              : "Blog updated successfully",
          );
          if (submitData.status === "published") {
            setFormData((prev) => ({ ...prev, status: "published" }));
          }
          // No redirect needed since we're using ID in the URL
        } else {
          const error = await response.json();
          toast.error(error.error || "Failed to update blog");
        }
      }
    } catch (error) {
      console.error(
        `Error ${isCreateMode ? "creating" : "updating"} blog:`,
        error,
      );
      toast.error(`Failed to ${isCreateMode ? "create" : "update"} blog`);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (publishing || saving) return;
    setPublishing(true);
    try {
      await handleSubmit({ status: "published" });
    } finally {
      setPublishing(false);
    }
  };

  const generateSlugFromTitle = () => {
    setFormData({ ...formData, slug: generateSlug(formData.title || "") });
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
        <p className="ml-4 text-gray-600 dark:text-gray-400">Loading blog...</p>
      </div>
    );
  }

  return (
    <>
      <PageFrame
        title={isCreateMode ? "Create New Blog Post" : "Edit Blog Post"}
        description="Write your post, add search details, and manage its publishing settings."
        headerAction={
          <>
            <Button
              variant="outline"
              disabled={saving || publishing}
              onClick={() => handleSubmit({ status: "draft" })}
              className="h-10 bg-neutral-100 px-4 text-neutral-800 shadow-sm dark:bg-neutral-800 dark:text-neutral-100"
            >
              {saving && formData.status !== "published"
                ? "Saving..."
                : "Save as Draft"}
            </Button>
            {(formData.status || "draft") !== "published" ? (
              <Button
                disabled={saving || publishing}
                onClick={handlePublish}
                className="h-10 shadow-sm"
              >
                {publishing ? "Publishing..." : "Publish"}
              </Button>
            ) : (
              <Button
                disabled={saving || publishing}
                onClick={() => handleSubmit()}
                className="h-10 shadow-sm"
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </>
        }
        aside={
          <div className="space-y-6 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 sm:p-6">
            <h2 className="text-lg font-semibold text-neutral-950 dark:text-neutral-50">
              Settings
            </h2>
            <div>
              <Label htmlFor="status">Status</Label>
              <FieldHint>
                Choose whether the post is a draft, published, or archived.
              </FieldHint>
              <Select
                value={formData.status || "draft"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    status: value as "published" | "draft" | "archived",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <FieldHint>Group this post with related articles.</FieldHint>
              <Select
                value={formData.categoryId || "none"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    categoryId: value === "none" ? null : value,
                  })
                }
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Uncategorized</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categories.length === 0 && (
                <p className="mt-2 text-xs text-neutral-500">
                  Add categories from Blogs → Categories.
                </p>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isFeatured" className="cursor-pointer">
                  Featured Post
                </Label>
                <Switch
                  id="isFeatured"
                  checked={formData.isFeatured || false}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isFeatured: checked })
                  }
                />
              </div>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Highlight this post in featured sections.
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="featuredImage">Featured Image</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMediaPickerOpen(true)}
                >
                  Choose image
                </Button>
              </div>
              <FieldHint>
                Choose an image from your media library or paste its URL.
              </FieldHint>
              <Input
                id="featuredImage"
                value={formData.featuredImage || ""}
                onChange={(e) =>
                  setFormData({ ...formData, featuredImage: e.target.value })
                }
                placeholder="https://example.com/image.jpg"
              />
              <div className="mt-3 overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-700">
                {formData.featuredImage ? (
                  <img
                    src={formData.featuredImage}
                    alt="Featured image preview"
                    className="h-40 w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="flex h-40 flex-col items-center justify-center text-neutral-400">
                    <ImageIcon className="mb-2 h-8 w-8" />
                    <p className="text-sm">No image selected</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        }
      >
        <div className="admin-blog-editor min-w-0">
          <div className="space-y-7 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 sm:p-7">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <Label htmlFor="title">
                  Title <span className="text-red-500">*</span>
                </Label>
                <FieldHint>
                  Use a clear title that tells readers what the post is about.
                </FieldHint>
                <Input
                  id="title"
                  value={formData.title || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Blog post title"
                />
              </div>
              <div>
                <Label htmlFor="slug">
                  Slug <span className="text-red-500">*</span>
                </Label>
                <FieldHint>
                  This becomes the post URL. Use lowercase letters and hyphens.
                </FieldHint>
                <div className="flex gap-2">
                  <Input
                    id="slug"
                    value={formData.slug || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    placeholder="blog-post-url"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={generateSlugFromTitle}
                    title="Generate slug from title"
                    aria-label="Generate slug from title"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="excerpt">Excerpt</Label>
              <FieldHint>
                Add a short summary for post listings and search previews.
              </FieldHint>
              <Textarea
                id="excerpt"
                value={formData.excerpt || ""}
                onChange={(e) =>
                  setFormData({ ...formData, excerpt: e.target.value })
                }
                placeholder="Brief summary of the blog post"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="tags">Tags</Label>
              <FieldHint>
                Separate tags with commas to help readers find related posts.
              </FieldHint>
              <Input
                id="tags"
                value={
                  Array.isArray(formData.tags) ? formData.tags.join(", ") : ""
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    tags: e.target.value
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="Guides, updates, tips"
              />
            </div>
            <div>
              <Label htmlFor="content">Content</Label>
              <FieldHint>
                Write the full post content shown to readers.
              </FieldHint>
              <TextEditor
                htmlContent={formData.content || ""}
                setHtmlContent={(content: string) =>
                  setFormData({ ...formData, content })
                }
              />
            </div>
            <div className="border-t border-neutral-200 pt-6 dark:border-neutral-700">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                Search preview
              </h2>
              <p className="mt-1 mb-5 text-xs text-neutral-500 dark:text-neutral-400">
                Control how this post appears in search results.
              </p>
              <div className="space-y-5">
                <div>
                  <Label htmlFor="metaTitle">Meta Title</Label>
                  <FieldHint>Leave blank to use the post title.</FieldHint>
                  <Input
                    id="metaTitle"
                    value={formData.metaTitle || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, metaTitle: e.target.value })
                    }
                    placeholder="SEO title"
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
                    placeholder="keyword1, keyword2, keyword3"
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
                    placeholder="Brief description for search engines"
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
          setFormData((current) => ({ ...current, featuredImage: item.url }))
        }
      />
    </>
  );
}
