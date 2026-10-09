import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { createDb, schema } from "@velozy/db";
import { z } from "zod";
import type { Environment } from "../../config/env.js";
import { HttpError } from "../../middleware/errors.js";
import { ensureDefaultProductColorsInTransaction } from "../../lib/product-attributes.js";
import { publicSiteUrl } from "../../lib/public-site-url.js";
import { adminAccess } from "../../lib/admin-auth.js";

type ProjectAccess = { type: "project" | "organization"; roleName: string; isOwner: boolean };

function withPublicUrl<T extends { isPublished: boolean; subdomain: string | null }>(
  project: T,
  access?: ProjectAccess,
  customDomain?: string,
) {
  return {
    ...project,
    access,
    publicUrl: project.isPublished
      ? customDomain ? `https://${customDomain}` : project.subdomain ? publicSiteUrl(project.subdomain) : null
      : null,
    platformUrl: project.isPublished && project.subdomain ? publicSiteUrl(project.subdomain) : null,
  };
}

const projectInput = z.object({
  name: z.string().trim().min(1).max(255),
  industry: z.string().trim().max(255).optional(),
  logo: z.string().trim().max(500).optional(),
  designPreference: z.unknown().optional(),
  siteArchetype: z.string().trim().max(30).nullable().optional(),
  storeType: z.string().trim().max(30).nullable().optional(),
  capabilities: z.array(z.unknown()).optional(),
  creationKey: z.string().uuid().optional(),
});

