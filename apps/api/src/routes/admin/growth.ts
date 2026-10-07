import { Router } from "express";
import type { Request, Router as ExpressRouter } from "express";
import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  inArray,
  lte,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import { createDb, schema } from "@velozy/db";
import {
  analyticsQuerySchema,
  experimentInputSchema,
  experimentTransitionSchema,
  growthProviderSchema,
} from "@velozy/contracts";
import type { Environment } from "../../config/env.js";
import { adminAccess } from "../../lib/admin-auth.js";
import {
  encryptCredentials,
  decryptCredentials,
} from "../../lib/integration-secrets.js";
import { generateAIText } from "../../lib/process-prompt.js";
import { HttpError } from "../../middleware/errors.js";
import { flushGrowthUsage } from "../../lib/growth.js";

const uuid = z.string().uuid();
const providerScope = {
  google_analytics: "https://www.googleapis.com/auth/analytics.readonly",
  search_console: "https://www.googleapis.com/auth/webmasters.readonly",
} as const;
const dateFilterSchema = z
  .object({
    from: z.string().date().optional(),
    to: z.string().date().optional(),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    path: ["to"],
    message: "End date must be on or after start date",
  });

function parse<T>(validator: z.ZodType<T>, input: unknown): T {
  const result = validator.safeParse(input);
  if (!result.success)
    throw new HttpError(
      400,
      result.error.issues[0]?.message || "Invalid request",
      "validation_error",
    );
  return result.data;
}

function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function defaultRange() {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 29);
  return { from: isoDay(from), to: isoDay(to) };
}

function sampleSizePerVariant(baseline: number, relativeEffect: number) {
  const variant = Math.min(baseline * (1 + relativeEffect), 0.9999);
  if (variant <= baseline)
    throw new HttpError(
      400,
      "The detectable effect is too small for this baseline",
    );
  const average = (baseline + variant) / 2;
  const numerator =
    1.96 * Math.sqrt(2 * average * (1 - average)) +
    0.84 * Math.sqrt(baseline * (1 - baseline) + variant * (1 - variant));
  return Math.min(
    10_000_000,
    Math.ceil((numerator * numerator) / (variant - baseline) ** 2),
  );
}

export async function googleToken(
  environment: Environment,
  db: ReturnType<typeof createDb>,
  projectId: string,
  provider: "google_analytics" | "search_console",
) {
  if (
    !environment.INTEGRATION_ENCRYPTION_KEY ||
    !/^[\da-f]{64}$/i.test(environment.INTEGRATION_ENCRYPTION_KEY)
  ) {
    throw new HttpError(
      503,
      "Configure a 32-byte integration encryption key before connecting Google",
      "integration_encryption_unavailable",
    );
  }
  const connection = await db.query.growthConnections.findFirst({
    where: and(
      eq(schema.growthConnections.projectId, projectId),
      eq(schema.growthConnections.provider, provider),
    ),
  });
  if (!connection || connection.status !== "connected")
    throw new HttpError(
      409,
      "Connect this Google source first",
      "growth_source_not_connected",
    );
  const credentials = decryptCredentials(
    environment.INTEGRATION_ENCRYPTION_KEY,
    connection.encryptedCredentials,
  );
  const expiresAt = Number(credentials.expiresAt || 0);
  if (expiresAt > Date.now() + 60_000 && credentials.accessToken)
    return { connection, accessToken: credentials.accessToken };
  if (
    !credentials.refreshToken ||
    !environment.GOOGLE_OAUTH_CLIENT_ID ||
    !environment.GOOGLE_OAUTH_CLIENT_SECRET
  ) {
    throw new HttpError(
      409,
      "Reconnect this Google source to refresh access",
      "growth_reconnect_required",
    );
  }
  const form = new URLSearchParams({
    client_id: environment.GOOGLE_OAUTH_CLIENT_ID,
    client_secret: environment.GOOGLE_OAUTH_CLIENT_SECRET,
    refresh_token: credentials.refreshToken,
    grant_type: "refresh_token",
  });
  const refreshed = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
    signal: AbortSignal.timeout(12_000),
  });
  const data = (await refreshed.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!refreshed.ok || !data.access_token) {
    await db
      .update(schema.growthConnections)
      .set({
        status: "reconnect_required",
        lastError: "Google authorization expired",
        updatedAt: new Date(),
      })
      .where(eq(schema.growthConnections.id, connection.id));
    throw new HttpError(
      409,
      "Reconnect this Google source",
      "growth_reconnect_required",
    );
  }
  const updated = {
    ...credentials,
    accessToken: data.access_token,
    expiresAt: String(Date.now() + (data.expires_in ?? 3600) * 1000),
  };
  await db
    .update(schema.growthConnections)
    .set({
      encryptedCredentials: encryptCredentials(
        environment.INTEGRATION_ENCRYPTION_KEY,
        updated,
      ),
      updatedAt: new Date(),
    })
    .where(eq(schema.growthConnections.id, connection.id));
  return { connection, accessToken: data.access_token };
}

