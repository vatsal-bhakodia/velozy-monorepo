import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { eq } from "drizzle-orm";
import { createDb, schema } from "@velozy/db";
import type { Environment } from "../../config/env.js";
import { HttpError } from "../../middleware/errors.js";

export function adminAccountRouter(environment: Environment): ExpressRouter {
  const db = createDb(environment.DATABASE_URL);
  const router = Router();
  router.get("/account", async (req, res) => {
    if (!req.auth?.userId) throw new HttpError(401, "Unauthorized");
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, req.auth.userId),
    });
    if (!user) throw new HttpError(404, "User not found");
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
    });
  });
  router.put("/account", async (req, res) => {
    if (!req.auth?.userId) throw new HttpError(401, "Unauthorized");
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, req.auth.userId),
    });
    if (!user) throw new HttpError(404, "User not found");
    const name =
      typeof req.body?.name === "string"
        ? req.body.name.trim().slice(0, 255)
        : user.name;
    const [updated] = await db
      .update(schema.users)
      .set({ name, updatedAt: new Date() })
      .where(eq(schema.users.id, user.id))
      .returning();
    res.json({
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        image: updated.image,
      },
    });
  });
  return router;
}
