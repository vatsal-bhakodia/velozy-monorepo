import { Router } from "express";
import type { Request, Router as ExpressRouter } from "express";
import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { z } from "zod";
import { createDb, schema } from "@velozy/db";
import type { Environment } from "../../config/env.js";
import { HttpError } from "../../middleware/errors.js";
import { adminAccess } from "../../lib/admin-auth.js";

const uuid = z.string().uuid();
const timezone = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Choose a valid IANA timezone");
const isoDate = z.string().datetime({ offset: true });
const scheduleInput = z.object({
  projectId: uuid,
  kind: z.literal("blog"),
  blogId: uuid,
  scheduledAt: isoDate,
  timezone,
});

function parse<T extends z.ZodTypeAny>(
  validator: T,
  value: unknown,
): z.infer<T> {
  const result = validator.safeParse(value);
  if (!result.success)
    throw new HttpError(
      400,
      result.error.issues[0]?.message || "Invalid request",
      "validation_error",
    );
  return result.data as z.infer<T>;
}
function future(value: string | null | undefined, label = "Scheduled time") {
  if (!value) return;
  if (new Date(value).getTime() <= Date.now())
    throw new HttpError(
      400,
      `${label} must be in the future`,
      "invalid_schedule_time",
    );
}
function publicPlan(
  plan: typeof schema.contentPlans.$inferSelect,
  blog?: {
    title: string;
    slug: string;
    status: string;
    isPublished: boolean | null;
  } | null,
) {
  const {
    leaseToken: _leaseToken,
    lockExpiresAt: _lockExpiresAt,
    ...safe
  } = plan;
  return { ...safe, blog: blog ?? null };
}

