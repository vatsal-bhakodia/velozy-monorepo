export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "date"
  | "url"
  | "image"
  | "select";

export type Field = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
};

export type Collection = {
  id: string;
  name: string;
  key: string;
  description?: string | null;
  fields: Field[];
  isArchived?: boolean;
  updatedAt: string;
};

export type RecordItem = {
  id: string;
  values: Record<string, unknown>;
  status: "draft" | "published";
  sortOrder: number;
  updatedAt: string;
};

export const contentCollectionsApi = "/api/admin/content-collections";
export const blankField = (index = 1): Field => ({
  key: `field_${index}`,
  label: `New field ${index}`,
  type: "text",
  required: false,
});
