import { Router } from "express";
import type { Request, Router as ExpressRouter } from "express";
import { and, eq, isNull } from "drizzle-orm";
import { createHash } from "node:crypto";
import { createDb, schema } from "@velozy/db";
import {
  experimentAssignmentSchema,
  publicGrowthEventsSchema,
} from "@velozy/contracts";
import type { Environment } from "../config/env.js";
import { HttpError } from "../middleware/errors.js";
import {
  growthUtcDay,
  resolveGrowthProject,
  verifyGrowthInternalRequest,
} from "../lib/growth.js";

function trustedRequest(environment: Environment, request: Request) {
  if (
    !verifyGrowthInternalRequest(
      environment,
      request.header("x-growth-internal-secret"),
    )
  ) {
    throw new HttpError(
      403,
      "Growth collection request is not authorized",
      "invalid_internal_request",
    );
  }
}

function safePath(value: string) {
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.length > 1000 ||
    /[?#]/.test(value)
  )
    return undefined;
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return undefined;
  }
  if (decoded.startsWith("//") || !safeProperty(decoded)) return undefined;
  return value;
}

function safeProperty(value: string | number | boolean | null) {
  if (typeof value === "number") return Math.abs(value) < 10_000_000;
  if (typeof value !== "string") return true;
  return (
    value.length <= 200 &&
    !/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(value) &&
    !/\+?\d[\d ().-]{8,}\d/.test(value)
  );
}

function visitorKeyHash(request: Request, projectId: string) {
  const visitorId = request.header("x-growth-visitor-id");
  if (
    !visitorId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      visitorId,
    )
  ) {
    throw new HttpError(
      400,
      "A valid visitor identifier is required",
      "validation_error",
    );
  }
  return createHash("sha256")
    .update(`${projectId}:${visitorId}`)
    .digest("hex");
}

