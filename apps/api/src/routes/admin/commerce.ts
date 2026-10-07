import { Router } from "express";
import type { Request, Router as ExpressRouter } from "express";
import { and, asc, count, desc, eq, gt, ilike, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@velozy/db";
import type { Environment } from "../../config/env.js";
import { HttpError } from "../../middleware/errors.js";
import { adminAccess } from "../../lib/admin-auth.js";
import {
  encodeCursor,
  parseInventoryPageQuery,
  parseMovementPageQuery,
} from "../../lib/inventory-pagination.js";
import {
  BUILT_IN_COLOR_KIND,
  DEFAULT_PRODUCT_COLORS,
  ensureDefaultProductColors,
} from "../../lib/product-attributes.js";

const projectId = z.string().uuid();
const locationFields = z.object({
  name: z.string().trim().min(1).max(255),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9_-]{0,39}$/),
  address: z.string().trim().max(1000).nullable(),
  active: z.boolean(),
});
const stockChange = z.object({
  projectId,
  productId: z.string().uuid(),
  locationId: z.string().uuid(),
  quantity: z.number().int().min(0).max(1_000_000_000),
  reason: z.string().trim().min(3).max(255),
});
const discountFields = z
  .object({
    code: z.string().trim().min(1).max(100),
    name: z.string().trim().min(1).max(255),
    type: z.enum(["percentage", "fixed"]),
    amount: z
      .string()
      .trim()
      .regex(/^\d+(\.\d{1,6})?$/),
    isActive: z.boolean(),
    usageLimit: z.number().int().min(1).nullable(),
    startsAt: z.string().datetime().nullable(),
    endsAt: z.string().datetime().nullable(),
  })
  .superRefine((discount, context) => {
    const amount = Number(discount.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      context.addIssue({
        code: "custom",
        path: ["amount"],
        message: "Amount must be greater than zero",
      });
    }
    if (discount.type === "percentage" && amount > 100) {
      context.addIssue({
        code: "custom",
        path: ["amount"],
        message: "Percentage cannot exceed 100",
      });
    }
    if (
      discount.startsAt &&
      discount.endsAt &&
      new Date(discount.startsAt).getTime() >=
        new Date(discount.endsAt).getTime()
    ) {
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "End date must be after the start date",
      });
    }
  });

