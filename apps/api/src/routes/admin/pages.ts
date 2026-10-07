import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { createDb, schema } from "@velozy/db";
import type { Environment } from "../../config/env.js";
import { HttpError } from "../../middleware/errors.js";
import { adminAccess } from "../../lib/admin-auth.js";

const pageInput = z.object({
  projectId: z.string().uuid(),
  slug: z.string().trim().min(1).max(255),
  title: z.string().trim().min(1).max(255),
  metaTitle: z.string().max(255).optional().nullable(),
  metaKeyword: z.string().max(500).optional().nullable(),
  metaDescription: z.string().optional().nullable(),
});
const pageUpdate = pageInput
  .omit({ projectId: true })
  .partial()
  .extend({ id: z.string().uuid() });

export function adminPagesRouter(environment: Environment): ExpressRouter {
  const db = createDb(environment.DATABASE_URL);
  const authz = adminAccess(environment.DATABASE_URL);
  const router = Router();
  const user = async (request: Express.Request) => {
    if (!request.auth?.userId) throw new HttpError(401, "Unauthorized");
    const found = await db.query.users.findFirst({
      where: eq(schema.users.id, request.auth.userId),
    });
    if (!found) throw new HttpError(404, "User not found");
    return found;
  };
  const ownedProject = async (projectId: string, userId: string) => {
    return authz.project(projectId, userId);
  };
  router.get("/pages", async (req, res) => {
    const u = await user(req);
    const projectId = z.string().uuid().safeParse(req.query.projectId);
    if (!projectId.success)
      throw new HttpError(400, "Project ID is required", "validation_error");
    await ownedProject(projectId.data, u.id);
    const pages = await db.query.pages.findMany({
      where: eq(schema.pages.projectId, projectId.data),
      orderBy: [desc(schema.pages.createdAt)],
    });
    res.json({ pages });
  });
  router.post("/pages", async (req, res) => {
    const u = await user(req);
    const input = pageInput.safeParse(req.body);
    if (!input.success)
      throw new HttpError(
        400,
        input.error.issues[0]?.message || "Invalid request",
        "validation_error",
      );
    await ownedProject(input.data.projectId, u.id);
    await authz.project(input.data.projectId, u.id, "content:write");
    const existing = await db.query.pages.findFirst({
      where: and(
        eq(schema.pages.projectId, input.data.projectId),
        eq(schema.pages.slug, input.data.slug),
      ),
    });
    if (existing)
      throw new HttpError(
        400,
        "Page with this slug already exists",
        "duplicate_slug",
      );
    const [page] = await db.insert(schema.pages).values(input.data).returning();
    res.status(201).json({ page });
  });
  router.put("/pages", async (req, res) => {
    const u = await user(req);
    const input = pageUpdate.safeParse(req.body);
    if (!input.success)
      throw new HttpError(
        400,
        input.error.issues[0]?.message || "Invalid request",
        "validation_error",
      );
    const page = await db.query.pages.findFirst({
      where: eq(schema.pages.id, input.data.id),
      with: { project: true },
    });
    if (!page)
      throw new HttpError(404, "Page not found or access denied");
    await authz.project(page.projectId, u.id, "content:write");
    if (input.data.slug && input.data.slug !== page.slug) {
      const duplicate = await db.query.pages.findFirst({
        where: and(
          eq(schema.pages.projectId, page.projectId),
          eq(schema.pages.slug, input.data.slug),
        ),
      });
      if (duplicate)
        throw new HttpError(
          400,
          "Page with this slug already exists",
          "duplicate_slug",
        );
    }
    const { id, ...changes } = input.data;
    const [updated] = await db
      .update(schema.pages)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(schema.pages.id, id))
      .returning();
    res.json({ page: updated });
  });
  router.delete("/pages", async (req, res) => {
    const u = await user(req);
    const id = z.string().uuid().safeParse(req.body?.id);
    if (!id.success)
      throw new HttpError(400, "Page ID is required", "validation_error");
    const page = await db.query.pages.findFirst({
      where: eq(schema.pages.id, id.data),
      with: { project: true },
    });
    if (!page)
      throw new HttpError(404, "Page not found or access denied");
    await authz.project(page.projectId, u.id, "content:write");
    await db.delete(schema.pages).where(eq(schema.pages.id, id.data));
    res.json({ success: true });
  });
  return router;
}
