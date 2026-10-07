import { eq, sql } from "drizzle-orm";
import { createDb, schema } from "@velozy/db";

type Database = ReturnType<typeof createDb>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export const BUILT_IN_COLOR_KIND = "builtin_color";

export const DEFAULT_PRODUCT_COLORS = [
  { label: "Black", value: "#000000" },
  { label: "White", value: "#FFFFFF" },
  { label: "Gray", value: "#808080" },
  { label: "Charcoal", value: "#36454F" },
  { label: "Red", value: "#E53935" },
  { label: "Burgundy", value: "#800020" },
  { label: "Orange", value: "#FB8C00" },
  { label: "Yellow", value: "#FDD835" },
  { label: "Gold", value: "#D4AF37" },
  { label: "Green", value: "#43A047" },
  { label: "Olive", value: "#808000" },
  { label: "Teal", value: "#008080" },
  { label: "Blue", value: "#1E88E5" },
  { label: "Light Blue", value: "#64B5F6" },
  { label: "Navy", value: "#1A237E" },
  { label: "Purple", value: "#8E24AA" },
  { label: "Lavender", value: "#B39DDB" },
  { label: "Pink", value: "#EC407A" },
  { label: "Brown", value: "#795548" },
  { label: "Tan", value: "#D2B48C" },
  { label: "Beige", value: "#D7CCC8" },
  { label: "Cream", value: "#FFFDD0" },
  { label: "Silver", value: "#C0C0C0" },
  { label: "Multicolor", value: "#8B5CF6" },
] as const;

/** Ensure every project has the same protected color options, including older projects. */
export async function ensureDefaultProductColors(
  db: Database,
  projectId: string,
) {
  await db.transaction((tx) => ensureDefaultProductColorsInTransaction(tx, projectId));
}

export async function ensureDefaultProductColorsInTransaction(
  tx: Transaction,
  projectId: string,
) {
    // Serialize first-load/backfill requests for the same project.
    await tx.execute(
      sql`SELECT id FROM projects WHERE id = ${projectId} FOR UPDATE`,
    );
    let colorType = await tx.query.productAttributeTypes.findFirst({
      where: (types, { and, eq }) =>
        and(
          eq(types.projectId, projectId),
          eq(types.kind, BUILT_IN_COLOR_KIND),
        ),
    });
    if (!colorType) {
      const legacyColorType = await tx.query.productAttributeTypes.findFirst({
        where: (types, { and, eq }) =>
          and(
            eq(types.projectId, projectId),
            eq(types.name, "Color"),
          ),
      });
      if (legacyColorType) {
        [colorType] = await tx
          .update(schema.productAttributeTypes)
          .set({ kind: BUILT_IN_COLOR_KIND, updatedAt: new Date() })
          .where(eq(schema.productAttributeTypes.id, legacyColorType.id))
          .returning();
      }
    }
    if (!colorType) {
      [colorType] = await tx
        .insert(schema.productAttributeTypes)
        .values({
          projectId,
          name: "Color",
          kind: BUILT_IN_COLOR_KIND,
        })
        .returning();
    }

    const existing = await tx.query.productAttributes.findMany({
      where: eq(schema.productAttributes.typeId, colorType.id),
    });
    const existingByLabel = new Map(existing.map((item) => [item.label, item]));
    const missing = DEFAULT_PRODUCT_COLORS.filter(
      (color) => !existingByLabel.has(color.label),
    );
    if (missing.length) {
      await tx.insert(schema.productAttributes).values(
        missing.map((color) => ({
          typeId: colorType.id,
          label: color.label,
          value: color.value,
        })),
      );
    }
    for (const color of DEFAULT_PRODUCT_COLORS) {
      const current = existingByLabel.get(color.label);
      if (current && current.value !== color.value) {
        await tx
          .update(schema.productAttributes)
          .set({ value: color.value, updatedAt: new Date() })
          .where(eq(schema.productAttributes.id, current.id));
      }
    }
}
