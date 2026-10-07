import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createDb, schema } from "@velozy/db";
import type { Environment } from "../config/env.js";
import { HttpError } from "../middleware/errors.js";
import { adminAccess } from "../lib/admin-auth.js";

const pageIdInput = z.string().uuid();
const pageDataInput = z.object({
  pageId: pageIdInput,
  pageData: z.object({
    sections: z.array(z.unknown()).optional(),
    craftState: z.record(z.unknown()).optional(),
    metadata: z.record(z.unknown()).optional(),
  }).passthrough(),
});
const sectionInput = z.object({ pageId: pageIdInput, section: z.object({ id: z.string().min(1) }).passthrough() });

export function pageDataRouter(environment: Environment): ExpressRouter {
  const db = createDb(environment.DATABASE_URL);
  const authz = adminAccess(environment.DATABASE_URL);
  const router = Router();

  async function ownedPage(pageId: string, userId?: string, capability = "content:read") {
    if (!userId) throw new HttpError(401, "Unauthorized");
    const page = await db.query.pages.findFirst({ where: eq(schema.pages.id, pageId), with: { project: true } });
    if (!page) throw new HttpError(404, "Page not found or access denied");
    await authz.project(page.projectId, userId, capability);
    return page;
  }

  router.get("/", async (request, response) => {
    const pageId = pageIdInput.safeParse(request.query.pageId);
    if (!pageId.success) throw new HttpError(400, "Valid pageId is required");
    const page = await ownedPage(pageId.data, request.auth?.userId);
    response.json({ pageData: page.pageData, page: { id: page.id, slug: page.slug, title: page.title, projectId: page.projectId } });
  });

  router.put("/", async (request, response) => {
    const input = pageDataInput.safeParse(request.body);
    if (!input.success) throw new HttpError(400, "Valid pageId and pageData are required");
    await ownedPage(input.data.pageId, request.auth?.userId, "content:write");
    const [page] = await db.update(schema.pages).set({ pageData: input.data.pageData, updatedAt: new Date() }).where(eq(schema.pages.id, input.data.pageId)).returning();
    response.json({ success: true, page });
  });

  router.patch("/", async (request, response) => {
    const input = sectionInput.safeParse(request.body);
    if (!input.success) throw new HttpError(400, "Valid pageId and section are required");
    const page = await ownedPage(input.data.pageId, request.auth?.userId, "content:write");
    const current = page.pageData && typeof page.pageData === "object" && !Array.isArray(page.pageData) ? page.pageData as Record<string, unknown> : {};
    const sections = Array.isArray(current.sections) ? current.sections : [];
    const updated = { ...current, sections: [...sections.filter((section: any) => section?.id !== input.data.section.id), input.data.section] };
    const [saved] = await db.update(schema.pages).set({ pageData: updated, updatedAt: new Date() }).where(eq(schema.pages.id, input.data.pageId)).returning();
    response.json({ success: true, page: saved });
  });

  return router;
}
