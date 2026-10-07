"use client";

import { useState, type FormEvent } from "react";

type Field = { key: string; label: string; fieldType: string; required: boolean; options?: string[] | null; placeholder?: string | null; layout?: string | null };
const apiBase = (process.env.NEXT_PUBLIC_VELOZY_API_URL || "http://localhost:4000").replace(/\/$/, "");

export function PublicEnquiryForm({ formId, pageId, nodeId, fields }: { formId?: string; pageId: string; nodeId: string; fields: Field[] }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const normalizedFields: Field[] = [];
  const radioGroups = new Map<string, Field>();
  for (const [index, field] of fields.entries()) {
    if (field.fieldType === "radio") {
      const group = radioGroups.get(field.key);
      const options = field.options?.length ? field.options : [field.label];
      if (group) group.options = [...new Set([...(group.options || []), ...options])];
      else {
        const label = field.key.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) || field.label;
        const normalized = { ...field, label, options: [...new Set(options)] };
        radioGroups.set(field.key, normalized); normalizedFields.push(normalized);
      }
      continue;
    }
    const base = field.key || `field_${index + 1}`;
    let key = base;
    for (let suffix = 2; normalizedFields.some((item) => item.key === key); suffix++) key = `${base.slice(0, 90 - String(suffix).length)}_${suffix}`;
    normalizedFields.push({ ...field, key, fieldType: field.fieldType === "select" && !field.options?.length ? "text" : field.fieldType });
  }
  const renderFields = normalizedFields;
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    const values: Record<string, unknown> = {};
    for (const field of renderFields) {
      const input = event.currentTarget.elements.namedItem(field.key);
      if (input instanceof RadioNodeList) values[field.key] = input.value;
      else if (input instanceof HTMLInputElement && input.type === "checkbox") values[field.key] = input.checked;
      else if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement) values[field.key] = input.value;
    }
    try {
      const response = await fetch(`${apiBase}/api/public/forms/submissions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ formId, pageId, nodeId, values }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Your message could not be sent. Please try again.");
      event.currentTarget.reset();
      setMessage(data.message || "Your message has been received.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your message could not be sent. Please try again.");
    } finally { setBusy(false); }
  };
  return <form onSubmit={(event) => void submit(event)} className="grid w-full grid-cols-12 gap-4">
    {renderFields.map((field, index) => <label key={`${field.key}:${index}`} className={`mb-1 grid gap-1.5 ${field.layout || "col-span-full"}`}>
      {field.fieldType !== "checkbox" && <span className="text-sm font-medium">{field.label}{field.required ? <span aria-hidden="true" className="ml-1 text-red-600">*</span> : null}</span>}
      {field.fieldType === "textarea" ? <textarea name={field.key} required={field.required} placeholder={field.placeholder || undefined} rows={4} className="min-h-24 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
        : field.fieldType === "select" ? <select name={field.key} required={field.required} defaultValue="" className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"><option value="">{field.placeholder || "Select an option"}</option>{(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}</select>
          : field.fieldType === "radio" ? <span className="grid gap-2">{(field.options || []).map((option, optionIndex) => <span key={option} className="flex items-center gap-2 text-sm"><input type="radio" name={field.key} value={option} required={field.required && optionIndex === 0} />{option}</span>)}</span>
            : field.fieldType === "checkbox" ? <span className="flex items-center gap-2 text-sm"><input type="checkbox" name={field.key} required={field.required} />{field.label}{field.required ? <span aria-hidden="true" className="text-red-600">*</span> : null}</span>
              : <input name={field.key} type={field.fieldType === "email" || field.fieldType === "tel" || field.fieldType === "date" ? field.fieldType : "text"} required={field.required} placeholder={field.placeholder || undefined} className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground" />}
    </label>)}
    <button type="submit" disabled={busy} className="col-span-full rounded-md bg-[var(--color-primary,#111827)] px-5 py-3 text-sm text-white disabled:opacity-60">{busy ? "Sending…" : "Submit"}</button>
    {message ? <p role="status" className="col-span-full text-sm text-green-700">{message}</p> : null}
    {error ? <p role="alert" className="col-span-full text-sm text-red-700">{error}</p> : null}
  </form>;
}
