import { pgTable, text, timestamp, uuid, varchar, boolean, integer, jsonb, real, uniqueIndex, index, check, numeric } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { statusEnum } from "./common.js";
import type { Formify } from "./common.js";
import { projects, pages } from "./sites.js";
import { users } from "./identity.js";
import { contacts } from "./enquiries.js";

export const productCategories = pgTable(
  "product_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    heading: varchar("heading", { length: 255 }),
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description"),
    metaTitle: varchar("meta_title", { length: 255 }),
    metaKeywords: text("meta_keywords"),
    metaDescription: text("meta_description"),
    image: varchar("image", { length: 500 }),
    parentId: uuid("parent_id"), // self-referencing for nested categories
    sortOrder: integer("sort_order").default(0),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectSlugIndex: uniqueIndex("product_categories_project_slug_idx").on(
      table.projectId,
      table.slug,
    ),
  }),
);
export type ProductCategories = InferSelectModel<typeof productCategories>;
export type ProductCategoriesFormData = Omit<
  Formify<InferInsertModel<typeof productCategories>>,
  "id" | "projectId" | "parentId" | "createdAt" | "updatedAt"
>;

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => productCategories.id),
    pageId: uuid("page_id").references(() => pages.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description"),
    shortDescription: text("short_description"),
    productType: varchar("product_type", { length: 20 })
      .notNull()
      .default("simple"),
    productKind: varchar("product_kind", { length: 20 })
      .notNull()
      .default("physical"),
    price: real("price"), // float for precision
    discountedPrice: real("discounted_price"),
    sku: varchar("sku", { length: 100 }),
    weight: integer("weight"), // grams
    dimensions: jsonb("dimensions"), // {length, width, height}
    images: jsonb("images"), // array of URLs
    attributes: jsonb("attributes"), // selected attribute groups and values
    variants: jsonb("variants"), // generated product variants
    variantGalleries: jsonb("variant_galleries"), // galleries keyed by attribute value
    isActive: boolean("is_active").default(true),
    isFeatured: boolean("is_featured").default(false),
    inventoryQuantity: integer("inventory_quantity").default(0),
    trackInventory: boolean("track_inventory").notNull().default(false),
    lowStockThreshold: integer("low_stock_threshold").default(5),
    vendor: varchar("vendor", { length: 255 }),
    tags: jsonb("tags"),
    barcode: varchar("barcode", { length: 255 }),
    taxStatus: varchar("tax_status", { length: 30 }),
    seoTitle: varchar("seo_title", { length: 255 }),
    seoDescription: text("seo_description"),
    sourceMetadata: jsonb("source_metadata"),
    pluginMetadata: jsonb("plugin_metadata"),
    downloadMetadata: jsonb("download_metadata"),
    status: statusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectSlugIndex: uniqueIndex("products_project_slug_idx").on(
      table.projectId,
      table.slug,
    ),
    projectStatusIndex: index("products_project_status_idx").on(
      table.projectId,
      table.status,
    ),
    projectNameIdIndex: index("products_project_name_id_idx").on(
      table.projectId,
      table.name,
      table.id,
    ),
  }),
);
export type Products = InferSelectModel<typeof products>;
export type ProductsFormData = Omit<
  Formify<InferInsertModel<typeof products>>,
  "id" | "projectId" | "categoryId" | "createdAt" | "updatedAt"
>;

/* ============================
   CATALOG MIGRATION
============================ */
export const migrationRuns = pgTable(
  "migration_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    platform: varchar("platform", { length: 20 }).notNull(),
    sourceFilename: varchar("source_filename", { length: 255 }).notNull(),
    detectedProfiles: jsonb("detected_profiles"),
    mappingConfig: jsonb("mapping_config"),
    status: varchar("status", { length: 20 }).notNull().default("preview"),
    previewedAt: timestamp("previewed_at").defaultNow().notNull(),
    committedAt: timestamp("committed_at"),
    counts: jsonb("counts"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectCreatedIndex: index("migration_runs_project_created_idx").on(
      table.projectId,
      table.createdAt,
    ),
    projectStatusIndex: index("migration_runs_project_status_idx").on(
      table.projectId,
      table.status,
      table.createdAt,
    ),
  }),
);
export type MigrationRuns = InferSelectModel<typeof migrationRuns>;

