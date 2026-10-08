import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { COMPONENT_REVISION_PROMPT } from "../constants/component-revision-prompt.js";
import { SECTIONS_STRUCTURE_PROMPT } from "../constants/sections-structure-prompt.js";
import { THEME_PROMPT } from "../constants/theme-prompt.js";
import { PAGES_STRUCTURE_PROMPT } from "../constants/pages-structure-prompt.js";
import { SECTION_HTML_PROMPT } from "../constants/section-html-prompt.js";
import { DYNAMIC_SECTION_PROMPT } from "../constants/dynamic-section-prompt.js";
import { extractHtml, htmlToSectionJson } from "../lib/html-to-section-json.js";
import { processPrompt } from "../lib/process-prompt.js";
import { generateAIText, type AIInputPart } from "../lib/process-prompt.js";
import { BUILDER_ASSISTANT_PROMPT } from "../constants/builder-assistant-prompt.js";
import multer from "multer";
import { extractJson } from "../lib/utils.js";
import { HttpError } from "../middleware/errors.js";
import type { RequestHandler } from "express";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { createDb, schema } from "@velozy/db";
import type { Environment } from "../config/env.js";
import { adminAccess } from "../lib/admin-auth.js";
import { collectionFieldsSchema, collectionKey, compatibleFields, validateCollectionValues } from "../lib/custom-collections.js";
import { requireProjectPlanLimit, withAiCredits, withRequestAiCredits } from "../lib/platform-billing.js";

const BLOCKED_PROPS = new Set([
  "children",
  "onClick",
  "onSubmit",
  "onChange",
  "projectId",
  "apiBaseUrl",
  "itemTemplateHtml",
]);
const sources = new Set(["products", "productCategories", "blogs", "custom"]);
const layouts = new Set(["grid", "list", "carousel"]);
const assistantUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 4 } }).array("files", 4);

