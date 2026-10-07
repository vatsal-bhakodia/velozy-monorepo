import { pgTable, text, timestamp, uuid, varchar, boolean, integer, jsonb, uniqueIndex, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { statusEnum, lifecycleStatusEnum, approvalStatusEnum } from "./common.js";
import type { Formify } from "./common.js";
import { projects } from "./sites.js";
import { users } from "./identity.js";

export const blogCategories = pgTable("blog_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  image: varchar("image", { length: 500 }),
  parentId: uuid("parent_id"), // self-referencing
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type BlogCategories = InferSelectModel<typeof blogCategories>;
export type BlogCategoriesFormData = Omit<
  Formify<InferInsertModel<typeof blogCategories>>,
  "id" | "projectId" | "parentId" | "createdAt" | "updatedAt"
>;

export const blogs = pgTable("blogs", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => blogCategories.id),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content"),
  featuredImage: varchar("featured_image", { length: 500 }),
  images: jsonb("images"),
  tags: jsonb("tags"),
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: text("meta_description"),
  metaKeywords: varchar("meta_keywords", { length: 500 }),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  isFeatured: boolean("is_featured").default(false),
  isPublished: boolean("is_published").default(false),
  publishedAt: timestamp("published_at"),
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type Blogs = InferSelectModel<typeof blogs>;

export const contentPlans = pgTable(
  "content_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 20 }).notNull(),
    blogId: uuid("blog_id").references(() => blogs.id, { onDelete: "cascade" }),
    channel: varchar("channel", { length: 40 }),
    text: text("text"),
    mediaIds: jsonb("media_ids").notNull().default([]),
    status: varchar("status", { length: 20 }).notNull(),
    scheduledAt: timestamp("scheduled_at"),
    timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at"),
    lockExpiresAt: timestamp("lock_expires_at"),
    leaseToken: uuid("lease_token"),
    failureKind: varchar("failure_kind", { length: 20 }),
    lastError: text("last_error"),
    publishedAt: timestamp("published_at"),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    blogIdentity: uniqueIndex("content_plans_blog_identity_idx")
      .on(table.blogId)
      .where(sql`${table.blogId} IS NOT NULL`),
    projectSchedule: index("content_plans_project_schedule_idx").on(
      table.projectId,
      table.scheduledAt,
    ),
    dueWork: index("content_plans_due_work_idx").on(
      table.status,
      table.nextAttemptAt,
      table.scheduledAt,
    ),
    kindState: check(
      "content_plans_kind_state_check",
      sql`(
    (${table.kind} = 'blog' AND ${table.blogId} IS NOT NULL AND ${table.channel} IS NULL AND ${table.text} IS NULL AND ${table.scheduledAt} IS NOT NULL AND ${table.status} IN ('scheduled', 'publishing', 'published', 'failed', 'cancelled'))
    OR
    (${table.kind} = 'social' AND ${table.blogId} IS NULL AND ${table.channel} IS NOT NULL AND ${table.text} IS NOT NULL AND ${table.status} IN ('draft', 'planned', 'cancelled'))
  )`,
    ),
  }),
);
export type ContentPlan = InferSelectModel<typeof contentPlans>;

export type BlogsFormData = Omit<
  Formify<InferInsertModel<typeof blogs>>,
  "id" | "projectId" | "categoryId" | "authorId" | "createdAt" | "updatedAt"
>;
