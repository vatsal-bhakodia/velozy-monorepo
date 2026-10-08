import { Queue } from "bullmq";
import { createClient } from "@supabase/supabase-js";
import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { Router } from "express";
import type { Request, Router as ExpressRouter } from "express";
import { z } from "zod";
import { createDb, schema } from "@velozy/db";
import { randomUUID } from "node:crypto";
import type { Environment } from "../../config/env.js";
import { adminAccess } from "../../lib/admin-auth.js";
import { HttpError } from "../../middleware/errors.js";
import { processSeoCampaignImage } from "../../lib/seo-campaign-image.js";

const uuid = z.string().uuid();
const profileInput = z.object({
  businessName: z.string().trim().min(1).max(255),
  industry: z.string().trim().max(255).default(""),
  description: z.string().trim().max(4000).default(""),
  offerings: z.array(z.string().trim().min(1).max(200)).max(30).default([]),
  markets: z.array(z.string().trim().min(1).max(160)).max(20).default([]),
  languages: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  goals: z.array(z.string().trim().min(1).max(100)).max(10).default([]),
  audience: z.string().trim().max(1000).default(""),
  tone: z.string().trim().max(500).default(""),
  restrictions: z.array(z.string().trim().min(1).max(300)).max(30).default([]),
});

function parse<T extends z.ZodTypeAny>(validator: T, value: unknown): z.infer<T> {
  const result = validator.safeParse(value);
  if (!result.success)
    throw new HttpError(400, result.error.issues[0]?.message || "Invalid request", "validation_error");
  return result.data as z.infer<T>;
}

export function normalizeDomain(value: string) {
  let url: URL;
  try {
    url = new URL(value.includes("://") ? value : `https://${value}`);
  } catch {
    throw new HttpError(400, "Enter a valid competitor domain", "invalid_domain");
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    host.length > 253 ||
    !host.includes(".") ||
    host === "localhost" ||
    /^\d+(\.\d+){3}$/.test(host) ||
    !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host)
  ) throw new HttpError(400, "Enter a public HTTPS domain", "invalid_domain");
  return host;
}

function safeSlug(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 255) || "seo-content";
}

