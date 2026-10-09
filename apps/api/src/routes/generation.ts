import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { extractHtml, htmlToSectionJson } from "../lib/html-to-section-json.js";
import { createTextEmbedding, generateAIText, processPrompt, type AIInputPart } from "../lib/process-prompt.js";
import { loadPrompt } from "../lib/prompts.js";
import { getFontClassesForPrompt } from "../constants/fonts.js";
import multer from "multer";
import { extractJson } from "../lib/utils.js";
import { HttpError } from "../middleware/errors.js";
import type { RequestHandler } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { createDb, schema } from "@velozy/db";
import type { Environment } from "../config/env.js";
import { adminAccess } from "../lib/admin-auth.js";
import { collectionFieldsSchema, collectionKey, compatibleFields, validateCollectionValues } from "../lib/custom-collections.js";
import { requireProjectPlanLimit, withAiCredits, withRequestAiCredits } from "../lib/platform-billing.js";

const COMPONENT_REVISION_PROMPT = loadPrompt("component-revision.md");
const SECTIONS_STRUCTURE_PROMPT = loadPrompt("sections-structure.md");
const THEME_PROMPT = loadPrompt("theme.md").replace("{{AVAILABLE_FONT_CLASSES}}", getFontClassesForPrompt());
const PAGES_STRUCTURE_PROMPT = loadPrompt("pages-structure.md");
const SECTION_HTML_PROMPT = loadPrompt("section-html.md");
const DYNAMIC_SECTION_PROMPT = loadPrompt("dynamic-section.md");
const BUILDER_ASSISTANT_PROMPT = loadPrompt("builder-assistant.md");
const DESIGN_SYSTEM_PROMPT = loadPrompt("site-design-system.md");
const SECTION_PLACEMENT_PROMPT = loadPrompt("section-placement.md");

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

