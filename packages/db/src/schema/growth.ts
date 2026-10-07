import { pgTable, text, timestamp, uuid, varchar, boolean, integer, jsonb, uniqueIndex, index, numeric } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { projects, pages } from "./sites.js";
import { users } from "./identity.js";

export const analyticsConsentSettings = pgTable("analytics_consent_settings", {
  projectId: uuid("project_id")
    .primaryKey()
    .references(() => projects.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull().default(true),
  policyVersion: varchar("policy_version", { length: 50 })
    .notNull()
    .default("1"),
  title: varchar("title", { length: 160 })
    .notNull()
    .default("Your privacy choices"),
  message: text("message")
    .notNull()
    .default("Allow analytics cookies to help improve this site?"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const growthConnections = pgTable(
  "growth_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 40 }).notNull(),
    status: varchar("status", { length: 30 }).notNull().default("connected"),
    propertyId: varchar("property_id", { length: 255 }),
    encryptedCredentials: jsonb("encrypted_credentials").notNull(),
    settings: jsonb("settings").notNull().default({}),
    lastSyncedAt: timestamp("last_synced_at"),
    lastError: varchar("last_error", { length: 500 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectProvider: uniqueIndex("growth_connections_project_provider_idx").on(
      table.projectId,
      table.provider,
    ),
  }),
);

export const growthExperiments = pgTable(
  "growth_experiments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    targetType: varchar("target_type", { length: 30 }).notNull(),
    targetId: varchar("target_id", { length: 255 }),
    primaryEvent: varchar("primary_event", { length: 100 }).notNull(),
    baselineRate: numeric("baseline_rate", { precision: 8, scale: 6 }),
    minimumDetectableEffect: numeric("minimum_detectable_effect", {
      precision: 8,
      scale: 6,
    }).notNull(),
    sampleSizeTarget: integer("sample_size_target").notNull(),
    guardrailEvents: jsonb("guardrail_events").notNull().default([]),
    startedAt: timestamp("started_at"),
    endedAt: timestamp("ended_at"),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectStatus: index("growth_experiments_project_status_idx").on(
      table.projectId,
      table.status,
    ),
    runningTarget: uniqueIndex("growth_experiments_running_target_idx")
      .on(
        table.projectId,
        table.targetType,
        sql`coalesce(${table.targetId}, '')`,
      )
      .where(sql`${table.status} = 'running'`),
  }),
);

export const growthExperimentVariants = pgTable(
  "growth_experiment_variants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    experimentId: uuid("experiment_id")
      .notNull()
      .references(() => growthExperiments.id, { onDelete: "cascade" }),
    key: varchar("key", { length: 40 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    isControl: boolean("is_control").notNull().default(false),
    allocation: integer("allocation").notNull(),
    experience: jsonb("experience").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    experimentKey: uniqueIndex(
      "growth_experiment_variants_experiment_key_idx",
    ).on(table.experimentId, table.key),
  }),
);

export const growthExperimentAssignments = pgTable(
  "growth_experiment_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    experimentId: uuid("experiment_id")
      .notNull()
      .references(() => growthExperiments.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => growthExperimentVariants.id, { onDelete: "cascade" }),
    visitorKeyHash: varchar("visitor_key_hash", { length: 64 }).notNull(),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  },
  (table) => ({
    assignment: uniqueIndex("growth_experiment_assignments_visitor_idx").on(
      table.experimentId,
      table.visitorKeyHash,
    ),
  }),
);

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    sessionKey: varchar("session_key", { length: 255 }),
    clientEventId: varchar("client_event_id", { length: 64 }),
    eventName: varchar("event_name", { length: 100 }).notNull(),
    pagePath: varchar("page_path", { length: 1000 }),
    occurredAt: timestamp("occurred_at").defaultNow().notNull(),
    properties: jsonb("properties"),
  },
  (table) => ({
    projectEvent: index("analytics_events_project_event_idx").on(
      table.projectId,
      table.eventName,
      table.occurredAt,
    ),
    deduplication: uniqueIndex("analytics_events_project_client_event_idx").on(
      table.projectId,
      table.clientEventId,
    ),
  }),
);

export const projectPageviewUsageDaily = pgTable(
  "project_pageview_usage_daily",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    periodStart: timestamp("period_start").notNull(),
    pageViews: numeric("page_views", { precision: 30, scale: 0 })
      .notNull()
      .default("0"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectDay: uniqueIndex("project_pageview_usage_daily_identity_idx").on(
      table.projectId,
      table.periodStart,
    ),
  }),
);

export const campaigns = pgTable("campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  channel: varchar("channel", { length: 40 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("draft"),
  audience: jsonb("audience"),
  content: jsonb("content"),
  scheduledAt: timestamp("scheduled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const seoAudits = pgTable(
  "seo_audits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    pageId: uuid("page_id").references(() => pages.id, { onDelete: "cascade" }),
    score: integer("score"),
    findings: jsonb("findings").notNull().default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    projectCreatedAtIndex: index("seo_audits_project_created_at_idx").on(
      table.projectId,
      table.createdAt,
    ),
  }),
);

export const seoAiSuggestions = pgTable(
  "seo_ai_suggestions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    targetType: varchar("target_type", { length: 30 }).notNull(),
    targetId: uuid("target_id").notNull(),
    field: varchar("field", { length: 40 }).notNull(),
    beforeValue: text("before_value"),
    afterValue: text("after_value").notNull(),
    rationale: text("rationale").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    appliedAt: timestamp("applied_at"),
  },
  (table) => ({
    projectStatus: index("seo_ai_suggestions_project_status_idx").on(
      table.projectId,
      table.status,
      table.createdAt,
    ),
  }),
);

export const seoProviderUsage = pgTable(
  "seo_provider_usage",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 40 }).notNull(),
    operation: varchar("operation", { length: 40 }).notNull(),
    amountUsd: numeric("amount_usd", { precision: 10, scale: 6 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("reserved"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    projectMonth: index("seo_provider_usage_project_created_idx").on(
      table.projectId,
      table.createdAt,
    ),
    platformMonth: index("seo_provider_usage_created_idx").on(table.createdAt),
  }),
);

export const seoProviderTasks = pgTable(
  "seo_provider_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    requestId: uuid("request_id").notNull(),
    providerTaskId: varchar("provider_task_id", { length: 100 }),
    operation: varchar("operation", { length: 40 }).notNull(),
    input: jsonb("input").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("submitting"),
    result: jsonb("result"),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }),
    usageId: uuid("usage_id").references(() => seoProviderUsage.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    requestUnique: uniqueIndex("seo_provider_tasks_project_request_idx").on(
      table.projectId,
      table.requestId,
    ),
    projectStatus: index("seo_provider_tasks_project_status_idx").on(
      table.projectId,
      table.status,
      table.createdAt,
    ),
    statusExpiry: index("seo_provider_tasks_status_expiry_idx").on(
      table.status,
      table.expiresAt,
    ),
  }),
);
