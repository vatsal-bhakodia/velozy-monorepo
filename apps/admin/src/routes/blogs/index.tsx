"use client";

import { apiFetch } from "@/src/lib/api";

import { useState, useEffect } from "react";
import { useSession } from "@/src/lib/auth";
import { useRouter } from "@/src/lib/navigation";
import { useAdmin } from "@/src/admin-context";
import { Edit, Eye, Trash2, Calendar, FileText, Settings } from "lucide-react";
import { toast } from "sonner";
import CsvActions from "@/components/admin/manage/csv-actions";
import RecordTable, {
  type RecordFilter,
} from "@/components/admin/manage/record-table";
import type {
  DataTableActions,
  DataTableBulkAction,
  DataTableColumn,
} from "@/components/admin/manage/table";

import { Blogs } from "@/src/lib/db/schema";

type BlogCategory = { id: string; name: string };

export default function BlogsPage() {
  const API_PATH = "/api/admin/blogs";
  const { data: session } = useSession();
  const { selectedProjectId } = useAdmin();
  const router = useRouter();

  // State
  const [blogs, setBlogs] = useState<Blogs[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string | number>>(
    new Set<string | number>(),
  );

  // Effects
  useEffect(() => {
    if (selectedProjectId) {
      fetchBlogs();
      apiFetch(`/api/admin/blog-categories?projectId=${selectedProjectId}`)
        .then(async (response) => {
          if (!response.ok) throw new Error("Failed to fetch blog categories");
          const data = await response.json();
          setCategories(data.categories || []);
        })
        .catch((error) => {
          console.error("Error fetching blog categories:", error);
          toast.error("Failed to fetch blog categories");
        });
    }
  }, [selectedProjectId]);

  // API functions
  const fetchBlogs = async () => {
    if (!selectedProjectId) return;

    setLoading(true);
    try {
      const response = await apiFetch(
        API_PATH + `?projectId=${selectedProjectId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setBlogs(data.blogs || []);
      } else {
        toast.error("Failed to fetch blogs");
      }
    } catch (error) {
      console.error("Error fetching blogs:", error);
      toast.error("Failed to fetch blogs");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBlog = async (blogId: string) => {
    if (!confirm("Are you sure you want to delete this blog?")) return;

    try {
      const response = await apiFetch(API_PATH, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: blogId }),
      });

      if (response.ok) {
        toast("Blog deleted successfully");
        fetchBlogs();
      } else {
        toast.error("Failed to delete blog");
      }
    } catch (error) {
      console.error("Error deleting blog:", error);
      toast.error("Failed to delete blog");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;

    if (
      !confirm(`Are you sure you want to delete ${selectedItems.size} blogs?`)
    )
      return;

    try {
      const response = await apiFetch(API_PATH + "/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedItems) }),
      });

      if (response.ok) {
        toast(`${selectedItems.size} blogs deleted successfully`);
        setSelectedItems(new Set());
        fetchBlogs();
      } else {
        toast.error("Failed to delete blogs");
      }
    } catch (error) {
      console.error("Error deleting blogs:", error);
      toast.error("Failed to delete blogs");
    }
  };

  const handleBulkStatusUpdate = async (
    status: "published" | "draft" | "archived",
  ) => {
    if (selectedItems.size === 0) return;

    try {
      const response = await apiFetch(API_PATH + "/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedItems),
          status,
        }),
      });

      if (response.ok) {
        toast(`${selectedItems.size} blogs updated to ${status}`);
        setSelectedItems(new Set());
        fetchBlogs();
      } else {
        toast.error("Failed to update blogs");
      }
    } catch (error) {
      console.error("Error updating blogs:", error);
      toast.error("Failed to update blogs");
    }
  };

  // Navigation functions
  const openCreatePage = () => {
    router.push("/blogs/new");
  };

  // Utility functions
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      published:
        "border border-green-200 bg-green-50 text-green-800 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300",
      draft:
        "border border-neutral-200 bg-white text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300",
      archived:
        "border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
    } as const;

    const colorClass =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return (
      <span
        className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${colorClass}`}
      >
        {status?.charAt(0).toUpperCase() + status?.slice(1) || "Draft"}
      </span>
    );
  };

  const columns: DataTableColumn<Blogs>[] = [
    {
      header: "Title",
      accessor: "title",
      render: (item) => (
        <div>
          <div className="font-medium text-neutral-900 dark:text-neutral-100">
            {item.title}
            {item.isFeatured && (
              <span className="ml-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                Featured
              </span>
            )}
          </div>
          {item.excerpt && (
            <div className="mt-1 max-w-xs truncate text-sm text-neutral-500 dark:text-neutral-400">
              {item.excerpt}
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Slug",
      accessor: "slug",
      render: (item) => (
        <code className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
          /{item.slug}
        </code>
      ),
    },
    {
      header: "Category",
      accessor: "categoryId",
      render: (item) =>
        categories.find((category) => category.id === item.categoryId)?.name ??
        "Uncategorized",
    },
    {
      header: "Status",
      accessor: "status",
      render: (item) => getStatusBadge(item.status ?? "draft"),
    },
    {
      header: "Last Modified",
      accessor: "updatedAt",
      render: (item) => (
        <div className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
          <Calendar className="mr-1 h-4 w-4" />
          {new Date(item.updatedAt).toLocaleDateString()}
        </div>
      ),
    },
  ];

  if (!session || !selectedProjectId) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  const blogFilters: RecordFilter<Blogs>[] = [
    { key: "title", label: "Title", placeholder: "Search by title..." },
    { key: "slug", label: "Slug", placeholder: "Search by slug..." },
    { key: "excerpt", label: "Excerpt", placeholder: "Search by excerpt..." },
    {
      key: "categoryId",
      label: "Category",
      type: "select",
      options: [
        { label: "Uncategorized", value: "" },
        ...categories.map((category) => ({
          label: category.name,
          value: category.id,
        })),
      ],
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Published", value: "published" },
        { label: "Draft", value: "draft" },
        { label: "Archived", value: "archived" },
      ],
    },
  ];

  const blogActions: DataTableActions<Blogs> = {
    primary: {
      icon: Edit,
      title: () => "Edit blog",
      onClick: (item) => router.push(`/blogs/${item.id}`),
    },
    menu: [
      {
        icon: Settings,
        label: "Edit Settings",
        onClick: (item) => router.push(`/blogs/${item.id}`),
      },
      {
        icon: Eye,
        label: "Preview",
        onClick: (item) => alert(`Preview: ${item.title}`),
      },
      { separator: true },
      {
        icon: Trash2,
        label: "Delete",
        onClick: (item) => handleDeleteBlog(item.id),
        className: "text-red-600 focus:text-red-600",
      },
    ],
  };

  const blogBulkActions: DataTableBulkAction<Blogs>[] = [
    {
      label: "Delete selected",
      variant: "destructive",
      onClick: handleBulkDelete,
    },
    ...(["published", "draft", "archived"] as const).map((status) => ({
      label: `Mark as ${status[0].toUpperCase()}${status.slice(1)}`,
      onClick: () => handleBulkStatusUpdate(status),
    })),
  ];

  return (
    <RecordTable<Blogs>
      title="Blogs"
      description="Manage your blog posts and content"
      data={blogs}
      columns={columns}
      loading={loading}
      primaryAction={{ label: "Add blog", onClick: openCreatePage }}
      filters={blogFilters}
      emptyState={{
        icon: FileText,
        message: "No blogs found",
        description: "Try adjusting your filters",
      }}
      selection={{ enabled: true, selectedItems, setSelectedItems }}
      actions={blogActions}
      bulkActions={blogBulkActions}
      headerActions={
        <CsvActions
          endpoint={`${API_PATH}/csv?projectId=${selectedProjectId}`}
          templateName="blogs"
          onImported={fetchBlogs}
          templateHeaders={[
            "title",
            "slug",
            "excerpt",
            "content",
            "featuredImage",
            "categorySlug",
            "tags",
            "metaTitle",
            "metaDescription",
            "metaKeywords",
            "status",
            "isFeatured",
          ]}
        />
      }
    />
  );
}
