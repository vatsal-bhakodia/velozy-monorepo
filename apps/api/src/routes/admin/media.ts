import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import multer from "multer";
import { and, desc, eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { schema } from "@velozy/db";
import type { Environment } from "../../config/env.js";
import { HttpError } from "../../middleware/errors.js";
import { adminAccess } from "../../lib/admin-auth.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});
function mediaType(mime: string, name: string) {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (/\.(woff2?|ttf|otf)$/i.test(name)) return "font";
  if (/\.(zip|rar|7z)$/i.test(name)) return "archive";
  return "document";
}
export function adminMediaRouter(environment: Environment): ExpressRouter {
  const { db, user, project } = adminAccess(environment.DATABASE_URL);
  const storage = createClient(
    environment.SUPABASE_URL,
    environment.SUPABASE_SERVICE_ROLE_KEY,
  ).storage.from(environment.SUPABASE_MEDIA_BUCKET);
  const router = Router();
  router.get("/media", async (req, res) => {
    if (!req.query.projectId || typeof req.query.projectId !== "string")
      throw new HttpError(400, "Project ID is required");
    await project(
      z.string().uuid().parse(req.query.projectId),
      (await user(req)).id,
      "media:read",
    );
    res.json({
      media: await db.query.media.findMany({
        where: eq(schema.media.projectId, req.query.projectId),
        orderBy: [desc(schema.media.createdAt)],
      }),
    });
  });
  router.post("/media", upload.single("file"), async (req, res) => {
    const current = await user(req);
    const projectId = z.string().uuid().parse(req.body?.projectId);
    await project(projectId, current.id, "media:write");
    if (!req.file || !req.file.size)
      throw new HttpError(400, "Project ID and file are required");
    if (
      !/^(image|video|audio)\//.test(req.file.mimetype) &&
      !/\.(pdf|docx?|xlsx?|pptx?|txt|csv|zip|rar|7z|woff2?|ttf|otf|json|xml)$/i.test(
        req.file.originalname,
      )
    )
      throw new HttpError(415, "This file type is not supported");
    const safe = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${projectId}/${crypto.randomUUID()}-${safe}`;
    const result = await storage.upload(path, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });
    if (result.error) throw new HttpError(502, "Failed to upload media");
    const { data } = storage.getPublicUrl(path);
    const [item] = await db
      .insert(schema.media)
      .values({
        projectId,
        userId: current.id,
        name: req.file.originalname.replace(/\.[^/.]+$/, ""),
        fileName: req.file.originalname,
        url: data.publicUrl,
        mimeType: req.file.mimetype || "application/octet-stream",
        mediaType: mediaType(req.file.mimetype, req.file.originalname),
        size: req.file.size,
      })
      .returning();
    res.status(201).json({ media: item });
  });
  router.delete("/media", async (req, res) => {
    const current = await user(req);
    const item = await db.query.media.findFirst({
      where: eq(schema.media.id, z.string().uuid().parse(req.body?.id)),
    });
    if (!item) throw new HttpError(404, "Media not found");
    await project(item.projectId, current.id, "media:write");
    const path = item.url.split(`/${environment.SUPABASE_MEDIA_BUCKET}/`).pop();
    if (path) await storage.remove([path]);
    await db
      .delete(schema.media)
      .where(
        and(
          eq(schema.media.id, item.id),
          eq(schema.media.projectId, item.projectId),
        ),
      );
    res.json({ success: true });
  });
  router.put("/media", async (req, res) => {
    const current = await user(req);
    const item = await db.query.media.findFirst({
      where: eq(schema.media.id, z.string().uuid().parse(req.body?.id)),
    });
    if (!item || item.mediaType !== "image")
      throw new HttpError(404, "Image not found");
    await project(item.projectId, current.id, "media:write");
    const match =
      typeof req.body?.dataUrl === "string" &&
      req.body.dataUrl.match(
        /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/,
      );
    if (!match) throw new HttpError(415, "Unsupported edited image format");
    const buffer = Buffer.from(match[2], "base64");
    if (!buffer.length || buffer.length > 100 * 1024 * 1024)
      throw new HttpError(400, "Edited image is too large");
    const path = item.url.split(`/${environment.SUPABASE_MEDIA_BUCKET}/`).pop();
    if (!path) throw new HttpError(500, "Media storage path is invalid");
    const result = await storage.update(path, buffer, {
      contentType: match[1],
      upsert: true,
    });
    if (result.error) throw new HttpError(502, "Failed to save edited image");
    const [media] = await db
      .update(schema.media)
      .set({ size: buffer.length, mimeType: match[1], updatedAt: new Date() })
      .where(
        and(
          eq(schema.media.id, item.id),
          eq(schema.media.projectId, item.projectId),
        ),
      )
      .returning();
    res.json({
      media: { ...media, width: req.body?.width, height: req.body?.height },
    });
  });
  return router;
}
