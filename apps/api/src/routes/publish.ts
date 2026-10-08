import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { and, count, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { createDb, schema } from "@velozy/db";
import type { Environment } from "../config/env.js";
import { HttpError } from "../middleware/errors.js";
import { publicSiteUrl } from "../lib/public-site-url.js";
import { adminAccess } from "../lib/admin-auth.js";
import { requireProjectPlanLimit } from "../lib/platform-billing.js";

const inputSchema = z.object({ projectId: z.string().uuid(), pageId: z.string().uuid() });
const slug = (name: string) => name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 45) || "site";

function referencedFormIds(value: unknown, found = new Set<string>()): string[] {
  if (!value || typeof value !== "object") return [...found];
  if (Array.isArray(value)) { for (const item of value) referencedFormIds(item, found); return [...found]; }
  const record = value as Record<string, any>;
  const type = typeof record.type === "string" ? record.type : record.type?.resolvedName;
  if (type?.toLowerCase() === "form" && typeof record.props?.formId === "string") found.add(record.props.formId);
  for (const item of Object.values(record)) referencedFormIds(item, found);
  return [...found];
}

export function publishRouter(environment: Environment): ExpressRouter {
  const db = createDb(environment.DATABASE_URL);
  const authz = adminAccess(environment.DATABASE_URL);
  const router = Router();

  router.post("/", async (request, response) => {
    const input = inputSchema.safeParse(request.body);
    if (!input.success) throw new HttpError(400, "Valid projectId and pageId are required");
    if (!request.auth?.userId) throw new HttpError(401, "Unauthorized");
    const project = await authz.project(input.data.projectId, request.auth.userId, "publish");
    const { allowance: publishedPageLimit } = await requireProjectPlanLimit(db, project.id, "published_pages");
    const page = await db.query.pages.findFirst({ where: and(eq(schema.pages.id, input.data.pageId), eq(schema.pages.projectId, project.id)) });
    if (!page?.pageData) throw new HttpError(400, "Save page content before publishing");
    if (page.status !== "published") {
      const [published] = await db.select({ count: count() }).from(schema.pages).where(and(eq(schema.pages.projectId, project.id), eq(schema.pages.status, "published")));
      if (Number(published?.count ?? 0) >= publishedPageLimit) throw new HttpError(409, "This plan's published page limit has been reached", "published_page_limit");
    }
    const formIds = referencedFormIds(page.pageData);
    if (formIds.length) {
      if (formIds.some((formId) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(formId))) throw new HttpError(409, "This page contains an invalid form reference. Replace it with an active form before publishing.", "form_unavailable");
      const activeForms = await db.query.forms.findMany({ where: and(inArray(schema.forms.id, formIds), eq(schema.forms.projectId, project.id), eq(schema.forms.status, "active")), columns: { id: true } });
      if (activeForms.length !== formIds.length) throw new HttpError(409, "This page uses a missing or archived form. Replace it with an active form before publishing.", "form_unavailable");
    }

    const platformDomain = process.env.PLATFORM_DOMAIN || "localhost:3002";
    const base = slug(project.name);
    let subdomain = project.subdomain || base;
    let hostname = `${subdomain}.${platformDomain}`.toLowerCase().split(":")[0];
    for (let suffix = 2; ; suffix++) {
      const taken = await db.query.siteDomains.findFirst({ where: eq(schema.siteDomains.hostname, hostname) });
      if (!taken || taken.projectId === project.id) break;
      subdomain = `${base.slice(0, 45 - String(suffix).length - 1)}-${suffix}`;
      hostname = `${subdomain}.${platformDomain}`.toLowerCase().split(":")[0];
    }

    const now = new Date();
    const customDomain = await db.query.siteDomains.findFirst({ where: and(eq(schema.siteDomains.projectId, project.id), eq(schema.siteDomains.isCustom, true), eq(schema.siteDomains.isVerified, true)), columns: { id: true, hostname: true } });
    await db.transaction(async (tx) => {
      await tx.update(schema.siteDomains).set({ isPrimary: false, updatedAt: now }).where(eq(schema.siteDomains.projectId, project.id));
      await tx.update(schema.pages).set({ publishedPageData: page.pageData, status: "published", updatedAt: now }).where(eq(schema.pages.id, page.id));
      await tx.insert(schema.siteDomains).values({ projectId: project.id, hostname, isPrimary: !customDomain, isVerified: true }).onConflictDoNothing();
      await tx.update(schema.siteDomains).set({ isPrimary: !customDomain, updatedAt: now }).where(and(eq(schema.siteDomains.projectId, project.id), eq(schema.siteDomains.hostname, hostname)));
      if (customDomain) await tx.update(schema.siteDomains).set({ isPrimary: true, updatedAt: now }).where(eq(schema.siteDomains.id, customDomain.id));
      await tx.update(schema.projects).set({ isPublished: true, publishedAt: now, publishedVersion: project.publishedVersion + 1, subdomain, updatedAt: now }).where(eq(schema.projects.id, project.id));
    });
    response.json({ success: true, projectId: project.id, subdomain, url: customDomain ? `https://${customDomain.hostname}` : publicSiteUrl(subdomain), platformUrl: publicSiteUrl(subdomain), publishedAt: now.toISOString(), version: project.publishedVersion + 1 });
  });
  return router;
}