export const migrationRows = pgTable(
  "migration_rows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => migrationRuns.id, { onDelete: "cascade" }),
    sourceRowNumber: integer("source_row_number").notNull(),
    rawRow: jsonb("raw_row").notNull(),
    normalizedRecord: jsonb("normalized_record"),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    errors: jsonb("errors"),
    warnings: jsonb("warnings"),
    createdProductId: uuid("created_product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    createdCategoryId: uuid("created_category_id").references(
      () => productCategories.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    runSourceIndex: index("migration_rows_run_source_idx").on(
      table.runId,
      table.sourceRowNumber,
    ),
    runStatusIndex: index("migration_rows_run_status_idx").on(
      table.runId,
      table.status,
    ),
  }),
);

export const productExternalRefs = pgTable(
  "product_external_refs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    platform: varchar("platform", { length: 20 }).notNull(),
    sourceExternalId: varchar("source_external_id", { length: 500 }).notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    migrationRunId: uuid("migration_run_id").references(
      () => migrationRuns.id,
      { onDelete: "set null" },
    ),
    createdByRun: boolean("created_by_run").notNull().default(false),
  },
  (table) => ({
    identity: uniqueIndex("product_external_refs_identity_idx").on(
      table.projectId,
      table.platform,
      table.sourceExternalId,
    ),
  }),
);

export const categoryExternalRefs = pgTable(
  "category_external_refs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    platform: varchar("platform", { length: 20 }).notNull(),
    sourceExternalId: varchar("source_external_id", { length: 500 }).notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => productCategories.id, { onDelete: "cascade" }),
  },
  (table) => ({
    identity: uniqueIndex("category_external_refs_identity_idx").on(
      table.projectId,
      table.platform,
      table.sourceExternalId,
    ),
  }),
);

export const productAttributeTypes = pgTable("product_attribute_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  kind: varchar("kind", { length: 20 }).notNull().default("general"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type ProductAttributeTypes = InferSelectModel<
  typeof productAttributeTypes
>;

export const productAttributes = pgTable("product_attributes", {
  id: uuid("id").defaultRandom().primaryKey(),
  typeId: uuid("type_id")
    .notNull()
    .references(() => productAttributeTypes.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 100 }).notNull(),
  value: varchar("value", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type ProductAttributes = InferSelectModel<typeof productAttributes>;

export const shipments = pgTable(
  "shipments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 80 }).notNull(),
    externalShipmentId: varchar("external_shipment_id", { length: 255 }),
    externalRateId: varchar("external_rate_id", { length: 255 }),
    trackingNumber: varchar("tracking_number", { length: 255 }),
    trackingUrl: text("tracking_url"),
    labelUrl: text("label_url"),
    status: varchar("status", { length: 40 }).notNull().default("pending"),
    amount: numeric("amount", { precision: 20, scale: 6 }),
    currency: varchar("currency", { length: 3 }),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    orderUnique: uniqueIndex("shipments_order_unique_idx").on(table.orderId),
    orderCreated: index("shipments_order_created_idx").on(
      table.orderId,
      table.createdAt,
    ),
    externalShipment: uniqueIndex("shipments_provider_external_id_idx").on(
      table.provider,
      table.externalShipmentId,
    ),
  }),
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    status: varchar("status", { length: 30 }).notNull().default("pending"),
    currency: varchar("currency", { length: 3 }).notNull(),
    subtotal: numeric("subtotal", { precision: 20, scale: 6 })
      .notNull()
      .default("0"),
    total: numeric("total", { precision: 20, scale: 6 }).notNull().default("0"),
    provider: varchar("provider", { length: 50 }),
    providerReference: varchar("provider_reference", { length: 255 }),
    idempotencyKey: varchar("idempotency_key", { length: 80 }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectStatus: index("orders_project_status_idx").on(
      table.projectId,
      table.status,
      table.createdAt,
    ),
    projectIdempotency: uniqueIndex("orders_project_idempotency_idx").on(
      table.projectId,
      table.idempotencyKey,
    ),
  }),
);

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  name: varchar("name", { length: 255 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 20, scale: 6 }).notNull(),
  metadata: jsonb("metadata"),
});

