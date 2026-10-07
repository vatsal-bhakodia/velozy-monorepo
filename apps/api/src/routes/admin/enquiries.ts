import { Router } from "express";
import type { Request, Router as ExpressRouter } from "express";
import { createHash } from "node:crypto";
import { and, asc, count, desc, eq, gte, ilike, inArray, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { z } from "zod";
import { createDb, schema } from "@velozy/db";
import type { Environment } from "../../config/env.js";
import { HttpError } from "../../middleware/errors.js";
import { adminAccess } from "../../lib/admin-auth.js";

const id = z.string().uuid();
export const fieldSchema = z.object({
  key: z.string().trim().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,99}$/),
  label: z.string().trim().min(1).max(255),
  fieldType: z.enum(["text", "email", "tel", "textarea", "select", "checkbox", "radio", "date"]),
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1).max(255)).max(100).optional(),
  placeholder: z.string().max(500).optional(),
  layout: z.string().regex(/^col-span-(?:full|[1-9]|1[0-2])$/).optional(),
}).superRefine((field, context) => {
  if (["select", "radio"].includes(field.fieldType) && !field.options?.length)
    context.addIssue({ code: z.ZodIssueCode.custom, message: `${field.label} needs at least one option`, path: ["options"] });
  if (field.options && new Set(field.options).size !== field.options.length)
    context.addIssue({ code: z.ZodIssueCode.custom, message: `${field.label} has duplicate options`, path: ["options"] });
});
export const formSchema = z.object({
  projectId: id,
  id: id.optional(),
  name: z.string().trim().min(1).max(255),
  purpose: z.enum(["general", "quote", "contact", "booking"]).default("general"),
  status: z.enum(["active", "archived"]).default("active"),
  fields: z.array(fieldSchema).min(1).max(50),
});
const enquiryStatus = z.enum(["new", "open", "qualified", "closed", "spam"]);

