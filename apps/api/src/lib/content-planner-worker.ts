import {
  and,
  asc,
  eq,
  gte,
  inArray,
  isNotNull,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { schema } from "@velozy/db";

const MAX_ATTEMPTS = 5;
const LEASE_MS = 5 * 60_000;
const RETRY_DELAYS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000];

export async function runContentPlannerWorker(
  db: ReturnType<typeof import("@velozy/db").createDb>,
) {
  const now = new Date();
  const claimed = await db.transaction(async (tx) => {
    await tx
      .update(schema.contentPlans)
      .set({
        status: "failed",
        failureKind: "retryable",
        lastError:
          "The publishing worker stopped before completing this plan. Retry it manually.",
        nextAttemptAt: null,
        lockExpiresAt: null,
        leaseToken: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.contentPlans.status, "publishing"),
          lte(schema.contentPlans.lockExpiresAt, now),
          gte(schema.contentPlans.attempts, MAX_ATTEMPTS),
        ),
      );
    const due = await tx
      .select({ id: schema.contentPlans.id })
      .from(schema.contentPlans)
      .where(
        or(
          and(
            inArray(schema.contentPlans.status, ["scheduled", "failed"]),
            lt(schema.contentPlans.attempts, MAX_ATTEMPTS),
            lte(schema.contentPlans.nextAttemptAt, now),
          ),
          and(
            eq(schema.contentPlans.status, "scheduled"),
            isNotNull(schema.contentPlans.scheduledAt),
            lte(schema.contentPlans.scheduledAt, now),
          ),
          and(
            eq(schema.contentPlans.status, "publishing"),
            lt(schema.contentPlans.attempts, MAX_ATTEMPTS),
            lte(schema.contentPlans.lockExpiresAt, now),
          ),
        ),
      )
      .orderBy(asc(schema.contentPlans.scheduledAt))
      .limit(10)
      .for("update", { skipLocked: true });
    const leases: Array<{ id: string; leaseToken: string; attempt: number }> =
      [];
    for (const { id } of due) {
      const leaseToken = randomUUID();
      const [plan] = await tx
        .update(schema.contentPlans)
        .set({
          status: "publishing",
          attempts: sql`${schema.contentPlans.attempts} + 1`,
          lockExpiresAt: new Date(now.getTime() + LEASE_MS),
          leaseToken,
          updatedAt: now,
        })
        .where(eq(schema.contentPlans.id, id))
        .returning({
          id: schema.contentPlans.id,
          attempts: schema.contentPlans.attempts,
        });
      if (plan)
        leases.push({ id: plan.id, leaseToken, attempt: plan.attempts });
    }
    return leases;
  });

  for (const lease of claimed)
    await publishClaim(db, lease.id, lease.leaseToken, lease.attempt);
  return claimed.length;
}

async function publishClaim(
  db: ReturnType<typeof import("@velozy/db").createDb>,
  id: string,
  leaseToken: string,
  attempt: number,
) {
  try {
    await db.transaction(async (tx) => {
      const [plan] = await tx
        .select()
        .from(schema.contentPlans)
        .where(
          and(
            eq(schema.contentPlans.id, id),
            eq(schema.contentPlans.leaseToken, leaseToken),
            eq(schema.contentPlans.status, "publishing"),
          ),
        )
        .for("update");
      if (!plan) return;
      const now = new Date();
      if (plan.kind !== "blog" || !plan.blogId) {
        await tx
          .update(schema.contentPlans)
          .set({
            status: "failed",
            failureKind: "permanent",
            lastError: "This plan is missing its scheduled blog reference.",
            nextAttemptAt: null,
            lockExpiresAt: null,
            leaseToken: null,
            updatedAt: now,
          })
          .where(eq(schema.contentPlans.id, plan.id));
        return;
      }
      const [blog] = await tx
        .select()
        .from(schema.blogs)
        .where(
          and(
            eq(schema.blogs.id, plan.blogId),
            eq(schema.blogs.projectId, plan.projectId),
          ),
        )
        .for("update");
      if (!blog) {
        await tx
          .update(schema.contentPlans)
          .set({
            status: "cancelled",
            failureKind: null,
            lastError: "The scheduled blog was deleted.",
            nextAttemptAt: null,
            lockExpiresAt: null,
            leaseToken: null,
            updatedAt: now,
          })
          .where(eq(schema.contentPlans.id, plan.id));
        return;
      }
      if (blog.status === "published" || blog.isPublished) {
        const publishedAt = blog.publishedAt ?? now;
        await tx
          .update(schema.blogs)
          .set({
            status: "published",
            isPublished: true,
            publishedAt,
            updatedAt: now,
          })
          .where(
            and(
              eq(schema.blogs.id, blog.id),
              eq(schema.blogs.projectId, plan.projectId),
            ),
          );
        await tx
          .update(schema.contentPlans)
          .set({
            status: "published",
            publishedAt,
            failureKind: null,
            lastError: null,
            nextAttemptAt: null,
            lockExpiresAt: null,
            leaseToken: null,
            updatedAt: now,
          })
          .where(eq(schema.contentPlans.id, plan.id));
        return;
      }
      if (blog.status !== "draft") {
        await tx
          .update(schema.contentPlans)
          .set({
            status: "failed",
            failureKind: "permanent",
            lastError: `The blog is ${blog.status} and cannot be published. Change it to draft, then retry.`,
            nextAttemptAt: null,
            lockExpiresAt: null,
            leaseToken: null,
            updatedAt: now,
          })
          .where(eq(schema.contentPlans.id, plan.id));
        return;
      }
      await tx
        .update(schema.blogs)
        .set({
          status: "published",
          isPublished: true,
          publishedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(schema.blogs.id, blog.id),
            eq(schema.blogs.projectId, plan.projectId),
            eq(schema.blogs.status, "draft"),
          ),
        );
      await tx
        .update(schema.contentPlans)
        .set({
          status: "published",
          publishedAt: now,
          failureKind: null,
          lastError: null,
          nextAttemptAt: null,
          lockExpiresAt: null,
          leaseToken: null,
          updatedAt: now,
        })
        .where(eq(schema.contentPlans.id, plan.id));
    });
  } catch (error) {
    const now = new Date();
    const nextAttemptAt =
      attempt < MAX_ATTEMPTS
        ? new Date(
            now.getTime() +
              RETRY_DELAYS[Math.min(attempt - 1, RETRY_DELAYS.length - 1)],
          )
        : null;
    const message =
      error instanceof Error
        ? error.message.slice(0, 2000)
        : "Unexpected publishing failure";
    await db
      .update(schema.contentPlans)
      .set({
        status: "failed",
        failureKind: "retryable",
        lastError: message,
        nextAttemptAt,
        lockExpiresAt: null,
        leaseToken: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.contentPlans.id, id),
          eq(schema.contentPlans.leaseToken, leaseToken),
          eq(schema.contentPlans.status, "publishing"),
        ),
      );
  }
}
