import { Router } from "express";
import type { Request, Response, Router as ExpressRouter } from "express";
import multer from "multer";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@velozy/db";
import type { Environment } from "../../config/env.js";
import { HttpError } from "../../middleware/errors.js";
import { adminAccess } from "../../lib/admin-auth.js";
import { csv, parseCsv, parseJsonValue } from "../../lib/csv.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});
const headers = {
  products: [
    "name",
    "slug",
    "shortDescription",
    "description",
    "price",
    "sku",
    "weight",
    "dimensions",
    "images",
    "categorySlug",
    "isActive",
    "isFeatured",
    "inventoryQuantity",
    "lowStockThreshold",
    "status",
  ],
  categories: [
    "name",
    "heading",
    "slug",
    "description",
    "metaTitle",
    "metaKeywords",
    "metaDescription",
    "image",
    "parentSlug",
    "sortOrder",
    "isActive",
  ],
  blogs: [
    "title",
    "slug",
    "excerpt",
    "content",
    "featuredImage",
    "categorySlug",
    "tags",
    "metaTitle",
    "metaDescription",
    "metaKeywords",
    "status",
    "isFeatured",
  ],
};
export function adminCsvRouter(environment: Environment): ExpressRouter {
  const { db, user, project } = adminAccess(environment.DATABASE_URL);
  const router = Router();
  const owned = async (req: Request, value: unknown) =>
    project(z.string().uuid().parse(value), (await user(req)).id, req.method === "GET" ? "commerce:read" : "commerce:write");
  const download = (res: Response, name: string, data: string) =>
    res.type("text/csv; charset=utf-8").attachment(name).send(data);
  router.get("/products/csv", async (req, res) => {
    const p = await owned(req, req.query.projectId);
    const rows = await db.query.products.findMany({
      where: eq(schema.products.projectId, p.id),
      with: { category: true },
    });
    download(
      res,
      "products.csv",
      csv(
        headers.products,
        rows.map((x) => [
          x.name,
          x.slug,
          x.shortDescription,
          x.description,
          x.price,
          x.sku,
          x.weight,
          JSON.stringify(x.dimensions ?? ""),
          JSON.stringify(x.images ?? ""),
          x.category?.slug,
          x.isActive,
          x.isFeatured,
          x.inventoryQuantity,
          x.lowStockThreshold,
          x.status,
        ]),
      ),
    );
  });
  router.get("/product-categories/csv", async (req, res) => {
    const p = await owned(req, req.query.projectId);
    const rows = await db.query.productCategories.findMany({
      where: eq(schema.productCategories.projectId, p.id),
      with: { parent: true },
    });
    download(
      res,
      "product-categories.csv",
      csv(
        headers.categories,
        rows.map((x) => [
          x.name,
          x.heading,
          x.slug,
          x.description,
          x.metaTitle,
          x.metaKeywords,
          x.metaDescription,
          x.image,
          x.parent?.slug,
          x.sortOrder,
          x.isActive,
        ]),
      ),
    );
  });
  router.get("/blogs/csv", async (req, res) => {
    const p = await owned(req, req.query.projectId);
    const rows = await db.query.blogs.findMany({
      where: eq(schema.blogs.projectId, p.id),
      with: { category: true },
    });
    download(
      res,
      "blogs.csv",
      csv(
        headers.blogs,
        rows.map((x) => [
          x.title,
          x.slug,
          x.excerpt,
          x.content,
          x.featuredImage,
          x.category?.slug,
          JSON.stringify(x.tags ?? ""),
          x.metaTitle,
          x.metaDescription,
          x.metaKeywords,
          x.status,
          x.isFeatured,
        ]),
      ),
    );
  });
  router.post(
    "/product-categories/csv",
    upload.single("file"),
    async (req, res) => {
      const p = await owned(req, req.query.projectId);
      if (!req.file) throw new HttpError(400, "Please select a CSV file");
      const rows = parseCsv(req.file.buffer.toString("utf8"));
      const existing = await db.query.productCategories.findMany({
        where: eq(schema.productCategories.projectId, p.id),
      });
      const known = new Set(existing.map((x) => x.slug));
      const errors: string[] = [];
      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        if (!row.name || !row.slug || known.has(row.slug))
          errors.push(`Row ${i + 2}: name and unique slug are required.`);
        else known.add(row.slug);
      }
      if (errors.length) throw new HttpError(400, errors[0]);
      await db.transaction(async (tx) => {
        const saved = [...existing];
        for (const row of rows) {
          const parent = saved.find((item) => item.slug === row.parentSlug);
          const [item] = await tx
            .insert(schema.productCategories)
            .values({
              projectId: p.id,
              name: row.name,
              heading: row.heading || null,
              slug: row.slug,
              description: row.description || null,
              metaTitle: row.metaTitle || null,
              metaKeywords: row.metaKeywords || null,
              metaDescription: row.metaDescription || null,
              image: row.image || null,
              parentId: parent?.id ?? null,
              sortOrder: Number(row.sortOrder) || 0,
              isActive: row.isActive !== "false",
            })
            .returning();
          saved.push(item);
        }
      });
      res.json({ imported: rows.length, skipped: 0, errors: [] });
    },
  );
  router.post("/products/csv", upload.single("file"), async (req, res) => {
    const p = await owned(req, req.query.projectId);
    if (!req.file) throw new HttpError(400, "Please select a CSV file");
    const rows = parseCsv(req.file.buffer.toString("utf8"));
    const existing = await db.query.products.findMany({
      where: eq(schema.products.projectId, p.id),
      columns: { slug: true },
    });
    const slugs = new Set(existing.map((x) => x.slug));
    for (const row of rows) {
      if (!row.name || !row.slug || slugs.has(row.slug))
        throw new HttpError(
          400,
          "Each product requires a unique name and slug",
        );
      slugs.add(row.slug);
    }
    const categories = await db.query.productCategories.findMany({
      where: eq(schema.productCategories.projectId, p.id),
    });
    await db.transaction(async (tx) => {
      await tx
        .insert(schema.inventoryLocations)
        .values({
          projectId: p.id,
          name: "Default location",
          code: "DEFAULT",
          isDefault: true,
        })
        .onConflictDoNothing();
      const defaultLocation = await tx.query.inventoryLocations.findFirst({
        where: and(
          eq(schema.inventoryLocations.projectId, p.id),
          eq(schema.inventoryLocations.isDefault, true),
        ),
      });
      for (const row of rows) {
        const category = categories.find((x) => x.slug === row.categorySlug);
        const quantity = row.inventoryQuantity?.trim()
          ? Number(row.inventoryQuantity)
          : 0;
        if (
          !Number.isSafeInteger(quantity) ||
          quantity < 0 ||
          quantity > 1_000_000_000
        )
          throw new HttpError(
            400,
            `Invalid inventory quantity for ${row.name}`,
          );
        const threshold = row.lowStockThreshold?.trim()
          ? Number(row.lowStockThreshold)
          : 5;
        if (!Number.isSafeInteger(threshold) || threshold < 0)
          throw new HttpError(
            400,
            `Invalid low-stock threshold for ${row.name}`,
          );
        const [product] = await tx
          .insert(schema.products)
          .values({
            projectId: p.id,
            name: row.name,
            slug: row.slug,
            shortDescription: row.shortDescription || null,
            description: row.description || null,
            price: row.price ? Number(row.price) : null,
            sku: row.sku || null,
            weight: row.weight ? Number(row.weight) : null,
            dimensions: parseJsonValue(row.dimensions),
            images: parseJsonValue(row.images),
            categoryId: category?.id ?? null,
            isActive: row.isActive !== "false",
            isFeatured: row.isFeatured === "true",
            inventoryQuantity: quantity,
            lowStockThreshold: threshold,
            status:
              row.status === "published" || row.status === "private"
                ? row.status
                : "draft",
          })
          .returning({ id: schema.products.id });
        if (defaultLocation)
          await tx.insert(schema.inventoryBalances).values({
            productId: product.id,
            locationId: defaultLocation.id,
            quantity,
          });
      }
    });
    res.json({ imported: rows.length, skipped: 0, errors: [] });
  });
  router.post("/blogs/csv", upload.single("file"), async (req, res) => {
    const p = await owned(req, req.query.projectId),
      current = await user(req);
    if (!req.file) throw new HttpError(400, "Please select a CSV file");
    const rows = parseCsv(req.file.buffer.toString("utf8"));
    const existing = await db.query.blogs.findMany({
      where: eq(schema.blogs.projectId, p.id),
      columns: { slug: true },
    });
    const slugs = new Set(existing.map((x) => x.slug));
    for (const row of rows) {
      if (!row.title || !row.slug || slugs.has(row.slug))
        throw new HttpError(400, "Each blog requires a unique title and slug");
      slugs.add(row.slug);
    }
    const categories = await db.query.blogCategories.findMany({
      where: eq(schema.blogCategories.projectId, p.id),
    });
    await db.transaction(async (tx) => {
      for (const row of rows) {
        const status =
          row.status === "published" || row.status === "private"
            ? row.status
            : "draft";
        await tx.insert(schema.blogs).values({
          projectId: p.id,
          authorId: current.id,
          title: row.title,
          slug: row.slug,
          excerpt: row.excerpt || null,
          content: row.content || null,
          featuredImage: row.featuredImage || null,
          categoryId:
            categories.find((x) => x.slug === row.categorySlug)?.id ?? null,
          tags: parseJsonValue(row.tags),
          metaTitle: row.metaTitle || null,
          metaDescription: row.metaDescription || null,
          metaKeywords: row.metaKeywords || null,
          status,
          isFeatured: row.isFeatured === "true",
          isPublished: status === "published",
          publishedAt: status === "published" ? new Date() : null,
        });
      }
    });
    res.json({ imported: rows.length, skipped: 0, errors: [] });
  });
  return router;
}
