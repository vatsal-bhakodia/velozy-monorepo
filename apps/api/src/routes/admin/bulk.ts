import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { createDb, schema } from "@velozy/db";
import type { Environment } from "../../config/env.js";
import { HttpError } from "../../middleware/errors.js";
import { adminAccess } from "../../lib/admin-auth.js";
export function adminBulkRouter(env: Environment): ExpressRouter {
  const db = createDb(env.DATABASE_URL),
    r = Router();
  const authz = adminAccess(env.DATABASE_URL);
  const ids = z.object({ ids: z.array(z.string().uuid()).min(1) });
  const user = async (q: Express.Request) => {
    if (!q.auth?.userId) throw new HttpError(401, "Unauthorized");
    const u = await db.query.users.findFirst({
      where: eq(schema.users.id, q.auth.userId),
    });
    if (!u) throw new HttpError(404, "User not found");
    return u;
  };
  r.delete("/products/bulk", async (q, s) => {
    const u = await user(q),
      v = ids.safeParse(q.body);
    if (!v.success) throw new HttpError(400, "Product IDs array is required");
    const rows = await db.query.products.findMany({
      where: inArray(schema.products.id, v.data.ids),
      with: { project: true },
    });
    if (!rows.length)
      throw new HttpError(404, "No products found or access denied");
    await Promise.all(rows.map((row) => authz.project(row.projectId, u.id, "commerce:write")));
    await db.delete(schema.products).where(inArray(schema.products.id, v.data.ids));
    s.json({ success: true, deletedCount: rows.length });
  });
  r.delete("/product-categories/bulk", async (q, s) => {
    const u = await user(q),
      v = ids.safeParse(q.body);
    if (!v.success) throw new HttpError(400, "Category IDs array is required");
    const rows = await db.query.productCategories.findMany({
      where: inArray(schema.productCategories.id, v.data.ids),
      with: { project: true },
    });
    if (!rows.length)
      throw new HttpError(404, "No categories found or access denied");
    await Promise.all(rows.map((row) => authz.project(row.projectId, u.id, "commerce:write")));
    await db
      .delete(schema.productCategories)
      .where(inArray(schema.productCategories.id, v.data.ids));
    s.json({ success: true, deletedCount: rows.length });
  });
  r.put("/products/bulk", async (q, s) => {
    const u = await user(q),
      v = ids
        .extend({
          isActive: z.boolean().optional(),
          isFeatured: z.boolean().optional(),
          status: z.enum(["draft", "published", "private"]).optional(),
        })
        .safeParse(q.body);
    if (!v.success) throw new HttpError(400, "Product IDs array is required");
    const rows = await db.query.products.findMany({
      where: inArray(schema.products.id, v.data.ids),
      with: { project: true },
    });
    if (!rows.length)
      throw new HttpError(404, "No products found or access denied");
    await Promise.all(rows.map((row) => authz.project(row.projectId, u.id, "commerce:write")));
    const { ids: _, ...changes } = v.data;
    await db.transaction(async (tx) => {
      await tx
        .update(schema.products)
        .set({
          ...changes,
          ...(changes.status
            ? { isActive: changes.status === "published" }
            : {}),
          updatedAt: new Date(),
        })
        .where(inArray(schema.products.id, v.data.ids));
    });
    s.json({ success: true, updatedCount: rows.length });
  });
  r.put("/product-categories/bulk", async (q, s) => {
    const u = await user(q),
      v = ids.extend({ isActive: z.boolean().optional() }).safeParse(q.body);
    if (!v.success) throw new HttpError(400, "Category IDs array is required");
    const rows = await db.query.productCategories.findMany({
      where: inArray(schema.productCategories.id, v.data.ids),
      with: { project: true },
    });
    if (!rows.length)
      throw new HttpError(404, "No categories found or access denied");
    await Promise.all(rows.map((row) => authz.project(row.projectId, u.id, "commerce:write")));
    await db
      .update(schema.productCategories)
      .set({ isActive: v.data.isActive, updatedAt: new Date() })
      .where(inArray(schema.productCategories.id, v.data.ids));
    s.json({ success: true, updatedCount: rows.length });
  });
  r.delete("/blogs/bulk", async (q, s) => {
    const u = await user(q),
      v = ids.safeParse(q.body);
    if (!v.success) throw new HttpError(400, "Blog IDs array is required");
    const rows = await db.query.blogs.findMany({
      where: inArray(schema.blogs.id, v.data.ids),
      with: { project: true },
    });
    if (rows.length !== v.data.ids.length)
      throw new HttpError(404, "No blogs found or access denied");
    await Promise.all(rows.map((row) => authz.project(row.projectId, u.id, "content:write")));
    await db.delete(schema.blogs).where(inArray(schema.blogs.id, v.data.ids));
    s.json({ success: true, deletedCount: rows.length });
  });
  r.put("/blogs/bulk", async (q, s) => {
    const u = await user(q),
      v = ids
        .extend({
          status: z.enum(["draft", "published", "private"]).optional(),
          isFeatured: z.boolean().optional(),
        })
        .safeParse(q.body);
    if (!v.success) throw new HttpError(400, "Blog IDs array is required");
    const rows = await db.query.blogs.findMany({
      where: inArray(schema.blogs.id, v.data.ids),
      with: { project: true },
    });
    if (rows.length !== v.data.ids.length)
      throw new HttpError(404, "No blogs found or access denied");
    await Promise.all(rows.map((row) => authz.project(row.projectId, u.id, "content:write")));
    await db
      .update(schema.blogs)
      .set({
        status: v.data.status,
        isFeatured: v.data.isFeatured,
        isPublished:
          v.data.status === undefined
            ? undefined
            : v.data.status === "published",
        publishedAt: v.data.status === "published" ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(inArray(schema.blogs.id, v.data.ids));
    s.json({ success: true, updatedCount: rows.length });
  });
  return r;
}
