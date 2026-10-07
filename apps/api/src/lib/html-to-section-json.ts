import {
  parse,
  HTMLElement as ParsedHTMLElement,
  Node,
} from "node-html-parser";
import { nanoid } from "nanoid";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

type ComponentType =
  | "Container"
  | "Text"
  | "Button"
  | "Image"
  | "List"
  | "Accordion"
  | "Icon"
  | "Iframe"
  | "Carousel"
  | "Form";

interface ComponentNode {
  id?: string;
  type: ComponentType | string;
  props: Record<string, any>;
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Tags that map to a Text component */
const TEXT_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "span",
  "blockquote",
  "pre",
  "strong",
  "em",
  "label",
  "small",
  "cite",
  "figcaption",
  "caption",
]);

/** Tags that map to a Container component */
const CONTAINER_TAGS = new Set([
  "div",
  "section",
  "article",
  "header",
  "footer",
  "main",
  "nav",
  "aside",
  "figure",
  "fieldset",
]);

/** Tags that should be skipped entirely (comments, scripts, styles, etc.) */
const SKIP_TAGS = new Set([
  "script",
  "style",
  "meta",
  "link",
  "noscript",
  "template",
  "head",
]);

/** Extract class and inline-style from a parsed element */
function extractStyling(el: ParsedHTMLElement): {
  className: string | undefined;
  style: Record<string, string> | undefined;
} {
  const rawClass = el.getAttribute("class")?.trim();
  const className = rawClass || undefined;
  const styleAttr = el.getAttribute("style");

  let style: Record<string, string> | undefined;
  if (styleAttr) {
    style = {};
    styleAttr.split(";").forEach((rule) => {
      const [prop, val] = rule.split(":").map((s) => s.trim());
      if (prop && val) {
        // Convert kebab-case to camelCase
        const camelProp = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        style![camelProp] = val;
      }
    });
    if (Object.keys(style).length === 0) style = undefined;
  }

  return { className, style };
}

/** Detect if an element is purely decorative and should map to a plain HTML tag rather than a Craft Container */
function isDecorativeElement(className?: string): boolean {
  if (!className) return false;
  // Patterns common in backgrounds, blobs, grids, etc.
  return (
    /\b(absolute|fixed)\b/.test(className) &&
    /\b(inset-|top-|bottom-|left-|right-|-top-|-bottom-|-left-|-right-|blur-|bg-gradient|bg-grid|bg-|pattern|blob|shape|opacity-)\b/.test(
      className,
    )
  );
}

/** Detect if an <a> or <button> tag is meant as a CTA button */
function isButtonLike(el: ParsedHTMLElement): boolean {
  const cls = el.getAttribute("class") || "";
  const role = el.getAttribute("role") || "";
  // If it has button-like classes or a role="button", treat as Button
  return (
    /\b(btn|button|cta)\b/i.test(cls) ||
    role === "button" ||
    el.tagName === "BUTTON"
  );
}

/** Map data-variant → Button variant */
function resolveButtonVariant(el: ParsedHTMLElement): string {
  const v = el.getAttribute("data-variant");
  if (v) return v;
  const cls = el.getAttribute("class") || "";
  if (/outline/i.test(cls)) return "outline";
  if (/ghost/i.test(cls)) return "ghost";
  if (/secondary/i.test(cls)) return "secondary";
  return "primary";
}

/** Map data-size → Button size */
function resolveButtonSize(el: ParsedHTMLElement): string {
  const s = el.getAttribute("data-size");
  if (s) return s;
  const cls = el.getAttribute("class") || "";
  if (/\blg\b/.test(cls)) return "lg";
  if (/\bsm\b/.test(cls)) return "sm";
  return "md";
}

// ──────────────────────────────────────────────────────────────────────────────
// Core converter: Node → ComponentNode | null
// ──────────────────────────────────────────────────────────────────────────────

function convertNode(node: Node): ComponentNode | null {
  const result = _convertNode(node);
  if (result && !result.id) {
    result.id = nanoid();
  }
  return result;
}