async function enrichSectionImages(section: any) {
  const apiKey = process.env.PEXELS_API_KEY?.trim();
  if (!apiKey) return section;
  const visit = async (node: any): Promise<void> => {
    if (node?.type === "Image" && typeof node.props?.alt === "string" && !node.props.src) {
      try {
        const result = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(node.props.alt)}&per_page=10&orientation=landscape`, { headers: { Authorization: apiKey } });
        if (result.ok) {
          const data = await result.json();
          const image = Array.isArray(data.photos) ? data.photos.find((photo: any) => photo.width > photo.height) || data.photos[0] : null;
          node.props.src = image?.src?.large2x || image?.src?.original || "";
        }
      } catch (error) {
        console.warn("Could not find a section image:", error);
      }
    }
    if (Array.isArray(node?.props?.children)) await Promise.all(node.props.children.map(visit));
  };
  await Promise.all((section.components || []).map(visit));
  return section;
}

function validString(value: unknown, maximum = 5000): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maximum
  );
}

function sanitizeSection(section: any) {
  if (
    !section ||
    typeof section !== "object" ||
    !validString(section.id, 255) ||
    !validString(section.name, 255) ||
    !validString(section.description, 2000)
  ) {
    throw new HttpError(502, "AI returned an invalid homepage section", "invalid_generation_output");
  }
  const id = section.id.trim();
  const name = section.name.trim();
  const description = section.description.trim();
  const source = section?.dynamic?.source;
  const layout = section?.dynamic?.layout;
  const sectionText = `${name} ${description}`.toLowerCase();
  if (source === "blogs" && /testimonial|customer review|client review|customer quote/.test(sectionText)) {
    return { id, name, description, kind: "static" as const };
  }
  if (
    section?.kind !== "dynamic" ||
    !sources.has(source) ||
    !layouts.has(layout)
  )
    return { id, name, description, kind: "static" as const };
  const rawLimit = Number(section?.dynamic?.limit);
  let collection;
  if (source === "custom") {
    const parsed = z.object({
      name: z.string().trim().min(1).max(120),
      key: z.string().trim().min(1).max(80),
      description: z.string().trim().max(2000).optional(),
      fields: collectionFieldsSchema,
      initialRecords: z.array(z.record(z.string(), z.unknown())).min(1).max(8),
    }).safeParse(section.dynamic.collection);
    if (!parsed.success) throw new HttpError(502, "AI returned an invalid collection schema", "invalid_generation_output");
    collection = { ...parsed.data, key: collectionKey(parsed.data.key) };
    if (!collection.key) throw new HttpError(502, "AI returned an invalid collection key", "invalid_generation_output");
    for (const record of collection.initialRecords) {
      const values = validateCollectionValues(collection.fields, record);
      if (!values.success) throw new HttpError(502, "AI returned a draft record that does not match its schema", "invalid_generation_output");
    }
  }
  return {
    id,
    name,
    description,
    kind: "dynamic" as const,
    dynamic: {
      source,
      layout,
      limit: Number.isFinite(rawLimit)
        ? Math.max(1, Math.min(12, Math.round(rawLimit)))
        : 6,
      featuredOnly: Boolean(section.dynamic.featuredOnly),
      ...(collection ? { collection } : {}),
    },
  };
}

const componentRevision = (db: ReturnType<typeof createDb>, projectAccess: ReturnType<typeof adminAccess>['project']): RequestHandler => async (request, response) => {
  const { prompt, component, pageContext = {} } = request.body ?? {};
  if (
    !validString(prompt, 3000) ||
    !component ||
    typeof component.type !== "string" ||
    !component.props ||
    typeof component.props !== "object"
  )
    throw new HttpError(400, "A prompt and selected component are required");
  const result = await withRequestAiCredits(db, request, projectAccess, "rewrite_section", async () => {
    const generated = await processPrompt(
      `${COMPONENT_REVISION_PROMPT}\n\nSelected component:\n${JSON.stringify(component, null, 2)}\n\nPage context:\n${JSON.stringify(pageContext, null, 2)}\n\nUser request:\n${prompt.trim()}`,
      "Return the JSON revision now.",
      "coding",
    );
    const parsed = JSON.parse(extractJson(generated));
    if (!parsed?.props || typeof parsed.props !== "object" || Array.isArray(parsed.props)) throw new Error("AI response did not contain editable props");
    const props = Object.fromEntries(Object.entries(parsed.props).filter(([key, value]) => !BLOCKED_PROPS.has(key) && typeof value !== "function" && (value === null || ["string", "number", "boolean"].includes(typeof value) || (typeof value === "object" && !Array.isArray(value)))));
    if (!Object.keys(props).length) throw new Error("AI did not suggest any safe prop changes");
    return { props, summary: typeof parsed.summary === "string" ? parsed.summary : "Updated the selected component." };
  });
  response.json(result);
};

const structure = (db: ReturnType<typeof createDb>, projectAccess: ReturnType<typeof adminAccess>['project']): RequestHandler => async (request, response) => {
  const { prompt } = request.body ?? {};
  if (!validString(prompt))
    throw new HttpError(400, "Valid prompt string is required");
  const result = await withRequestAiCredits(db, request, projectAccess, "generate_content_brief", async () => {
    const parsed = JSON.parse(extractJson(await processPrompt(SECTIONS_STRUCTURE_PROMPT, prompt, "chat", { disableReasoning: true })));
    if (!Array.isArray(parsed?.sections) || parsed.sections.length < 1 || parsed.sections.length > 12) throw new HttpError(502, "AI did not return a usable homepage structure. Please retry.", "invalid_generation_output");
    const sections = parsed.sections.map(sanitizeSection);
    const ids = new Set<string>();
    for (const section of sections) {
      if (ids.has(section.id)) throw new HttpError(502, "AI returned duplicate homepage section IDs. Please retry.", "invalid_generation_output");
      ids.add(section.id);
    }
    return { sections, success: true };
  });
  response.json(result);
};

const pagesStructure = (db: ReturnType<typeof createDb>, projectAccess: ReturnType<typeof adminAccess>['project']): RequestHandler => async (request, response) => {
  const { request: changeRequest, pages, profile } = request.body ?? {};
  if (
    !validString(changeRequest, 1000) ||
    !Array.isArray(pages) ||
    pages.length > 11 ||
    pages.some((page: unknown) => !validString(page, 80)) ||
    !profile ||
    typeof profile !== "object" ||
    Array.isArray(profile)
  ) {
    throw new HttpError(400, "A page change request and valid current page plan are required");
  }
  const validProjectId = z.string().uuid().safeParse(request.body?.projectId);
  if (!validProjectId.success || !request.auth?.userId)
    throw new HttpError(400, "Select a project before planning additional pages", "project_required");
  await projectAccess(validProjectId.data, request.auth.userId, "content:write");
  await requireProjectPlanLimit(db, validProjectId.data, "published_pages");

  const profileFields = ["name", "industry", "archetype", "storeType", "subType", "businessDescription"] as const;
  const safeProfile = Object.fromEntries(
    profileFields.flatMap((field) => {
      const value = profile[field];
      if (value === undefined || value === null || value === "") return [];
      if (typeof value !== "string" || value.length > (field === "businessDescription" ? 2000 : 120)) {
        throw new HttpError(400, "Invalid site profile context");
      }
      return [[field, value.trim()]];
    }),
  );

  const prompt = [
    `Website profile: ${JSON.stringify(safeProfile)}`,
    `Current additional pages: ${JSON.stringify(pages)}`,
    `Requested change: ${changeRequest.trim()}`,
  ].join("\n");
  const result = await withRequestAiCredits(db, request, projectAccess, "generate_content_brief", async () => {
    const parsed = JSON.parse(extractJson(await processPrompt(PAGES_STRUCTURE_PROMPT, prompt, "chat", { disableReasoning: true })));
    if (!Array.isArray(parsed?.pages) || parsed.pages.length > 11 || parsed.pages.some((page: unknown) => typeof page !== "string")) throw new HttpError(502, "AI did not return a valid page plan. Please retry.", "invalid_generation_output");
    const uniquePages = new Set<string>();
    const pagesResult: string[] = [];
    for (const rawPage of parsed.pages) {
      const page = rawPage.trim().replace(/\s+/g, " ");
      if (!page || page.length > 80) throw new HttpError(502, "AI returned an invalid page name. Please retry.", "invalid_generation_output");
      const key = page.toLocaleLowerCase();
      if (key === "home" || uniquePages.has(key)) continue;
      uniquePages.add(key);
      pagesResult.push(page);
    }
    return { pages: pagesResult, success: true };
  });
  response.json(result);
};

const theme = (db: ReturnType<typeof createDb>, projectAccess: ReturnType<typeof adminAccess>['project']): RequestHandler => async (request, response) => {
  const { industry, styleType, userRequest, currentTheme, logoPalette } =
    request.body ?? {};
  if (!validString(industry, 500))
    throw new HttpError(400, "Valid industry string is required");
  if (!validString(styleType, 500))
    throw new HttpError(400, "Valid styleType string is required");
  const prompt = [
    `Industry: ${industry}. Style Type: ${styleType}. Generate a color theme that matches this industry and style.`,
    currentTheme
      ? `Current theme to revise: ${JSON.stringify(currentTheme)}.`
      : "",
    logoPalette
      ? `Logo palette to respect: ${JSON.stringify(logoPalette)}.`
      : "",
    userRequest ? `User's palette request: ${userRequest}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const result = await withRequestAiCredits(db, request, projectAccess, "generate_content_brief", async () => {
    const parsed = JSON.parse(extractJson(await processPrompt(THEME_PROMPT, prompt, "chat", { disableReasoning: true })));
    if (!parsed?.theme?.colors) throw new Error("Response missing required theme");
    return { theme: parsed.theme, success: true };
  });
  response.json(result);
};

