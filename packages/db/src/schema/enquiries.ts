import { pgTable, text, timestamp, uuid, varchar, boolean, integer, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { lifecycleStatusEnum, enquiryStatusEnum } from "./common.js";
import { projects, pages } from "./sites.js";
import { users } from "./identity.js";

export const forms = pgTable(
  "forms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    purpose: varchar("purpose", { length: 40 }).notNull().default("general"),
    schemaHash: varchar("schema_hash", { length: 64 }),
    status: lifecycleStatusEnum("status").notNull().default("active"),
    settings: jsonb("settings").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    schemaIdentity: uniqueIndex("forms_project_schema_hash_idx").on(
      table.projectId,
      table.schemaHash,
    ),
  }),
);

export const formFields = pgTable(
  "form_fields",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    key: varchar("key", { length: 100 }).notNull(),
    label: varchar("label", { length: 255 }).notNull(),
    fieldType: varchar("field_type", { length: 40 }).notNull(),
    required: boolean("required").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    options: jsonb("options"),
    placeholder: varchar("placeholder", { length: 500 }),
    layout: varchar("layout", { length: 40 })
      .notNull()
      .default("col-span-full"),
  },
  (table) => ({
    formKey: uniqueIndex("form_fields_form_key_idx").on(
      table.formId,
      table.key,
    ),
  }),
);

export const contacts = pgTable("contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 320 }),
  name: varchar("name", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const enquiries = pgTable(
  "enquiries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    formId: uuid("form_id").references(() => forms.id, {
      onDelete: "set null",
    }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    sourcePageId: uuid("source_page_id").references(() => pages.id, {
      onDelete: "set null",
    }),
    assignedTo: uuid("assigned_to").references(() => users.id, {
      onDelete: "set null",
    }),
    followUpAt: timestamp("follow_up_at", { mode: "date" }),
    status: enquiryStatusEnum("status").notNull().default("new"),
    payload: jsonb("payload").notNull().default({}),
    fieldSnapshot: jsonb("field_snapshot").notNull().default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectStatus: index("enquiries_project_status_idx").on(
      table.projectId,
      table.status,
      table.createdAt,
    ),
  }),
);

export const enquiryNotes = pgTable("enquiry_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  enquiryId: uuid("enquiry_id")
    .notNull()
    .references(() => enquiries.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").references(() => users.id, {
    onDelete: "set null",
  }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const consents = pgTable("consents", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  contactId: uuid("contact_id").references(() => contacts.id, {
    onDelete: "set null",
  }),
  purpose: varchar("purpose", { length: 100 }).notNull(),
  granted: boolean("granted").notNull(),
  policyVersion: varchar("policy_version", { length: 50 }).notNull(),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});
