"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { useEditor } from "@craftjs/core";
import {
  Bot,
  FileText,
  Loader2,
  Mic,
  Paperclip,
  Send,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import NextImage from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Theme } from "@/components/common/theme-manager/types";
import { sectionToReactElements } from "@/lib/sectionToReactElements";
import { normalizeGeneratedFormFields } from "@/src/legacy-lib/form-utils";
import { BuilderElements } from "@/components/builder/elements";
import { AiLoadingSection } from "@/components/builder/elements/ai-loading-section";
import { refreshTailwind } from "@/components/builder/canvas";
import {
  DYNAMIC_COLLECTION_REFRESH_EVENT,
  DynamicCollectionSource,
} from "@/components/dynamic-collection";

type ChatAttachment = {
  name: string;
  kind: "image" | "file";
  previewUrl?: string;
};
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  attachments?: ChatAttachment[];
};

interface AiPanelProps {
  currentTheme?: Theme;
  onThemeChange: (theme: Theme) => void;
  projectId: string | null;
}

const ACCEPTED = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
];
const ADD_INTENT =
  /\b(add|create|insert|build|generate|place|new)\b[\s\S]{0,50}\b(section|element|block|component|banner|hero|footer|header|form|gallery|testimonial|pricing|faq)\b|\b(section|element|block|component|banner|hero|footer|header|form|gallery|testimonial|pricing|faq)\b[\s\S]{0,30}\b(add|create|insert|build|generate|place)\b/i;
const UPDATE_INTENT =
  /\b(update|change|edit|modify|adjust|replace|redesign|restyle|rewrite|make|set|remove|fix|turn|increase|decrease|align|hide|show)\b/i;
const RECORD_CREATE_INTENT =
  /\b(add|create|save|insert|register|publish)\b[\s\S]{0,60}\b(product|record|blog post|post|catalog item|inventory item|category)\b|\b(product|record|blog post|post|catalog item|inventory item|category)\b[\s\S]{0,35}\b(add|create|save|insert|register|publish)\b/i;
const VISUAL_ADD_TARGET =
  /\b(section|element|block|component|page|hero|banner|gallery|layout)\b/i;

type PendingCanvasState = {
  placeholderId?: string;
  parentId?: string;
  index?: number;
  overlay?: HTMLElement;
  replacementTree?: any;
  replacementCommitted?: boolean;
  replacementImageUrls?: string[];
};