const projectUpdate = projectInput.omit({ creationKey: true }).partial().extend({
  id: z.string().uuid(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  purchaseMode: z
    .enum(["catalogue", "enquiry", "quote", "checkout"])
    .optional(),
});
const safeChromeClass = z.string().min(1).max(600).regex(/^[A-Za-z0-9\s:/._%#[\](),!\-]+$/);
const siteChromeInput = z.object({
  projectId: z.string().uuid(),
  siteChrome: z.object({
    version: z.literal(1),
    navbar: z.object({
      wrapperClassName: safeChromeClass,
      innerClassName: safeChromeClass,
      brandClassName: safeChromeClass,
      linksClassName: safeChromeClass,
      linkClassName: safeChromeClass,
      mobileClassName: safeChromeClass,
      mobileToggleClassName: safeChromeClass,
    }),
    footer: z.object({
      wrapperClassName: safeChromeClass,
      innerClassName: safeChromeClass,
      brandClassName: safeChromeClass,
      linksClassName: safeChromeClass,
      linkClassName: safeChromeClass,
      description: z.string().max(300),
      copyright: z.string().max(160),
    }),
  }),
});

function standardRoles(scope: "project" | "organization", scopeId: string, createdBy: string) {
  const target = scope === "project"
    ? { projectId: scopeId, organizationId: null }
    : { projectId: null, organizationId: scopeId };
  const roles = [
    { name: "Owner", capabilities: ["*"], isOwner: true },
    { name: "Admin", capabilities: ["content:read", "content:write", "commerce:read", "commerce:write", "enquiries:read", "enquiries:write", "growth:read", "growth:write", "settings:read", "settings:write", "media:read", "media:write", "publish"], isOwner: false },
    { name: "Editor", capabilities: ["content:read", "content:write", "media:read", "media:write"], isOwner: false },
    { name: "Viewer", capabilities: ["content:read", "commerce:read", "enquiries:read", "growth:read", "settings:read", "media:read"], isOwner: false },
  ];
  return roles.map((role) => ({ ...target, scope, ...role, createdBy }));
}

function parseBody<T>(schemaValidator: z.ZodType<T>, body: unknown): T {
  const parsed = schemaValidator.safeParse(body);
  if (!parsed.success)
    throw new HttpError(
      400,
      parsed.error.issues[0]?.message || "Invalid request",
      "validation_error",
    );
  return parsed.data;
}

async function ensureUser(
  db: ReturnType<typeof createDb>,
  auth: Express.Request["auth"],
) {
  if (!auth?.userId) throw new HttpError(401, "Unauthorized", "missing_user");
  const existing = await db.query.users.findFirst({
    where: eq(schema.users.id, auth.userId),
  });
  if (existing) return existing;
  await db
    .insert(schema.users)
    .values({
      id: auth.userId,
      email: auth.email || `${auth.userId}@supabase.local`,
      name: auth.email?.split("@")[0] || "User",
    })
    .onConflictDoNothing({ target: schema.users.id });
  const created = await db.query.users.findFirst({
    where: eq(schema.users.id, auth.userId),
  });
  if (!created)
    throw new HttpError(
      409,
      "Unable to provision user profile",
      "profile_unavailable",
    );
  return created;
}

export function adminProjectsRouter(environment: Environment): ExpressRouter {
  const db = createDb(environment.DATABASE_URL);
  const router = Router();
  const authz = adminAccess(environment.DATABASE_URL);
  const supabaseAdmin = createClient(environment.SUPABASE_URL, environment.SUPABASE_SERVICE_ROLE_KEY);
  const supabasePublic = createClient(environment.SUPABASE_URL, environment.SUPABASE_ANON_KEY);
  const acceptPendingInvitations = async (email: string, userId: string) => {
    const pending = await db.query.accessInvitations.findMany({ where: and(eq(schema.accessInvitations.email, email), isNull(schema.accessInvitations.acceptedAt), isNull(schema.accessInvitations.revokedAt)) });
    if (!pending.some((invitation) => invitation.expiresAt > new Date())) return;
    const authUser = await supabaseAdmin.auth.admin.getUserById(userId);
    if (authUser.error || authUser.data.user.email?.toLowerCase() !== email || !authUser.data.user.email_confirmed_at)
      throw new HttpError(403, "Verify the invited email address before accepting access");
    await db.transaction(async (tx) => {
      for (const invitation of pending) {
        if (invitation.expiresAt <= new Date()) continue;
        if (invitation.scope === "project") await tx.insert(schema.projectMemberships).values({ projectId: invitation.projectId!, userId, roleId: invitation.roleId }).onConflictDoNothing();
        else await tx.insert(schema.organizationAccessMemberships).values({ organizationId: invitation.organizationId!, userId, roleId: invitation.roleId }).onConflictDoNothing();
        await tx.update(schema.accessInvitations).set({ acceptedAt: new Date() }).where(eq(schema.accessInvitations.id, invitation.id));
      }
    });
  };

  router.get("/projects", async (request, response) => {
    const user = await ensureUser(db, request.auth);
    const projectId =
      typeof request.query.projectId === "string"
        ? request.query.projectId
        : undefined;
    if (projectId) {
      const project = await authz.project(projectId, user.id);
      const direct = await db.select({ roleName: schema.accessRoles.name, isOwner: schema.accessRoles.isOwner })
        .from(schema.projectMemberships)
        .innerJoin(schema.accessRoles, eq(schema.accessRoles.id, schema.projectMemberships.roleId))
        .where(and(eq(schema.projectMemberships.projectId, project.id), eq(schema.projectMemberships.userId, user.id)))
        .limit(1);
      const organization = project.organizationId ? await db.select({ roleName: schema.accessRoles.name, isOwner: schema.accessRoles.isOwner })
        .from(schema.organizationAccessMemberships)
        .innerJoin(schema.accessRoles, eq(schema.accessRoles.id, schema.organizationAccessMemberships.roleId))
        .where(and(eq(schema.organizationAccessMemberships.organizationId, project.organizationId), eq(schema.organizationAccessMemberships.userId, user.id)))
        .limit(1) : [];
      const access = project.userId === user.id
        ? { type: "project" as const, roleName: "Owner", isOwner: true }
        : direct[0]
          ? { type: "project" as const, ...direct[0] }
          : organization[0]
            ? { type: "organization" as const, ...organization[0] }
            : undefined;
      const customDomain = await db.query.siteDomains.findFirst({ where: and(eq(schema.siteDomains.projectId, project.id), eq(schema.siteDomains.isCustom, true), eq(schema.siteDomains.isVerified, true)), columns: { hostname: true } });
      return response.json({ project: withPublicUrl(project, access, customDomain?.hostname) });
    }
    const direct = await db.select({ projectId: schema.projectMemberships.projectId, roleName: schema.accessRoles.name, isOwner: schema.accessRoles.isOwner }).from(schema.projectMemberships).innerJoin(schema.accessRoles, eq(schema.accessRoles.id, schema.projectMemberships.roleId)).where(eq(schema.projectMemberships.userId, user.id));
    const orgs = await db.select({ organizationId: schema.organizationAccessMemberships.organizationId, roleName: schema.accessRoles.name, isOwner: schema.accessRoles.isOwner }).from(schema.organizationAccessMemberships).innerJoin(schema.accessRoles, eq(schema.accessRoles.id, schema.organizationAccessMemberships.roleId)).where(eq(schema.organizationAccessMemberships.userId, user.id));
    const organizationProjects = orgs.length ? await db.select({ id: schema.projects.id, organizationId: schema.projects.organizationId }).from(schema.projects).where(inArray(schema.projects.organizationId, orgs.map((row) => row.organizationId))) : [];
    const projectIds = [...new Set([...direct.map((row) => row.projectId), ...organizationProjects.map((row) => row.id)])];
    const projects = await db.query.projects.findMany({
      where: projectIds.length ? inArray(schema.projects.id, projectIds) : eq(schema.projects.userId, user.id),
      orderBy: [desc(schema.projects.createdAt)],
    });
    const loadedProjectIds = projects.map((project) => project.id);
    const customDomains = loadedProjectIds.length ? await db.query.siteDomains.findMany({ where: and(inArray(schema.siteDomains.projectId, loadedProjectIds), eq(schema.siteDomains.isCustom, true), eq(schema.siteDomains.isVerified, true)), columns: { projectId: true, hostname: true } }) : [];
    const customDomainByProject = new Map(customDomains.map((domain) => [domain.projectId, domain.hostname]));
    const directByProject = new Map(direct.map((row) => [row.projectId, row]));
    const orgById = new Map(orgs.map((row) => [row.organizationId, row]));
    return response.json({ projects: projects.map((project) => {
      const directAccess = directByProject.get(project.id);
      const orgAccess = project.organizationId ? orgById.get(project.organizationId) : undefined;
      const access = project.userId === user.id
        ? { type: "project" as const, roleName: "Owner", isOwner: true }
        : directAccess
          ? { type: "project" as const, roleName: directAccess.roleName, isOwner: directAccess.isOwner }
          : orgAccess
            ? { type: "organization" as const, roleName: orgAccess.roleName, isOwner: orgAccess.isOwner }
            : undefined;
      return withPublicUrl(project, access, customDomainByProject.get(project.id));
    }) });
  });

  router.post("/projects", async (request, response) => {
    const user = await ensureUser(db, request.auth);
    const input = parseBody(projectInput, request.body);
    if (input.creationKey) {
      const existing = await db.query.projects.findFirst({
        where: eq(schema.projects.creationKey, input.creationKey),
      });
      if (existing) {
        if (existing.userId !== user.id)
          throw new HttpError(409, "This project creation request is already in use");
        return response.status(200).json({ project: existing, reused: true });
      }
    }
    const ownerOrganizations = await db.select({ organizationId: schema.organizationAccessMemberships.organizationId })
      .from(schema.organizationAccessMemberships)
      .innerJoin(schema.accessRoles, eq(schema.accessRoles.id, schema.organizationAccessMemberships.roleId))
      .where(and(eq(schema.organizationAccessMemberships.userId, user.id), eq(schema.accessRoles.isOwner, true)))
      .limit(1);
    const purchaseMode =
      input.storeType === "ecommerce"
        ? "checkout"
        : input.storeType === "enquiry-cart"
          ? "quote"
          : input.storeType === "enquiry"
            ? "enquiry"
            : "catalogue";
    let project;
    try {
      project = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(schema.projects)
        .values({
          ...input,
          userId: user.id,
          organizationId: ownerOrganizations[0]?.organizationId ?? null,
          capabilities: input.capabilities || [],
          purchaseMode,
        })
        .returning();
      await tx.insert(schema.inventoryLocations).values({
        projectId: created.id,
        name: "Default location",
        code: "DEFAULT",
        isDefault: true,
      });
      await ensureDefaultProductColorsInTransaction(tx, created.id);
      const roles = await tx.insert(schema.accessRoles).values(standardRoles("project", created.id, user.id)).returning();
      const ownerRole = roles.find((role) => role.isOwner);
      if (!ownerRole) throw new HttpError(500, "Project owner role could not be created");
      await tx.insert(schema.projectMemberships).values({ projectId: created.id, userId: user.id, roleId: ownerRole.id });
      return created;
      });
    } catch (error) {
      if ((error as { code?: string })?.code === "23505" && input.creationKey) {
        const existing = await db.query.projects.findFirst({
          where: eq(schema.projects.creationKey, input.creationKey),
        });
        if (existing?.userId === user.id)
          return response.status(200).json({ project: existing, reused: true });
      }
      throw error;
    }
    return response.status(201).json({ project });
  });

  router.put("/projects", async (request, response) => {
    const user = await ensureUser(db, request.auth);
    const input = parseBody(projectUpdate, request.body);
    const { id, ...changes } = input;
    await authz.project(id, user.id, "settings:write");
    const project = await db.transaction(async (tx) => {
      const [current] = await tx
        .select({ designPreference: schema.projects.designPreference })
        .from(schema.projects)
        .where(eq(schema.projects.id, id))
        .for("update");
      if (!current) return undefined;
      const currentPreference = (current.designPreference as Record<string, unknown> | null) || {};
      const incomingPreference = changes.designPreference && typeof changes.designPreference === "object"
        ? changes.designPreference as Record<string, unknown>
        : null;
      const themeChanged = Boolean(incomingPreference && incomingPreference.theme !== undefined &&
        JSON.stringify(incomingPreference.theme) !== JSON.stringify(currentPreference.theme));
      if (themeChanged && incomingPreference) delete incomingPreference.designSystem;
      const designPreference = incomingPreference
        ? {
            ...incomingPreference,
            ...(!themeChanged && currentPreference.designSystem !== undefined ? { designSystem: currentPreference.designSystem } : {}),
            ...(!themeChanged && currentPreference.designSystemUpdatedAt !== undefined ? { designSystemUpdatedAt: currentPreference.designSystemUpdatedAt } : {}),
            ...(currentPreference.navigation !== undefined ? { navigation: currentPreference.navigation } : {}),
            ...(currentPreference.siteChrome !== undefined ? { siteChrome: currentPreference.siteChrome } : {}),
          }
        : changes.designPreference;
      const [updated] = await tx
        .update(schema.projects)
        .set({ ...changes, ...(designPreference !== undefined ? { designPreference } : {}), updatedAt: new Date() })
        .where(eq(schema.projects.id, id))
        .returning();
      return updated;
    });
    if (!project)
      throw new HttpError(404, "Project not found or access denied");
    return response.json({ project });
  });

  router.delete("/projects", async (request, response) => {
    const user = await ensureUser(db, request.auth);
    const id = z.string().uuid().safeParse(request.body?.id);
    if (!id.success)
      throw new HttpError(400, "Project ID is required", "validation_error");
    const [deleted] = await db
      .delete(schema.projects)
      .where(
        and(
          eq(schema.projects.id, id.data),
          eq(schema.projects.userId, user.id),
        ),
      )
      .returning({ id: schema.projects.id });
    if (!deleted)
      throw new HttpError(404, "Project not found or access denied");
    return response.json({ success: true });
  });

  router.put("/projects/site-chrome", async (request, response) => {
    const user = await ensureUser(db, request.auth);
    const input = parseBody(siteChromeInput, request.body);
    await authz.project(input.projectId, user.id, "settings:write");
    const siteChrome = await db.transaction(async (tx) => {
      const [lockedProject] = await tx
        .select({ designPreference: schema.projects.designPreference })
        .from(schema.projects)
        .where(eq(schema.projects.id, input.projectId))
        .for("update");
      if (!lockedProject) throw new HttpError(404, "Project not found or access denied");
      const current = (lockedProject.designPreference as Record<string, any> | null) || {};
      const saved = current.siteChrome?.version === 1
        ? current.siteChrome
        : input.siteChrome;
      await tx
        .update(schema.projects)
        .set({ designPreference: { ...current, siteChrome: saved }, updatedAt: new Date() })
        .where(eq(schema.projects.id, input.projectId));
      return saved;
    });
    return response.json({ success: true, siteChrome });
  });

  router.put("/projects/theme", async (request, response) => {
    const user = await ensureUser(db, request.auth);
    const projectId = z.string().uuid().safeParse(request.body?.projectId);
    if (!projectId.success || !request.body?.theme)
      throw new HttpError(
        400,
        "projectId and theme are required",
        "validation_error",
      );
    const project = await authz.project(projectId.data, user.id, "settings:write");
    const currentPreference = (project.designPreference as Record<string, unknown> | null) || {};
    const themeChanged = JSON.stringify(currentPreference.theme) !== JSON.stringify(request.body.theme);
    const withoutOldDesignSystem = { ...currentPreference };
    delete withoutOldDesignSystem.designSystem;
    delete withoutOldDesignSystem.designSystemUpdatedAt;
    const designPreference = {
      ...(themeChanged ? withoutOldDesignSystem : currentPreference),
      theme: request.body.theme,
    };
    const [updated] = await db
      .update(schema.projects)
      .set({ designPreference, updatedAt: new Date() })
      .where(
        eq(schema.projects.id, projectId.data),
      )
      .returning();
    return response.json({
      success: true,
      designPreference: updated?.designPreference,
    });
  });

  router.get("/projects/team", async (request, response) => {
    const user = await ensureUser(db, request.auth);
    const id = z.string().uuid().safeParse(request.query.projectId);
    if (!id.success) throw new HttpError(400, "Project ID is required", "validation_error");
    const project = await authz.project(id.data, user.id, "team:manage");
    const scope = request.query.scope === "organization" ? "organization" : "project";
    let organizationId = project.organizationId;
    if (scope === "project") {
      await db.insert(schema.accessRoles).values(standardRoles(scope, project.id, user.id)).onConflictDoNothing();
    }
    const roles = scope === "project" ? await db.query.accessRoles.findMany({ where: eq(schema.accessRoles.projectId, project.id) }) : organizationId ? await db.query.accessRoles.findMany({ where: eq(schema.accessRoles.organizationId, organizationId) }) : [];
    const members = scope === "project"
      ? await db.select({ id: schema.projectMemberships.id, userId: schema.projectMemberships.userId, email: schema.users.email, name: schema.users.name, roleId: schema.projectMemberships.roleId }).from(schema.projectMemberships).innerJoin(schema.users, eq(schema.users.id, schema.projectMemberships.userId)).where(eq(schema.projectMemberships.projectId, project.id))
      : organizationId ? await db.select({ id: schema.organizationAccessMemberships.id, userId: schema.organizationAccessMemberships.userId, email: schema.users.email, name: schema.users.name, roleId: schema.organizationAccessMemberships.roleId }).from(schema.organizationAccessMemberships).innerJoin(schema.users, eq(schema.users.id, schema.organizationAccessMemberships.userId)).where(eq(schema.organizationAccessMemberships.organizationId, organizationId)) : [];
    const invitations = scope === "project" ? await db.query.accessInvitations.findMany({ where: and(eq(schema.accessInvitations.projectId, project.id), eq(schema.accessInvitations.scope, scope)) }) : organizationId ? await db.query.accessInvitations.findMany({ where: and(eq(schema.accessInvitations.organizationId, organizationId), eq(schema.accessInvitations.scope, scope)) }) : [];
    response.json({ scope, roles, members, invitations });
  });

  router.post("/projects/team/roles", async (request, response) => {
    const user = await ensureUser(db, request.auth);
    const input = z.object({ projectId: z.string().uuid(), scope: z.enum(["project", "organization"]), name: z.string().trim().min(2).max(80), capabilities: z.array(z.enum(["content:read", "content:write", "commerce:read", "commerce:write", "enquiries:read", "enquiries:write", "growth:read", "growth:write", "settings:read", "settings:write", "media:read", "media:write", "publish"])).min(1) }).safeParse(request.body);
    if (!input.success) throw new HttpError(400, "Valid role details are required", "validation_error");
    const project = await authz.project(input.data.projectId, user.id, "team:manage");
    let organizationId = project.organizationId;
    if (input.data.scope === "organization" && !organizationId) {
      const [organization] = await db.insert(schema.organizations).values({ name: project.name, slug: `${project.id.slice(0, 8)}-${Date.now()}` }).returning();
      organizationId = organization.id;
      await db.update(schema.projects).set({ organizationId }).where(and(eq(schema.projects.userId, user.id), isNull(schema.projects.organizationId)));
      await db.insert(schema.accessRoles).values(standardRoles("organization", organizationId, user.id)).onConflictDoNothing();
      const ownerRole = await db.query.accessRoles.findFirst({ where: and(eq(schema.accessRoles.organizationId, organizationId), eq(schema.accessRoles.isOwner, true)) });
      if (!ownerRole) throw new HttpError(500, "Organization owner role could not be created");
      await db.insert(schema.organizationAccessMemberships).values({ organizationId, userId: user.id, roleId: ownerRole.id });
    }
    const [role] = await db.insert(schema.accessRoles).values({ scope: input.data.scope, projectId: input.data.scope === "project" ? project.id : null, organizationId: input.data.scope === "organization" ? organizationId : null, name: input.data.name, capabilities: input.data.capabilities, createdBy: user.id }).returning();
    response.status(201).json({ role });
  });

  router.post("/projects/team/invitations", async (request, response) => {
    const user = await ensureUser(db, request.auth);
    const input = z.object({ projectId: z.string().uuid(), scope: z.enum(["project", "organization"]), email: z.string().trim().email().max(255), roleId: z.string().uuid() }).safeParse(request.body);
    if (!input.success) throw new HttpError(400, "Valid invitation details are required", "validation_error");
    const project = await authz.project(input.data.projectId, user.id, "team:manage");
    let organizationId = project.organizationId;
    if (input.data.scope === "organization" && !organizationId) {
      const [organization] = await db.insert(schema.organizations).values({ name: project.name, slug: `${project.id.slice(0, 8)}-${Date.now()}` }).returning();
      organizationId = organization.id;
      await db.update(schema.projects).set({ organizationId }).where(and(eq(schema.projects.userId, user.id), isNull(schema.projects.organizationId)));
      await db.insert(schema.accessRoles).values(standardRoles("organization", organizationId, user.id)).onConflictDoNothing();
      const ownerRole = await db.query.accessRoles.findFirst({ where: and(eq(schema.accessRoles.organizationId, organizationId), eq(schema.accessRoles.isOwner, true)) });
      if (!ownerRole) throw new HttpError(500, "Organization owner role could not be created");
      await db.insert(schema.organizationAccessMemberships).values({ organizationId, userId: user.id, roleId: ownerRole.id });
    }
    const role = await db.query.accessRoles.findFirst({ where: and(eq(schema.accessRoles.id, input.data.roleId), input.data.scope === "project" ? eq(schema.accessRoles.projectId, project.id) : eq(schema.accessRoles.organizationId, organizationId!)) });
    if (!role) throw new HttpError(400, "Choose a role for this access scope");
    const existingUser = await db.query.users.findFirst({ where: eq(schema.users.email, input.data.email.toLowerCase()) });
    if (existingUser) {
      const member = input.data.scope === "project" ? await db.query.projectMemberships.findFirst({ where: and(eq(schema.projectMemberships.projectId, project.id), eq(schema.projectMemberships.userId, existingUser.id)) }) : await db.query.organizationAccessMemberships.findFirst({ where: and(eq(schema.organizationAccessMemberships.organizationId, organizationId!), eq(schema.organizationAccessMemberships.userId, existingUser.id)) });
      if (member) throw new HttpError(409, "This person already has access");
    }
    const email = input.data.email.toLowerCase();
    const pending = await db.query.accessInvitations.findFirst({ where: input.data.scope === "project" ? and(eq(schema.accessInvitations.email, email), eq(schema.accessInvitations.projectId, project.id), isNull(schema.accessInvitations.acceptedAt), isNull(schema.accessInvitations.revokedAt)) : and(eq(schema.accessInvitations.email, email), eq(schema.accessInvitations.organizationId, organizationId!), isNull(schema.accessInvitations.acceptedAt), isNull(schema.accessInvitations.revokedAt)) });
    if (pending && pending.expiresAt > new Date()) throw new HttpError(409, "An invitation is already pending for this email");
    if (pending) await db.update(schema.accessInvitations).set({ revokedAt: new Date() }).where(eq(schema.accessInvitations.id, pending.id));
    const [created] = await db.insert(schema.accessInvitations).values({ email: input.data.email.toLowerCase(), scope: input.data.scope, projectId: input.data.scope === "project" ? project.id : null, organizationId: input.data.scope === "organization" ? organizationId : null, roleId: role.id, invitedBy: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }).returning();
    const redirectTo = `${environment.ADMIN_URL || "http://localhost:5173"}/auth/callback`;
    let delivery = existingUser
      ? await supabasePublic.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo, shouldCreateUser: false } })
      : await supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (delivery.error && !existingUser) delivery = await supabasePublic.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo, shouldCreateUser: false } });
    if (delivery.error) {
      await db.update(schema.accessInvitations).set({ revokedAt: new Date() }).where(eq(schema.accessInvitations.id, created.id));
      throw new HttpError(502, "Could not send invitation email", "invite_delivery_failed");
    }
    response.status(201).json({ invitation: created });
  });

  router.patch("/projects/team/members", async (request, response) => {
    const user = await ensureUser(db, request.auth);
    const input = z.object({ projectId: z.string().uuid(), scope: z.enum(["project", "organization"]), memberId: z.string().uuid(), roleId: z.string().uuid() }).safeParse(request.body);
    if (!input.success) throw new HttpError(400, "Member and role are required", "validation_error");
    const project = await authz.project(input.data.projectId, user.id, "team:manage");
    const member = input.data.scope === "project"
      ? await db.query.projectMemberships.findFirst({ where: and(eq(schema.projectMemberships.id, input.data.memberId), eq(schema.projectMemberships.projectId, project.id)) })
      : project.organizationId ? await db.query.organizationAccessMemberships.findFirst({ where: and(eq(schema.organizationAccessMemberships.id, input.data.memberId), eq(schema.organizationAccessMemberships.organizationId, project.organizationId)) }) : undefined;
    if (!member) throw new HttpError(404, "Member not found");
    const oldRole = await db.query.accessRoles.findFirst({ where: eq(schema.accessRoles.id, member.roleId) });
    if (oldRole?.isOwner) throw new HttpError(403, "Owner access cannot be changed here");
    if (input.data.scope === "organization" && !project.organizationId) throw new HttpError(404, "Organization not found");
    const role = await db.query.accessRoles.findFirst({ where: and(eq(schema.accessRoles.id, input.data.roleId), input.data.scope === "project" ? eq(schema.accessRoles.projectId, project.id) : eq(schema.accessRoles.organizationId, project.organizationId!)) });
    if (!role || role.isOwner) throw new HttpError(400, "Choose a non-owner role for this scope");
    if (input.data.scope === "project") await db.update(schema.projectMemberships).set({ roleId: role.id }).where(eq(schema.projectMemberships.id, input.data.memberId));
    else await db.update(schema.organizationAccessMemberships).set({ roleId: role.id }).where(eq(schema.organizationAccessMemberships.id, input.data.memberId));
    response.json({ success: true });
  });

  router.delete("/projects/team/members", async (request, response) => {
    const user = await ensureUser(db, request.auth);
    const input = z.object({ projectId: z.string().uuid(), scope: z.enum(["project", "organization"]), memberId: z.string().uuid() }).safeParse(request.body);
    if (!input.success) throw new HttpError(400, "Member ID is required", "validation_error");
    const project = await authz.project(input.data.projectId, user.id, "team:manage");
    if (input.data.scope === "project") {
      const member = await db.query.projectMemberships.findFirst({ where: and(eq(schema.projectMemberships.id, input.data.memberId), eq(schema.projectMemberships.projectId, project.id)) });
      if (!member) throw new HttpError(404, "Member not found");
      const role = await db.query.accessRoles.findFirst({ where: eq(schema.accessRoles.id, member.roleId) });
      if (role?.isOwner) throw new HttpError(403, "Project owner cannot be removed");
      await db.delete(schema.projectMemberships).where(eq(schema.projectMemberships.id, member.id));
    } else {
      if (!project.organizationId) throw new HttpError(404, "Organization not found");
      const member = await db.query.organizationAccessMemberships.findFirst({ where: and(eq(schema.organizationAccessMemberships.id, input.data.memberId), eq(schema.organizationAccessMemberships.organizationId, project.organizationId)) });
      if (!member) throw new HttpError(404, "Member not found");
      const role = await db.query.accessRoles.findFirst({ where: eq(schema.accessRoles.id, member.roleId) });
      if (role?.isOwner) throw new HttpError(403, "Organization owner cannot be removed");
      await db.delete(schema.organizationAccessMemberships).where(eq(schema.organizationAccessMemberships.id, member.id));
    }
    response.json({ success: true });
  });

  router.delete("/projects/team/invitations", async (request, response) => {
    const user = await ensureUser(db, request.auth);
    const input = z.object({ projectId: z.string().uuid(), scope: z.enum(["project", "organization"]), invitationId: z.string().uuid() }).safeParse(request.body);
    if (!input.success) throw new HttpError(400, "Invitation ID is required", "validation_error");
    const project = await authz.project(input.data.projectId, user.id, "team:manage");
    if (input.data.scope === "organization" && !project.organizationId) throw new HttpError(404, "Organization not found");
    const invitation = await db.query.accessInvitations.findFirst({ where: and(eq(schema.accessInvitations.id, input.data.invitationId), input.data.scope === "project" ? eq(schema.accessInvitations.projectId, project.id) : eq(schema.accessInvitations.organizationId, project.organizationId!)) });
    if (!invitation) throw new HttpError(404, "Invitation not found");
    await db.update(schema.accessInvitations).set({ revokedAt: new Date() }).where(eq(schema.accessInvitations.id, invitation.id));
    response.json({ success: true });
  });

  router.post("/projects/team/accept", async (request, response) => {
    const user = await ensureUser(db, request.auth);
    const email = request.auth?.email?.trim().toLowerCase();
    if (!email) throw new HttpError(403, "A verified account email is required");
    await acceptPendingInvitations(email, user.id);
    response.json({ success: true });
  });

  return router;
}