function parse<T extends z.ZodTypeAny>(validator: T, value: unknown): z.infer<T> {
  const result = validator.safeParse(value);
  if (!result.success) throw new HttpError(400, result.error.issues[0]?.message || "Invalid request", "validation_error");
  return result.data as z.infer<T>;
}
function dateQuery(value: unknown, label: string): Date | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new HttpError(400, `Invalid ${label} date`, "validation_error");
  const result = new Date(value);
  if (!Number.isFinite(result.getTime())) throw new HttpError(400, `Invalid ${label} date`, "validation_error");
  return result;
}
export function fieldsAreUnique(fields: z.infer<typeof fieldSchema>[]) {
  return new Set(fields.map((field) => field.key)).size === fields.length;
}
function normalizedFields(fields: z.infer<typeof fieldSchema>[]) {
  return fields.map((field, sortOrder) => ({
    key: field.key, label: field.label, fieldType: field.fieldType, required: field.required,
    sortOrder, options: field.options ?? null, placeholder: field.placeholder ?? null,
    layout: field.layout ?? "col-span-full",
  }));
}
export function formSchemaHash(input: z.infer<typeof formSchema>) {
  const canonical = JSON.stringify({ purpose: input.purpose, fields: normalizedFields(input.fields).map(({ key, label, fieldType, required, options, placeholder, layout }) => ({ key, label, fieldType, required, options: options ?? [], placeholder: placeholder ?? "", layout })) });
  return createHash("sha256").update(canonical).digest("hex");
}
function safePayload(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function referencesForm(value: unknown, formId: string): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => referencesForm(item, formId));
  const record = value as Record<string, unknown>;
  if (record.formId === formId) return true;
  return Object.values(record).some((item) => referencesForm(item, formId));
}
export function pageFormNode(pageData: unknown, nodeId: string): Record<string, any> | undefined {
  const data = safePayload(pageData);
  const nodes = safePayload(data.craftState);
  const isForm = (value: unknown) => {
    const record = safePayload(value);
    const type = typeof record.type === "string" ? record.type : safePayload(record.type).resolvedName;
    return typeof type === "string" && type.toLowerCase() === "form";
  };
  const findById = (value: unknown, seen = new Set<object>()): Record<string, any> | undefined => {
    if (!value || typeof value !== "object" || seen.has(value)) return undefined;
    seen.add(value);
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = findById(item, seen);
        if (found) return found;
      }
      return undefined;
    }
    const record = value as Record<string, any>;
    if (record.id === nodeId && isForm(record)) return record;
    for (const item of Object.values(record)) {
      const found = findById(item, seen);
      if (found) return found;
    }
    return undefined;
  };

  // Craft nodes are stored by id; older page records store components under sections.
  if (isForm(nodes[nodeId])) return nodes[nodeId] as Record<string, any>;
  const craftNode = findById(nodes);
  if (craftNode) return craftNode;
  const sections = Array.isArray(data.sections) ? data.sections : [];
  const separator = nodeId.lastIndexOf(":");
  if (separator > 0) {
    const sectionKey = nodeId.slice(0, separator);
    const componentIndex = Number(nodeId.slice(separator + 1));
    const sectionIndex = Number(sectionKey);
    const section = sections.find((item: unknown, index: number) => {
      const record = safePayload(item);
      return String(record.id ?? index) === sectionKey || (!record.id && index === sectionIndex);
    });
    const components = safePayload(section).components;
    const component = Array.isArray(components) ? components[componentIndex] : undefined;
    if (Number.isInteger(componentIndex) && componentIndex >= 0 && isForm(component)) return component as Record<string, any>;
  }
  return findById(sections);
}
function legacyFields(rawFields: unknown[]): Array<typeof schema.formFields.$inferSelect> {
  const fields: Array<typeof schema.formFields.$inferSelect> = [];
  const radios = new Map<string, number>();
  for (const [index, raw] of rawFields.entries()) {
    const field = safePayload(raw);
    const originalKey = String(field.name || `field_${index + 1}`).trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 90) || `field_${index + 1}`;
    const label = String(field.label || originalKey).slice(0, 255);
    const rawType = String(field.type || "text").toLowerCase();
    let fieldType = ["email", "tel", "textarea", "select", "checkbox", "radio", "date"].includes(rawType) ? rawType : "text";
    const options = Array.isArray(field.options) ? field.options.map(String).map((option) => option.trim()).filter(Boolean) : [];
    if (fieldType === "select" && !options.length) fieldType = "text";
    if (fieldType === "radio" && radios.has(originalKey)) {
      const existing = fields[radios.get(originalKey)!];
      existing.options = [...new Set([...(Array.isArray(existing.options) ? existing.options as string[] : []), ...(options.length ? options : [label])])];
      existing.required ||= Boolean(field.required);
      continue;
    }
    let key = originalKey;
    for (let suffix = 2; fields.some((item) => item.key === key); suffix++) key = `${originalKey.slice(0, 90 - String(suffix).length)}_${suffix}`;
    const row = { key, label: fieldType === "radio" ? originalKey.replace(/[_-]+/g, " ") : label, fieldType, required: Boolean(field.required), options: fieldType === "radio" ? options.length ? options : [label] : options.length ? options : null, sortOrder: index } as typeof schema.formFields.$inferSelect;
    if (fieldType === "radio") radios.set(originalKey, fields.length);
    fields.push(row);
  }
  return fields;
}
export function fieldValues(fields: Array<typeof schema.formFields.$inferSelect>, raw: unknown) {
  const values = safePayload(raw);
  const keys = new Set(fields.map((field) => field.key));
  if (Object.keys(values).some((key) => !keys.has(key))) throw new HttpError(400, "Submission contains unknown fields", "invalid_submission");
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    const value = values[field.key];
    if (field.required && (value === undefined || value === null || value === "" || value === false))
      throw new HttpError(400, `${field.label} is required`, "invalid_submission");
    if (value === undefined || value === null || value === "") continue;
    if (field.fieldType === "checkbox") {
      if (typeof value !== "boolean") throw new HttpError(400, `Invalid value for ${field.label}`, "invalid_submission");
      result[field.key] = value;
      continue;
    }
    if (typeof value !== "string" || value.length > 10000) throw new HttpError(400, `Invalid value for ${field.label}`, "invalid_submission");
    const clean = value.trim();
    if (field.fieldType === "email" && clean && (clean.length > 320 || !z.string().email().safeParse(clean).success)) throw new HttpError(400, `Enter a valid ${field.label.toLowerCase()}`, "invalid_submission");
    if (field.fieldType === "tel" && clean.length > 50) throw new HttpError(400, `${field.label} is too long`, "invalid_submission");
    if (/name/i.test(`${field.key} ${field.label}`) && clean.length > 255) throw new HttpError(400, `${field.label} is too long`, "invalid_submission");
    if (["select", "radio"].includes(field.fieldType) && (!Array.isArray(field.options) || !(field.options as unknown[]).includes(clean))) throw new HttpError(400, `Choose a valid ${field.label}`, "invalid_submission");
    result[field.key] = clean;
  }
  return result;
}

