import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { projects } from "./sites.js";
import { media } from "./sites.js";
import { users } from "./identity.js";

export const seoCampaigns = pgTable(
  "seo_campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 24 }).notNull().default("setup"),
    profile: jsonb("profile").notNull().default({}),
    profileConfirmedAt: timestamp("profile_confirmed_at"),
    profileConfirmedBy: uuid("profile_confirmed_by").references(
      () => users.id,
      { onDelete: "set null" },
    ),
    settings: jsonb("settings").notNull().default({}),
    autopilotEnabled: boolean("autopilot_enabled").notNull().default(false),
    autopilotAuthorizedAt: timestamp("autopilot_authorized_at"),
    autopilotAuthorizedBy: uuid("autopilot_authorized_by").references(
      () => users.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    project: uniqueIndex("seo_campaigns_project_idx").on(table.projectId),
  }),
);

export const seoCampaignCompetitors = pgTable(
  "seo_campaign_competitors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => seoCampaigns.id, { onDelete: "cascade" }),
    domain: varchar("domain", { length: 253 }).notNull(),
    classification: varchar("classification", { length: 32 })
      .notNull()
      .default("search_competitor"),
    status: varchar("status", { length: 20 }).notNull().default("candidate"),
    evidence: jsonb("evidence").notNull().default({}),
    verifiedAt: timestamp("verified_at"),
    verifiedBy: uuid("verified_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    identity: uniqueIndex("seo_campaign_competitors_identity_idx").on(
      table.campaignId,
      table.domain,
    ),
    campaignStatus: index("seo_campaign_competitors_status_idx").on(
      table.campaignId,
      table.status,
    ),
  }),
);

export const seoCampaignJobs = pgTable(
  "seo_campaign_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => seoCampaigns.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 32 }).notNull(),
    status: varchar("status", { length: 24 }).notNull().default("queued"),
    progress: integer("progress").notNull().default(0),
    input: jsonb("input").notNull().default({}),
    result: jsonb("result"),
    lastError: text("last_error"),
    attempts: integer("attempts").notNull().default(0),
    queueJobId: varchar("queue_job_id", { length: 100 }),
    idempotencyKey: varchar("idempotency_key", { length: 100 }),
    leaseToken: uuid("lease_token"),
    lockExpiresAt: timestamp("lock_expires_at"),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    campaignStatus: index("seo_campaign_jobs_status_idx").on(
      table.campaignId,
      table.status,
      table.createdAt,
    ),
    queueId: uniqueIndex("seo_campaign_jobs_queue_id_idx").on(
      table.queueJobId,
    ),
    idempotency: uniqueIndex("seo_campaign_jobs_idempotency_idx").on(
      table.campaignId,
      table.idempotencyKey,
    ),
  }),
);

export const seoCampaignResearchRuns = pgTable(
  "seo_campaign_research_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id").notNull().references(() => seoCampaigns.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    status: varchar("status", { length: 24 }).notNull().default("queued"),
    profileSnapshot: jsonb("profile_snapshot").notNull().default({}),
    locale: jsonb("locale").notNull().default({}),
    result: jsonb("result"),
    lastError: text("last_error"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    version: uniqueIndex("seo_campaign_research_runs_version_idx").on(table.campaignId, table.version),
    status: index("seo_campaign_research_runs_status_idx").on(table.campaignId, table.status, table.createdAt),
  }),
);

export const seoCampaignResearchEvidence = pgTable(
  "seo_campaign_research_evidence",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id").notNull().references(() => seoCampaignResearchRuns.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 32 }).notNull(),
    source: varchar("source", { length: 64 }).notNull(),
    subject: varchar("subject", { length: 500 }).notNull(),
    locale: varchar("locale", { length: 32 }),
    payload: jsonb("payload").notNull().default({}),
    retrievedAt: timestamp("retrieved_at").defaultNow().notNull(),
  },
  (table) => ({
    runKind: index("seo_campaign_research_evidence_run_kind_idx").on(table.runId, table.kind),
    subject: index("seo_campaign_research_evidence_subject_idx").on(table.subject, table.retrievedAt),
    identity: uniqueIndex("seo_campaign_research_evidence_identity_idx").on(table.runId, table.kind, table.source, table.subject),
  }),
);

export const seoCampaignOpportunities = pgTable(
  "seo_campaign_opportunities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => seoCampaigns.id, { onDelete: "cascade" }),
    researchRunId: uuid("research_run_id").references(() => seoCampaignResearchRuns.id, { onDelete: "set null" }),
    candidateKey: varchar("candidate_key", { length: 255 }),
    cluster: varchar("cluster", { length: 255 }).notNull(),
    intent: varchar("intent", { length: 40 }).notNull(),
    targetType: varchar("target_type", { length: 24 }).notNull(),
    targetId: uuid("target_id"),
    targetPath: varchar("target_path", { length: 500 }),
    action: varchar("action", { length: 32 }).notNull(),
    status: varchar("status", { length: 24 }).notNull().default("proposed"),
    keywords: jsonb("keywords").notNull().default([]),
    evidence: jsonb("evidence").notNull().default({}),
    metrics: jsonb("metrics").notNull().default({}),
    rationale: text("rationale").notNull(),
    confidence: varchar("confidence", { length: 16 }).notNull().default("medium"),
    score: integer("score"),
    scoreBreakdown: jsonb("score_breakdown").notNull().default({}),
    evidenceCoverage: integer("evidence_coverage"),
    autopilotEligible: boolean("autopilot_eligible").notNull().default(false),
    approvedAt: timestamp("approved_at"),
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
    draft: jsonb("draft"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    campaignStatus: index("seo_campaign_opportunities_status_idx").on(
      table.campaignId,
      table.status,
      table.createdAt,
    ),
    researchRun: index("seo_campaign_opportunities_run_idx").on(table.researchRunId, table.score),
    runCandidate: uniqueIndex("seo_campaign_opportunities_run_candidate_idx").on(table.researchRunId, table.candidateKey),
  }),
);

export const seoCampaignPublications = pgTable(
  "seo_campaign_publications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => seoCampaigns.id, { onDelete: "cascade" }),
    opportunityId: uuid("opportunity_id").references(
      () => seoCampaignOpportunities.id,
      { onDelete: "set null" },
    ),
    targetType: varchar("target_type", { length: 24 }).notNull(),
    targetId: uuid("target_id").notNull(),
    beforeValue: jsonb("before_value"),
    afterValue: jsonb("after_value").notNull(),
    publishedBy: uuid("published_by").references(() => users.id, {
      onDelete: "set null",
    }),
    publishedAt: timestamp("published_at").defaultNow().notNull(),
    rollbackOf: uuid("rollback_of"),
  },
  (table) => ({
    campaignPublished: index("seo_campaign_publications_created_idx").on(
      table.campaignId,
      table.publishedAt,
    ),
  }),
);

export const seoCampaignAssets = pgTable(
  "seo_campaign_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => seoCampaigns.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    source: jsonb("source").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    mediaIdentity: uniqueIndex("seo_campaign_assets_media_idx").on(
      table.mediaId,
    ),
    campaignCreated: index("seo_campaign_assets_campaign_idx").on(
      table.campaignId,
      table.createdAt,
    ),
  }),
);