export function adminSeoCampaignRouter(
  environment: Environment,
  queue: Queue,
): ExpressRouter {
  const db = createDb(environment.DATABASE_URL);
  const authz = adminAccess(environment.DATABASE_URL);
  const storage = createClient(environment.SUPABASE_URL, environment.SUPABASE_SERVICE_ROLE_KEY).storage.from(environment.SUPABASE_MEDIA_BUCKET);
  const router = Router();
  const currentUser = async (request: Request) => {
    if (!request.auth?.userId) throw new HttpError(401, "Unauthorized");
    const user = await db.query.users.findFirst({ where: eq(schema.users.id, request.auth.userId) });
    if (!user) throw new HttpError(404, "User not found");
    return user;
  };
  const projectAndCampaign = async (request: Request, rawProjectId: unknown, write = false) => {
    const projectId = parse(uuid, rawProjectId);
    const user = await currentUser(request);
    const project = await authz.project(projectId, user.id, write ? "content:write" : "content:read");
    let campaign = await db.query.seoCampaigns.findFirst({ where: eq(schema.seoCampaigns.projectId, project.id) });
    if (!campaign && write)
      [campaign] = await db.insert(schema.seoCampaigns).values({ projectId: project.id }).onConflictDoNothing({ target: schema.seoCampaigns.projectId }).returning();
    if (!campaign)
      campaign = await db.query.seoCampaigns.findFirst({ where: eq(schema.seoCampaigns.projectId, project.id) });
    return { project, campaign, user };
  };
  const ensureCampaign = async (request: Request, projectId: unknown, write = false) => {
    const result = await projectAndCampaign(request, projectId, write);
    if (!result.campaign) throw new HttpError(404, "SEO campaign not found");
    return result as typeof result & { campaign: NonNullable<typeof result.campaign> };
  };

  router.get("/seo/campaign", async (request, response) => {
    const projectId = parse(uuid, request.query.projectId);
    const user = await currentUser(request);
    const project = await authz.project(projectId, user.id, "content:read");
    let campaign = await db.query.seoCampaigns.findFirst({ where: eq(schema.seoCampaigns.projectId, project.id) });
    const [products, categories, domains] = await Promise.all([
      db.query.products.findMany({ where: eq(schema.products.projectId, project.id), columns: { name: true }, limit: 50 }),
      db.query.productCategories.findMany({ where: eq(schema.productCategories.projectId, project.id), columns: { name: true }, limit: 50 }),
      db.query.siteDomains.findMany({ where: eq(schema.siteDomains.projectId, project.id), columns: { hostname: true, isVerified: true } }),
    ]);
    const suggestedProfile = {
      businessName: project.name,
      industry: project.industry || "",
      description: "",
      offerings: [...new Set([...products.map((item) => item.name), ...categories.map((item) => item.name)])].slice(0, 30),
      markets: [],
      languages: [],
      goals: [],
      audience: "",
      tone: "",
      restrictions: [],
    };
    if (!campaign) {
      await db.insert(schema.seoCampaigns).values({ projectId: project.id }).onConflictDoNothing({ target: schema.seoCampaigns.projectId });
      campaign = await db.query.seoCampaigns.findFirst({ where: eq(schema.seoCampaigns.projectId, project.id) });
    }
    if (!campaign) throw new HttpError(500, "Could not initialize SEO campaign");
    const [competitors, jobs, opportunities, researchRuns] = await Promise.all([
      db.query.seoCampaignCompetitors.findMany({ where: eq(schema.seoCampaignCompetitors.campaignId, campaign.id), orderBy: [desc(schema.seoCampaignCompetitors.createdAt)] }),
      db.query.seoCampaignJobs.findMany({ where: eq(schema.seoCampaignJobs.campaignId, campaign.id), orderBy: [desc(schema.seoCampaignJobs.createdAt)], limit: 20 }),
      db.query.seoCampaignOpportunities.findMany({ where: eq(schema.seoCampaignOpportunities.campaignId, campaign.id), orderBy: [sql`${schema.seoCampaignOpportunities.score} DESC NULLS LAST`, desc(schema.seoCampaignOpportunities.createdAt)], limit: 100 }),
      db.query.seoCampaignResearchRuns.findMany({ where: eq(schema.seoCampaignResearchRuns.campaignId, campaign.id), orderBy: [desc(schema.seoCampaignResearchRuns.version)], limit: 20 }),
    ]);
    response.json({ campaign, suggestedProfile, domains, competitors, jobs, opportunities, researchRuns });
  });

  router.put("/seo/campaign/profile", async (request, response) => {
    const input = parse(z.object({ projectId: uuid, profile: profileInput }), request.body);
    const { campaign, user } = await ensureCampaign(request, input.projectId, true);
    const [updated] = await db.update(schema.seoCampaigns).set({
      profile: input.profile,
      profileConfirmedAt: new Date(),
      profileConfirmedBy: user.id,
      status: "ready",
      updatedAt: new Date(),
    }).where(eq(schema.seoCampaigns.id, campaign.id)).returning();
    response.json({ campaign: updated });
  });

  router.post("/seo/campaign/competitors", async (request, response) => {
    const input = parse(z.object({ projectId: uuid, domain: z.string().trim().min(1).max(2048), classification: z.enum(["direct_business", "search_competitor", "directory", "publisher"]).default("search_competitor") }), request.body);
    const { campaign, user } = await ensureCampaign(request, input.projectId, true);
    const domain = normalizeDomain(input.domain);
    const [competitor] = await db.insert(schema.seoCampaignCompetitors).values({ campaignId: campaign.id, domain, classification: input.classification, status: "candidate", evidence: { source: "user_added" } }).onConflictDoUpdate({ target: [schema.seoCampaignCompetitors.campaignId, schema.seoCampaignCompetitors.domain], set: { classification: input.classification, updatedAt: new Date() } }).returning();
    response.status(201).json({ competitor });
  });

  router.patch("/seo/campaign/competitors/:id", async (request, response) => {
    const input = parse(z.object({ projectId: uuid, status: z.enum(["approved", "rejected"]) }), request.body);
    const { campaign, user } = await ensureCampaign(request, input.projectId, true);
    const id = parse(uuid, request.params.id);
    const [competitor] = await db.update(schema.seoCampaignCompetitors).set({ status: input.status, verifiedAt: input.status === "approved" ? new Date() : null, verifiedBy: user.id, updatedAt: new Date() }).where(and(eq(schema.seoCampaignCompetitors.id, id), eq(schema.seoCampaignCompetitors.campaignId, campaign.id))).returning();
    if (!competitor) throw new HttpError(404, "Competitor candidate not found");
    response.json({ competitor });
  });

  router.patch("/seo/campaign/opportunities/:id/approval", async (request, response) => {
    const input = parse(z.object({ projectId: uuid, status: z.enum(["approved", "rejected"]) }), request.body);
    const { campaign, project, user } = await ensureCampaign(request, input.projectId, true);
    if (project.userId !== user.id) throw new HttpError(403, "Only the project owner can approve the campaign strategy", "campaign_owner_required");
    const opportunityId = parse(uuid, request.params.id);
    const opportunity = await db.query.seoCampaignOpportunities.findFirst({ where: and(eq(schema.seoCampaignOpportunities.id, opportunityId), eq(schema.seoCampaignOpportunities.campaignId, campaign.id)) });
    if (!opportunity) throw new HttpError(404, "Opportunity not found");
    const [updated] = await db.update(schema.seoCampaignOpportunities).set({ approvedAt: input.status === "approved" ? new Date() : null, approvedBy: input.status === "approved" ? user.id : null, updatedAt: new Date() }).where(eq(schema.seoCampaignOpportunities.id, opportunity.id)).returning();
    response.json({ opportunity: updated });
  });

  router.post("/seo/campaign/research", async (request, response) => {
    const input = parse(z.object({ projectId: uuid, idempotencyKey: z.string().trim().min(1).max(100).optional() }), request.body);
    const { campaign, user } = await ensureCampaign(request, input.projectId, true);
    if (!campaign.profileConfirmedAt) throw new HttpError(409, "Confirm the business profile before starting research", "campaign_profile_unconfirmed");
    const idempotencyKey = input.idempotencyKey || randomUUID();
    const created = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${campaign.id}))`);
      const active = await tx.query.seoCampaignJobs.findFirst({ where: and(eq(schema.seoCampaignJobs.campaignId, campaign.id), eq(schema.seoCampaignJobs.kind, "research"), inArray(schema.seoCampaignJobs.status, ["queued", "running"])) });
      if (active) return { job: active, run: null };
      const existing = await tx.query.seoCampaignJobs.findFirst({ where: and(eq(schema.seoCampaignJobs.campaignId, campaign.id), eq(schema.seoCampaignJobs.idempotencyKey, idempotencyKey)) });
      if (existing) return { job: existing, run: null };
      const [latest] = await tx.select({ version: sql<number>`coalesce(max(${schema.seoCampaignResearchRuns.version}), 0)` }).from(schema.seoCampaignResearchRuns).where(eq(schema.seoCampaignResearchRuns.campaignId, campaign.id));
      const [run] = await tx.insert(schema.seoCampaignResearchRuns).values({ campaignId: campaign.id, version: Number(latest?.version || 0) + 1, status: "queued", profileSnapshot: campaign.profile, locale: { markets: (campaign.profile as Record<string, unknown>).markets || [], languages: (campaign.profile as Record<string, unknown>).languages || [] } }).returning();
      const [job] = await tx.insert(schema.seoCampaignJobs).values({ campaignId: campaign.id, kind: "research", status: "queued", input: { runId: run.id }, idempotencyKey, createdBy: user.id }).returning();
      return { job, run };
    });
    if (!created.run) return response.status(202).json({ job: created.job });
    const job = created.job;
    let queueJob;
    try {
      queueJob = await queue.add("research", { campaignJobId: job.id }, { jobId: job.id, attempts: 3, backoff: { type: "exponential", delay: 30_000 }, removeOnComplete: 100, removeOnFail: 500 });
    } catch (cause) {
      await db.update(schema.seoCampaignJobs).set({ status: "failed", lastError: "Could not add research to the job queue", updatedAt: new Date() }).where(eq(schema.seoCampaignJobs.id, job.id));
      await db.update(schema.seoCampaignResearchRuns).set({ status: "failed", lastError: "Could not add research to the job queue", completedAt: new Date() }).where(eq(schema.seoCampaignResearchRuns.id, created.run.id));
      throw cause;
    }
    await db.update(schema.seoCampaignJobs).set({ queueJobId: String(queueJob.id), updatedAt: new Date() }).where(eq(schema.seoCampaignJobs.id, job.id));
    await db.update(schema.seoCampaigns).set({ status: "researching", updatedAt: new Date() }).where(eq(schema.seoCampaigns.id, campaign.id));
    response.status(202).json({ job: { ...job, queueJobId: String(queueJob.id) }, researchRun: created.run });
  });

  router.post("/seo/campaign/opportunities/:id/generate", async (request, response) => {
    const input = parse(z.object({ projectId: uuid, idempotencyKey: z.string().trim().min(1).max(100).optional() }), request.body);
    const { campaign, user } = await ensureCampaign(request, input.projectId, true);
    const opportunityId = parse(uuid, request.params.id);
    const opportunity = await db.query.seoCampaignOpportunities.findFirst({ where: and(eq(schema.seoCampaignOpportunities.id, opportunityId), eq(schema.seoCampaignOpportunities.campaignId, campaign.id)) });
    if (!opportunity) throw new HttpError(404, "Opportunity not found");
    if (["published", "scheduled", "publishing"].includes(opportunity.status)) throw new HttpError(409, "This opportunity already has a publication", "campaign_already_published");
    const activeGeneration = await db.query.seoCampaignJobs.findFirst({ where: and(eq(schema.seoCampaignJobs.campaignId, campaign.id), eq(schema.seoCampaignJobs.kind, "generate"), inArray(schema.seoCampaignJobs.status, ["queued", "running"]), sql`${schema.seoCampaignJobs.input}->>'opportunityId' = ${opportunity.id}`) });
    if (activeGeneration) return response.status(202).json({ job: activeGeneration });
    const idempotencyKey = input.idempotencyKey || `generate:${opportunity.id}:${Date.now()}`;
    const existing = await db.query.seoCampaignJobs.findFirst({ where: and(eq(schema.seoCampaignJobs.campaignId, campaign.id), eq(schema.seoCampaignJobs.idempotencyKey, idempotencyKey)) });
    if (existing) return response.status(202).json({ job: existing });
    const [job] = await db.insert(schema.seoCampaignJobs).values({ campaignId: campaign.id, kind: "generate", status: "queued", input: { opportunityId }, idempotencyKey, createdBy: user.id }).returning();
    let queueJob;
    try {
      queueJob = await queue.add("generate", { campaignJobId: job.id }, { jobId: job.id, attempts: 3, backoff: { type: "exponential", delay: 30_000 }, removeOnComplete: 100, removeOnFail: 500 });
    } catch (cause) {
      await db.update(schema.seoCampaignJobs).set({ status: "failed", lastError: "Could not add content generation to the job queue", updatedAt: new Date() }).where(eq(schema.seoCampaignJobs.id, job.id));
      throw cause;
    }
    await db.update(schema.seoCampaignJobs).set({ queueJobId: String(queueJob.id), updatedAt: new Date() }).where(eq(schema.seoCampaignJobs.id, job.id));
    response.status(202).json({ job: { ...job, queueJobId: String(queueJob.id) } });
  });

  router.post("/seo/campaign/opportunities/:id/image", async (request, response) => {
    const input = parse(z.object({ projectId: uuid, query: z.string().trim().min(2).max(300) }), request.body);
    const { campaign, project, user } = await ensureCampaign(request, input.projectId, true);
    await authz.project(project.id, user.id, "media:write");
    const opportunityId = parse(uuid, request.params.id);
    const opportunity = await db.query.seoCampaignOpportunities.findFirst({ where: and(eq(schema.seoCampaignOpportunities.id, opportunityId), eq(schema.seoCampaignOpportunities.campaignId, campaign.id)) });
    if (!opportunity?.draft) throw new HttpError(409, "Generate a draft before sourcing an image", "campaign_draft_required");
    const pexelsKey = process.env.PEXELS_API_KEY?.trim();
    if (!pexelsKey) throw new HttpError(503, "Pexels image search is not configured", "image_provider_unavailable");
    const search = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(input.query)}&per_page=10&orientation=landscape`, { headers: { Authorization: pexelsKey }, signal: AbortSignal.timeout(15_000) });
    if (!search.ok) throw new HttpError(502, "Pexels image search failed", "image_provider_failed");
    const result = await search.json() as { photos?: Array<{ id: number; alt?: string; url: string; photographer?: string; photographer_url?: string; width: number; height: number; src?: { large2x?: string; large?: string; original?: string } }> };
    const photo = result.photos?.find((item) => item.width >= item.height) || result.photos?.[0];
    const imageUrl = photo?.src?.large2x || photo?.src?.large || photo?.src?.original;
    if (!photo || !imageUrl) throw new HttpError(404, "No suitable stock image was found", "image_not_found");
    const imageAddress = new URL(imageUrl);
    if (imageAddress.protocol !== "https:" || imageAddress.hostname !== "images.pexels.com") throw new HttpError(502, "Pexels returned an unsupported image host", "unsafe_image_source");
    const download = await fetch(imageAddress, { signal: AbortSignal.timeout(15_000) });
    if (!download.ok || !download.headers.get("content-type")?.startsWith("image/")) throw new HttpError(502, "Pexels image download failed", "image_download_failed");
    const sourceBuffer = Buffer.from(await download.arrayBuffer());
    if (!sourceBuffer.length || sourceBuffer.length > 15_000_000) throw new HttpError(413, "Pexels image exceeds the processing size limit", "image_too_large");
    let outputBuffer: Buffer;
    try {
      outputBuffer = await processSeoCampaignImage(sourceBuffer);
    } catch {
      throw new HttpError(422, "Image could not be safely processed; the source was not saved", "image_processing_failed");
    }
    const mediaId = randomUUID();
    const path = `${project.id}/seo-campaign/${mediaId}.webp`;
    const uploaded = await storage.upload(path, outputBuffer, { contentType: "image/webp", upsert: false });
    if (uploaded.error) throw new HttpError(502, "Processed image could not be stored", "image_storage_failed");
    const publicUrl = storage.getPublicUrl(path).data.publicUrl;
    let media: typeof schema.media.$inferSelect;
    try {
      media = await db.transaction(async (tx) => {
        const [record] = await tx.insert(schema.media).values({ id: mediaId, projectId: project.id, userId: user.id, name: photo.alt?.trim().slice(0, 255) || input.query, fileName: `${mediaId}.webp`, url: publicUrl, mimeType: "image/webp", mediaType: "image", size: outputBuffer.length, altText: photo.alt?.slice(0, 1000) || input.query }).returning();
        await tx.insert(schema.seoCampaignAssets).values({ campaignId: campaign.id, mediaId, source: { provider: "pexels", photoId: photo.id, sourceUrl: photo.url, photographer: photo.photographer || null, photographerUrl: photo.photographer_url || null, query: input.query, processedFormat: "image/webp", metadataStripped: true } });
        return record;
      });
    } catch (cause) {
      await storage.remove([path]).catch(() => undefined);
      throw cause;
    }
    const oldDraft = opportunity.draft as Record<string, unknown>;
    const draft = { ...oldDraft, imageUrl: publicUrl, imageAlt: media.altText };
    await db.update(schema.seoCampaignOpportunities).set({ draft, updatedAt: new Date() }).where(eq(schema.seoCampaignOpportunities.id, opportunity.id));
    response.status(201).json({ media, source: { provider: "pexels", photographer: photo.photographer || null, sourceUrl: photo.url }, metadataStripped: true });
  });

  router.put("/seo/campaign/autopilot", async (request, response) => {
    const input = parse(z.object({ projectId: uuid, enabled: z.boolean(), settings: z.object({ pagePublishing: z.boolean().default(false), categoryPublishing: z.boolean().default(false), blogScheduling: z.boolean().default(false), maxPagesPerMonth: z.number().int().min(0).max(100).default(0), maxBlogsPerMonth: z.number().int().min(0).max(100).default(0), blogScheduleDays: z.number().int().min(1).max(90).default(7) }) }), request.body);
    const { campaign, project, user } = await ensureCampaign(request, input.projectId, true);
    if (input.enabled) {
      if (project.userId !== user.id) throw new HttpError(403, "Only the project owner can enable autopilot", "campaign_owner_required");
      await authz.project(project.id, user.id, "publish");
      if (!campaign.profileConfirmedAt) throw new HttpError(409, "Confirm the business profile before enabling autopilot", "campaign_profile_unconfirmed");
      const approvedOpportunity = await db.query.seoCampaignOpportunities.findFirst({ where: and(eq(schema.seoCampaignOpportunities.campaignId, campaign.id), eq(schema.seoCampaignOpportunities.autopilotEligible, true), isNotNull(schema.seoCampaignOpportunities.approvedAt)) });
      if (!approvedOpportunity) throw new HttpError(409, "Approve at least one evidence-complete roadmap item before enabling autopilot", "campaign_strategy_unapproved");
    }
    const [updated] = await db.update(schema.seoCampaigns).set({ autopilotEnabled: input.enabled, settings: input.settings, autopilotAuthorizedAt: input.enabled ? new Date() : campaign.autopilotAuthorizedAt, autopilotAuthorizedBy: input.enabled ? user.id : campaign.autopilotAuthorizedBy, status: input.enabled ? "active" : "paused", updatedAt: new Date() }).where(eq(schema.seoCampaigns.id, campaign.id)).returning();
    response.json({ campaign: updated });
  });

  router.post("/seo/campaign/opportunities/:id/publish", async (request, response) => {
  const input = parse(z.object({ projectId: uuid, scheduleAt: z.string().datetime({ offset: true }).optional(), timezone: z.string().trim().min(1).max(64).default("UTC").refine((value) => { try { new Intl.DateTimeFormat("en-US", { timeZone: value }); return true; } catch { return false; } }) }), request.body);
    const { campaign, project, user } = await ensureCampaign(request, input.projectId, true);
    const opportunityId = parse(uuid, request.params.id);
    const opportunity = await db.query.seoCampaignOpportunities.findFirst({ where: and(eq(schema.seoCampaignOpportunities.id, opportunityId), eq(schema.seoCampaignOpportunities.campaignId, campaign.id)) });
    if (!opportunity?.draft) throw new HttpError(409, "Generate and review a content draft first", "campaign_draft_required");
    if (["published", "scheduled", "publishing"].includes(opportunity.status)) throw new HttpError(409, "This opportunity already has a publication", "campaign_already_published");
    await authz.project(project.id, user.id, "publish");
    if (opportunity.targetType === "blog") {
      if (!input.scheduleAt || new Date(input.scheduleAt).getTime() <= Date.now()) throw new HttpError(400, "Choose a future blog publication time", "invalid_schedule_time");
      const draft = opportunity.draft as Record<string, unknown>;
      const blogSlug = safeSlug(String(draft.slug || draft.title || "seo-content"));
      const duplicateBlog = await db.query.blogs.findFirst({ where: eq(schema.blogs.slug, blogSlug) });
      if (duplicateBlog) throw new HttpError(409, "A blog already uses this URL. Refresh research and map the opportunity to a unique URL.", "campaign_duplicate_target");
      const authorId = user.id;
      const [blog] = await db.transaction(async (tx) => {
        const [claim] = await tx.update(schema.seoCampaignOpportunities).set({ status: "publishing", updatedAt: new Date() }).where(and(eq(schema.seoCampaignOpportunities.id, opportunity.id), eq(schema.seoCampaignOpportunities.status, "draft"))).returning({ id: schema.seoCampaignOpportunities.id });
        if (!claim) throw new HttpError(409, "This opportunity changed. Refresh before publishing.", "campaign_opportunity_changed");
        const [created] = await tx.insert(schema.blogs).values({ projectId: project.id, authorId, title: String(draft.title), slug: blogSlug, excerpt: String(draft.excerpt || ""), content: String(draft.content), featuredImage: typeof draft.imageUrl === "string" ? draft.imageUrl : null, metaTitle: String(draft.metaTitle || ""), metaDescription: String(draft.metaDescription || ""), status: "draft", isPublished: false }).returning();
        const [plan] = await tx.insert(schema.contentPlans).values({ projectId: project.id, kind: "blog", blogId: created.id, status: "scheduled", scheduledAt: new Date(input.scheduleAt!), timezone: input.timezone, createdBy: user.id }).returning();
        await tx.insert(schema.seoCampaignPublications).values({ campaignId: campaign.id, opportunityId: opportunity.id, targetType: "blog", targetId: created.id, beforeValue: { created: true }, afterValue: { blogId: created.id, planId: plan.id, scheduledAt: input.scheduleAt }, publishedBy: user.id });
        await tx.update(schema.seoCampaignOpportunities).set({ status: "scheduled", targetId: created.id, updatedAt: new Date() }).where(eq(schema.seoCampaignOpportunities.id, opportunity.id));
        return [created];
      });
      return response.status(201).json({ blog, scheduledAt: input.scheduleAt });
    }
    const settings = (campaign.settings || {}) as Record<string, boolean>;
    if (campaign.autopilotEnabled && opportunity.targetType === "page" && !settings.pagePublishing) throw new HttpError(403, "Page publishing is outside the enabled campaign scope", "campaign_publish_scope");
    if (campaign.autopilotEnabled && opportunity.targetType === "collection" && !settings.categoryPublishing) throw new HttpError(403, "Category publishing is outside the enabled campaign scope", "campaign_publish_scope");
    const draft = opportunity.draft as Record<string, unknown>;
    if (opportunity.targetType === "collection") {
      const target = opportunity.targetId ? await db.query.productCategories.findFirst({ where: and(eq(schema.productCategories.id, opportunity.targetId), eq(schema.productCategories.projectId, project.id)) }) : null;
      if (opportunity.targetId && !target) throw new HttpError(404, "Product category not found");
      const draftTitle = String(draft.title || "New category");
      const slug = safeSlug(target?.slug || opportunity.targetPath?.replace(/^\/+/, "") || String(draft.slug || draftTitle));
      if (!target) {
        const duplicate = await db.query.productCategories.findFirst({ where: and(eq(schema.productCategories.projectId, project.id), eq(schema.productCategories.slug, slug)) });
        if (duplicate) throw new HttpError(409, "A category already uses this URL. Refresh research and map the opportunity to that category.", "campaign_duplicate_target");
      }
      const beforeValue = target ? { heading: target.heading, description: target.description, metaTitle: target.metaTitle, metaDescription: target.metaDescription, image: target.image, isActive: target.isActive } : { created: true };
      const afterValue = { heading: draftTitle, description: String(draft.content || ""), metaTitle: String(draft.metaTitle || ""), metaDescription: String(draft.metaDescription || ""), image: typeof draft.imageUrl === "string" ? draft.imageUrl : target?.image || null, isActive: true };
      const saved = await db.transaction(async (tx) => {
        const [claim] = await tx.update(schema.seoCampaignOpportunities).set({ status: "publishing", updatedAt: new Date() }).where(and(eq(schema.seoCampaignOpportunities.id, opportunity.id), eq(schema.seoCampaignOpportunities.status, "draft"))).returning({ id: schema.seoCampaignOpportunities.id });
        if (!claim) throw new HttpError(409, "This opportunity changed. Refresh before publishing.", "campaign_opportunity_changed");
        const [category] = target
          ? await tx.update(schema.productCategories).set({ ...afterValue, updatedAt: new Date() }).where(eq(schema.productCategories.id, target.id)).returning()
          : await tx.insert(schema.productCategories).values({ projectId: project.id, name: draftTitle, heading: draftTitle, slug, description: afterValue.description, metaTitle: afterValue.metaTitle, metaDescription: afterValue.metaDescription, image: afterValue.image, isActive: true }).returning();
        await tx.insert(schema.seoCampaignPublications).values({ campaignId: campaign.id, opportunityId: opportunity.id, targetType: "collection", targetId: category.id, beforeValue, afterValue, publishedBy: user.id });
        await tx.update(schema.seoCampaignOpportunities).set({ status: "published", targetId: category.id, updatedAt: new Date() }).where(eq(schema.seoCampaignOpportunities.id, opportunity.id));
        return category;
      });
      if (!saved) throw new HttpError(500, "Could not publish the product category");
    } else if (opportunity.targetType === "page") {
      const target = opportunity.targetId ? await db.query.pages.findFirst({ where: and(eq(schema.pages.id, opportunity.targetId), eq(schema.pages.projectId, project.id)) }) : null;
      if (opportunity.targetId && !target) throw new HttpError(404, "Page not found");
      if (target?.pageData && typeof target.pageData === "object" && "craftState" in (target.pageData as Record<string, unknown>)) throw new HttpError(409, "This page uses the visual editor format. Apply the approved content in the page editor before publishing.", "campaign_page_editor_required");
      const current = target?.pageData && typeof target.pageData === "object" ? target.pageData as Record<string, unknown> : {};
      const sections = Array.isArray(current.sections) ? current.sections : [];
      const section = draft.section;
      if (!section || typeof section !== "object") throw new HttpError(409, "Generated page draft is missing its content section");
      if (typeof draft.imageUrl === "string") {
        const sectionRecord = section as { components?: unknown[] };
        sectionRecord.components = [...(sectionRecord.components || []), { id: `seo-image-${opportunity.id}`, type: "Image", props: { src: draft.imageUrl, alt: String(draft.imageAlt || draft.title || "") } }];
      }
      const pageData = { ...current, sections: [...sections, section] };
      const title = String(draft.title || target?.title || "New page");
      const slug = safeSlug(target?.slug || opportunity.targetPath?.replace(/^\/+/, "") || String(draft.slug || title));
      if (!target) {
        const duplicate = await db.query.pages.findFirst({ where: and(eq(schema.pages.projectId, project.id), eq(schema.pages.slug, slug)) });
        if (duplicate) throw new HttpError(409, "A page already uses this URL. Refresh research and map the opportunity to that page.", "campaign_duplicate_target");
      }
      const beforeValue = target ? { title: target.title, metaTitle: target.metaTitle, metaDescription: target.metaDescription, pageData: target.pageData, publishedPageData: target.publishedPageData, status: target.status } : { created: true };
      const saved = await db.transaction(async (tx) => {
        const [claim] = await tx.update(schema.seoCampaignOpportunities).set({ status: "publishing", updatedAt: new Date() }).where(and(eq(schema.seoCampaignOpportunities.id, opportunity.id), eq(schema.seoCampaignOpportunities.status, "draft"))).returning({ id: schema.seoCampaignOpportunities.id });
        if (!claim) throw new HttpError(409, "This opportunity changed. Refresh before publishing.", "campaign_opportunity_changed");
        const [page] = target
          ? await tx.update(schema.pages).set({ title, metaTitle: String(draft.metaTitle || ""), metaDescription: String(draft.metaDescription || ""), pageData, publishedPageData: pageData, status: "published", updatedAt: new Date() }).where(eq(schema.pages.id, target.id)).returning()
          : await tx.insert(schema.pages).values({ projectId: project.id, title, slug, metaTitle: String(draft.metaTitle || ""), metaDescription: String(draft.metaDescription || ""), pageData, publishedPageData: pageData, status: "published" }).returning();
        await tx.insert(schema.seoCampaignPublications).values({ campaignId: campaign.id, opportunityId: opportunity.id, targetType: "page", targetId: page.id, beforeValue, afterValue: { ...draft, pageData }, publishedBy: user.id });
        await tx.update(schema.projects).set({ isPublished: true, publishedAt: new Date(), publishedVersion: sql`${schema.projects.publishedVersion} + 1`, updatedAt: new Date() }).where(eq(schema.projects.id, project.id));
        await tx.update(schema.seoCampaignOpportunities).set({ status: "published", targetId: page.id, updatedAt: new Date() }).where(eq(schema.seoCampaignOpportunities.id, opportunity.id));
        return page;
      });
      if (!saved) throw new HttpError(500, "Could not publish the page");
    } else {
      throw new HttpError(409, "Choose an existing page or category before publishing", "campaign_target_required");
    }
    response.json({ success: true, opportunityId: opportunity.id });
  });

  router.post("/seo/campaign/publications/:id/rollback", async (request, response) => {
    const input = parse(z.object({ projectId: uuid }), request.body);
    const { campaign, project, user } = await ensureCampaign(request, input.projectId, true);
    await authz.project(project.id, user.id, "publish");
    const publicationId = parse(uuid, request.params.id);
    const publication = await db.query.seoCampaignPublications.findFirst({ where: and(eq(schema.seoCampaignPublications.id, publicationId), eq(schema.seoCampaignPublications.campaignId, campaign.id)) });
    if (!publication || !publication.beforeValue) throw new HttpError(404, "Publication snapshot not found");
    if (publication.rollbackOf) throw new HttpError(409, "Rollback records cannot be rolled back", "campaign_rollback_record");
    const existingRollback = await db.query.seoCampaignPublications.findFirst({ where: and(eq(schema.seoCampaignPublications.campaignId, campaign.id), eq(schema.seoCampaignPublications.rollbackOf, publication.id)) });
    if (existingRollback) throw new HttpError(409, "This publication has already been rolled back", "campaign_already_rolled_back");
    if (publication.targetType === "blog") {
      const snapshot = publication.afterValue as Record<string, unknown>;
      const planId = typeof snapshot.planId === "string" ? snapshot.planId : null;
      await db.transaction(async (tx) => {
        if (planId) await tx.update(schema.contentPlans).set({ status: "cancelled", updatedAt: new Date() }).where(and(eq(schema.contentPlans.id, planId), eq(schema.contentPlans.projectId, project.id), inArray(schema.contentPlans.status, ["scheduled", "failed", "publishing"])));
        await tx.update(schema.blogs).set({ status: "draft", isPublished: false, publishedAt: null, updatedAt: new Date() }).where(and(eq(schema.blogs.id, publication.targetId), eq(schema.blogs.projectId, project.id)));
        await tx.insert(schema.seoCampaignPublications).values({ campaignId: campaign.id, opportunityId: publication.opportunityId, targetType: publication.targetType, targetId: publication.targetId, beforeValue: publication.afterValue, afterValue: { status: "draft", isPublished: false }, publishedBy: user.id, rollbackOf: publication.id });
        if (publication.opportunityId) await tx.update(schema.seoCampaignOpportunities).set({ status: "draft", updatedAt: new Date() }).where(eq(schema.seoCampaignOpportunities.id, publication.opportunityId));
      });
    } else if (publication.targetType === "collection") {
      const before = publication.beforeValue as Record<string, unknown>;
      await db.transaction(async (tx) => {
        if (before.created === true) {
          await tx.update(schema.productCategories).set({ isActive: false, updatedAt: new Date() }).where(and(eq(schema.productCategories.id, publication.targetId), eq(schema.productCategories.projectId, project.id)));
        } else {
          await tx.update(schema.productCategories).set({ heading: before.heading as string | null, description: before.description as string | null, metaTitle: before.metaTitle as string | null, metaDescription: before.metaDescription as string | null, image: before.image as string | null, isActive: before.isActive as boolean | null, updatedAt: new Date() }).where(and(eq(schema.productCategories.id, publication.targetId), eq(schema.productCategories.projectId, project.id)));
        }
        await tx.insert(schema.seoCampaignPublications).values({ campaignId: campaign.id, opportunityId: publication.opportunityId, targetType: publication.targetType, targetId: publication.targetId, beforeValue: publication.afterValue, afterValue: before.created === true ? { isActive: false } : before, publishedBy: user.id, rollbackOf: publication.id });
        if (publication.opportunityId) await tx.update(schema.seoCampaignOpportunities).set({ status: "draft", updatedAt: new Date() }).where(eq(schema.seoCampaignOpportunities.id, publication.opportunityId));
      });
    } else if (publication.targetType === "page") {
      const before = publication.beforeValue as Record<string, unknown>;
      await db.transaction(async (tx) => {
        if (before.created === true) {
          await tx.update(schema.pages).set({ status: "draft", publishedPageData: null, updatedAt: new Date() }).where(and(eq(schema.pages.id, publication.targetId), eq(schema.pages.projectId, project.id)));
        } else {
          await tx.update(schema.pages).set({ title: before.title as string, metaTitle: before.metaTitle as string | null, metaDescription: before.metaDescription as string | null, pageData: before.pageData, publishedPageData: before.publishedPageData, status: before.status as "draft" | "published", updatedAt: new Date() }).where(and(eq(schema.pages.id, publication.targetId), eq(schema.pages.projectId, project.id)));
        }
        await tx.insert(schema.seoCampaignPublications).values({ campaignId: campaign.id, opportunityId: publication.opportunityId, targetType: publication.targetType, targetId: publication.targetId, beforeValue: publication.afterValue, afterValue: before.created === true ? { status: "draft", publishedPageData: null } : before, publishedBy: user.id, rollbackOf: publication.id });
        if (publication.opportunityId) await tx.update(schema.seoCampaignOpportunities).set({ status: "draft", updatedAt: new Date() }).where(eq(schema.seoCampaignOpportunities.id, publication.opportunityId));
      });
    } else throw new HttpError(409, "This publication type cannot be rolled back here");
    response.json({ success: true });
  });

  router.get("/seo/campaign/publications", async (request, response) => {
    const { campaign } = await ensureCampaign(request, request.query.projectId);
    const publications = await db.query.seoCampaignPublications.findMany({ where: eq(schema.seoCampaignPublications.campaignId, campaign.id), orderBy: [desc(schema.seoCampaignPublications.publishedAt)], limit: 100 });
    response.json({ publications });
  });

  return router;
}
