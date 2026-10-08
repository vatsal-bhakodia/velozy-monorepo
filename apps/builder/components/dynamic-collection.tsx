"use client";

import React, { useEffect, useMemo, useState } from "react";

export type DynamicCollectionSource =
  | "products"
  | "productCategories"
  | "blogs"
  | "custom";

export const DYNAMIC_COLLECTION_REFRESH_EVENT =
  "builder:dynamic-collection-refresh";

export type DynamicCollectionItem = {
  id: string;
  title: string;
  summary?: string;
  image?: string;
  href?: string;
  badge?: string;
  meta?: string;
  price?: string;
  values?: Record<string, unknown>;
};

export type DynamicCollectionProps = {
  projectId: string;
  source: DynamicCollectionSource;
  collectionId?: string;
  heading?: string;
  description?: string;
  limit?: number;
  columns?: 1 | 2 | 3 | 4;
  featuredOnly?: boolean;
  apiBaseUrl?: string;
  sectionClassName?: string;
  headerClassName?: string;
  headingClassName?: string;
  descriptionClassName?: string;
  itemsContainerClassName?: string;
  emptyStateText?: string;
  itemTemplateHtml?: string;
};

const DEFAULT_SECTION_CLASS =
  "w-full px-6 py-20 md:px-10 lg:px-16 bg-background text-foreground";
const DEFAULT_ITEMS_CLASS = "mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3";
const DEFAULT_HEADING_CLASS =
  "font-heading text-4xl md:text-5xl font-semibold tracking-tight text-foreground";
const DEFAULT_DESCRIPTION_CLASS =
  "mt-4 max-w-2xl text-base md:text-lg text-muted-foreground";

const GRID_COLUMNS_CLASS = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
} as const;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (match) => {
    switch (match) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return match;
    }
  });
}

function interpolateTemplate(
  template: string,
  item: DynamicCollectionItem,
): string {
  return template.replace(/{{\s*([\w]+)\s*}}/g, (_, rawKey) => {
    const key = rawKey as keyof DynamicCollectionItem;
    const value = item[key] ?? item.values?.[key];
    return escapeHtml(value === null || value === undefined ? "" : String(value));
  });
}

function buildRequestUrl(
  baseUrl: string,
  projectId: string,
  source: DynamicCollectionSource,
  collectionId: string | undefined,
  limit: number,
  featuredOnly: boolean,
) {
  const path = source === "custom" && collectionId
    ? `/api/public/projects/${projectId}/collections/${collectionId}`
    : `/api/public/projects/${projectId}/${source}`;
  const url = new URL(path, baseUrl);
  url.searchParams.set("limit", String(limit));

  if (featuredOnly) {
    url.searchParams.set("featured", "true");
  }

  return url.toString();
}

