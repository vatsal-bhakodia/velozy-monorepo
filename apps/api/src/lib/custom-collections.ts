import { z } from "zod";

const fieldTypes = [
  "text",
  "textarea",
  "number",
  "boolean",
  "date",
  "url",
  "image",
  "select",
] as const;
export const collectionFieldSchema = z
  .object({
    key: z
      .string()
      .trim()
      .regex(/^[a-z][a-z0-9_]{0,39}$/),
    label: z.string().trim().min(1).max(80),
    type: z.enum(fieldTypes),
    required: z.boolean().optional().default(false),
    options: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
  })
  .strict()
  .superRefine((field, context) => {
    if (
      field.type === "select" &&
      (!field.options?.length ||
        new Set(field.options).size !== field.options.length)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select fields need unique options",
      });
    }
    if (field.type !== "select" && field.options?.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only select fields can have options",
      });
    }
  });

export const collectionFieldsSchema = z
  .array(collectionFieldSchema)
  .min(1)
  .max(30)
  .superRefine((fields, context) => {
    const keys = new Set<string>();
    for (const [index, field] of fields.entries()) {
      if (keys.has(field.key))
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, "key"],
          message: "Field keys must be unique",
        });
      keys.add(field.key);
    }
  });

export function validateCollectionValues(
  fields: z.infer<typeof collectionFieldsSchema>,
  value: unknown,
) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return {
      success: false as const,
      error: "Record values must be an object",
    };
  const input = value as Record<string, unknown>;
  const allowed = new Set(fields.map((field) => field.key));
  if (Object.keys(input).some((key) => !allowed.has(key)))
    return {
      success: false as const,
      error: "Record contains fields that are not in this collection",
    };
  const output: Record<string, unknown> = {};
  for (const field of fields) {
    const item = input[field.key];
    if (item === undefined || item === null || item === "") {
      if (field.required)
        return { success: false as const, error: `${field.label} is required` };
      continue;
    }
    let valid = true;
    switch (field.type) {
      case "text":
      case "textarea":
        valid =
          typeof item === "string" &&
          item.length <= (field.type === "text" ? 2000 : 20000);
        break;
      case "number":
        valid = typeof item === "number" && Number.isFinite(item);
        break;
      case "boolean":
        valid = typeof item === "boolean";
        break;
      case "date":
        valid =
          typeof item === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(item) &&
          (() => {
            const parsed = new Date(`${item}T00:00:00Z`);
            return (
              !Number.isNaN(parsed.getTime()) &&
              parsed.toISOString().slice(0, 10) === item
            );
          })();
        break;
      case "url":
      case "image":
        if (typeof item !== "string" || item.length > 2048) valid = false;
        else {
          try {
            const parsed = new URL(item);
            valid = parsed.protocol === "https:" || parsed.protocol === "http:";
          } catch {
            valid = false;
          }
        }
        break;
      case "select":
        valid =
          typeof item === "string" && Boolean(field.options?.includes(item));
        break;
    }
    if (!valid)
      return {
        success: false as const,
        error: `${field.label} has an invalid value`,
      };
    output[field.key] = item;
  }
  return { success: true as const, value: output };
}

export function compatibleFields(
  current: unknown,
  next: z.infer<typeof collectionFieldsSchema>,
) {
  if (!Array.isArray(current)) return false;
  const prior = current as Array<{ key?: unknown; type?: unknown }>;
  const nextByKey = new Map(next.map((field) => [field.key, field.type]));
  return prior.every(
    (field) =>
      typeof field.key === "string" && nextByKey.get(field.key) === field.type,
  );
}

export function collectionKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
