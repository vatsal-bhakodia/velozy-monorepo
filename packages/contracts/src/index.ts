import { z } from "zod";


export const siteIdSchema = z.string().uuid();
export const apiErrorSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
});

export const publishSiteSchema = z.object({
  siteId: siteIdSchema,
  pageId: z.string().uuid().optional(),
  idempotencyKey: z.string().min(1).max(255),
});

export type PublishSiteInput = z.infer<typeof publishSiteSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;

export * from "./growth.js";
