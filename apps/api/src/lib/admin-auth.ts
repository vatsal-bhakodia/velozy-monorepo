import { and, eq } from "drizzle-orm";
import type { Request } from "express";
import { createDb, schema } from "@velozy/db";
import { HttpError } from "../middleware/errors.js";

export function adminAccess(databaseUrl: string) {
  const db = createDb(databaseUrl);
  const user = async (request: Request) => {
    if (!request.auth?.userId) throw new HttpError(401, "Unauthorized");
    const found = await db.query.users.findFirst({
      where: eq(schema.users.id, request.auth.userId),
    });
    if (!found) throw new HttpError(404, "User not found");
    return found;
  };
  const project = async (projectId: string, userId: string, capability = "project:read") => {
    const found = await db.query.projects.findFirst({
      where: eq(schema.projects.id, projectId),
    });
    if (!found) throw new HttpError(404, "Project not found or access denied");
    if (found.userId !== userId) {
      const direct = await db.select({ capabilities: schema.accessRoles.capabilities, isOwner: schema.accessRoles.isOwner })
        .from(schema.projectMemberships)
        .innerJoin(schema.accessRoles, eq(schema.accessRoles.id, schema.projectMemberships.roleId))
        .where(and(eq(schema.projectMemberships.projectId, projectId), eq(schema.projectMemberships.userId, userId)))
        .limit(1);
      const organization = found.organizationId ? await db.select({ capabilities: schema.accessRoles.capabilities, isOwner: schema.accessRoles.isOwner })
        .from(schema.organizationAccessMemberships)
        .innerJoin(schema.accessRoles, eq(schema.accessRoles.id, schema.organizationAccessMemberships.roleId))
        .where(and(eq(schema.organizationAccessMemberships.organizationId, found.organizationId), eq(schema.organizationAccessMemberships.userId, userId)))
        .limit(1) : [];
      const grants = [...direct, ...organization].flatMap((item) =>
        Array.isArray(item.capabilities) ? item.capabilities : [],
      );
      if (capability === "team:manage" && ![...direct, ...organization].some((item) => item.isOwner))
        throw new HttpError(403, "Only the project owner can manage access", "insufficient_permission");
      const hasCapability = grants.includes("*") || grants.includes(capability) ||
        (capability === "project:read" && grants.some((grant) => typeof grant === "string" && (grant.endsWith(":read") || grant.endsWith(":write") || grant === "publish" || grant === "team:manage"))) ||
        (capability === "project:write" && grants.some((grant) => typeof grant === "string" && (grant.endsWith(":write") || grant === "publish" || grant === "team:manage")));
      if (!hasCapability)
        throw new HttpError(403, "Project access denied", "insufficient_permission");
    }
    return found;
  };
  return { db, user, project };
}