const section = (db: ReturnType<typeof createDb>, projectAccess: ReturnType<typeof adminAccess>['project']): RequestHandler => async (request, response) => {
  const { prompt, sectionId, sectionName, sectionDescription, themeColors, kind, dynamicConfig, projectId } = request.body ?? {};
  if (!validString(prompt) || !validString(sectionId, 255) || !validString(sectionName, 255) || !validString(sectionDescription, 2000) || !themeColors || typeof themeColors !== "object" || Array.isArray(themeColors))
    throw new HttpError(400, "Missing or invalid section parameters");
  const validProjectId = z.string().uuid().safeParse(projectId);
  if (!validProjectId.success || !request.auth?.userId) throw new HttpError(400, "Project and login are required to generate a section", "project_required");
  await projectAccess(validProjectId.data, request.auth.userId, "content:write");
  const clientKey = request.header("idempotency-key");
  if (!clientKey || clientKey.length > 255) throw new HttpError(400, "An Idempotency-Key is required for AI generation", "idempotency_key_required");

  const testimonialBlogMismatch = dynamicConfig?.source === "blogs" && /testimonial|customer review|client review|customer quote/i.test(`${sectionName} ${sectionDescription}`);
  if (kind === "dynamic" && !testimonialBlogMismatch && dynamicConfig && typeof dynamicConfig === "object") {
    if (!sources.has(dynamicConfig.source)) throw new HttpError(400, "Invalid dynamic section source");
    let collectionId: string | undefined;
    if (dynamicConfig.source === "custom") {
      const parsedCollection = z.object({ name: z.string().trim().min(1).max(120), key: z.string().trim().min(1).max(80), description: z.string().trim().max(2000).optional(), fields: collectionFieldsSchema, initialRecords: z.array(z.record(z.string(), z.unknown())).min(1).max(8) }).safeParse(dynamicConfig.collection);
      if (!parsedCollection.success) throw new HttpError(400, "Invalid dynamic collection proposal", "validation_error");
      const proposed = { ...parsedCollection.data, key: collectionKey(parsedCollection.data.key) };
      for (const record of proposed.initialRecords) {
        const validated = validateCollectionValues(proposed.fields, record);
        if (!validated.success) throw new HttpError(400, validated.error, "validation_error");
      }
      collectionId = await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${projectId}), hashtext(${proposed.key}))`);
        let found = await tx.query.customCollections.findFirst({ where: and(eq(schema.customCollections.projectId, projectId), eq(schema.customCollections.key, proposed.key)) });
        if (found && !compatibleFields(found.fields, proposed.fields)) throw new HttpError(409, "A collection with this key has an incompatible schema", "schema_conflict");
        if (!found) {
          [found] = await tx.insert(schema.customCollections).values({ projectId, name: proposed.name, key: proposed.key, description: proposed.description || null, fields: proposed.fields, createdBy: request.auth!.userId }).returning();
        } else if (found.isArchived) {
          [found] = await tx.update(schema.customCollections).set({ isArchived: false, updatedAt: new Date() }).where(eq(schema.customCollections.id, found.id)).returning();
        }
        const records = await tx.query.customCollectionRecords.findMany({ where: eq(schema.customCollectionRecords.collectionId, found.id), columns: { id: true }, limit: 1 });
        if (!records.length) {
          const draftRecords = proposed.initialRecords.flatMap((record) => {
            const validated = validateCollectionValues(found!.fields as z.infer<typeof collectionFieldsSchema>, record);
            if (!validated.success) throw new HttpError(409, "AI draft records do not match the existing collection schema", "schema_conflict");
            return [{ collectionId: found!.id, values: validated.value, status: "draft", createdBy: request.auth!.userId }];
          });
          if (draftRecords.length) await tx.insert(schema.customCollectionRecords).values(draftRecords);
        }
        return found.id;
      });
    }
    const config = await withAiCredits(db, { projectId: validProjectId.data, actorId: request.auth.userId, clientKey, action: "generate_section" }, async () => {
      const generated = await processPrompt(`${DYNAMIC_SECTION_PROMPT}\nSection: ${sectionName}\nDescription: ${sectionDescription}\nSource: ${dynamicConfig.source}\nLayout: ${dynamicConfig.layout}\nCustom field keys: ${dynamicConfig.source === "custom" ? JSON.stringify(dynamicConfig.collection.fields.map((field: any) => field.key)) : "none"}\nTheme: ${JSON.stringify(themeColors)}`, prompt, "coding");
      return JSON.parse(extractJson(generated));
    });
    return response.json({ section: {
      id: sectionId,
      components: [{ id: `${sectionId}-dynamic`, type: "DynamicCollection", props: {
        projectId, source: dynamicConfig.source, ...(collectionId ? { collectionId } : {}), heading: config.heading || sectionName,
        description: config.description || sectionDescription, limit: dynamicConfig.limit || 6,
        featuredOnly: Boolean(dynamicConfig.featuredOnly), apiBaseUrl: "",
        sectionClassName: config.sectionClassName || "w-full px-6 py-20 bg-background text-foreground",
        headerClassName: config.headerClassName || "", headingClassName: config.headingClassName || "text-4xl font-semibold",
        descriptionClassName: config.descriptionClassName || "mt-4 text-base", itemsContainerClassName: config.itemsContainerClassName || "mt-10 grid gap-6 md:grid-cols-3",
        emptyStateText: config.emptyStateText || "No published content yet.", itemTemplateHtml: "<article class=\"rounded-xl border p-6\"><img src=\"{{image}}\" alt=\"{{title}}\" /><h3>{{title}}</h3><p>{{summary}}</p></article>",
      } }],
    }, success: true });
  }

  const parsed = await withAiCredits(db, { projectId: validProjectId.data, actorId: request.auth.userId, clientKey, action: "generate_section" }, async () => {
    const generated = await processPrompt(`${SECTION_HTML_PROMPT}\nSection to Generate:\n- ID: ${sectionId}\n- Name: ${sectionName}\n- Description: ${sectionDescription}\n- Theme Colors: ${JSON.stringify(themeColors)}`, prompt, "coding");
    const html = extractHtml(generated);
    if (!html) throw new Error("AI returned empty section HTML");
    const result = await enrichSectionImages(htmlToSectionJson(html, sectionId));
    if (!result.components?.length) throw new Error("AI returned an empty section");
    return result;
  });
  response.json({ section: parsed, success: true });
};

const builderAssistant = (db: ReturnType<typeof createDb>, projectAccess: ReturnType<typeof adminAccess>['project']): RequestHandler => async (request, response) => {
  const prompt = String(request.body?.prompt || "").trim();
  const context = String(request.body?.context || "{}");
  const history = String(request.body?.history || "[]");
  const mode = String(request.body?.mode || "generate");
  if (!validString(prompt) || context.length > 120_000 || history.length > 12_000) throw new HttpError(400, "Invalid builder request");
  const parsedContext = JSON.parse(context);
  if (mode === "placement") {
    const sections = Array.isArray(parsedContext.sections) ? parsedContext.sections.slice(0, 100) : [];
    const result = await withRequestAiCredits(db, request, projectAccess, "generate_ai_followup_text", async () => {
      const answer = await generateAIText("Choose the insertion point for a new website section. Return JSON only: {\"index\": number, \"replaceNodeId\": string|null, \"reason\": string}.", [{ type: "text", text: `Sections: ${JSON.stringify(sections)}\nRequest: ${prompt}` }], "chat");
      const placement = JSON.parse(extractJson(answer));
      const replacement = sections.find((item: any) => item.nodeId === placement.replaceNodeId);
      const raw = Number(placement.index);
      return { index: replacement ? replacement.index : Number.isFinite(raw) ? Math.max(0, Math.min(sections.length, Math.round(raw))) : sections.length, replaceNodeId: replacement?.nodeId || null, reason: typeof placement.reason === "string" ? placement.reason : "" };
    });
    return response.json(result);
  }

  const parts: AIInputPart[] = [{ type: "text", text: `Recent conversation:\n${history}\nRelevant page context:\n${context}\nUser request:\n${prompt}` }];
  for (const file of (request.files || []) as Express.Multer.File[]) {
    if (!["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.mimetype)) throw new HttpError(400, "Unsupported attachment type");
    const dataUrl = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
    parts.push(file.mimetype.startsWith("image/") ? { type: "image", dataUrl } : { type: "file", filename: file.originalname, dataUrl });
  }
  const result = await withRequestAiCredits(db, request, projectAccess, "generate_section", async () => {
    const answer = await generateAIText(BUILDER_ASSISTANT_PROMPT, parts, "coding");
    const plan = JSON.parse(extractJson(answer));
    const operations = [];
    for (const [index, operation] of (Array.isArray(plan.operations) ? plan.operations.slice(0, 12) : []).entries()) {
      if (operation?.type === "add_section" && typeof operation.html === "string") {
        operations.push({ type: "add_section", name: typeof operation.name === "string" ? operation.name : "New section", index: Number.isFinite(Number(operation.index)) ? Number(operation.index) : undefined, section: await enrichSectionImages(htmlToSectionJson(operation.html, `ai-${Date.now()}-${index}`)) });
      } else if (["update_node", "delete_node", "set_theme", "create_product"].includes(operation?.type)) operations.push(operation);
    }
    return { message: typeof plan.message === "string" ? plan.message : "Your changes are ready.", operations };
  });
  response.json(result);
};

const image: RequestHandler = async (request, response) => {
  const { altText } = request.body ?? {};
  if (!validString(altText, 500))
    throw new HttpError(400, "Alt text is required");
  if (!process.env.PEXELS_API_KEY)
    throw new Error("Pexels API key not configured");
  const upstream = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(altText)}&per_page=10&orientation=landscape`,
    { headers: { Authorization: process.env.PEXELS_API_KEY } },
  );
  if (!upstream.ok)
    throw new Error(`Pexels API responded with status ${upstream.status}`);
  const data = (await upstream.json()) as {
    photos?: Array<{
      width: number;
      height: number;
      src?: { large2x?: string; original?: string };
    }>;
  };
  const photo =
    data.photos?.find((item) => item.width > item.height) ?? data.photos?.[0];
  const imageUrl = photo?.src?.large2x ?? photo?.src?.original;
  if (!imageUrl)
    throw new HttpError(404, "No images found for the given alt text");
  response.json({ imageUrl, success: true });
};

export function generationRouter(environment: Environment, requireAuth: RequestHandler, rateLimiter: RequestHandler): ExpressRouter {
  const db = createDb(environment.DATABASE_URL);
  const { project } = adminAccess(environment.DATABASE_URL);
  return Router()
    .post("/generate/component-revision", requireAuth, rateLimiter, componentRevision(db, project))
    .post("/generate/sections-structure", requireAuth, rateLimiter, structure(db, project))
    .post("/generate/pages-structure", requireAuth, rateLimiter, pagesStructure(db, project))
    .post("/generate/section", requireAuth, rateLimiter, section(db, project))
    .post("/generate/builder-assistant", requireAuth, rateLimiter, assistantUpload, builderAssistant(db, project))
    .post("/generate/theme", requireAuth, rateLimiter, theme(db, project))
    .post("/get-image", requireAuth, rateLimiter, image);
}
