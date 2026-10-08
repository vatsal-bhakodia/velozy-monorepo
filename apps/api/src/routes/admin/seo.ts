import { Router } from "express";
import type { Request } from "express";
import type { Router as ExpressRouter } from "express";
import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import { createDb, schema } from "@velozy/db";
import type { Environment } from "../../config/env.js";
import { HttpError } from "../../middleware/errors.js";
import { adminAccess } from "../../lib/admin-auth.js";
import { googleJson, googleToken } from "./growth.js";
import { processPrompt } from "../../lib/process-prompt.js";
import { requestAiIdempotencyKey, withAiCredits } from "../../lib/platform-billing.js";
import { postDataForSeo } from "../../lib/dataforseo-client.js";
import { reserveSeoProviderBudget, settleSeoProviderBudget } from "../../lib/seo-provider-budget.js";

type SeoTargetType = "page" | "product" | "collection" | "blog";
type SeoRecord = {
  id: string;
  type: SeoTargetType;
  title: string;
  slug: string;
  status: string;
  metaTitle: string | null;
  metaDescription: string | null;
  updatedAt: Date;
  editPath: string;
  body?: string | null;
};
type SeoFinding = {
  targetType: SeoTargetType;
  targetId: string;
  title: string;
  slug: string;
  rule: string;
  field: string;
  severity: "high" | "medium" | "low";
  message: string;
  editPath: string;
};

const projectQuery = z.string().uuid();
const SERP_RESERVE_USD = 0.001;

export function domainRatingFrom(body: any): number | null {
  const rating = Number(body?.domain_rating?.domain_rating);
  return Number.isFinite(rating) && rating >= 0 && rating <= 100
    ? rating
    : null;
}

export function organicSerpRows(
  items: any[],
): Array<{ position: number; domain: string; title: string; url: string }> {
  return items
    .filter((item) => item?.type === "organic")
    .slice(0, 10)
    .map((item) => ({
      position: Number(item.rank_group ?? item.rank_absolute ?? 0),
      domain: String(item.domain ?? ""),
      title: String(item.title ?? ""),
      url: String(item.url ?? ""),
    }));
}

