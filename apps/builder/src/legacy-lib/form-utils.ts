export type GeneratedFormField = {
  key: string;
  label: string;
  fieldType: "text" | "email" | "tel" | "textarea" | "select" | "checkbox" | "radio" | "date";
  required: boolean;
  options?: string[];
  placeholder?: string;
  layout?: string;
};

function safeKey(value: unknown, fallback: string) {
  const key = String(value || fallback).trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 90);
  return /^[a-zA-Z]/.test(key) ? key : `field_${key || fallback}`;
}

export function normalizeGeneratedFormFields(rawFields: unknown[]): GeneratedFormField[] {
  const fields: GeneratedFormField[] = [];
  const radioGroups = new Map<string, GeneratedFormField>();
  for (const [index, raw] of rawFields.entries()) {
    const field = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    const rawType = String(field.type || "text").toLowerCase();
    let fieldType: GeneratedFormField["fieldType"] = ["text", "email", "tel", "textarea", "select", "checkbox", "radio", "date"].includes(rawType) ? rawType as GeneratedFormField["fieldType"] : "text";
    const originalKey = safeKey(field.name, `field_${index + 1}`);
    const rawLabel = String(field.label || originalKey.replace(/[_-]+/g, " ")).trim() || `Field ${index + 1}`;
    const options = Array.isArray(field.options) ? field.options.map(String).map((option) => option.trim()).filter(Boolean) : [];
    if (fieldType === "radio") {
      const group = radioGroups.get(originalKey);
      const nextOptions = options.length ? options : [rawLabel];
      if (group) {
        group.options = [...new Set([...(group.options || []), ...nextOptions])];
        group.required ||= Boolean(field.required);
        continue;
      }
      const title = originalKey.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
      const radio: GeneratedFormField = { key: originalKey, label: title || rawLabel, fieldType, required: Boolean(field.required), options: [...new Set(nextOptions)], placeholder: typeof field.placeholder === "string" ? field.placeholder : undefined, layout: typeof field.colSpan === "string" ? field.colSpan : undefined };
      radioGroups.set(originalKey, radio);
      fields.push(radio);
      continue;
    }
    if (fieldType === "select" && options.length === 0) fieldType = "text";
    let key = originalKey;
    for (let suffix = 2; fields.some((item) => item.key === key); suffix++) key = `${originalKey.slice(0, 90 - String(suffix).length)}_${suffix}`;
    fields.push({ key, label: rawLabel, fieldType, required: Boolean(field.required), ...(fieldType === "select" ? { options } : {}), placeholder: typeof field.placeholder === "string" ? field.placeholder : undefined, layout: typeof field.colSpan === "string" ? field.colSpan : undefined });
  }
  return fields;
}