export function adminContentPlannerRouter(
  environment: Environment,
): ExpressRouter {
  const { db, user, project } = adminAccess(environment.DATABASE_URL);
  const router = Router();
  const owned = async (request: Request, projectId: unknown, write = false) =>
    project(
      parse(uuid, projectId),
      (await user(request)).id,
      write ? "content:write" : "content:read",
    );

  router.get("/content-plans", async (request, response) => {
    const p = await owned(request, request.query.projectId);
    const kind =
      request.query.kind === undefined
        ? undefined
        : parse(z.literal("blog"), request.query.kind);
    const status =
      request.query.status === undefined
        ? undefined
        : parse(
            z.enum([
              "draft",
              "scheduled",
              "publishing",
              "published",
              "planned",
              "failed",
              "cancelled",
              "overdue",
            ]),
            request.query.status,
          );
    const from =
      request.query.from === undefined
        ? undefined
        : parse(isoDate, request.query.from);
    const to =
      request.query.to === undefined
        ? undefined
        : parse(isoDate, request.query.to);
    if (from && to && new Date(from) > new Date(to))
      throw new HttpError(
        400,
        "Start date must be before end date",
        "validation_error",
      );
    const where = and(
      eq(schema.contentPlans.projectId, p.id),
      eq(schema.contentPlans.kind, kind || "blog"),
      status === "overdue"
        ? and(
            eq(schema.contentPlans.status, "scheduled"),
            lte(schema.contentPlans.scheduledAt, new Date()),
          )
        : status
          ? eq(schema.contentPlans.status, status)
          : undefined,
      from ? gte(schema.contentPlans.scheduledAt, new Date(from)) : undefined,
      to ? lte(schema.contentPlans.scheduledAt, new Date(to)) : undefined,
    );
    const limit = Math.max(
      1,
      Math.min(100, Number(request.query.limit) || 100),
    );
    const offset = Math.max(
      0,
      Math.min(1_000_000, Math.floor(Number(request.query.offset) || 0)),
    );
    const plans = await db.query.contentPlans.findMany({
      where,
      orderBy: [
        asc(schema.contentPlans.scheduledAt),
        desc(schema.contentPlans.createdAt),
      ],
      limit,
      offset,
    });
    const blogIds = plans.flatMap((item) => (item.blogId ? [item.blogId] : []));
    const blogs = blogIds.length
      ? await db.query.blogs.findMany({
          where: and(
            eq(schema.blogs.projectId, p.id),
            inArray(schema.blogs.id, blogIds),
          ),
          columns: {
            id: true,
            title: true,
            slug: true,
            status: true,
            isPublished: true,
          },
        })
      : [];
    const blogMap = new Map(blogs.map((blog) => [blog.id, blog]));
    response.json({
      plans: plans.map((item) =>
        publicPlan(item, item.blogId ? blogMap.get(item.blogId) : null),
      ),
      hasMore: plans.length === limit,
      limit,
      offset,
    });
  });

  router.post("/content-plans", async (request, response) => {
    const input = parse(scheduleInput, request.body);
    const p = await owned(request, input.projectId, true);
    const currentUser = await user(request);
    if (input.kind === "blog") {
      future(input.scheduledAt);
      const blog = await db.query.blogs.findFirst({
        where: and(
          eq(schema.blogs.id, input.blogId),
          eq(schema.blogs.projectId, p.id),
        ),
      });
      if (!blog)
        throw new HttpError(
          404,
          "Blog draft not found in this project",
          "blog_not_found",
        );
      if (blog.status !== "draft" || blog.isPublished)
        throw new HttpError(
          409,
          "Only an unpublished draft can be scheduled",
          "blog_not_schedulable",
        );
      const previousPlan = await db.query.contentPlans.findFirst({
        where: and(
          eq(schema.contentPlans.projectId, p.id),
          eq(schema.contentPlans.blogId, blog.id),
        ),
      });
      if (previousPlan && previousPlan.status !== "cancelled")
        throw new HttpError(
          409,
          "This blog already has a planner record. Edit or retry that plan instead.",
          "blog_already_planned",
        );
      if (previousPlan) {
        const [plan] = await db
          .update(schema.contentPlans)
          .set({
            status: "scheduled",
            scheduledAt: new Date(input.scheduledAt),
            timezone: input.timezone,
            attempts: 0,
            nextAttemptAt: null,
            lockExpiresAt: null,
            leaseToken: null,
            failureKind: null,
            lastError: null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schema.contentPlans.id, previousPlan.id),
              eq(schema.contentPlans.projectId, p.id),
              eq(schema.contentPlans.status, "cancelled"),
            ),
          )
          .returning();
        if (!plan)
          throw new HttpError(
            409,
            "This plan changed. Refresh and try again.",
            "plan_changed",
          );
        return response.status(200).json({
          plan: publicPlan(plan, {
            title: blog.title,
            slug: blog.slug,
            status: blog.status,
            isPublished: blog.isPublished ?? false,
          }),
        });
      }
      const [plan] = await db
        .insert(schema.contentPlans)
        .values({
          projectId: p.id,
          kind: "blog",
          blogId: blog.id,
          status: "scheduled",
          scheduledAt: new Date(input.scheduledAt),
          timezone: input.timezone,
          createdBy: currentUser.id,
        })
        .returning();
      return response
        .status(201)
        .json({
          plan: publicPlan(plan, {
            title: blog.title,
            slug: blog.slug,
            status: blog.status,
            isPublished: blog.isPublished ?? false,
          }),
        });
    }
  });

  router.patch("/content-plans/:planId", async (request, response) => {
    const planId = parse(uuid, request.params.planId);
    const projectId = parse(uuid, request.body?.projectId);
    const p = await owned(request, projectId, true);
    const existing = await db.query.contentPlans.findFirst({
      where: and(
        eq(schema.contentPlans.id, planId),
        eq(schema.contentPlans.projectId, p.id),
      ),
    });
    if (!existing) throw new HttpError(404, "Content plan not found");
    if (existing.kind !== "blog") throw new HttpError(404, "Scheduled blog not found");
    if (existing.status === "publishing" || existing.status === "published")
      throw new HttpError(
        409,
        "This plan can no longer be edited",
        "plan_not_editable",
      );
    if (existing.kind === "blog") {
      const input = parse(
        z
          .object({
            projectId: uuid.optional(),
            scheduledAt: isoDate,
            timezone,
          })
          .strict(),
        request.body,
      );
      future(input.scheduledAt);
      const blog = await db.query.blogs.findFirst({
        where: and(
          eq(schema.blogs.id, existing.blogId!),
          eq(schema.blogs.projectId, p.id),
        ),
      });
      if (!blog)
        throw new HttpError(
          409,
          "The linked blog draft no longer exists",
          "blog_unavailable",
        );
      if (blog.status !== "draft" || blog.isPublished)
        throw new HttpError(
          409,
          "Only an unpublished draft can be scheduled",
          "blog_not_schedulable",
        );
      const [updated] = await db
        .update(schema.contentPlans)
        .set({
          scheduledAt: new Date(input.scheduledAt),
          timezone: input.timezone,
          status: "scheduled",
          attempts: 0,
          nextAttemptAt: null,
          failureKind: null,
          lastError: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.contentPlans.id, planId),
            eq(schema.contentPlans.projectId, p.id),
            inArray(schema.contentPlans.status, [
              "scheduled",
              "failed",
              "cancelled",
            ]),
          ),
        )
        .returning();
      if (!updated)
        throw new HttpError(
          409,
          "This plan changed while you were editing it. Refresh and try again.",
          "plan_changed",
        );
      return response.json({
        plan: publicPlan(updated, {
          title: blog.title,
          slug: blog.slug,
          status: blog.status,
          isPublished: blog.isPublished ?? false,
        }),
      });
    }
  });

  router.post("/content-plans/:planId/cancel", async (request, response) => {
    const planId = parse(uuid, request.params.planId);
    const p = await owned(request, request.body?.projectId, true);
    const existing = await db.query.contentPlans.findFirst({
      where: and(
        eq(schema.contentPlans.id, planId),
        eq(schema.contentPlans.projectId, p.id),
      ),
    });
    if (!existing) throw new HttpError(404, "Content plan not found");
    if (existing.kind !== "blog") throw new HttpError(404, "Scheduled blog not found");
    const [updated] = await db
      .update(schema.contentPlans)
      .set({
        status: "cancelled",
        lockExpiresAt: null,
        leaseToken: null,
        nextAttemptAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.contentPlans.id, planId),
          eq(schema.contentPlans.projectId, p.id),
          inArray(schema.contentPlans.status, [
            "draft",
            "planned",
            "scheduled",
            "failed",
          ]),
        ),
      )
      .returning();
    if (!updated)
      throw new HttpError(
        409,
        "This plan can no longer be cancelled",
        "plan_not_cancellable",
      );
    response.json({ plan: publicPlan(updated) });
  });

  router.post(
    "/content-plans/:planId/publish-now",
    async (request, response) => {
      const planId = parse(uuid, request.params.planId);
      const p = await owned(request, request.body?.projectId, true);
      const existing = await db.query.contentPlans.findFirst({
        where: and(
          eq(schema.contentPlans.id, planId),
          eq(schema.contentPlans.projectId, p.id),
        ),
      });
      if (!existing) throw new HttpError(404, "Content plan not found");
      if (existing.kind !== "blog")
        throw new HttpError(404, "Scheduled blog not found");
      if (!["scheduled", "failed"].includes(existing.status))
        throw new HttpError(
          409,
          "This blog cannot be published now",
          "plan_not_publishable",
        );
      const now = new Date();
      const [updated] = await db
        .update(schema.contentPlans)
        .set({
          status: "scheduled",
          scheduledAt: now,
          attempts: 0,
          nextAttemptAt: null,
          lockExpiresAt: null,
          leaseToken: null,
          failureKind: null,
          lastError: null,
          updatedAt: now,
        })
        .where(
          and(
            eq(schema.contentPlans.id, planId),
            inArray(schema.contentPlans.status, ["scheduled", "failed"]),
          ),
        )
        .returning();
      if (!updated)
        throw new HttpError(
          409,
          "This blog was claimed for publishing. Refresh and try again.",
          "plan_already_claimed",
        );
      response.json({ plan: publicPlan(updated) });
    },
  );

  router.post("/content-plans/:planId/retry", async (request, response) => {
    const planId = parse(uuid, request.params.planId);
    const p = await owned(request, request.body?.projectId, true);
    const existing = await db.query.contentPlans.findFirst({
      where: and(
        eq(schema.contentPlans.id, planId),
        eq(schema.contentPlans.projectId, p.id),
      ),
    });
    if (!existing) throw new HttpError(404, "Content plan not found");
    if (existing.kind !== "blog" || existing.status !== "failed")
      throw new HttpError(
        409,
        "Only failed blog plans can be retried",
        "plan_not_retryable",
      );
    const now = new Date();
    const [updated] = await db
      .update(schema.contentPlans)
      .set({
        status: "scheduled",
        scheduledAt: now,
        attempts: 0,
        nextAttemptAt: null,
        lockExpiresAt: null,
        leaseToken: null,
        failureKind: null,
        lastError: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.contentPlans.id, planId),
          eq(schema.contentPlans.status, "failed"),
        ),
      )
      .returning();
    if (!updated)
      throw new HttpError(
        409,
        "This plan changed. Refresh and try again.",
        "plan_changed",
      );
    response.json({ plan: publicPlan(updated) });
  });

  return router;
}