export function growthPublicRouter(
  environment: Environment,
  redis: any,
): ExpressRouter {
  const db = createDb(environment.DATABASE_URL);
  const router = Router();

  router.get("/settings", async (request, response) => {
    trustedRequest(environment, request);
    const project = await resolveGrowthProject(
      db,
      request.header("x-growth-site-host"),
    );
    if (!project) throw new HttpError(404, "Published site was not found");
    response.setHeader("Cache-Control", "private, no-store");
    response.json({ enabled: true });
  });

  router.post("/events", async (request, response) => {
    trustedRequest(environment, request);
    const project = await resolveGrowthProject(
      db,
      request.header("x-growth-site-host"),
    );
    if (!project) throw new HttpError(404, "Published site was not found");
    const parsed = publicGrowthEventsSchema.safeParse(request.body);
    if (!parsed.success)
      throw new HttpError(
        400,
        parsed.error.issues[0]?.message || "Invalid analytics event",
        "validation_error",
      );
    const rows = parsed.data.events.map((event) => {
      const pagePath = safePath(event.path);
      if (!pagePath)
        throw new HttpError(
          400,
          "Event paths must be local paths without query strings or personal data",
          "validation_error",
        );
      if (
        Object.values(event.properties).some((value) => !safeProperty(value))
      ) {
        throw new HttpError(
          400,
          "Analytics properties cannot contain contact details",
          "validation_error",
        );
      }
      const occurredAt = event.occurredAt
        ? new Date(event.occurredAt)
        : new Date();
      if (
        occurredAt.getTime() > Date.now() + 5 * 60_000 ||
        occurredAt.getTime() < Date.now() - 24 * 60 * 60_000
      ) {
        throw new HttpError(
          400,
          "Event timestamp is outside the accepted time window",
          "validation_error",
        );
      }
      return {
        projectId: project.id,
        clientEventId: event.id,
        eventName: event.name,
        pagePath,
        occurredAt,
        properties: event.properties,
      };
    });
    const visitorHash = visitorKeyHash(request, project.id);
    const inserted = await db.transaction(async (tx) => {
      for (const row of rows) {
        const properties = row.properties as Record<string, unknown>;
        const experimentId = properties.growth_experiment_id;
        const variantId = properties.growth_variant_id;
        if (experimentId === undefined && variantId === undefined) continue;
        if (
          typeof experimentId !== "string" ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            experimentId,
          ) ||
          typeof variantId !== "string" ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            variantId,
          )
        ) {
          throw new HttpError(
            400,
            "Experiment event attribution is invalid",
            "validation_error",
          );
        }
        const assignment = await tx.query.growthExperimentAssignments.findFirst(
          {
            where: and(
              eq(schema.growthExperimentAssignments.experimentId, experimentId),
              eq(schema.growthExperimentAssignments.variantId, variantId),
              eq(
                schema.growthExperimentAssignments.visitorKeyHash,
                visitorHash,
              ),
            ),
          },
        );
        const experiment = await tx.query.growthExperiments.findFirst({
          where: and(
            eq(schema.growthExperiments.id, experimentId),
            eq(schema.growthExperiments.projectId, project.id),
          ),
        });
        if (
          !assignment ||
          !experiment ||
          !experiment.startedAt ||
          row.occurredAt < experiment.startedAt ||
          (experiment.endedAt && row.occurredAt > experiment.endedAt)
        ) {
          throw new HttpError(
            400,
            "Experiment event attribution is invalid",
            "validation_error",
          );
        }
      }
      return tx
        .insert(schema.analyticsEvents)
        .values(
          rows.map((row) => ({ ...row, sessionKey: visitorHash })),
        )
        .onConflictDoNothing({
          target: [
            schema.analyticsEvents.projectId,
            schema.analyticsEvents.clientEventId,
          ],
        })
        .returning({ id: schema.analyticsEvents.id });
    });
    response.setHeader("Cache-Control", "no-store");
    response.status(202).json({
      accepted: inserted.length,
      duplicate: rows.length - inserted.length,
    });
  });

  router.post("/experiments/assignment", async (request, response) => {
    trustedRequest(environment, request);
    const project = await resolveGrowthProject(
      db,
      request.header("x-growth-site-host"),
    );
    if (!project) throw new HttpError(404, "Published site was not found");
    const input = experimentAssignmentSchema.safeParse(request.body);
    if (!input.success)
      throw new HttpError(
        400,
        input.error.issues[0]?.message ||
          "A valid storefront surface is required",
        "validation_error",
      );
    const { targetType, targetId } = input.data;
    const visitorHash = visitorKeyHash(request, project.id);
    if (
      targetType === "page" &&
      !(await db.query.pages.findFirst({
        where: and(
          eq(schema.pages.id, targetId!),
          eq(schema.pages.projectId, project.id),
          eq(schema.pages.status, "published"),
        ),
      }))
    ) {
      throw new HttpError(404, "Published page was not found");
    }
    if (
      targetType === "product" &&
      !(await db.query.products.findFirst({
        where: and(
          eq(schema.products.id, targetId!),
          eq(schema.products.projectId, project.id),
          eq(schema.products.status, "published"),
          eq(schema.products.isActive, true),
        ),
      }))
    ) {
      throw new HttpError(404, "Published product was not found");
    }
    const assignments = await db.transaction(async (tx) => {
      const experiments = await tx.query.growthExperiments.findMany({
        where: and(
          eq(schema.growthExperiments.projectId, project.id),
          eq(schema.growthExperiments.status, "running"),
          eq(schema.growthExperiments.targetType, targetType),
          targetId
            ? eq(schema.growthExperiments.targetId, targetId)
            : isNull(schema.growthExperiments.targetId),
        ),
      });
      const result = [];
      for (const experiment of experiments) {
        const existing = await tx.query.growthExperimentAssignments.findFirst({
          where: and(
            eq(schema.growthExperimentAssignments.experimentId, experiment.id),
            eq(
              schema.growthExperimentAssignments.visitorKeyHash,
              visitorHash,
            ),
          ),
        });
        if (existing) {
          const variant = await tx.query.growthExperimentVariants.findFirst({
            where: eq(schema.growthExperimentVariants.id, existing.variantId),
          });
          if (variant)
            result.push({
              experimentId: experiment.id,
              variantId: existing.variantId,
              variantKey: variant.key,
              experience: variant.experience,
            });
          continue;
        }
        const variants = await tx.query.growthExperimentVariants.findMany({
          where: eq(
            schema.growthExperimentVariants.experimentId,
            experiment.id,
          ),
          orderBy: schema.growthExperimentVariants.createdAt,
        });
        const bucket =
          createHash("sha256")
            .update(`${experiment.id}:${visitorHash}`)
            .digest()
            .readUInt32BE(0) % 100;
        let boundary = 0;
        const selected = variants.find((variant) => {
          boundary += variant.allocation;
          return bucket < boundary;
        });
        if (!selected) continue;
        await tx
          .insert(schema.growthExperimentAssignments)
          .values({
            experimentId: experiment.id,
            variantId: selected.id,
            visitorKeyHash: visitorHash,
          })
          .onConflictDoNothing();
        const persisted = await tx.query.growthExperimentAssignments.findFirst({
          where: and(
            eq(schema.growthExperimentAssignments.experimentId, experiment.id),
            eq(
              schema.growthExperimentAssignments.visitorKeyHash,
              visitorHash,
            ),
          ),
        });
        if (persisted) {
          const variant = await tx.query.growthExperimentVariants.findFirst({
            where: eq(schema.growthExperimentVariants.id, persisted.variantId),
          });
          if (variant)
            result.push({
              experimentId: experiment.id,
              variantId: persisted.variantId,
              variantKey: variant.key,
              experience: variant.experience,
            });
        }
      }
      return result;
    });
    response.setHeader("Cache-Control", "private, no-store");
    response.json({ assignments });
  });

  router.post("/pageviews", async (request, response) => {
    trustedRequest(environment, request);
    const host = request.header("x-growth-site-host");
    const project = await resolveGrowthProject(db, host);
    if (!project) throw new HttpError(404, "Published site was not found");
    const requestId = request.header("x-growth-request-id");
    if (!requestId || !/^[0-9a-f-]{36}$/i.test(requestId)) {
      throw new HttpError(400, "A request ID is required", "validation_error");
    }
    const path = safePath(String(request.body?.path || ""));
    if (
      !path ||
      /\.(?:css|js|map|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|xml|txt)$/i.test(
        path,
      )
    ) {
      throw new HttpError(
        400,
        "Only published HTML page views can be metered",
        "validation_error",
      );
    }
    const userAgent = String(request.header("user-agent") || "").slice(0, 500);
    if (
      /bot|crawler|spider|slurp|headless|lighthouse|pagespeed|preview/i.test(
        userAgent,
      )
    ) {
      return response
        .status(202)
        .json({ metered: false, reason: "automated_request" });
    }
    const now = new Date();
    const day = growthUtcDay(now);
    const dedupeKey = `growth:pageview:request:${requestId}`;
    const counted = await redis.eval(
      "if redis.call('SET', KEYS[1], '1', 'EX', 86400, 'NX') then redis.call('HINCRBY', KEYS[2], ARGV[1], 1); redis.call('SADD', KEYS[3], ARGV[2]); redis.call('EXPIRE', KEYS[2], 69120000); return 1 else return 0 end",
      3,
      dedupeKey,
      `growth:pageviews:${day}`,
      "growth:pageviews:days",
      project.id,
      day,
    );
    response.setHeader("Cache-Control", "no-store");
    response.status(202).json({ metered: counted === 1, day });
  });

  return router;
}
