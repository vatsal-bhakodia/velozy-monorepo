import { Router } from "express";
import type { Request, Router as ExpressRouter } from "express";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { createDb, schema } from "@velozy/db";
import type { Environment } from "../../config/env.js";
import { HttpError } from "../../middleware/errors.js";
import { adminAccess } from "../../lib/admin-auth.js";
import {
  collectionFieldsSchema,
  collectionKey,
  compatibleFields,
  validateCollectionValues,
} from "../../lib/custom-collections.js";

const idSchema = z.string().uuid();
const collectionInput = z
  .object({
    projectId: idSchema,
    name: z.string().trim().min(1).max(120),
    key: z.string().trim().max(80).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    fields: collectionFieldsSchema,
  })
  .strict();
const recordInput = z
  .object({
    values: z.record(z.string(), z.unknown()),
    status: z.enum(["draft", "published"]).optional(),
    sortOrder: z.number().int().min(0).max(100000).optional(),
  })
  .strict();

export function adminCustomCollectionsRouter(
  environment: Environment,
): ExpressRouter {
  const { db, project } = adminAccess(environment.DATABASE_URL);
  const router = Router();
  const userId = (request: Request) => {
    if (!request.auth?.userId) throw new HttpError(401, "Unauthorized");
    return request.auth.userId;
  };
  const requireProject = async (
    request: Request,
    projectId: string,
    write = false,
  ) =>
    project(
      projectId,
      userId(request),
      write ? "content:write" : "content:read",
    );
  const collectionFor = async (
    request: Request,
    collectionId: unknown,
    write = false,
  ) => {
    const id = idSchema.safeParse(collectionId);
    if (!id.success)
      throw new HttpError(
        400,
        "Valid collection ID is required",
        "validation_error",
      );
    const collection = await db.query.customCollections.findFirst({
      where: eq(schema.customCollections.id, id.data),
    });
    if (!collection) throw new HttpError(404, "Collection not found");
    await requireProject(request, collection.projectId, write);
    return collection;
  };

  router.get("/content-collections", async (request, response) => {
    const projectId = idSchema.safeParse(request.query.projectId);
    if (!projectId.success)
      throw new HttpError(400, "Project ID is required", "validation_error");
    await requireProject(request, projectId.data);
    const collections = await db.query.customCollections.findMany({
      where: and(
        eq(schema.customCollections.projectId, projectId.data),
        eq(schema.customCollections.isArchived, false),
      ),
      orderBy: [asc(schema.customCollections.name)],
    });
    response.json({ collections });
  });

  router.post("/content-collections", async (request, response) => {
    const input = collectionInput.safeParse(request.body);
    if (!input.success)
      throw new HttpError(
        400,
        input.error.issues[0]?.message || "Invalid collection",
        "validation_error",
      );
    const user = userId(request);
    await requireProject(request, input.data.projectId, true);
    const key = collectionKey(input.data.key || input.data.name);
    if (!key)
      throw new HttpError(
        400,
        "Collection needs a valid name or key",
        "validation_error",
      );
    const collection = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${input.data.projectId}), hashtext(${key}))`,
      );
      const existing = await tx.query.customCollections.findFirst({
        where: and(
          eq(schema.customCollections.projectId, input.data.projectId),
          eq(schema.customCollections.key, key),
        ),
      });
      if (existing)
        throw new HttpError(
          409,
          "A collection with this key already exists",
          "duplicate_collection",
        );
      const [created] = await tx
        .insert(schema.customCollections)
        .values({ ...input.data, key, createdBy: user })
        .returning();
      return created;
    });
    response.status(201).json({ collection });
  });

  router.put(
    "/content-collections/:collectionId",
    async (request, response) => {
      const collection = await collectionFor(
        request,
        request.params.collectionId,
        true,
      );
      const input = z
        .object({
          name: z.string().trim().min(1).max(120).optional(),
          description: z.string().trim().max(2000).nullable().optional(),
          fields: collectionFieldsSchema.optional(),
          isArchived: z.boolean().optional(),
          expectedUpdatedAt: z.string().datetime(),
        })
        .strict()
        .safeParse(request.body);
      if (!input.success)
        throw new HttpError(
          400,
          input.error.issues[0]?.message || "Invalid collection update",
          "validation_error",
        );
      if (!Object.keys(input.data).length)
        throw new HttpError(
          400,
          "No collection changes provided",
          "validation_error",
        );
      if (
        input.data.fields &&
        !compatibleFields(collection.fields, input.data.fields)
      ) {
        throw new HttpError(
          409,
          "Keep existing field keys and types to preserve saved records",
          "schema_conflict",
        );
      }
      if (input.data.fields) {
        const existingRecords = await db.query.customCollectionRecords.findMany(
          {
            where: eq(
              schema.customCollectionRecords.collectionId,
              collection.id,
            ),
            columns: { values: true },
          },
        );
        if (
          existingRecords.some(
            (record) =>
              !validateCollectionValues(input.data.fields!, record.values)
                .success,
          )
        ) {
          throw new HttpError(
            409,
            "The updated schema conflicts with saved records. Fill or repair those values before changing required fields or options.",
            "schema_conflict",
          );
        }
      }
      const { expectedUpdatedAt, ...changes } = input.data;
      const [updated] = await db
        .update(schema.customCollections)
        .set({ ...changes, updatedAt: new Date() })
        .where(
          and(
            eq(schema.customCollections.id, collection.id),
            eq(schema.customCollections.updatedAt, new Date(expectedUpdatedAt)),
          ),
        )
        .returning();
      if (!updated)
        throw new HttpError(
          409,
          "This collection changed since it was opened. Reload and apply your edits again.",
          "stale_update",
        );
      response.json({ collection: updated });
    },
  );

  router.get(
    "/content-collections/:collectionId/records",
    async (request, response) => {
      const collection = await collectionFor(
        request,
        request.params.collectionId,
      );
      const search =
        typeof request.query.search === "string"
          ? request.query.search.trim().slice(0, 120)
          : "";
      const status =
        request.query.status === "draft" || request.query.status === "published"
          ? request.query.status
          : undefined;
      const requestedPage = Number(request.query.page);
      const requestedSize = Number(request.query.pageSize);
      const page = Number.isInteger(requestedPage)
        ? Math.max(1, Math.min(100000, requestedPage))
        : 1;
      const pageSize = Number.isInteger(requestedSize)
        ? Math.max(1, Math.min(100, requestedSize))
        : 20;
      const filters = [
        eq(schema.customCollectionRecords.collectionId, collection.id),
        ...(status ? [eq(schema.customCollectionRecords.status, status)] : []),
        ...(search
          ? [
              sql`${schema.customCollectionRecords.values}::text ILIKE ${`%${search}%`}`,
            ]
          : []),
      ];
      const where = and(...filters);
      const [totals, records] = await Promise.all([
        db
          .select({ total: count() })
          .from(schema.customCollectionRecords)
          .where(where),
        db.query.customCollectionRecords.findMany({
          where,
          orderBy: [
            asc(schema.customCollectionRecords.sortOrder),
            desc(schema.customCollectionRecords.updatedAt),
          ],
          limit: pageSize,
          offset: (page - 1) * pageSize,
        }),
      ]);
      response.json({
        records,
        total: totals[0]?.total || 0,
        page,
        pageSize,
        collection,
      });
    },
  );

  router.post(
    "/content-collections/:collectionId/records",
    async (request, response) => {
      const collection = await collectionFor(
        request,
        request.params.collectionId,
        true,
      );
      const input = recordInput.safeParse(request.body);
      if (!input.success)
        throw new HttpError(
          400,
          input.error.issues[0]?.message || "Invalid record",
          "validation_error",
        );
      const values = validateCollectionValues(
        collection.fields as z.infer<typeof collectionFieldsSchema>,
        input.data.values,
      );
      if (!values.success)
        throw new HttpError(400, values.error, "validation_error");
      const status = input.data.status || "draft";
      const [record] = await db
        .insert(schema.customCollectionRecords)
        .values({
          collectionId: collection.id,
          values: values.value,
          status,
          sortOrder: input.data.sortOrder || 0,
          createdBy: userId(request),
          publishedAt: status === "published" ? new Date() : null,
        })
        .returning();
      response.status(201).json({ record });
    },
  );

  router.put(
    "/content-collections/:collectionId/records/:recordId",
    async (request, response) => {
      const collection = await collectionFor(
        request,
        request.params.collectionId,
        true,
      );
      const recordId = idSchema.safeParse(request.params.recordId);
      const input = recordInput
        .partial()
        .extend({ expectedUpdatedAt: z.string().datetime() })
        .strict()
        .safeParse(request.body);
      if (!recordId.success || !input.success)
        throw new HttpError(400, "Invalid record update", "validation_error");
      const existing = await db.query.customCollectionRecords.findFirst({
        where: and(
          eq(schema.customCollectionRecords.id, recordId.data),
          eq(schema.customCollectionRecords.collectionId, collection.id),
        ),
      });
      if (!existing) throw new HttpError(404, "Record not found");
      const values = input.data.values
        ? validateCollectionValues(
            collection.fields as z.infer<typeof collectionFieldsSchema>,
            input.data.values,
          )
        : null;
      if (values && !values.success)
        throw new HttpError(400, values.error, "validation_error");
      const status = input.data.status || existing.status;
      const [record] = await db
        .update(schema.customCollectionRecords)
        .set({
          values: values?.success ? values.value : undefined,
          status,
          sortOrder: input.data.sortOrder,
          publishedAt:
            status === "published" ? existing.publishedAt || new Date() : null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.customCollectionRecords.id, existing.id),
            eq(schema.customCollectionRecords.collectionId, collection.id),
            eq(
              schema.customCollectionRecords.updatedAt,
              new Date(input.data.expectedUpdatedAt),
            ),
          ),
        )
        .returning();
      if (!record)
        throw new HttpError(
          409,
          "This record changed since it was opened. Reload and apply your edits again.",
          "stale_update",
        );
      response.json({ record });
    },
  );

  router.post(
    "/content-collections/:collectionId/records/status",
    async (request, response) => {
      const collection = await collectionFor(
        request,
        request.params.collectionId,
        true,
      );
      const input = z
        .object({
          ids: z.array(idSchema).min(1).max(100),
          status: z.enum(["draft", "published"]),
        })
        .strict()
        .safeParse(request.body);
      if (!input.success)
        throw new HttpError(
          400,
          "Invalid bulk status update",
          "validation_error",
        );
      const updated = await db
        .update(schema.customCollectionRecords)
        .set({
          status: input.data.status,
          publishedAt: input.data.status === "published" ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.customCollectionRecords.collectionId, collection.id),
            inArray(schema.customCollectionRecords.id, input.data.ids),
          ),
        )
        .returning({ id: schema.customCollectionRecords.id });
      response.json({ updated: updated.length });
    },
  );

  router.delete(
    "/content-collections/:collectionId/records/:recordId",
    async (request, response) => {
      const collection = await collectionFor(
        request,
        request.params.collectionId,
        true,
      );
      const recordId = idSchema.safeParse(request.params.recordId);
      if (!recordId.success)
        throw new HttpError(
          400,
          "Valid record ID is required",
          "validation_error",
        );
      const [deleted] = await db
        .delete(schema.customCollectionRecords)
        .where(
          and(
            eq(schema.customCollectionRecords.id, recordId.data),
            eq(schema.customCollectionRecords.collectionId, collection.id),
          ),
        )
        .returning({ id: schema.customCollectionRecords.id });
      if (!deleted) throw new HttpError(404, "Record not found");
      response.status(204).end();
    },
  );

  return router;
}