function renderFallbackCard(item: DynamicCollectionItem) {
  return (
    <article
      key={item.id}
      className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
    >
      {item.image ? (
        <img
          src={item.image}
          alt={item.title}
          className="h-56 w-full object-cover"
        />
      ) : null}
      <div className="space-y-3 p-6">
        {item.badge ? (
          <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {item.badge}
          </span>
        ) : null}
        <div>
          {item.href ? (
            <a
              href={item.href}
              className="font-heading text-2xl font-semibold text-foreground"
            >
              {item.title}
            </a>
          ) : (
            <h3 className="font-heading text-2xl font-semibold text-foreground">
              {item.title}
            </h3>
          )}
          {item.summary ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {item.summary}
            </p>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>{item.meta || ""}</span>
          {item.price ? (
            <span className="font-semibold text-foreground">{item.price}</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function DynamicCollection({
  projectId,
  source,
  collectionId,
  heading,
  description,
  limit = 6,
  columns = 3,
  featuredOnly = false,
  apiBaseUrl,
  sectionClassName = DEFAULT_SECTION_CLASS,
  headerClassName = "",
  headingClassName = DEFAULT_HEADING_CLASS,
  descriptionClassName = DEFAULT_DESCRIPTION_CLASS,
  itemsContainerClassName = DEFAULT_ITEMS_CLASS,
  emptyStateText = "No content has been published for this section yet.",
  itemTemplateHtml = "",
}: DynamicCollectionProps) {
  const [items, setItems] = useState<DynamicCollectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    const refresh = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          source?: DynamicCollectionSource;
          projectId?: string;
        }>
      ).detail;
      if (detail?.source !== source) return;
      if (detail.projectId && detail.projectId !== projectId) return;
      setRefreshVersion((version) => version + 1);
    };
    window.addEventListener(DYNAMIC_COLLECTION_REFRESH_EVENT, refresh);
    return () =>
      window.removeEventListener(DYNAMIC_COLLECTION_REFRESH_EVENT, refresh);
  }, [projectId, source]);

  const resolvedBaseUrl = useMemo(() => {
    if (apiBaseUrl) {
      return apiBaseUrl.endsWith("/") ? apiBaseUrl : `${apiBaseUrl}/`;
    }

    if (process.env.NEXT_PUBLIC_CONTENT_API_BASE_URL) {
      const envBase = process.env.NEXT_PUBLIC_CONTENT_API_BASE_URL;
      return envBase.endsWith("/") ? envBase : `${envBase}/`;
    }

    if (typeof window !== "undefined") {
      return `${window.location.origin}/`;
    }

    return "";
  }, [apiBaseUrl]);

  const gridClassName = useMemo(() => {
    // Remove the built-in column choices from older saved nodes before applying
    // the setting, while preserving any custom spacing or layout classes.
    const withoutColumnClasses = itemsContainerClassName.replace(
      /(?:sm|md|lg|xl|2xl):grid-cols-[1-4]|grid-cols-[1-4]/g,
      "",
    );
    return `${withoutColumnClasses} ${GRID_COLUMNS_CLASS[columns]}`.trim();
  }, [columns, itemsContainerClassName]);

  const itemsLayoutClassName =
    isLoading || (!error && items.length > 0) ? gridClassName : "mt-10";

  useEffect(() => {
    let isCancelled = false;

    const fetchItems = async () => {
      if (!projectId || !resolvedBaseUrl) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const url = buildRequestUrl(
          resolvedBaseUrl,
          projectId,
          source,
          collectionId,
          limit,
          featuredOnly,
        );
        const response = await fetch(url, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch ${source}`);
        }

        const data = await response.json();

        if (!isCancelled) {
          setItems(Array.isArray(data.items) ? data.items : []);
        }
      } catch (fetchError) {
        if (!isCancelled) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to load dynamic content",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchItems();

    return () => {
      isCancelled = true;
    };
  }, [collectionId, featuredOnly, limit, projectId, refreshVersion, resolvedBaseUrl, source]);

  return (
    <section className={sectionClassName}>
      {(heading || description) && (
        <div className={headerClassName}>
          {heading ? <h2 className={headingClassName}>{heading}</h2> : null}
          {description ? (
            <p className={descriptionClassName}>{description}</p>
          ) : null}
        </div>
      )}

      <div className={itemsLayoutClassName}>
        {isLoading
          ? Array.from({ length: Math.max(1, Math.min(limit, 6)) }).map(
              (_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="h-72 animate-pulse rounded-3xl border border-border bg-muted/60"
                />
              ),
            )
          : null}

        {!isLoading && error ? (
          <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {!isLoading && !error && items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-muted/30 p-8 text-sm text-muted-foreground">
            {emptyStateText}
          </div>
        ) : null}

        {!isLoading && !error && items.length > 0
          ? items.map((item) => {
              if (!itemTemplateHtml.trim()) {
                return renderFallbackCard(item);
              }

              return (
                <div
                  key={item.id}
                  dangerouslySetInnerHTML={{
                    __html: interpolateTemplate(itemTemplateHtml, item),
                  }}
                />
              );
            })
          : null}
      </div>
    </section>
  );
}

export default DynamicCollection;
