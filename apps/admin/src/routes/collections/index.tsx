"use client";

import { apiFetch } from "@/src/lib/api";

import { useState, useEffect } from "react";
import { useSession } from "@/src/lib/auth";
import { useRouter } from "@/src/lib/navigation";
import { useAdmin } from "@/src/admin-context";
import {
  Edit,
  Eye,
  Trash2,
  Calendar,
  FolderTree,
  Settings,
  CheckCircle,
  XCircle,
} from "lucide-react";
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

import { ProductCategories } from "@/src/lib/db/schema";

export default function CollectionsPage() {
  const API_PATH = "/api/admin/product-categories";
  const { data: session } = useSession();
  const { selectedProjectId } = useAdmin();
  const router = useRouter();

  // State
  const [categories, setCategories] = useState<ProductCategories[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string | number>>(
    new Set<string | number>(),
  );

  // Effects
  useEffect(() => {
    if (selectedProjectId) {
      fetchCategories();
    }
  }, [selectedProjectId]);

  // API functions
  const fetchCategories = async () => {
    if (!selectedProjectId) return;

    setLoading(true);
    try {
      const response = await apiFetch(
        API_PATH + `?projectId=${selectedProjectId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      } else {
        toast.error("Failed to fetch collections");
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to fetch collections");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm("Are you sure you want to delete this collection?")) return;

    try {
      const response = await apiFetch(API_PATH, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: categoryId }),
      });

      if (response.ok) {
        toast("Collection deleted successfully");
        fetchCategories();
      } else {
        toast.error("Failed to delete collection");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete collection");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;

    if (
      !confirm(
        `Are you sure you want to delete ${selectedItems.size} collections?`,
      )
    )
      return;

    try {
      const response = await apiFetch(API_PATH + "/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedItems) }),
      });

      if (response.ok) {
        toast(`${selectedItems.size} collections deleted successfully`);
        setSelectedItems(new Set());
        fetchCategories();
      } else {
        toast.error("Failed to delete collections");
      }
    } catch (error) {
      console.error("Error deleting categories:", error);
      toast.error("Failed to delete collections");
    }
  };

  const handleBulkActiveUpdate = async (isActive: boolean) => {
    if (selectedItems.size === 0) return;

    try {
      const response = await apiFetch(API_PATH + "/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedItems),
          isActive,
        }),
      });

      if (response.ok) {
        toast(
          `${selectedItems.size} collections ${
            isActive ? "activated" : "deactivated"
          }`,
        );
        setSelectedItems(new Set());
        fetchCategories();
      } else {
        toast.error("Failed to update collections");
      }
    } catch (error) {
      console.error("Error updating categories:", error);
      toast.error("Failed to update collections");
    }
  };

  // Navigation functions
  const openCreatePage = () => {
    router.push("/collections/new");
  };

  const columns: DataTableColumn<ProductCategories>[] = [
    {
      header: "Collection",
      accessor: "name",
      render: (item) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {item.name}
          </div>
          {item.description && (
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate max-w-xs">
              {item.description}
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Slug",
      accessor: "slug",
      render: (item) => (
        <code className="text-sm bg-gray-100 dark:bg-neutral-700 px-2 py-1 rounded">
          /{item.slug}
        </code>
      ),
    },
    {
      header: "Sort Order",
      accessor: "sortOrder",
      render: (item) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {item.sortOrder ?? 0}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: "isActive",
      render: (item) =>
        item.isActive ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle className="w-3 h-3" /> Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
            <XCircle className="w-3 h-3" /> Inactive
          </span>
        ),
    },
    {
      header: "Last Modified",
      accessor: "updatedAt",
      render: (item) => (
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
          <Calendar className="w-4 h-4 mr-1" />
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

  const categoryFilters: RecordFilter<ProductCategories>[] = [
    { key: "name", label: "Name", placeholder: "Search by name..." },
    { key: "slug", label: "Slug", placeholder: "Search by slug..." },
    {
      key: "description",
      label: "Description",
      placeholder: "Search by description...",
    },
    {
      key: "isActive",
      label: "Status",
      type: "select",
      options: [
        { label: "Active", value: "true" },
        { label: "Inactive", value: "false" },
      ],
    },
  ];

  const categoryActions: DataTableActions<ProductCategories> = {
    primary: {
      icon: Edit,
      title: () => "Edit collection",
      onClick: (item) => router.push(`/collections/${item.id}`),
    },
    menu: [
      {
        icon: Settings,
        label: "Edit Collection",
        onClick: (item) => router.push(`/collections/${item.id}`),
      },
      {
        icon: Eye,
        label: "Preview",
        onClick: (item) => alert(`Preview: ${item.name}`),
      },
      { separator: true },
      {
        icon: Trash2,
        label: "Delete",
        onClick: (item) => handleDeleteCategory(item.id),
        className: "text-red-600 focus:text-red-600",
      },
    ],
  };

  const categoryBulkActions: DataTableBulkAction<ProductCategories>[] = [
    {
      label: "Delete selected",
      variant: "destructive",
      onClick: handleBulkDelete,
    },
    { label: "Activate", onClick: () => handleBulkActiveUpdate(true) },
    { label: "Deactivate", onClick: () => handleBulkActiveUpdate(false) },
  ];

  return (
    <RecordTable<ProductCategories>
      title="Collections"
      description="Group related products into browsable collections."
      data={categories}
      columns={columns}
      loading={loading}
      primaryAction={{ label: "Add collection", onClick: openCreatePage }}
      filters={categoryFilters}
      emptyState={{
        icon: FolderTree,
        message: "No collections found",
        description: "Try adjusting your filters",
      }}
      selection={{ enabled: true, selectedItems, setSelectedItems }}
      actions={categoryActions}
      bulkActions={categoryBulkActions}
      headerActions={
        <CsvActions
          endpoint={`${API_PATH}/csv?projectId=${selectedProjectId}`}
          templateName="collections"
          onImported={fetchCategories}
          templateHeaders={[
            "name",
            "heading",
            "slug",
            "description",
            "metaTitle",
            "metaKeywords",
            "metaDescription",
            "image",
            "parentSlug",
            "sortOrder",
            "isActive",
          ]}
        />
      }
    />
  );
}
