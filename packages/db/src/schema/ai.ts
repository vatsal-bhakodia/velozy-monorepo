import { pgTable, text, timestamp, uuid, varchar, integer, jsonb, index, customType } from "drizzle-orm/pg-core";
import { aiRunStatusEnum, approvalStatusEnum, vector } from "./common.js";
import { projects } from "./sites.js";
import { users } from "./identity.js";

export const aiRuns = pgTable("ai_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  requestedBy: uuid("requested_by").references(() => users.id, {
    onDelete: "set null",
  }),
  kind: varchar("kind", { length: 80 }).notNull(),
  status: aiRunStatusEnum("status").notNull().default("queued"),
  input: jsonb("input").notNull().default({}),
  output: jsonb("output"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const recommendations = pgTable("recommendations", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  aiRunId: uuid("ai_run_id").references(() => aiRuns.id, {
    onDelete: "set null",
  }),
  kind: varchar("kind", { length: 80 }).notNull(),
  explanation: text("explanation").notNull(),
  proposedAction: jsonb("proposed_action").notNull(),
  status: approvalStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  decidedAt: timestamp("decided_at"),
});

export const aiChats = pgTable(
  "ai_chats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    surface: varchar("surface", { length: 30 }).notNull().default("admin"),
    title: varchar("title", { length: 255 }).notNull().default("New chat"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userUpdated: index("ai_chats_user_updated_idx").on(
      table.userId,
      table.updatedAt,
    ),
    projectUpdated: index("ai_chats_project_updated_idx").on(
      table.projectId,
      table.updatedAt,
    ),
  }),
);

export const aiChatMessages = pgTable(
  "ai_chat_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    chatId: uuid("chat_id")
      .notNull()
      .references(() => aiChats.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).notNull(),
    content: text("content").notNull(),
    attachments: jsonb("attachments"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    chatCreated: index("ai_chat_messages_chat_created_idx").on(
      table.chatId,
      table.createdAt,
    ),
  }),
);

export const aiContextChunks = pgTable(
  "ai_context_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    chatId: uuid("chat_id")
      .notNull()
      .references(() => aiChats.id, { onDelete: "cascade" }),
    messageId: uuid("message_id").references(() => aiChatMessages.id, {
      onDelete: "cascade",
    }),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    chatCreated: index("ai_context_chunks_chat_created_idx").on(
      table.chatId,
      table.createdAt,
    ),
  }),
);
