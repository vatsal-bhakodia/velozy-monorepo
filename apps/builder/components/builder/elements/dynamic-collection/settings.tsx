"use client";

import { useEffect, useState } from "react";
import { useNode } from "@craftjs/core";
import { BookOpen, Database, Layers3, Package, Sparkles } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DynamicCollectionProps } from "@/components/dynamic-collection";

const sources = [
  {
    value: "products",
    label: "Products",
    description: "Show items from your product catalog",
    icon: Package,
  },
  {
    value: "productCategories",
    label: "Categories",
    description: "Organize and browse your product groups",
    icon: Layers3,
  },
  {
    value: "blogs",
    label: "Blog posts",
    description: "Pull in your latest published stories",
    icon: BookOpen,
  },
  {
    value: "custom",
    label: "Content collections",
    description: "Show records from a custom content group",
    icon: Database,
  },
] as const;

const fieldLabel =
  "mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground";

export const DynamicCollectionSettings = () => {
  const [collections, setCollections] = useState<Array<{ id: string; name: string }>>([]);
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({
    props: node.data.props as DynamicCollectionProps,
  }));

  // The collection belongs to the project currently open in the builder.
  // Keep this plumbing out of the editor UI, but backfill it for new elements.
  useEffect(() => {
    if (props.projectId || typeof window === "undefined") return;
    const projectId = sessionStorage.getItem("projectId");
    if (projectId) {
      setProp((draft: DynamicCollectionProps) => {
        draft.projectId = projectId;
      });
    }
  }, [props.projectId, setProp]);

  useEffect(() => {
    if (!props.projectId) return;
    let cancelled = false;
    void fetch(`/api/admin/content-collections?projectId=${encodeURIComponent(props.projectId)}`)
      .then(async (response) => response.ok ? response.json() : { collections: [] })
      .then((data) => { if (!cancelled) setCollections(Array.isArray(data.collections) ? data.collections : []); })
      .catch(() => { if (!cancelled) setCollections([]); });
    return () => { cancelled = true; };
  }, [props.projectId]);

  const update = <K extends keyof DynamicCollectionProps>(
    key: K,
    value: DynamicCollectionProps[K],
  ) =>
    setProp((draft: DynamicCollectionProps) => {
      draft[key] = value;
    });

  return (
    <div className="space-y-5 pb-1">
      <div className="rounded-2xl border border-cyan-200/70 bg-cyan-50/70 p-4 dark:border-cyan-900/70 dark:bg-cyan-950/30">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-white shadow-sm shadow-cyan-500/20">
            <Database className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Live content section
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Choose the content to display. Updates to your catalog or blog
              will appear here automatically.
            </p>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <div>
          <p className={fieldLabel}>Content source</p>
          <p className="text-xs text-muted-foreground">
            What should this section show?
          </p>
        </div>
        <div className="grid gap-2">
          {sources.map(({ value, label, description, icon: Icon }) => {
            const selected = props.source === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => update("source", value)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                  selected
                    ? "border-cyan-500 bg-cyan-50 shadow-sm shadow-cyan-500/10 dark:border-cyan-500 dark:bg-cyan-950/40"
                    : "border-border bg-card hover:border-cyan-300 hover:bg-muted/60 dark:hover:border-cyan-800"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-cyan-500 text-white" : "bg-muted text-muted-foreground"}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">
                    {label}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                    {description}
                  </span>
                </span>
                <span
                  className={`h-2 w-2 rounded-full ${selected ? "bg-cyan-500" : "bg-border"}`}
                />
              </button>
            );
          })}
        </div>
        {props.source === "custom" ? <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3"><p className="text-xs font-medium text-foreground">Collection group</p><Select value={props.collectionId || ""} onValueChange={(value) => update("collectionId" as keyof DynamicCollectionProps, value)}><SelectTrigger><SelectValue placeholder="Choose a collection" /></SelectTrigger><SelectContent>{collections.map((collection) => <SelectItem key={collection.id} value={collection.id}>{collection.name}</SelectItem>)}</SelectContent></Select>{!collections.length && <p className="text-xs text-muted-foreground">No custom collections found for this site.</p>}</div> : null}
      </section>

      <section className="space-y-3 border-t border-border pt-5">
        <div>
          <p className={fieldLabel}>Section content</p>
          <p className="text-xs text-muted-foreground">
            Give visitors a little context before the cards.
          </p>
        </div>
        <div className="space-y-3">
          <div>
            <label className={fieldLabel} htmlFor="collection-heading">
              Heading
            </label>
            <Input
              id="collection-heading"
              value={props.heading || ""}
              onChange={(event) => update("heading", event.target.value)}
              placeholder="e.g. New arrivals"
            />
          </div>
          <div>
            <label className={fieldLabel} htmlFor="collection-description">
              Description{" "}
              <span className="font-normal normal-case tracking-normal">
                (optional)
              </span>
            </label>
            <Textarea
              id="collection-description"
              value={props.description || ""}
              onChange={(event) => update("description", event.target.value)}
              placeholder="A short introduction to this collection"
              rows={3}
            />
          </div>
          <div>
            <label className={fieldLabel} htmlFor="collection-empty-state">
              When there&apos;s no content
            </label>
            <Input
              id="collection-empty-state"
              value={props.emptyStateText || ""}
              onChange={(event) => update("emptyStateText", event.target.value)}
              placeholder="No content available right now"
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Shown when this collection has no published records.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3 border-t border-border pt-5">
        <div>
          <p className={fieldLabel}>Display options</p>
          <p className="text-xs text-muted-foreground">
            Control what visitors see at a glance.
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 p-3">
          <div>
            <p className="text-sm font-medium text-foreground">Items to show</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Choose between 1 and 12 cards
            </p>
          </div>
          <Input
            aria-label="Items to show"
            type="number"
            min={1}
            max={12}
            value={props.limit || 6}
            onChange={(event) => {
              const parsed = Number(event.target.value);
              update(
                "limit",
                Number.isFinite(parsed) ? Math.max(1, Math.min(12, parsed)) : 6,
              );
            }}
            className="h-9 w-16 text-center"
          />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 p-3">
          <div>
            <p className="text-sm font-medium text-foreground">Cards per row</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              On smaller screens, the grid adapts automatically
            </p>
          </div>
          <div
            className="flex shrink-0 rounded-lg border border-border bg-background p-0.5"
            role="group"
            aria-label="Cards per row"
          >
            {[1, 2, 3, 4].map((value) => {
              const selected = (props.columns || 3) === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    update(
                      "columns",
                      value as DynamicCollectionProps["columns"],
                    )
                  }
                  className={`h-8 w-8 rounded-md text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${selected ? "bg-cyan-500 text-white shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 p-3 transition-colors hover:bg-muted/60">
          <Checkbox
            checked={props.featuredOnly || false}
            onCheckedChange={(checked) =>
              update("featuredOnly", checked === true)
            }
            className="mt-0.5"
          />
          <span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-cyan-500" /> Featured
              content only
            </span>
            <span className="mt-1 block text-[11px] leading-4 text-muted-foreground">
              Only use items marked as featured when your content supports it.
            </span>
          </span>
        </label>
      </section>
    </div>
  );
};
