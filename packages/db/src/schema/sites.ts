import { pgTable, text, timestamp, uuid, varchar, boolean, integer, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { statusEnum, revisionStatusEnum } from "./common.js";
import type { Formify } from "./common.js";
import { users, organizations } from "./identity.js";

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  industry: varchar("industry", { length: 255 }),
  logo: varchar("logo", { length: 500 }),
  designPreference: jsonb("design_preference"),
  siteArchetype: varchar("site_archetype", { length: 30 }),
  storeType: varchar("store_type", { length: 30 }),
  capabilities: jsonb("capabilities"),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  purchaseMode: varchar("purchase_mode", { length: 20 })
    .notNull()
    .default("catalogue"),
  subdomain: varchar("subdomain", { length: 63 }).unique(),
  isPublished: boolean("is_published").notNull().default(false),
  publishedAt: timestamp("published_at"),
  publishedVersion: integer("published_version").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type Projects = InferSelectModel<typeof projects>;
export type ProjectsFormData = Omit<
  Formify<InferInsertModel<typeof projects>>,
  "id" | "userId" | "createdAt" | "updatedAt"
>;

export const pages = pgTable("pages", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  slug: varchar("slug", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  metaTitle: varchar("meta_title", { length: 255 }),
  metaKeyword: varchar("meta_keyword", { length: 500 }),
  metaDescription: text("meta_description"),
  pageData: jsonb("page_data"),
  publishedPageData: jsonb("published_page_data"),
  status: statusEnum("status").notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Page = InferSelectModel<typeof pages>;
export type PageFormData = Omit<
  Formify<InferInsertModel<typeof pages>>,
  | "id"
  | "projectId"
  | "pageData"
  | "publishedPageData"
  | "createdAt"
  | "updatedAt"
>;

export const siteDomains = pgTable(
  "site_domains",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    hostname: varchar("hostname", { length: 255 }).notNull().unique(),
    isPrimary: boolean("is_primary").notNull().default(true),
    isVerified: boolean("is_verified").notNull().default(true),
    isCustom: boolean("is_custom").notNull().default(false),
    verificationToken: varchar("verification_token", { length: 64 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectHostnameIndex: index("site_domains_project_id_idx").on(
      table.projectId,
    ),
    hostnameLookupIndex: uniqueIndex("site_domains_hostname_lookup_idx").on(
      table.hostname,
    ),
    customProjectIndex: uniqueIndex("site_domains_custom_project_idx")
      .on(table.projectId)
      .where(sql`${table.isCustom} = true`),
  }),
);
export type SiteDomains = InferSelectModel<typeof siteDomains>;

export const media = pgTable(
  "media",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    url: varchar("url", { length: 1000 }).notNull(),
    mimeType: varchar("mime_type", { length: 255 }).notNull(),
    mediaType: varchar("media_type", { length: 30 }).notNull(),
    size: integer("size").notNull(),
    altText: text("alt_text"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectCreatedAtIndex: index("media_project_created_at_idx").on(
      table.projectId,
      table.createdAt,
    ),
  }),
);
export type Media = InferSelectModel<typeof media>;

export const siteSettings = pgTable("site_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" })
    .unique(),
  identity: jsonb("identity").notNull().default({}),
  contact: jsonb("contact").notNull().default({}),
  theme: jsonb("theme").notNull().default({}),
  seoDefaults: jsonb("seo_defaults").notNull().default({}),
  locale: varchar("locale", { length: 20 }).notNull().default("en-US"),
  timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pageRevisions = pgTable(
  "page_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    revisionNumber: integer("revision_number").notNull(),
    status: revisionStatusEnum("status").notNull().default("draft"),
    content: jsonb("content").notNull().default({}),
    changeSummary: text("change_summary"),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    identity: uniqueIndex("page_revisions_identity_idx").on(
      table.pageId,
      table.revisionNumber,
    ),
    pageStatus: index("page_revisions_page_status_idx").on(
      table.pageId,
      table.status,
    ),
  }),
);

export const pageReleases = pgTable(
  "page_releases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => pageRevisions.id, { onDelete: "restrict" }),
    releasedBy: uuid("released_by").references(() => users.id, {
      onDelete: "set null",
    }),
    releasedAt: timestamp("released_at").defaultNow().notNull(),
    rollbackOf: uuid("rollback_of"),
  },
  (table) => ({
    projectReleasedIndex: index("page_releases_project_released_idx").on(
      table.projectId,
      table.releasedAt,
    ),
  }),
);

export const navigationMenus = pgTable(
  "navigation_menus",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    location: varchar("location", { length: 50 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectLocation: uniqueIndex("navigation_menus_project_location_idx").on(
      table.projectId,
      table.location,
    ),
  }),
);

export const navigationItems = pgTable("navigation_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  menuId: uuid("menu_id")
    .notNull()
    .references(() => navigationMenus.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"),
  pageId: uuid("page_id").references(() => pages.id, { onDelete: "set null" }),
  label: varchar("label", { length: 255 }).notNull(),
  href: varchar("href", { length: 1000 }),
  sortOrder: integer("sort_order").notNull().default(0),
});
