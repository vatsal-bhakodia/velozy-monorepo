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
  ShoppingBag,
  Settings,
  DollarSign,
  Package,
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

import { Products } from "@/src/lib/db/schema";

export default function ProductsPage() {
  const API_PATH = "/api/admin/products";
  const { data: session } = useSession();
  const { selectedProjectId } = useAdmin();
  const router = useRouter();

  // State
  const [products, setProducts] = useState<Products[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string | number>>(
    new Set<string | number>(),
  );

  // Effects
  useEffect(() => {
    if (selectedProjectId) {
      fetchProducts();
    }
  }, [selectedProjectId]);

  // API functions
  const fetchProducts = async () => {
    if (!selectedProjectId) return;

    setLoading(true);
    try {
      const response = await apiFetch(
        API_PATH + `?projectId=${selectedProjectId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      } else {
        toast.error("Failed to fetch products");
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const response = await apiFetch(API_PATH, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: productId }),
      });

      if (response.ok) {
        toast("Product deleted successfully");
        fetchProducts();
      } else {
        toast.error("Failed to delete product");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;

    if (
      !confirm(
        `Are you sure you want to delete ${selectedItems.size} products?`,
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
        toast(`${selectedItems.size} products deleted successfully`);
        setSelectedItems(new Set());
        fetchProducts();
      } else {
        toast.error("Failed to delete products");
      }
    } catch (error) {
      console.error("Error deleting products:", error);
      toast.error("Failed to delete products");
    }
  };

  const handleBulkStatusUpdate = async (
    status: "published" | "draft" | "private",
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
        toast(`${selectedItems.size} products updated to ${status}`);
        setSelectedItems(new Set());
        fetchProducts();
      } else {
        toast.error("Failed to update products");
      }
    } catch (error) {
      console.error("Error updating products:", error);
      toast.error("Failed to update products");
    }
  };

  // Navigation functions
  const openCreatePage = () => {
    router.push("/products/new");
  };

  // Utility functions
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      published:
        "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
      draft: "bg-gray-100 text-gray-800 dark:bg-neutral-700 dark:text-gray-300",
      private:
        "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
    } as const;

    const colorClass =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
      >
        {status?.charAt(0).toUpperCase() + status?.slice(1) || "Draft"}
      </span>
    );
  };

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return "—";
    return `$${price.toFixed(2)}`;
  };

  const columns: DataTableColumn<Products>[] = [
    {
      header: "Product",
      accessor: "name",
      render: (item) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {item.name}
            {item.isFeatured && (
              <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 px-2 py-0.5 rounded">
                Featured
              </span>
            )}
            {!item.isActive && (
              <span className="ml-2 text-xs bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 px-2 py-0.5 rounded">
                Inactive
              </span>
            )}
          </div>
          {item.shortDescription && (
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate max-w-xs">
              {item.shortDescription}
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Price",
      accessor: "price",
      render: (item) => (
        <div className="flex items-center text-sm font-medium text-gray-900 dark:text-gray-100">
          <DollarSign className="w-3 h-3 mr-1 text-green-500" />
          {formatPrice(item.price)}
        </div>
      ),
    },
    {
      header: "SKU",
      accessor: "sku",
      render: (item) => (
        <code className="text-sm bg-gray-100 dark:bg-neutral-700 px-2 py-1 rounded">
          {item.sku || "—"}
        </code>
      ),
    },
    {
      header: "Stock",
      accessor: "inventoryQuantity",
      render: (item) => {
        const isLowStock =
          (item.inventoryQuantity ?? 0) <= (item.lowStockThreshold ?? 5);
        return (
          <div className="flex items-center gap-1">
            <Package className="w-3 h-3" />
            <span
              className={`text-sm ${
                isLowStock
                  ? "text-red-600 dark:text-red-400 font-medium"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {item.inventoryQuantity ?? 0}
            </span>
          </div>
        );
      },
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

  const productFilters: RecordFilter<Products>[] = [
    { key: "name", label: "Product Name", placeholder: "Search by name..." },
    { key: "slug", label: "Slug", placeholder: "Search by slug..." },
    { key: "sku", label: "SKU", placeholder: "Search by SKU..." },
    {
      key: "shortDescription",
      label: "Description",
      placeholder: "Search by description...",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Published", value: "published" },
        { label: "Draft", value: "draft" },
        { label: "Private", value: "private" },
      ],
    },
  ];

  const productActions: DataTableActions<Products> = {
    primary: {
      icon: Edit,
      title: () => "Edit product",
      onClick: (item) => router.push(`/products/${item.id}`),
    },
    menu: [
      {
        icon: Settings,
        label: "Edit Product",
        onClick: (item) => router.push(`/products/${item.id}`),
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
        onClick: (item) => handleDeleteProduct(item.id),
        className: "text-red-600 focus:text-red-600",
      },
    ],
  };

  const productBulkActions: DataTableBulkAction<Products>[] = [
    {
      label: "Delete selected",
      variant: "destructive",
      onClick: async () => handleBulkDelete(),
    },
    {
      label: "Mark as Published",
      onClick: async () => handleBulkStatusUpdate("published"),
    },
    {
      label: "Mark as Draft",
      onClick: async () => handleBulkStatusUpdate("draft"),
    },
    {
      label: "Mark as Private",
      onClick: async () => handleBulkStatusUpdate("private"),
    },
  ];

  return (
    <RecordTable<Products>
      title="Products"
      description="Manage your products and inventory"
      data={products}
      columns={columns}
      loading={loading}
      primaryAction={{ label: "Add product", onClick: openCreatePage }}
      filters={productFilters}
      selection={{
        enabled: true,
        selectedItems,
        setSelectedItems,
      }}
      actions={productActions}
      bulkActions={productBulkActions}
      emptyState={{
        icon: ShoppingBag,
        message: "No products found",
        description: "Try adjusting your filters",
      }}
      headerActions={
        <CsvActions
          endpoint={`${API_PATH}/csv?projectId=${selectedProjectId}`}
          templateName="products"
          onImported={fetchProducts}
          templateHeaders={[
            "name",
            "slug",
            "shortDescription",
            "description",
            "price",
            "sku",
            "weight",
            "dimensions",
            "images",
            "categorySlug",
            "isActive",
            "isFeatured",
            "inventoryQuantity",
            "lowStockThreshold",
            "status",
          ]}
        />
      }
    />
  );
}
