import { Router } from "express";
import type { Request, Router as ExpressRouter } from "express";
import { and, eq, like } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@velozy/db";
import type { Environment } from "../../config/env.js";
import { HttpError } from "../../middleware/errors.js";
import { adminAccess } from "../../lib/admin-auth.js";

const marker = "AI-SEED";
const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 240);
export function adminSeedRouter(environment: Environment): ExpressRouter {
  const { db, user, project } = adminAccess(environment.DATABASE_URL);
  const router = Router();
  const owned = async (req: Request) =>
    project(z.string().uuid().parse(req.body?.projectId), (await user(req)).id, "commerce:write");
  router.post("/projects/seed-sample-content", async (req, res) => {
    const p = await owned(req);
    const sources = Array.isArray(req.body?.sources)
      ? req.body.sources
      : ["products", "productCategories", "blogs"];
    const force = Boolean(req.body?.force);
    const result: Record<string, unknown> = { projectId: p.id, seeded: {} };
    await db.transaction(async (tx) => {
      let categories = await tx.query.productCategories.findMany({
        where: eq(schema.productCategories.projectId, p.id),
      });
      if (sources.includes("productCategories")) {
        if (categories.length && !force)
          result.seeded = {
            ...(result.seeded as object),
            productCategories: { skipped: true, created: 0 },
          };
        else {
          const names = [
            `${p.industry || "Store"} Essentials`,
            "New Arrivals",
            "Best Sellers",
          ];
          const created = await tx
            .insert(schema.productCategories)
            .values(
              names.map((name, index) => ({
                projectId: p.id,
                name,
                slug: `${slug(name)}-${p.id.slice(0, 8)}-${index + 1}`,
                description: `${marker}: sample category`,
                sortOrder: index,
                isActive: true,
              })),
            )
            .returning();
          categories = created;
          result.seeded = {
            ...(result.seeded as object),
            productCategories: { skipped: false, created: created.length },
          };
        }
      }
      if (sources.includes("products")) {
        const existing = await tx.query.products.findMany({
          where: eq(schema.products.projectId, p.id),
          limit: 1,
        });
        if (existing.length && !force)
          result.seeded = {
            ...(result.seeded as object),
            products: { skipped: true, created: 0 },
          };
        else {
          const names = ["Starter Pack", "Essentials Bundle", "Pro Plan"];
          const created = await tx
            .insert(schema.products)
            .values(
              names.map((name, index) => ({
                projectId: p.id,
                categoryId:
                  categories[index % Math.max(categories.length, 1)]?.id ??
                  null,
                name: `${p.name} ${name}`,
                slug: `${slug(name)}-${p.id.slice(0, 8)}-${index + 1}`,
                sku: `${marker}-${p.id.slice(0, 8)}-${index + 1}`,
                shortDescription: `A sample ${name.toLowerCase()} for ${p.name}.`,
                price: 49 + index * 50,
                status: "published" as const,
                isActive: true,
                isFeatured: index === 0,
                images: [],
              })),
            )
            .returning();
          result.seeded = {
            ...(result.seeded as object),
            products: { skipped: false, created: created.length },
          };
        }
      }
      if (sources.includes("blogs")) {
        const existing = await tx.query.blogs.findMany({
          where: eq(schema.blogs.projectId, p.id),
          limit: 1,
        });
        if (existing.length && !force)
          result.seeded = {
            ...(result.seeded as object),
            blogs: { skipped: true, created: 0 },
          };
        else {
          const current = await user(req);
          const created = await tx
            .insert(schema.blogs)
            .values(
              [1, 2, 3].map((index) => ({
                projectId: p.id,
                authorId: current.id,
                title: `${p.name}: Getting Started ${index}`,
                slug: `getting-started-${p.id.slice(0, 8)}-${index}`,
                excerpt: "Sample article.",
                content: "Sample content.",
                metaKeywords: `${marker}: sample blog`,
                status: "published",
                isPublished: true,
                publishedAt: new Date(),
              })),
            )
            .returning();
          result.seeded = {
            ...(result.seeded as object),
            blogs: { skipped: false, created: created.length },
          };
        }
      }
    });
    res.json(result);
  });
  router.delete("/projects/seed-sample-content", async (req, res) => {
    const p = await owned(req);
    const short = p.id.slice(0, 8);
    const [blogs, products, blogCategories, productCategories] =
      await db.transaction(async (tx) =>
        Promise.all([
          tx
            .delete(schema.blogs)
            .where(
              and(
                eq(schema.blogs.projectId, p.id),
                like(schema.blogs.metaKeywords, `${marker}%`),
              ),
            )
            .returning({ id: schema.blogs.id }),
          tx
            .delete(schema.products)
            .where(
              and(
                eq(schema.products.projectId, p.id),
                like(schema.products.sku, `${marker}-${short}-%`),
              ),
            )
            .returning({ id: schema.products.id }),
          tx
            .delete(schema.blogCategories)
            .where(
              and(
                eq(schema.blogCategories.projectId, p.id),
                like(schema.blogCategories.description, `${marker}:%`),
              ),
            )
            .returning({ id: schema.blogCategories.id }),
          tx
            .delete(schema.productCategories)
            .where(
              and(
                eq(schema.productCategories.projectId, p.id),
                like(schema.productCategories.description, `${marker}:%`),
              ),
            )
            .returning({ id: schema.productCategories.id }),
        ]),
      );
    res.json({
      success: true,
      deleted: {
        blogs: blogs.length,
        products: products.length,
        blogCategories: blogCategories.length,
        productCategories: productCategories.length,
      },
    });
  });
  return router;
}