export function adminCommerceRouter(
  environment: Environment,
  dependencies = adminAccess(environment.DATABASE_URL),
): ExpressRouter {
  const { db, user, project } = dependencies;
  const router = Router();
  const access = async (req: Request, id: unknown) =>
    project(
      projectId.parse(id),
      (await user(req)).id,
      req.method === "GET" ? "commerce:read" : "commerce:write",
    );
  router.get("/inventory-locations", async (req, res) => {
    const p = await access(req, req.query.projectId);
    const locations = await db.query.inventoryLocations.findMany({
      where: eq(schema.inventoryLocations.projectId, p.id),
      orderBy: [
        desc(schema.inventoryLocations.isDefault),
        schema.inventoryLocations.name,
      ],
    });
    res.json({ locations });
  });
  router.get("/inventory-balances", async (req, res) => {
    const p = await access(req, req.query.projectId);
    const locationId = z.string().uuid().safeParse(req.query.locationId);
    if (!locationId.success)
      throw new HttpError(400, "Location ID is required", "validation_error");
    const location = await db.query.inventoryLocations.findFirst({
      where: and(
        eq(schema.inventoryLocations.id, locationId.data),
        eq(schema.inventoryLocations.projectId, p.id),
      ),
    });
    if (!location) throw new HttpError(404, "Location not found");

    const page = parseInventoryPageQuery(req.query as Record<string, unknown>);
    const inStockOnly = z
      .enum(["true", "false"])
      .default("false")
      .safeParse(req.query.inStockOnly);
    if (!inStockOnly.success)
      throw new HttpError(400, "Invalid in-stock filter", "validation_error");
    const search = page.search
      ? `%${page.search.replace(/[\\%_]/g, "\\$&")}%`
      : null;
    const stockQuantity = sql<number>`coalesce(${schema.inventoryBalances.quantity}, 0)`;
    const baseConditions = [
      eq(schema.products.projectId, p.id),
      search
        ? or(
            ilike(schema.products.name, search),
            ilike(schema.products.sku, search),
          )
        : undefined,
      inStockOnly.data === "true" ? gt(stockQuantity, 0) : undefined,
    ];
    const conditions = and(
      ...baseConditions,
      page.cursor
        ? or(
            gt(schema.products.name, page.cursor.name),
            and(
              eq(schema.products.name, page.cursor.name),
              gt(schema.products.id, page.cursor.id),
            ),
          )
        : undefined,
    );
    const [rows, [total]] = await Promise.all([
      db
        .select({
          id: schema.products.id,
          name: schema.products.name,
          sku: schema.products.sku,
          trackInventory: schema.products.trackInventory,
          lowStockThreshold: schema.products.lowStockThreshold,
          totalQuantity: schema.products.inventoryQuantity,
          locationQuantity: stockQuantity,
        })
        .from(schema.products)
        .leftJoin(
          schema.inventoryBalances,
          and(
            eq(schema.inventoryBalances.productId, schema.products.id),
            eq(schema.inventoryBalances.locationId, location.id),
          ),
        )
        .where(conditions)
        .orderBy(asc(schema.products.name), asc(schema.products.id))
        .limit(page.limit + 1),
      db
        .select({ value: count() })
        .from(schema.products)
        .leftJoin(
          schema.inventoryBalances,
          and(
            eq(schema.inventoryBalances.productId, schema.products.id),
            eq(schema.inventoryBalances.locationId, location.id),
          ),
        )
        .where(and(...baseConditions)),
    ]);
    const hasMore = rows.length > page.limit;
    const items = hasMore ? rows.slice(0, page.limit) : rows;
    const last = items.at(-1);
    res.json({
      items,
      total: total.value,
      hasMore,
      nextCursor:
        hasMore && last ? encodeCursor({ name: last.name, id: last.id }) : null,
    });
  });
  router.post("/inventory-locations", async (req, res) => {
    const p = await access(req, req.body?.projectId);
    const fields = locationFields.parse(req.body);
    const location = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT id FROM projects WHERE id = ${p.id} FOR UPDATE`,
      );
      const all = await tx.query.inventoryLocations.findMany({
        where: eq(schema.inventoryLocations.projectId, p.id),
      });
      if (all.some((item) => item.code === fields.code))
        throw new HttpError(409, "Location code already exists");
      if (!all.length && !fields.active)
        throw new HttpError(400, "The first location must be active");
      const [created] = await tx
        .insert(schema.inventoryLocations)
        .values({
          projectId: p.id,
          ...fields,
          isDefault: all.length === 0,
        })
        .returning();
      return created;
    });
    res.status(201).json({ location });
  });
  router.put("/inventory-locations/:id", async (req, res) => {
    const p = await access(req, req.body?.projectId);
    const id = z.string().uuid().parse(req.params.id);
    const fields = locationFields.parse(req.body);
    const updated = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT id FROM inventory_locations WHERE id = ${id} AND project_id = ${p.id} FOR UPDATE`,
      );
      const location = await tx.query.inventoryLocations.findFirst({
        where: and(
          eq(schema.inventoryLocations.id, id),
          eq(schema.inventoryLocations.projectId, p.id),
        ),
      });
      if (!location) throw new HttpError(404, "Location not found");
      if (location.isDefault && !fields.active)
        throw new HttpError(400, "The default location must remain active");
      if (!fields.active) {
        const stocked = await tx.query.inventoryBalances.findFirst({
          where: and(
            eq(schema.inventoryBalances.locationId, id),
            sql`${schema.inventoryBalances.quantity} > 0`,
          ),
        });
        if (stocked)
          throw new HttpError(
            409,
            "Move all stock before deactivating this location",
          );
      }
      if (fields.code !== location.code) {
        const duplicate = await tx.query.inventoryLocations.findFirst({
          where: and(
            eq(schema.inventoryLocations.projectId, p.id),
            eq(schema.inventoryLocations.code, fields.code),
          ),
        });
        if (duplicate) throw new HttpError(409, "Location code already exists");
      }
      const [saved] = await tx
        .update(schema.inventoryLocations)
        .set({ ...fields, updatedAt: new Date() })
        .where(eq(schema.inventoryLocations.id, id))
        .returning();
      return saved;
    });
    res.json({ location: updated });
  });
  router.put("/inventory-locations/:id/default", async (req, res) => {
    const p = await access(req, req.body?.projectId);
    const id = z.string().uuid().parse(req.params.id);
    await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT id FROM projects WHERE id = ${p.id} FOR UPDATE`,
      );
      await tx.execute(
        sql`SELECT id FROM inventory_locations WHERE id = ${id} AND project_id = ${p.id} FOR UPDATE`,
      );
      const location = await tx.query.inventoryLocations.findFirst({
        where: and(
          eq(schema.inventoryLocations.id, id),
          eq(schema.inventoryLocations.projectId, p.id),
        ),
      });
      if (!location || !location.active)
        throw new HttpError(400, "Choose an active location in this project");
      await tx
        .update(schema.inventoryLocations)
        .set({ isDefault: false })
        .where(eq(schema.inventoryLocations.projectId, p.id));
      await tx
        .update(schema.inventoryLocations)
        .set({ isDefault: true })
        .where(eq(schema.inventoryLocations.id, id));
    });
    res.json({ success: true });
  });
  router.put("/inventory-balances", async (req, res) => {
    const v = stockChange.parse(req.body);
    const p = await access(req, v.projectId);
    const result = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT id FROM products WHERE id = ${v.productId} AND project_id = ${p.id} FOR UPDATE`,
      );
      await tx.execute(
        sql`SELECT id FROM inventory_locations WHERE id = ${v.locationId} AND project_id = ${p.id} FOR UPDATE`,
      );
      const product = await tx.query.products.findFirst({
        where: and(
          eq(schema.products.id, v.productId),
          eq(schema.products.projectId, p.id),
        ),
      });
      const location = await tx.query.inventoryLocations.findFirst({
        where: and(
          eq(schema.inventoryLocations.id, v.locationId),
          eq(schema.inventoryLocations.projectId, p.id),
        ),
      });
      if (!product || !location)
        throw new HttpError(404, "Product or location not found");
      if (!location.active)
        throw new HttpError(400, "Activate the location before adding stock");
      const current = await tx.query.inventoryBalances.findFirst({
        where: and(
          eq(schema.inventoryBalances.productId, v.productId),
          eq(schema.inventoryBalances.locationId, v.locationId),
        ),
      });
      const delta = v.quantity - (current?.quantity ?? 0);
      const total = (product.inventoryQuantity ?? 0) + delta;
      if (total < 0 || total > 1_000_000_000)
        throw new HttpError(400, "Invalid total stock quantity");
      await tx
        .insert(schema.inventoryBalances)
        .values({
          productId: v.productId,
          locationId: v.locationId,
          quantity: v.quantity,
        })
        .onConflictDoUpdate({
          target: [
            schema.inventoryBalances.productId,
            schema.inventoryBalances.locationId,
          ],
          set: { quantity: v.quantity, updatedAt: new Date() },
        });
      if (delta !== 0) {
        await tx
          .update(schema.products)
          .set({ inventoryQuantity: total, updatedAt: new Date() })
          .where(eq(schema.products.id, v.productId));
        await tx.insert(schema.inventoryMovements).values({
          projectId: p.id,
          productId: v.productId,
          locationId: v.locationId,
          quantityChange: delta,
          reason: v.reason,
        });
      }
      return { quantity: v.quantity, total };
    });
    res.json(result);
  });
  router.post("/inventory-transfers", async (req, res) => {
    const v = z
      .object({
        projectId,
        productId: z.string().uuid(),
        fromLocationId: z.string().uuid(),
        toLocationId: z.string().uuid(),
        quantity: z.number().int().positive().max(1_000_000_000),
        reason: z.string().trim().min(3).max(255),
      })
      .parse(req.body);
    const p = await access(req, v.projectId);
    if (v.fromLocationId === v.toLocationId)
      throw new HttpError(400, "Choose two different locations");
    await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT id FROM products WHERE id = ${v.productId} AND project_id = ${p.id} FOR UPDATE`,
      );
      await tx.execute(
        sql`SELECT id FROM inventory_locations WHERE id IN (${v.fromLocationId}, ${v.toLocationId}) AND project_id = ${p.id} ORDER BY id FOR UPDATE`,
      );
      const product = await tx.query.products.findFirst({
        where: and(
          eq(schema.products.id, v.productId),
          eq(schema.products.projectId, p.id),
        ),
      });
      const from = await tx.query.inventoryLocations.findFirst({
        where: and(
          eq(schema.inventoryLocations.id, v.fromLocationId),
          eq(schema.inventoryLocations.projectId, p.id),
        ),
      });
      const to = await tx.query.inventoryLocations.findFirst({
        where: and(
          eq(schema.inventoryLocations.id, v.toLocationId),
          eq(schema.inventoryLocations.projectId, p.id),
        ),
      });
      if (!product || !from || !to)
        throw new HttpError(404, "Product or location not found");
      if (!to.active)
        throw new HttpError(400, "Destination location must be active");
      const source = await tx.query.inventoryBalances.findFirst({
        where: and(
          eq(schema.inventoryBalances.productId, v.productId),
          eq(schema.inventoryBalances.locationId, from.id),
        ),
      });
      const destination = await tx.query.inventoryBalances.findFirst({
        where: and(
          eq(schema.inventoryBalances.productId, v.productId),
          eq(schema.inventoryBalances.locationId, to.id),
        ),
      });
      if ((source?.quantity ?? 0) < v.quantity)
        throw new HttpError(409, "Insufficient stock at source location");
      if ((destination?.quantity ?? 0) + v.quantity > 1_000_000_000)
        throw new HttpError(400, "Destination quantity is too large");
      await tx
        .update(schema.inventoryBalances)
        .set({ quantity: source!.quantity - v.quantity, updatedAt: new Date() })
        .where(
          and(
            eq(schema.inventoryBalances.productId, v.productId),
            eq(schema.inventoryBalances.locationId, from.id),
          ),
        );
      await tx
        .insert(schema.inventoryBalances)
        .values({
          productId: v.productId,
          locationId: to.id,
          quantity: (destination?.quantity ?? 0) + v.quantity,
        })
        .onConflictDoUpdate({
          target: [
            schema.inventoryBalances.productId,
            schema.inventoryBalances.locationId,
          ],
          set: {
            quantity: (destination?.quantity ?? 0) + v.quantity,
            updatedAt: new Date(),
          },
        });
      await tx.insert(schema.inventoryMovements).values([
        {
          projectId: p.id,
          productId: v.productId,
          locationId: from.id,
          quantityChange: -v.quantity,
          reason: v.reason,
        },
        {
          projectId: p.id,
          productId: v.productId,
          locationId: to.id,
          quantityChange: v.quantity,
          reason: v.reason,
        },
      ]);
    });
    res.json({ success: true });
  });
  router.get("/inventory-movements", async (req, res) => {
    const p = await access(req, req.query.projectId);
    const page = parseMovementPageQuery(req.query as Record<string, unknown>);
    const locationId =
      req.query.locationId === undefined
        ? undefined
        : z.string().uuid().safeParse(req.query.locationId);
    const productId =
      req.query.productId === undefined
        ? undefined
        : z.string().uuid().safeParse(req.query.productId);
    if (locationId && !locationId.success)
      throw new HttpError(400, "Invalid location ID", "validation_error");
    if (productId && !productId.success)
      throw new HttpError(400, "Invalid product ID", "validation_error");
    if (locationId) {
      const location = await db.query.inventoryLocations.findFirst({
        where: and(
          eq(schema.inventoryLocations.id, locationId.data),
          eq(schema.inventoryLocations.projectId, p.id),
        ),
      });
      if (!location) throw new HttpError(404, "Location not found");
    }
    if (productId) {
      const product = await db.query.products.findFirst({
        where: and(
          eq(schema.products.id, productId.data),
          eq(schema.products.projectId, p.id),
        ),
      });
      if (!product) throw new HttpError(404, "Product not found");
    }

    const search = page.search
      ? `%${page.search.replace(/[\\%_]/g, "\\$&")}%`
      : null;
    const baseConditions = [
      eq(schema.inventoryMovements.projectId, p.id),
      locationId
        ? eq(schema.inventoryMovements.locationId, locationId.data)
        : undefined,
      productId
        ? eq(schema.inventoryMovements.productId, productId.data)
        : undefined,
      search
        ? or(
            ilike(schema.inventoryMovements.reason, search),
            ilike(schema.products.name, search),
            ilike(schema.products.sku, search),
          )
        : undefined,
    ];
    const conditions = and(
      ...baseConditions,
      page.cursor
        ? or(
            lt(
              schema.inventoryMovements.createdAt,
              new Date(page.cursor.createdAt),
            ),
            and(
              eq(
                schema.inventoryMovements.createdAt,
                new Date(page.cursor.createdAt),
              ),
              lt(schema.inventoryMovements.id, page.cursor.id),
            ),
          )
        : undefined,
    );
    const [rows, [total]] = await Promise.all([
      db
        .select({
          id: schema.inventoryMovements.id,
          productId: schema.inventoryMovements.productId,
          locationId: schema.inventoryMovements.locationId,
          productName: schema.products.name,
          productSku: schema.products.sku,
          locationName: schema.inventoryLocations.name,
          quantityChange: schema.inventoryMovements.quantityChange,
          reason: schema.inventoryMovements.reason,
          createdAt: schema.inventoryMovements.createdAt,
        })
        .from(schema.inventoryMovements)
        .leftJoin(
          schema.products,
          eq(schema.inventoryMovements.productId, schema.products.id),
        )
        .leftJoin(
          schema.inventoryLocations,
          eq(
            schema.inventoryMovements.locationId,
            schema.inventoryLocations.id,
          ),
        )
        .where(conditions)
        .orderBy(
          desc(schema.inventoryMovements.createdAt),
          desc(schema.inventoryMovements.id),
        )
        .limit(page.limit + 1),
      db
        .select({ value: count() })
        .from(schema.inventoryMovements)
        .leftJoin(
          schema.products,
          eq(schema.inventoryMovements.productId, schema.products.id),
        )
        .where(and(...baseConditions)),
    ]);
    const hasMore = rows.length > page.limit;
    const items = hasMore ? rows.slice(0, page.limit) : rows;
    const last = items.at(-1);
    res.json({
      items,
      total: total.value,
      hasMore,
      nextCursor:
        hasMore && last
          ? encodeCursor({
              createdAt: last.createdAt.toISOString(),
              id: last.id,
            })
          : null,
    });
  });
  router.get("/product-attributes", async (req, res) => {
    const p = await access(req, req.query.projectId);
    await ensureDefaultProductColors(db, p.id);
    const types = await db.query.productAttributeTypes.findMany({
      where: eq(schema.productAttributeTypes.projectId, p.id),
      with: { attributes: true },
    });
    const defaultColorLabels = new Set<string>(
      DEFAULT_PRODUCT_COLORS.map((color) => color.label),
    );
    res.json({
      types: types.map((type) =>
        type.kind === BUILT_IN_COLOR_KIND
          ? {
              ...type,
              attributes: type.attributes.filter(
                (attribute, index, all) =>
                  defaultColorLabels.has(attribute.label) &&
                  all.findIndex(
                    (candidate) => candidate.label === attribute.label,
                  ) === index,
              ),
            }
          : type,
      ),
    });
  });
  router.post("/product-attributes", async (req, res) => {
    const p = await access(req, req.body?.projectId ?? req.query.projectId);
    const v = z
      .object({
        name: z.string().trim().min(1).max(100),
        kind: z.literal("general").optional(),
      })
      .safeParse(req.body);
    if (!v.success) throw new HttpError(400, "Attribute name is required");
    const duplicate = await db.query.productAttributeTypes.findFirst({
      where: and(
        eq(schema.productAttributeTypes.projectId, p.id),
        eq(schema.productAttributeTypes.name, v.data.name),
      ),
    });
    if (duplicate)
      throw new HttpError(409, "An attribute with this name already exists");
    const [type] = await db
      .insert(schema.productAttributeTypes)
      .values({
        projectId: p.id,
        name: v.data.name,
        kind: "general",
      })
      .returning();
    res.status(201).json({ type });
  });
  router.post("/product-attributes/values", async (req, res) => {
    const p = await access(req, req.query.projectId);
    const type = await db.query.productAttributeTypes.findFirst({
      where: and(
        eq(
          schema.productAttributeTypes.id,
          z.string().uuid().parse(req.body?.typeId),
        ),
        eq(schema.productAttributeTypes.projectId, p.id),
      ),
    });
    if (!type) throw new HttpError(404, "Attribute type not found");
    if (type.kind === BUILT_IN_COLOR_KIND)
      throw new HttpError(400, "Built-in colors cannot be changed");
    const label = z.string().trim().min(1).parse(req.body?.label);
    const duplicate = await db.query.productAttributes.findFirst({
      where: and(
        eq(schema.productAttributes.typeId, type.id),
        eq(schema.productAttributes.label, label),
      ),
    });
    if (duplicate) throw new HttpError(409, "This value already exists");
    const [attribute] = await db
      .insert(schema.productAttributes)
      .values({
        typeId: type.id,
        label,
        value: req.body?.value ? String(req.body.value) : null,
      })
      .returning();
    res.status(201).json({ attribute });
  });
  router.put("/product-attributes", async (req, res) => {
    const p = await access(req, req.query.projectId);
    if (req.body?.typeId) {
      const existing = await db.query.productAttributeTypes.findFirst({
        where: and(
          eq(
            schema.productAttributeTypes.id,
            z.string().uuid().parse(req.body.typeId),
          ),
          eq(schema.productAttributeTypes.projectId, p.id),
        ),
      });
      if (!existing) throw new HttpError(404, "Attribute type not found");
      if (existing.kind === BUILT_IN_COLOR_KIND)
        throw new HttpError(400, "Built-in colors cannot be changed");
      const name = z.string().trim().min(1).max(100).parse(req.body.name);
      const duplicate = await db.query.productAttributeTypes.findFirst({
        where: and(
          eq(schema.productAttributeTypes.projectId, p.id),
          eq(schema.productAttributeTypes.name, name),
        ),
      });
      if (duplicate && duplicate.id !== existing.id)
        throw new HttpError(409, "An attribute with this name already exists");
      const [type] = await db
        .update(schema.productAttributeTypes)
        .set({
          name,
          kind: "general",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(
              schema.productAttributeTypes.id,
              z.string().uuid().parse(req.body.typeId),
            ),
            eq(schema.productAttributeTypes.projectId, p.id),
          ),
        )
        .returning();
      if (!type) throw new HttpError(404, "Attribute type not found");
      res.json({ type });
      return;
    }
    const existing = await db.query.productAttributes.findFirst({
      where: eq(
        schema.productAttributes.id,
        z.string().uuid().parse(req.body?.attributeId),
      ),
      with: { type: true },
    });
    if (!existing || existing.type.projectId !== p.id)
      throw new HttpError(404, "Attribute not found");
    if (existing.type.kind === BUILT_IN_COLOR_KIND)
      throw new HttpError(400, "Built-in colors cannot be changed");
    const label = z.string().trim().min(1).max(100).parse(req.body?.label);
    const duplicate = await db.query.productAttributes.findFirst({
      where: and(
        eq(schema.productAttributes.typeId, existing.typeId),
        eq(schema.productAttributes.label, label),
      ),
    });
    if (duplicate && duplicate.id !== existing.id)
      throw new HttpError(409, "This value already exists");
    const [attribute] = await db
      .update(schema.productAttributes)
      .set({
        label,
        value: req.body?.value ? String(req.body.value) : null,
        updatedAt: new Date(),
      })
      .where(
        eq(
          schema.productAttributes.id,
          z.string().uuid().parse(req.body?.attributeId),
        ),
      )
      .returning();
    if (!attribute) throw new HttpError(404, "Attribute not found");
    res.json({ attribute });
  });
  router.delete("/product-attributes", async (req, res) => {
    const p = await access(req, req.query.projectId);
    if (req.body?.typeId) {
      const existing = await db.query.productAttributeTypes.findFirst({
        where: and(
          eq(
            schema.productAttributeTypes.id,
            z.string().uuid().parse(req.body.typeId),
          ),
          eq(schema.productAttributeTypes.projectId, p.id),
        ),
      });
      if (!existing) throw new HttpError(404, "Attribute type not found");
      if (existing.kind === BUILT_IN_COLOR_KIND)
        throw new HttpError(400, "Built-in colors cannot be changed");
      await db
        .delete(schema.productAttributeTypes)
        .where(
          and(
            eq(
              schema.productAttributeTypes.id,
              z.string().uuid().parse(req.body.typeId),
            ),
            eq(schema.productAttributeTypes.projectId, p.id),
          ),
        );
      res.json({ success: true });
      return;
    }
    const attribute = await db.query.productAttributes.findFirst({
      where: eq(
        schema.productAttributes.id,
        z.string().uuid().parse(req.body?.attributeId),
      ),
      with: { type: true },
    });
    if (!attribute || attribute.type.projectId !== p.id)
      throw new HttpError(404, "Attribute not found");
    if (attribute.type.kind === BUILT_IN_COLOR_KIND)
      throw new HttpError(400, "Built-in colors cannot be changed");
    await db
      .delete(schema.productAttributes)
      .where(eq(schema.productAttributes.id, attribute.id));
    res.json({ success: true });
  });
  router.get("/discounts", async (req, res) => {
    const p = await access(req, req.query.projectId);
    res.json({
      discounts: await db.query.discounts.findMany({
        where: eq(schema.discounts.projectId, p.id),
        orderBy: [desc(schema.discounts.createdAt)],
      }),
    });
  });
  router.post("/discounts", async (req, res) => {
    const p = await access(req, req.body?.projectId);
    const v = discountFields.safeParse(req.body);
    if (!v.success) throw new HttpError(400, "Invalid discount");
    const [discount] = await db
      .insert(schema.discounts)
      .values({
        projectId: p.id,
        code: v.data.code.toUpperCase(),
        name: v.data.name,
        type: v.data.type,
        amount: v.data.amount,
        isActive: v.data.isActive,
        usageLimit: v.data.usageLimit,
        startsAt: v.data.startsAt ? new Date(v.data.startsAt) : null,
        endsAt: v.data.endsAt ? new Date(v.data.endsAt) : null,
      })
      .returning();
    res.status(201).json({ discount });
  });
  router.put("/discounts", async (req, res) => {
    const p = await access(req, req.body?.projectId);
    const id = z.string().uuid().safeParse(req.body?.id);
    const v = discountFields.safeParse(req.body);
    if (!id.success || !v.success) throw new HttpError(400, "Invalid discount");
    const [discount] = await db
      .update(schema.discounts)
      .set({
        name: v.data.name,
        code: v.data.code.toUpperCase(),
        type: v.data.type,
        amount: v.data.amount,
        isActive: v.data.isActive,
        usageLimit: v.data.usageLimit,
        startsAt: v.data.startsAt ? new Date(v.data.startsAt) : null,
        endsAt: v.data.endsAt ? new Date(v.data.endsAt) : null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.discounts.id, id.data),
          eq(schema.discounts.projectId, p.id),
        ),
      )
      .returning();
    if (!discount) throw new HttpError(404, "Discount not found");
    res.json({ discount });
  });
  router.delete("/discounts", async (req, res) => {
    const p = await access(req, req.body?.projectId);
    await db
      .update(schema.discounts)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(schema.discounts.id, z.string().uuid().parse(req.body?.id)),
          eq(schema.discounts.projectId, p.id),
        ),
      );
    res.json({ success: true });
  });
  router.get("/commerce-settings", async (req, res) => {
    const p = await access(req, req.query.projectId);
    res.json({
      settings: await db.query.commerceSettings.findMany({
        where: eq(schema.commerceSettings.projectId, p.id),
      }),
    });
  });
  router.put("/commerce-settings", async (req, res) => {
    const p = await access(req, req.body?.projectId);
    const kind = z
      .enum(["shipping", "notifications", "recovery"])
      .parse(req.body?.kind);
    if (!req.body.data || typeof req.body.data !== "object")
      throw new HttpError(400, "Setting kind and data are required");
    const old = await db.query.commerceSettings.findFirst({
      where: and(
        eq(schema.commerceSettings.projectId, p.id),
        eq(schema.commerceSettings.kind, kind),
      ),
    });
    const [setting] = old
      ? await db
          .update(schema.commerceSettings)
          .set({
            data: {
              ...((old.data as Record<string, unknown> | null) ?? {}),
              ...req.body.data,
            },
            updatedAt: new Date(),
          })
          .where(eq(schema.commerceSettings.id, old.id))
          .returning()
      : await db
          .insert(schema.commerceSettings)
          .values({ projectId: p.id, kind, data: req.body.data })
          .returning();
    res.json({ setting });
  });
  return router;
}
