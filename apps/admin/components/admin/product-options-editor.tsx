"use client";

import { useMemo, useState } from "react";
import { Image as ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import { apiFetch } from "@/src/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MediaPicker } from "@/components/admin/media-picker";
import { Switch } from "@/components/ui/switch";
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

export type ProductAttributeOption = {
  id: string;
  label: string;
  value: string | null;
};
export type ProductAttributeType = {
  id: string;
  name: string;
  kind: string;
  attributes: ProductAttributeOption[];
};
export type ProductAttributeGroup = {
  id: string;
  typeId?: string;
  name: string;
  values: string[];
};
export type ProductVariant = {
  id: string;
  name: string;
  options: Record<string, string>;
  isDefault?: boolean;
  sku: string;
  price: number | null;
  discountedPrice?: number | null;
  inventoryQuantity: number;
  weight?: number | null;
  dimensions?: {
    length?: number | null;
    width?: number | null;
    height?: number | null;
  };
  images: string[];
};

type Props = {
  projectId: string;
  productType: "simple" | "variable";
  onProductTypeChange: (value: "simple" | "variable") => void;
  images: string[];
  onImagesChange: (images: string[]) => void;
  attributeTypes: ProductAttributeType[];
  onAttributeTypesChange: (types: ProductAttributeType[]) => void;
  groups: ProductAttributeGroup[];
  onGroupsChange: (groups: ProductAttributeGroup[]) => void;
  variants: ProductVariant[];
  onVariantsChange: (variants: ProductVariant[]) => void;
  variantGalleries: Record<string, string[]>;
  onVariantGalleriesChange: (value: Record<string, string[]>) => void;
  basePrice: number | null;
  simpleData: {
    sku: string;
    price: number | null;
    discountedPrice: number | null;
    inventoryQuantity: number;
    lowStockThreshold: number;
    weight: number | null;
    dimensions: {
      length?: number | null;
      width?: number | null;
      height?: number | null;
    };
  };
  onSimpleDataChange: (changes: Partial<Props["simpleData"]>) => void;
  catalogueSettings: {
    productKind: "physical" | "digital" | "service" | "membership";
    trackInventory: boolean;
  };
  onCatalogueSettingsChange: (
    changes: Partial<Props["catalogueSettings"]>,
  ) => void;
};

const numberOrNull = (value: string) => (value === "" ? null : Number(value));

function Gallery({
  images,
  add,
  remove,
  label,
  accordion = false,
  colorValue = null,
}: {
  images: string[];
  add: () => void;
  remove: (index: number) => void;
  label: string;
  accordion?: boolean;
  colorValue?: string | null;
}) {
  const colorDot = colorValue ? (
    <span
      aria-hidden="true"
      className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-neutral-300 dark:border-neutral-600"
      style={
        label === "Multicolor"
          ? { backgroundImage: "conic-gradient(#e53935, #fdd835, #43a047, #1e88e5, #8e24aa, #e53935)" }
          : { backgroundColor: colorValue }
      }
    />
  ) : null;
  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Add images customers can use to view this product.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add image
        </Button>
      </div>
      {images.length ? (
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {images.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="group relative aspect-square overflow-hidden rounded-lg border bg-neutral-100"
            >
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label={`Remove image ${index + 1} from ${label}`}
                onClick={() => remove(index)}
                className="absolute right-1 top-1 rounded bg-black/70 p-1 text-white opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 flex h-24 items-center justify-center rounded-lg border border-dashed text-xs text-neutral-500">
          <ImageIcon className="mr-2 h-4 w-4" /> No images
        </div>
      )}
    </>
  );
  if (accordion) {
    return (
      <details className="group rounded-lg border border-neutral-200 dark:border-neutral-700">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2 text-sm font-medium">
            {colorDot}
            {label}
          </span>
          <span className="text-xs text-neutral-500">
            {images.length} {images.length === 1 ? "image" : "images"}
          </span>
        </summary>
        <div className="border-t border-neutral-200 p-4 dark:border-neutral-700">
          {content}
        </div>
      </details>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <Label>{label}</Label>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add image
        </Button>
      </div>
      <p className="-mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        Add images customers can use to view this product.
      </p>
      {images.length ? (
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {images.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="group relative aspect-square overflow-hidden rounded-lg border bg-neutral-100"
            >
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label={`Remove image ${index + 1} from ${label}`}
                onClick={() => remove(index)}
                className="absolute right-1 top-1 rounded bg-black/70 p-1 text-white opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 flex h-24 items-center justify-center rounded-lg border border-dashed text-xs text-neutral-500">
          <ImageIcon className="mr-2 h-4 w-4" /> No images
        </div>
      )}
    </div>
  );
}

export function ProductOptionsEditor(props: Props) {
  const [activeTab, setActiveTab] = useState<
    "general" | "gallery" | "attributes" | "variations"
  >(props.productType === "simple" ? "general" : "gallery");
  const [pickerTarget, setPickerTarget] = useState<string | null>(null);
  const [libraryEdit, setLibraryEdit] = useState<
    | { mode: "create-type" }
    | { mode: "rename-type"; type: ProductAttributeType }
    | { mode: "add-value"; type: ProductAttributeType }
    | { mode: "rename-value"; type: ProductAttributeType; attribute: ProductAttributeOption }
    | null
  >(null);
  const [libraryName, setLibraryName] = useState("");
  const [librarySaving, setLibrarySaving] = useState(false);
  const [deleteLibraryItem, setDeleteLibraryItem] = useState<
    { typeId: string } | { attributeId: string } | null
  >(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulk, setBulk] = useState({
    price: "",
    discountedPrice: "",
    inventoryQuantity: "",
    weight: "",
    length: "",
    width: "",
    height: "",
  });
  const colorValues = useMemo(
    () => {
      const values = new Map<string, { label: string; value: string | null }>();
      props.groups.forEach((group) => {
        const type = props.attributeTypes.find((item) => item.id === group.typeId);
        if (type?.kind !== "color" && type?.kind !== "builtin_color") return;
        group.values.forEach((label) => {
          const attribute = type.attributes.find((item) => item.label === label);
          if (attribute) values.set(label, { label, value: attribute.value });
        });
      });
      return [...values.values()];
    },
    [props.groups, props.attributeTypes],
  );
  const variantColor = (variant: ProductVariant) => {
    for (const group of props.groups) {
      const type = props.attributeTypes.find((item) => item.id === group.typeId);
      if (type?.kind !== "color" && type?.kind !== "builtin_color") continue;
      const selectedLabel = variant.options[group.typeId || ""] ?? variant.options[group.name];
      if (!selectedLabel) continue;
      const option = type.attributes.find((item) => item.label === selectedLabel);
      if (option) return { label: option.label, value: option.value };
    }
    return null;
  };
  const defaultVariantId =
    props.variants.find((variant) => variant.isDefault)?.id ||
    props.variants[0]?.id ||
    "";

  const addGroup = () => {
    props.onGroupsChange([
      ...props.groups,
      {
        id: crypto.randomUUID(),
        name: "",
        values: [],
      },
    ]);
  };
  const generate = () => {
    if (!props.groups.length) {
      toast.error("Add at least one attribute before generating variations");
      return false;
    }
    const groups = props.groups
      .map((group) => ({
        ...group,
        values: [
          ...new Set(group.values.map((value) => value.trim()).filter(Boolean)),
        ],
      }));
    const invalid = groups.find(
      (group) => !group.typeId || !group.name.trim() || !group.values.length,
    );
    if (invalid) {
      toast.error("Choose an attribute and at least one value for every group");
      return false;
    }
    const combinations = groups.reduce<Record<string, string>[][]>(
      (result, group) =>
        result.flatMap((combo) =>
          group.values.map((value) => [...combo, { [group.typeId as string]: value }]),
        ),
      [[]],
    );
    const previousDefault =
      props.variants.find((variant) => variant.isDefault) || props.variants[0];
    const generated = combinations.map((parts) => {
        const options = Object.assign({}, ...parts);
        const id = groups
          .map((group) => `${group.typeId}:${options[group.typeId as string]}`)
          .join("|");
        const displayName = groups
          .map((group) => options[group.typeId as string])
          .join(" / ");
        const existing =
          props.variants.find((variant) => variant.id === id) ||
          props.variants.find((variant) => variant.name === displayName);
        return existing
          ? { ...existing, id, name: displayName, options }
          : {
              id,
              name: displayName,
              options,
              sku: "",
              price: props.basePrice,
              inventoryQuantity: 0,
              images: [],
          };
      });
    const defaultVariant =
      generated.find(
        (variant) =>
          variant.id === previousDefault?.id ||
          variant.name === previousDefault?.name,
      ) || generated[0];
    props.onVariantsChange(
      generated.map((variant) => ({
        ...variant,
        isDefault: variant.id === defaultVariant?.id,
      })),
    );
    return true;
  };
  const updateVariant = (id: string, changes: Partial<ProductVariant>) =>
    props.onVariantsChange(
      props.variants.map((variant) =>
        variant.id === id ? { ...variant, ...changes } : variant,
      ),
    );
  const applyBulk = () => {
    props.onVariantsChange(
      props.variants.map((variant) => ({
        ...variant,
        ...(bulk.price !== "" ? { price: Number(bulk.price) } : {}),
        ...(bulk.discountedPrice !== ""
          ? { discountedPrice: Number(bulk.discountedPrice) }
          : {}),
        ...(bulk.inventoryQuantity !== ""
          ? { inventoryQuantity: Number(bulk.inventoryQuantity) }
          : {}),
        ...(bulk.weight !== "" ? { weight: Number(bulk.weight) } : {}),
        dimensions: {
          ...variant.dimensions,
          ...(bulk.length !== "" ? { length: Number(bulk.length) } : {}),
          ...(bulk.width !== "" ? { width: Number(bulk.width) } : {}),
          ...(bulk.height !== "" ? { height: Number(bulk.height) } : {}),
        },
      })),
    );
    setBulkOpen(false);
  };
  const refreshAttributeTypes = async () => {
    const response = await apiFetch(
      `/api/admin/product-attributes?projectId=${props.projectId}`,
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not refresh attributes");
    props.onAttributeTypesChange(data.types || []);
  };
  const saveLibraryEdit = async () => {
    if (!libraryEdit || !libraryName.trim()) return;
    const edit = libraryEdit;
    setLibrarySaving(true);
    try {
      const isNewValue = edit.mode === "add-value";
      const isNewType = edit.mode === "create-type";
      const response = await apiFetch(
        isNewType
          ? "/api/admin/product-attributes"
          : `/api/admin/product-attributes${isNewValue ? `/values?projectId=${props.projectId}` : `?projectId=${props.projectId}`}`,
        {
          method: isNewValue || isNewType ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            edit.mode === "create-type"
              ? { projectId: props.projectId, name: libraryName.trim() }
              : edit.mode === "rename-type"
              ? { typeId: edit.type.id, name: libraryName.trim() }
              : edit.mode === "rename-value"
                ? { attributeId: edit.attribute.id, label: libraryName.trim() }
                : { typeId: edit.type.id, label: libraryName.trim() },
          ),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update shared attribute");
      await refreshAttributeTypes();
      if (edit.mode === "create-type" && data.type?.id) {
        props.onGroupsChange([
          ...props.groups,
          {
            id: crypto.randomUUID(),
            typeId: data.type.id,
            name: data.type.name,
            values: [],
          },
        ]);
      } else if (edit.mode === "rename-type") {
        props.onGroupsChange(
          props.groups.map((group) =>
            group.typeId === edit.type.id
              ? { ...group, name: libraryName.trim() }
              : group,
          ),
        );
      } else if (edit.mode === "rename-value") {
        props.onGroupsChange(
          props.groups.map((group) =>
            group.typeId === edit.type.id
              ? {
                  ...group,
                  values: group.values.map((value) =>
                    value === edit.attribute.label ? libraryName.trim() : value,
                  ),
                }
              : group,
          ),
        );
      }
      setLibraryEdit(null);
      setLibraryName("");
      toast.success(edit.mode === "create-type" ? "Shared attribute created" : edit.mode === "add-value" ? "Shared value added" : "Shared attribute updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update shared attribute");
    } finally {
      setLibrarySaving(false);
    }
  };
  const deleteSharedItem = async () => {
    if (!deleteLibraryItem) return;
    setLibrarySaving(true);
    try {
      const response = await apiFetch(
        `/api/admin/product-attributes?projectId=${props.projectId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(deleteLibraryItem),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete shared attribute");
      await refreshAttributeTypes();
      setDeleteLibraryItem(null);
      toast.success("Removed from shared attributes");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete shared attribute");
    } finally {
      setLibrarySaving(false);
    }
  };

  const tabs =
    props.productType === "variable"
      ? (["general", "gallery", "attributes", "variations"] as const)
      : (["general", "gallery"] as const);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 rounded-lg border border-neutral-300 p-4 dark:border-neutral-600 sm:grid-cols-2">
        <div>
          <Label>Offering type</Label>
          <p className="-mt-1 mb-2 text-xs text-neutral-500 dark:text-neutral-400">
            Choose what customers receive after purchase.
          </p>
          <Select
            value={props.catalogueSettings.productKind}
            onValueChange={(value) =>
              props.onCatalogueSettingsChange({
                productKind: value as Props["catalogueSettings"]["productKind"],
              })
            }
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="physical">Physical product</SelectItem>
              <SelectItem value="digital">Digital product</SelectItem>
              <SelectItem value="service">Service</SelectItem>
              <SelectItem value="membership">Membership</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Product type</Label>
          <p className="-mt-1 mb-2 text-xs text-neutral-500 dark:text-neutral-400">
            Use variable products when customers can choose options.
          </p>
          <Select
            value={props.productType}
            onValueChange={(value) => {
              props.onProductTypeChange(value as "simple" | "variable");
              setActiveTab("general");
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="simple">Simple</SelectItem>
              <SelectItem value="variable">Variable</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="min-h-[310px] overflow-hidden rounded-lg border border-neutral-300 dark:border-neutral-600 md:grid md:grid-cols-[175px_1fr]">
        <nav
          aria-label="Product data sections"
          className="flex border-b border-neutral-300 dark:border-neutral-600 md:flex-col md:border-b-0 md:border-r"
        >
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`border-r border-neutral-300 px-5 py-3 text-left text-sm font-medium capitalize transition-colors last:border-r-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 dark:border-neutral-600 md:border-b md:border-r-0 ${activeTab === tab ? "bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-50" : "text-neutral-600 hover:bg-neutral-200 hover:text-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-700 dark:hover:text-white"}`}
            >
              {tab}
            </button>
          ))}
        </nav>

        <section className="min-w-0 p-4 md:p-5">
          {activeTab === "general" && (
            <div>
              <div className="mb-5 flex items-center justify-between gap-4 border-b border-neutral-200 pb-4 dark:border-neutral-700">
                <div>
                  <Label htmlFor="track-inventory">Track inventory</Label>
                  <p className="-mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    Keep stock quantities updated as orders come in.
                  </p>
                </div>
                <Switch
                  id="track-inventory"
                  checked={props.catalogueSettings.trackInventory}
                  onCheckedChange={(trackInventory) =>
                    props.onCatalogueSettingsChange({ trackInventory })
                  }
                />
              </div>
              {props.productType === "simple" && (
                <div className="space-y-5">
                  <div>
                    <Label htmlFor="simple-sku">SKU code</Label>
                    <p className="-mt-1 mb-2 text-xs text-neutral-500 dark:text-neutral-400">
                      Add your internal identifier for this product.
                    </p>
                    <Input
                      id="simple-sku"
                      className="mt-2"
                      value={props.simpleData.sku}
                      onChange={(event) =>
                        props.onSimpleDataChange({ sku: event.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <Label htmlFor="simple-price">Price</Label>
                      <p className="-mt-1 mb-2 text-xs text-neutral-500 dark:text-neutral-400">
                        Set the regular selling price.
                      </p>
                      <Input
                        id="simple-price"
                        className="mt-2"
                        type="number"
                        min="0"
                        step="0.01"
                        value={props.simpleData.price ?? ""}
                        onChange={(event) =>
                          props.onSimpleDataChange({
                            price: numberOrNull(event.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="simple-sale-price">Discount price</Label>
                      <p className="-mt-1 mb-2 text-xs text-neutral-500 dark:text-neutral-400">
                        Set the discount selling price.
                      </p>
                      <Input
                        id="simple-sale-price"
                        className="mt-2"
                        type="number"
                        min="0"
                        step="0.01"
                        value={props.simpleData.discountedPrice ?? ""}
                        onChange={(event) =>
                          props.onSimpleDataChange({
                            discountedPrice: numberOrNull(event.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="simple-quantity">Quantity</Label>
                      <p className="-mt-1 mb-2 text-xs text-neutral-500 dark:text-neutral-400">
                        Units currently available for sale.
                      </p>
                      <Input
                        id="simple-quantity"
                        className="mt-2"
                        type="number"
                        min="0"
                        disabled={!props.catalogueSettings.trackInventory}
                        value={props.simpleData.inventoryQuantity}
                        onChange={(event) =>
                          props.onSimpleDataChange({
                            inventoryQuantity: Number(event.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>
                  {props.catalogueSettings.productKind === "physical" && (
                    <div className="border-t border-neutral-200 pt-5 dark:border-neutral-800">
                      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                        Shipping
                      </h3>
                      <div className="mt-3">
                        <Label htmlFor="simple-weight">Weight (grams)</Label>
                        <p className="-mt-1 mb-2 text-xs text-neutral-500 dark:text-neutral-400">
                          Used to calculate shipping rates.
                        </p>
                        <Input
                          id="simple-weight"
                          className="mt-2"
                          type="number"
                          min="0"
                          value={props.simpleData.weight ?? ""}
                          onChange={(event) =>
                            props.onSimpleDataChange({
                              weight: numberOrNull(event.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="mt-4 grid gap-4 sm:grid-cols-3">
                        {(["length", "width", "height"] as const).map((key) => (
                          <div key={key}>
                            <Label
                              htmlFor={`simple-${key}`}
                              className="capitalize"
                            >
                              {key} (cm)
                            </Label>
                            <p className="-mt-1 mb-2 text-xs text-neutral-500 dark:text-neutral-400">
                              Package {key} in centimeters.
                            </p>
                            <Input
                              id={`simple-${key}`}
                              className="mt-2"
                              type="number"
                              min="0"
                              step="any"
                              value={props.simpleData.dimensions[key] ?? ""}
                              onChange={(event) =>
                                props.onSimpleDataChange({
                                  dimensions: {
                                    ...props.simpleData.dimensions,
                                    [key]: numberOrNull(event.target.value),
                                  },
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "gallery" && (
            <div className="space-y-6">
              {props.productType === "simple" && (
                <Gallery
                  label="Gallery images"
                  images={props.images}
                  add={() => setPickerTarget("product")}
                  remove={(index) =>
                    props.onImagesChange(
                      props.images.filter((_, i) => i !== index),
                    )
                  }
                />
              )}
              {props.productType === "variable" && (
                <div className="space-y-5 border-t pt-5 dark:border-neutral-800">
                  <div>
                    <h2 className="font-semibold">Variant galleries</h2>
                    <p className="mt-1 text-xs text-neutral-500">Add product images by color option.</p>
                  </div>
                  {colorValues.map((color) => (
                    <Gallery
                      key={color.label}
                      label={color.label}
                      colorValue={color.value}
                      accordion
                      images={props.variantGalleries[color.label] || []}
                      add={() => setPickerTarget(`gallery:${color.label}`)}
                      remove={(index) =>
                        props.onVariantGalleriesChange({
                          ...props.variantGalleries,
                          [color.label]: (props.variantGalleries[color.label] || []).filter(
                            (_, i) => i !== index,
                          ),
                        })
                      }
                    />
                  ))}
                  {!colorValues.length && (
                    <div className="rounded-lg border border-dashed border-neutral-300 p-6 text-sm text-neutral-500 dark:border-neutral-700">
                      Add the Color attribute and choose colors to manage images for each color.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "attributes" && props.productType === "variable" && (
            <div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Attributes</h2>
                  <p className="text-xs text-neutral-500">
                    Choose product options such as size or color. These values
                    are used to build variations.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => { setLibraryEdit({ mode: "create-type" }); setLibraryName(""); }}>
                    <Plus className="mr-1 h-4 w-4" /> New shared attribute
                  </Button>
                  <Button type="button" variant="outline" onClick={addGroup} disabled={props.attributeTypes.every((type) => props.groups.some((group) => group.typeId === type.id))}>
                    <Plus className="mr-1 h-4 w-4" /> Add existing
                  </Button>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {props.attributeTypes.length === 0 && (
                  <div className="rounded-lg border border-dashed border-neutral-300 p-5 text-sm dark:border-neutral-700">
                    <p className="font-medium">Create reusable attributes first</p>
                    <p className="mt-1 text-neutral-500">Add groups such as Size or Material and their values, then they will appear here.</p>
                    <a href="/product-attributes" className="mt-3 inline-flex text-sm font-medium text-blue-700 underline underline-offset-4 dark:text-blue-300">Open Product Attributes</a>
                  </div>
                )}
                {props.groups.map((group, groupIndex) => {
                  const type = props.attributeTypes.find(
                    (item) => item.id === group.typeId,
                  );
                  return (
                    <div
                      key={group.id}
                      className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Select
                          value={group.typeId || ""}
                          onValueChange={(typeId) => {
                            const next = props.attributeTypes.find(
                              (item) => item.id === typeId,
                            );
                            if (next)
                              props.onGroupsChange(
                                props.groups.map((item, index) =>
                                  index === groupIndex
                                    ? {
                                        ...item,
                                        typeId,
                                        name: next.name,
                                            values: [],
                                      }
                                    : item,
                                ),
                              );
                          }}
                        >
                          <SelectTrigger className="min-w-40 flex-1">
                            <SelectValue placeholder="Choose attribute" />
                          </SelectTrigger>
                          <SelectContent>
                            {props.attributeTypes
                              .filter(
                                (item) =>
                                  !props.groups.some(
                                    (candidate, index) =>
                                      index !== groupIndex &&
                                      candidate.typeId === item.id,
                                  ),
                              )
                              .map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {type && type.kind !== "builtin_color" && (
                          <>
                            <Button type="button" variant="ghost" size="icon" aria-label={`Rename ${type.name}`} title="Rename shared attribute" onClick={() => { setLibraryEdit({ mode: "rename-type", type }); setLibraryName(type.name); }}><Pencil className="h-4 w-4" /></Button>
                            <Button type="button" variant="ghost" size="icon" aria-label={`Add value to ${type.name}`} title="Add shared value" onClick={() => { setLibraryEdit({ mode: "add-value", type }); setLibraryName(""); }}><Plus className="h-4 w-4" /></Button>
                            <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${type.name}`} title="Delete shared attribute" className="text-red-600" onClick={() => setDeleteLibraryItem({ typeId: type.id })}><Trash2 className="h-4 w-4" /></Button>
                          </>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          aria-label="Remove attribute"
                          onClick={() =>
                            props.onGroupsChange(
                              props.groups.filter(
                                (_, index) => index !== groupIndex,
                              ),
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {type ? (
                        type.attributes.length ? <div className="mt-3 flex flex-wrap gap-2">
                          {type.attributes.map((attribute) => {
                            const selected = group.values.includes(
                              attribute.label,
                            );
                            return (
                              <span key={attribute.id} className="inline-flex items-center overflow-hidden rounded-full border border-neutral-300 dark:border-neutral-600">
                                <button
                                  type="button"
                                  aria-pressed={selected}
                                  onClick={() =>
                                    props.onGroupsChange(
                                      props.groups.map((item, index) =>
                                        index === groupIndex
                                          ? {
                                              ...item,
                                              values: selected
                                                ? item.values.filter((value) => value !== attribute.label)
                                                : [...item.values, attribute.label],
                                            }
                                          : item,
                                      ),
                                    )
                                  }
                                  className={`px-3 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 ${selected ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-950" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"}`}
                                >
                                  {type.kind === "color" || type.kind === "builtin_color" ? <span className="mr-1.5 inline-block h-3 w-3 rounded-full border border-black/15 align-[-2px]" style={attribute.label === "Multicolor" ? { backgroundImage: "conic-gradient(#e53935, #fdd835, #43a047, #1e88e5, #8e24aa, #e53935)" } : { backgroundColor: attribute.value || "transparent" }} /> : null}
                                  {attribute.label}
                                </button>
                                {type.kind !== "builtin_color" && <>
                                  <button type="button" aria-label={`Edit ${attribute.label}`} title="Edit shared value" className="border-l border-neutral-300 px-2 py-1.5 text-neutral-500 hover:bg-neutral-100 dark:border-neutral-600 dark:hover:bg-neutral-800" onClick={() => { setLibraryEdit({ mode: "rename-value", type, attribute }); setLibraryName(attribute.label); }}><Pencil className="h-3 w-3" /></button>
                                  <button type="button" aria-label={`Delete ${attribute.label}`} title="Delete shared value" className="border-l border-neutral-300 px-2 py-1.5 text-red-600 hover:bg-red-50 dark:border-neutral-600 dark:hover:bg-red-950/40" onClick={() => setDeleteLibraryItem({ attributeId: attribute.id })}><Trash2 className="h-3 w-3" /></button>
                                </>}
                              </span>
                            );
                          })}
                        </div> : <p className="mt-3 text-sm text-neutral-500">This group has no values yet. Add values from the controls above or on the Product Attributes page.</p>
                      ) : (
                        <p className="mt-3 text-sm text-neutral-500">Choose a saved attribute group. Create reusable groups on the Product Attributes page.</p>
                      )}
                    </div>
                  );
                })}
              </div>
              {props.groups.length > 0 && (
                <Button
                  type="button"
                  className="mt-4"
                  onClick={() => {
                    if (generate()) setActiveTab("variations");
                  }}
                >
                  Generate variations
                </Button>
              )}
            </div>
          )}

          {activeTab === "variations" && props.productType === "variable" && (
            <div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">
                    Variations ({props.variants.length})
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Price, stock, dimensions, gallery.
                  </p>
                </div>
                {props.variants.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setBulkOpen(true)}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Bulk edit
                  </Button>
                )}
              </div>
              {props.variants.length ? (
                <div className="mt-4 max-w-sm">
                  <Label htmlFor="default-variation">Default variation</Label>
                  <Select
                    value={defaultVariantId}
                    onValueChange={(id) =>
                      props.onVariantsChange(
                        props.variants.map((variant) => ({
                          ...variant,
                          isDefault: variant.id === id,
                        })),
                      )
                    }
                  >
                    <SelectTrigger id="default-variation" className="mt-2">
                      <SelectValue placeholder="Select a default variation" />
                    </SelectTrigger>
                    <SelectContent>
                      {props.variants.map((variant) => (
                        <SelectItem key={variant.id} value={variant.id}>
                          {variant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-neutral-500">Preselected when customers first view this product.</p>
                </div>
              ) : null}
              {props.variants.length ? (
                <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">
                  Set a SKU, price, sale price, and stock level for each option.
                </p>
              ) : null}
              {props.variants.length ? (
                <div className="mt-4 space-y-3">
                  {props.variants.map((variant) => (
                    <details key={variant.id} className="group rounded-lg border border-neutral-200 dark:border-neutral-700">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                        <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                          <span className="truncate">{variant.name}</span>
                          {variantColor(variant) && (
                            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-200 px-2 py-0.5 text-xs font-normal dark:border-neutral-700">
                              <span className="h-3 w-3 rounded-full border border-neutral-300 dark:border-neutral-600" style={variantColor(variant)?.label === "Multicolor" ? { backgroundImage: "conic-gradient(#e53935, #fdd835, #43a047, #1e88e5, #8e24aa, #e53935)" } : { backgroundColor: variantColor(variant)?.value || "transparent" }} />
                              {variantColor(variant)?.label}
                            </span>
                          )}
                          {variant.id === defaultVariantId && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-normal text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">Default</span>}
                        </span>
                        <span className="shrink-0 text-xs text-neutral-500">{variant.images.length} images</span>
                      </summary>
                      <div className="grid gap-3 border-t border-neutral-200 p-4 dark:border-neutral-700 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)_auto]">
                        <div>
                          <Label>SKU</Label>
                          <Input
                            className="mt-2"
                            placeholder="SKU"
                            value={variant.sku}
                            onChange={(event) => updateVariant(variant.id, { sku: event.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Price</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={variant.price ?? ""}
                            onChange={(event) => updateVariant(variant.id, { price: numberOrNull(event.target.value) })}
                          />
                        </div>
                        <div>
                          <Label>Sale price</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={variant.discountedPrice ?? ""}
                            onChange={(event) => updateVariant(variant.id, { discountedPrice: numberOrNull(event.target.value) })}
                          />
                        </div>
                        <div>
                          <Label>Stock</Label>
                          <Input
                            type="number"
                            min="0"
                            disabled={!props.catalogueSettings.trackInventory}
                            value={variant.inventoryQuantity}
                            onChange={(event) => updateVariant(variant.id, { inventoryQuantity: Number(event.target.value) })}
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setPickerTarget(`variant:${variant.id}`)}
                          >
                            <ImageIcon className="mr-1 h-3.5 w-3.5" /> Add images ({variant.images.length})
                          </Button>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-lg border border-dashed p-10 text-center text-sm text-neutral-500">
                  Choose attributes, then generate variations.
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk edit variations</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-neutral-500">
            Blank fields remain unchanged.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["price", "Price"],
                ["discountedPrice", "Sale price"],
                ["inventoryQuantity", "Quantity"],
                ["weight", "Weight"],
                ["length", "Length"],
                ["width", "Width"],
                ["height", "Height"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <Label>{label}</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={bulk[key]}
                  onChange={(event) =>
                    setBulk({ ...bulk, [key]: event.target.value })
                  }
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={applyBulk}>
              Apply to all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={libraryEdit !== null} onOpenChange={(open) => { if (!open) setLibraryEdit(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {libraryEdit?.mode === "create-type"
                ? "Create shared attribute"
                : libraryEdit?.mode === "rename-type"
                ? "Rename shared attribute"
                : libraryEdit?.mode === "add-value"
                  ? `Add a ${libraryEdit.type.name} value`
                  : `Edit ${libraryEdit?.type.name || "attribute"} value`}
            </DialogTitle>
          </DialogHeader>
          <div>
            <Label htmlFor="shared-attribute-edit">
              {libraryEdit?.mode === "rename-type" || libraryEdit?.mode === "create-type" ? "Attribute name" : "Value"}
            </Label>
            <Input
              id="shared-attribute-edit"
              autoFocus
              className="mt-2"
              value={libraryName}
              onChange={(event) => setLibraryName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void saveLibraryEdit();
                }
              }}
            />
            <p className="mt-2 text-xs text-neutral-500">This change is shared across this site’s product editor and attribute library.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLibraryEdit(null)}>Cancel</Button>
            <Button type="button" disabled={!libraryName.trim() || librarySaving} onClick={() => void saveLibraryEdit()}>Save shared change</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteLibraryItem !== null} onOpenChange={(open) => { if (!open) setDeleteLibraryItem(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from shared attributes?</AlertDialogTitle>
            <AlertDialogDescription>This removes the group or value from the site library. Existing product selections stay as saved snapshots.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={librarySaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={librarySaving} className="bg-red-600 hover:bg-red-700" onClick={(event) => { event.preventDefault(); void deleteSharedItem(); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <MediaPicker
        projectId={props.projectId}
        open={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        title="Choose gallery image"
        onSelect={(item) => {
          if (pickerTarget === "product")
            props.onImagesChange([...props.images, item.url]);
          else if (pickerTarget?.startsWith("gallery:")) {
            const key = pickerTarget.slice(8);
            props.onVariantGalleriesChange({
              ...props.variantGalleries,
              [key]: [...(props.variantGalleries[key] || []), item.url],
            });
          } else if (pickerTarget?.startsWith("variant:")) {
            const id = pickerTarget.slice(8);
            updateVariant(id, {
              images: [
                ...(props.variants.find((variant) => variant.id === id)
                  ?.images || []),
                item.url,
              ],
            });
          }
        }}
      />
    </div>
  );
}
