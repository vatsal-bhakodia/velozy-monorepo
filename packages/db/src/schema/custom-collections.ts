import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  boolean,
  timestamp,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { projects } from "./sites.js";
import { users } from "./identity.js";

export type CollectionFieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "date"
  | "url"
  | "image"
  | "select";
export type CollectionField = {
  key: string;
  label: string;
  type: CollectionFieldType;
  required?: boolean;
  options?: string[];
};

export const customCollections = pgTable(
  "custom_collections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    key: varchar("key", { length: 80 }).notNull(),
    description: text("description"),
    fields: jsonb("fields").$type<CollectionField[]>().notNull().default([]),
    isArchived: boolean("is_archived").notNull().default(false),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectKey: uniqueIndex("custom_collections_project_key_idx").on(
      table.projectId,
      table.key,
    ),
    projectList: index("custom_collections_project_list_idx").on(
      table.projectId,
      table.isArchived,
      table.name,
    ),
  }),
);

export const customCollectionRecords = pgTable(
  "custom_collection_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => customCollections.id, { onDelete: "cascade" }),
    values: jsonb("values")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    collectionRecords: index("custom_collection_records_order_idx").on(
      table.collectionId,
      table.status,
      table.sortOrder,
      table.createdAt,
    ),
  }),
);
