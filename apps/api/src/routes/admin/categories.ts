import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { createDb, schema } from "@velozy/db";
import type { Environment } from "../../config/env.js";
import { HttpError } from "../../middleware/errors.js";
import { adminAccess } from "../../lib/admin-auth.js";
const input = z.object({
  projectId: z.string().uuid(),
  name: z.string().trim().min(1).max(255),
  heading: z.string().max(255).optional().nullable(),
  slug: z.string().trim().min(1).max(255),
  description: z.string().optional().nullable(),
  metaTitle: z.string().max(255).optional().nullable(),
  metaKeywords: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  image: z.string().max(500).optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});
export function adminCategoriesRouter(env: Environment): ExpressRouter {
  const db = createDb(env.DATABASE_URL),
    r = Router();
  const authz = adminAccess(env.DATABASE_URL);
  const auth = async (req: Express.Request) => {
    if (!req.auth?.userId) throw new HttpError(401, "Unauthorized");
    const u = await db.query.users.findFirst({
      where: eq(schema.users.id, req.auth.userId),
    });
    if (!u) throw new HttpError(404, "User not found");
    return u;
  };
  const own = async (pid: string, uid: string) => {
    await authz.project(pid, uid, "commerce:read");
  };
  r.get("/product-categories", async (req, res) => {
    const u = await auth(req),
      p = z.string().uuid().safeParse(req.query.projectId);
    if (!p.success) throw new HttpError(400, "Project ID is required");
    await own(p.data, u.id);
    res.json({
      categories: await db.query.productCategories.findMany({
        where: eq(schema.productCategories.projectId, p.data),
        orderBy: [
          asc(schema.productCategories.sortOrder),
          asc(schema.productCategories.name),
        ],
      }),
    });
  });
  r.post("/product-categories", async (req, res) => {
    const u = await auth(req),
      v = input.safeParse(req.body);
    if (!v.success)
      throw new HttpError(400, v.error.issues[0]?.message || "Invalid request");
    await own(v.data.projectId, u.id);
    await authz.project(v.data.projectId, u.id, "commerce:write");
    const e = await db.query.productCategories.findFirst({
      where: and(
        eq(schema.productCategories.projectId, v.data.projectId),
        eq(schema.productCategories.slug, v.data.slug),
      ),
    });
    if (e) throw new HttpError(400, "Category with this slug already exists");
    const [c] = await db
      .insert(schema.productCategories)
      .values({
        ...v.data,
        sortOrder: v.data.sortOrder ?? 0,
        isActive: v.data.isActive ?? true,
      })
      .returning();
    res.status(201).json({ category: c });
  });
  r.put("/product-categories", async (req, res) => {
    const u = await auth(req),
      id = z.string().uuid().safeParse(req.body?.id);
    if (!id.success) throw new HttpError(400, "Category ID is required");
    const c = await db.query.productCategories.findFirst({
      where: eq(schema.productCategories.id, id.data),
      with: { project: true },
    });
    if (!c)
      throw new HttpError(404, "Category not found or access denied");
    await authz.project(c.projectId, u.id, "commerce:write");
    const v = input.omit({ projectId: true }).partial().safeParse(req.body);
    if (!v.success) throw new HttpError(400, "Invalid request");
    const [x] = await db
      .update(schema.productCategories)
      .set({ ...v.data, updatedAt: new Date() })
      .where(eq(schema.productCategories.id, id.data))
      .returning();
    res.json({ category: x });
  });
  r.delete("/product-categories", async (req, res) => {
    const u = await auth(req),
      id = z.string().uuid().safeParse(req.body?.id);
    if (!id.success) throw new HttpError(400, "Category ID is required");
    const c = await db.query.productCategories.findFirst({
      where: eq(schema.productCategories.id, id.data),
      with: { project: true },
    });
    if (!c)
      throw new HttpError(404, "Category not found or access denied");
    await authz.project(c.projectId, u.id, "commerce:write");
    await db
      .delete(schema.productCategories)
      .where(eq(schema.productCategories.id, id.data));
    res.json({ success: true });
  });
  r.get("/product-categories/:slug", async (req, res) => {
    const u = await auth(req);
    const p = z.string().uuid().safeParse(req.query.projectId);
    if (!p.success) throw new HttpError(400, "Project ID is required");
    await own(p.data, u.id);
    const category = await db.query.productCategories.findFirst({
      where: and(
        eq(schema.productCategories.projectId, p.data),
        eq(schema.productCategories.id, decodeURIComponent(req.params.slug)),
      ),
    });
    if (!category) throw new HttpError(404, "Category not found");
    res.json({ category });
  });
  return r;
}