export const carts = pgTable(
  "carts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    status: varchar("status", { length: 30 }).notNull().default("active"),
    currency: varchar("currency", { length: 3 }).notNull(),
    subtotal: numeric("subtotal", { precision: 20, scale: 6 })
      .notNull()
      .default("0"),
    total: numeric("total", { precision: 20, scale: 6 }).notNull().default("0"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectStatus: index("carts_project_status_idx").on(
      table.projectId,
      table.status,
      table.createdAt,
    ),
  }),
);

export const cartItems = pgTable("cart_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  cartId: uuid("cart_id")
    .notNull()
    .references(() => carts.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  name: varchar("name", { length: 255 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 20, scale: 6 }).notNull(),
  metadata: jsonb("metadata"),
});

export const discounts = pgTable(
  "discounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 100 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    type: varchar("type", { length: 20 }).notNull(),
    amount: numeric("amount", { precision: 20, scale: 6 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    usageLimit: integer("usage_limit"),
    usageCount: integer("usage_count").notNull().default(0),
    startsAt: timestamp("starts_at"),
    endsAt: timestamp("ends_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectCode: uniqueIndex("discounts_project_code_idx").on(
      table.projectId,
      table.code,
    ),
  }),
);

export const orderReturns = pgTable(
  "order_returns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    status: varchar("status", { length: 30 }).notNull().default("requested"),
    reason: text("reason"),
    total: numeric("total", { precision: 20, scale: 6 }).notNull().default("0"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectStatus: index("order_returns_project_status_idx").on(
      table.projectId,
      table.status,
      table.createdAt,
    ),
  }),
);

export const commerceSettings = pgTable(
  "commerce_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 40 }).notNull(),
    data: jsonb("data").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectKind: uniqueIndex("commerce_settings_project_kind_idx").on(
      table.projectId,
      table.kind,
    ),
  }),
);

export const inventoryLocations = pgTable(
  "inventory_locations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    code: varchar("code", { length: 40 }).notNull(),
    address: text("address"),
    active: boolean("active").notNull().default(true),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectCode: uniqueIndex("inventory_locations_project_code_idx").on(
      table.projectId,
      table.code,
    ),
    oneDefault: uniqueIndex("inventory_locations_one_default_idx")
      .on(table.projectId)
      .where(sql`${table.isDefault} = true`),
  }),
);

export const inventoryBalances = pgTable(
  "inventory_balances",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => inventoryLocations.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull().default(0),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    productLocation: uniqueIndex("inventory_balances_product_location_idx").on(
      table.productId,
      table.locationId,
    ),
    locationProduct: index("inventory_balances_location_product_idx").on(
      table.locationId,
      table.productId,
    ),
    nonnegative: check(
      "inventory_balances_nonnegative",
      sql`${table.quantity} >= 0`,
    ),
  }),
);

export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    locationId: uuid("location_id").references(() => inventoryLocations.id, {
      onDelete: "set null",
    }),
    quantityChange: integer("quantity_change").notNull(),
    reason: varchar("reason", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    projectCreatedIdIndex: index(
      "inventory_movements_project_created_id_idx",
    ).on(table.projectId, table.createdAt, table.id),
  }),
);
