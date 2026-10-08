import { randomBytes } from "node:crypto";
import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { createDb, schema } from "@velozy/db";
import type { Environment } from "../../config/env.js";
import { HttpError } from "../../middleware/errors.js";
import { adminAccess } from "../../lib/admin-auth.js";
import { customDomainChallengeName, hasCustomDomainVerificationRecord, normalizeCustomHostname } from "../../lib/custom-domains.js";
import { requireProjectPlanLimit } from "../../lib/platform-billing.js";

const projectIdSchema = z.string().uuid();

export function adminDomainsRouter(environment: Environment): ExpressRouter {
  const db = createDb(environment.DATABASE_URL);
  const authz = adminAccess(environment.DATABASE_URL);
  const router = Router();

  router.get("/domains", async (request, response) => {
    const parsed = projectIdSchema.safeParse(request.query.projectId);
    if (!parsed.success) throw new HttpError(400, "Valid projectId is required");
    const project = await authz.project(parsed.data, request.auth!.userId!);
    const domain = await db.query.siteDomains.findFirst({
      where: and(eq(schema.siteDomains.projectId, project.id), eq(schema.siteDomains.isCustom, true)),
      columns: { hostname: true, isVerified: true, isPrimary: true, verificationToken: true },
    });
    response.json({ isPublished: project.isPublished, domain: domain ? {
      hostname: domain.hostname,
      isVerified: domain.isVerified,
      isPrimary: domain.isPrimary,
      recordName: customDomainChallengeName(domain.hostname),
      recordValue: domain.isVerified ? null : domain.verificationToken,
    } : null });
  });

  router.post("/domains", async (request, response) => {
    const parsed = z.object({ projectId: projectIdSchema, hostname: z.string().trim().min(1).max(500) }).safeParse(request.body);
    if (!parsed.success) throw new HttpError(400, "Valid projectId and hostname are required");
    const project = await authz.project(parsed.data.projectId, request.auth!.userId!, "settings:write");
    if (!project.isPublished) throw new HttpError(409, "Publish your site before adding a custom domain", "site_not_published");
    await requireProjectPlanLimit(db, project.id, "custom_domains");
    const hostname = normalizeCustomHostname(parsed.data.hostname);
    if (!hostname) throw new HttpError(400, "Enter a valid public domain name", "invalid_hostname");
    const platformDomain = (process.env.PLATFORM_DOMAIN || "localhost:3002").split(":")[0].toLowerCase();
    if (hostname === platformDomain || hostname.endsWith(`.${platformDomain}`))
      throw new HttpError(400, "Use a domain you control that is separate from the platform domain", "reserved_hostname");

    const existing = await db.query.siteDomains.findFirst({ where: and(eq(schema.siteDomains.projectId, project.id), eq(schema.siteDomains.isCustom, true)), columns: { id: true } });
    if (existing) throw new HttpError(409, "Remove the existing custom domain before adding another", "custom_domain_exists");
    const token = randomBytes(24).toString("hex");
    const [domain] = await db.insert(schema.siteDomains).values({
      projectId: project.id,
      hostname,
      isPrimary: false,
      isVerified: false,
      isCustom: true,
      verificationToken: token,
    }).onConflictDoNothing().returning({ hostname: schema.siteDomains.hostname });
    if (!domain) throw new HttpError(409, "This domain is already connected to another site", "hostname_unavailable");
    response.status(201).json({ domain: { ...domain, isVerified: false, isPrimary: false, recordName: customDomainChallengeName(hostname), recordValue: token } });
  });

  router.post("/domains/verify", async (request, response) => {
    const parsed = z.object({ projectId: projectIdSchema }).safeParse(request.body);
    if (!parsed.success) throw new HttpError(400, "Valid projectId is required");
    const project = await authz.project(parsed.data.projectId, request.auth!.userId!, "settings:write");
    const domain = await db.query.siteDomains.findFirst({ where: and(eq(schema.siteDomains.projectId, project.id), eq(schema.siteDomains.isCustom, true)) });
    if (!domain) throw new HttpError(404, "No custom domain is configured", "domain_not_found");
    if (domain.isVerified) return response.json({ domain: { hostname: domain.hostname, isVerified: true, isPrimary: domain.isPrimary } });
    if (!domain.verificationToken) throw new HttpError(409, "Domain verification challenge is unavailable", "verification_unavailable");
    const verificationToken = domain.verificationToken;
    const verified = await hasCustomDomainVerificationRecord(domain.hostname, verificationToken);
    if (!verified) return response.json({ verified: false, domain: { hostname: domain.hostname, isVerified: false, isPrimary: false, recordName: customDomainChallengeName(domain.hostname), recordValue: verificationToken } });
    await db.transaction(async (tx) => {
      await tx.update(schema.siteDomains).set({ isPrimary: false, updatedAt: new Date() }).where(eq(schema.siteDomains.projectId, project.id));
      const [verifiedDomain] = await tx.update(schema.siteDomains).set({ isVerified: true, isPrimary: true, verificationToken: null, updatedAt: new Date() }).where(and(eq(schema.siteDomains.id, domain.id), eq(schema.siteDomains.projectId, project.id), eq(schema.siteDomains.isCustom, true), eq(schema.siteDomains.isVerified, false), eq(schema.siteDomains.verificationToken, verificationToken))).returning({ id: schema.siteDomains.id });
      if (!verifiedDomain) throw new HttpError(409, "The custom domain changed while it was being verified. Refresh and try again.", "domain_changed");
    });
    response.json({ verified: true, domain: { hostname: domain.hostname, isVerified: true, isPrimary: true } });
  });

  router.delete("/domains", async (request, response) => {
    const parsed = projectIdSchema.safeParse(request.query.projectId);
    if (!parsed.success) throw new HttpError(400, "Valid projectId is required");
    const project = await authz.project(parsed.data, request.auth!.userId!, "settings:write");
    const platformDomain = (process.env.PLATFORM_DOMAIN || "localhost:3002").split(":")[0].toLowerCase();
    const platformHostname = project.subdomain ? `${project.subdomain}.${platformDomain}` : null;
    await db.transaction(async (tx) => {
      await tx.delete(schema.siteDomains).where(and(eq(schema.siteDomains.projectId, project.id), eq(schema.siteDomains.isCustom, true)));
      await tx.update(schema.siteDomains).set({ isPrimary: false, updatedAt: new Date() }).where(eq(schema.siteDomains.projectId, project.id));
      if (platformHostname) await tx.update(schema.siteDomains).set({ isPrimary: true, updatedAt: new Date() }).where(and(eq(schema.siteDomains.projectId, project.id), eq(schema.siteDomains.hostname, platformHostname), eq(schema.siteDomains.isCustom, false)));
    });
    response.json({ success: true });
  });

  return router;
}