export function verifiedHttpsUrl(
  rawUrl: string,
  domain: string,
): string | null {
  try {
    const url = new URL(rawUrl);
    if (
      url.protocol !== "https:" ||
      url.hostname.toLowerCase() !== domain ||
      url.username ||
      url.password ||
      url.port
    )
      return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function serpTaskOutcome(
  statusCode: number,
  hasResult: boolean,
): "pending" | "failed" | "completed" {
  if (
    [20100, 40601, 40602].includes(statusCode) ||
    (!hasResult && statusCode >= 20000 && statusCode < 30000)
  )
    return "pending";
  if (statusCode < 20000 || statusCode >= 30000) return "failed";
  return "completed";
}

export function auditRecords(records: SeoRecord[]): SeoFinding[] {
  const findings: SeoFinding[] = [];
  const add = (
    record: SeoRecord,
    rule: string,
    field: string,
    severity: SeoFinding["severity"],
    message: string,
  ) =>
    findings.push({
      targetType: record.type,
      targetId: record.id,
      title: record.title,
      slug: record.slug,
      rule,
      field,
      severity,
      message,
      editPath: record.editPath,
    });

  const titles = new Map<string, SeoRecord[]>();
  for (const record of records) {
    const metaTitle = record.metaTitle?.trim() ?? "";
    const description = record.metaDescription?.trim() ?? "";
    const content = record.body?.trim() ?? "";
    if (!metaTitle)
      add(
        record,
        "missing_title",
        "metaTitle",
        "high",
        "SEO title is missing.",
      );
    else if (metaTitle.length > 60)
      add(
        record,
        "long_title",
        "metaTitle",
        "low",
        "SEO title exceeds 60 characters.",
      );
    if (!description)
      add(
        record,
        "missing_description",
        "metaDescription",
        "medium",
        "Meta description is missing.",
      );
    else if (description.length > 160)
      add(
        record,
        "long_description",
        "metaDescription",
        "low",
        "Meta description exceeds 160 characters.",
      );
    if ((record.type === "page" || record.type === "blog") && !content) {
      add(
        record,
        "missing_content",
        "content",
        "medium",
        "Page or blog content is empty.",
      );
    }
    const key = metaTitle.toLowerCase();
    if (key) titles.set(key, [...(titles.get(key) ?? []), record]);
  }
  for (const duplicateRecords of titles.values()) {
    if (duplicateRecords.length < 2) continue;
    for (const record of duplicateRecords) {
      add(
        record,
        "duplicate_title",
        "metaTitle",
        "medium",
        "SEO title is shared by multiple records.",
      );
    }
  }
  return findings;
}

export function adminSeoRouter(
  environment: Environment,
  redis: any,
): ExpressRouter {
  const db = createDb(environment.DATABASE_URL);
  const authz = adminAccess(environment.DATABASE_URL);
  const router = Router();
  const reserveProviderBudget = (projectId: string, operation: string, reserveUsd: number) =>
    reserveSeoProviderBudget(db, projectId, operation, reserveUsd);
  const releaseProviderBudget = async (
    id: string,
    actualCost: number | null,
  ) => {
    await settleSeoProviderBudget(db, id, actualCost);
  };
  const dataForSeo = async (path: string, payload: unknown) => {
    if (!environment.DATAFORSEO_LOGIN?.trim() || !environment.DATAFORSEO_PASSWORD?.trim())
      throw new HttpError(
        503,
        "Paid SEO research is not configured",
        "seo_provider_unavailable",
      );
    try {
      const result = await postDataForSeo(environment, path, payload);
      return { body: result.body, task: result.tasks[0], cost: result.cost };
    } catch (error) {
      throw new HttpError(502, error instanceof Error ? error.message : "SEO provider failed", "seo_provider_failed");
    }
  };
  const dataForSeoGet = async (path: string) => {
    const login = environment.DATAFORSEO_LOGIN?.trim();
    const password = environment.DATAFORSEO_PASSWORD?.trim();
    if (!login || !password)
      throw new HttpError(
        503,
        "Paid SEO research is not configured",
        "seo_provider_unavailable",
      );
    const response = await fetch(`https://api.dataforseo.com/v3/${path}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`,
      },
      signal: AbortSignal.timeout(20_000),
    });
    const body = (await response.json().catch(() => null)) as any;
    if (
      !response.ok ||
      !body ||
      body.status_code < 20000 ||
      body.status_code >= 30000
    )
      throw new HttpError(
        502,
        "SEO data provider could not complete the request",
        "seo_provider_failed",
      );
    const task = body.tasks?.[0];
    if (!task || !Number.isFinite(Number(task.status_code)))
      throw new HttpError(
        502,
        task?.status_message || "SEO data provider returned no result",
        "seo_provider_failed",
      );
    const cost = task.cost == null ? null : Number(task.cost);
    return {
      task,
      cost: cost !== null && Number.isFinite(cost) && cost >= 0 ? cost : null,
    };
  };
  const verifiedDomain = async (projectId: string) => {
    const domains = await db.query.siteDomains.findMany({
      where: and(
        eq(schema.siteDomains.projectId, projectId),
        eq(schema.siteDomains.isVerified, true),
      ),
      orderBy: [desc(schema.siteDomains.isPrimary)],
      limit: 10,
    });
    const hostname = domains[0]?.hostname.toLowerCase().replace(/\.$/, "");
    if (
      !hostname ||
      !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(
        hostname,
      )
    )
      throw new HttpError(
        409,
        "Add and verify a public site domain before requesting SEO data",
        "seo_verified_domain_required",
      );
    return hostname;
  };
  const cachedJson = async (
    key: string,
    ttlSeconds: number,
    load: () => Promise<unknown>,
  ) => {
    const cached = await redis.get(key);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        await redis.del(key);
      }
    }
    const lockKey = `${key}:lock`;
    const lockToken = randomUUID();
    const acquired = await redis.set(lockKey, lockToken, "EX", 60, "NX");
    if (!acquired)
      throw new HttpError(
        409,
        "This site check is already running; retry shortly",
        "seo_check_in_progress",
      );
    try {
      const result = await load();
      await redis.set(key, JSON.stringify(result), "EX", ttlSeconds);
      return result;
    } finally {
      await redis.eval(
        "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
        1,
        lockKey,
        lockToken,
      );
    }
  };
  const consumeDailyQuota = async (
    key: string,
    limit: number,
    message: string,
  ) => {
    const used = Number(
      await redis.eval(
        "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], 86400); end; return n",
        1,
        key,
      ),
    );
    if (used > limit)
      throw new HttpError(429, message, "seo_provider_quota_exhausted");
  };
  const serializeSerpTask = (task: any) => ({
    id: task.id,
    status: task.status,
    keyword: task.input?.keyword ?? null,
    result: task.result ?? null,
    costUsd: task.costUsd ?? null,
    createdAt: task.createdAt,
    expiresAt: task.expiresAt,
  });
  const user = async (request: Express.Request) => {
    if (!request.auth?.userId) throw new HttpError(401, "Unauthorized");
    const found = await db.query.users.findFirst({
      where: eq(schema.users.id, request.auth.userId),
    });
    if (!found) throw new HttpError(404, "User not found");
    return found;
  };
  const recordsFor = async (projectId: string): Promise<SeoRecord[]> => {
    const [pages, products, collections, blogs] = await Promise.all([
      db.query.pages.findMany({ where: eq(schema.pages.projectId, projectId) }),
      db.query.products.findMany({
        where: eq(schema.products.projectId, projectId),
      }),
      db.query.productCategories.findMany({
        where: eq(schema.productCategories.projectId, projectId),
      }),
      db.query.blogs.findMany({ where: eq(schema.blogs.projectId, projectId) }),
    ]);
    return [
      ...pages.map((row) => ({
        id: row.id,
        type: "page" as const,
        title: row.title,
        slug: row.slug,
        status: row.status,
        metaTitle: row.metaTitle,
        metaDescription: row.metaDescription,
        updatedAt: row.updatedAt,
        editPath: "/pages",
        body: JSON.stringify(row.pageData ?? ""),
      })),
      ...products.map((row) => ({
        id: row.id,
        type: "product" as const,
        title: row.name,
        slug: row.slug,
        status: row.status,
        metaTitle: row.seoTitle,
        metaDescription: row.seoDescription,
        updatedAt: row.updatedAt,
        editPath: `/products/${encodeURIComponent(row.id)}`,
      })),
      ...collections.map((row) => ({
        id: row.id,
        type: "collection" as const,
        title: row.name,
        slug: row.slug,
        status: row.isActive ? "active" : "inactive",
        metaTitle: row.metaTitle,
        metaDescription: row.metaDescription,
        updatedAt: row.updatedAt,
        editPath: `/collections/${encodeURIComponent(row.id)}`,
      })),
      ...blogs.map((row) => ({
        id: row.id,
        type: "blog" as const,
        title: row.title,
        slug: row.slug,
        status: row.status,
        metaTitle: row.metaTitle,
        metaDescription: row.metaDescription,
        updatedAt: row.updatedAt,
        editPath: `/blogs/${encodeURIComponent(row.id)}`,
        body: row.content,
      })),
    ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  };
  const projectIdFrom = async (request: Request) => {
    const parsed = projectQuery.safeParse(request.query.projectId);
    if (!parsed.success)
      throw new HttpError(
        400,
        "A valid projectId is required",
        "validation_error",
      );
    const currentUser = await user(request);
    await authz.project(parsed.data, currentUser.id, "content:read");
    return parsed.data;
  };

  router.get("/seo/records", async (request, response) => {
    const projectId = await projectIdFrom(request);
    const records = await recordsFor(projectId);
    const findings = auditRecords(records);
    const titleMissing = records.filter(
      (record) => !record.metaTitle?.trim(),
    ).length;
    response.json({
      records: records.map(({ body: _body, ...record }) => record),
      summary: {
        total: records.length,
        missingTitles: titleMissing,
        issues: findings.length,
      },
    });
  });

  router.get("/seo/audits", async (request, response) => {
    const projectId = await projectIdFrom(request);
    const audits = await db.query.seoAudits.findMany({
      where: eq(schema.seoAudits.projectId, projectId),
      orderBy: [desc(schema.seoAudits.createdAt)],
      limit: 50,
    });
    response.json({ audits });
  });

  router.post("/seo/audits", async (request, response) => {
    const currentUser = await user(request);
    const parsed = z
      .object({ projectId: z.string().uuid() })
      .safeParse(request.body);
    if (!parsed.success)
      throw new HttpError(
        400,
        "A valid projectId is required",
        "validation_error",
      );
    await authz.project(parsed.data.projectId, currentUser.id, "content:write");
    const records = await recordsFor(parsed.data.projectId);
    const findings = auditRecords(records);
    const score =
      records.length === 0
        ? 100
        : Math.max(
            0,
            Math.round(
              100 * (1 - findings.length / Math.max(1, records.length * 3)),
            ),
          );
    const [audit] = await db
      .insert(schema.seoAudits)
      .values({
        projectId: parsed.data.projectId,
        score,
        findings,
      })
      .returning();
    response.status(201).json({ audit });
  });

  router.get("/seo/search-performance", async (request, response) => {
    const projectId = await projectIdFrom(request);
    const connection = await db.query.growthConnections.findFirst({
      where: and(
        eq(schema.growthConnections.projectId, projectId),
        eq(schema.growthConnections.provider, "search_console"),
      ),
    });
    if (
      !connection ||
      connection.status !== "connected" ||
      !connection.propertyId
    ) {
      response.json({ connected: false, rows: [] });
      return;
    }
    const { accessToken } = await googleToken(
      environment,
      db,
      projectId,
      "search_console",
    );
    const to = new Date();
    to.setUTCDate(to.getUTCDate() - 3); // Search Console data is delayed.
    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - 27);
    const date = (value: Date) => value.toISOString().slice(0, 10);
    const result = await googleJson<any>(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(connection.propertyId)}/searchAnalytics/query`,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({
          startDate: date(from),
          endDate: date(to),
          dimensions: ["query"],
          rowLimit: 1000,
        }),
      },
    );
    response.json({
      connected: true,
      property: connection.propertyId,
      from: date(from),
      to: date(to),
      rows: (result.rows ?? []).map((row: any) => ({
        query: String(row.keys?.[0] ?? ""),
        clicks: Number(row.clicks ?? 0),
        impressions: Number(row.impressions ?? 0),
        ctr: Number(row.ctr ?? 0),
        position: Number(row.position ?? 0),
      })),
    });
  });

  router.get("/seo/domain-rating", async (request, response) => {
    const projectId = await projectIdFrom(request);
    const domain = await verifiedDomain(projectId);
    const key = environment.AHREFS_API_KEY?.trim();
    if (!key) {
      response.json({
        configured: false,
        domain,
        rating: null,
        provider: "Ahrefs",
      });
      return;
    }
    const result = await cachedJson(
      `seo:ahrefs:dr:${projectId}:${domain}`,
      12 * 60 * 60,
      async () => {
        const url = new URL(
          "https://api.ahrefs.com/v3/public/domain-rating-free",
        );
        url.searchParams.set("target", domain);
        const providerResponse = await fetch(url, {
          headers: {
            Authorization: `Bearer ${key}`,
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(10_000),
        });
        const body = (await providerResponse.json().catch(() => null)) as any;
        const rating = domainRatingFrom(body);
        if (!providerResponse.ok || rating === null)
          throw new HttpError(
            providerResponse.status === 429 ? 429 : 502,
            "Ahrefs could not return Domain Rating",
            "ahrefs_provider_failed",
          );
        return {
          configured: true,
          domain,
          rating,
          provider: "Ahrefs",
          checkedAt: new Date().toISOString(),
        };
      },
    );
    response.json(result);
  });

  router.get("/seo/site-health", async (request, response) => {
    const projectId = await projectIdFrom(request);
    const domain = await verifiedDomain(projectId);
    const apiKey = environment.GOOGLE_SEO_API_KEY?.trim();
    if (!apiKey) {
      response.json({ configured: false, domain, fieldData: null });
      return;
    }
    const fieldData = await cachedJson(
      `seo:crux:${projectId}:${domain}`,
      24 * 60 * 60,
      async () => {
        const providerResponse = await fetch(
          `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${encodeURIComponent(apiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              origin: `https://${domain}`,
              formFactor: "PHONE",
            }),
            signal: AbortSignal.timeout(12_000),
          },
        );
        const body = (await providerResponse.json().catch(() => null)) as any;
        if (providerResponse.status === 404)
          return { available: false, reason: "no_field_data" };
        if (!providerResponse.ok)
          throw new HttpError(
            providerResponse.status === 429 ? 429 : 502,
            "Google CrUX could not return field data",
            "crux_provider_failed",
          );
        return {
          available: !!body?.record,
          record: body?.record ?? null,
          collectionPeriod: body?.record?.collectionPeriod ?? null,
        };
      },
    );
    response.json({ configured: true, domain, fieldData });
  });

  const validatedSiteUrl = async (projectId: string, rawUrl: string) => {
    const domain = await verifiedDomain(projectId);
    const url = verifiedHttpsUrl(rawUrl, domain);
    if (!url)
      throw new HttpError(
        400,
        "The page URL must use HTTPS on the verified primary domain",
        "seo_url_domain_mismatch",
      );
    return { domain, url };
  };

  router.post("/seo/site-health/pagespeed", async (request, response) => {
    const currentUser = await user(request);
    const input = z
      .object({
        projectId: z.string().uuid(),
        url: z.string().trim().min(1).max(2048),
      })
      .safeParse(request.body);
    if (!input.success)
      throw new HttpError(400, "Invalid PageSpeed request", "validation_error");
    await authz.project(input.data.projectId, currentUser.id, "content:write");
    const target = await validatedSiteUrl(input.data.projectId, input.data.url);
    const apiKey = environment.GOOGLE_SEO_API_KEY?.trim();
    if (!apiKey)
      throw new HttpError(
        503,
        "Google SEO API key is not configured",
        "google_seo_unavailable",
      );
    const result = await cachedJson(
      `seo:psi:${input.data.projectId}:${encodeURIComponent(target.url)}`,
      6 * 60 * 60,
      async () => {
        await consumeDailyQuota(
          `seo:psi:daily:${input.data.projectId}`,
          100,
          "PageSpeed daily limit reached for this site",
        );
        const providerUrl = new URL(
          "https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed",
        );
        providerUrl.searchParams.set("url", target.url);
        providerUrl.searchParams.set("strategy", "MOBILE");
        providerUrl.searchParams.append("category", "PERFORMANCE");
        providerUrl.searchParams.append("category", "SEO");
        providerUrl.searchParams.set("key", apiKey);
        const providerResponse = await fetch(providerUrl, {
          signal: AbortSignal.timeout(45_000),
        });
        const body = (await providerResponse.json().catch(() => null)) as any;
        if (!providerResponse.ok || !body?.lighthouseResult)
          throw new HttpError(
            providerResponse.status === 429 ? 429 : 502,
            "PageSpeed could not analyze this page",
            "pagespeed_provider_failed",
          );
        const categories = body.lighthouseResult.categories ?? {};
        return {
          url: target.url,
          source: "Lighthouse lab data",
          fetchedAt: new Date().toISOString(),
          scores: {
            performance:
              categories.performance?.score == null
                ? null
                : Math.round(categories.performance.score * 100),
            seo:
              categories.seo?.score == null
                ? null
                : Math.round(categories.seo.score * 100),
          },
          audits: Object.values(body.lighthouseResult.audits ?? {})
            .filter(
              (audit: any) =>
                audit.scoreDisplayMode !== "notApplicable" &&
                audit.scoreDisplayMode !== "manual" &&
                audit.score < 1,
            )
            .slice(0, 20)
            .map((audit: any) => ({
              id: audit.id,
              title: audit.title,
              description: audit.description,
              score: audit.score,
              displayValue: audit.displayValue ?? null,
            })),
        };
      },
    );
    response.json(result);
  });

  router.post("/seo/site-health/inspect", async (request, response) => {
    const currentUser = await user(request);
    const input = z
      .object({
        projectId: z.string().uuid(),
        url: z.string().trim().min(1).max(2048),
      })
      .safeParse(request.body);
    if (!input.success)
      throw new HttpError(
        400,
        "Invalid URL inspection request",
        "validation_error",
      );
    await authz.project(input.data.projectId, currentUser.id, "content:write");
    const target = await validatedSiteUrl(input.data.projectId, input.data.url);
    const connection = await db.query.growthConnections.findFirst({
      where: and(
        eq(schema.growthConnections.projectId, input.data.projectId),
        eq(schema.growthConnections.provider, "search_console"),
      ),
    });
    if (
      !connection ||
      connection.status !== "connected" ||
      !connection.propertyId
    )
      throw new HttpError(
        409,
        "Connect and select a Search Console property first",
        "growth_source_not_connected",
      );
    const siteUrl = connection.propertyId;
    let propertyMatches = false;
    if (siteUrl.startsWith("sc-domain:")) {
      const propertyDomain = siteUrl.slice("sc-domain:".length).toLowerCase();
      propertyMatches =
        target.domain === propertyDomain ||
        target.domain.endsWith(`.${propertyDomain}`);
    } else {
      try {
        const propertyUrl = new URL(siteUrl);
        const targetUrl = new URL(target.url);
        propertyMatches =
          propertyUrl.hostname.toLowerCase() === target.domain &&
          propertyUrl.origin === targetUrl.origin &&
          targetUrl.pathname.startsWith(propertyUrl.pathname);
      } catch {
        propertyMatches = false;
      }
    }
    if (!propertyMatches)
      throw new HttpError(
        409,
        "The selected Search Console property does not match the verified site domain",
        "search_console_property_mismatch",
      );
    const result = await cachedJson(
      `seo:url-inspection:${input.data.projectId}:${encodeURIComponent(`${siteUrl}:${target.url}`)}`,
      24 * 60 * 60,
      async () => {
        await consumeDailyQuota(
          `seo:url-inspection:daily:${input.data.projectId}`,
          100,
          "Google URL Inspection daily limit reached for this site",
        );
        const access = await googleToken(
          environment,
          db,
          input.data.projectId,
          "search_console",
        );
        const inspected = await googleJson<any>(
          "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
          access.accessToken,
          {
            method: "POST",
            body: JSON.stringify({
              inspectionUrl: target.url,
              siteUrl,
              languageCode: "en-US",
            }),
          },
        );
        return {
          url: target.url,
          property: siteUrl,
          result: inspected.inspectionResult ?? null,
          checkedAt: new Date().toISOString(),
        };
      },
    );
    response.json(result);
  });

  router.post("/seo/competitors", async (request, response) => {
    const currentUser = await user(request);
    const projectId = z.string().uuid().safeParse(request.body?.projectId);
    if (!projectId.success)
      throw new HttpError(
        400,
        "A valid projectId is required",
        "validation_error",
      );
    await authz.project(projectId.data, currentUser.id, "content:write");
    const domains = await db.query.siteDomains.findMany({
      where: and(
        eq(schema.siteDomains.projectId, projectId.data),
        eq(schema.siteDomains.isVerified, true),
      ),
      orderBy: [desc(schema.siteDomains.isPrimary)],
      limit: 10,
    });
    const siteDomain = domains[0]?.hostname.toLowerCase().replace(/\.$/, "");
    if (
      !siteDomain ||
      !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(
        siteDomain,
      )
    )
      throw new HttpError(
        409,
        "Add and verify a public site domain before researching competitors",
        "seo_verified_domain_required",
      );
    const reservation = await reserveProviderBudget(
      projectId.data,
      "competitors",
      0.05,
    );
    try {
      const result = await dataForSeo("backlinks/competitors/live", [
        { target: siteDomain, include_subdomains: true, limit: 100 },
      ]);
      await releaseProviderBudget(reservation.id, result.cost ?? 0.05);
      const rows = (result.task.result?.[0]?.items ?? [])
        .slice(0, 100)
        .map((item: any) => ({
          domain: String(item.domain ?? item.target ?? ""),
          rank: Number(item.rank ?? 0),
          commonKeywords: Number(item.common_keywords ?? 0),
          organicKeywords: Number(item.organic_keywords ?? 0),
          backlinks: Number(item.backlinks ?? 0),
          referringDomains: Number(item.referring_domains ?? 0),
        }));
      response.json({
        provider: "DataForSEO",
        domain: siteDomain,
        competitors: rows,
        costUsd: result.cost,
        checkedAt: new Date().toISOString(),
      });
    } catch (error) {
      await releaseProviderBudget(reservation.id, null);
      throw error;
    }
  });

  router.post("/seo/serps", async (request, response) => {
    const currentUser = await user(request);
    const input = z
      .object({
        projectId: z.string().uuid(),
        requestId: z.string().uuid(),
        keyword: z.string().trim().min(1).max(120),
        locationCode: z.number().int().positive().max(1_000_000).default(2840),
        languageCode: z
          .string()
          .regex(/^[a-z]{2}$/)
          .default("en"),
      })
      .safeParse(request.body);
    if (!input.success)
      throw new HttpError(400, "Invalid SERP request", "validation_error");
    await authz.project(input.data.projectId, currentUser.id, "content:write");
    if (
      !environment.DATAFORSEO_LOGIN?.trim() ||
      !environment.DATAFORSEO_PASSWORD?.trim()
    )
      throw new HttpError(
        503,
        "Paid SEO research is not configured",
        "seo_provider_unavailable",
      );
    const taskInput = {
      keyword: input.data.keyword,
      locationCode: input.data.locationCode,
      languageCode: input.data.languageCode,
    };
    const retentionCutoff = new Date(Date.now() - 30 * 24 * 60 * 60_000);
    await db
      .delete(schema.seoProviderTasks)
      .where(
        and(
          eq(schema.seoProviderTasks.projectId, input.data.projectId),
          lt(schema.seoProviderTasks.createdAt, retentionCutoff),
          inArray(schema.seoProviderTasks.status, [
            "completed",
            "failed",
            "expired",
          ]),
        ),
      );
    const existing = await db.query.seoProviderTasks.findFirst({
      where: and(
        eq(schema.seoProviderTasks.projectId, input.data.projectId),
        eq(schema.seoProviderTasks.requestId, input.data.requestId),
      ),
    });
    if (existing) {
      if (JSON.stringify(existing.input) !== JSON.stringify(taskInput))
        throw new HttpError(
          409,
          "This request ID was already used for a different SERP lookup",
          "seo_idempotency_conflict",
        );
      if (
        existing.status === "submitting" &&
        existing.createdAt.getTime() < Date.now() - 60_000
      ) {
        if (existing.usageId)
          await releaseProviderBudget(existing.usageId, SERP_RESERVE_USD);
        const [stale] = await db
          .update(schema.seoProviderTasks)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(schema.seoProviderTasks.id, existing.id))
          .returning();
        response.status(200).json({ task: serializeSerpTask(stale) });
        return;
      }
      response
        .status(
          ["completed", "failed", "expired"].includes(existing.status)
            ? 200
            : 202,
        )
        .json({ task: serializeSerpTask(existing) });
      return;
    }
    const reservation = await reserveProviderBudget(
      input.data.projectId,
      "serp",
      SERP_RESERVE_USD,
    );
    const [taskRecord] = await db
      .insert(schema.seoProviderTasks)
      .values({
        projectId: input.data.projectId,
        requestId: input.data.requestId,
        operation: "serp",
        input: taskInput,
        status: "submitting",
        usageId: reservation.id,
        expiresAt: new Date(Date.now() + 2 * 60 * 60_000),
      })
      .onConflictDoNothing()
      .returning();
    if (!taskRecord) {
      await releaseProviderBudget(reservation.id, null);
      const raced = await db.query.seoProviderTasks.findFirst({
        where: and(
          eq(schema.seoProviderTasks.projectId, input.data.projectId),
          eq(schema.seoProviderTasks.requestId, input.data.requestId),
        ),
      });
      if (!raced)
        throw new HttpError(
          503,
          "Could not create SERP task",
          "seo_task_unavailable",
        );
      if (JSON.stringify(raced.input) !== JSON.stringify(taskInput))
        throw new HttpError(
          409,
          "This request ID was already used for a different SERP lookup",
          "seo_idempotency_conflict",
        );
      response
        .status(
          ["completed", "failed", "expired"].includes(raced.status) ? 200 : 202,
        )
        .json({ task: serializeSerpTask(raced) });
      return;
    }
    try {
      const result = await dataForSeo("serp/google/organic/task_post", [
        {
          keyword: input.data.keyword,
          location_code: input.data.locationCode,
          language_code: input.data.languageCode,
          device: "desktop",
          os: "windows",
        },
      ]);
      const providerTaskId = String(result.task.id ?? "");
      if (!providerTaskId)
        throw new HttpError(
          502,
          "SEO provider did not return a task ID",
          "seo_provider_failed",
        );
      await db
        .update(schema.seoProviderUsage)
        .set({ status: "pending" })
        .where(eq(schema.seoProviderUsage.id, reservation.id));
      const [updated] = await db
        .update(schema.seoProviderTasks)
        .set({ providerTaskId, status: "queued", updatedAt: new Date() })
        .where(eq(schema.seoProviderTasks.id, taskRecord.id))
        .returning();
      response.status(202).json({
        task: serializeSerpTask(updated),
        provider: "DataForSEO",
        estimatedCostUsd: result.cost ?? 0.0006,
      });
    } catch (error) {
      // A timeout can happen after the provider accepted the task. Keep the
      // small reservation in the ledger so uncertain requests cannot bypass
      // the monthly budget.
      await releaseProviderBudget(reservation.id, SERP_RESERVE_USD);
      await db
        .update(schema.seoProviderTasks)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(schema.seoProviderTasks.id, taskRecord.id));
      throw error;
    }
  });

  router.get("/seo/serps/:id", async (request, response) => {
    const currentUser = await user(request);
    const projectId = projectQuery.safeParse(request.query.projectId);
    const taskId = z.string().uuid().safeParse(request.params.id);
    if (!projectId.success || !taskId.success)
      throw new HttpError(
        400,
        "A valid projectId and task ID are required",
        "validation_error",
      );
    await authz.project(projectId.data, currentUser.id, "content:read");
    const task = await db.query.seoProviderTasks.findFirst({
      where: and(
        eq(schema.seoProviderTasks.id, taskId.data),
        eq(schema.seoProviderTasks.projectId, projectId.data),
      ),
    });
    if (!task) throw new HttpError(404, "SERP task not found");
    if (
      task.status === "completed" ||
      task.status === "failed" ||
      task.status === "expired"
    ) {
      response.json({ task: serializeSerpTask(task) });
      return;
    }
    if (task.expiresAt <= new Date()) {
      if (task.usageId)
        await releaseProviderBudget(task.usageId, SERP_RESERVE_USD);
      const [expired] = await db
        .update(schema.seoProviderTasks)
        .set({ status: "expired", updatedAt: new Date() })
        .where(eq(schema.seoProviderTasks.id, task.id))
        .returning();
      response.json({ task: serializeSerpTask(expired) });
      return;
    }
    if (!task.providerTaskId) {
      if (
        task.status === "submitting" &&
        task.createdAt.getTime() >= Date.now() - 60_000
      ) {
        response.status(202).json({ task: serializeSerpTask(task) });
        return;
      }
      if (task.usageId)
        await releaseProviderBudget(task.usageId, SERP_RESERVE_USD);
      const [failed] = await db
        .update(schema.seoProviderTasks)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(schema.seoProviderTasks.id, task.id))
        .returning();
      response.json({ task: serializeSerpTask(failed) });
      return;
    }
    let provider: Awaited<ReturnType<typeof dataForSeoGet>>;
    try {
      provider = await dataForSeoGet(
        `serp/google/organic/task_get/advanced/${encodeURIComponent(task.providerTaskId)}`,
      );
    } catch {
      response
        .status(202)
        .json({ task: serializeSerpTask(task), retryAfterSeconds: 15 });
      return;
    }
    const providerStatus = Number(provider.task.status_code);
    const outcome = serpTaskOutcome(providerStatus, !!provider.task.result);
    if (outcome === "failed") {
      const cost = provider.cost ?? SERP_RESERVE_USD;
      if (task.usageId) await releaseProviderBudget(task.usageId, cost);
      const [failed] = await db
        .update(schema.seoProviderTasks)
        .set({
          costUsd: cost.toFixed(6),
          status: "failed",
          updatedAt: new Date(),
        })
        .where(eq(schema.seoProviderTasks.id, task.id))
        .returning();
      response.json({ task: serializeSerpTask(failed) });
      return;
    }
    if (outcome === "pending") {
      response
        .status(202)
        .json({ task: serializeSerpTask(task), retryAfterSeconds: 15 });
      return;
    }
    const rows = organicSerpRows(provider.task.result?.[0]?.items ?? []);
    const cost = provider.cost ?? SERP_RESERVE_USD;
    if (task.usageId) await releaseProviderBudget(task.usageId, cost);
    const [completed] = await db
      .update(schema.seoProviderTasks)
      .set({
        status: "completed",
        result: rows,
        costUsd: cost.toFixed(6),
        updatedAt: new Date(),
      })
      .where(eq(schema.seoProviderTasks.id, task.id))
      .returning();
    response.json({
      task: serializeSerpTask(completed),
      provider: "DataForSEO",
    });
  });

  router.get("/seo/ai/suggestions", async (request, response) => {
    const projectId = await projectIdFrom(request);
    const suggestions = await db.query.seoAiSuggestions.findMany({
      where: eq(schema.seoAiSuggestions.projectId, projectId),
      orderBy: [desc(schema.seoAiSuggestions.createdAt)],
      limit: 100,
    });
    response.json({ suggestions });
  });

  router.post("/seo/ai/suggestions", async (request, response) => {
    const currentUser = await user(request);
    const input = z
      .object({
        projectId: z.string().uuid(),
        targetType: z.enum(["page", "product", "collection", "blog"]),
        targetId: z.string().uuid(),
        field: z.enum(["metaTitle", "metaDescription"]),
        keyword: z.string().trim().max(120).optional(),
      })
      .safeParse(request.body);
    if (!input.success)
      throw new HttpError(
        400,
        "Invalid SEO suggestion request",
        "validation_error",
      );
    await authz.project(input.data.projectId, currentUser.id, "content:write");
    const records = await recordsFor(input.data.projectId);
    const record = records.find(
      (item) =>
        item.id === input.data.targetId && item.type === input.data.targetType,
    );
    if (!record) throw new HttpError(404, "Content record not found");
    const beforeValue =
      input.data.field === "metaTitle"
        ? record.metaTitle
        : record.metaDescription;
    const maxLength = input.data.field === "metaTitle" ? 60 : 160;
    const generated = await withAiCredits(db, {
      projectId: input.data.projectId,
      actorId: currentUser.id,
      clientKey: requestAiIdempotencyKey(request),
      action: "generate_metadata",
    }, () => processPrompt(
      "You are an SEO editor. Return only a JSON object with keys after and rationale. Write accurate metadata based only on supplied content. Never invent product claims, prices, locations, or facts. Keep after within the requested character limit.",
      JSON.stringify({
        field: input.data.field,
        characterLimit: maxLength,
        pageTitle: record.title,
        slug: record.slug,
        currentValue: beforeValue,
        keyword: input.data.keyword || null,
        content: record.body?.slice(0, 6000) ?? null,
      }),
    ));
    let parsed: { after?: unknown; rationale?: unknown };
    try {
      const responseText = generated
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "");
      parsed = JSON.parse(responseText) as typeof parsed;
    } catch {
      throw new HttpError(
        502,
        "AI returned an invalid suggestion",
        "seo_ai_invalid_response",
      );
    }
    const afterValue = z
      .string()
      .trim()
      .min(1)
      .max(maxLength)
      .safeParse(parsed.after);
    const rationale = z
      .string()
      .trim()
      .min(1)
      .max(1000)
      .safeParse(parsed.rationale);
    if (!afterValue.success || !rationale.success)
      throw new HttpError(
        502,
        "AI returned metadata outside the allowed limits",
        "seo_ai_invalid_response",
      );
    const [suggestion] = await db
      .insert(schema.seoAiSuggestions)
      .values({
        projectId: input.data.projectId,
        targetType: input.data.targetType,
        targetId: input.data.targetId,
        field: input.data.field,
        beforeValue,
        afterValue: afterValue.data,
        rationale: rationale.data,
        createdBy: currentUser.id,
      })
      .returning();
    response.status(201).json({ suggestion });
  });

  router.post("/seo/ai/suggestions/:id/apply", async (request, response) => {
    const currentUser = await user(request);
    const suggestionId = z.string().uuid().safeParse(request.params.id);
    const projectId = z.string().uuid().safeParse(request.body?.projectId);
    if (!suggestionId.success || !projectId.success)
      throw new HttpError(
        400,
        "Valid suggestion and project IDs are required",
        "validation_error",
      );
    await authz.project(projectId.data, currentUser.id, "content:write");
    const result = await db.transaction(async (tx) => {
      const suggestion = await tx.query.seoAiSuggestions.findFirst({
        where: and(
          eq(schema.seoAiSuggestions.id, suggestionId.data),
          eq(schema.seoAiSuggestions.projectId, projectId.data),
        ),
      });
      if (!suggestion) throw new HttpError(404, "Suggestion not found");
      if (suggestion.status !== "pending")
        throw new HttpError(
          409,
          "This suggestion has already been reviewed",
          "seo_suggestion_not_pending",
        );
      if (!["metaTitle", "metaDescription"].includes(suggestion.field))
        throw new HttpError(
          409,
          "Suggestion contains an unsupported metadata field",
          "seo_suggestion_invalid",
        );
      const table =
        suggestion.targetType === "page"
          ? schema.pages
          : suggestion.targetType === "product"
            ? schema.products
            : suggestion.targetType === "collection"
              ? schema.productCategories
              : suggestion.targetType === "blog"
                ? schema.blogs
                : null;
      if (!table) throw new HttpError(400, "Unsupported content type");
      const queryName =
        suggestion.targetType === "page"
          ? "pages"
          : suggestion.targetType === "product"
            ? "products"
            : suggestion.targetType === "collection"
              ? "productCategories"
              : "blogs";
      const target = (await (tx.query as any)[queryName].findFirst({
        where: and(
          eq((table as any).id, suggestion.targetId),
          eq((table as any).projectId, projectId.data),
        ),
      })) as any;
      if (!target) throw new HttpError(404, "Content record no longer exists");
      const column =
        suggestion.targetType === "product"
          ? suggestion.field === "metaTitle"
            ? "seoTitle"
            : "seoDescription"
          : suggestion.field;
      if (target[column] !== suggestion.beforeValue)
        throw new HttpError(
          409,
          "Content changed after this suggestion was created. Generate a fresh suggestion.",
          "seo_suggestion_stale",
        );
      const [changed] = await tx
        .update(table)
        .set({ [column]: suggestion.afterValue, updatedAt: new Date() } as any)
        .where(
          and(
            eq((table as any).id, suggestion.targetId),
            eq((table as any).projectId, projectId.data),
            suggestion.beforeValue === null
              ? isNull((table as any)[column])
              : eq((table as any)[column], suggestion.beforeValue),
          ),
        )
        .returning({ id: (table as any).id });
      if (!changed)
        throw new HttpError(
          409,
          "Content changed after this suggestion was created. Generate a fresh suggestion.",
          "seo_suggestion_stale",
        );
      const [updatedSuggestion] = await tx
        .update(schema.seoAiSuggestions)
        .set({ status: "applied", appliedAt: new Date() })
        .where(
          and(
            eq(schema.seoAiSuggestions.id, suggestion.id),
            eq(schema.seoAiSuggestions.status, "pending"),
          ),
        )
        .returning();
      if (!updatedSuggestion)
        throw new HttpError(
          409,
          "This suggestion has already been reviewed",
          "seo_suggestion_not_pending",
        );
      return updatedSuggestion;
    });
    response.json({ suggestion: result });
  });

  router.post("/seo/ai/suggestions/:id/dismiss", async (request, response) => {
    const currentUser = await user(request);
    const suggestionId = z.string().uuid().safeParse(request.params.id);
    const projectId = z.string().uuid().safeParse(request.body?.projectId);
    if (!suggestionId.success || !projectId.success)
      throw new HttpError(
        400,
        "Valid suggestion and project IDs are required",
        "validation_error",
      );
    await authz.project(projectId.data, currentUser.id, "content:write");
    const [suggestion] = await db
      .update(schema.seoAiSuggestions)
      .set({ status: "dismissed" })
      .where(
        and(
          eq(schema.seoAiSuggestions.id, suggestionId.data),
          eq(schema.seoAiSuggestions.projectId, projectId.data),
          eq(schema.seoAiSuggestions.status, "pending"),
        ),
      )
      .returning();
    if (!suggestion) throw new HttpError(404, "Pending suggestion not found");
    response.json({ suggestion });
  });

  return router;
}
