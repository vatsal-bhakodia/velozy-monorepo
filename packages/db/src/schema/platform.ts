import { pgTable, text, timestamp, uuid, varchar, boolean, integer, jsonb, index, uniqueIndex, numeric } from "drizzle-orm/pg-core";
import { projects } from "./sites.js";
import { users, organizations } from "./identity.js";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 100 }).notNull(),
    entityId: uuid("entity_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    projectCreated: index("audit_logs_project_created_idx").on(
      table.projectId,
      table.createdAt,
    ),
  }),
);

export const siteCapabilities = pgTable(
  "site_capabilities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    capability: varchar("capability", { length: 80 }).notNull(),
    enabled: boolean("enabled").notNull().default(false),
    source: varchar("source", { length: 30 }).notNull().default("manual"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectCapability: uniqueIndex(
      "site_capabilities_project_capability_idx",
    ).on(table.projectId, table.capability),
  }),
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 50 }).notNull(),
    externalId: varchar("external_id", { length: 255 }),
    plan: varchar("plan", { length: 80 }).notNull(),
    status: varchar("status", { length: 30 }).notNull(),
    currentPeriodEnd: timestamp("current_period_end"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    providerIdentity: uniqueIndex("subscriptions_provider_identity_idx").on(
      table.provider,
      table.externalId,
    ),
  }),
);

export const usageRecords = pgTable(
  "usage_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    metric: varchar("metric", { length: 80 }).notNull(),
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    quantity: numeric("quantity", { precision: 20, scale: 6 })
      .notNull()
      .default("0"),
  },
  (table) => ({
    identity: uniqueIndex("usage_records_identity_idx").on(
      table.organizationId,
      table.metric,
      table.periodStart,
      table.periodEnd,
    ),
  }),
);

export const integrations = pgTable(
  "integrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 80 }).notNull(),
    status: varchar("status", { length: 30 }).notNull().default("connected"),
    credentialsRef: varchar("credentials_ref", { length: 255 }),
    encryptedCredentials: jsonb("encrypted_credentials"),
    settings: jsonb("settings"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    provider: uniqueIndex("integrations_project_provider_idx").on(
      table.projectId,
      table.provider,
    ),
  }),
);

export const integrationWebhookEvents = pgTable(
  "integration_webhook_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 80 }).notNull(),
    externalEventId: varchar("external_event_id", { length: 255 }).notNull(),
    eventType: varchar("event_type", { length: 120 }).notNull(),
    processedAt: timestamp("processed_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    providerEvent: uniqueIndex("integration_webhook_provider_event_idx").on(
      table.provider,
      table.externalEventId,
    ),
  }),
);