export async function googleJson<T>(
  url: string,
  accessToken: string,
  init: RequestInit = {},
) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await response.json().catch(() => ({}))) as T & {
    error?: { message?: string };
  };
  if (!response.ok)
    throw new HttpError(
      response.status === 403 ? 403 : 502,
      body.error?.message || "Google could not return this report",
      "google_api_failed",
    );
  return body;
}

export function growthOAuthCallbackRouter(
  environment: Environment,
  redis: any,
): ExpressRouter {
  const db = createDb(environment.DATABASE_URL);
  const router = Router();
  router.get("/growth/google/callback", async (request, response) => {
    const state = z.string().min(20).max(200).safeParse(request.query.state);
    const code = z.string().min(1).max(4096).safeParse(request.query.code);
    if (!state.success || !code.success)
      return response.redirect(
        `${environment.ADMIN_URL || "http://localhost:5173"}/growth?view=connections&error=invalid_oauth_response`,
      );
    const cached = await redis.getdel(`growth:oauth:${state.data}`);
    if (!cached)
      return response.redirect(
        `${environment.ADMIN_URL || "http://localhost:5173"}/growth?view=connections&error=oauth_state_expired`,
      );
    const flow = JSON.parse(cached) as {
      projectId: string;
      userId: string;
      provider: "google_analytics" | "search_console";
    };
    try {
      const auth = adminAccess(environment.DATABASE_URL);
      await auth.project(flow.projectId, flow.userId, "growth:write");
      if (
        !environment.GOOGLE_OAUTH_CLIENT_ID ||
        !environment.GOOGLE_OAUTH_CLIENT_SECRET ||
        !environment.GOOGLE_OAUTH_REDIRECT_URI
      )
        throw new Error("Google OAuth is not configured");
      if (request.query.error)
        throw new Error("Google authorization was not completed");
      const tokensResponse = await fetch(
        "https://oauth2.googleapis.com/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code: code.data,
            client_id: environment.GOOGLE_OAUTH_CLIENT_ID,
            client_secret: environment.GOOGLE_OAUTH_CLIENT_SECRET,
            redirect_uri: environment.GOOGLE_OAUTH_REDIRECT_URI,
            grant_type: "authorization_code",
          }),
          signal: AbortSignal.timeout(12_000),
        },
      );
      const tokens = (await tokensResponse.json()) as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
      };
      if (!tokensResponse.ok || !tokens.access_token)
        throw new Error("Google token exchange failed");
      const previous = await db.query.growthConnections.findFirst({
        where: and(
          eq(schema.growthConnections.projectId, flow.projectId),
          eq(schema.growthConnections.provider, flow.provider),
        ),
      });
      const previousCredentials = previous
        ? decryptCredentials(
            environment.INTEGRATION_ENCRYPTION_KEY,
            previous.encryptedCredentials,
          )
        : {};
      const credentials = {
        accessToken: tokens.access_token,
        refreshToken:
          tokens.refresh_token || previousCredentials.refreshToken || "",
        expiresAt: String(Date.now() + (tokens.expires_in ?? 3600) * 1000),
      };
      if (!credentials.refreshToken)
        throw new Error(
          "Google did not grant offline access; reconnect and approve persistent access",
        );
      const encryptedCredentials = encryptCredentials(
        environment.INTEGRATION_ENCRYPTION_KEY,
        credentials,
      );
      await db
        .insert(schema.growthConnections)
        .values({
          projectId: flow.projectId,
          provider: flow.provider,
          status: "connected",
          encryptedCredentials,
        })
        .onConflictDoUpdate({
          target: [
            schema.growthConnections.projectId,
            schema.growthConnections.provider,
          ],
          set: {
            status: "connected",
            encryptedCredentials,
            lastError: null,
            updatedAt: new Date(),
          },
        });
      return response.redirect(
        `${environment.ADMIN_URL || "http://localhost:5173"}/growth?view=connections&connected=${flow.provider}`,
      );
    } catch (error) {
      console.error("Growth Google OAuth callback failed", error);
      return response.redirect(
        `${environment.ADMIN_URL || "http://localhost:5173"}/growth?view=connections&error=google_connection_failed`,
      );
    }
  });
  return router;
}