export function adminEnquiriesRouter(environment: Environment): ExpressRouter {
  const { db, user, project } = adminAccess(environment.DATABASE_URL);
  const router = Router();
  const owned = async (request: Request, projectId: unknown, write = false) =>
    project(parse(id, projectId), (await user(request)).id, write ? "enquiries:write" : "enquiries:read");
  const ownedFormProject = async (request: Request, projectId: unknown, write = false) =>
    project(parse(id, projectId), (await user(request)).id, write ? "content:write" : "content:read");

  router.get("/forms", async (request, response) => {
    const p = await ownedFormProject(request, request.query.projectId);
    const forms = await db.query.forms.findMany({ where: eq(schema.forms.projectId, p.id), orderBy: [desc(schema.forms.updatedAt)] });
    const pages = await db.query.pages.findMany({ where: eq(schema.pages.projectId, p.id), columns: { pageData: true, publishedPageData: true } });
    const formIds = forms.map((form) => form.id);
    const [fields, submissions] = formIds.length ? await Promise.all([
      db.query.formFields.findMany({ where: inArray(schema.formFields.formId, formIds), orderBy: [schema.formFields.sortOrder] }),
      db.select({ formId: schema.enquiries.formId, value: count() }).from(schema.enquiries).where(inArray(schema.enquiries.formId, formIds)).groupBy(schema.enquiries.formId),
    ]) : [[], []];
    const fieldsMap = new Map<string, typeof fields>();
    for (const field of fields) fieldsMap.set(field.formId, [...(fieldsMap.get(field.formId) || []), field]);
    const submissionMap = new Map(submissions.flatMap((entry) => entry.formId ? [[entry.formId, entry.value] as const] : []));
    const result = forms.map((form) => ({
      ...form,
      fields: fieldsMap.get(form.id) || [],
      submissionCount: submissionMap.get(form.id) || 0,
      pageUsageCount: pages.filter((page) => referencesForm(page.pageData, form.id) || referencesForm(page.publishedPageData, form.id)).length,
    }));
    response.json({ forms: result });
  });

  router.get("/enquiry-assignees", async (request, response) => {
    const p = await owned(request, request.query.projectId);
    const memberships = await db.select({ user: schema.users.id, name: schema.users.name, email: schema.users.email, capabilities: schema.accessRoles.capabilities })
      .from(schema.projectMemberships).innerJoin(schema.users, eq(schema.projectMemberships.userId, schema.users.id)).innerJoin(schema.accessRoles, eq(schema.projectMemberships.roleId, schema.accessRoles.id))
      .where(eq(schema.projectMemberships.projectId, p.id));
    const owner = await db.query.users.findFirst({ where: eq(schema.users.id, p.userId), columns: { id: true, name: true, email: true } });
    const organizationMembers = p.organizationId ? await db.select({ user: schema.users.id, name: schema.users.name, email: schema.users.email, capabilities: schema.accessRoles.capabilities })
      .from(schema.organizationAccessMemberships).innerJoin(schema.users, eq(schema.organizationAccessMemberships.userId, schema.users.id)).innerJoin(schema.accessRoles, eq(schema.organizationAccessMemberships.roleId, schema.accessRoles.id))
      .where(eq(schema.organizationAccessMemberships.organizationId, p.organizationId)) : [];
    const canReadProject = (capabilities: unknown) => Array.isArray(capabilities) && (capabilities.includes("*") || capabilities.includes("project:read") || capabilities.some((value) => typeof value === "string" && (value.endsWith(":read") || value.endsWith(":write") || value === "publish" || value === "team:manage")));
    const members = [...(owner ? [owner] : []), ...memberships.filter((member) => canReadProject(member.capabilities)).map(({ user, name, email }) => ({ id: user, name, email })), ...organizationMembers.filter((member) => canReadProject(member.capabilities)).map(({ user, name, email }) => ({ id: user, name, email }))];
    response.json({ members: [...new Map(members.map((member) => [member.id, member])).values()] });
  });

  router.post("/forms", async (request, response) => {
    const input = parse(formSchema, request.body);
    if (!fieldsAreUnique(input.fields)) throw new HttpError(400, "Form field keys must be unique", "validation_error");
    const p = await ownedFormProject(request, input.projectId, true);
    const created = await db.transaction(async (tx) => {
      const [form] = await tx.insert(schema.forms).values({ projectId: p.id, name: input.name, purpose: input.purpose, status: input.status }).returning();
      await tx.insert(schema.formFields).values(normalizedFields(input.fields).map((field) => ({ ...field, formId: form.id })));
      return form;
    });
    response.status(201).json({ form: { ...created, fields: normalizedFields(input.fields) } });
  });

  router.post("/forms/resolve", async (request, response) => {
    const input = parse(formSchema, request.body);
    if (!fieldsAreUnique(input.fields)) throw new HttpError(400, "Form field keys must be unique", "validation_error");
    const p = await ownedFormProject(request, input.projectId, true);
    const schemaHash = formSchemaHash(input);
    const hashMatch = await db.query.forms.findFirst({ where: and(eq(schema.forms.projectId, p.id), eq(schema.forms.status, "active"), eq(schema.forms.schemaHash, schemaHash)) });
    if (hashMatch) {
      const currentFields = await db.query.formFields.findMany({ where: eq(schema.formFields.formId, hashMatch.id), orderBy: [schema.formFields.sortOrder] });
      return response.json({ form: { ...hashMatch, fields: currentFields }, reused: true });
    }
    const candidates = await db.query.forms.findMany({ where: and(eq(schema.forms.projectId, p.id), eq(schema.forms.status, "active"), eq(schema.forms.purpose, input.purpose), isNull(schema.forms.schemaHash)) });
    for (const candidate of candidates) {
      const currentFields = await db.query.formFields.findMany({ where: eq(schema.formFields.formId, candidate.id), orderBy: [schema.formFields.sortOrder] });
      const same = currentFields.length === input.fields.length && currentFields.every((field, index) => {
        const next = input.fields[index];
        return field.key === next.key && field.label === next.label && field.fieldType === next.fieldType && field.required === next.required && JSON.stringify(field.options ?? []) === JSON.stringify(next.options ?? []) && (field.placeholder ?? "") === (next.placeholder ?? "") && field.layout === (next.layout ?? "col-span-full");
      });
      if (same) return response.json({ form: { ...candidate, fields: currentFields }, reused: true });
    }
    const created = await db.transaction(async (tx) => {
      const [form] = await tx.insert(schema.forms).values({ projectId: p.id, name: input.name, purpose: input.purpose, schemaHash }).onConflictDoNothing().returning();
      if (!form) return null;
      const fields = normalizedFields(input.fields).map((field) => ({ ...field, formId: form.id }));
      await tx.insert(schema.formFields).values(fields);
      return { form, fields };
    });
    if (!created) {
      const existing = await db.query.forms.findFirst({ where: and(eq(schema.forms.projectId, p.id), eq(schema.forms.schemaHash, schemaHash), eq(schema.forms.status, "active")) });
      if (!existing) throw new HttpError(409, "Form changed while it was being saved. Please retry.", "form_conflict");
      const existingFields = await db.query.formFields.findMany({ where: eq(schema.formFields.formId, existing.id), orderBy: [schema.formFields.sortOrder] });
      return response.json({ form: { ...existing, fields: existingFields }, reused: true });
    }
    response.status(201).json({ form: { ...created.form, fields: created.fields }, reused: false });
  });

  router.patch("/forms/:formId", async (request, response) => {
    const formId = parse(id, request.params.formId);
    const input = parse(formSchema.omit({ id: true }), { ...request.body, projectId: request.body?.projectId });
    if (!fieldsAreUnique(input.fields)) throw new HttpError(400, "Form field keys must be unique", "validation_error");
    const p = await ownedFormProject(request, input.projectId, true);
    const existing = await db.query.forms.findFirst({ where: and(eq(schema.forms.id, formId), eq(schema.forms.projectId, p.id)) });
    if (!existing) throw new HttpError(404, "Form not found");
    await db.transaction(async (tx) => {
      await tx.update(schema.forms).set({ name: input.name, purpose: input.purpose, status: input.status, schemaHash: null, updatedAt: new Date() }).where(eq(schema.forms.id, formId));
      await tx.delete(schema.formFields).where(eq(schema.formFields.formId, formId));
      await tx.insert(schema.formFields).values(normalizedFields(input.fields).map((field) => ({ ...field, formId })));
    });
    response.json({ success: true });
  });

  router.delete("/forms/:formId", async (request, response) => {
    const p = await ownedFormProject(request, request.query.projectId, true);
    const formId = parse(id, request.params.formId);
    const existing = await db.query.forms.findFirst({ where: and(eq(schema.forms.id, formId), eq(schema.forms.projectId, p.id)) });
    if (!existing) throw new HttpError(404, "Form not found");
    const [archived] = await db.update(schema.forms).set({ status: "archived", schemaHash: null, updatedAt: new Date() }).where(eq(schema.forms.id, formId)).returning();
    response.json({ form: archived });
  });

  router.get("/enquiries", async (request, response) => {
    const p = await owned(request, request.query.projectId);
    const statusValues = typeof request.query.status === "string" && request.query.status ? request.query.status.split(",") : [];
    if (statusValues.some((value) => !enquiryStatus.safeParse(value).success)) throw new HttpError(400, "Invalid enquiry status filter", "validation_error");
    const statuses = statusValues as Array<z.infer<typeof enquiryStatus>>;
    const formId = typeof request.query.formId === "string" ? parse(id, request.query.formId) : undefined;
    const followUps = request.query.view === "follow-ups";
    const quoteFormIds = request.query.view === "quotes" ? (await db.query.forms.findMany({ where: and(eq(schema.forms.projectId, p.id), eq(schema.forms.purpose, "quote")), columns: { id: true } })).map((form) => form.id) : undefined;
    const search = typeof request.query.q === "string" ? request.query.q.trim().slice(0, 120) : "";
    const matchingContacts = search ? (await db.query.contacts.findMany({ where: and(eq(schema.contacts.projectId, p.id), or(ilike(schema.contacts.name, `%${search}%`), ilike(schema.contacts.email, `%${search}%`))), columns: { id: true }, limit: 500 })).map((contact) => contact.id) : [];
    const matchingForms = search ? (await db.query.forms.findMany({ where: and(eq(schema.forms.projectId, p.id), ilike(schema.forms.name, `%${search}%`)), columns: { id: true }, limit: 100 })).map((form) => form.id) : [];
    const from = dateQuery(request.query.from, "start");
    const to = dateQuery(request.query.to, "end");
    if (from && to && from > to) throw new HttpError(400, "Start date must be before end date", "validation_error");
    const where = and(
      eq(schema.enquiries.projectId, p.id),
      statuses.length ? inArray(schema.enquiries.status, statuses) : undefined,
      formId ? eq(schema.enquiries.formId, formId) : undefined,
      quoteFormIds ? quoteFormIds.length ? inArray(schema.enquiries.formId, quoteFormIds) : sql`false` : undefined,
      followUps ? and(isNotNull(schema.enquiries.followUpAt), lte(schema.enquiries.followUpAt, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), sql`${schema.enquiries.status} NOT IN ('closed', 'spam')`) : undefined,
      search ? or(sql`${schema.enquiries.id}::text ILIKE ${`%${search}%`}`, sql`${schema.enquiries.payload}::text ILIKE ${`%${search}%`}`, matchingContacts.length ? inArray(schema.enquiries.contactId, matchingContacts) : undefined, matchingForms.length ? inArray(schema.enquiries.formId, matchingForms) : undefined) : undefined,
      from ? gte(schema.enquiries.createdAt, from) : undefined,
      to ? lte(schema.enquiries.createdAt, to) : undefined,
    );
    const limit = Math.max(1, Math.min(100, Number(request.query.limit) || 50));
    const offsetValue = Number(request.query.offset) || 0;
    const offset = Math.max(0, Math.min(1_000_000, Math.floor(offsetValue)));
    const [rows, totalRows] = await Promise.all([
      db.query.enquiries.findMany({ where, orderBy: followUps ? [asc(schema.enquiries.followUpAt), asc(schema.enquiries.createdAt)] : [desc(schema.enquiries.createdAt)], limit, offset }),
      db.select({ total: count() }).from(schema.enquiries).where(where),
    ]);
    const total = Number(totalRows[0]?.total ?? 0);
    const formIds = [...new Set(rows.flatMap((row) => row.formId ? [row.formId] : []))];
    const contactIds = [...new Set(rows.flatMap((row) => row.contactId ? [row.contactId] : []))];
    const pageIds = [...new Set(rows.flatMap((row) => row.sourcePageId ? [row.sourcePageId] : []))];
    const [forms, contacts, pages] = await Promise.all([
      formIds.length ? db.query.forms.findMany({ where: inArray(schema.forms.id, formIds) }) : [],
      contactIds.length ? db.query.contacts.findMany({ where: inArray(schema.contacts.id, contactIds) }) : [],
      pageIds.length ? db.query.pages.findMany({ where: inArray(schema.pages.id, pageIds), columns: { id: true, title: true, slug: true } }) : [],
    ]);
    const formMap = new Map(forms.map((form) => [form.id, form]));
    const contactMap = new Map(contacts.map((contact) => [contact.id, contact]));
    const pageMap = new Map(pages.map((page) => [page.id, page]));
    const enriched = rows.map((row) => ({ ...row, form: row.formId ? formMap.get(row.formId) ?? null : null, contact: row.contactId ? contactMap.get(row.contactId) ?? null : null, page: row.sourcePageId ? pageMap.get(row.sourcePageId) ?? null : null }));
    response.json({ enquiries: enriched, hasMore: rows.length === limit, limit, offset, total });
  });

  router.get("/enquiries/:enquiryId", async (request, response) => {
    const p = await owned(request, request.query.projectId);
    const enquiryId = parse(id, request.params.enquiryId);
    const enquiry = await db.query.enquiries.findFirst({ where: and(eq(schema.enquiries.id, enquiryId), eq(schema.enquiries.projectId, p.id)) });
    if (!enquiry) throw new HttpError(404, "Enquiry not found");
    const [contact, form, page, notes] = await Promise.all([
      enquiry.contactId ? db.query.contacts.findFirst({ where: eq(schema.contacts.id, enquiry.contactId) }) : null,
      enquiry.formId ? db.query.forms.findFirst({ where: eq(schema.forms.id, enquiry.formId) }) : null,
      enquiry.sourcePageId ? db.query.pages.findFirst({ where: eq(schema.pages.id, enquiry.sourcePageId), columns: { id: true, title: true, slug: true } }) : null,
      db.query.enquiryNotes.findMany({ where: eq(schema.enquiryNotes.enquiryId, enquiry.id), orderBy: [desc(schema.enquiryNotes.createdAt)] }),
    ]);
    response.json({ enquiry: { ...enquiry, contact, form, page, notes } });
  });

  router.patch("/enquiries/:enquiryId", async (request, response) => {
    const p = await owned(request, request.body?.projectId, true);
    const enquiryId = parse(id, request.params.enquiryId);
    const input = z.object({ projectId: id, status: enquiryStatus.optional(), assignedTo: id.nullable().optional(), followUpAt: z.string().datetime().nullable().optional() }).strict().safeParse(request.body);
    if (!input.success || !["status", "assignedTo", "followUpAt"].some((key) => Object.hasOwn(input.data, key))) throw new HttpError(400, "Valid status, assignee, or follow-up date is required");
    if (input.data.assignedTo) await project(p.id, input.data.assignedTo, "project:read");
    const [updated] = await db.update(schema.enquiries).set({ status: input.data.status, assignedTo: input.data.assignedTo === undefined ? undefined : input.data.assignedTo, followUpAt: input.data.followUpAt === undefined ? undefined : input.data.followUpAt ? new Date(input.data.followUpAt) : null, updatedAt: new Date() }).where(and(eq(schema.enquiries.id, enquiryId), eq(schema.enquiries.projectId, p.id))).returning();
    if (!updated) throw new HttpError(404, "Enquiry not found");
    response.json({ enquiry: updated });
  });

  router.post("/enquiries/:enquiryId/notes", async (request, response) => {
    const p = await owned(request, request.body?.projectId, true);
    const enquiryId = parse(id, request.params.enquiryId);
    const body = z.string().trim().min(1).max(10000).safeParse(request.body?.body);
    if (!body.success) throw new HttpError(400, "Note must contain 1–10,000 characters");
    const enquiry = await db.query.enquiries.findFirst({ where: and(eq(schema.enquiries.id, enquiryId), eq(schema.enquiries.projectId, p.id)) });
    if (!enquiry) throw new HttpError(404, "Enquiry not found");
    const [note] = await db.insert(schema.enquiryNotes).values({ enquiryId, authorId: request.auth?.userId || null, body: body.data }).returning();
    response.status(201).json({ note });
  });

  return router;
}

