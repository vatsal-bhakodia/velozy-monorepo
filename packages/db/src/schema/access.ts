import { pgTable, timestamp, uuid, varchar, boolean, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users, organizations } from "./identity.js";
import { projects } from "./sites.js";

export const accessRoles = pgTable(
  "access_roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scope: varchar("scope", { length: 20 }).notNull(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    name: varchar("name", { length: 80 }).notNull(),
    capabilities: jsonb("capabilities").notNull().default([]),
    isOwner: boolean("is_owner").notNull().default(false),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    projectName: uniqueIndex("access_roles_project_name_idx").on(
      table.projectId,
      table.name,
    ),
    organizationName: uniqueIndex("access_roles_organization_name_idx").on(
      table.organizationId,
      table.name,
    ),
  }),
);

export const projectMemberships = pgTable(
  "project_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => accessRoles.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    identity: uniqueIndex("project_memberships_identity_idx").on(
      table.projectId,
      table.userId,
    ),
  }),
);

export const organizationAccessMemberships = pgTable(
  "organization_access_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => accessRoles.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    identity: uniqueIndex("organization_access_memberships_identity_idx").on(
      table.organizationId,
      table.userId,
    ),
  }),
);

export const accessInvitations = pgTable(
  "access_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    scope: varchar("scope", { length: 20 }).notNull(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => accessRoles.id, { onDelete: "cascade" }),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    acceptedAt: timestamp("accepted_at"),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    emailProject: uniqueIndex("access_invitations_email_project_idx")
      .on(table.email, table.projectId)
      .where(sql`${table.acceptedAt} IS NULL AND ${table.revokedAt} IS NULL`),
    emailOrganization: uniqueIndex("access_invitations_email_organization_idx")
      .on(table.email, table.organizationId)
      .where(sql`${table.acceptedAt} IS NULL AND ${table.revokedAt} IS NULL`),
  }),
);
