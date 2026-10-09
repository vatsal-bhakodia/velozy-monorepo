import { Router } from "express";
import type { Request, Router as ExpressRouter } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@velozy/db";
import type { Environment } from "../../config/env.js";
import { HttpError } from "../../middleware/errors.js";
import { adminAccess } from "../../lib/admin-auth.js";

const fallback = {
  menus: [{ id: "primary", name: "Primary menu", items: [] }],
  locations: { header: "primary", footer: "" },
};
export function adminNavigationRouter(environment: Environment): ExpressRouter {
  const { db, user, project } = adminAccess(environment.DATABASE_URL);
  const router = Router();
  const owned = async (req: Request) => {
    if (!req.query.projectId || typeof req.query.projectId !== "string")
      throw new HttpError(400, "projectId is required");
    return project(
      z.string().uuid().parse(req.query.projectId),
      (await user(req)).id,
      req.method === "GET" ? "settings:read" : "settings:write",
    );
  };
  router.get("/navigation", async (req, res) => {
    const p = await owned(req);
    const preference =
      (p.designPreference as Record<string, unknown> | null) || {};
    res.json({ navigation: preference.navigation || fallback });
  });
  router.put("/navigation", async (req, res) => {
    const p = await owned(req);
    const navigation = req.body?.navigation;
    if (!navigation?.menus || !navigation?.locations)
      throw new HttpError(400, "Invalid navigation data");
    const initialize = req.body?.initialize === true;
    const savedNavigation = await db.transaction(async (tx) => {
      const [lockedProject] = await tx
        .select({ designPreference: schema.projects.designPreference })
        .from(schema.projects)
        .where(eq(schema.projects.id, p.id))
        .for("update");
      const current = (lockedProject?.designPreference as Record<string, unknown> | null) || {};
      const existingNavigation = current.navigation as typeof navigation | undefined;
      const hasSavedNavigation = existingNavigation && Array.isArray(existingNavigation.menus);
      const nextNavigation = initialize && hasSavedNavigation
        ? existingNavigation
        : initialize
          ? { ...navigation, ...(existingNavigation?.logo ? { logo: existingNavigation.logo } : {}) }
          : navigation;
      await tx
        .update(schema.projects)
        .set({
          designPreference: { ...current, navigation: nextNavigation },
          updatedAt: new Date(),
        })
        .where(eq(schema.projects.id, p.id));
      return nextNavigation;
    });
    res.json({ success: true, navigation: savedNavigation });
  });
  return router;
}
