import { z } from "zod";

export const growthViews = [
  "overview",
  "analytics",
  "tracking",
  "experiments",
  "recommendations",
  "connections",
] as const;

export const growthViewSchema = z.enum(growthViews);
export const growthProviderSchema = z.enum([
  "google_analytics",
  "search_console",
]);
export const growthSourceSchema = z.enum([
  "first_party",
  "google_analytics",
  "search_console",
]);
export const growthTargetSchema = z.enum([
  "page",
  "product",
  "cart",
  "checkout",
]);

const propertySchema = z.union([
  z.string().max(200),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

export const publicGrowthEventSchema = z
  .object({
    id: z.string().uuid(),
    name: z
      .string()
      .trim()
      .regex(/^[a-z][a-z0-9_.-]{0,99}$/),
    path: z
      .string()
      .trim()
      .min(1)
      .max(1000)
      .refine((value) => {
        if (
          !value.startsWith("/") ||
          value.startsWith("//") ||
          /[?#]/.test(value)
        )
          return false;
        let decoded: string;
        try {
          decoded = decodeURIComponent(value);
        } catch {
          return false;
        }
        return (
          !/@|%40/.test(decoded) &&
          !/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(decoded) &&
          !/\+?\d[\d ().-]{8,}\d/.test(decoded)
        );
      }, "Event paths must be local paths without query strings or personal data"),
    occurredAt: z.string().datetime().optional(),
    properties: z
      .record(z.string().regex(/^[a-z][a-z0-9_.-]{0,63}$/), propertySchema)
      .default({}),
  })
  .strict()
  .superRefine((event, context) => {
    if (Object.keys(event.properties).length > 25) {
      context.addIssue({
        code: "custom",
        path: ["properties"],
        message: "Analytics events may contain at most 25 properties",
      });
    }
    const unsafe = Object.keys(event.properties).find((key) =>
      /email|phone|name|address|token|password|cookie|ip|contact|customer|user|ssn/i.test(
        key,
      ),
    );
    if (unsafe) {
      context.addIssue({
        code: "custom",
        path: ["properties", unsafe],
        message:
          "Personal or secret data is not allowed in analytics properties",
      });
    }
  });

export const publicGrowthEventsSchema = z
  .object({
    events: z.array(publicGrowthEventSchema).min(1).max(20),
  })
  .strict();

export const analyticsQuerySchema = z
  .object({
    projectId: z.string().uuid(),
    source: growthSourceSchema.default("first_party"),
    from: z.string().date(),
    to: z.string().date(),
    pagePath: z.string().max(1000).optional(),
  })
  .refine((query) => new Date(query.from) <= new Date(query.to), {
    path: ["to"],
    message: "End date must be on or after start date",
  });

export const experimentInputSchema = z
  .object({
    projectId: z.string().uuid(),
    name: z.string().trim().min(3).max(160),
    description: z.string().trim().max(2000).nullable().default(null),
    targetType: growthTargetSchema,
    targetId: z.string().uuid().nullable().default(null),
    primaryEvent: z
      .string()
      .trim()
      .regex(/^[a-z][a-z0-9_.-]{0,99}$/),
    baselineRate: z.number().min(0.0001).max(0.9999),
    minimumDetectableEffect: z.number().min(0.01).max(2),
    guardrailEvents: z
      .array(
        z
          .string()
          .trim()
          .regex(/^[a-z][a-z0-9_.-]{0,99}$/),
      )
      .max(10)
      .default([]),
    variants: z
      .array(
        z
          .object({
            key: z
              .string()
              .trim()
              .regex(/^[a-z][a-z0-9_-]{0,39}$/),
            name: z.string().trim().min(1).max(100),
            isControl: z.boolean().default(false),
            allocation: z.number().int().min(1).max(99),
            experience: z
              .object({
                headline: z.string().trim().min(1).max(160).optional(),
                buttonText: z.string().trim().min(1).max(80).optional(),
              })
              .strict()
              .default({}),
          })
          .strict(),
      )
      .min(2)
      .max(4),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.variants.filter((variant) => variant.isControl).length !== 1) {
      context.addIssue({
        code: "custom",
        path: ["variants"],
        message: "Exactly one control variant is required",
      });
    }
    if (
      value.variants.reduce(
        (total, variant) => total + variant.allocation,
        0,
      ) !== 100
    ) {
      context.addIssue({
        code: "custom",
        path: ["variants"],
        message: "Variant allocations must add up to 100",
      });
    }
    if (
      new Set(value.variants.map((variant) => variant.key)).size !==
      value.variants.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["variants"],
        message: "Variant keys must be unique",
      });
    }
    if (
      value.variants.some(
        (variant) =>
          variant.isControl && Object.keys(variant.experience).length > 0,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["variants"],
        message: "The control variant cannot contain experience overrides",
      });
    }
    if (
      value.variants.some(
        (variant) =>
          !variant.isControl && Object.keys(variant.experience).length === 0,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["variants"],
        message:
          "Each non-control variant needs at least one visible copy change",
      });
    }
  });

export const experimentTransitionSchema = z
  .object({
    projectId: z.string().uuid(),
    action: z.enum(["start", "pause", "resume", "stop"]),
  })
  .strict();

export const experimentAssignmentSchema = z
  .object({
    targetType: growthTargetSchema,
    targetId: z.string().uuid().nullable().default(null),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      (value.targetType === "page" || value.targetType === "product") &&
      !value.targetId
    ) {
      context.addIssue({
        code: "custom",
        path: ["targetId"],
        message: "A page or product target is required",
      });
    }
    if (
      (value.targetType === "cart" || value.targetType === "checkout") &&
      value.targetId
    ) {
      context.addIssue({
        code: "custom",
        path: ["targetId"],
        message: "Cart and checkout do not use a target ID",
      });
    }
  });

export type GrowthView = z.infer<typeof growthViewSchema>;
export type GrowthSource = z.infer<typeof growthSourceSchema>;
export type GrowthProvider = z.infer<typeof growthProviderSchema>;
export type ExperimentInput = z.infer<typeof experimentInputSchema>;
