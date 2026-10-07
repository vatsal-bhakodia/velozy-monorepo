import cors from "cors";
import express from "express";
import helmet from "helmet";
import IORedis from "ioredis";
import pino from "pino";
import pinoHttp from "pino-http";
import { createHash, randomUUID } from "node:crypto";
import type { Environment } from "./config/env.js";
import { errorHandler, notFound, requestId } from "./middleware/errors.js";
import { rateLimit } from "./middleware/rate-limit.js";
import { generationRouter } from "./routes/generation.js";
import { publicContentRouter } from "./routes/public-content.js";
import { adminProjectsRouter } from "./routes/admin/projects.js";
import { adminDomainsRouter } from "./routes/admin/domains.js";
import { requireSupabaseAuth } from "./middleware/auth.js";
import { adminPagesRouter } from "./routes/admin/pages.js";
import { adminAccountRouter } from "./routes/admin/account.js";
import { adminCategoriesRouter } from "./routes/admin/categories.js";
import { adminProductsRouter } from "./routes/admin/products.js";
import { adminBlogRouter } from "./routes/admin/blog.js";
import { adminSeoRouter } from "./routes/admin/seo.js";
import { adminBulkRouter } from "./routes/admin/bulk.js";
import { adminAIRouter } from "./routes/admin/ai.js";
import { adminCommerceRouter } from "./routes/admin/commerce.js";
import { adminNavigationRouter } from "./routes/admin/navigation.js";
import { adminOperationsRouter } from "./routes/admin/operations.js";
import { adminMediaRouter } from "./routes/admin/media.js";
import { adminCsvRouter } from "./routes/admin/csv.js";
import { adminMigrationRouter } from "./routes/admin/migration.js";
import { adminSeedRouter } from "./routes/admin/seed.js";
import { pageDataRouter } from "./routes/page-data.js";
import { publishRouter } from "./routes/publish.js";
import { adminIntegrationsRouter } from "./routes/admin/integrations.js";
import { providerWebhookRouter } from "./routes/provider-webhooks.js";
import { publicCommerceRouter } from "./routes/public-commerce.js";
import {
  adminEnquiriesRouter,
  publicEnquiryRouter,
} from "./routes/admin/enquiries.js";
import { adminContentPlannerRouter } from "./routes/admin/content-planner.js";
import { runContentPlannerWorker } from "./lib/content-planner-worker.js";
import {
  adminGrowthRouter,
  growthOAuthCallbackRouter,
} from "./routes/admin/growth.js";
import { growthPublicRouter } from "./routes/growth-public.js";
import {
  flushGrowthUsage,
  pruneGrowthData,
  verifyGrowthInternalRequest,
} from "./lib/growth.js";
import { createDb } from "@velozy/db";

const RedisClient = IORedis as unknown as new (
  url: string,
  options: Record<string, unknown>,
) => any;
const httpLogger = pinoHttp as unknown as (
  options: Record<string, unknown>,
) => express.RequestHandler;

function clientAddress(request: express.Request) {
  return request.ip || request.socket.remoteAddress || "unknown";
}

