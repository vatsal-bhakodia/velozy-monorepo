"use client";

import { apiFetch } from "@/src/lib/api";
import { useAdmin } from "@/src/admin-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DataTable from "@/components/admin/manage/table";
import type {
  DataTableActions,
  DataTableColumn,
} from "@/components/admin/manage/table";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ArrowRightLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  MapPin,
  Package,
  Plus,
  RotateCw,
  Search,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  PageFrame,
  PageTabs,
  SectionCard,
  StatStrip,
  StatusPill,
} from "./page-frame";

type Location = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  active: boolean;
  isDefault: boolean;
};
type ProductBalance = {
  id: string;
  name: string;
  sku: string | null;
  trackInventory: boolean;
  lowStockThreshold: number | null;
  totalQuantity: number | null;
  locationQuantity: number;
};
type Movement = {
  id: string;
  productId: string | null;
  locationId: string | null;
  productName: string | null;
  productSku: string | null;
  locationName: string | null;
  quantityChange: number;
  reason: string;
  createdAt: string;
};
type CursorPage<T> = {
  items: T[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
};
type LocationForm = {
  name: string;
  code: string;
  address: string;
  active: boolean;
};
const PAGE_SIZE = 50;
const emptyForm: LocationForm = {
  name: "",
  code: "",
  address: "",
  active: true,
};
const selectClass =
  "mt-2 h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm dark:border-neutral-600 dark:bg-neutral-800";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await apiFetch(path, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Request failed");
  return body as T;
}

function useDebouncedValue(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value.trim()), delay);
    return () => window.clearTimeout(timeout);
  }, [delay, value]);
  return debounced;
}

