import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { createDb, schema } from "@velozy/db";
import type { Environment } from "../../config/env.js";
import { HttpError } from "../../middleware/errors.js";
import { adminAccess } from "../../lib/admin-auth.js";
const create = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  shortDescription: z.string().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  price: z.coerce.number().optional().nullable(),
  discountedPrice: z.coerce.number().optional().nullable(),
  sku: z.string().max(100).optional().nullable(),
  images: z.any().optional(),
  attributes: z.any().optional(),
  variants: z.any().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  inventoryQuantity: z.coerce
    .number()
    .int()
    .min(0)
    .max(1_000_000_000)
    .optional(),
  lowStockThreshold: z.coerce.number().int().min(0).optional(),
  trackInventory: z.boolean().optional(),
  status: z.enum(["draft", "published", "private"]).optional(),
});
export function adminProductsRouter(env: Environment): ExpressRouter {
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
  r.get("/products", async (req, res) => {
    const u = await auth(req),
      p = z.string().uuid().safeParse(req.query.projectId);
    if (!p.success) throw new HttpError(400, "Project ID is required");
    await own(p.data, u.id);
    res.json({
      products: await db.query.products.findMany({
        where: eq(schema.products.projectId, p.data),
        orderBy: [desc(schema.products.createdAt)],
        with: { category: true },
      }),
    });
  });
  r.post("/products", async (req, res) => {
    const u = await auth(req),
      v = create.safeParse(req.body);
    if (!v.success)
      throw new HttpError(400, v.error.issues[0]?.message || "Invalid request");
    await own(v.data.projectId, u.id);
    await authz.project(v.data.projectId, u.id, "commerce:write");
    const e = await db.query.products.findFirst({
      where: and(
        eq(schema.products.projectId, v.data.projectId),
        eq(schema.products.slug, v.data.slug),
      ),
    });
    if (e) throw new HttpError(400, "Product with this slug already exists");
    const p = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(schema.products)
        .values({
          ...v.data,
          productType: "simple",
          productKind: "physical",
          attributes: v.data.attributes ?? [],
          variants: v.data.variants ?? [],
          isActive: v.data.isActive ?? true,
          isFeatured: v.data.isFeatured ?? false,
          trackInventory: v.data.trackInventory ?? false,
          status: v.data.status ?? "draft",
        })
        .returning();
      await tx
        .insert(schema.inventoryLocations)
        .values({
          projectId: v.data.projectId,
          name: "Default location",
          code: "DEFAULT",
          isDefault: true,
        })
        .onConflictDoNothing();
      const location = await tx.query.inventoryLocations.findFirst({
        where: and(
          eq(schema.inventoryLocations.projectId, v.data.projectId),
          eq(schema.inventoryLocations.isDefault, true),
        ),
      });
      if (location)
        await tx.insert(schema.inventoryBalances).values({
          productId: created.id,
          locationId: location.id,
          quantity: created.inventoryQuantity ?? 0,
        });
      return created;
    });
    res.status(201).json({ product: p });
  });
  r.put("/products", async (req, res) => {
    const u = await auth(req),
      id = z.string().uuid().safeParse(req.body?.id);
    if (!id.success) throw new HttpError(400, "Product ID is required");
    const p = await db.query.products.findFirst({
      where: eq(schema.products.id, id.data),
      with: { project: true },
    });
    if (!p)
      throw new HttpError(404, "Product not found or access denied");
    await authz.project(p.projectId, u.id, "commerce:write");
    const v = create.omit({ projectId: true }).partial().safeParse(req.body);
    if (!v.success) throw new HttpError(400, "Invalid request");
    const x = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT id FROM products WHERE id = ${id.data} FOR UPDATE`,
      );
      const current = await tx.query.products.findFirst({
        where: eq(schema.products.id, id.data),
      });
      if (!current) throw new HttpError(404, "Product not found");
      if (
        v.data.inventoryQuantity !== undefined &&
        v.data.inventoryQuantity !== (current.inventoryQuantity ?? 0)
      ) {
        const location = await tx.query.inventoryLocations.findFirst({
          where: and(
            eq(schema.inventoryLocations.projectId, current.projectId),
            eq(schema.inventoryLocations.isDefault, true),
          ),
        });
        if (!location)
          throw new HttpError(
            409,
            "Configure a default inventory location first",
          );
        const balance = await tx.query.inventoryBalances.findFirst({
          where: and(
            eq(schema.inventoryBalances.productId, current.id),
            eq(schema.inventoryBalances.locationId, location.id),
          ),
        });
        const next =
          (balance?.quantity ?? 0) +
          v.data.inventoryQuantity -
          (current.inventoryQuantity ?? 0);
        if (next < 0)
          throw new HttpError(
            409,
            "Move stock to the default location before reducing the total",
          );
        await tx
          .insert(schema.inventoryBalances)
          .values({
            productId: current.id,
            locationId: location.id,
            quantity: next,
          })
          .onConflictDoUpdate({
            target: [
              schema.inventoryBalances.productId,
              schema.inventoryBalances.locationId,
            ],
            set: { quantity: next, updatedAt: new Date() },
          });
        await tx.insert(schema.inventoryMovements).values({
          projectId: current.projectId,
          productId: current.id,
          locationId: location.id,
          quantityChange:
            v.data.inventoryQuantity - (current.inventoryQuantity ?? 0),
          reason: "Product inventory updated",
        });
      }
      const [updated] = await tx
        .update(schema.products)
        .set({ ...v.data, updatedAt: new Date() })
        .where(eq(schema.products.id, id.data))
        .returning();
      return updated;
    });
    res.json({ product: x });
  });
  r.delete("/products", async (req, res) => {
    const u = await auth(req),
      id = z.string().uuid().safeParse(req.body?.id);
    if (!id.success) throw new HttpError(400, "Product ID is required");
    const p = await db.query.products.findFirst({
      where: eq(schema.products.id, id.data),
      with: { project: true },
    });
    if (!p)
      throw new HttpError(404, "Product not found or access denied");
    await authz.project(p.projectId, u.id, "commerce:write");
    await db.delete(schema.products).where(eq(schema.products.id, id.data));
    res.json({ success: true });
  });
  r.get("/products/:slug", async (req, res) => {
    const u = await auth(req);
    const p = z.string().uuid().safeParse(req.query.projectId);
    if (!p.success) throw new HttpError(400, "Project ID is required");
    await own(p.data, u.id);
    const product = await db.query.products.findFirst({
      where: and(
        eq(schema.products.projectId, p.data),
        eq(schema.products.id, decodeURIComponent(req.params.slug)),
      ),
      with: { category: true },
    });
    if (!product) throw new HttpError(404, "Product not found");
    res.json({ product });
  });
  return r;
}
