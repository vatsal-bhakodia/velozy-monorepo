import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  jsonb,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { projects } from "./sites.js";
import { users } from "./identity.js";

export const projectSubscriptions = pgTable(
  "project_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 30 }).notNull(),
    providerSubscriptionId: varchar("provider_subscription_id", { length: 255 }),
    providerCustomerId: varchar("provider_customer_id", { length: 255 }),
    plan: varchar("plan", { length: 80 }).notNull(),
    interval: varchar("interval", { length: 20 }).notNull(),
    status: varchar("status", { length: 30 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    priceAmount: integer("price_amount").notNull().default(0),
    priceVersion: varchar("price_version", { length: 40 }).notNull(),
    currentPeriodStart: timestamp("current_period_start"),
    currentPeriodEnd: timestamp("current_period_end"),
    cancelAtPeriodEnd: timestamp("cancel_at_period_end"),
    scheduledPlan: varchar("scheduled_plan", { length: 80 }),
    scheduledInterval: varchar("scheduled_interval", { length: 20 }),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    project: uniqueIndex("project_subscriptions_project_idx").on(table.projectId),
    providerIdentity: uniqueIndex("project_subscriptions_provider_identity_idx").on(table.provider, table.providerSubscriptionId),
    status: index("project_subscriptions_status_idx").on(table.status, table.currentPeriodEnd),
    amountNonnegative: check("project_subscriptions_price_amount_nonnegative", sql`${table.priceAmount} >= 0`),
  }),
);

export const projectCreditWallets = pgTable("project_credit_wallets", {
  projectId: uuid("project_id").primaryKey().references(() => projects.id, { onDelete: "cascade" }),
  subscriptionBalance: integer("subscription_balance").notNull().default(0),
  purchasedBalance: integer("purchased_balance").notNull().default(0),
  reservedBalance: integer("reserved_balance").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  subscriptionCycleStart: timestamp("subscription_cycle_start"),
  subscriptionCycleEnd: timestamp("subscription_cycle_end"),
}, (table) => ({
  balancesNonnegative: check("project_credit_wallets_balances_nonnegative", sql`${table.subscriptionBalance} >= 0 AND ${table.purchasedBalance} >= 0 AND ${table.reservedBalance} >= 0`),
}));

export const projectCreditEvents = pgTable(
  "project_credit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    kind: varchar("kind", { length: 30 }).notNull(),
    action: varchar("action", { length: 100 }).notNull(),
    subscriptionDelta: integer("subscription_delta").notNull().default(0),
    purchasedDelta: integer("purchased_delta").notNull().default(0),
    reservedDelta: integer("reserved_delta").notNull().default(0),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    idempotency: uniqueIndex("project_credit_events_idempotency_idx").on(table.projectId, table.idempotencyKey),
    projectCreated: index("project_credit_events_project_created_idx").on(table.projectId, table.createdAt),
  }),
);

export const platformBillingCheckouts = pgTable(
  "platform_billing_checkouts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 30 }).notNull(),
    productId: varchar("product_id", { length: 100 }).notNull(),
    providerSessionId: varchar("provider_session_id", { length: 255 }),
    currency: varchar("currency", { length: 3 }).notNull(),
    amount: integer("amount").notNull(),
    credits: integer("credits").notNull().default(0),
    status: varchar("status", { length: 30 }).notNull().default("pending"),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    providerSession: uniqueIndex("platform_billing_checkouts_provider_session_idx").on(table.providerSessionId),
    idempotency: uniqueIndex("platform_billing_checkouts_idempotency_idx").on(table.projectId, table.idempotencyKey),
    projectCreated: index("platform_billing_checkouts_project_created_idx").on(table.projectId, table.createdAt),
    amountNonnegative: check("platform_billing_checkouts_amount_nonnegative", sql`${table.amount} >= 0 AND ${table.credits} >= 0`),
  }),
);

export const platformBillingWebhookEvents = pgTable("platform_billing_webhook_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  providerEventId: varchar("provider_event_id", { length: 255 }).notNull().unique(),
  eventType: varchar("event_type", { length: 120 }).notNull(),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
});