const chromeClassName = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length <= 600 &&
  /^[A-Za-z0-9\s:/._%#[\](),!\-]+$/.test(value);

function sanitizeSiteChrome(value: any) {
  const navbarKeys = ["wrapperClassName", "innerClassName", "brandClassName", "linksClassName", "linkClassName", "mobileClassName", "mobileToggleClassName"];
  const footerKeys = ["wrapperClassName", "innerClassName", "brandClassName", "linksClassName", "linkClassName"];
  if (!value || value.version !== 1 || !value.navbar || !value.footer ||
    !navbarKeys.every((key) => chromeClassName(value.navbar[key])) ||
    !footerKeys.every((key) => chromeClassName(value.footer[key])) ||
    typeof value.footer.description !== "string" || value.footer.description.length > 300 ||
    typeof value.footer.copyright !== "string" || value.footer.copyright.length > 160) {
    throw new HttpError(502, "AI returned an invalid site chrome design", "invalid_generation_output");
  }
  return {
    version: 1 as const,
    navbar: Object.fromEntries(navbarKeys.map((key) => [key, value.navbar[key]])),
    footer: {
      ...Object.fromEntries(footerKeys.map((key) => [key, value.footer[key]])),
      description: value.footer.description,
      copyright: value.footer.copyright,
    },
  };
}

function sanitizeNavigation(value: any) {
  if (!Array.isArray(value?.menus) || value.menus.length !== 2 ||
    value.locations?.header !== "header" || value.locations?.footer !== "footer") {
    throw new HttpError(502, "AI returned invalid navigation menus", "invalid_generation_output");
  }
  const menuIds = new Set<string>();
  const itemIds = new Set<string>();
  const menus = value.menus.map((menu: any) => {
    if (!menu || !["header", "footer"].includes(menu.id) || menuIds.has(menu.id) ||
      typeof menu.name !== "string" || menu.name.length > 100 ||
      !Array.isArray(menu.items) || menu.items.length > 12) {
      throw new HttpError(502, "AI returned invalid navigation menus", "invalid_generation_output");
    }
    menuIds.add(menu.id);
    const items = menu.items.map((item: any) => {
      if (!item || typeof item.id !== "string" || !/^[a-z0-9-]{1,80}$/i.test(item.id) ||
        itemIds.has(item.id) || !validString(item.label, 60) ||
        typeof item.url !== "string" || item.url.length > 255 ||
        !item.url.startsWith("/") || item.url.startsWith("//") || /[\\\s<>"']/.test(item.url)) {
        throw new HttpError(502, "AI returned an invalid navigation link", "invalid_generation_output");
      }
      itemIds.add(item.id);
      if (item.parentId !== undefined && (typeof item.parentId !== "string" || !/^[a-z0-9-]{1,80}$/i.test(item.parentId))) {
        throw new HttpError(502, "AI returned an invalid navigation link", "invalid_generation_output");
      }
      return {
        id: item.id,
        label: item.label.trim(),
        url: item.url,
        ...(item.parentId ? { parentId: item.parentId } : {}),
      };
    });
    if (items.some((item: any) => item.parentId && (
      item.parentId === item.id ||
      !items.some((parent: any) => parent.id === item.parentId && !parent.parentId)
    ))) {
      throw new HttpError(502, "AI returned invalid navigation nesting", "invalid_generation_output");
    }
    return { id: menu.id, name: menu.name.trim(), items };
  });
  if (!menuIds.has("header") || !menuIds.has("footer")) {
    throw new HttpError(502, "AI returned invalid navigation menus", "invalid_generation_output");
  }
  return { menus, locations: { header: "header", footer: "footer" } };
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
      initialRecords: z.array(z.record(z.string(), z.unknown())).max(8).default([]),
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
    const sections = parsed.sections.map(sanitizeSection).filter((section: any) =>
      !/(?:^|[-_\s])footer(?:$|[-_\s])/i.test(`${section.id} ${section.name}`),
    );
    if (!sections.length) throw new HttpError(502, "AI returned no page sections after moving the footer to shared site chrome.", "invalid_generation_output");
    const ids = new Set<string>();
    for (const section of sections) {
      if (ids.has(section.id)) throw new HttpError(502, "AI returned duplicate homepage section IDs. Please retry.", "invalid_generation_output");
      ids.add(section.id);
    }
    return {
      sections,
      siteChrome: sanitizeSiteChrome(parsed.siteChrome),
      navigation: sanitizeNavigation(parsed.navigation),
      success: true,
    };
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
  const { allowance } = await requireProjectPlanLimit(db, validProjectId.data, "published_pages");
  if (allowance < 2) throw new HttpError(403, "Upgrade to add pages beyond your free homepage", "plan_limit_reached");

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

const generateDesignSystem = (db: ReturnType<typeof createDb>, projectAccess: ReturnType<typeof adminAccess>['project']): RequestHandler => async (request, response) => {
  const projectId = z.string().uuid().safeParse(request.body?.projectId);
  if (!projectId.success || !request.auth?.userId) throw new HttpError(400, "Project and login are required", "project_required");
  const project = await projectAccess(projectId.data, request.auth.userId, "content:write");
  const preference = (project.designPreference as Record<string, any> | null) || {};
  if (typeof preference.designSystem === "string" && preference.designSystem.trim()) {
    return response.json({ designSystem: preference.designSystem, reused: true });
  }
  const generated = await withRequestAiCredits(db, request, projectAccess, "generate_content_brief", async () => {
    const result = await generateAIText(
      DESIGN_SYSTEM_PROMPT,
      [{ type: "text", text: JSON.stringify({ name: project.name, industry: project.industry, designPreference: preference }) }],
      "chat",
    );
    const document = result.trim();
    if (!document || document.length > 12000) throw new HttpError(502, "AI returned an invalid design system", "invalid_generation_output");
    return document;
  });
  const designSystem = await db.transaction(async (tx) => {
    const [current] = await tx.select({ designPreference: schema.projects.designPreference }).from(schema.projects).where(eq(schema.projects.id, projectId.data)).for("update");
    const currentPreference = (current?.designPreference as Record<string, any> | null) || {};
    if (typeof currentPreference.designSystem === "string" && currentPreference.designSystem.trim()) return currentPreference.designSystem;
    await tx.update(schema.projects).set({
      designPreference: { ...currentPreference, designSystem: generated, designSystemUpdatedAt: new Date().toISOString() },
      updatedAt: new Date(),
    }).where(eq(schema.projects.id, projectId.data));
    return generated;
  });
  response.json({ designSystem, reused: false });
};

const section = (db: ReturnType<typeof createDb>, projectAccess: ReturnType<typeof adminAccess>['project']): RequestHandler => async (request, response) => {
  const { prompt, sectionId, sectionName, sectionDescription, themeColors, kind, dynamicConfig, projectId, neighborSections = [] } = request.body ?? {};
  if (!validString(prompt) || !validString(sectionId, 255) || !validString(sectionName, 255) || !validString(sectionDescription, 2000) || !themeColors || typeof themeColors !== "object" || Array.isArray(themeColors))
    throw new HttpError(400, "Missing or invalid section parameters");
  const validProjectId = z.string().uuid().safeParse(projectId);
  if (!validProjectId.success || !request.auth?.userId) throw new HttpError(400, "Project and login are required to generate a section", "project_required");
  const project = await projectAccess(validProjectId.data, request.auth.userId, "content:write");
  const neighbors = z.array(z.object({ name: z.string().max(120), description: z.string().max(500), position: z.enum(["before", "after"]) })).max(24).safeParse(neighborSections);
  if (!neighbors.success) throw new HttpError(400, "Invalid neighboring section context");
  const designPreference = (project.designPreference as Record<string, any> | null) || {};
  const designSystem = typeof designPreference.designSystem === "string" ? designPreference.designSystem.slice(0, 12000) : "";
  const clientKey = request.header("idempotency-key");
  if (!clientKey || clientKey.length > 255) throw new HttpError(400, "An Idempotency-Key is required for AI generation", "idempotency_key_required");

  const testimonialBlogMismatch = dynamicConfig?.source === "blogs" && /testimonial|customer review|client review|customer quote/i.test(`${sectionName} ${sectionDescription}`);
  if (kind === "dynamic" && !testimonialBlogMismatch && dynamicConfig && typeof dynamicConfig === "object") {
    if (!sources.has(dynamicConfig.source)) throw new HttpError(400, "Invalid dynamic section source");
    let collectionId: string | undefined;
    if (dynamicConfig.source === "custom") {
      const parsedCollection = z.object({ name: z.string().trim().min(1).max(120), key: z.string().trim().min(1).max(80), description: z.string().trim().max(2000).optional(), fields: collectionFieldsSchema, initialRecords: z.array(z.record(z.string(), z.unknown())).max(8).default([]) }).safeParse(dynamicConfig.collection);
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
      const generated = await processPrompt(`${DYNAMIC_SECTION_PROMPT}\nSection: ${sectionName}\nDescription: ${sectionDescription}\nSource: ${dynamicConfig.source}\nLayout: ${dynamicConfig.layout}\nCustom field keys: ${dynamicConfig.source === "custom" ? JSON.stringify(dynamicConfig.collection.fields.map((field: any) => field.key)) : "none"}\nTheme: ${JSON.stringify(themeColors)}\nDesign system:\n${designSystem || "Not saved yet; follow the confirmed theme."}\nNeighboring page sections: ${JSON.stringify(neighbors.data)}`, prompt, "coding");
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
    const generated = await processPrompt(`${SECTION_HTML_PROMPT}\nSection to Generate:\n- ID: ${sectionId}\n- Name: ${sectionName}\n- Description: ${sectionDescription}\n- Theme Colors: ${JSON.stringify(themeColors)}\n- Design system:\n${designSystem || "Not saved yet; follow the confirmed theme."}\n- Neighboring page sections: ${JSON.stringify(neighbors.data)}\nKeep this section composition distinct from adjacent sections while matching the site's palette, typography, spacing, and component style.`, prompt, "coding");
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
  const validProjectId = z.string().uuid().safeParse(request.body?.projectId);
  if (!validProjectId.success || !request.auth?.userId) throw new HttpError(400, "Select a project before using the assistant", "project_required");
  const project = await projectAccess(validProjectId.data, request.auth.userId, "content:read");
  if (mode === "placement") {
    const sections = Array.isArray(parsedContext.sections) ? parsedContext.sections.slice(0, 100) : [];
    const result = await withRequestAiCredits(db, request, projectAccess, "generate_ai_followup_text", async () => {
      const answer = await generateAIText(SECTION_PLACEMENT_PROMPT, [{ type: "text", text: `Sections: ${JSON.stringify(sections)}\nRequest: ${prompt}` }], "chat");
      const placement = JSON.parse(extractJson(answer));
      const replacement = sections.find((item: any) => item.nodeId === placement.replaceNodeId);
      const raw = Number(placement.index);
      return { index: replacement ? replacement.index : Number.isFinite(raw) ? Math.max(0, Math.min(sections.length, Math.round(raw))) : sections.length, replaceNodeId: replacement?.nodeId || null, reason: typeof placement.reason === "string" ? placement.reason : "" };
    });
    return response.json(result);
  }

  const recentMessages = await db.select({ role: schema.aiChatMessages.role, content: schema.aiChatMessages.content, surface: schema.aiChats.surface })
    .from(schema.aiChatMessages)
    .innerJoin(schema.aiChats, eq(schema.aiChatMessages.chatId, schema.aiChats.id))
    .where(and(eq(schema.aiChats.projectId, validProjectId.data), eq(schema.aiChats.userId, request.auth.userId)))
    .orderBy(desc(schema.aiChatMessages.createdAt)).limit(16);
  let retrieved = recentMessages.reverse().map((item) => `[${item.surface}] ${item.role}: ${item.content}`).join("\n");
  try {
    const embedding = await createTextEmbedding(prompt);
    if (embedding) {
      const vectorLiteral = `[${embedding.join(",")}]`;
      const chunks = await db.select({ content: schema.aiContextChunks.content })
        .from(schema.aiContextChunks)
        .innerJoin(schema.aiChats, eq(schema.aiContextChunks.chatId, schema.aiChats.id))
        .where(and(eq(schema.aiChats.projectId, validProjectId.data), eq(schema.aiChats.userId, request.auth.userId), sql`${schema.aiContextChunks.embedding} IS NOT NULL`))
        .orderBy(sql`${schema.aiContextChunks.embedding} <=> ${vectorLiteral}::vector`)
        .limit(5);
      if (chunks.length) retrieved += `\nSemantically related saved context:\n${chunks.map((chunk) => chunk.content).join("\n")}`;
    }
  } catch (error) {
    console.warn("AI history embedding retrieval unavailable:", error);
  }
  const designPreference = (project.designPreference as Record<string, any> | null) || {};
  const designSystem = typeof designPreference.designSystem === "string" ? designPreference.designSystem.slice(0, 12000) : "";
  const parts: AIInputPart[] = [{ type: "text", text: `Recent conversation from this project across assistant surfaces:\n${retrieved || history}\nStored design system:\n${designSystem || "No confirmed design system is saved."}\nRelevant page context:\n${context}\nUser request:\n${prompt}` }];
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
      } else if (["update_node", "delete_node", "set_theme", "create_product", "create_blog"].includes(operation?.type)) operations.push(operation);
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
    .post("/generate/design-system", requireAuth, rateLimiter, generateDesignSystem(db, project))
    .post("/get-image", requireAuth, rateLimiter, image);
}