export function createApp(environment: Environment): {
  app: express.Express;
  redis: any;
} {
  const app = express();
  const logger = pino({
    level: environment.NODE_ENV === "production" ? "info" : "debug",
    redact: {
      paths: ["req.headers.authorization", "req.headers.cookie"],
      censor: "[Redacted]",
    },
  });
  const redis = new RedisClient(environment.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
  });
  const growthDb = createDb(environment.DATABASE_URL);
  const plannerDb = createDb(environment.DATABASE_URL);
  // Redis is the short-lived counter buffer; periodically persist monotonic
  // daily totals so billing data survives routine admin page visits.
  const usageFlush = setInterval(() => {
    void flushGrowthUsage(redis, growthDb).catch((error) => {
      logger.error({ err: error }, "Growth usage flush failed");
    });
  }, 60_000);
  usageFlush.unref?.();
  const retentionSweep = setInterval(() => {
    void pruneGrowthData(redis, growthDb).catch((error) => {
      logger.error({ err: error }, "Growth retention sweep failed");
    });
  }, 60 * 60_000);
  retentionSweep.unref?.();
  const contentPlannerWorker = setInterval(() => {
    void runContentPlannerWorker(plannerDb).catch((error) => {
      logger.error({ err: error }, "Content planner publishing worker failed");
    });
  }, 5_000);
  contentPlannerWorker.unref?.();
  void runContentPlannerWorker(plannerDb).catch((error) => {
    logger.error({ err: error }, "Content planner publishing worker failed");
  });
  const allowedOrigins = new Set(
    environment.CORS_ORIGINS.split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const platformHost = (process.env.PLATFORM_DOMAIN || "localhost:3002")
    .split(":")[0]
    .toLowerCase();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(requestId);
  app.use(
    httpLogger({
      logger,
      genReqId: (request: express.Request) =>
        request.header("x-request-id") || randomUUID(),
    }),
  );
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) return callback(null, true);
        try {
          const rawHostname = new URL(origin).hostname.toLowerCase();
          const hostname = rawHostname.startsWith("www.") ? rawHostname.slice(4) : rawHostname;
          const suffix = `.${platformHost}`;
          const subdomain = hostname.endsWith(suffix)
            ? hostname.slice(0, -suffix.length)
            : "";
          if (/^[a-z0-9-]+$/.test(subdomain)) return callback(null, true);
          void growthDb.query.siteDomains.findFirst({
            where: (domains, { and, eq }) => and(eq(domains.hostname, hostname), eq(domains.isVerified, true)),
          }).then((domain) => callback(null, !!domain)).catch(() => callback(null, false));
        } catch {
          callback(null, false);
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    }),
  );
  app.use(
    "/api/webhooks",
    express.raw({ type: "application/json", limit: "1mb" }),
  );
  app.use(express.json({ limit: "1mb" }));

  const publicLimit = rateLimit(redis, 120, 60, clientAddress);
  const trustedGrowthLimit = rateLimit(
    redis,
    12_000,
    60,
    (request) => `growth:${request.header("x-growth-site-host") || "unknown"}`,
  );
  const growthEventLimit = rateLimit(redis, 120, 60, (request) => {
    const visitorId = request.header("x-growth-visitor-id");
    return visitorId
      ? `growth-event:${createHash("sha256").update(visitorId).digest("hex")}`
      : `growth-event:${clientAddress(request)}`;
  });
  const formSubmissionLimit = rateLimit(redis, 10, 60, clientAddress);
  const aiLimit = rateLimit(redis, 30, 60 * 60, clientAddress);
  const adminRateKey = (request: express.Request) =>
    request.auth?.userId || clientAddress(request);
  const adminReadLimit = rateLimit(redis, 300, 60, adminRateKey);
  const adminWriteLimit = rateLimit(redis, 60, 60, adminRateKey);
  const adminLimit: express.RequestHandler = (request, response, next) =>
    (request.method === "GET" || request.method === "HEAD"
      ? adminReadLimit
      : adminWriteLimit)(request, response, next);
  app.get("/health", (_request, response) => response.json({ status: "ok" }));
  app.get("/ready", async (_request, response, next) => {
    try {
      await redis.ping();
      response.json({ status: "ready" });
    } catch (error) {
      next(error);
    }
  });
  app.use("/api", (request, response, next) => {
    const usesDedicatedLimit =
      /^\/admin(?:\/|$)/.test(request.path) ||
      /^\/pages\/data(?:\/|$)/.test(request.path) ||
      /^\/publish(?:\/|$)/.test(request.path) ||
      /^\/generate(?:\/|$)/.test(request.path);
    const usesTrustedGrowthLimit = /^\/public\/growth(?:\/|$)/.test(
      request.path,
    );
    if (usesTrustedGrowthLimit) return next();
    if (usesDedicatedLimit) return next();
    return publicLimit(request, response, next);
  });
  app.use("/api", generationRouter(requireSupabaseAuth(environment), aiLimit));
  app.use(
    "/api/pages/data",
    requireSupabaseAuth(environment),
    adminLimit,
    pageDataRouter(environment),
  );
  app.use(
    "/api/publish",
    requireSupabaseAuth(environment),
    adminLimit,
    publishRouter(environment),
  );
  app.use("/api/public/forms/submissions", formSubmissionLimit);
  app.use(
    "/api/public/growth",
    (request, response, next) => {
      let trusted = false;
      try {
        trusted = verifyGrowthInternalRequest(
          environment,
          request.header("x-growth-internal-secret"),
        );
      } catch {
        /* The public handler returns the configured service error. */
      }
      if (!trusted) return publicLimit(request, response, next);
      const growthPath = request.originalUrl.split("?", 1)[0];
      if (
        request.method === "POST" &&
        growthPath === "/api/public/growth/events"
      )
        return growthEventLimit(request, response, next);
      return trustedGrowthLimit(request, response, next);
    },
    growthPublicRouter(environment, redis),
  );
  app.use("/api", growthOAuthCallbackRouter(environment, redis));
  app.use("/api", publicContentRouter(environment));
  app.use("/api", publicCommerceRouter(environment));
  app.use("/api", publicEnquiryRouter(environment));
  app.use("/api/webhooks", providerWebhookRouter(environment));
  app.use(
    "/api/admin",
    requireSupabaseAuth(environment),
    adminLimit,
    adminDomainsRouter(environment),
  );
  app.use(
    "/api/admin",
    requireSupabaseAuth(environment),
    adminLimit,
    adminProjectsRouter(environment),
  );
  app.use(
    "/api/admin",
    requireSupabaseAuth(environment),
    adminLimit,
    adminPagesRouter(environment),
  );
  app.use(
    "/api/admin",
    requireSupabaseAuth(environment),
    adminLimit,
    adminAccountRouter(environment),
  );
  app.use(
    "/api/admin",
    requireSupabaseAuth(environment),
    adminLimit,
    adminCategoriesRouter(environment),
  );
  app.use(
    "/api/admin",
    requireSupabaseAuth(environment),
    adminLimit,
    adminProductsRouter(environment),
  );
  app.use(
    "/api/admin",
    requireSupabaseAuth(environment),
    adminLimit,
    adminBlogRouter(environment),
  );
  app.use(
    "/api/admin",
    requireSupabaseAuth(environment),
    adminLimit,
    adminSeoRouter(environment, redis),
  );
  app.use(
    "/api/admin",
    requireSupabaseAuth(environment),
    adminLimit,
    adminBulkRouter(environment),
  );
  app.use(
    "/api/admin",
    requireSupabaseAuth(environment),
    adminLimit,
    adminAIRouter(environment),
  );
  app.use(
    "/api/admin",
    requireSupabaseAuth(environment),
    adminLimit,
    adminCommerceRouter(environment),
  );
  app.use(
    "/api/admin",
    requireSupabaseAuth(environment),
    adminLimit,
    adminIntegrationsRouter(environment),
  );
  app.use(
    "/api/admin",
    requireSupabaseAuth(environment),
    adminLimit,
    adminNavigationRouter(environment),
  );
  app.use(
    "/api/admin",
    requireSupabaseAuth(environment),
    adminLimit,
    adminOperationsRouter(environment),
  );
  app.use(
    "/api/admin",
    requireSupabaseAuth(environment),
    adminLimit,
    adminEnquiriesRouter(environment),
  );
  app.use(
    "/api/admin",
    requireSupabaseAuth(environment),
    adminLimit,
    adminContentPlannerRouter(environment),
  );
  app.use(
    "/api/admin",
    requireSupabaseAuth(environment),
    adminLimit,
    adminMediaRouter(environment),
  );
  app.use(
    "/api/admin",
    requireSupabaseAuth(environment),
    adminLimit,
    adminCsvRouter(environment),
  );
  app.use(
    "/api/admin",
    requireSupabaseAuth(environment),
    adminLimit,
    adminMigrationRouter(environment),
  );
  app.use(
    "/api/admin",
    requireSupabaseAuth(environment),
    adminLimit,
    adminSeedRouter(environment),
  );
  app.use(
    "/api/admin",
    requireSupabaseAuth(environment),
    adminLimit,
    adminGrowthRouter(environment, redis),
  );
  app.use(notFound);
  app.use(errorHandler);
  return { app, redis };
}
