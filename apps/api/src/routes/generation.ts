import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { COMPONENT_REVISION_PROMPT } from "../constants/component-revision-prompt.js";
import { SECTIONS_STRUCTURE_PROMPT } from "../constants/sections-structure-prompt.js";
import { THEME_PROMPT } from "../constants/theme-prompt.js";
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

const BLOCKED_PROPS = new Set([
  "children",
  "onClick",
  "onSubmit",
  "onChange",
  "projectId",
  "apiBaseUrl",
  "itemTemplateHtml",
]);
const sources = new Set(["products", "productCategories", "blogs"]);
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
  const id = validString(section?.id, 255) ? section.id.trim() : "section";
  const name = validString(section?.name, 255)
    ? section.name.trim()
    : "Section";
  const description = validString(section?.description, 2000)
    ? section.description.trim()
    : "Distinctive website section.";
  const source = section?.dynamic?.source;
  const layout = section?.dynamic?.layout;
  if (
    section?.kind !== "dynamic" ||
    !sources.has(source) ||
    !layouts.has(layout)
  )
    return { id, name, description, kind: "static" as const };
  const rawLimit = Number(section?.dynamic?.limit);
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
    },
  };
}

const componentRevision: RequestHandler = async (request, response) => {
  const { prompt, component, pageContext = {} } = request.body ?? {};
  if (
    !validString(prompt, 3000) ||
    !component ||
    typeof component.type !== "string" ||
    !component.props ||
    typeof component.props !== "object"
  )
    throw new HttpError(400, "A prompt and selected component are required");
  const generated = await processPrompt(
    `${COMPONENT_REVISION_PROMPT}\n\nSelected component:\n${JSON.stringify(component, null, 2)}\n\nPage context:\n${JSON.stringify(pageContext, null, 2)}\n\nUser request:\n${prompt.trim()}`,
    "Return the JSON revision now.",
    "coding",
  );
  const parsed = JSON.parse(extractJson(generated));
  if (
    !parsed?.props ||
    typeof parsed.props !== "object" ||
    Array.isArray(parsed.props)
  )
    throw new Error("AI response did not contain editable props");
  const props = Object.fromEntries(
    Object.entries(parsed.props).filter(
      ([key, value]) =>
        !BLOCKED_PROPS.has(key) &&
        typeof value !== "function" &&
        (value === null ||
          ["string", "number", "boolean"].includes(typeof value) ||
          (typeof value === "object" && !Array.isArray(value))),
    ),
  );
  if (!Object.keys(props).length)
    throw new Error("AI did not suggest any safe prop changes");
  response.json({
    props,
    summary:
      typeof parsed.summary === "string"
        ? parsed.summary
        : "Updated the selected component.",
  });
};

const structure: RequestHandler = async (request, response) => {
  const { prompt } = request.body ?? {};
  if (!validString(prompt))
    throw new HttpError(400, "Valid prompt string is required");
  const parsed = JSON.parse(
    extractJson(await processPrompt(SECTIONS_STRUCTURE_PROMPT, prompt, "chat")),
  );
  if (!Array.isArray(parsed?.sections))
    throw new Error("Response missing required sections");
  response.json({
    sections: parsed.sections.map(sanitizeSection),
    success: true,
  });
};

const theme: RequestHandler = async (request, response) => {
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
  const parsed = JSON.parse(
    extractJson(await processPrompt(THEME_PROMPT, prompt, "chat")),
  );
  if (!parsed?.theme?.colors)
    throw new Error("Response missing required theme");
  response.json({ theme: parsed.theme, success: true });
};

