"use client";

import { apiFetch } from "@/src/lib/api";
import { useAdmin } from "@/src/admin-context";
import RecordTable, {
  type RecordFilter,
} from "@/components/admin/manage/record-table";
import type {
  DataTableActions,
  DataTableColumn,
} from "@/components/admin/manage/table";
import { Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Customer = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
};

const avatarColors = [
  "bg-[#96245f] text-pink-100",
  "bg-[#669900] text-lime-50",
  "bg-[#4825a0] text-violet-100",
  "bg-[#1766ed] text-blue-50",
];

function initials(name: string | null) {
  const parts = (name || "Customer").trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function CustomersPage() {
  const { selectedProjectId, projects } = useAdmin();
  const projectName =
    projects.find((project) => project.id === selectedProjectId)?.name ||
    "our store";
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    if (!selectedProjectId) {
      setCustomers([]);
      setLoading(false);
      setLoadError(false);
      return () => {
        active = false;
      };
    }

    const fetchCustomers = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const response = await apiFetch(
          `/api/admin/customers?projectId=${selectedProjectId}`,
        );
        if (!response.ok) throw new Error("Failed to fetch customers");
        const result = await response.json();
        if (active) setCustomers(result.customers ?? []);
      } catch (error) {
        console.error("Error fetching customers:", error);
        if (active) {
          setLoadError(true);
          toast.error("Failed to fetch customers");
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchCustomers();
    return () => {
      active = false;
    };
  }, [reload, selectedProjectId]);

  const columns = useMemo<DataTableColumn<Customer>[]>(
    () => [
      {
        header: "Customer Name",
        accessor: "name",
        width: "250px",
        render: (customer) => {
          const name = customer.name || "Unnamed customer";
          const colorIndex =
            name
              .split("")
              .reduce((sum, character) => sum + character.charCodeAt(0), 0) %
            avatarColors.length;
          return (
            <div className="flex items-center gap-2.5">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-medium ${avatarColors[colorIndex]}`}
              >
                {initials(customer.name)}
              </span>
              <span className="truncate text-[13px] text-neutral-800 dark:text-neutral-200">
                {name}
              </span>
            </div>
          );
        },
      },
      {
        header: "Customer Id",
        accessor: "id",
        width: "240px",
        cellClassName:
          "max-w-[240px] truncate text-[13px] text-neutral-600 dark:text-neutral-400",
      },
      {
        header: "Email",
        accessor: "email",
        width: "230px",
        render: (customer) => (
          <span className="text-[13px] text-neutral-600 dark:text-neutral-400">
            {customer.email || "—"}
          </span>
        ),
      },
      {
        header: "Phone Number",
        accessor: "phone",
        width: "170px",
        render: (customer) => (
          <span className="text-[13px] text-neutral-600 dark:text-neutral-400">
            {customer.phone || "—"}
          </span>
        ),
      },
      {
        header: "Created At",
        accessor: "createdAt",
        width: "180px",
        render: (customer) => (
          <span className="whitespace-nowrap text-[13px] text-neutral-600 dark:text-neutral-400">
            {new Date(customer.createdAt).toLocaleDateString()}
          </span>
        ),
      },
    ],
    [],
  );

  const filters = useMemo<RecordFilter<Customer>[]>(
    () => [
      { key: "name", label: "Name", placeholder: "Search by name..." },
      {
        key: "email",
        label: "Email Address",
        placeholder: "Search by email...",
      },
    ],
    [],
  );

  const actions = useMemo<DataTableActions<Customer>>(
    () => ({
      header: "Invite",
      primary: {
        label: "Share Invite",
        disabled: (customer) => !customer.email,
        title: (customer) =>
          customer.email
            ? `Prepare invite for ${customer.email}`
            : "An email address is required to prepare an invite",
        onClick: (customer) => {
          if (!customer.email) return;
          const subject = `An invitation from ${projectName}`;
          const body = `Hi ${customer.name || "there"},\n\nYou’re invited to connect with ${projectName}.`;
          window.location.href = `mailto:${encodeURIComponent(customer.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        },
      },
      menu: [],
    }),
    [projectName],
  );

  return (
    <RecordTable<Customer>
      title="Customers"
      data={customers}
      columns={columns}
      filters={filters}
      dateRange="createdAt"
      dateRangeLabel="Created At"
      exportName="customers"
      actions={actions}
      loading={loading}
      emptyState={{
        icon: Users,
        message: loadError
          ? "Customers could not be loaded"
          : "No customers found",
        description: loadError
          ? "Try again to reload this project’s customers."
          : "Customers added to this project will appear here.",
      }}
      headerActions={
        loadError ? (
          <button
            className="text-xs text-neutral-600 underline underline-offset-4 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
            onClick={() => setReload((value) => value + 1)}
          >
            Try again
          </button>
        ) : undefined
      }
    />
  );
}
