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
    const current =
      (p.designPreference as Record<string, unknown> | null) || {};
    await db
      .update(schema.projects)
      .set({
        designPreference: { ...current, navigation },
        updatedAt: new Date(),
      })
      .where(eq(schema.projects.id, p.id));
    res.json({ success: true, navigation });
  });
  return router;
}