function CursorPager({
  page,
  total,
  hasMore,
  onPrevious,
  onNext,
}: {
  page: number;
  total: number;
  hasMore: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-3 text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
      <span>
        Page {page} · {total.toLocaleString()} matching records · {PAGE_SIZE}{" "}
        per page
      </span>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onPrevious}
          disabled={page <= 1}
        >
          <ChevronLeft className="mr-1 h-4 w-4" /> Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={!hasMore}
        >
          Next <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function InventoryLocationsPageContent() {
  const { selectedProjectId } = useAdmin();
  const activeProject = useRef(selectedProjectId);
  activeProject.current = selectedProjectId;

  const [locations, setLocations] = useState<Location[]>([]);
  const [locationsProjectId, setLocationsProjectId] = useState<string | null>(
    null,
  );
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [locationsError, setLocationsError] = useState("");
  const [locationsRetry, setLocationsRetry] = useState(0);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [movementLocationId, setMovementLocationId] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [locationPage, setLocationPage] = useState(1);
  const [locationDialog, setLocationDialog] = useState<string | null>(null);
  const [locationForm, setLocationForm] = useState<LocationForm>(emptyForm);
  const [locationFormError, setLocationFormError] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locationRevision, setLocationRevision] = useState(0);

  const [balancePage, setBalancePage] = useState<CursorPage<ProductBalance>>({
    items: [],
    total: 0,
    hasMore: false,
    nextCursor: null,
  });
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState("");
  const [balanceRetry, setBalanceRetry] = useState(0);
  const [productSearch, setProductSearch] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const debouncedProductSearch = useDebouncedValue(productSearch);
  const [productCursors, setProductCursors] = useState<Array<string | null>>([
    null,
  ]);
  const [balanceRevision, setBalanceRevision] = useState(0);

  const [movementPage, setMovementPage] = useState<CursorPage<Movement>>({
    items: [],
    total: 0,
    hasMore: false,
    nextCursor: null,
  });
  const [movementLoading, setMovementLoading] = useState(false);
  const [movementError, setMovementError] = useState("");
  const [movementRetry, setMovementRetry] = useState(0);
  const [movementSearch, setMovementSearch] = useState("");
  const debouncedMovementSearch = useDebouncedValue(movementSearch);
  const [movementCursors, setMovementCursors] = useState<Array<string | null>>([
    null,
  ]);
  const [movementRevision, setMovementRevision] = useState(0);

  const [stockDialog, setStockDialog] = useState<ProductBalance | null>(null);
  const [stockQuantity, setStockQuantity] = useState("");
  const [stockReason, setStockReason] = useState("");
  const [transferFromId, setTransferFromId] = useState("");
  const [transferToId, setTransferToId] = useState("");
  const [transferSearch, setTransferSearch] = useState("");
  const debouncedTransferSearch = useDebouncedValue(transferSearch);
  const [transferProducts, setTransferProducts] = useState<ProductBalance[]>(
    [],
  );
  const [transferProduct, setTransferProduct] = useState<ProductBalance | null>(
    null,
  );
  const [transferProductsLoading, setTransferProductsLoading] = useState(false);
  const [transferProductsError, setTransferProductsError] = useState("");
  const [transferPickerOpen, setTransferPickerOpen] = useState(false);
  const [transferQuantity, setTransferQuantity] = useState("");
  const [transferReason, setTransferReason] = useState("");

  const loadLocations = useCallback(async () => {
    if (!selectedProjectId) {
      setLocations([]);
      setLocationsProjectId(null);
      setSelectedLocationId("");
      setMovementLocationId("");
      setLocationsLoading(false);
      return;
    }
    setLocationsLoading(true);
    setLocationsError("");
    try {
      const data = await request<{ locations: Location[] }>(
        `/api/admin/inventory-locations?projectId=${encodeURIComponent(selectedProjectId)}`,
      );
      if (activeProject.current !== selectedProjectId) return;
      setLocations(data.locations ?? []);
      setLocationsProjectId(selectedProjectId);
      const activeLocations = data.locations.filter(
        (location) => location.active,
      );
      const defaultLocation =
        activeLocations.find((location) => location.isDefault) ??
        activeLocations[0];
      setSelectedLocationId((current) =>
        data.locations.some(
          (location) => location.id === current && location.active,
        )
          ? current
          : (defaultLocation?.id ?? ""),
      );
      setMovementLocationId((current) =>
        current && data.locations.some((location) => location.id === current)
          ? current
          : (defaultLocation?.id ?? ""),
      );
      setTransferFromId((current) =>
        data.locations.some((location) => location.id === current)
          ? current
          : (defaultLocation?.id ?? ""),
      );
      setTransferToId("");
    } catch (error) {
      if (activeProject.current !== selectedProjectId) return;
      setLocationsError(
        error instanceof Error ? error.message : "Could not load locations",
      );
    } finally {
      if (activeProject.current === selectedProjectId)
        setLocationsLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    setLocations([]);
    setLocationsProjectId(null);
    setSelectedLocationId("");
    setMovementLocationId("");
    setProductSearch("");
    setInStockOnly(false);
    setMovementSearch("");
    setProductCursors([null]);
    setMovementCursors([null]);
    setLocationDialog(null);
    setStockDialog(null);
    setTransferProduct(null);
    setTransferProducts([]);
    setTransferSearch("");
    setTransferQuantity("");
    setTransferReason("");
  }, [loadLocations]);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations, locationsRetry, locationRevision]);

  const selectedLocation =
    locationsProjectId === selectedProjectId
      ? (locations.find((location) => location.id === selectedLocationId) ??
        null)
      : null;
  const productCursor = productCursors.at(-1) ?? undefined;
  const movementCursor = movementCursors.at(-1) ?? undefined;

  useEffect(() => {
    if (
      !selectedProjectId ||
      !selectedLocationId ||
      locationsProjectId !== selectedProjectId
    ) {
      setBalancePage({ items: [], total: 0, hasMore: false, nextCursor: null });
      setBalanceLoading(false);
      return;
    }
    let active = true;
    setBalanceLoading(true);
    setBalanceError("");
    const params = new URLSearchParams({
      projectId: selectedProjectId,
      locationId: selectedLocationId,
      limit: String(PAGE_SIZE),
      search: debouncedProductSearch,
    });
    if (inStockOnly) params.set("inStockOnly", "true");
    if (productCursor) params.set("cursor", productCursor);
    request<CursorPage<ProductBalance>>(
      `/api/admin/inventory-balances?${params}`,
    )
      .then((page) => {
        if (active) setBalancePage(page);
      })
      .catch((error) => {
        if (active)
          setBalanceError(
            error instanceof Error ? error.message : "Could not load stock",
          );
      })
      .finally(() => {
        if (active) setBalanceLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    selectedProjectId,
    selectedLocationId,
    locationsProjectId,
    debouncedProductSearch,
    inStockOnly,
    productCursor,
    balanceRetry,
    balanceRevision,
  ]);

  useEffect(() => {
    if (!selectedProjectId || locationsProjectId !== selectedProjectId) {
      setMovementPage({
        items: [],
        total: 0,
        hasMore: false,
        nextCursor: null,
      });
      setMovementLoading(false);
      return;
    }
    let active = true;
    setMovementLoading(true);
    setMovementError("");
    const params = new URLSearchParams({
      projectId: selectedProjectId,
      limit: String(PAGE_SIZE),
      search: debouncedMovementSearch,
    });
    if (movementLocationId) params.set("locationId", movementLocationId);
    if (movementCursor) params.set("cursor", movementCursor);
    request<CursorPage<Movement>>(`/api/admin/inventory-movements?${params}`)
      .then((page) => {
        if (active) setMovementPage(page);
      })
      .catch((error) => {
        if (active)
          setMovementError(
            error instanceof Error
              ? error.message
              : "Could not load movement history",
          );
      })
      .finally(() => {
        if (active) setMovementLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    selectedProjectId,
    locationsProjectId,
    movementLocationId,
    debouncedMovementSearch,
    movementCursor,
    movementRetry,
    movementRevision,
  ]);

  useEffect(() => {
    if (
      !selectedProjectId ||
      !transferFromId ||
      locationsProjectId !== selectedProjectId
    ) {
      setTransferProducts([]);
      setTransferProductsLoading(false);
      return;
    }
    let active = true;
    setTransferProductsLoading(true);
    setTransferProductsError("");
    const params = new URLSearchParams({
      projectId: selectedProjectId,
      locationId: transferFromId,
      limit: "10",
      search: debouncedTransferSearch,
      inStockOnly: "true",
    });
    request<CursorPage<ProductBalance>>(
      `/api/admin/inventory-balances?${params}`,
    )
      .then((page) => {
        if (active) setTransferProducts(page.items);
      })
      .catch((error) => {
        if (active)
          setTransferProductsError(
            error instanceof Error ? error.message : "Could not search stock",
          );
      })
      .finally(() => {
        if (active) setTransferProductsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    selectedProjectId,
    transferFromId,
    locationsProjectId,
    debouncedTransferSearch,
    balanceRevision,
  ]);

  const send = async (path: string, method: string, data: object) => {
    if (!selectedProjectId)
      throw new Error("Choose a project before changing inventory");
    setSaving(true);
    try {
      return await request(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProjectId, ...data }),
      });
    } finally {
      setSaving(false);
    }
  };

  const openCreateLocation = () => {
    setLocationDialog("new");
    setLocationForm(emptyForm);
    setLocationFormError("");
  };
  const openEditLocation = (location: Location) => {
    setLocationDialog(location.id);
    setLocationForm({
      name: location.name,
      code: location.code,
      address: location.address ?? "",
      active: location.active,
    });
    setLocationFormError("");
  };
  const saveLocation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const isNew = locationDialog === "new";
    const path = isNew
      ? "/api/admin/inventory-locations"
      : `/api/admin/inventory-locations/${locationDialog}`;
    setSavingLocation(true);
    try {
      await send(path, isNew ? "POST" : "PUT", {
        ...locationForm,
        address: locationForm.address.trim() || null,
      });
      setLocationDialog(null);
      setLocationFormError("");
      setLocationRevision((value) => value + 1);
      toast.success(isNew ? "Location added" : "Location saved");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not save location";
      setLocationFormError(message);
      toast.error(message);
    } finally {
      setSavingLocation(false);
    }
  };

  const makeDefault = async (location: Location) => {
    try {
      await send(
        `/api/admin/inventory-locations/${location.id}/default`,
        "PUT",
        {},
      );
      setLocationRevision((value) => value + 1);
      toast.success("Default location changed");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not change default location",
      );
    }
  };

  const saveStock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stockDialog) return;
    const quantityValue = Number(stockQuantity);
    if (
      !Number.isSafeInteger(quantityValue) ||
      quantityValue < 0 ||
      quantityValue > 1_000_000_000
    ) {
      toast.error("Enter a whole quantity between 0 and 1,000,000,000");
      return;
    }
    try {
      await send("/api/admin/inventory-balances", "PUT", {
        productId: stockDialog.id,
        locationId: selectedLocationId,
        quantity: quantityValue,
        reason: stockReason,
      });
      setStockDialog(null);
      setBalanceRevision((value) => value + 1);
      setMovementRevision((value) => value + 1);
      toast.success("Stock updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update stock",
      );
    }
  };

  const transferStock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const quantityValue = Number(transferQuantity);
    if (
      !transferProduct ||
      !Number.isSafeInteger(quantityValue) ||
      quantityValue < 1 ||
      quantityValue > transferProduct.locationQuantity
    ) {
      toast.error(
        "Choose a product and a quantity available at the source location",
      );
      return;
    }
    try {
      await send("/api/admin/inventory-transfers", "POST", {
        productId: transferProduct.id,
        fromLocationId: transferFromId,
        toLocationId: transferToId,
        quantity: quantityValue,
        reason: transferReason,
      });
      setTransferProduct(null);
      setTransferSearch("");
      setTransferQuantity("");
      setTransferReason("");
      setBalanceRevision((value) => value + 1);
      setMovementRevision((value) => value + 1);
      toast.success("Stock transferred");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not transfer stock",
      );
    }
  };

  const locationColumns = useMemo<DataTableColumn<Location>[]>(
    () => [
      {
        header: "Location",
        accessor: "name",
        width: "220px",
        render: (location) => (
          <div>
            <p className="font-medium text-neutral-900 dark:text-neutral-100">
              {location.name}
              {location.isDefault && (
                <span className="ml-2 align-middle">
                  <StatusPill tone="cyan">Default</StatusPill>
                </span>
              )}
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {location.address || "No address"}
            </p>
          </div>
        ),
      },
      {
        header: "Code",
        accessor: "code",
        width: "150px",
        cellClassName:
          "font-mono text-[13px] text-neutral-600 dark:text-neutral-300",
      },
      {
        header: "Status",
        accessor: "active",
        width: "130px",
        render: (location) => (
          <StatusPill tone={location.active ? "green" : "neutral"}>
            {location.active ? "Active" : "Inactive"}
          </StatusPill>
        ),
      },
    ],
    [],
  );
  const locationActions = useMemo<DataTableActions<Location>>(
    () => ({
      header: "Location",
      primary: { label: "Edit", onClick: openEditLocation },
      menu: [
        {
          label: "Make default",
          disabled: (location) => !location.active || location.isDefault,
          onClick: (location) => void makeDefault(location),
        },
      ],
    }),
    [],
  );

  const stockColumns = useMemo<DataTableColumn<ProductBalance>[]>(
    () => [
      {
        header: "Product",
        accessor: "name",
        width: "280px",
        render: (item) => (
          <div>
            <p className="font-medium text-neutral-900 dark:text-neutral-100">
              {item.name}
            </p>
            <p className="mt-1 font-mono text-xs text-neutral-500 dark:text-neutral-400">
              {item.sku || "No SKU"}
            </p>
          </div>
        ),
      },
      {
        header: "At location",
        accessor: "locationQuantity",
        width: "140px",
        render: (item) => (
          <button
            type="button"
            disabled={!selectedLocation?.active}
            onClick={() => {
              setStockDialog(item);
              setStockQuantity(String(item.locationQuantity));
              setStockReason("");
            }}
            className="rounded-md px-2 py-1 text-sm font-medium tabular-nums text-neutral-900 underline decoration-neutral-300 underline-offset-4 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/40 disabled:cursor-not-allowed disabled:text-neutral-400 dark:text-neutral-100 dark:decoration-neutral-600 dark:hover:bg-neutral-800"
          >
            {item.locationQuantity}
          </button>
        ),
      },
      {
        header: "Total stock",
        accessor: "totalQuantity",
        width: "140px",
        cellClassName:
          "text-sm tabular-nums text-neutral-700 dark:text-neutral-300",
        render: (item) => String(item.totalQuantity ?? 0),
      },
      {
        header: "Status",
        accessor: "trackInventory",
        width: "150px",
        render: (item) => {
          const threshold = item.lowStockThreshold ?? 5;
          if (!item.trackInventory)
            return <StatusPill tone="neutral">Not tracked</StatusPill>;
          if (item.locationQuantity === 0)
            return <StatusPill tone="red">Out of stock</StatusPill>;
          if (item.locationQuantity <= threshold)
            return <StatusPill tone="amber">Low stock</StatusPill>;
          return <StatusPill tone="green">Healthy</StatusPill>;
        },
      },
    ],
    [selectedLocation],
  );
  const movementColumns = useMemo<DataTableColumn<Movement>[]>(
    () => [
      {
        header: "Date",
        accessor: "createdAt",
        width: "190px",
        render: (item) => (
          <span className="whitespace-nowrap text-[13px] text-neutral-600 dark:text-neutral-400">
            {new Date(item.createdAt).toLocaleString()}
          </span>
        ),
      },
      {
        header: "Product",
        accessor: "productName",
        width: "220px",
        render: (item) => (
          <div>
            <p className="text-[13px] text-neutral-800 dark:text-neutral-200">
              {item.productName ?? "Deleted product"}
            </p>
            {item.productSku && (
              <p className="mt-1 font-mono text-xs text-neutral-500">
                {item.productSku}
              </p>
            )}
          </div>
        ),
      },
      {
        header: "Location",
        accessor: "locationName",
        width: "170px",
        cellClassName: "text-[13px] text-neutral-600 dark:text-neutral-400",
        render: (item) => item.locationName ?? "Deleted location",
      },
      {
        header: "Change",
        accessor: "quantityChange",
        width: "110px",
        render: (item) => (
          <span
            className={`font-medium tabular-nums ${item.quantityChange >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}
          >
            {item.quantityChange > 0 ? "+" : ""}
            {item.quantityChange}
          </span>
        ),
      },
      {
        header: "Reason",
        accessor: "reason",
        width: "240px",
        cellClassName: "text-[13px] text-neutral-600 dark:text-neutral-400",
      },
    ],
    [],
  );

  const filteredLocations = locations.filter((location) =>
    `${location.name} ${location.code} ${location.address ?? ""}`
      .toLowerCase()
      .includes(locationSearch.trim().toLowerCase()),
  );
  const locationPageCount = Math.max(
    1,
    Math.ceil(filteredLocations.length / 10),
  );
  const pageLocations = filteredLocations.slice(
    (locationPage - 1) * 10,
    locationPage * 10,
  );
  const transferSource = locations.find(
    (location) => location.id === transferFromId,
  );
  const currentTransferDestination = locations.find(
    (location) => location.id === transferToId,
  );

  return (
    <>
      <PageFrame
        title="Inventory locations"
        description="Manage stock by location, review every movement, and transfer quantities safely."
        headerAction={
          <Button onClick={openCreateLocation}>
            <Plus className="mr-2 h-4 w-4" />
            Add location
          </Button>
        }
      >
        <div className="space-y-6">
          <PageTabs
            items={[
              { label: "Stock", href: "/commerce/inventory", active: false },
              {
                label: "Locations",
                href: "/commerce/inventory/locations",
                active: true,
              },
            ]}
          />

          <StatStrip
            items={[
              {
                label: "Locations",
                value: String(locations.length),
                note: "Across this project",
                icon: MapPin,
                iconColor: "text-blue-600 dark:text-blue-400",
              },
              {
                label: "Active",
                value: String(
                  locations.filter((location) => location.active).length,
                ),
                note: "Available for stock",
                icon: CircleCheck,
                iconColor: "text-green-600 dark:text-green-400",
              },
              {
                label: "Products",
                value: balancePage.total.toLocaleString(),
                note: "In selected location",
                icon: Package,
                iconColor: "text-violet-600 dark:text-violet-400",
              },
              {
                label: "Stock movements",
                value: movementPage.total.toLocaleString(),
                note: movementLocationId
                  ? "For selected location"
                  : "Across locations",
                icon: RotateCw,
                iconColor: "text-amber-600 dark:text-amber-400",
              },
            ]}
          />

          <SectionCard
            title="Stock by location"
            description="Choose a location, then search and page through its product stock."
            className="dark:bg-neutral-900"
          >
            <div className="mb-4 grid gap-3 md:grid-cols-[minmax(180px,280px)_minmax(240px,1fr)]">
              <div>
                <Label htmlFor="stock-location">Location</Label>
                <select
                  id="stock-location"
                  className={selectClass}
                  value={selectedLocationId}
                  onChange={(event) => {
                    setSelectedLocationId(event.target.value);
                    setProductCursors([null]);
                  }}
                  disabled={locationsLoading || locations.length === 0}
                >
                  {locations.length === 0 && (
                    <option value="">No locations available</option>
                  )}
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                      {location.isDefault ? " · Default" : ""}
                      {!location.active ? " · Inactive" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="inventory-product-search">
                  Search products
                </Label>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                  <Input
                    id="inventory-product-search"
                    value={productSearch}
                    onChange={(event) => {
                      setProductSearch(event.target.value);
                      setProductCursors([null]);
                    }}
                    placeholder="Search by product name or SKU"
                    className="pl-9"
                    maxLength={120}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 md:col-span-2">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(event) => {
                    setInStockOnly(event.target.checked);
                    setProductCursors([null]);
                  }}
                />
                In stock only
              </label>
            </div>
            {balanceError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300">
                <p>{balanceError}</p>
                <Button
                  className="mt-3"
                  variant="outline"
                  onClick={() => setBalanceRetry((value) => value + 1)}
                >
                  Try again
                </Button>
              </div>
            ) : !selectedLocation ? (
              <div className="rounded-lg border border-dashed border-neutral-300 px-4 py-10 text-center dark:border-neutral-700">
                <p className="text-sm font-medium">
                  Add a location to see stock
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  This project has no inventory locations yet.
                </p>
              </div>
            ) : (
              <>
                {!selectedLocation.active && (
                  <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                    This location is inactive. Stock is read-only until it is
                    activated.
                  </p>
                )}
                <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
                  <DataTable<ProductBalance>
                    data={balancePage.items}
                    columns={stockColumns}
                    loading={balanceLoading}
                    manualSorting
                    emptyState={{
                      icon: Package,
                      message: debouncedProductSearch
                        ? "No products match this search"
                        : "No products yet",
                      description: debouncedProductSearch
                        ? "Try a different product name or SKU."
                        : "Products from this project will appear here.",
                    }}
                    pagination={{
                      enabled: false,
                      currentPage: 1,
                      itemsPerPage: PAGE_SIZE,
                      onPageChange: () => {},
                    }}
                  />
                </div>
                <div className="mt-3">
                  <CursorPager
                    page={productCursors.length}
                    total={balancePage.total}
                    hasMore={balancePage.hasMore}
                    onPrevious={() =>
                      setProductCursors((items) =>
                        items.length > 1 ? items.slice(0, -1) : items,
                      )
                    }
                    onNext={() => {
                      if (balancePage.nextCursor)
                        setProductCursors((items) => [
                          ...items,
                          balancePage.nextCursor,
                        ]);
                    }}
                  />
                </div>
              </>
            )}
          </SectionCard>

          <SectionCard
            title="Locations"
            description="Choose one active default location. Move its stock before deactivating it."
            className="dark:bg-neutral-900"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Use location actions to edit details or change the default.
              </p>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                <Input
                  aria-label="Search locations"
                  placeholder="Search locations"
                  value={locationSearch}
                  onChange={(event) => {
                    setLocationSearch(event.target.value);
                    setLocationPage(1);
                  }}
                  className="pl-9"
                />
              </div>
            </div>
            {locationsError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300">
                <p>{locationsError}</p>
                <Button
                  className="mt-3"
                  variant="outline"
                  onClick={() => setLocationsRetry((value) => value + 1)}
                >
                  Try again
                </Button>
              </div>
            ) : (
              <DataTable<Location>
                data={pageLocations}
                columns={locationColumns}
                actions={locationActions}
                loading={locationsLoading}
                emptyState={{
                  icon: MapPin,
                  message: locations.length
                    ? "No locations match this search"
                    : "No locations yet",
                  description: locations.length
                    ? "Try another name, code, or address."
                    : "Add a location to start distributing stock.",
                }}
                pagination={{
                  enabled: false,
                  currentPage: 1,
                  itemsPerPage: 10,
                  onPageChange: () => {},
                }}
              />
            )}
            {!locationsError && filteredLocations.length > 10 && (
              <div className="mt-3 flex items-center justify-between border-t border-neutral-200 pt-3 text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                <span>
                  Page {locationPage} of {locationPageCount} ·{" "}
                  {filteredLocations.length} locations
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={locationPage <= 1}
                    onClick={() => setLocationPage((value) => value - 1)}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={locationPage >= locationPageCount}
                    onClick={() => setLocationPage((value) => value + 1)}
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </SectionCard>

          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard
              title="Transfer stock"
              description="Move available stock between locations without changing the product total."
              className="dark:bg-neutral-900"
            >
              <form
                className="space-y-4"
                onSubmit={(event) => void transferStock(event)}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="transfer-from">From</Label>
                    <select
                      id="transfer-from"
                      required
                      className={selectClass}
                      value={transferFromId}
                      onChange={(event) => {
                        setTransferFromId(event.target.value);
                        setTransferProduct(null);
                        setTransferSearch("");
                        setTransferQuantity("");
                      }}
                    >
                      <option value="">Select source</option>
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                          {location.active ? "" : " · Inactive"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="transfer-to">To</Label>
                    <select
                      id="transfer-to"
                      required
                      className={selectClass}
                      value={transferToId}
                      onChange={(event) => setTransferToId(event.target.value)}
                    >
                      <option value="">Select destination</option>
                      {locations
                        .filter(
                          (location) =>
                            location.active && location.id !== transferFromId,
                        )
                        .map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <div>
                  <Label>Product at source</Label>
                  <Popover
                    open={transferPickerOpen}
                    onOpenChange={setTransferPickerOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!transferFromId}
                        className="mt-2 h-10 w-full justify-between font-normal"
                      >
                        {transferProduct
                          ? `${transferProduct.name} · ${transferProduct.locationQuantity} available`
                          : "Search products with stock at source"}
                        <Search className="ml-2 h-4 w-4 shrink-0 text-neutral-500" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="w-[min(24rem,calc(100vw-2rem))] p-0"
                    >
                      <Command shouldFilter={false}>
                        <CommandInput
                          value={transferSearch}
                          onValueChange={(value: string) =>
                            setTransferSearch(value)
                          }
                          placeholder="Search product or SKU"
                        />
                        <CommandList className="min-h-0 max-h-64">
                          {transferProductsLoading ? (
                            <div className="px-4 py-6 text-center text-sm text-neutral-500">
                              Searching stock…
                            </div>
                          ) : transferProductsError ? (
                            <div className="px-4 py-6 text-center text-sm text-red-600">
                              {transferProductsError}
                            </div>
                          ) : (
                            <CommandEmpty>
                              {transferSearch
                                ? "No stocked products match this search."
                                : "No products with stock at this location."}
                            </CommandEmpty>
                          )}
                          {transferProducts.map((product) => (
                            <CommandItem
                              key={product.id}
                              value={product.id}
                              onSelect={() => {
                                setTransferProduct(product);
                                setTransferQuantity("");
                                setTransferPickerOpen(false);
                              }}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate">{product.name}</p>
                                <p className="mt-1 truncate font-mono text-xs text-neutral-500">
                                  {product.sku || "No SKU"}
                                </p>
                              </div>
                              <span className="ml-3 shrink-0 text-xs tabular-nums text-neutral-500">
                                {product.locationQuantity} available
                              </span>
                              {transferProduct?.id === product.id && (
                                <Check className="ml-2 h-4 w-4" />
                              )}
                            </CommandItem>
                          ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="transfer-quantity">Quantity</Label>
                    <Input
                      id="transfer-quantity"
                      type="number"
                      min="1"
                      max={transferProduct?.locationQuantity ?? 1}
                      step="1"
                      required
                      disabled={!transferProduct}
                      className="mt-2"
                      value={transferQuantity}
                      onChange={(event) =>
                        setTransferQuantity(event.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="transfer-reason">Reason</Label>
                    <Input
                      id="transfer-reason"
                      required
                      minLength={3}
                      maxLength={255}
                      className="mt-2"
                      placeholder="Replenish another location"
                      value={transferReason}
                      onChange={(event) =>
                        setTransferReason(event.target.value)
                      }
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={
                    saving ||
                    !transferFromId ||
                    !transferToId ||
                    !transferProduct ||
                    !currentTransferDestination?.active ||
                    Number(transferQuantity) < 1 ||
                    Number(transferQuantity) >
                      (transferProduct?.locationQuantity ?? 0)
                  }
                >
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Transfer stock
                </Button>
              </form>
            </SectionCard>

            <SectionCard
              title="Stock movement history"
              description="Search all adjustments and transfers, with stable paging through older entries."
              className="dark:bg-neutral-900"
            >
              <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(160px,220px)_1fr]">
                <div>
                  <Label htmlFor="movement-location">Location</Label>
                  <select
                    id="movement-location"
                    className={selectClass}
                    value={movementLocationId}
                    onChange={(event) => {
                      setMovementLocationId(event.target.value);
                      setMovementCursors([null]);
                    }}
                  >
                    <option value="">All locations</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="movement-search">Search history</Label>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                    <Input
                      id="movement-search"
                      value={movementSearch}
                      onChange={(event) => {
                        setMovementSearch(event.target.value);
                        setMovementCursors([null]);
                      }}
                      placeholder="Search product, SKU, or reason"
                      className="pl-9"
                      maxLength={120}
                    />
                  </div>
                </div>
              </div>
              {movementError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300">
                  <p>{movementError}</p>
                  <Button
                    className="mt-3"
                    variant="outline"
                    onClick={() => setMovementRetry((value) => value + 1)}
                  >
                    Try again
                  </Button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
                    <DataTable<Movement>
                      data={movementPage.items}
                      columns={movementColumns}
                      loading={movementLoading}
                      manualSorting
                      emptyState={{
                        icon: RotateCw,
                        message: "No stock changes found",
                        description: debouncedMovementSearch
                          ? "Try a different product, SKU, or reason."
                          : "Adjustments and transfers will appear here.",
                      }}
                      pagination={{
                        enabled: false,
                        currentPage: 1,
                        itemsPerPage: PAGE_SIZE,
                        onPageChange: () => {},
                      }}
                    />
                  </div>
                  <div className="mt-3">
                    <CursorPager
                      page={movementCursors.length}
                      total={movementPage.total}
                      hasMore={movementPage.hasMore}
                      onPrevious={() =>
                        setMovementCursors((items) =>
                          items.length > 1 ? items.slice(0, -1) : items,
                        )
                      }
                      onNext={() => {
                        if (movementPage.nextCursor)
                          setMovementCursors((items) => [
                            ...items,
                            movementPage.nextCursor,
                          ]);
                      }}
                    />
                  </div>
                </>
              )}
            </SectionCard>
          </div>
        </div>
      </PageFrame>

      <Dialog
        open={locationDialog !== null}
        onOpenChange={(open) => {
          if (!open && !savingLocation) setLocationDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {locationDialog === "new" ? "Add location" : "Edit location"}
            </DialogTitle>
          </DialogHeader>
          <form
            id="inventory-location-form"
            className="space-y-4"
            onSubmit={(event) => void saveLocation(event)}
          >
            <div>
              <Label htmlFor="location-name">Name</Label>
              <Input
                id="location-name"
                required
                maxLength={255}
                className="mt-2"
                value={locationForm.name}
                onChange={(event) =>
                  setLocationForm((form) => ({
                    ...form,
                    name: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="location-code">Code</Label>
              <Input
                id="location-code"
                required
                pattern="[A-Z0-9][A-Z0-9_-]*"
                maxLength={40}
                className="mt-2 uppercase"
                value={locationForm.code}
                onChange={(event) =>
                  setLocationForm((form) => ({
                    ...form,
                    code: event.target.value.toUpperCase(),
                  }))
                }
              />
              <p className="mt-1 text-xs text-neutral-500">
                Use letters, numbers, underscores, or hyphens.
              </p>
            </div>
            <div>
              <Label htmlFor="location-address">Address</Label>
              <Input
                id="location-address"
                maxLength={1000}
                className="mt-2"
                value={locationForm.address}
                onChange={(event) =>
                  setLocationForm((form) => ({
                    ...form,
                    address: event.target.value,
                  }))
                }
              />
            </div>
            {locationDialog !== "new" && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={locationForm.active}
                  disabled={
                    locations.find((location) => location.id === locationDialog)
                      ?.isDefault
                  }
                  onChange={(event) =>
                    setLocationForm((form) => ({
                      ...form,
                      active: event.target.checked,
                    }))
                  }
                />
                Active
              </label>
            )}
            {locationDialog !== "new" &&
              locations.find((location) => location.id === locationDialog)
                ?.active && (
                <p className="text-xs text-neutral-500">
                  A location with stock cannot be deactivated. Move its stock
                  first.
                </p>
              )}
            {locationFormError && (
              <p
                role="alert"
                className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300"
              >
                {locationFormError}
              </p>
            )}
          </form>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={savingLocation}
              onClick={() => setLocationDialog(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="inventory-location-form"
              disabled={savingLocation}
            >
              {savingLocation
                ? "Saving…"
                : locationDialog === "new"
                  ? "Add location"
                  : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={stockDialog !== null}
        onOpenChange={(open) => {
          if (!open && !saving) setStockDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust stock</DialogTitle>
          </DialogHeader>
          {stockDialog && (
            <form
              id="inventory-stock-form"
              className="space-y-4"
              onSubmit={(event) => void saveStock(event)}
            >
              <p className="text-sm text-neutral-500">
                {stockDialog.name} at {selectedLocation?.name}
              </p>
              <div>
                <Label htmlFor="stock-quantity">New quantity</Label>
                <Input
                  id="stock-quantity"
                  type="number"
                  min="0"
                  max="1000000000"
                  step="1"
                  required
                  className="mt-2"
                  value={stockQuantity}
                  onChange={(event) => setStockQuantity(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="stock-reason">Reason</Label>
                <Input
                  id="stock-reason"
                  required
                  minLength={3}
                  maxLength={255}
                  className="mt-2"
                  placeholder="Stock count correction"
                  value={stockReason}
                  onChange={(event) => setStockReason(event.target.value)}
                />
              </div>
              <p className="text-xs text-neutral-500">
                The project total updates with this adjustment. Every change is
                recorded.
              </p>
            </form>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setStockDialog(null)}
            >
              Cancel
            </Button>
            <Button type="submit" form="inventory-stock-form" disabled={saving}>
              {saving ? "Saving…" : "Save quantity"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
