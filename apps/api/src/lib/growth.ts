import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { timingSafeEqual } from "node:crypto";
import { createDb, schema } from "@velozy/db";
import type { Environment } from "../config/env.js";
import { HttpError } from "../middleware/errors.js";

export function normalizeGrowthHostname(value: string) {
  const hostname = value.toLowerCase().split(":")[0].replace(/\.$/, "");
  return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
}

export async function resolveGrowthProject(
  db: ReturnType<typeof createDb>,
  host: unknown,
) {
  if (typeof host !== "string" || host.length > 255) return undefined;
  const hostname = normalizeGrowthHostname(host);
  if (!hostname || /[^a-z0-9.-]/.test(hostname)) return undefined;
  const domain = await db.query.siteDomains.findFirst({
    where: and(
      eq(schema.siteDomains.hostname, hostname),
      eq(schema.siteDomains.isVerified, true),
    ),
    with: { project: true },
  });
  if (!domain?.project?.isPublished) return undefined;
  return domain.project;
}

function secret(environment: Environment) {
  if (
    !environment.GROWTH_INTERNAL_SECRET ||
    environment.GROWTH_INTERNAL_SECRET.length < 32
  ) {
    throw new HttpError(
      503,
      "Growth collection is not configured",
      "growth_unavailable",
    );
  }
  return environment.GROWTH_INTERNAL_SECRET;
}

export function verifyGrowthInternalRequest(
  environment: Environment,
  supplied: string | undefined,
) {
  const expected = Buffer.from(secret(environment));
  const actual = Buffer.from(supplied || "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function flushGrowthUsage(
  redis: any,
  db: ReturnType<typeof createDb>,
) {
  const days: string[] = await redis.smembers("growth:pageviews:days");
  for (const day of days) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    const key = `growth:pageviews:${day}`;
    const values: string[] = await redis
      .hgetall(key)
      .then((value: Record<string, string>) => value);
    const periodStart = new Date(`${day}T00:00:00.000Z`);
    for (const [projectId, count] of Object.entries(values)) {
      if (
        !/^\d+$/.test(count) ||
        !/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(projectId)
      )
        continue;
      await db
        .insert(schema.projectPageviewUsageDaily)
        .values({
          projectId,
          periodStart,
          pageViews: count,
        })
        .onConflictDoUpdate({
          target: [
            schema.projectPageviewUsageDaily.projectId,
            schema.projectPageviewUsageDaily.periodStart,
          ],
          set: {
            pageViews: sql`GREATEST(${schema.projectPageviewUsageDaily.pageViews}, EXCLUDED.page_views)`,
            updatedAt: new Date(),
          },
        });
    }
    if (day < growthUtcDay()) await redis.srem("growth:pageviews:days", day);
  }
}

export async function pruneGrowthData(
  redis: any,
  db: ReturnType<typeof createDb>,
) {
  const day = growthUtcDay();
  const acquired = await redis.set(
    `growth:retention:${day}`,
    "1",
    "EX",
    21_600,
    "NX",
  );
  if (!acquired) return;
  const eventCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const usageCutoff = new Date();
  const utcDay = usageCutoff.getUTCDate();
  usageCutoff.setUTCDate(1);
  usageCutoff.setUTCMonth(usageCutoff.getUTCMonth() - 25);
  const finalDay = new Date(
    Date.UTC(usageCutoff.getUTCFullYear(), usageCutoff.getUTCMonth() + 1, 0),
  ).getUTCDate();
  usageCutoff.setUTCDate(Math.min(utcDay, finalDay));
  for (let batchNumber = 0; batchNumber < 20; batchNumber += 1) {
    const batch = await db
      .select({ id: schema.analyticsEvents.id })
      .from(schema.analyticsEvents)
      .where(lt(schema.analyticsEvents.occurredAt, eventCutoff))
      .limit(10_000);
    if (!batch.length) break;
    await db.delete(schema.analyticsEvents).where(
      inArray(
        schema.analyticsEvents.id,
        batch.map((row) => row.id),
      ),
    );
    if (batch.length < 10_000) break;
  }
  for (let batchNumber = 0; batchNumber < 20; batchNumber += 1) {
    const batch = await db
      .select({ id: schema.projectPageviewUsageDaily.id })
      .from(schema.projectPageviewUsageDaily)
      .where(lt(schema.projectPageviewUsageDaily.periodStart, usageCutoff))
      .limit(10_000);
    if (!batch.length) break;
    await db.delete(schema.projectPageviewUsageDaily).where(
      inArray(
        schema.projectPageviewUsageDaily.id,
        batch.map((row) => row.id),
      ),
    );
    if (batch.length < 10_000) break;
  }
}

export function growthUtcDay(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