export function adminGrowthRouter(
  environment: Environment,
  redis: any,
): ExpressRouter {
  const { db, user, project } = adminAccess(environment.DATABASE_URL);
  const router = Router();
  const access = async (request: Request, projectId: unknown, write = false) =>
    project(
      uuid.parse(projectId),
      (await user(request)).id,
      write ? "growth:write" : "growth:read",
    );

  router.get("/growth/overview", async (request, response) => {
    const site = await access(request, request.query.projectId);
    const range = defaultRange();
    const start = new Date(`${range.from}T00:00:00.000Z`);
    const end = new Date(`${range.to}T23:59:59.999Z`);
    const [eventSummary, usage, experiments, recommendations] =
      await Promise.all([
        db
          .select({
            pageViews: count(),
            visitors: countDistinct(schema.analyticsEvents.sessionKey),
          })
          .from(schema.analyticsEvents)
          .where(
            and(
              eq(schema.analyticsEvents.projectId, site.id),
              eq(schema.analyticsEvents.eventName, "page_view"),
              gte(schema.analyticsEvents.occurredAt, start),
              lte(schema.analyticsEvents.occurredAt, end),
            ),
          ),
        db
          .select({
            pageViews: sql<string>`COALESCE(SUM(${schema.projectPageviewUsageDaily.pageViews}), 0)`,
          })
          .from(schema.projectPageviewUsageDaily)
          .where(
            and(
              eq(schema.projectPageviewUsageDaily.projectId, site.id),
              gte(
                schema.projectPageviewUsageDaily.periodStart,
                new Date(`${isoDay(new Date())}T00:00:00Z`),
              ),
            ),
          ),
        db
          .select({ count: count() })
          .from(schema.growthExperiments)
          .where(
            and(
              eq(schema.growthExperiments.projectId, site.id),
              eq(schema.growthExperiments.status, "running"),
            ),
          ),
        db
          .select({ count: count() })
          .from(schema.recommendations)
          .where(
            and(
              eq(schema.recommendations.projectId, site.id),
              eq(schema.recommendations.status, "pending"),
            ),
          ),
      ]);
    response.json({
      range,
      firstParty: {
        pageViews: Number(eventSummary[0]?.pageViews ?? 0),
        visitors: Number(eventSummary[0]?.visitors ?? 0),
      },
      billablePageViews: String(usage[0]?.pageViews ?? "0"),
      activeExperiments: Number(experiments[0]?.count ?? 0),
      pendingRecommendations: Number(recommendations[0]?.count ?? 0),
    });
  });

  router.get("/growth/analytics", async (request, response) => {
    const query = parse(analyticsQuerySchema, request.query);
    const site = await access(request, query.projectId);
    const source = query.source ?? "first_party";
    const start = new Date(`${query.from}T00:00:00.000Z`);
    const end = new Date(`${query.to}T23:59:59.999Z`);
    if (source === "first_party") {
      const filters = [
        eq(schema.analyticsEvents.projectId, site.id),
        gte(schema.analyticsEvents.occurredAt, start),
        lte(schema.analyticsEvents.occurredAt, end),
      ];
      if (query.pagePath)
        filters.push(eq(schema.analyticsEvents.pagePath, query.pagePath));
      const [summary] = await db
        .select({
          events: count(),
          visitors: countDistinct(schema.analyticsEvents.sessionKey),
          pageViews: sql<number>`COUNT(*) FILTER (WHERE ${schema.analyticsEvents.eventName} = 'page_view')`,
        })
        .from(schema.analyticsEvents)
        .where(and(...filters));
      const daily = await db
        .select({
          date: sql<string>`to_char(date_trunc('day', ${schema.analyticsEvents.occurredAt} AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`,
          events: count(),
          visitors: countDistinct(schema.analyticsEvents.sessionKey),
          pageViews: sql<number>`COUNT(*) FILTER (WHERE ${schema.analyticsEvents.eventName} = 'page_view')`,
        })
        .from(schema.analyticsEvents)
        .where(and(...filters))
        .groupBy(
          sql`date_trunc('day', ${schema.analyticsEvents.occurredAt} AT TIME ZONE 'UTC')`,
        )
        .orderBy(
          asc(
            sql`date_trunc('day', ${schema.analyticsEvents.occurredAt} AT TIME ZONE 'UTC')`,
          ),
        );
      const topPages = await db
        .select({ path: schema.analyticsEvents.pagePath, pageViews: count() })
        .from(schema.analyticsEvents)
        .where(
          and(...filters, eq(schema.analyticsEvents.eventName, "page_view")),
        )
        .groupBy(schema.analyticsEvents.pagePath)
        .orderBy(desc(count()))
        .limit(10);
      const events = await db
        .select({ name: schema.analyticsEvents.eventName, count: count() })
        .from(schema.analyticsEvents)
        .where(and(...filters))
        .groupBy(schema.analyticsEvents.eventName)
        .orderBy(desc(count()))
        .limit(20);
      response.json({
        source: query.source,
        from: query.from,
        to: query.to,
        summary,
        daily,
        topPages,
        events,
      });
      return;
    }

    const provider = source;
    const { connection, accessToken } = await googleToken(
      environment,
      db,
      site.id,
      provider,
    );
    if (!connection.propertyId)
      throw new HttpError(
        409,
        "Select a Google property before viewing reports",
        "growth_property_required",
      );
    let report: unknown;
    try {
      if (provider === "google_analytics") {
        const property = connection.propertyId.replace(/^properties\//, "");
        const result = await googleJson<any>(
          `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(property)}:runReport`,
          accessToken,
          {
            method: "POST",
            body: JSON.stringify({
              dateRanges: [{ startDate: query.from, endDate: query.to }],
              dimensions: [{ name: "date" }],
              metrics: [
                { name: "screenPageViews" },
                { name: "activeUsers" },
                { name: "sessions" },
                { name: "bounceRate" },
              ],
              metricAggregations: ["TOTAL"],
              limit: 400,
            }),
          },
        );
        const daily = (result.rows || []).map((row: any) => ({
          date: row.dimensionValues?.[0]?.value,
          pageViews: Number(row.metricValues?.[0]?.value || 0),
          visitors: Number(row.metricValues?.[1]?.value || 0),
          sessions: Number(row.metricValues?.[2]?.value || 0),
          bounceRate: Number(row.metricValues?.[3]?.value || 0),
        }));
        const total = result.totals?.[0]?.metricValues || [];
        const summary: {
          pageViews: number;
          visitors: number;
          sessions: number;
          bounceRate?: number;
        } = total.length
          ? {
              pageViews: Number(total[0]?.value || 0),
              visitors: Number(total[1]?.value || 0),
              sessions: Number(total[2]?.value || 0),
            }
          : daily.reduce(
              (sum: any, row: any) => ({
                pageViews: sum.pageViews + row.pageViews,
                visitors: sum.visitors + row.visitors,
                sessions: sum.sessions + row.sessions,
              }),
              { pageViews: 0, visitors: 0, sessions: 0 },
            );
        summary.bounceRate = summary.sessions
          ? daily.reduce(
              (weighted: number, row: any) =>
                weighted + row.bounceRate * row.sessions,
              0,
            ) / summary.sessions
          : 0;
        report = {
          source: provider,
          from: query.from,
          to: query.to,
          summary,
          daily,
        };
      } else {
        const result = await googleJson<any>(
          `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(connection.propertyId)}/searchAnalytics/query`,
          accessToken,
          {
            method: "POST",
            body: JSON.stringify({
              startDate: query.from,
              endDate: query.to,
              dimensions: ["date"],
              rowLimit: 25000,
            }),
          },
        );
        const daily = (result.rows || []).map((row: any) => ({
          date: row.keys?.[0],
          clicks: Number(row.clicks || 0),
          impressions: Number(row.impressions || 0),
          ctr: Number(row.ctr || 0),
          averagePosition: Number(row.position || 0),
        }));
        const summary = daily.reduce(
          (total: any, row: any) => ({
            clicks: total.clicks + row.clicks,
            impressions: total.impressions + row.impressions,
            positionTotal:
              total.positionTotal + row.averagePosition * row.impressions,
          }),
          { clicks: 0, impressions: 0, positionTotal: 0 },
        );
        summary.ctr = summary.impressions
          ? summary.clicks / summary.impressions
          : 0;
        summary.averagePosition = summary.impressions
          ? summary.positionTotal / summary.impressions
          : 0;
        delete summary.positionTotal;
        report = {
          source: provider,
          from: query.from,
          to: query.to,
          summary,
          daily,
        };
      }
      await db
        .update(schema.growthConnections)
        .set({
          lastSyncedAt: new Date(),
          lastError: null,
          updatedAt: new Date(),
        })
        .where(eq(schema.growthConnections.id, connection.id));
      response.json(report);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message.slice(0, 450)
          : "Google report unavailable";
      await db
        .update(schema.growthConnections)
        .set({ lastError: message, updatedAt: new Date() })
        .where(eq(schema.growthConnections.id, connection.id));
      throw error;
    }
  });

  router.get("/growth/events", async (request, response) => {
    const site = await access(request, request.query.projectId);
    const range = parse(dateFilterSchema, request.query);
    const from = range.from
      ? new Date(`${range.from}T00:00:00.000Z`)
      : new Date(Date.now() - 30 * 86400_000);
    const events = await db
      .select({
        name: schema.analyticsEvents.eventName,
        count: count(),
        lastSeen: sql<Date>`max(${schema.analyticsEvents.occurredAt})`,
      })
      .from(schema.analyticsEvents)
      .where(
        and(
          eq(schema.analyticsEvents.projectId, site.id),
          gte(schema.analyticsEvents.occurredAt, from),
        ),
      )
      .groupBy(schema.analyticsEvents.eventName)
      .orderBy(desc(count()));
    const [total] = await db
      .select({ count: count() })
      .from(schema.analyticsEvents)
      .where(eq(schema.analyticsEvents.projectId, site.id));
    response.json({ events, total: total?.count ?? 0, retentionDays: 90 });
  });

  router.get("/growth/targets", async (request, response) => {
    const site = await access(request, request.query.projectId);
    const [pages, products] = await Promise.all([
      db
        .select({
          id: schema.pages.id,
          name: schema.pages.title,
          path: schema.pages.slug,
        })
        .from(schema.pages)
        .where(
          and(
            eq(schema.pages.projectId, site.id),
            eq(schema.pages.status, "published"),
          ),
        )
        .orderBy(asc(schema.pages.title)),
      db
        .select({
          id: schema.products.id,
          name: schema.products.name,
          path: schema.products.slug,
        })
        .from(schema.products)
        .where(
          and(
            eq(schema.products.projectId, site.id),
            eq(schema.products.status, "published"),
            eq(schema.products.isActive, true),
          ),
        )
        .orderBy(asc(schema.products.name)),
    ]);
    response.json({
      pages: pages.map((page) => ({
        ...page,
        path: page.path === "home" ? "/" : `/${page.path}`,
      })),
      products: products.map((product) => ({
        ...product,
        path: `/products/${product.path}`,
      })),
    });
  });

  router.get("/growth/usage", async (request, response) => {
    const site = await access(request, request.query.projectId);
    await flushGrowthUsage(redis, db);
    const range = parse(dateFilterSchema, request.query);
    const from = range.from
      ? new Date(`${range.from}T00:00:00.000Z`)
      : new Date(`${isoDay(new Date()).slice(0, 7)}-01T00:00:00.000Z`);
    const rangeTo = range.to
      ? new Date(`${range.to}T23:59:59.999Z`)
      : new Date();
    const todayEnd = new Date(`${isoDay(new Date())}T23:59:59.999Z`);
    if (
      from > todayEnd ||
      new Date(`${range.to || isoDay(new Date())}T00:00:00.000Z`) > todayEnd
    )
      throw new HttpError(
        400,
        "Usage dates cannot be in the future",
        "validation_error",
      );
    const daily = await db
      .select({
        periodStart: schema.projectPageviewUsageDaily.periodStart,
        pageViews: schema.projectPageviewUsageDaily.pageViews,
      })
      .from(schema.projectPageviewUsageDaily)
      .where(
        and(
          eq(schema.projectPageviewUsageDaily.projectId, site.id),
          gte(schema.projectPageviewUsageDaily.periodStart, from),
          lte(schema.projectPageviewUsageDaily.periodStart, rangeTo),
        ),
      )
      .orderBy(asc(schema.projectPageviewUsageDaily.periodStart));
    const total = daily.reduce(
      (sum, row) => sum + BigInt(row.pageViews || "0"),
      0n,
    );
    response.json({
      period: { from: isoDay(from), to: isoDay(rangeTo) },
      pageViews: total.toString(),
      daily,
      billing: "not_configured",
    });
  });

  router.get("/growth/connections", async (request, response) => {
    const site = await access(request, request.query.projectId);
    const connections = await db.query.growthConnections.findMany({
      where: eq(schema.growthConnections.projectId, site.id),
    });
    response.json({
      connections: connections.map(
        ({
          id,
          provider,
          status,
          propertyId,
          lastSyncedAt,
          lastError,
          updatedAt,
        }) => ({
          id,
          provider,
          status,
          propertyId,
          lastSyncedAt,
          lastError,
          updatedAt,
        }),
      ),
    });
  });

  router.post("/growth/connections/google/start", async (request, response) => {
    const site = await access(request, request.body?.projectId, true);
    const provider = parse(growthProviderSchema, request.body?.provider);
    if (
      !environment.GOOGLE_OAUTH_CLIENT_ID ||
      !environment.GOOGLE_OAUTH_REDIRECT_URI
    )
      throw new HttpError(
        503,
        "Google OAuth is not configured",
        "google_oauth_unavailable",
      );
    if (
      !environment.GOOGLE_OAUTH_CLIENT_SECRET ||
      !environment.INTEGRATION_ENCRYPTION_KEY ||
      !/^[\da-f]{64}$/i.test(environment.INTEGRATION_ENCRYPTION_KEY)
    )
      throw new HttpError(
        503,
        "Configure Google OAuth credentials and the integration encryption key first",
        "google_oauth_unavailable",
      );
    const state = crypto.randomUUID();
    await redis.set(
      `growth:oauth:${state}`,
      JSON.stringify({
        projectId: site.id,
        userId: request.auth!.userId,
        provider,
      }),
      "EX",
      600,
      "NX",
    );
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", environment.GOOGLE_OAUTH_CLIENT_ID);
    url.searchParams.set("redirect_uri", environment.GOOGLE_OAUTH_REDIRECT_URI);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", `openid email ${providerScope[provider]}`);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("include_granted_scopes", "true");
    url.searchParams.set("state", state);
    response.json({ authorizationUrl: url.toString() });
  });

  router.get(
    "/growth/connections/:provider/properties",
    async (request, response) => {
      const site = await access(request, request.query.projectId);
      const provider = parse(growthProviderSchema, request.params.provider);
      const { accessToken } = await googleToken(
        environment,
        db,
        site.id,
        provider,
      );
      if (provider === "google_analytics") {
        const result = await googleJson<any>(
          "https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200",
          accessToken,
        );
        response.json({
          properties: (result.accountSummaries || []).flatMap((account: any) =>
            (account.propertySummaries || []).map((property: any) => ({
              id: property.property,
              name: property.displayName,
            })),
          ),
        });
      } else {
        const result = await googleJson<any>(
          "https://searchconsole.googleapis.com/webmasters/v3/sites",
          accessToken,
        );
        response.json({
          properties: (result.siteEntry || []).map((siteEntry: any) => ({
            id: siteEntry.siteUrl,
            name: siteEntry.siteUrl,
            permissionLevel: siteEntry.permissionLevel,
          })),
        });
      }
    },
  );

  router.put(
    "/growth/connections/:provider/property",
    async (request, response) => {
      const site = await access(request, request.body?.projectId, true);
      const provider = parse(growthProviderSchema, request.params.provider);
      const propertyId = z
        .string()
        .trim()
        .min(1)
        .max(255)
        .parse(request.body?.propertyId);
      const connection = await db.query.growthConnections.findFirst({
        where: and(
          eq(schema.growthConnections.projectId, site.id),
          eq(schema.growthConnections.provider, provider),
        ),
      });
      if (!connection)
        throw new HttpError(404, "Connect the Google source first");
      const { accessToken } = await googleToken(
        environment,
        db,
        site.id,
        provider,
      );
      const propertiesResponse =
        provider === "google_analytics"
          ? await googleJson<any>(
              "https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200",
              accessToken,
            )
          : await googleJson<any>(
              "https://searchconsole.googleapis.com/webmasters/v3/sites",
              accessToken,
            );
      const properties =
        provider === "google_analytics"
          ? (propertiesResponse.accountSummaries || [])
              .flatMap((account: any) => account.propertySummaries || [])
              .map((item: any) => item.property)
          : (propertiesResponse.siteEntry || [])
              .filter((item: any) =>
                ["siteOwner", "siteFullUser", "siteRestrictedUser"].includes(
                  item.permissionLevel,
                ),
              )
              .map((item: any) => item.siteUrl);
      if (!properties.includes(propertyId))
        throw new HttpError(
          403,
          "This Google account cannot access the selected property",
          "google_property_forbidden",
        );
      const [updated] = await db
        .update(schema.growthConnections)
        .set({ propertyId, lastError: null, updatedAt: new Date() })
        .where(eq(schema.growthConnections.id, connection.id))
        .returning();
      response.json({
        connection: {
          id: updated.id,
          provider,
          status: updated.status,
          propertyId: updated.propertyId,
          updatedAt: updated.updatedAt,
        },
      });
    },
  );

  router.delete("/growth/connections/:provider", async (request, response) => {
    const site = await access(request, request.body?.projectId, true);
    const provider = parse(growthProviderSchema, request.params.provider);
    await db
      .delete(schema.growthConnections)
      .where(
        and(
          eq(schema.growthConnections.projectId, site.id),
          eq(schema.growthConnections.provider, provider),
        ),
      );
    response.json({ success: true });
  });

  router.get("/growth/experiments", async (request, response) => {
    const site = await access(request, request.query.projectId);
    const experiments = await db.query.growthExperiments.findMany({
      where: eq(schema.growthExperiments.projectId, site.id),
      orderBy: [desc(schema.growthExperiments.updatedAt)],
    });
    response.json({ experiments });
  });

  router.post("/growth/experiments", async (request, response) => {
    const body = parse(experimentInputSchema, request.body);
    const site = await access(request, body.projectId, true);
    if (
      (body.targetType === "page" || body.targetType === "product") &&
      !body.targetId
    )
      throw new HttpError(
        400,
        "Choose a page or product target",
        "validation_error",
      );
    if (
      (body.targetType === "cart" || body.targetType === "checkout") &&
      body.targetId
    )
      throw new HttpError(
        400,
        "Cart and checkout experiments do not use a target ID",
        "validation_error",
      );
    if (
      body.targetType === "page" &&
      !(await db.query.pages.findFirst({
        where: and(
          eq(schema.pages.id, body.targetId!),
          eq(schema.pages.projectId, site.id),
          eq(schema.pages.status, "published"),
        ),
      }))
    )
      throw new HttpError(404, "Published target page was not found");
    if (
      body.targetType === "product" &&
      !(await db.query.products.findFirst({
        where: and(
          eq(schema.products.id, body.targetId!),
          eq(schema.products.projectId, site.id),
          eq(schema.products.status, "published"),
          eq(schema.products.isActive, true),
        ),
      }))
    )
      throw new HttpError(404, "Published target product was not found");
    const overlapping = await db.query.growthExperiments.findFirst({
      where: and(
        eq(schema.growthExperiments.projectId, site.id),
        eq(schema.growthExperiments.status, "running"),
        eq(schema.growthExperiments.targetType, body.targetType),
        body.targetId
          ? eq(schema.growthExperiments.targetId, body.targetId)
          : sql`${schema.growthExperiments.targetId} IS NULL`,
      ),
    });
    if (overlapping)
      throw new HttpError(
        409,
        "Another experiment is already running on this target",
        "experiment_target_conflict",
      );
    const samplePerVariant = sampleSizePerVariant(
      body.baselineRate,
      body.minimumDetectableEffect,
    );
    const sampleSizeTarget = Math.min(
      10_000_000,
      samplePerVariant * body.variants.length,
    );
    const currentUser = await user(request);
    const created = await db.transaction(async (tx) => {
      const [experiment] = await tx
        .insert(schema.growthExperiments)
        .values({
          projectId: site.id,
          name: body.name,
          description: body.description,
          targetType: body.targetType,
          targetId: body.targetId,
          primaryEvent: body.primaryEvent,
          baselineRate: String(body.baselineRate),
          minimumDetectableEffect: String(body.minimumDetectableEffect),
          sampleSizeTarget,
          guardrailEvents: body.guardrailEvents,
          createdBy: currentUser.id,
        })
        .returning();
      const variants = await tx
        .insert(schema.growthExperimentVariants)
        .values(
          body.variants.map((variant) => ({
            ...variant,
            experimentId: experiment.id,
          })),
        )
        .returning();
      return { ...experiment, variants };
    });
    response.status(201).json({ experiment: created });
  });

  router.get("/growth/experiments/:id", async (request, response) => {
    const site = await access(request, request.query.projectId);
    const id = uuid.parse(request.params.id);
    const experiment = await db.query.growthExperiments.findFirst({
      where: and(
        eq(schema.growthExperiments.id, id),
        eq(schema.growthExperiments.projectId, site.id),
      ),
    });
    if (!experiment) throw new HttpError(404, "Experiment not found");
    const variants = await db.query.growthExperimentVariants.findMany({
      where: eq(schema.growthExperimentVariants.experimentId, experiment.id),
    });
    const assignments = await db
      .select({
        variantId: schema.growthExperimentAssignments.variantId,
        count: count(),
      })
      .from(schema.growthExperimentAssignments)
      .where(eq(schema.growthExperimentAssignments.experimentId, experiment.id))
      .groupBy(schema.growthExperimentAssignments.variantId);
    const events = await db
      .select({
        variantId: sql<string>`${schema.analyticsEvents.properties}->>'growth_variant_id'`,
        count: count(),
      })
      .from(schema.analyticsEvents)
      .where(
        and(
          eq(schema.analyticsEvents.projectId, site.id),
          eq(schema.analyticsEvents.eventName, experiment.primaryEvent),
          gte(
            schema.analyticsEvents.occurredAt,
            experiment.startedAt || experiment.createdAt,
          ),
          sql`${schema.analyticsEvents.properties}->>'growth_experiment_id' = ${experiment.id}`,
        ),
      )
      .groupBy(sql`${schema.analyticsEvents.properties}->>'growth_variant_id'`);
    response.json({ experiment, variants, assignments, events });
  });

  router.post(
    "/growth/experiments/:id/transition",
    async (request, response) => {
      const id = uuid.parse(request.params.id);
      const body = parse(experimentTransitionSchema, request.body);
      const site = await access(request, body.projectId, true);
      let updated;
      try {
        updated = await db.transaction(async (tx) => {
          await tx
            .select({ id: schema.projects.id })
            .from(schema.projects)
            .where(eq(schema.projects.id, site.id))
            .for("update");
          const experiment = await tx.query.growthExperiments.findFirst({
            where: and(
              eq(schema.growthExperiments.id, id),
              eq(schema.growthExperiments.projectId, site.id),
            ),
          });
          if (!experiment) throw new HttpError(404, "Experiment not found");
          const nextStatus: Record<string, string[]> = {
            start: ["draft"],
            pause: ["running"],
            resume: ["paused"],
            stop: ["running", "paused"],
          };
          if (!nextStatus[body.action].includes(experiment.status))
            throw new HttpError(
              409,
              `Cannot ${body.action} an experiment in ${experiment.status} state`,
              "invalid_experiment_transition",
            );
          if (body.action === "start") {
            const [variants, events] = await Promise.all([
              tx.query.growthExperimentVariants.findMany({
                where: eq(
                  schema.growthExperimentVariants.experimentId,
                  experiment.id,
                ),
              }),
              tx
                .select({ count: count() })
                .from(schema.analyticsEvents)
                .where(
                  and(
                    eq(schema.analyticsEvents.projectId, site.id),
                    eq(
                      schema.analyticsEvents.eventName,
                      experiment.primaryEvent,
                    ),
                    gte(
                      schema.analyticsEvents.occurredAt,
                      new Date(Date.now() - 90 * 86400_000),
                    ),
                  ),
                ),
            ]);
            if (
              variants.length < 2 ||
              !variants.some((variant) => variant.isControl)
            )
              throw new HttpError(409, "Experiment variants are incomplete");
            if (Number(events[0]?.count ?? 0) < 20)
              throw new HttpError(
                409,
                "Collect at least 20 goal events before starting this experiment",
                "insufficient_baseline_data",
              );
            const overlapping = await tx.query.growthExperiments.findFirst({
              where: and(
                eq(schema.growthExperiments.projectId, site.id),
                eq(schema.growthExperiments.status, "running"),
                eq(schema.growthExperiments.targetType, experiment.targetType),
                experiment.targetId
                  ? eq(schema.growthExperiments.targetId, experiment.targetId)
                  : sql`${schema.growthExperiments.targetId} IS NULL`,
              ),
            });
            if (overlapping)
              throw new HttpError(
                409,
                "Another experiment is already running on this target",
                "experiment_target_conflict",
              );
          }
          const status =
            body.action === "start" || body.action === "resume"
              ? "running"
              : body.action === "pause"
                ? "paused"
                : "completed";
          const [result] = await tx
            .update(schema.growthExperiments)
            .set({
              status,
              startedAt:
                body.action === "start" ? new Date() : experiment.startedAt,
              endedAt: body.action === "stop" ? new Date() : null,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(schema.growthExperiments.id, id),
                eq(schema.growthExperiments.status, experiment.status),
              ),
            )
            .returning();
          if (!result)
            throw new HttpError(
              409,
              "Experiment state changed; refresh and try again",
              "experiment_state_conflict",
            );
          return result;
        });
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "23505"
        ) {
          throw new HttpError(
            409,
            "Another experiment is already running on this target",
            "experiment_target_conflict",
          );
        }
        throw error;
      }
      response.json({ experiment: updated });
    },
  );

  router.get("/growth/recommendations", async (request, response) => {
    const site = await access(request, request.query.projectId);
    const recommendations = await db.query.recommendations.findMany({
      where: eq(schema.recommendations.projectId, site.id),
      orderBy: [desc(schema.recommendations.createdAt)],
      limit: 100,
    });
    response.json({ recommendations });
  });

  router.post("/growth/recommendations/generate", async (request, response) => {
    const site = await access(request, request.body?.projectId, true);
    const [events, pages] = await Promise.all([
      db
        .select({ name: schema.analyticsEvents.eventName, count: count() })
        .from(schema.analyticsEvents)
        .where(
          and(
            eq(schema.analyticsEvents.projectId, site.id),
            gte(
              schema.analyticsEvents.occurredAt,
              new Date(Date.now() - 30 * 86400_000),
            ),
          ),
        )
        .groupBy(schema.analyticsEvents.eventName)
        .orderBy(desc(count()))
        .limit(12),
      db
        .select({ path: schema.analyticsEvents.pagePath, views: count() })
        .from(schema.analyticsEvents)
        .where(
          and(
            eq(schema.analyticsEvents.projectId, site.id),
            eq(schema.analyticsEvents.eventName, "page_view"),
            gte(
              schema.analyticsEvents.occurredAt,
              new Date(Date.now() - 30 * 86400_000),
            ),
          ),
        )
        .groupBy(schema.analyticsEvents.pagePath)
        .orderBy(desc(count()))
        .limit(8),
    ]);
    if (!Number(events.reduce((sum, row) => sum + row.count, 0)))
      throw new HttpError(
        409,
        "Collect analytics data before generating recommendations",
        "insufficient_analytics_data",
      );
    const evidence = { windowDays: 30, events, pages };
    const [run] = await db
      .insert(schema.aiRuns)
      .values({
        projectId: site.id,
        requestedBy: (await user(request)).id,
        kind: "growth_recommendations",
        status: "running",
        input: evidence,
      })
      .returning();
    let aiTitle: string | undefined;
    let aiExplanation: string | undefined;
    let aiError: string | undefined;
    try {
      const generated = await generateAIText(
        "Return JSON with title and explanation for one conservative website growth recommendation. Only use the supplied measurements. Never predict percentage lift or invent causal claims. Keep title under 120 characters and explanation under 500. If evidence is insufficient, say so.",
        [{ type: "text", text: JSON.stringify(evidence) }],
        "chat",
      );
      const object = JSON.parse(generated) as {
        title?: unknown;
        explanation?: unknown;
      };
      if (
        typeof object.title !== "string" ||
        typeof object.explanation !== "string"
      )
        throw new Error("AI output did not match the recommendation format");
      aiTitle = object.title.trim().slice(0, 120);
      aiExplanation = object.explanation.trim().slice(0, 500);
      await db
        .update(schema.aiRuns)
        .set({
          status: "succeeded",
          output: { title: aiTitle, explanation: aiExplanation },
          completedAt: new Date(),
        })
        .where(eq(schema.aiRuns.id, run.id));
    } catch (error) {
      aiError =
        error instanceof Error
          ? error.message.slice(0, 500)
          : "AI generation failed";
      await db
        .update(schema.aiRuns)
        .set({ status: "failed", error: aiError, completedAt: new Date() })
        .where(eq(schema.aiRuns.id, run.id));
    }
    const topPage = pages[0];
    const title =
      aiTitle ||
      (topPage?.path
        ? `Review content on ${topPage.path}`
        : "Add a primary conversion event");
    const explanation =
      aiExplanation ||
      (topPage?.path
        ? `${topPage.views} page views were recorded on this page in the last 30 days. Review its content and calls to action. This observation does not estimate conversion lift.`
        : "Traffic is being collected, but conversion events are not yet configured. Add the events that represent valuable actions on your site.");
    const [recommendation] = await db
      .insert(schema.recommendations)
      .values({
        projectId: site.id,
        aiRunId: run.id,
        kind: topPage?.path ? "page_review" : "conversion_tracking",
        explanation,
        proposedAction: { title, evidence, aiAssisted: Boolean(aiTitle) },
      })
      .returning();
    response.status(201).json({
      recommendation,
      aiStatus: aiError ? "unavailable_fallback_used" : "generated",
    });
  });

  router.patch("/growth/recommendations/:id", async (request, response) => {
    const body = z
      .object({ projectId: uuid, status: z.enum(["approved", "rejected"]) })
      .strict()
      .parse(request.body);
    const site = await access(request, body.projectId, true);
    const id = uuid.parse(request.params.id);
    const [updated] = await db
      .update(schema.recommendations)
      .set({ status: body.status, decidedAt: new Date() })
      .where(
        and(
          eq(schema.recommendations.id, id),
          eq(schema.recommendations.projectId, site.id),
          eq(schema.recommendations.status, "pending"),
        ),
      )
      .returning();
    if (!updated) throw new HttpError(404, "Pending recommendation not found");
    response.json({ recommendation: updated, applied: false });
  });

  return router;
}
