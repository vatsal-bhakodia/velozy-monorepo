import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { createDb, schema } from "@velozy/db";
import type { Environment } from "../../config/env.js";
import { HttpError } from "../../middleware/errors.js";
import { adminAccess } from "../../lib/admin-auth.js";
const blog = z.object({
  projectId: z.string().uuid(),
  slug: z.string().min(1),
  title: z.string().min(1),
  excerpt: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  featuredImage: z.string().optional().nullable(),
  metaTitle: z.string().optional().nullable(),
  metaKeywords: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  status: z.enum(["draft", "published", "archived", "private"]).optional(),
  isFeatured: z.boolean().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
});
const blogCategory = z.object({
  projectId: z.string().uuid(),
  name: z.string().trim().min(1).max(255),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(5000).nullable().optional(),
  image: z.string().max(500).nullable().optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
  isActive: z.boolean().optional(),
});
export function adminBlogRouter(e: Environment): ExpressRouter {
  const db = createDb(e.DATABASE_URL),
    r = Router();
  const authz = adminAccess(e.DATABASE_URL);
  const u = async (q: Express.Request) => {
    if (!q.auth?.userId) throw new HttpError(401, "Unauthorized");
    const x = await db.query.users.findFirst({
      where: eq(schema.users.id, q.auth.userId),
    });
    if (!x) throw new HttpError(404, "User not found");
    return x;
  };
  const own = async (p: string, id: string) => {
    await authz.project(p, id, "content:read");
  };
  r.get("/blog-categories", async (q, s) => {
    const x = await u(q),
      p = z.string().uuid().safeParse(q.query.projectId);
    if (!p.success) throw new HttpError(400, "projectId is required");
    await own(p.data, x.id);
    s.json({
      categories: await db.query.blogCategories.findMany({
        where: eq(schema.blogCategories.projectId, p.data),
        orderBy: [
          asc(schema.blogCategories.sortOrder),
          asc(schema.blogCategories.name),
        ],
      }),
    });
  });
  r.post("/blog-categories", async (q, s) => {
    const x = await u(q),
      v = blogCategory.safeParse(q.body);
    if (!v.success) throw new HttpError(400, "Invalid blog category");
    await own(v.data.projectId, x.id);
    await authz.project(v.data.projectId, x.id, "content:write");
    const duplicate = await db.query.blogCategories.findFirst({
      where: eq(schema.blogCategories.slug, v.data.slug),
    });
    if (duplicate)
      throw new HttpError(
        400,
        "Category slug already exists",
        "duplicate_slug",
      );
    const [category] = await db
      .insert(schema.blogCategories)
      .values(v.data)
      .returning();
    s.status(201).json({ category });
  });
  r.put("/blog-categories", async (q, s) => {
    const x = await u(q),
      id = z.string().uuid().safeParse(q.body?.id);
    if (!id.success) throw new HttpError(400, "Category ID is required");
    const found = await db.query.blogCategories.findFirst({
      where: eq(schema.blogCategories.id, id.data),
    });
    if (!found) throw new HttpError(404, "Blog category not found");
    await authz.project(found.projectId, x.id, "content:write");
    const v = blogCategory
      .omit({ projectId: true })
      .partial()
      .safeParse(q.body);
    if (!v.success) throw new HttpError(400, "Invalid blog category");
    if (v.data.slug && v.data.slug !== found.slug) {
      const duplicate = await db.query.blogCategories.findFirst({
        where: eq(schema.blogCategories.slug, v.data.slug),
      });
      if (duplicate)
        throw new HttpError(
          400,
          "Category slug already exists",
          "duplicate_slug",
        );
    }
    const [category] = await db
      .update(schema.blogCategories)
      .set({ ...v.data, updatedAt: new Date() })
      .where(eq(schema.blogCategories.id, id.data))
      .returning();
    s.json({ category });
  });
  r.delete("/blog-categories", async (q, s) => {
    const x = await u(q),
      id = z.string().uuid().safeParse(q.body?.id);
    if (!id.success) throw new HttpError(400, "Category ID is required");
    const found = await db.query.blogCategories.findFirst({
      where: eq(schema.blogCategories.id, id.data),
    });
    if (!found) throw new HttpError(404, "Blog category not found");
    await authz.project(found.projectId, x.id, "content:write");
    const attachedBlog = await db.query.blogs.findFirst({
      where: eq(schema.blogs.categoryId, id.data),
    });
    if (attachedBlog)
      throw new HttpError(
        409,
        "Move or remove posts in this category before deleting it",
        "category_in_use",
      );
    await db
      .delete(schema.blogCategories)
      .where(eq(schema.blogCategories.id, id.data));
    s.json({ success: true });
  });
  r.get("/blogs", async (q, s) => {
    const x = await u(q),
      p = z.string().uuid().safeParse(q.query.projectId);
    if (!p.success) throw new HttpError(400, "projectId is required");
    await own(p.data, x.id);
    s.json({
      blogs: await db.query.blogs.findMany({
        where: eq(schema.blogs.projectId, p.data),
        orderBy: [desc(schema.blogs.createdAt)],
      }),
    });
  });
  r.post("/blogs", async (q, s) => {
    const x = await u(q),
      v = blog.safeParse(q.body);
    if (!v.success) throw new HttpError(400, "Invalid request");
    await own(v.data.projectId, x.id);
    await authz.project(v.data.projectId, x.id, "content:write");
    if (v.data.categoryId) {
      const category = await db.query.blogCategories.findFirst({
        where: and(
          eq(schema.blogCategories.id, v.data.categoryId),
          eq(schema.blogCategories.projectId, v.data.projectId),
        ),
      });
      if (!category)
        throw new HttpError(400, "Category does not belong to this project");
    }
    const existing = await db.query.blogs.findFirst({
      where: and(
        eq(schema.blogs.projectId, v.data.projectId),
        eq(schema.blogs.slug, v.data.slug),
      ),
    });
    if (existing)
      throw new HttpError(
        400,
        "Blog with this slug already exists",
        "duplicate_slug",
      );
    const [b] = await db
      .insert(schema.blogs)
      .values({
        ...v.data,
        authorId: x.id,
        isFeatured: v.data.isFeatured ?? false,
        isPublished: v.data.status === "published",
        publishedAt: v.data.status === "published" ? new Date() : null,
      })
      .returning();
    s.status(201).json({ blog: b });
  });
  r.get("/blogs/:slug", async (q, s) => {
    const x = await u(q);
    const projectId = z.string().uuid().safeParse(q.query.projectId);
    if (!projectId.success) throw new HttpError(400, "projectId is required");
    await own(projectId.data, x.id);
    const id = z.string().uuid().safeParse(decodeURIComponent(q.params.slug));
    if (!id.success) throw new HttpError(400, "Blog ID is required");
    const found = await db.query.blogs.findFirst({
      where: and(
        eq(schema.blogs.id, id.data),
        eq(schema.blogs.projectId, projectId.data),
      ),
    });
    if (!found) throw new HttpError(404, "Blog not found");
    s.json({ blog: found });
  });
  r.put("/blogs", async (q, s) => {
    const x = await u(q);
    const id = z.string().uuid().safeParse(q.body?.id);
    if (!id.success) throw new HttpError(400, "Blog ID is required");
    const found = await db.query.blogs.findFirst({
      where: eq(schema.blogs.id, id.data),
      with: { project: true },
    });
    if (!found) throw new HttpError(404, "Blog not found or access denied");
    await authz.project(found.projectId, x.id, "content:write");
    const v = blog.omit({ projectId: true }).partial().safeParse(q.body);
    if (!v.success) throw new HttpError(400, "Invalid request");
    if (v.data.categoryId) {
      const category = await db.query.blogCategories.findFirst({
        where: and(
          eq(schema.blogCategories.id, v.data.categoryId),
          eq(schema.blogCategories.projectId, found.projectId),
        ),
      });
      if (!category)
        throw new HttpError(400, "Category does not belong to this project");
    }
    if (v.data.slug && v.data.slug !== found.slug) {
      const duplicate = await db.query.blogs.findFirst({
        where: and(
          eq(schema.blogs.projectId, found.projectId),
          eq(schema.blogs.slug, v.data.slug),
        ),
      });
      if (duplicate)
        throw new HttpError(
          400,
          "Blog with this slug already exists",
          "duplicate_slug",
        );
    }
    const { slug, status, ...rest } = v.data;
    const shouldSetPublishedAt = status === "published" && !found.publishedAt;
    const [updated] = await db
      .update(schema.blogs)
      .set({
        ...rest,
        ...(slug ? { slug } : {}),
        ...(status
          ? {
              status,
              isPublished: status === "published",
              ...(shouldSetPublishedAt ? { publishedAt: new Date() } : {}),
            }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.blogs.id, id.data))
      .returning();
    s.json({ blog: updated });
  });
  r.delete("/blogs", async (q, s) => {
    const x = await u(q);
    const id = z.string().uuid().safeParse(q.body?.id);
    if (!id.success) throw new HttpError(400, "Blog ID is required");
    const found = await db.query.blogs.findFirst({
      where: eq(schema.blogs.id, id.data),
      with: { project: true },
    });
    if (!found) throw new HttpError(404, "Blog not found or access denied");
    await authz.project(found.projectId, x.id, "content:write");
    await db.delete(schema.blogs).where(eq(schema.blogs.id, id.data));
    s.json({ success: true });
  });
  return r;
}
