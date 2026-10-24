import { and, eq, isNull } from "drizzle-orm";
import { createDb, schema } from "@velozy/db";
import { HttpError } from "../middleware/errors.js";

// Shared by HTTP authorization and background execution; no request context.
export function projectAccess(
  db: Pick<ReturnType<typeof createDb>, "query" | "select">,
  lockGrants = false,
) {
  return async (
    projectId: string,
    userId: string,
    capability = "project:read",
  ) => {
    const found = await db.query.projects.findFirst({
      where: eq(schema.projects.id, projectId),
    });
    if (!found) throw new HttpError(404, "Project not found or access denied");
    if (found.userId !== userId) {
      const directQuery = db
        .select({
          capabilities: schema.accessRoles.capabilities,
          isOwner: schema.accessRoles.isOwner,
        })
        .from(schema.projectMemberships)
        .innerJoin(
          schema.accessRoles,
          and(
            eq(schema.accessRoles.id, schema.projectMemberships.roleId),
            eq(schema.accessRoles.scope, "project"),
            eq(
              schema.accessRoles.projectId,
              schema.projectMemberships.projectId,
            ),
            isNull(schema.accessRoles.organizationId),
          ),
        )
        .where(
          and(
            eq(schema.projectMemberships.projectId, projectId),
            eq(schema.projectMemberships.userId, userId),
          ),
        )
        .limit(1);
      const direct = await (lockGrants
        ? directQuery.for("share")
        : directQuery);
      const organizationQuery = found.organizationId
        ? db
            .select({
              capabilities: schema.accessRoles.capabilities,
              isOwner: schema.accessRoles.isOwner,
            })
            .from(schema.organizationAccessMemberships)
            .innerJoin(
              schema.accessRoles,
              and(
                eq(
                  schema.accessRoles.id,
                  schema.organizationAccessMemberships.roleId,
                ),
                eq(schema.accessRoles.scope, "organization"),
                eq(
                  schema.accessRoles.organizationId,
                  schema.organizationAccessMemberships.organizationId,
                ),
                isNull(schema.accessRoles.projectId),
              ),
            )
            .where(
              and(
                eq(
                  schema.organizationAccessMemberships.organizationId,
                  found.organizationId,
                ),
                eq(schema.organizationAccessMemberships.userId, userId),
              ),
            )
            .limit(1)
        : null;
      const organization = organizationQuery
        ? await (lockGrants
            ? organizationQuery.for("share")
            : organizationQuery)
        : [];
      const grants = [...direct, ...organization].flatMap((item) =>
        Array.isArray(item.capabilities) ? item.capabilities : [],
      );
      if (
        capability === "team:manage" &&
        ![...direct, ...organization].some((item) => item.isOwner)
      )
        throw new HttpError(
          403,
          "Only the project owner can manage access",
          "insufficient_permission",
        );
      const hasCapability =
        grants.includes("*") ||
        grants.includes(capability) ||
        (capability === "project:read" &&
          grants.some(
            (grant) =>
              typeof grant === "string" &&
              (grant.endsWith(":read") ||
                grant.endsWith(":write") ||
                grant === "publish" ||
                grant === "team:manage"),
          )) ||
        (capability === "project:write" &&
          grants.some(
            (grant) =>
              typeof grant === "string" &&
              (grant.endsWith(":write") ||
                grant === "publish" ||
                grant === "team:manage"),
          ));
      if (!hasCapability)
        throw new HttpError(
          403,
          "Project access denied",
          "insufficient_permission",
        );
    }
    return found;
  };
}