function ImageAttachmentPreview({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800">
      {previewUrl && (
        <NextImage
          src={previewUrl}
          alt={`Preview of ${file.name}`}
          fill
          unoptimized
          className="object-cover"
        />
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${file.name}`}
        className="absolute right-1 top-1 z-10 grid h-5 w-5 place-items-center rounded-full bg-neutral-950/75 text-white opacity-0 backdrop-blur transition-opacity hover:bg-red-500 group-hover:opacity-100 focus:opacity-100"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function compactProps(props: Record<string, unknown>, detailed: boolean) {
  const blocked = new Set([
    "children",
    "projectId",
    "apiBaseUrl",
    "itemTemplateHtml",
  ]);
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props || {})) {
    if (blocked.has(key) || key.startsWith("on")) continue;
    if (
      detailed ||
      [
        "text",
        "src",
        "alt",
        "className",
        "href",
        "style",
        "source",
        "name",
      ].includes(key)
    ) {
      result[key] =
        typeof value === "string" && value.length > 700
          ? `${value.slice(0, 700)}…`
          : value;
    }
  }
  return result;
}

export function AiPanel({
  currentTheme,
  onThemeChange,
  projectId,
}: AiPanelProps) {
  const { actions, query } = useEditor(() => ({}));
  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const chatPreviewUrlsRef = useRef(new Set<string>());
  const pendingRecordMediaRef = useRef<any[]>([]);

  const linkForms = async (section: any, sectionName = "AI generated") => {
    const visit = async (node: any): Promise<void> => {
      if (node?.type === "Form" && Array.isArray(node.props?.fields) && !node.props.formId && projectId) {
        const fields = normalizeGeneratedFormFields(node.props.fields);
        const purpose = /quote|request pricing/i.test(sectionName) ? "quote" : "general";
        const response = await fetch("/api/admin/forms/resolve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, name: `${sectionName} form`, purpose, fields }) });
        const data = await response.json();
        if (!response.ok || !data.form?.id) throw new Error(data.error || "Could not save the generated form");
        node.props.formId = data.form.id;
        node.props.formName = data.form.name;
        node.props.formPurpose = data.form.purpose || purpose;
        node.props.fields = data.form.fields.map((field: any) => ({ type: field.fieldType, name: field.key, label: field.label, required: field.required, options: field.options || [], placeholder: field.placeholder || "", colSpan: field.layout || "col-span-full" }));
      }
      if (Array.isArray(node?.props?.children)) await Promise.all(node.props.children.map(visit));
    };
    await Promise.all((section.components || []).map(visit));
    return section;
  };

  useEffect(() => {
    const conversation = conversationRef.current;
    if (!conversation) return;
    conversation.scrollTo({
      top: conversation.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);
  useEffect(() => () => recognitionRef.current?.stop(), []);
  useEffect(
    () => () => {
      chatPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      chatPreviewUrlsRef.current.clear();
    },
    [],
  );

  const scrollToNode = (nodeId: string) => {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        try {
          query
            .node(nodeId)
            .get()
            .dom?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        } catch {
          /* node may have been replaced */
        }
      }),
    );
  };

  const revealNode = (nodeId: string, attempt = 0) => {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        let target: HTMLElement | null = null;
        try {
          target = query.node(nodeId).get().dom as HTMLElement | null;
        } catch {
          /* node may still be mounting */
        }
        if (!target) {
          if (attempt < 3)
            setTimeout(() => revealNode(nodeId, attempt + 1), 80);
          return;
        }
        target.scrollIntoView({ behavior: "smooth", block: "nearest" });
        const doc = target.ownerDocument;
        const reducedMotion = doc.defaultView?.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        if (reducedMotion || typeof target.animate !== "function") return;

        target.animate(
          [
            {
              opacity: 0,
              transform: "translateY(34px) scale(.985)",
              filter: "blur(5px)",
              clipPath: "inset(0 0 18% 0 round 16px)",
            },
            {
              opacity: 1,
              offset: 0.62,
              transform: "translateY(0) scale(1)",
              filter: "blur(0)",
              clipPath: "inset(0 0 0 0 round 0)",
            },
            {
              opacity: 1,
              transform: "translateY(0) scale(1)",
              filter: "brightness(1)",
            },
          ],
          { duration: 920, easing: "cubic-bezier(.22,1,.36,1)" },
        );

        const glow = doc.createElement("div");
        const sweep = doc.createElement("i");
        const position = () => {
          if (!target) return;
          const rect = target.getBoundingClientRect();
          Object.assign(glow.style, {
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
          });
        };
        Object.assign(glow.style, {
          position: "fixed",
          zIndex: "99998",
          overflow: "hidden",
          pointerEvents: "none",
          opacity: "0",
          background:
            "radial-gradient(circle at 70% 35%,rgba(103,232,249,.72),transparent 38%),linear-gradient(115deg,transparent 20%,rgba(125,211,252,.52) 48%,transparent 74%)",
          mixBlendMode: "screen",
        });
        Object.assign(sweep.style, {
          position: "absolute",
          inset: "-50% auto -50% 0",
          width: "32%",
          transform: "translateX(-140%) rotate(12deg)",
          background:
            "linear-gradient(90deg,transparent,rgba(255,255,255,.3),transparent)",
          filter: "blur(18px)",
        });
        glow.appendChild(sweep);
        doc.body.appendChild(glow);
        position();
        doc.defaultView?.addEventListener("scroll", position, true);
        doc.defaultView?.addEventListener("resize", position);
        glow.animate(
          [{ opacity: 0 }, { opacity: 0.72, offset: 0.38 }, { opacity: 0 }],
          { duration: 1250, easing: "ease-out" },
        );
        const sweepAnimation = sweep.animate(
          [
            { transform: "translateX(-140%) rotate(12deg)" },
            { transform: "translateX(380%) rotate(12deg)" },
          ],
          { duration: 1050, delay: 120, easing: "cubic-bezier(.22,1,.36,1)" },
        );
        const cleanupGlow = () => {
          doc.defaultView?.removeEventListener("scroll", position, true);
          doc.defaultView?.removeEventListener("resize", position);
          glow.remove();
        };
        sweepAnimation.onfinish = cleanupGlow;
        window.setTimeout(cleanupGlow, 1500);
      }),
    );
  };

  const showUpdateOverlay = (nodeId: string) => {
    try {
      const target = query.node(nodeId).get().dom as HTMLElement | null;
      if (!target) return undefined;
      target.scrollIntoView({ behavior: "smooth", block: "nearest" });
      const doc = target.ownerDocument;
      if (!doc.getElementById("ai-canvas-loading-style")) {
        const style = doc.createElement("style");
        style.id = "ai-canvas-loading-style";
        style.textContent =
          "@keyframes aiCanvasSpin{to{transform:rotate(360deg)}}@keyframes aiCanvasGlow{50%{opacity:.7}}";
        doc.head.appendChild(style);
      }
      const overlay = doc.createElement("div");
      overlay.dataset.aiUpdateOverlay = "true";
      overlay.setAttribute("aria-label", "AI is updating this element");
      overlay.setAttribute("aria-busy", "true");
      const position = () => {
        const rect = target.getBoundingClientRect();
        Object.assign(overlay.style, {
          top: `${rect.top}px`,
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          height: `${Math.max(rect.height, 56)}px`,
        });
      };
      Object.assign(overlay.style, {
        position: "fixed",
        zIndex: "99999",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        border: "2px solid rgba(6,182,212,.75)",
        borderRadius: "8px",
        background: "rgba(10,15,25,.58)",
        backdropFilter: "blur(3px)",
        boxSizing: "border-box",
      });
      const badge = doc.createElement("div");
      Object.assign(badge.style, {
        display: "flex",
        alignItems: "center",
        gap: "9px",
        padding: "9px 13px",
        borderRadius: "999px",
        background: "rgba(17,24,39,.92)",
        color: "white",
        font: "600 12px sans-serif",
        boxShadow: "0 8px 24px rgba(0,0,0,.25)",
      });
      const spinner = doc.createElement("span");
      Object.assign(spinner.style, {
        width: "14px",
        height: "14px",
        border: "2px solid rgba(255,255,255,.3)",
        borderTopColor: "#22d3ee",
        borderRadius: "50%",
        animation: "aiCanvasSpin .8s linear infinite",
      });
      badge.append(spinner, doc.createTextNode("Updating with AI…"));
      overlay.appendChild(badge);
      doc.body.appendChild(overlay);
      position();
      doc.defaultView?.addEventListener("resize", position);
      doc.defaultView?.addEventListener("scroll", position, true);
      (overlay as HTMLElement & { __aiCleanup?: () => void }).__aiCleanup =
        () => {
          doc.defaultView?.removeEventListener("resize", position);
          doc.defaultView?.removeEventListener("scroll", position, true);
        };
      return overlay;
    } catch {
      return undefined;
    }
  };

  const beginCanvasWork = (
    text: string,
    placement?: { index: number; replaceNodeId?: string; imageUrls?: string[] },
  ): PendingCanvasState => {
    const selectedId = query.getEvent("selected").first();
    if (ADD_INTENT.test(text)) {
      const parentId = "ROOT";
      let index = placement?.index;
      let replacementTree: any;
      try {
        const sectionCount = (query.node("ROOT").get().data.nodes || []).length;
        index = Math.max(0, Math.min(sectionCount, index ?? sectionCount));
        if (placement?.replaceNodeId) {
          replacementTree = query.node(placement.replaceNodeId).toNodeTree();
          actions.history.ignore().delete(placement.replaceNodeId);
        }
      } catch {
        index = placement?.index ?? 0;
        replacementTree = undefined;
      }
      const tree = query.parseReactElement(<AiLoadingSection />).toNodeTree();
      actions.history.ignore().addNodeTree(tree, parentId, index);
      scrollToNode(tree.rootNodeId);
      return {
        placeholderId: tree.rootNodeId,
        parentId,
        index,
        replacementTree,
        replacementImageUrls: placement?.imageUrls,
      };
    }
    if (selectedId && UPDATE_INTENT.test(text))
      return { overlay: showUpdateOverlay(selectedId) };
    return {};
  };

  const clearCanvasWork = (pending: PendingCanvasState) => {
    (
      pending.overlay as
        | (HTMLElement & { __aiCleanup?: () => void })
        | undefined
    )?.__aiCleanup?.();
    pending.overlay?.remove();
    if (pending.placeholderId) {
      try {
        query.node(pending.placeholderId).get();
        actions.history.ignore().delete(pending.placeholderId);
      } catch {
        /* already replaced */
      }
    }
    if (pending.replacementTree && !pending.replacementCommitted) {
      try {
        actions.history
          .ignore()
          .addNodeTree(
            pending.replacementTree,
            pending.parentId || "ROOT",
            pending.index,
          );
      } catch {
        /* restoration best effort */
      }
    }
  };

  const buildContext = () => {
    const nodes = query.getSerializedNodes() as Record<string, any>;
    const selectedId = query.getEvent("selected").first();
    const topLevelIds: string[] = nodes.ROOT?.nodes || [];
    const firstText = (nodeId: string): string => {
      const node = nodes[nodeId];
      if (!node) return "";
      const direct =
        typeof node.props?.text === "string" ? node.props.text.trim() : "";
      if (direct) return direct.replace(/\s+/g, " ").slice(0, 90);
      for (const childId of node.nodes || []) {
        const text = firstText(childId);
        if (text) return text;
      }
      return "";
    };
    const sections = topLevelIds.map((id, index) => {
      const node = nodes[id] || {};
      const type =
        typeof node.type === "string"
          ? node.type
          : node.displayName || "Section";
      const tag = typeof node.props?.tag === "string" ? node.props.tag : "";
      const summary = firstText(id);
      const imageUrls = [
        id,
        ...(node.nodes || []),
        ...query.node(id).descendants(true),
      ]
        .map((nodeId) => nodes[nodeId]?.props?.src)
        .filter(
          (src): src is string =>
            typeof src === "string" && /^https?:\/\//.test(src),
        );
      const name =
        type === "Navbar"
          ? "Navigation"
          : tag === "footer"
            ? "Footer"
            : summary || `${type} ${index + 1}`;
      return {
        index,
        nodeId: id,
        name,
        type,
        tag,
        summary,
        imageUrls: Array.from(new Set(imageUrls)),
      };
    });
    return {
      selectedNodeId: selectedId || null,
      theme: currentTheme,
      sections,
      nodes: Object.entries(nodes).map(([id, node]) => ({
        id,
        type:
          typeof node.type === "string"
            ? node.type
            : node.displayName || "Component",
        parent: node.parent || null,
        childIds: node.nodes || [],
        props: compactProps(node.props || {}, id === selectedId),
      })),
    };
  };

  const resolveSectionPlacement = async (
    text: string,
    context: ReturnType<typeof buildContext>,
  ) => {
    const fallbackIndex = context.sections.length;
    try {
      const placementForm = new FormData();
      placementForm.append("mode", "placement");
      placementForm.append("prompt", text);
      placementForm.append(
        "context",
        JSON.stringify({
          selectedNodeId: context.selectedNodeId,
          sections: context.sections,
        }),
      );
      const response = await fetch("/api/generate/builder-assistant", {
        method: "POST",
        body: placementForm,
      });
      const data = await response.json();
      if (!response.ok || !Number.isFinite(Number(data.index)))
        return { index: fallbackIndex };
      const index = Math.max(
        0,
        Math.min(context.sections.length, Math.round(Number(data.index))),
      );
      const replacement = context.sections.find(
        (section) => section.nodeId === data.replaceNodeId,
      );
      return {
        index,
        replaceNodeId: replacement?.nodeId,
        imageUrls: replacement?.imageUrls,
      };
    } catch {
      return { index: fallbackIndex };
    }
  };

  const uploadRecordMedia = async (recordFiles: File[]) => {
    if (!recordFiles.length) return [];
    if (!projectId)
      throw new Error(
        "A project is required before media can be added to a record.",
      );
    const uploaded: any[] = [];
    for (const file of recordFiles) {
      const body = new FormData();
      body.append("projectId", projectId);
      body.append("file", file);
      const response = await fetch("/api/admin/media", {
        method: "POST",
        body,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error || `Could not store ${file.name} in the media gallery.`,
        );
      if (data.media) uploaded.push(data.media);
    }
    return uploaded;
  };

  const getMatchingCollectionIds = (source: DynamicCollectionSource) => {
    const nodes = query.getSerializedNodes() as Record<string, any>;
    return Object.entries(nodes)
      .filter(([id, node]) => {
        if (node.props?.source !== source) return false;
        if (node.props?.projectId && node.props.projectId !== projectId)
          return false;
        try {
          return query.node(id).get().data.displayName === "DynamicCollection";
        } catch {
          return false;
        }
      })
      .map(([id]) => id);
  };

  const refreshMatchingCollections = (source: DynamicCollectionSource) => {
    const matchingIds = getMatchingCollectionIds(source);
    if (!matchingIds.length) return;
    window.dispatchEvent(
      new CustomEvent(DYNAMIC_COLLECTION_REFRESH_EVENT, {
        detail: { source, projectId },
      }),
    );
    if (matchingIds[0]) setTimeout(() => scrollToNode(matchingIds[0]), 120);
  };

  const applyOperations = async (
    operations: any[],
    pending: PendingCanvasState,
    uploadedMedia: any[] = [],
  ) => {
    for (const operation of operations) {
      if (
        operation.type === "update_node" &&
        operation.nodeId &&
        operation.props
      ) {
        try {
          query.node(operation.nodeId).get();
          actions.setProp(
            operation.nodeId,
            (props: Record<string, unknown>) => {
              for (const [key, value] of Object.entries(operation.props)) {
                if (
                  key !== "children" &&
                  !key.startsWith("on") &&
                  !["projectId", "apiBaseUrl", "itemTemplateHtml"].includes(key)
                )
                  props[key] = value;
              }
            },
          );
          scrollToNode(operation.nodeId);
          revealNode(operation.nodeId);
        } catch {
          /* stale or invented node id: safely skip */
        }
      }
      if (
        operation.type === "delete_node" &&
        operation.nodeId &&
        operation.nodeId !== "ROOT"
      ) {
        try {
          query.node(operation.nodeId).get();
          actions.delete(operation.nodeId);
        } catch {
          /* skip */
        }
      }
      if (operation.type === "add_section" && operation.section?.components) {
        operation.section = await linkForms(operation.section, String(operation.name || "AI generated"));
        if (pending.placeholderId) {
          try {
            actions.history.ignore().delete(pending.placeholderId);
          } catch {
            /* already removed */
          }
          pending.placeholderId = undefined;
        }
        const rootCount =
          (query.node("ROOT").get().data.nodes || []).length -
          (pending.placeholderId ? 1 : 0);
        let insertionIndex =
          pending.index ??
          (Number.isFinite(Number(operation.index))
            ? Math.max(
                0,
                Math.min(rootCount, Math.round(Number(operation.index))),
              )
            : rootCount);
        for (const element of sectionToReactElements(
          operation.section,
          BuilderElements,
        )) {
          const tree = query.parseReactElement(element).toNodeTree();
          actions.addNodeTree(tree, pending.parentId || "ROOT", insertionIndex);
          scrollToNode(tree.rootNodeId);
          revealNode(tree.rootNodeId);
          if (insertionIndex !== undefined) insertionIndex += 1;
        }
        pending.index = insertionIndex;
        pending.replacementCommitted = true;
      }
      if (operation.type === "set_theme" && operation.theme?.colors) {
        const theme: Theme = {
          ...operation.theme,
          id: `ai-${Date.now()}`,
          isCustom: true,
        };
        onThemeChange(theme);
      }
      if (
        operation.type === "create_product" &&
        projectId &&
        operation.product?.name
      ) {
        const uploadedImageUrls = uploadedMedia
          .filter(
            (item) =>
              item.mediaType === "image" && typeof item.url === "string",
          )
          .map((item) => item.url);
        const modelImageUrls = Array.isArray(operation.product.images)
          ? operation.product.images.filter(
              (url: unknown): url is string => typeof url === "string",
            )
          : [];
        const matchingProductCollections = getMatchingCollectionIds("products");
        const isShownByPageCollection = matchingProductCollections.length > 0;
        const isShownByFeaturedCollection = matchingProductCollections.some(
          (id) =>
            (query.getSerializedNodes() as Record<string, any>)[id]?.props
              ?.featuredOnly === true,
        );
        const response = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            ...operation.product,
            status: isShownByPageCollection
              ? "published"
              : operation.product.status,
            isActive: isShownByPageCollection
              ? true
              : operation.product.isActive,
            isFeatured: isShownByFeaturedCollection
              ? true
              : operation.product.isFeatured,
            images: Array.from(
              new Set([...uploadedImageUrls, ...modelImageUrls]),
            ),
          }),
        });
        if (!response.ok)
          throw new Error(
            (await response.json()).error || "Could not create the product",
          );
        pendingRecordMediaRef.current = [];
        refreshMatchingCollections("products");
      }
    }
    refreshTailwind();
  };

  const submit = async () => {
    const text = prompt.trim();
    if (!text || isLoading) return;
    setError("");
    setIsLoading(true);
    const outgoingFiles = [...files];
    const attachments = outgoingFiles.map<ChatAttachment>((file) => {
      if (!file.type.startsWith("image/"))
        return { name: file.name, kind: "file" };
      const previewUrl = URL.createObjectURL(file);
      chatPreviewUrlsRef.current.add(previewUrl);
      return { name: file.name, kind: "image", previewUrl };
    });
    setMessages((current) => [
      ...current,
      { role: "user", content: text, attachments },
    ]);
    setPrompt("");
    setFiles([]);
    const requestContext = buildContext();
    let uploadedMedia: any[] = [...pendingRecordMediaRef.current];
    try {
      if (
        RECORD_CREATE_INTENT.test(text) &&
        !VISUAL_ADD_TARGET.test(text) &&
        outgoingFiles.length
      ) {
        const newlyUploaded = await uploadRecordMedia(outgoingFiles);
        uploadedMedia = [...uploadedMedia, ...newlyUploaded].filter(
          (item, index, items) =>
            items.findIndex(
              (candidate) =>
                candidate.id === item.id || candidate.url === item.url,
            ) === index,
        );
        pendingRecordMediaRef.current = uploadedMedia;
      }
      if (uploadedMedia.length)
        (requestContext as any).uploadedMedia = uploadedMedia.map(
          ({ id, name, fileName, url, mimeType, mediaType }: any) => ({
            id,
            name,
            fileName,
            url,
            mimeType,
            mediaType,
          }),
        );
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "Could not store the attached media.";
      setError(message);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: `I couldn't create that record: ${message}`,
        },
      ]);
      setIsLoading(false);
      return;
    }
    const placement = ADD_INTENT.test(text)
      ? await resolveSectionPlacement(text, requestContext)
      : undefined;
    if (placement?.replaceNodeId)
      (requestContext as any).replacementImageUrls = placement.imageUrls || [];
    const pendingCanvas = beginCanvasWork(text, placement);
    try {
      const form = new FormData();
      form.append("prompt", text);
      form.append("context", JSON.stringify(requestContext));
      form.append(
        "history",
        JSON.stringify(
          messages.slice(-6).map(({ role, content }) => ({ role, content })),
        ),
      );
      outgoingFiles.forEach((file) => form.append("files", file));
      const response = await fetch("/api/generate/builder-assistant", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error || "The assistant could not complete that request.",
        );
      await applyOperations(
        data.operations || [],
        pendingCanvas,
        uploadedMedia,
      );
      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.message },
      ]);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong.";
      setError(message);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: `I couldn't apply that change: ${message}`,
        },
      ]);
    } finally {
      clearCanvasWork(pendingCanvas);
      setIsLoading(false);
    }
  };

  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice input is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join("");
      setPrompt(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      setError("I couldn't hear that. Please try again.");
    };
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const addFiles = (incoming: FileList | null) => {
    const valid = Array.from(incoming || []).filter(
      (file) => ACCEPTED.includes(file.type) && file.size <= 10 * 1024 * 1024,
    );
    setFiles((current) => [...current, ...valid].slice(0, 4));
    if (valid.length !== (incoming?.length || 0))
      setError("Only images and PDFs up to 10 MB are supported.");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white dark:bg-neutral-900">
      <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-500 dark:text-cyan-400" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              AI Assistant
            </p>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Edit the selected element or your whole page
            </p>
          </div>
        </div>
      </div>

      <div
        ref={conversationRef}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-4"
      >
        {messages.length === 0 && (
          <div className="flex items-start gap-2.5">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800">
              <Bot className="h-3.5 w-3.5 text-cyan-500 dark:text-cyan-400" />
            </span>
            <div className="max-w-[82%] rounded-lg rounded-tl-sm border border-neutral-200 bg-neutral-100 px-3 py-2.5 dark:border-neutral-700 dark:bg-neutral-800">
              <p className="text-xs leading-relaxed text-neutral-700 dark:text-neutral-200">
                What would you like to change?
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                Select an element for a focused edit, or ask me to update the
                entire page. You can also attach an image or PDF as a reference.
              </p>
            </div>
          </div>
        )}
        <div className={`${messages.length === 0 ? "mt-4" : ""} space-y-4`}>
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex items-start gap-2.5 ${message.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border ${message.role === "user" ? "border-neutral-300 bg-neutral-200 dark:border-neutral-600 dark:bg-neutral-700" : "border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800"}`}
              >
                {message.role === "user" ? (
                  <UserRound className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-300" />
                ) : (
                  <Bot className="h-3.5 w-3.5 text-cyan-500 dark:text-cyan-400" />
                )}
              </span>
              <div
                className={`max-w-[82%] overflow-hidden rounded-lg border text-xs leading-relaxed ${message.role === "user" ? "rounded-tr-sm border-neutral-600 bg-neutral-700 text-white dark:border-neutral-600 dark:bg-neutral-700" : "rounded-tl-sm border-neutral-200 bg-neutral-100 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"}`}
              >
                {message.attachments && message.attachments.length > 0 && (
                  <div
                    className={`grid gap-1.5 p-1.5 ${message.attachments.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
                  >
                    {message.attachments.map((attachment, attachmentIndex) =>
                      attachment.kind === "image" && attachment.previewUrl ? (
                        <div
                          key={`${attachment.name}-${attachmentIndex}`}
                          className="relative aspect-[4/3] min-w-0 overflow-hidden rounded-md bg-neutral-800"
                        >
                          <NextImage
                            src={attachment.previewUrl}
                            alt={attachment.name}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div
                          key={`${attachment.name}-${attachmentIndex}`}
                          className="flex min-w-0 items-center gap-1.5 rounded-md bg-black/15 px-2 py-2"
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{attachment.name}</span>
                        </div>
                      ),
                    )}
                  </div>
                )}
                <p className="px-3 py-2.5">{message.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-2.5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800">
                <Bot className="h-3.5 w-3.5 text-cyan-500 dark:text-cyan-400" />
              </span>
              <div className="flex items-center gap-2 rounded-lg rounded-tl-sm border border-neutral-200 bg-neutral-100 px-3 py-2.5 text-xs text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-500 dark:text-cyan-400" />{" "}
                Applying your changes…
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
        {files.length > 0 && (
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {files.map((file, index) =>
              file.type.startsWith("image/") ? (
                <ImageAttachmentPreview
                  key={`${file.name}-${file.lastModified}-${index}`}
                  file={file}
                  onRemove={() =>
                    setFiles((current) => current.filter((_, i) => i !== index))
                  }
                />
              ) : (
                <div
                  key={`${file.name}-${file.lastModified}-${index}`}
                  className="flex shrink-0 items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-100 px-2 py-1.5 text-[10px] text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                >
                  <FileText className="h-3 w-3 text-cyan-500 dark:text-cyan-400" />
                  <span className="max-w-[100px] truncate">{file.name}</span>
                  <button
                    type="button"
                    className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
                    onClick={() =>
                      setFiles((current) =>
                        current.filter((_, i) => i !== index),
                      )
                    }
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ),
            )}
          </div>
        )}
        {error && <p className="mb-2 text-[11px] text-destructive">{error}</p>}
        <div className="rounded-lg border border-neutral-200 bg-neutral-100 p-2 dark:border-neutral-700 dark:bg-neutral-800">
          <Textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={onKeyDown}
            disabled={isLoading}
            placeholder="Describe the change you want…"
            className="min-h-[76px] resize-none border-0 bg-neutral-100 dark:bg-neutral-800 p-1 text-sm text-neutral-900 shadow-none outline-none placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 dark:text-white dark:placeholder:text-neutral-400"
          />
          <div className="mt-1 flex items-center justify-between border-t border-neutral-200 pt-2 dark:border-neutral-700">
            <div className="flex items-center gap-1">
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
                multiple
                className="hidden"
                onChange={(event) => {
                  addFiles(event.target.files);
                  event.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md text-neutral-500 hover:bg-neutral-200 hover:text-cyan-500 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-cyan-400"
                onClick={() => inputRef.current?.click()}
                aria-label="Attach image or PDF"
              >
                <Paperclip className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`h-7 w-7 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 ${isListening ? "bg-cyan-500/10 text-cyan-500 dark:text-cyan-400" : "text-neutral-500 hover:text-cyan-500 dark:text-neutral-400 dark:hover:text-cyan-400"}`}
                onClick={toggleVoice}
                aria-label={isListening ? "Stop listening" : "Use voice input"}
              >
                <Mic
                  className={`h-3.5 w-3.5 ${isListening ? "animate-pulse" : ""}`}
                />
              </Button>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-7 w-7 rounded-md bg-neutral-200 text-neutral-700 hover:bg-neutral-300 hover:text-cyan-600 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600 dark:hover:text-cyan-400"
              disabled={!prompt.trim() || isLoading}
              onClick={submit}
              aria-label="Send prompt"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
        <p className="mt-2 text-center text-[10px] text-neutral-500 dark:text-neutral-500">
          Enter to send · Shift + Enter for a new line
        </p>
      </div>
    </div>
  );
}