function _convertNode(node: Node): ComponentNode | null {
  // Text nodes
  if (node.nodeType === 3) {
    const text = (node as any).text?.trim();
    if (!text) return null;
    return {
      type: "Text",
      props: { text, tag: "span" },
    };
  }

  if (node.nodeType !== 1) return null; // not an element node

  const el = node as ParsedHTMLElement;
  const tag = el.tagName?.toLowerCase();

  if (!tag || SKIP_TAGS.has(tag)) return null;

  // ── <img> ──────────────────────────────────────────────────────────────────
  if (tag === "img") {
    const { className, style } = extractStyling(el);
    return {
      type: "Image",
      props: {
        src: "",
        alt: el.getAttribute("alt") || "image",
        ...(className ? { className } : {}),
        ...(style ? { style } : {}),
      },
    };
  }

  // ── <iframe> ───────────────────────────────────────────────────────────────
  if (tag === "iframe") {
    const { className, style } = extractStyling(el);
    return {
      type: "Iframe",
      props: {
        src: el.getAttribute("src") || "",
        allowFullScreen: el.getAttribute("allowfullscreen") !== null,
        loading: (el.getAttribute("loading") as "lazy" | "eager") || "lazy",
        ...(className ? { className } : {}),
        ...(style ? { style } : {}),
      },
    };
  }

  // ── <button> / <a> ─────────────────────────────────────────────────────────
  if (tag === "button" || (tag === "a" && isButtonLike(el))) {
    const { className: rawClassName, style } = extractStyling(el);
    const text =
      el.getAttribute("data-text") || el.textContent?.trim() || "Click here";

    // Strip btn/cta classes — those are handled by the variant system
    const className =
      rawClassName
        ?.replace(
          /\b(btn|cta)(-(primary|secondary|outline|ghost|lg|sm|md))?\b/gi,
          "",
        )
        .replace(/\s{2,}/g, " ")
        .trim() || undefined;

    return {
      type: "Button",
      props: {
        text,
        variant: resolveButtonVariant(el),
        size: resolveButtonSize(el),
        ...(tag === "a" ? { href: el.getAttribute("href") || "#" } : {}),
        ...(el.getAttribute("target")
          ? { target: el.getAttribute("target")! }
          : {}),
        ...(className ? { className } : {}),
        ...(style ? { style } : {}),
      },
    };
  }

  // ── <a> (plain links, not buttons) ─────────────────────────────────────────
  if (tag === "a" && !isButtonLike(el)) {
    // Treat plain links as text with the link content preserved
    const { className, style } = extractStyling(el);
    return {
      type: "Text",
      props: {
        text: el.innerHTML?.trim() || el.textContent?.trim() || "",
        tag: "span" as const,
        ...(className ? { className } : {}),
        ...(style ? { style } : {}),
      },
    };
  }

  // ── <ul> / <ol> — check if accordion via data attribute ───────────────────
  if (tag === "ul" || tag === "ol") {
    const isAccordion =
      el.getAttribute("data-component") === "accordion" ||
      (el.getAttribute("role") === "list" &&
        el.getAttribute("data-accordion") !== null);

    if (isAccordion || el.getAttribute("data-component") === "accordion") {
      // Build accordion from <li data-title="...">content</li>
      const items = el
        .querySelectorAll("li")
        .map((li: ParsedHTMLElement, idx: number) => ({
          id: `acc-${idx + 1}`,
          title:
            li.getAttribute("data-title") ||
            li.querySelector("summary,h3,h4,strong")?.textContent?.trim() ||
            `Item ${idx + 1}`,
          content:
            li.getAttribute("data-content") ||
            (() => {
              // Extract content minus the title element
              const titleEl = li.querySelector("summary,h3,h4,strong");
              if (titleEl) {
                const clone = li.text;
                return (
                  clone.replace(titleEl.textContent || "", "").trim() ||
                  li.textContent?.trim() ||
                  ""
                );
              }
              return li.textContent?.trim() || "";
            })(),
        }));

      const { className, style } = extractStyling(el);
      return {
        type: "Accordion",
        props: {
          items,
          collapsible: true,
          ...(className ? { className } : {}),
          ...(style ? { style } : {}),
        },
      };
    }

    // Regular list — determine if items are simple text or complex
    const { className, style } = extractStyling(el);
    const liElements = el.querySelectorAll("li");

    // Check if any <li> has child *elements* (not just text)
    const hasComplexItems = liElements.some((li: ParsedHTMLElement) =>
      li.childNodes.some(
        (child) =>
          child.nodeType === 1 && // ELEMENT_NODE
          !["BR"].includes(
            (child as ParsedHTMLElement).tagName?.toUpperCase?.() || "",
          ),
      ),
    );

    if (hasComplexItems) {
      // Complex list: convert to Container with child Containers
      const children: ComponentNode[] = [];
      for (const li of liElements) {
        const liChildren: ComponentNode[] = [];
        for (const child of (li as ParsedHTMLElement).childNodes) {
          const converted = convertNode(child);
          if (converted) liChildren.push(converted);
        }
        const { className: liClassName, style: liStyle } = extractStyling(
          li as ParsedHTMLElement,
        );
        children.push({
          type: "Container",
          props: {
            ...(liChildren.length > 0 ? { children: liChildren } : {}),
            ...(liClassName ? { className: liClassName } : {}),
            ...(liStyle ? { style: liStyle } : {}),
          },
        });
      }

      return {
        type: "Container",
        props: {
          tag: tag as "ul" | "ol",
          ...(children.length > 0 ? { children } : {}),
          ...(className ? { className } : {}),
          ...(style ? { style } : {}),
        },
      };
    }

    // Simple text-only list
    const items = liElements
      .map((li: ParsedHTMLElement) => li.textContent?.trim() || "")
      .filter(Boolean);

    return {
      type: "List",
      props: {
        items,
        tag: tag as "ul" | "ol",
        listStyleType: tag === "ul" ? "disc" : "decimal",
        ...(className ? { className } : {}),
        ...(style ? { style } : {}),
      },
    };
  }

  // ── Text tags ──────────────────────────────────────────────────────────────
  if (TEXT_TAGS.has(tag)) {
    const { className, style } = extractStyling(el);
    // Normalise tag: only allowed tags per component schema
    const allowedTags = [
      "p",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "span",
      "blockquote",
      "pre",
    ];
    const normalizedTag = allowedTags.includes(tag) ? tag : "p";
    return {
      type: "Text",
      props: {
        text: el.innerHTML?.trim() || el.textContent?.trim() || "",
        tag: normalizedTag,
        ...(className ? { className } : {}),
        ...(style ? { style } : {}),
      },
    };
  }

  // ── <details>/<summary> → Accordion ──────────────────────────────────────
  if (tag === "details") {
    const summary = el.querySelector("summary");
    const title = summary?.textContent?.trim() || "Accordion Item";
    // Remove summary from content
    const content =
      el.textContent?.replace(summary?.textContent || "", "").trim() || "";
    const { className, style } = extractStyling(el);
    return {
      type: "Accordion",
      props: {
        items: [{ id: "acc-1", title, content }],
        collapsible: true,
        ...(className ? { className } : {}),
        ...(style ? { style } : {}),
      },
    };
  }

  // ── <form> ─────────────────────────────────────────────────────────────────
  if (tag === "form") {
    const { className, style } = extractStyling(el);
    const fields: any[] = [];

    el.querySelectorAll("input, textarea, select").forEach(
      (input: ParsedHTMLElement) => {
        const inputTag = input.tagName.toLowerCase();
        const type =
          input.getAttribute("type") ||
          (inputTag === "textarea"
            ? "textarea"
            : inputTag === "select"
              ? "select"
              : "text");
        const name =
          input.getAttribute("name") || input.getAttribute("id") || "field";
        const label =
          el
            .querySelector(`label[for="${input.getAttribute("id")}"]`)
            ?.textContent?.trim() ||
          input.getAttribute("placeholder") ||
          name;

        const field: any = {
          type,
          name,
          label,
          placeholder: input.getAttribute("placeholder") || undefined,
          required: input.getAttribute("required") !== null,
        };

        // Select options
        if (inputTag === "select") {
          field.options = input
            .querySelectorAll("option")
            .map((o: ParsedHTMLElement) => o.textContent?.trim() || "")
            .filter(Boolean);
        }

        fields.push(field);
      },
    );

    return {
      type: "Form",
      props: {
        actionUrl: el.getAttribute("action") || undefined,
        method:
          (el.getAttribute("method")?.toUpperCase() as "POST" | "GET") ||
          "POST",
        fields,
        ...(className ? { className } : {}),
        ...(style ? { style } : {}),
      },
    };
  }

  // ── Container tags ─────────────────────────────────────────────────────────
  if (CONTAINER_TAGS.has(tag)) {
    const { className, style } = extractStyling(el);
    const children: ComponentNode[] = [];

    for (const child of el.childNodes) {
      const converted = convertNode(child);
      if (converted) children.push(converted);
    }

    // Wrap decorative background/visual elements in plain HTML tags instead of Craft Containers
    if (isDecorativeElement(className)) {
      return {
        type: tag,
        props: {
          ...(children.length > 0 ? { children } : {}),
          ...(className ? { className } : {}),
          ...(style ? { style } : {}),
        },
      };
    }

    // Merge redundant wrappers (1 child, no styling, basic div)
    if (children.length === 1 && !className && !style && tag === "div") {
      return children[0];
    }

    return {
      type: "Container",
      props: {
        ...(tag !== "div" ? { tag } : {}),
        ...(children.length > 0 ? { children } : {}),
        ...(className ? { className } : {}),
        ...(style ? { style } : {}),
      },
    };
  }

  // ── Fallback: treat as Container if it has children ───────────────────────
  const children: ComponentNode[] = [];
  for (const child of el.childNodes) {
    const converted = convertNode(child);
    if (converted) children.push(converted);
  }

  if (children.length > 0) {
    const { className, style } = extractStyling(el);

    if (isDecorativeElement(className)) {
      return {
        type: tag || "div",
        props: {
          children,
          ...(className ? { className } : {}),
          ...(style ? { style } : {}),
        },
      };
    }

    if (children.length === 1 && !className && !style) {
      return children[0];
    }

    return {
      type: "Container",
      props: {
        children,
        ...(className ? { className } : {}),
        ...(style ? { style } : {}),
      },
    };
  }

  return null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Convert an HTML string (one section / snippet) into a CraftJS-compatible
 * section JSON object:
 *
 * ```json
 * {
 *   "id": "...",
 *   "components": [ ... ]
 * }
 * ```
 */
export function htmlToSectionJson(
  html: string,
  sectionId: string,
): { id: string; components: ComponentNode[] } {
  // Wrap in a root element to make parsing deterministic
  const root = parse(`<div id="__root__">${html}</div>`);
  const wrapper = root.querySelector("#__root__");

  if (!wrapper) {
    return { id: sectionId, components: [] };
  }

  const components: ComponentNode[] = [];

  for (const child of wrapper.childNodes) {
    const converted = convertNode(child);
    if (converted) components.push(converted);
  }

  // If everything collapsed into a single Container, unwrap it so we don't
  // double-wrap the section
  if (
    components.length === 1 &&
    components[0].type === "Container" &&
    Array.isArray(components[0].props.children) &&
    components[0].props.children.length > 0 &&
    !components[0].props.className &&
    !components[0].props.style
  ) {
    return { id: sectionId, components: components[0].props.children };
  }

  return { id: sectionId, components };
}

/**
 * Extract raw HTML from an LLM response that may wrap output in markdown
 * fenced code blocks (```html ... ```) or return it bare.
 */
export function extractHtml(text: string): string {
  // Try to extract from ```html ... ``` block
  const fencedMatch = text.match(/```(?:html)?\s*\n?([\s\S]*?)```/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  // Return the text as-is (stripped of leading/trailing whitespace)
  return text.trim();
}
