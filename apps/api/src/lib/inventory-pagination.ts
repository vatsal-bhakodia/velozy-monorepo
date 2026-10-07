import { z } from "zod";
import { HttpError } from "../middleware/errors.js";

const productCursorSchema = z.object({
  name: z.string().max(255),
  id: z.string().uuid(),
});

const movementCursorSchema = z.object({
  createdAt: z.string().datetime(),
  id: z.string().uuid(),
});

export type ProductCursor = z.infer<typeof productCursorSchema>;
export type MovementCursor = z.infer<typeof movementCursorSchema>;

export function encodeCursor(value: ProductCursor | MovementCursor) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decodeCursor<T>(
  value: unknown,
  validator: z.ZodType<T>,
): T | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > 2048)
    throw new HttpError(400, "Invalid pagination cursor", "invalid_cursor");
  try {
    const decoded = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    );
    const parsed = validator.safeParse(decoded);
    if (!parsed.success) throw new Error("Invalid cursor payload");
    return parsed.data;
  } catch {
    throw new HttpError(400, "Invalid pagination cursor", "invalid_cursor");
  }
}

const pageQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().trim().max(120).default(""),
  cursor: z.string().optional(),
});

export function parseInventoryPageQuery(query: Record<string, unknown>) {
  const parsed = pageQuerySchema.safeParse(query);
  if (!parsed.success)
    throw new HttpError(
      400,
      "Invalid inventory page request",
      "validation_error",
    );
  return {
    limit: parsed.data.limit,
    search: parsed.data.search,
    cursor: decodeCursor(parsed.data.cursor, productCursorSchema),
  };
}

export function parseMovementPageQuery(query: Record<string, unknown>) {
  const parsed = pageQuerySchema.safeParse(query);
  if (!parsed.success)
    throw new HttpError(
      400,
      "Invalid movement page request",
      "validation_error",
    );
  return {
    limit: parsed.data.limit,
    search: parsed.data.search,
    cursor: decodeCursor(parsed.data.cursor, movementCursorSchema),
  };
}
