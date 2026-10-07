import { Router } from "express";
import type { Request, Router as ExpressRouter } from "express";
import { and, desc, eq, gte, inArray, lt, sql, sum } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@velozy/db";
import type { Environment } from "../../config/env.js";
import { HttpError } from "../../middleware/errors.js";
import { adminAccess } from "../../lib/admin-auth.js";

const id = z.string().uuid();
const revenueRange = z
  .object({
    projectId: id,
    from: z.string().date(),
    to: z.string().date(),
  })
  .refine((range) => range.from <= range.to, {
    path: ["to"],
    message: "End date must be on or after start date",
  });
const successfulOrderStatuses = ["paid", "completed", "fulfilled"] as const;

function decimalUnits(value: string | null | undefined) {
  const raw = value ?? "0";
  const negative = raw.startsWith("-");
  const [whole, fraction = ""] = raw.replace(/^-/, "").split(".");
  const units =
    BigInt(whole || "0") * 1_000_000n +
    BigInt(fraction.padEnd(6, "0").slice(0, 6));
  return negative ? -units : units;
}

function decimalString(units: bigint) {
  const whole = units / 1_000_000n;
  const fraction = (units % 1_000_000n)
    .toString()
    .padStart(6, "0")
    .replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function netRevenueByCurrency(
  orders: Array<{ currency: string; total: string | null; count: number }>,
  refunds: Array<{ currency: string; total: string | null }>,
) {
  const refundedByCurrency = new Map(
    refunds.map((row) => [row.currency, decimalUnits(row.total)]),
  );
  return orders.map((row) => {
    const net =
      decimalUnits(row.total) - (refundedByCurrency.get(row.currency) ?? 0n);
    return {
      currency: row.currency,
      amount: decimalString(net > 0n ? net : 0n),
      orders: Number(row.count),
    };
  });
}
const customerFields = z.object({
  name: z.string().trim().max(255).optional(),
  email: z
    .union([z.literal(""), z.string().trim().email().max(320)])
    .optional(),
  phone: z.string().trim().max(50).optional(),
});
export function adminOperationsRouter(
  environment: Environment,
  dependencies = adminAccess(environment.DATABASE_URL),
): ExpressRouter {
  const { db, user, project } = dependencies;
  const router = Router();
  const owned = async (req: Request, value: unknown) =>
    project(
      id.parse(value),
      (await user(req)).id,
      req.method === "GET" ? "commerce:read" : "commerce:write",
    );
  router.get("/customers", async (req, res) => {
    const p = await owned(req, req.query.projectId);
    res.json({
      customers: await db.query.contacts.findMany({
        where: eq(schema.contacts.projectId, p.id),
        orderBy: [desc(schema.contacts.createdAt)],
      }),
    });
  });
  router.put("/customers", async (req, res) => {
    const p = await owned(req, req.body?.projectId);
    const customerId = id.parse(req.body?.id);
    const input = customerFields.safeParse(req.body);
    if (!input.success)
      throw new HttpError(400, "Enter a valid customer name, email, or phone");
    if (!input.data.name && !input.data.email && !input.data.phone)
      throw new HttpError(
        400,
        "Customer id and at least one field are required",
      );
    const [customer] = await db
      .update(schema.contacts)
      .set({
        name:
          input.data.name === undefined ? undefined : input.data.name || null,
        email:
          input.data.email === undefined ? undefined : input.data.email || null,
        phone:
          input.data.phone === undefined ? undefined : input.data.phone || null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.contacts.id, customerId),
          eq(schema.contacts.projectId, p.id),
        ),
      )
      .returning();
    if (!customer) throw new HttpError(404, "Customer not found");
    res.json({ customer });
  });
  router.get("/orders", async (req, res) => {
    const p = await owned(req, req.query.projectId);
    const rows = await db
      .select({
        id: schema.orders.id,
        status: schema.orders.status,
        currency: schema.orders.currency,
        total: schema.orders.total,
        provider: schema.orders.provider,
        createdAt: schema.orders.createdAt,
        customerName: schema.contacts.name,
        customerEmail: schema.contacts.email,
        metadata: schema.orders.metadata,
      })
      .from(schema.orders)
      .leftJoin(
        schema.contacts,
        eq(schema.orders.contactId, schema.contacts.id),
      )
      .where(eq(schema.orders.projectId, p.id))
      .orderBy(desc(schema.orders.createdAt));
    res.json({ orders: rows });
  });
  router.get("/commerce/revenue-summary", async (req, res) => {
    const input = revenueRange.safeParse(req.query);
    if (!input.success)
      throw new HttpError(
        400,
        input.error.issues[0]?.message || "Invalid revenue date range",
        "validation_error",
      );
    const p = await owned(req, input.data.projectId);
    if (p.storeType !== "ecommerce")
      throw new HttpError(
        409,
        "Revenue summaries are only available for ecommerce projects",
        "not_ecommerce_project",
      );
    const from = new Date(`${input.data.from}T00:00:00.000Z`);
    const to = new Date(`${input.data.to}T00:00:00.000Z`);
    to.setUTCDate(to.getUTCDate() + 1);
    const dateFilters = [
      eq(schema.orders.projectId, p.id),
      gte(schema.orders.createdAt, from),
      lt(schema.orders.createdAt, to),
    ];
    const [orders, refunds] = await Promise.all([
      db
        .select({
          currency: schema.orders.currency,
          total: sum(schema.orders.total),
          count: sql<number>`count(*)`,
        })
        .from(schema.orders)
        .where(
          and(
            ...dateFilters,
            inArray(schema.orders.status, successfulOrderStatuses),
          ),
        )
        .groupBy(schema.orders.currency),
      db
        .select({
          currency: schema.orders.currency,
          total: sum(schema.orderReturns.total),
        })
        .from(schema.orderReturns)
        .innerJoin(
          schema.orders,
          eq(schema.orderReturns.orderId, schema.orders.id),
        )
        .where(
          and(
            eq(schema.orderReturns.projectId, p.id),
            eq(schema.orderReturns.status, "refunded"),
            ...dateFilters,
            inArray(schema.orders.status, successfulOrderStatuses),
          ),
        )
        .groupBy(schema.orders.currency),
    ]);
    res.json({
      from: input.data.from,
      to: input.data.to,
      revenue: netRevenueByCurrency(orders, refunds),
    });
  });
  router.put("/orders", async (req, res) => {
    const p = await owned(req, req.body?.projectId);
    const status = z
      .enum([
        "pending",
        "processing",
        "paid",
        "fulfilled",
        "completed",
        "cancelled",
        "refunded",
      ])
      .parse(req.body?.status);
    const orderId = id.parse(req.body?.id);
    const existing = await db.query.orders.findFirst({
      where: and(
        eq(schema.orders.id, orderId),
        eq(schema.orders.projectId, p.id),
      ),
    });
    if (!existing) throw new HttpError(404, "Order not found");
    const [order] = await db
      .update(schema.orders)
      .set({
        status,
        metadata: {
          ...((existing.metadata as Record<string, unknown> | null) ?? {}),
          ...(req.body.note !== undefined
            ? { adminNote: String(req.body.note) }
            : {}),
          ...(req.body.trackingNumber !== undefined
            ? { trackingNumber: String(req.body.trackingNumber) }
            : {}),
        },
        updatedAt: new Date(),
      })
      .where(eq(schema.orders.id, orderId))
      .returning();
    res.json({ order });
  });
  router.get("/carts", async (req, res) => {
    const p = await owned(req, req.query.projectId);
    const rows = await db
      .select({
        id: schema.carts.id,
        status: schema.carts.status,
        currency: schema.carts.currency,
        total: schema.carts.total,
        createdAt: schema.carts.createdAt,
        customerName: schema.contacts.name,
        customerEmail: schema.contacts.email,
      })
      .from(schema.carts)
      .leftJoin(schema.contacts, eq(schema.carts.contactId, schema.contacts.id))
      .where(eq(schema.carts.projectId, p.id))
      .orderBy(desc(schema.carts.createdAt));
    res.json({ carts: rows });
  });
  router.put("/carts", async (req, res) => {
    const p = await owned(req, req.body?.projectId);
    const [cart] = await db
      .update(schema.carts)
      .set({
        status: z
          .enum(["active", "abandoned", "converted"])
          .parse(req.body?.status),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.carts.id, id.parse(req.body?.id)),
          eq(schema.carts.projectId, p.id),
        ),
      )
      .returning();
    if (!cart) throw new HttpError(404, "Cart not found");
    res.json({ cart });
  });
  router.get("/returns", async (req, res) => {
    const p = await owned(req, req.query.projectId);
    const rows = await db
      .select({
        id: schema.orderReturns.id,
        status: schema.orderReturns.status,
        reason: schema.orderReturns.reason,
        total: schema.orderReturns.total,
        createdAt: schema.orderReturns.createdAt,
        orderId: schema.orders.id,
        currency: schema.orders.currency,
        customerName: schema.contacts.name,
      })
      .from(schema.orderReturns)
      .innerJoin(
        schema.orders,
        eq(schema.orderReturns.orderId, schema.orders.id),
      )
      .leftJoin(
        schema.contacts,
        eq(schema.orderReturns.contactId, schema.contacts.id),
      )
      .where(eq(schema.orderReturns.projectId, p.id))
      .orderBy(desc(schema.orderReturns.createdAt));
    res.json({ returns: rows });
  });
  router.put("/returns", async (req, res) => {
    const p = await owned(req, req.body?.projectId);
    const [item] = await db
      .update(schema.orderReturns)
      .set({
        status: z
          .enum([
            "requested",
            "approved",
            "received",
            "refunded",
            "rejected",
            "cancelled",
          ])
          .parse(req.body?.status),
        reason:
          req.body.reason === undefined ? undefined : String(req.body.reason),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.orderReturns.id, id.parse(req.body?.id)),
          eq(schema.orderReturns.projectId, p.id),
        ),
      )
      .returning();
    if (!item) throw new HttpError(404, "Return not found");
    res.json({ return: item });
  });
  return router;
}