export function publicEnquiryRouter(environment: Environment): ExpressRouter {
  const db = createDb(environment.DATABASE_URL);
  const router = Router();
  router.post("/public/forms/submissions", async (request, response) => {
    const formId = request.body?.formId ? parse(id, request.body.formId) : null;
    const pageId = parse(id, request.body?.pageId);
    const nodeId = z.string().trim().min(1).max(255).parse(request.body?.nodeId);
    let form = formId ? await db.query.forms.findFirst({ where: and(eq(schema.forms.id, formId), eq(schema.forms.status, "active")) }) : undefined;
    const page = await db.query.pages.findFirst({ where: and(eq(schema.pages.id, pageId), eq(schema.pages.status, "published")) });
    if (!page) throw new HttpError(404, "Form is unavailable", "form_unavailable");
    const node = pageFormNode(page.publishedPageData || page.pageData || {}, nodeId);
    if (!node || (formId ? node.props?.formId !== formId : Boolean(node.props?.formId)))
      throw new HttpError(404, "Form is unavailable", "form_unavailable");
    let fields = form ? await db.query.formFields.findMany({ where: eq(schema.formFields.formId, form.id), orderBy: [schema.formFields.sortOrder] }) : [];
    if (!form) {
      if (!Array.isArray(node.props?.fields)) throw new HttpError(404, "Form is unavailable", "form_unavailable");
      fields = legacyFields(node.props.fields);
      form = undefined;
    }
    const projectId = form?.projectId || page.projectId;
    if (form && form.projectId !== page.projectId) throw new HttpError(400, "Form does not belong to this page", "invalid_submission");
    const project = await db.query.projects.findFirst({ where: eq(schema.projects.id, projectId) });
    if (!project?.isPublished) throw new HttpError(404, "Form is unavailable", "form_unavailable");
    const origin = request.header("origin");
    if (!origin) throw new HttpError(403, "Submission origin is required", "invalid_origin");
    let originUrl: URL;
    try { originUrl = new URL(origin); } catch { throw new HttpError(403, "Invalid submission origin", "invalid_origin"); }
    const hostname = originUrl.hostname.toLowerCase().replace(/^www\./, "");
    const originProtocol = originUrl.protocol;
    if (originProtocol !== "https:" && !(environment.NODE_ENV !== "production" && originProtocol === "http:" && ["localhost", "127.0.0.1"].includes(hostname))) throw new HttpError(403, "Secure submission origin required", "invalid_origin");
    const domains = await db.query.siteDomains.findMany({ where: eq(schema.siteDomains.projectId, projectId), columns: { hostname: true, isVerified: true } });
    const platformParts = (process.env.PLATFORM_DOMAIN || "localhost:3002").split(":");
    const platformDomain = platformParts[0].toLowerCase();
    const expectedPlatformPort = platformParts[1] || "";
    const verifiedDomain = domains.some((domain) => domain.isVerified && domain.hostname.toLowerCase() === hostname && originUrl.port === "");
    const platformOrigin = !!project.subdomain && hostname === `${project.subdomain}.${platformDomain}` && originUrl.port === expectedPlatformPort;
    const valid = verifiedDomain || platformOrigin;
    if (!valid) throw new HttpError(403, "Submission origin is not allowed", "invalid_origin");
    if (!fields.length) throw new HttpError(409, "Form has no fields", "form_unavailable");
    const values = fieldValues(fields, request.body?.values);
    const sourcePageId = page.id;
    const emailField = fields.find((field) => field.fieldType === "email");
    const nameField = fields.find((field) => /name/i.test(`${field.key} ${field.label}`));
    const phoneField = fields.find((field) => field.fieldType === "tel");
    const email = emailField ? String(values[emailField.key] || "").toLowerCase() : "";
    const contactName = nameField && typeof values[nameField.key] === "string" ? values[nameField.key] as string : "";
    const phone = phoneField && typeof values[phoneField.key] === "string" ? values[phoneField.key] as string : "";
    const enquiry = await db.transaction(async (tx) => {
      if (email) await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${projectId}), hashtext(${email}))`);
      let contact = email ? await tx.query.contacts.findFirst({ where: and(eq(schema.contacts.projectId, projectId), sql`lower(${schema.contacts.email}) = ${email}`) }) : undefined;
      if (!contact && (email || contactName || phone)) {
        const [created] = await tx.insert(schema.contacts).values({ projectId, email: email || null, name: contactName || null, phone: phone || null }).returning();
        contact = created;
      } else if (contact && (contactName || phone)) {
        const [updated] = await tx.update(schema.contacts).set({ name: contactName || contact.name, phone: phone || contact.phone, updatedAt: new Date() }).where(eq(schema.contacts.id, contact.id)).returning();
        contact = updated;
      }
      const [created] = await tx.insert(schema.enquiries).values({ projectId, formId: form?.id ?? null, contactId: contact?.id ?? null, sourcePageId, payload: values, fieldSnapshot: fields.map(({ key, label, fieldType, required, options }) => ({ key, label, fieldType, required, options })) }).returning();
      return created;
    });
    response.status(201).json({ success: true, enquiryId: enquiry.id, message: "Your message has been received." });
  });
  return router;
}
