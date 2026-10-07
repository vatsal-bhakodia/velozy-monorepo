import { Router } from "express";
import type { Request, Router as ExpressRouter } from "express";
import multer from "multer";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@velozy/db";
import type { Environment } from "../../config/env.js";
import { HttpError } from "../../middleware/errors.js";
import { adminAccess } from "../../lib/admin-auth.js";

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_ROWS = 10_000;
const MAX_SOURCE_ROWS = 50_000;
const MAX_PAGE_SIZE = 100;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
});
const slug = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 240);
const text = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => {
  if (value === null || value === undefined || text(value) === "") return null;
  const n = Number(String(value).replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const asArray = (value: unknown): any[] => (Array.isArray(value) ? value : []);
const asCounts = (value: unknown): Record<string, number> =>
  value && typeof value === "object" ? (value as Record<string, number>) : {};

export function parseMigrationCsv(input: string): Record<string, string>[] {
  const source = input.replace(/^\uFEFF/, "");
  const matrix: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let closedQuote = false;
  const finishCell = () => {
    row.push(cell.trim());
    cell = "";
    closedQuote = false;
  };
  const finishRow = () => {
    finishCell();
    if (row.some((value) => value !== "")) matrix.push(row);
    row = [];
  };
  for (let i = 0; i < source.length; i += 1) {
    const current = source[i];
    const next = source[i + 1];
    if (quoted) {
      if (current === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (current === '"') {
        quoted = false;
        closedQuote = true;
      } else cell += current;
      continue;
    }
    if (closedQuote) {
      if (current === ",") finishCell();
      else if (current === "\n" || current === "\r") {
        if (current === "\r" && next === "\n") i += 1;
        finishRow();
      } else if (current !== " " && current !== "\t")
        throw new HttpError(
          422,
          "CSV has unexpected text after a quoted field.",
        );
      continue;
    }
    if (current === '"') {
      if (cell.trim())
        throw new HttpError(422, "CSV contains a quote in an unquoted field.");
      cell = "";
      quoted = true;
    } else if (current === ",") finishCell();
    else if (current === "\n" || current === "\r") {
      if (current === "\r" && next === "\n") i += 1;
      finishRow();
    } else cell += current;
  }
  if (quoted)
    throw new HttpError(422, "CSV contains an unclosed quoted field.");
  if (row.length || cell || closedQuote) finishRow();
  if (matrix.length < 2) return [];
  const headers = matrix[0].map((header) => header.trim());
  if (headers.some((header) => !header))
    throw new HttpError(422, "CSV contains an empty column header.");
  if (new Set(headers).size !== headers.length)
    throw new HttpError(422, "CSV contains duplicate column headers.");
  return matrix.slice(1).map((values, index) => {
    if (values.length !== headers.length)
      throw new HttpError(
        422,
        `CSV row ${index + 2} has ${values.length} fields; expected ${headers.length}.`,
      );
    return Object.fromEntries(
      headers.map((header, column) => [header, values[column]]),
    );
  });
}

type ImportRecord = {
  externalId: string;
  product: Record<string, any>;
  categories: Array<{ name: string }>;
  variants: any[];
  attributes: any[];
  media: string[];
  seo: Record<string, unknown>;
  metadata: Record<string, unknown>;
  warnings: string[];
};

export function detectAndNormalize(rows: Record<string, string>[]) {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const shopify = headers.includes("Handle");
  const woo =
    headers.includes("Type") &&
    (headers.includes("Name") || headers.includes("SKU"));
  if (!shopify && !woo)
    throw new HttpError(
      422,
      "Could not detect a Shopify or WooCommerce product export.",
    );
  const platform = shopify ? "shopify" : "woocommerce";
  const groups = new Map<
    string,
    Array<{ row: Record<string, string>; index: number }>
  >();
  const wooVariations = new Map<
    string,
    Array<{ row: Record<string, string>; index: number }>
  >();
  rows.forEach((row, index) => {
    if (shopify) {
      const key = text(row.Handle);
      if (key) groups.set(key, [...(groups.get(key) ?? []), { row, index }]);
    } else {
      if (text(row.Type).toLowerCase() === "variation") {
        const parent = text(row.Parent).replace(/^id:/i, "");
        if (parent)
          wooVariations.set(parent, [
            ...(wooVariations.get(parent) ?? []),
            { row, index },
          ]);
        return;
      }
      const key = text(row.ID) || text(row.SKU);
      if (key) groups.set(key, [...(groups.get(key) ?? []), { row, index }]);
    }
  });
  if (woo)
    for (const [key, group] of groups)
      group.push(...(wooVariations.get(key) ?? []));
  const records: ImportRecord[] = [];
  const rowNumbers: number[] = [];
  for (const [externalId, group] of groups) {
    const base = group.find(({ row }) => row.Title || row.Name) ?? group[0];
    const r = base.row;
    const name = text(r.Title || r.Name || externalId).slice(0, 255);
    const warnings: string[] = [];
    if (externalId.length > 500)
      warnings.push(
        "Source identity exceeds the maximum supported length of 500 characters.",
      );
    const price = number(
      r["Variant Price"] || r["Regular price"] || r["Sale price"],
    );
    for (const { row: item } of group) {
      const priceText = text(
        item[shopify ? "Variant Price" : "Regular price"] || item["Sale price"],
      );
      const parsedPrice = number(priceText);
      if (priceText && (parsedPrice === null || parsedPrice < 0))
        warnings.push(
          "A product or variant price is invalid; correct it in the source file.",
        );
      const stockText = text(item[shopify ? "Variant Inventory Qty" : "Stock"]);
      const parsedStock = number(stockText);
      if (
        stockText &&
        (!Number.isSafeInteger(parsedStock) ||
          (parsedStock ?? -1) < 0 ||
          (parsedStock ?? Infinity) > 1_000_000_000)
      )
        warnings.push(
          "A product or variant inventory quantity must be a non-negative whole number no greater than 1 billion.",
        );
    }
    const quantity = number(r["Variant Inventory Qty"] || r.Stock);
    if (
      (r["Variant Inventory Qty"] || r.Stock) &&
      (!Number.isSafeInteger(quantity) ||
        (quantity ?? -1) < 0 ||
        (quantity ?? Infinity) > 1_000_000_000)
    )
      warnings.push(
        "Inventory quantity must be a non-negative whole number no greater than 1 billion.",
      );
    const rawMedia = [
      ...new Set(
        group
          .flatMap(({ row }) =>
            shopify
              ? [text(row["Image Src"])]
              : text(row.Images)
                  .split(",")
                  .map((v) => v.trim()),
          )
          .filter(Boolean),
      ),
    ].slice(0, 100);
    const media = rawMedia.filter((value) => {
      try {
        const url = new URL(value);
        if (url.protocol === "https:" || url.protocol === "http:") return true;
        warnings.push(
          "A media URL uses an unsupported protocol and will be skipped.",
        );
        return false;
      } catch {
        warnings.push("A media URL is invalid and will be skipped.");
        return false;
      }
    });
    const variants = group
      .filter(({ row }) =>
        shopify
          ? row["Variant SKU"] || row["Variant Price"] || row["Option1 Value"]
          : text(row.Type).toLowerCase() === "variation",
      )
      .map(({ row }, index) => {
        const options = shopify
          ? [1, 2, 3]
              .map((i) => ({
                name: text(row[`Option${i} Name`]),
                value: text(row[`Option${i} Value`]),
              }))
              .filter(
                (o) =>
                  o.name &&
                  o.value &&
                  o.value.toLowerCase() !== "default title",
              )
          : [1, 2, 3]
              .map((i) => ({
                name: text(row[`Attribute ${i} name`]),
                value: text(row[`Attribute ${i} value(s)`]),
              }))
              .filter(
                (o) => o.name && o.value && o.value.toLowerCase() !== "any",
              );
        return {
          id: text(row.ID) || `${externalId}-${index + 1}`,
          name: options.map((o) => o.value).join(" / ") || name,
          options: Object.fromEntries(options.map((o) => [o.name, o.value])),
          sku: text(row[shopify ? "Variant SKU" : "SKU"]) || "",
          price:
            number(row[shopify ? "Variant Price" : "Regular price"]) ?? price,
          discountedPrice: number(
            row[shopify ? "Variant Compare At Price" : "Sale price"],
          ),
          inventoryQuantity:
            number(row[shopify ? "Variant Inventory Qty" : "Stock"]) ?? 0,
          images: [],
        };
      });
    const attributes = [
      ...new Set(variants.flatMap((v) => Object.keys(v.options))),
    ].map((name) => ({
      id: `${externalId}-${slug(name)}`,
      name,
      values: [
        ...new Set(variants.map((v) => v.options[name]).filter(Boolean)),
      ],
    }));
    const productQuantity = variants.length
      ? variants.reduce((sum, variant) => sum + variant.inventoryQuantity, 0)
      : (quantity ?? 0);
    const lowestVariantPrice = variants
      .map((variant) => variant.price)
      .filter((value): value is number => value !== null)
      .sort((a, b) => a - b)[0];
    const lowestVariantDiscount = variants
      .map((variant) => variant.discountedPrice)
      .filter((value): value is number => value !== null)
      .sort((a, b) => a - b)[0];
    const productPrice =
      variants.length && lowestVariantPrice !== undefined
        ? lowestVariantPrice
        : price;
    const productDiscountedPrice =
      variants.length && lowestVariantDiscount !== undefined
        ? lowestVariantDiscount
        : number(shopify ? null : r["Sale price"]);
    const categories = text(r["Product Category"] || r.Categories)
      .split(/[>,]/)
      .map((v) => v.trim())
      .filter(Boolean)
      .map((name) => ({ name }));
    records.push({
      externalId,
      product: {
        name,
        slug: slug(shopify ? externalId : name) || `product-${base.index + 1}`,
        description: text(r["Body (HTML)"] || r.Description) || null,
        shortDescription: text(r["Short description"]) || null,
        vendor: text(r.Vendor) || null,
        tags: text(r.Tags)
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
        sku: text(r["Variant SKU"] || r.SKU) || null,
        price: productPrice,
        discountedPrice: productDiscountedPrice,
        inventoryQuantity: productQuantity,
        status:
          r.Status?.toLowerCase() === "active" ||
          ["TRUE", "1"].includes(r.Published?.toUpperCase() ?? "")
            ? "published"
            : "draft",
      },
      categories,
      variants,
      attributes,
      media,
      seo: {
        title: text(r["SEO Title"] || r["Meta: title"]),
        description: text(r["SEO Description"] || r["Meta: description"]),
      },
      metadata: Object.fromEntries(
        Object.entries(r).filter(
          ([key]) =>
            ![
              "Title",
              "Name",
              "Body (HTML)",
              "Description",
              "Handle",
              "ID",
            ].includes(key),
        ),
      ),
      warnings: [...new Set(warnings)],
    });
    rowNumbers.push(base.index + 2);
  }
  return { platform, headers, records, rowNumbers, sourceGroups: groups };
}

export function adminMigrationRouter(environment: Environment): ExpressRouter {
  const { db, user, project } = adminAccess(environment.DATABASE_URL);
  const router = Router();
  const owned = async (
    req: Request,
    value: unknown,
    permission: "commerce:read" | "commerce:write" = req.method === "GET"
      ? "commerce:read"
      : "commerce:write",
  ) =>
    project(z.string().uuid().parse(value), (await user(req)).id, permission);

  // Runs are the durable work queue and history for this project's imports.
  router.get("/migration", async (req, res) => {
    const p = await owned(req, req.query.projectId);
    const page = z.coerce
      .number()
      .int()
      .min(1)
      .default(1)
      .parse(req.query.page);
    const pageSize = z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_PAGE_SIZE)
      .default(25)
      .parse(req.query.pageSize);
    const status = z
      .enum([
        "preview",
        "committing",
        "committed",
        "partial",
        "failed",
        "rolled_back",
      ])
      .optional()
      .parse(req.query.status);
    const platform = z
      .enum(["shopify", "woocommerce"])
      .optional()
      .parse(req.query.platform);
    const conditions = [eq(schema.migrationRuns.projectId, p.id)];
    if (status) conditions.push(eq(schema.migrationRuns.status, status));
    if (platform) conditions.push(eq(schema.migrationRuns.platform, platform));
    const where = and(...conditions);
    const [runs, count] = await Promise.all([
      db.query.migrationRuns.findMany({
        where,
        orderBy: [desc(schema.migrationRuns.createdAt)],
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.migrationRuns)
        .where(where),
    ]);
    res.json({
      runs,
      pagination: { page, pageSize, total: count[0]?.count ?? 0 },
    });
  });

  router.get("/migration/records", async (req, res) => {
    const p = await owned(req, req.query.projectId);
    const platform = z
      .enum(["shopify", "woocommerce"])
      .optional()
      .parse(req.query.platform);
    const query = z.string().trim().max(200).optional().parse(req.query.q);
    const page = z.coerce
      .number()
      .int()
      .min(1)
      .default(1)
      .parse(req.query.page);
    const pageSize = z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_PAGE_SIZE)
      .default(50)
      .parse(req.query.pageSize);
    const conditions = [eq(schema.productExternalRefs.projectId, p.id)];
    if (platform)
      conditions.push(eq(schema.productExternalRefs.platform, platform));
    if (query)
      conditions.push(
        or(
          ilike(schema.products.name, `%${query}%`),
          ilike(schema.products.sku, `%${query}%`),
          ilike(schema.productExternalRefs.sourceExternalId, `%${query}%`),
        )!,
      );
    const where = and(...conditions);
    const [refs, count] = await Promise.all([
      db
        .select({ ref: schema.productExternalRefs, product: schema.products })
        .from(schema.productExternalRefs)
        .innerJoin(
          schema.products,
          eq(schema.productExternalRefs.productId, schema.products.id),
        )
        .where(where)
        .orderBy(desc(schema.productExternalRefs.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.productExternalRefs)
        .innerJoin(
          schema.products,
          eq(schema.productExternalRefs.productId, schema.products.id),
        )
        .where(where),
    ]);
    res.json({
      records: refs.map(({ ref, product }) => ({ ...ref, product })),
      pagination: { page, pageSize, total: count[0]?.count ?? 0 },
    });
  });

  router.get("/migration/:runId", async (req, res) => {
    const p = await owned(req, req.query.projectId);
    const runId = z.string().uuid().parse(req.params.runId);
    const page = z.coerce
      .number()
      .int()
      .min(1)
      .default(1)
      .parse(req.query.page);
    const pageSize = z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_PAGE_SIZE)
      .default(50)
      .parse(req.query.pageSize);
    const state = z
      .enum(["pending", "committed", "updated", "skipped", "failed"])
      .optional()
      .parse(req.query.rowStatus);
    const run = await db.query.migrationRuns.findFirst({
      where: and(
        eq(schema.migrationRuns.id, runId),
        eq(schema.migrationRuns.projectId, p.id),
      ),
    });
    if (!run) throw new HttpError(404, "Migration run not found");
    const conditions = [eq(schema.migrationRows.runId, runId)];
    if (state) conditions.push(eq(schema.migrationRows.status, state));
    const where = and(...conditions);
    const [rows, count] = await Promise.all([
      db.query.migrationRows.findMany({
        where,
        orderBy: [schema.migrationRows.sourceRowNumber],
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.migrationRows)
        .where(where),
    ]);
    res.json({
      run,
      rows,
      pagination: { page, pageSize, total: count[0]?.count ?? 0 },
    });
  });

  router.post("/migration", upload.single("file"), async (req, res) => {
    const p = await owned(req, req.query.projectId);
    if (!req.file) throw new HttpError(400, "Please select a CSV file");
    if (!req.file.originalname.toLowerCase().endsWith(".csv"))
      throw new HttpError(415, "Upload a CSV file.");
    const sourceRows = parseMigrationCsv(req.file.buffer.toString("utf8"));
    if (sourceRows.length > MAX_SOURCE_ROWS)
      throw new HttpError(
        413,
        `This file contains more than ${MAX_SOURCE_ROWS.toLocaleString()} CSV rows. Split it into smaller files.`,
      );
    const parsed = detectAndNormalize(sourceRows);
    const expectedPlatform = z
      .enum(["shopify", "woocommerce"])
      .optional()
      .parse(req.query.platform);
    if (expectedPlatform && expectedPlatform !== parsed.platform)
      throw new HttpError(
        422,
        `This file is a ${parsed.platform} export, not ${expectedPlatform}.`,
      );
    if (!parsed.records.length)
      throw new HttpError(
        422,
        "No importable products were found. Check that product identity columns are populated.",
      );
    if (parsed.records.length > MAX_ROWS)
      throw new HttpError(
        413,
        `This file contains more than ${MAX_ROWS.toLocaleString()} importable products. Split it into smaller files.`,
      );
    const duplicates = parsed.records
      .map((r) => r.externalId)
      .filter((id, i, all) => all.indexOf(id) !== i);
    const dupeSet = new Set(duplicates);
    const warnings = parsed.records.reduce(
      (sum, r) => sum + r.warnings.length + (dupeSet.has(r.externalId) ? 1 : 0),
      0,
    );
    const [run] = await db.transaction(async (tx) => {
      const [createdRun] = await tx
        .insert(schema.migrationRuns)
        .values({
          projectId: p.id,
          platform: parsed.platform,
          sourceFilename: req.file!.originalname.slice(0, 255),
          detectedProfiles: [`${parsed.platform}-core`],
          status: "preview",
          counts: {
            sourceRows: sourceRows.length,
            products: parsed.records.length,
            warnings,
            errors: 0,
          },
        })
        .returning({ id: schema.migrationRuns.id });
      const values = parsed.records.map((record, i) => ({
        runId: createdRun.id,
        sourceRowNumber: parsed.rowNumbers[i],
        rawRow: parsed.sourceGroups.get(record.externalId)?.[0]?.row ?? {},
        normalizedRecord: record,
        status: "pending",
        errors: [],
        warnings: [
          ...record.warnings,
          ...(dupeSet.has(record.externalId)
            ? [
                "Duplicate product identity in this file; only one source row can be committed.",
              ]
            : []),
        ],
      }));
      for (let i = 0; i < values.length; i += 250)
        await tx.insert(schema.migrationRows).values(values.slice(i, i + 250));
      return [createdRun];
    });
    res
      .status(201)
      .json({
        runId: run.id,
        platform: parsed.platform,
        profiles: [`${parsed.platform}-core`],
        headers: parsed.headers,
        records: parsed.records,
        counts: { products: parsed.records.length, warnings, errors: 0 },
      });
  });

  router.put("/migration", async (req, res) => {
    const p = await owned(req, req.query.projectId);
    const runId = z.string().uuid().parse(req.body?.runId);
    const run = await db.query.migrationRuns.findFirst({
      where: and(
        eq(schema.migrationRuns.id, runId),
        eq(schema.migrationRuns.projectId, p.id),
      ),
    });
    if (!run) throw new HttpError(404, "Migration run not found");
    if (run.status === "committed" || run.status === "partial") {
      res.json({
        status: run.status,
        message: "This migration has already been processed.",
        ...asCounts(run.counts),
      });
      return;
    }
    if (run.status !== "preview" && run.status !== "failed")
      throw new HttpError(
        409,
        `Cannot commit a migration in ${run.status} state.`,
      );
    let imported = 0,
      updated = 0,
      skipped = 0,
      failed = 0;
    const completedCounts: Array<{
      rows: number;
      imported: number;
      updated: number;
      skipped: number;
      failed: number;
      status: string;
    }> = [];
    const alreadyProcessed: Array<{
      status: string;
      counts: Record<string, number>;
    }> = [];
    await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT id FROM migration_runs WHERE id = ${runId} AND project_id = ${p.id} FOR UPDATE`,
      );
      const lockedRun = await tx.query.migrationRuns.findFirst({
        where: and(
          eq(schema.migrationRuns.id, runId),
          eq(schema.migrationRuns.projectId, p.id),
        ),
      });
      if (!lockedRun) throw new HttpError(404, "Migration run not found");
      if (lockedRun.status === "committed" || lockedRun.status === "partial") {
        alreadyProcessed.push({
          status: lockedRun.status,
          counts: asCounts(lockedRun.counts),
        });
        return;
      }
      if (lockedRun.status !== "preview" && lockedRun.status !== "failed")
        throw new HttpError(
          409,
          `Cannot commit a migration in ${lockedRun.status} state.`,
        );
      const rows = await tx.query.migrationRows.findMany({
        where: and(
          eq(schema.migrationRows.runId, runId),
          eq(schema.migrationRows.status, "pending"),
        ),
        orderBy: [schema.migrationRows.sourceRowNumber],
        limit: MAX_ROWS,
      });
      await tx
        .update(schema.migrationRuns)
        .set({ status: "committing", updatedAt: new Date() })
        .where(eq(schema.migrationRuns.id, runId));
      await tx
        .insert(schema.inventoryLocations)
        .values({
          projectId: p.id,
          name: "Default location",
          code: "DEFAULT",
          isDefault: true,
        })
        .onConflictDoNothing();
      const location = await tx.query.inventoryLocations.findFirst({
        where: and(
          eq(schema.inventoryLocations.projectId, p.id),
          eq(schema.inventoryLocations.isDefault, true),
        ),
      });
      for (const row of rows) {
        const record = row.normalizedRecord as ImportRecord | null;
        const error = (message: string) =>
          tx
            .update(schema.migrationRows)
            .set({ status: "failed", errors: [message] })
            .where(eq(schema.migrationRows.id, row.id));
        try {
          if (!record?.externalId || !record.product?.name) {
            skipped++;
            await tx
              .update(schema.migrationRows)
              .set({
                status: "skipped",
                errors: ["Product identity or name is missing."],
              })
              .where(eq(schema.migrationRows.id, row.id));
            continue;
          }
          const blockingWarning = record.warnings.find(
            (w) =>
              w.includes("price") ||
              w.includes("inventory quantity") ||
              w.includes("Source identity"),
          );
          if (blockingWarning) {
            failed++;
            await error(blockingWarning);
            continue;
          }
          const sourceId = record.externalId;
          const ref = await tx.query.productExternalRefs.findFirst({
            where: and(
              eq(schema.productExternalRefs.projectId, p.id),
              eq(schema.productExternalRefs.platform, run.platform),
              eq(schema.productExternalRefs.sourceExternalId, sourceId),
            ),
          });
          const categoryNames = [
            ...new Set(
              (record.categories ?? [])
                .map((category) => text(category.name))
                .filter(Boolean),
            ),
          ];
          const categoryIds: string[] = [];
          for (const categoryName of categoryNames) {
            const categorySlug =
              slug(categoryName) || `category-${row.sourceRowNumber}`;
            const [created] = await tx
              .insert(schema.productCategories)
              .values({
                projectId: p.id,
                name: categoryName.slice(0, 255),
                slug: categorySlug,
              })
              .onConflictDoNothing({
                target: [
                  schema.productCategories.projectId,
                  schema.productCategories.slug,
                ],
              })
              .returning({ id: schema.productCategories.id });
            const categoryId =
              created?.id ??
              (
                await tx.query.productCategories.findFirst({
                  where: and(
                    eq(schema.productCategories.projectId, p.id),
                    eq(schema.productCategories.slug, categorySlug),
                  ),
                })
              )?.id;
            if (categoryId) categoryIds.push(categoryId);
          }
          const categoryId = categoryIds[0] ?? null;
          const quantity = Number(record.product.inventoryQuantity ?? 0);
          if (
            !Number.isSafeInteger(quantity) ||
            quantity < 0 ||
            quantity > 1_000_000_000
          ) {
            failed++;
            await error(
              `Invalid inventory quantity for ${record.product.name}.`,
            );
            continue;
          }
          const input = {
            projectId: p.id,
            categoryId,
            name: record.product.name.slice(0, 255),
            slug: (record.product.slug || sourceId).slice(0, 255),
            description: record.product.description,
            shortDescription: record.product.shortDescription,
            vendor: record.product.vendor,
            tags: record.product.tags ?? [],
            sku: record.product.sku,
            price: record.product.price,
            inventoryQuantity: quantity,
            discountedPrice: record.product.discountedPrice,
            trackInventory: true,
            status:
              record.product.status === "published"
                ? ("published" as const)
                : ("draft" as const),
            images: record.media ?? [],
            variants: record.variants ?? [],
            attributes: record.attributes ?? [],
            sourceMetadata: {
              ...record.metadata,
              seo: record.seo,
              migrationCategories: categoryNames,
            },
            pluginMetadata: {},
            productType:
              record.variants?.length > 1 || record.attributes?.length
                ? "variable"
                : "simple",
          };
          let productId: string;
          if (ref) {
            await tx.execute(
              sql`SELECT id FROM products WHERE id = ${ref.productId} FOR UPDATE`,
            );
            const old = await tx.query.products.findFirst({
              where: and(
                eq(schema.products.id, ref.productId),
                eq(schema.products.projectId, p.id),
              ),
            });
            if (!old) {
              failed++;
              await error(
                "The previously imported product no longer exists. Remove or relink its source reference before retrying.",
              );
              continue;
            }
            const delta = quantity - (old.inventoryQuantity ?? 0);
            if (location && delta !== 0) {
              const balance = await tx.query.inventoryBalances.findFirst({
                where: and(
                  eq(schema.inventoryBalances.productId, old.id),
                  eq(schema.inventoryBalances.locationId, location.id),
                ),
              });
              const next = (balance?.quantity ?? 0) + delta;
              if (next < 0) {
                failed++;
                await error(
                  "Stock at the default location is below the existing product quantity; reconcile stock before importing.",
                );
                continue;
              }
              await tx
                .insert(schema.inventoryBalances)
                .values({
                  productId: old.id,
                  locationId: location.id,
                  quantity: next,
                })
                .onConflictDoUpdate({
                  target: [
                    schema.inventoryBalances.productId,
                    schema.inventoryBalances.locationId,
                  ],
                  set: { quantity: next, updatedAt: new Date() },
                });
              await tx
                .insert(schema.inventoryMovements)
                .values({
                  projectId: p.id,
                  productId: old.id,
                  locationId: location.id,
                  quantityChange: delta,
                  reason: "Catalog migration inventory update",
                });
            }
            await tx
              .update(schema.products)
              .set({ ...input, updatedAt: new Date() })
              .where(eq(schema.products.id, old.id));
            productId = old.id;
            updated++;
            await tx
              .update(schema.productExternalRefs)
              .set({ migrationRunId: runId, createdByRun: false })
              .where(eq(schema.productExternalRefs.id, ref.id));
          } else {
            const [created] = await tx
              .insert(schema.products)
              .values(input)
              .onConflictDoNothing({
                target: [schema.products.projectId, schema.products.slug],
              })
              .returning({ id: schema.products.id });
            if (!created) {
              failed++;
              await error(
                `A product already uses slug “${input.slug}”. Change its slug or resolve the existing product before importing.`,
              );
              continue;
            }
            productId = created.id;
            if (location)
              await tx
                .insert(schema.inventoryBalances)
                .values({ productId, locationId: location.id, quantity });
            await tx
              .insert(schema.productExternalRefs)
              .values({
                projectId: p.id,
                platform: run.platform,
                sourceExternalId: sourceId,
                productId,
                migrationRunId: runId,
                createdByRun: true,
              });
            imported++;
          }
          await tx
            .update(schema.migrationRows)
            .set({
              status: ref ? "updated" : "committed",
              createdProductId: productId,
              errors: [],
            })
            .where(eq(schema.migrationRows.id, row.id));
        } catch (cause) {
          // Unexpected database failures abort the transaction to avoid exposing partial product writes.
          throw cause;
        }
      }
      const allRows = await tx.query.migrationRows.findMany({
        where: eq(schema.migrationRows.runId, runId),
        columns: { status: true },
      });
      const totals = {
        rows: allRows.length,
        imported: allRows.filter((item) => item.status === "committed").length,
        updated: allRows.filter((item) => item.status === "updated").length,
        skipped: allRows.filter((item) => item.status === "skipped").length,
        failed: allRows.filter((item) => item.status === "failed").length,
      };
      const finalStatus = totals.failed
        ? totals.imported + totals.updated + totals.skipped
          ? "partial"
          : "failed"
        : "committed";
      completedCounts.push({ ...totals, status: finalStatus });
      await tx
        .update(schema.migrationRuns)
        .set({
          status: finalStatus,
          committedAt: new Date(),
          counts: totals,
          updatedAt: new Date(),
        })
        .where(eq(schema.migrationRuns.id, runId));
    });
    if (alreadyProcessed.length) {
      const processed = alreadyProcessed[0];
      res.json({
        status: processed.status,
        message: "This migration has already been processed.",
        ...processed.counts,
      });
      return;
    }
    const outcome = completedCounts[0] ?? {
      status: "committed",
      imported,
      updated,
      skipped,
      failed,
      rows: imported + updated + skipped + failed,
    };
    res.json(outcome);
  });

  router.post("/migration/:runId/retry", async (req, res) => {
    const p = await owned(req, req.query.projectId);
    const runId = z.string().uuid().parse(req.params.runId);
    const run = await db.query.migrationRuns.findFirst({
      where: and(
        eq(schema.migrationRuns.id, runId),
        eq(schema.migrationRuns.projectId, p.id),
      ),
    });
    if (!run) throw new HttpError(404, "Migration run not found");
    await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT id FROM migration_runs WHERE id = ${runId} AND project_id = ${p.id} FOR UPDATE`,
      );
      const locked = await tx.query.migrationRuns.findFirst({
        where: and(
          eq(schema.migrationRuns.id, runId),
          eq(schema.migrationRuns.projectId, p.id),
        ),
      });
      if (!locked) throw new HttpError(404, "Migration run not found");
      if (!["partial", "failed"].includes(locked.status))
        throw new HttpError(409, "Only partially failed runs can be retried.");
      await tx
        .update(schema.migrationRows)
        .set({ status: "pending", errors: [] })
        .where(
          and(
            eq(schema.migrationRows.runId, runId),
            eq(schema.migrationRows.status, "failed"),
          ),
        );
      await tx
        .update(schema.migrationRuns)
        .set({ status: "preview", updatedAt: new Date() })
        .where(eq(schema.migrationRuns.id, runId));
    });
    res.json({ status: "ready_to_retry" });
  });

  router.delete("/migration", async (req, res) => {
    const p = await owned(req, req.query.projectId);
    const runId = z.string().uuid().parse(req.query.runId);
    let removed = 0;
    await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT id FROM migration_runs WHERE id = ${runId} AND project_id = ${p.id} FOR UPDATE`,
      );
      const run = await tx.query.migrationRuns.findFirst({
        where: and(
          eq(schema.migrationRuns.id, runId),
          eq(schema.migrationRuns.projectId, p.id),
        ),
      });
      if (!run) throw new HttpError(404, "Migration run not found");
      if (run.status === "committing")
        throw new HttpError(
          409,
          "A migration cannot be rolled back while it is committing.",
        );
      const refs = await tx.query.productExternalRefs.findMany({
        where: and(
          eq(schema.productExternalRefs.projectId, p.id),
          eq(schema.productExternalRefs.migrationRunId, runId),
          eq(schema.productExternalRefs.createdByRun, true),
        ),
      });
      for (const ref of refs) {
        const [orders, carts, movements, otherRefs] = await Promise.all([
          tx
            .select({ id: schema.orderItems.id })
            .from(schema.orderItems)
            .where(eq(schema.orderItems.productId, ref.productId))
            .limit(1),
          tx
            .select({ id: schema.cartItems.id })
            .from(schema.cartItems)
            .where(eq(schema.cartItems.productId, ref.productId))
            .limit(1),
          tx
            .select({ id: schema.inventoryMovements.id })
            .from(schema.inventoryMovements)
            .where(eq(schema.inventoryMovements.productId, ref.productId))
            .limit(1),
          tx
            .select({ id: schema.productExternalRefs.id })
            .from(schema.productExternalRefs)
            .where(
              and(
                eq(schema.productExternalRefs.productId, ref.productId),
                sql`${schema.productExternalRefs.id} <> ${ref.id}`,
              ),
            )
            .limit(1),
        ]);
        if (
          orders.length ||
          carts.length ||
          movements.length ||
          otherRefs.length
        )
          throw new HttpError(
            409,
            "Rollback stopped because an imported product now has order, cart, inventory history, or another source reference. Keep the product or resolve those references manually.",
          );
        await tx
          .delete(schema.products)
          .where(
            and(
              eq(schema.products.id, ref.productId),
              eq(schema.products.projectId, p.id),
            ),
          );
        removed++;
      }
      await tx
        .update(schema.migrationRuns)
        .set({
          status: "rolled_back",
          counts: { ...asCounts(run.counts), rollbackRemoved: removed },
          updatedAt: new Date(),
        })
        .where(eq(schema.migrationRuns.id, runId));
    });
    res.json({ status: "rolled_back", removed });
  });
  return router;
}
