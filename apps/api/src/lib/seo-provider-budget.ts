import { and, eq, gte, inArray, lt, or, sql } from "drizzle-orm";
import { createDb, schema } from "@velozy/db";
import { HttpError } from "../middleware/errors.js";

type Database = ReturnType<typeof createDb>;

export async function reserveSeoProviderBudget(db: Database, projectId: string, operation: string, reserveUsd: number) {
  return db.transaction(async (tx) => {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const activeReservationAfter = new Date(now.getTime() - 5 * 60_000);
    await tx.execute(sql`select pg_advisory_xact_lock(713021)`);
    const expiredTasks = await tx.update(schema.seoProviderTasks)
      .set({ status: "expired", updatedAt: now })
      .where(and(inArray(schema.seoProviderTasks.status, ["submitting", "queued"]), lt(schema.seoProviderTasks.expiresAt, now)))
      .returning({ usageId: schema.seoProviderTasks.usageId });
    const expiredUsageIds = expiredTasks.map((task) => task.usageId).filter((id): id is string => !!id);
    if (expiredUsageIds.length) await tx.update(schema.seoProviderUsage)
      .set({ status: "settled" })
      .where(and(inArray(schema.seoProviderUsage.id, expiredUsageIds), eq(schema.seoProviderUsage.status, "pending")));
    const activeRows = or(
      eq(schema.seoProviderUsage.status, "settled"),
      and(eq(schema.seoProviderUsage.status, "reserved"), gte(schema.seoProviderUsage.createdAt, activeReservationAfter)),
      eq(schema.seoProviderUsage.status, "pending"),
    );
    const [platformTotal] = await tx.select({ total: sql<string>`coalesce(sum(${schema.seoProviderUsage.amountUsd}), 0)` })
      .from(schema.seoProviderUsage).where(and(gte(schema.seoProviderUsage.createdAt, monthStart), activeRows));
    const [projectTotal] = await tx.select({ total: sql<string>`coalesce(sum(${schema.seoProviderUsage.amountUsd}), 0)` })
      .from(schema.seoProviderUsage).where(and(eq(schema.seoProviderUsage.projectId, projectId), gte(schema.seoProviderUsage.createdAt, monthStart), activeRows));
    if (Number(platformTotal?.total ?? 0) + reserveUsd > 10.000001)
      throw new HttpError(429, "SEO data provider monthly platform budget is exhausted", "seo_platform_budget_exhausted");
    if (Number(projectTotal?.total ?? 0) + reserveUsd > 1.000001)
      throw new HttpError(429, "SEO data provider monthly project budget is exhausted", "seo_project_budget_exhausted");
    const [reservation] = await tx.insert(schema.seoProviderUsage).values({
      projectId, provider: "dataforseo", operation, amountUsd: reserveUsd.toFixed(6), status: "reserved",
    }).returning();
    return reservation;
  });
}

export async function settleSeoProviderBudget(db: Database, id: string, actualCost: number | null) {
  await db.update(schema.seoProviderUsage).set({
    amountUsd: (actualCost ?? 0).toFixed(6),
    status: actualCost === null ? "released" : "settled",
  }).where(eq(schema.seoProviderUsage.id, id));
}
