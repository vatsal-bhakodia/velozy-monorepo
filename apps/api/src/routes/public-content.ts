import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { and, eq } from "drizzle-orm";
import { createDb, schema } from "@velozy/db";
import type { Environment } from "../config/env.js";

function limit(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.max(1, Math.min(12, Math.round(parsed)))
    : fallback;
}

function price(value: unknown, currency: string) {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(numeric)
    : "";
}

export function publicContentRouter(environment: Environment): ExpressRouter {
  const db = createDb(environment.DATABASE_URL);
  const router = Router();

  router.get(
    "/public/projects/:projectId/productCategories",
    async (request, response) => {
      const rows = await db.query.productCategories.findMany({
        where: and(
          eq(schema.productCategories.projectId, request.params.projectId),
          eq(schema.productCategories.isActive, true),
        ),
        limit: limit(request.query.limit, 8),
        orderBy: (table, { asc }) => [asc(table.sortOrder), asc(table.name)],
      });
      response.json({
        source: "productCategories",
        items: rows.map((category) => ({
          id: category.id,
          title: category.heading || category.name,
          summary: category.description || "",
          image: category.image || "",
          href: `/categories/${category.slug}`,
          badge: category.parentId ? "Subcategory" : "Category",
          meta: "",
          price: "",
        })),
      });
    },
  );

  router.get(
    "/public/projects/:projectId/products",
    async (request, response) => {
      const projectId = request.params.projectId;
      const featured = request.query.featured === "true";
      const find = (onlyFeatured: boolean) =>
        db.query.products.findMany({
          where: and(
            eq(schema.products.projectId, projectId),
            eq(schema.products.isActive, true),
            eq(schema.products.status, "published"),
            ...(onlyFeatured ? [eq(schema.products.isFeatured, true)] : []),
          ),
          limit: limit(request.query.limit, 6),
          orderBy: (table, { desc }) => [desc(table.createdAt)],
          with: { category: true, page: true, project: true },
        });
      let rows = await find(featured);
      if (featured && rows.length === 0) rows = await find(false);
      response.json({
        source: "products",
        items: rows.map((product) => ({
          id: product.id,
          title: product.name,
          summary: product.shortDescription || product.description || "",
          image: Array.isArray(product.images) ? product.images[0] || "" : "",
          href: product.page
            ? `/${product.page.slug}`
            : `/products/${product.slug}`,
          badge: product.category?.name || "",
          meta: product.sku || "",
          price: price(
            product.discountedPrice ?? product.price,
            product.project.currency,
          ),
          compareAtPrice: product.discountedPrice
            ? price(product.price, product.project.currency)
            : "",
          productKind: product.productKind,
          purchaseMode: product.project.purchaseMode,
        })),
      });
    },
  );

  router.get("/public/projects/:projectId/blogs", async (request, response) => {
    const projectId = request.params.projectId;
    const featured = request.query.featured === "true";
    const find = (onlyFeatured: boolean) =>
      db.query.blogs.findMany({
        where: and(
          eq(schema.blogs.projectId, projectId),
          eq(schema.blogs.isPublished, true),
          eq(schema.blogs.status, "published"),
          ...(onlyFeatured ? [eq(schema.blogs.isFeatured, true)] : []),
        ),
        limit: limit(request.query.limit, 3),
        orderBy: (table, { desc }) => [
          desc(table.publishedAt),
          desc(table.createdAt),
        ],
        with: { category: true, author: true },
      });
    let rows = await find(featured);
    if (featured && rows.length === 0) rows = await find(false);
    const formatter = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    response.json({
      source: "blogs",
      items: rows.map((blog) => ({
        id: blog.id,
        title: blog.title,
        summary: blog.excerpt || "",
        image: blog.featuredImage || "",
        href: `/blogs/${blog.slug}`,
        badge: blog.category?.name || "",
        meta: blog.publishedAt
          ? formatter.format(blog.publishedAt)
          : blog.author?.name || "",
        price: "",
      })),
    });
  });

  return router;
}
