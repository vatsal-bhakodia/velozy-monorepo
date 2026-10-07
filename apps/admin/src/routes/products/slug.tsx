"use client";

import { apiFetch } from "@/src/lib/api";

import { useState, useEffect } from "react";
import { useSession } from "@/src/lib/auth";
import { useRouter, useParams } from "@/src/lib/navigation";
import { useAdmin } from "@/src/admin-context";
import { RotateCcw } from "lucide-react";
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
  Products,
  ProductsFormData,
  ProductCategories,
} from "@/src/lib/db/schema";
import { generateSlug } from "@/src/lib/utils";
import {
  ProductOptionsEditor,
  ProductAttributeGroup,
  ProductAttributeType,
  ProductVariant,
} from "@/components/admin/product-options-editor";

const INITIAL_FORM_DATA: Partial<ProductsFormData> = {
  name: "",
  slug: "",
  description: "",
  shortDescription: "",
  productType: "simple",
  productKind: "physical",
  price: null,
  discountedPrice: null,
  sku: "",
  weight: null,
  dimensions: null,
  images: null,
  isActive: true,
  isFeatured: false,
  inventoryQuantity: 0,
  trackInventory: false,
  lowStockThreshold: 5,
  status: "draft",
};

export default function EditProductPage() {
  const API_PATH = "/api/admin/products";
  const { data: session } = useSession();
  const { selectedProjectId } = useAdmin();
  const router = useRouter();
  const params = useParams();
  const productIdParam = params?.slug as string;

  // Determine if we're in create or edit mode
  const isCreateMode = productIdParam === "new";
  const isEditMode = Boolean(!isCreateMode && productIdParam);

  // State
  const [loading, setLoading] = useState<boolean>(isEditMode);
  const [saving, setSaving] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);
  const [formData, setFormData] =
    useState<Partial<ProductsFormData>>(INITIAL_FORM_DATA);
  const [categories, setCategories] = useState<ProductCategories[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [productType, setProductType] = useState<"simple" | "variable">(
    "simple",
  );
  const [images, setImages] = useState<string[]>([]);
  const [attributeGroups, setAttributeGroups] = useState<
    ProductAttributeGroup[]
  >([]);
  const [attributeTypes, setAttributeTypes] = useState<ProductAttributeType[]>(
    [],
  );
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantGalleries, setVariantGalleries] = useState<
    Record<string, string[]>
  >({});

  // Fetch product by ID (only in edit mode)
  useEffect(() => {
    if (isEditMode && productIdParam && selectedProjectId) {
      fetchProduct();
    } else if (isCreateMode) {
      setFormData(INITIAL_FORM_DATA);
      setProductType("simple");
      setImages([]);
      setAttributeGroups([]);
      setVariants([]);
      setVariantGalleries({});
      setLoading(false);
    }
  }, [productIdParam, selectedProjectId, isEditMode, isCreateMode]);

  // Fetch categories
  useEffect(() => {
    if (selectedProjectId) {
      fetchCategories();
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) return;
    apiFetch(`/api/admin/product-attributes?projectId=${selectedProjectId}`)
      .then((response) => response.json())
      .then((data) => setAttributeTypes(data.types || []))
      .catch(() => toast.error("Failed to load product attributes"));
  }, [selectedProjectId]);

  const fetchCategories = async () => {
    if (!selectedProjectId) return;
    try {
      const response = await apiFetch(
        `/api/admin/product-categories?projectId=${selectedProjectId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchProduct = async () => {
    if (!productIdParam || !selectedProjectId) return;

    setLoading(true);
    try {
      const response = await apiFetch(
        `${API_PATH}/${productIdParam}?projectId=${selectedProjectId}`,
      );
      if (response.ok) {
        const data = await response.json();
        const product = data.product;
        setProductId(product.id);
        setProductType(
          product.productType === "variable" ? "variable" : "simple",
        );
        setSelectedCategoryId(product.categoryId || "");
        setFormData({
          name: product.name,
          slug: product.slug,
          description: product.description || "",
          shortDescription: product.shortDescription || "",
          productKind: product.productKind || "physical",
          price: product.price,
          discountedPrice: product.discountedPrice,
          sku: product.sku || "",
          weight: product.weight,
          dimensions: product.dimensions,
          images: product.images,
          isActive: product.isActive ?? true,
          isFeatured: product.isFeatured || false,
          inventoryQuantity: product.inventoryQuantity ?? 0,
          trackInventory: product.trackInventory ?? false,
          lowStockThreshold: product.lowStockThreshold ?? 5,
          status: product.status || "draft",
        });
        setAttributeGroups(
          Array.isArray(product.attributes) ? product.attributes : [],
        );
        const productVariants: ProductVariant[] = Array.isArray(product.variants)
          ? product.variants
          : [];
        const hasDefaultVariant = productVariants.some(
          (variant) => variant.isDefault,
        );
        setVariants(
          productVariants.map((variant, index) => ({
            ...variant,
            isDefault: hasDefaultVariant ? Boolean(variant.isDefault) : index === 0,
          })),
        );
        setImages(Array.isArray(product.images) ? product.images : []);
        setVariantGalleries(
          product.variantGalleries &&
            typeof product.variantGalleries === "object"
            ? product.variantGalleries
            : {},
        );
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to fetch product");
        router.push("/products");
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      toast.error("Failed to fetch product");
      router.push("/products");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (overrides?: Partial<ProductsFormData>) => {
    const submitData = { ...formData, ...overrides };
    if (productType === "variable") {
      const prices = variants
        .map((variant) => variant.price)
        .filter(
          (price): price is number => typeof price === "number" && price >= 0,
        );
      submitData.price = prices.length ? Math.min(...prices) : null;
      submitData.discountedPrice = null;
    } else if (
      submitData.discountedPrice != null &&
      (submitData.price == null ||
        submitData.discountedPrice >= submitData.price)
    ) {
      toast.error("Discount price must be lower than price");
      return;
    }

    if (!submitData.slug || !submitData.name) {
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
            ...submitData,
            projectId: selectedProjectId,
            categoryId: selectedCategoryId || null,
            productType,
            images,
            attributes: productType === "variable" ? attributeGroups : [],
            variants: productType === "variable" ? variants : [],
            variantGalleries:
              productType === "variable" ? variantGalleries : {},
          }),
        });

        if (response.ok) {
          const data = await response.json();
          toast.success(
            submitData.status === "published"
              ? "Product published successfully"
              : "Product created successfully",
          );
          router.push(`/products/${data.product.id}`);
        } else {
          const error = await response.json();
          toast.error(error.error || "Failed to create product");
        }
      } else {
        if (!productId) {
          toast.error("Product ID not found");
          setSaving(false);
          return;
        }

        const response = await apiFetch(API_PATH, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: productId,
            ...submitData,
            categoryId: selectedCategoryId || null,
            productType,
            images,
            attributes: productType === "variable" ? attributeGroups : [],
            variants: productType === "variable" ? variants : [],
            variantGalleries:
              productType === "variable" ? variantGalleries : {},
          }),
        });

        if (response.ok) {
          toast.success(
            submitData.status === "published"
              ? "Product published successfully"
              : "Product updated successfully",
          );
          if (submitData.status === "published") {
            setFormData((prev) => ({ ...prev, status: "published" }));
          }
        } else {
          const error = await response.json();
          toast.error(error.error || "Failed to update product");
        }
      }
    } catch (error) {
      console.error(
        `Error ${isCreateMode ? "creating" : "updating"} product:`,
        error,
      );
      toast.error(`Failed to ${isCreateMode ? "create" : "update"} product`);
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
          Loading product...
        </p>
      </div>
    );
  }

  return (
    <PageFrame
      title={isCreateMode ? "Add New Product" : "Edit Product"}
      description={
        isCreateMode
          ? "Fill in the details below to add a new product."
          : "Update the details below to edit this product."
      }
      headerAction={
        <>
          <Button
            onClick={() => handleSubmit({ status: "draft" })}
            disabled={saving}
            variant="outline"
            className="h-10 bg-neutral-100 px-4 text-neutral-800 shadow-sm dark:bg-neutral-800 dark:text-neutral-100"
          >
            {saving ? "Saving..." : "Save as Draft"}
          </Button>
          <Button
            onClick={() => handleSubmit()}
            disabled={saving}
            variant="default"
            className="h-10 shadow-sm"
          >
            {saving
              ? isCreateMode
                ? "Creating..."
                : "Saving..."
              : isCreateMode
                ? "Add product"
                : "Save Changes"}
          </Button>
        </>
      }
      aside={
        <div className="space-y-6 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 sm:p-6">
          <div>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">
              Settings
            </h2>
          </div>
          {/* Status */}
          <div>
            <Label htmlFor="status">Status</Label>
            <FieldHint>
              Choose whether customers can see this product.
            </FieldHint>
            <Select
              value={formData.status || "draft"}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  status: value as "published" | "draft" | "private",
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Collection */}
          <div>
            <Label htmlFor="collection">Collection</Label>
            <FieldHint>
              Group this product with related items in your store.
            </FieldHint>
            <Select
              value={selectedCategoryId || "none"}
              onValueChange={(value) =>
                setSelectedCategoryId(value === "none" ? "" : value)
              }
            >
              <SelectTrigger id="collection">
                <SelectValue placeholder="Select collection" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Collection</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="isFeatured" className="cursor-pointer">
                Featured Product
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
              Highlight this product in featured sections.
            </p>
          </div>
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
              Inactive products are hidden from your storefront.
            </p>
          </div>
        </div>
      }
    >
      <div className="admin-product-editor min-w-0">
        <div className="space-y-6">
          {/* Form */}
          <div className="space-y-7 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 sm:p-7">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <Label htmlFor="name">
                  Name <span className="text-red-500">*</span>
                </Label>
                <FieldHint>
                  Enter the name customers will see for this product.
                </FieldHint>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Product name"
                />
              </div>
              <div>
                <Label htmlFor="slug">
                  Slug <span className="text-red-500">*</span>
                </Label>
                <FieldHint>
                  This forms the product URL. Use lowercase letters and hyphens.
                </FieldHint>
                <div className="flex gap-2">
                  <Input
                    id="slug"
                    value={formData.slug || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    placeholder="product-url"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateSlugFromName}
                    className="px-3"
                    title="Auto generate slug from name"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="productShortDescription">Short Description</Label>
              <FieldHint>
                Add a brief summary for product cards and search results.
              </FieldHint>
              <Textarea
                id="productShortDescription"
                value={formData.shortDescription || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    shortDescription: e.target.value,
                  })
                }
                placeholder="Brief summary of the product"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="description">Full Description</Label>
              <FieldHint>
                Describe the product’s features and details for its page.
              </FieldHint>
              <TextEditor
                htmlContent={formData.description || ""}
                setHtmlContent={(content: string) =>
                  setFormData({ ...formData, description: content })
                }
              />
            </div>

            <ProductOptionsEditor
              projectId={selectedProjectId}
              productType={productType}
              onProductTypeChange={setProductType}
              images={images}
              onImagesChange={setImages}
              attributeTypes={attributeTypes}
              onAttributeTypesChange={setAttributeTypes}
              groups={attributeGroups}
              onGroupsChange={setAttributeGroups}
              variants={variants}
              onVariantsChange={setVariants}
              variantGalleries={variantGalleries}
              onVariantGalleriesChange={setVariantGalleries}
              basePrice={formData.price ?? null}
              simpleData={{
                sku: formData.sku || "",
                price: formData.price ?? null,
                discountedPrice: formData.discountedPrice ?? null,
                inventoryQuantity: formData.inventoryQuantity ?? 0,
                lowStockThreshold: formData.lowStockThreshold ?? 5,
                weight: formData.weight ?? null,
                dimensions:
                  (formData.dimensions as {
                    length?: number | null;
                    width?: number | null;
                    height?: number | null;
                  } | null) || {},
              }}
              onSimpleDataChange={(changes) =>
                setFormData((current) => ({ ...current, ...changes }))
              }
              catalogueSettings={{
                productKind:
                  (formData.productKind as
                    "physical" | "digital" | "service" | "membership") ||
                  "physical",
                trackInventory: formData.trackInventory ?? false,
              }}
              onCatalogueSettingsChange={(changes) =>
                setFormData((current) => ({ ...current, ...changes }))
              }
            />
          </div>
        </div>
      </div>
    </PageFrame>
  );
}