const section: RequestHandler = async (request, response) => {
  const { prompt, sectionId, sectionName, sectionDescription, themeColors, kind, dynamicConfig, projectId } = request.body ?? {};
  if (!validString(prompt) || !validString(sectionId, 255) || !validString(sectionName, 255) || !validString(sectionDescription, 2000) || !themeColors || typeof themeColors !== "object" || Array.isArray(themeColors))
    throw new HttpError(400, "Missing or invalid section parameters");

  if (kind === "dynamic" && dynamicConfig && typeof dynamicConfig === "object" && validString(projectId, 100)) {
    if (!sources.has(dynamicConfig.source)) throw new HttpError(400, "Invalid dynamic section source");
    const generated = await processPrompt(`${DYNAMIC_SECTION_PROMPT}\nSection: ${sectionName}\nDescription: ${sectionDescription}\nSource: ${dynamicConfig.source}\nLayout: ${dynamicConfig.layout}\nTheme: ${JSON.stringify(themeColors)}`, prompt, "coding");
    const config = JSON.parse(extractJson(generated));
    return response.json({ section: {
      id: sectionId,
      components: [{ id: `${sectionId}-dynamic`, type: "DynamicCollection", props: {
        projectId, source: dynamicConfig.source, heading: config.heading || sectionName,
        description: config.description || sectionDescription, limit: dynamicConfig.limit || 6,
        featuredOnly: Boolean(dynamicConfig.featuredOnly), apiBaseUrl: "",
        sectionClassName: config.sectionClassName || "w-full px-6 py-20 bg-background text-foreground",
        headerClassName: config.headerClassName || "", headingClassName: config.headingClassName || "text-4xl font-semibold",
        descriptionClassName: config.descriptionClassName || "mt-4 text-base", itemsContainerClassName: config.itemsContainerClassName || "mt-10 grid gap-6 md:grid-cols-3",
        emptyStateText: config.emptyStateText || "No published content yet.", itemTemplateHtml: "<article class=\"rounded-xl border p-6\"><img src=\"{{image}}\" alt=\"{{title}}\" /><h3>{{title}}</h3><p>{{summary}}</p></article>",
      } }],
    }, success: true });
  }

  const generated = await processPrompt(`${SECTION_HTML_PROMPT}\nSection to Generate:\n- ID: ${sectionId}\n- Name: ${sectionName}\n- Description: ${sectionDescription}\n- Theme Colors: ${JSON.stringify(themeColors)}`, prompt, "coding");
  const html = extractHtml(generated);
  if (!html) throw new Error("AI returned empty section HTML");
  const parsed = await enrichSectionImages(htmlToSectionJson(html, sectionId));
  if (!parsed.components?.length) throw new Error("AI returned an empty section");
  response.json({ section: parsed, success: true });
};

const builderAssistant: RequestHandler = async (request, response) => {
  const prompt = String(request.body?.prompt || "").trim();
  const context = String(request.body?.context || "{}");
  const history = String(request.body?.history || "[]");
  const mode = String(request.body?.mode || "generate");
  if (!validString(prompt) || context.length > 120_000 || history.length > 12_000) throw new HttpError(400, "Invalid builder request");
  const parsedContext = JSON.parse(context);
  if (mode === "placement") {
    const sections = Array.isArray(parsedContext.sections) ? parsedContext.sections.slice(0, 100) : [];
    const answer = await generateAIText("Choose the insertion point for a new website section. Return JSON only: {\"index\": number, \"replaceNodeId\": string|null, \"reason\": string}.", [{ type: "text", text: `Sections: ${JSON.stringify(sections)}\nRequest: ${prompt}` }], "chat");
    const placement = JSON.parse(extractJson(answer));
    const replacement = sections.find((item: any) => item.nodeId === placement.replaceNodeId);
    const raw = Number(placement.index);
    return response.json({ index: replacement ? replacement.index : Number.isFinite(raw) ? Math.max(0, Math.min(sections.length, Math.round(raw))) : sections.length, replaceNodeId: replacement?.nodeId || null, reason: typeof placement.reason === "string" ? placement.reason : "" });
  }

  const parts: AIInputPart[] = [{ type: "text", text: `Recent conversation:\n${history}\nRelevant page context:\n${context}\nUser request:\n${prompt}` }];
  for (const file of (request.files || []) as Express.Multer.File[]) {
    if (!["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.mimetype)) throw new HttpError(400, "Unsupported attachment type");
    const dataUrl = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
    parts.push(file.mimetype.startsWith("image/") ? { type: "image", dataUrl } : { type: "file", filename: file.originalname, dataUrl });
  }
  const answer = await generateAIText(BUILDER_ASSISTANT_PROMPT, parts, "coding");
  const plan = JSON.parse(extractJson(answer));
  const operations = [];
  for (const [index, operation] of (Array.isArray(plan.operations) ? plan.operations.slice(0, 12) : []).entries()) {
    if (operation?.type === "add_section" && typeof operation.html === "string") {
      operations.push({ type: "add_section", name: typeof operation.name === "string" ? operation.name : "New section", index: Number.isFinite(Number(operation.index)) ? Number(operation.index) : undefined, section: await enrichSectionImages(htmlToSectionJson(operation.html, `ai-${Date.now()}-${index}`)) });
    } else if (["update_node", "delete_node", "set_theme", "create_product"].includes(operation?.type)) operations.push(operation);
  }
  response.json({ message: typeof plan.message === "string" ? plan.message : "Your changes are ready.", operations });
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

export function generationRouter(requireAuth: RequestHandler, rateLimiter: RequestHandler): ExpressRouter {
  return Router()
    .post("/generate/component-revision", requireAuth, rateLimiter, componentRevision)
    .post("/generate/sections-structure", requireAuth, rateLimiter, structure)
    .post("/generate/section", requireAuth, rateLimiter, section)
    .post("/generate/builder-assistant", requireAuth, rateLimiter, assistantUpload, builderAssistant)
    .post("/generate/theme", requireAuth, rateLimiter, theme)
    .post("/get-image", requireAuth, rateLimiter, image);
}
