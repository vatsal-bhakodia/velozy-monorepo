"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  ExternalLink,
  FileText,
  Paintbrush,
  Settings,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/src/lib/api";
import { getSiteStyleGuidance } from "@/src/onboard/constants/site-style";
import { useSession } from "@/src/lib/auth";
import { useAdmin } from "@/src/admin-context";
import Modal from "@/src/pages-modal";
import RecordTable, {
  type RecordFilter,
} from "@/components/admin/manage/record-table";
import type {
  DataTableActions,
  DataTableBulkAction,
  DataTableColumn,
} from "@/components/admin/manage/table";
import type { Page, PageFormData } from "@/src/lib/db/schema";

const API_PATH = "/api/admin/pages";

const INITIAL_FORM_DATA: PageFormData = {
  slug: "",
  title: "",
  metaTitle: "",
  metaKeyword: "",
  metaDescription: "",
  status: "draft",
};

export default function PagesPage() {
  const { data: session } = useSession();
  const { selectedProjectId } = useAdmin();
  const [pages, setPages] = useState<Page[]>([]);
  const [liveSiteUrl, setLiveSiteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string | number>>(
    new Set(),
  );
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<PageFormData>(INITIAL_FORM_DATA);

  const isEditing = Boolean(editingPage);

  useEffect(() => {
    if (selectedProjectId) void fetchPages();
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setLiveSiteUrl(null);
      return;
    }

    let active = true;
    setLiveSiteUrl(null);
    void apiFetch(`/api/admin/projects?projectId=${selectedProjectId}`)
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        if (active) setLiveSiteUrl(data.project?.publicUrl ?? null);
      })
      .catch((error) => {
        console.error("Error fetching live site URL:", error);
      });

    return () => {
      active = false;
    };
  }, [selectedProjectId]);

  const fetchPages = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const response = await apiFetch(
        `${API_PATH}?projectId=${selectedProjectId}`,
      );
      if (!response.ok) {
        toast.error("Failed to fetch pages");
        return;
      }
      const data = await response.json();
      setPages(data.pages || []);
    } catch (error) {
      console.error("Error fetching pages:", error);
      toast.error("Failed to fetch pages");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPage(null);
    setFormData(INITIAL_FORM_DATA);
  };

  const handleSubmit = async (overrideFormData?: PageFormData) => {
    const submitData = overrideFormData ?? formData;
    if (!submitData.slug || !submitData.title) {
      toast.error("Slug and title are required");
      return;
    }

    try {
      const response = await apiFetch(API_PATH, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEditing
            ? { id: editingPage?.id, ...submitData }
            : { ...submitData, projectId: selectedProjectId },
        ),
      });
      if (response.ok) {
        toast(
          submitData.status === "published"
            ? `Page ${isEditing ? "published" : "created & published"} successfully`
            : `Page ${isEditing ? "updated" : "created"} successfully`,
        );
        closeModal();
        void fetchPages();
      } else {
        const error = await response.json();
        toast.error(
          error.error || `Failed to ${isEditing ? "update" : "create"} page`,
        );
      }
    } catch (error) {
      console.error(
        `Error ${isEditing ? "updating" : "creating"} page:`,
        error,
      );
      toast.error(`Failed to ${isEditing ? "update" : "create"} page`);
    }
  };

  const openCreateModal = () => {
    setEditingPage(null);
    setFormData(INITIAL_FORM_DATA);
    setIsModalOpen(true);
  };

  const openEditModal = (page: Page) => {
    setEditingPage(page);
    setFormData({
      slug: page.slug,
      title: page.title,
      metaTitle: page.metaTitle || "",
      metaKeyword: page.metaKeyword || "",
      metaDescription: page.metaDescription || "",
      status: page.status || "draft",
    });
    setIsModalOpen(true);
  };

  const openBuilder = async (page: Page) => {
    let generating = false;
    if (!page.pageData && selectedProjectId) {
      try {
        const response = await apiFetch(
          `/api/admin/projects?projectId=${selectedProjectId}`,
        );
        if (!response.ok) throw new Error("Could not load project settings");
        const { project } = await response.json();
        const preference = project.designPreference;
        if (
          Array.isArray(preference?.sections) &&
          preference.sections.length &&
          preference.theme
        ) {
          sessionStorage.setItem(
            "generationPrompt",
            `My business name is ${project.name}, industry is ${project.industry || "general"}. ${preference.businessDescription || ""} ${getSiteStyleGuidance(preference.style)}.`,
          );
          sessionStorage.setItem(
            "siteSections",
            JSON.stringify(preference.sections),
          );
          sessionStorage.setItem(
            "selectedTheme",
            JSON.stringify(preference.theme),
          );
          sessionStorage.setItem("projectId", project.id);
          sessionStorage.setItem("pageId", page.id);
          generating = true;
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not open builder",
        );
        return;
      }
    }
    window.location.assign(
      `/page-builder?id=${encodeURIComponent(page.id)}${generating ? "&generating=true" : ""}`,
    );
  };

  const handleDeletePage = async (pageId: string) => {
    if (!confirm("Are you sure you want to delete this page?")) return;
    try {
      const response = await apiFetch(API_PATH, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pageId }),
      });
      if (response.ok) {
        toast("Page deleted successfully");
        void fetchPages();
      } else toast.error("Failed to delete page");
    } catch (error) {
      console.error("Error deleting page:", error);
      toast.error("Failed to delete page");
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedItems.size) return;
    if (
      !confirm(`Are you sure you want to delete ${selectedItems.size} pages?`)
    )
      return;
    try {
      const response = await apiFetch(`${API_PATH}/bulk`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedItems) }),
      });
      if (response.ok) {
        toast(`${selectedItems.size} pages deleted successfully`);
        setSelectedItems(new Set());
        void fetchPages();
      } else toast.error("Failed to delete pages");
    } catch (error) {
      console.error("Error deleting pages:", error);
      toast.error("Failed to delete pages");
    }
  };

  const handleBulkStatusUpdate = async (
    status: "published" | "draft" | "private",
  ) => {
    if (!selectedItems.size) return;
    try {
      const response = await apiFetch(`${API_PATH}/bulk`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedItems), status }),
      });
      if (response.ok) {
        toast(`${selectedItems.size} pages updated to ${status}`);
        setSelectedItems(new Set());
        void fetchPages();
      } else toast.error("Failed to update pages");
    } catch (error) {
      console.error("Error updating pages:", error);
      toast.error("Failed to update pages");
    }
  };

  const statusBadge = (status: string) => {
    const statusClasses = {
      published:
        "border-green-200 bg-green-50 text-green-800 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300",
      draft:
        "border-neutral-200 bg-white text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300",
      private:
        "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
    } as const;
    const color =
      statusClasses[status as keyof typeof statusClasses] ??
      statusClasses.draft;
    const label = status
      ? `${status[0].toUpperCase()}${status.slice(1)}`
      : "Draft";
    return (
      <span
        className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${color}`}
      >
        {label}
      </span>
    );
  };

  const columns: DataTableColumn<Page>[] = [
    {
      header: "Title",
      accessor: "title",
      render: (page) => (
        <div>
          <div className="font-medium text-neutral-900 dark:text-neutral-100">
            {page.title}
          </div>
          {page.metaDescription && (
            <div className="mt-1 max-w-xs truncate text-sm text-neutral-500 dark:text-neutral-400">
              {page.metaDescription}
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Slug",
      accessor: "slug",
      render: (page) => (
        <code className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
          /{page.slug}
        </code>
      ),
    },
    {
      header: "Status",
      accessor: "status",
      render: (page) => statusBadge(page.status ?? "draft"),
    },
    {
      header: "Last Modified",
      accessor: "updatedAt",
      render: (page) => (
        <div className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
          <Calendar className="mr-1 h-4 w-4" />
          {new Date(page.updatedAt).toLocaleDateString()}
        </div>
      ),
    },
  ];

  const pageFilters: RecordFilter<Page>[] = [
    { key: "title", label: "Title", placeholder: "Search by title..." },
    { key: "slug", label: "Slug", placeholder: "Search by slug..." },
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

  const pageActions: DataTableActions<Page> = {
    primary: {
      icon: Paintbrush,
      title: () => "Edit in Builder",
      onClick: openBuilder,
    },
    menu: [
      { icon: Paintbrush, label: "Edit in Builder", onClick: openBuilder },
      { icon: Settings, label: "Edit Settings", onClick: openEditModal },
      {
        icon: ExternalLink,
        label: "View live page",
        disabled: (page) => page.status !== "published" || !liveSiteUrl,
        onClick: (page) => {
          if (!liveSiteUrl) return;
          const pathname =
            page.slug === "home"
              ? "/"
              : `/${String(page.slug)
                  .split("/")
                  .map((segment) => encodeURIComponent(segment))
                  .join("/")}`;
          const url = new URL(pathname, liveSiteUrl);
          window.open(url.toString(), "_blank", "noopener,noreferrer");
        },
      },
      { separator: true },
      {
        icon: Trash2,
        label: "Delete",
        onClick: (page) => void handleDeletePage(page.id),
        className: "text-red-600 focus:text-red-600",
      },
    ],
  };

  const pageBulkActions: DataTableBulkAction<Page>[] = [
    {
      label: "Delete selected",
      variant: "destructive",
      onClick: handleBulkDelete,
    },
    ...(["published", "draft", "private"] as const).map((status) => ({
      label: `Mark as ${status[0].toUpperCase()}${status.slice(1)}`,
      onClick: () => handleBulkStatusUpdate(status),
    })),
  ];

  if (!session || !selectedProjectId) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        <p className="ml-4 text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <RecordTable<Page>
        title="Pages"
        description="Manage your website pages and content"
        data={pages}
        columns={columns}
        loading={loading}
        primaryAction={{ label: "Add page", onClick: openCreateModal }}
        filters={pageFilters}
        emptyState={{
          icon: FileText,
          message: "No pages found",
          description: "Try adjusting your filters",
        }}
        selection={{ enabled: true, selectedItems, setSelectedItems }}
        actions={pageActions}
        bulkActions={pageBulkActions}
      />
      <Modal
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        formData={formData}
        setFormData={setFormData}
        closeModal={closeModal}
        handleSubmit={handleSubmit}
        isEditing={isEditing}
      />
    </>
  );
}
