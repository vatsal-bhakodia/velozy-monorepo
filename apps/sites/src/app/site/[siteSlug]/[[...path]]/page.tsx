import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type React from "react";
import { cloneElement, isValidElement } from "react";
import { unstable_cache } from "next/cache";
import { and, eq } from "drizzle-orm";
import { parse } from "node-html-parser";
import { db } from "@/lib/db";
import {
  blogs,
  pages,
  productCategories,
  products,
  projects,
  forms,
  formFields,
  customCollections,
  customCollectionRecords,
} from "@/lib/db/schema";
import { findPublishedSite, normalizeHostname } from "@/lib/site-host";
import { publishedPageCss } from "@/lib/published-css";
import {
  AddToCart,
  CheckoutExperience,
  CheckoutResult,
} from "@/components/checkout-experience";
import { PublicEnquiryForm } from "@/components/public-enquiry-form";
import { GrowthTracker } from "@/components/growth-tracker";
import { meterPublishedPageView } from "@/lib/growth-server";
import {
  DEFAULT_SITE_CHROME,
  DEFAULT_SITE_NAVIGATION,
  SiteFooterView,
  SiteNavbarView,
  isValidSiteChrome,
  resolveSiteNavigation,
  type SiteChromeConfig,
  type SiteNavigation,
} from "@velozy/site-chrome";

const getCachedSite = (hostname: string) =>
  unstable_cache(
    () => findPublishedSite(hostname),
    ["published-site", hostname],
    { tags: ["published-sites"], revalidate: 60 },
  )();

const getCachedPage = (projectId: string, slug: string) =>
  unstable_cache(
    () =>
      db.query.pages.findFirst({
        where: and(
          eq(pages.projectId, projectId),
          eq(pages.slug, slug),
          eq(pages.status, "published"),
        ),
      }),
    ["published-page", projectId, slug],
    { tags: [`site:${projectId}`], revalidate: 60 },
  )();

type PublicNode = {
  id?: string;
  type?: string | { resolvedName?: string };
  props?: Record<string, any>;
  nodes?: string[];
  linkedNodes?: Record<string, string>;
};

function cleanHtml(value: unknown) {
  const root = parse(String(value || ""));
  root.querySelectorAll("script, style, iframe, object, embed, svg, math").forEach((node) => node.remove());
  root.querySelectorAll("*").forEach((node) => {
    for (const [name, content] of Object.entries(node.attributes)) {
      if (name.toLowerCase().startsWith("on") || name.toLowerCase() === "style") {
        node.removeAttribute(name);
      } else if (["href", "src", "xlink:href"].includes(name.toLowerCase()) &&
        /^(?:javascript|data|vbscript):/i.test(content.trim())) {
        node.removeAttribute(name);
      }
    }
  });
  return root.toString();
}

function classes(props: Record<string, any>) {
  return props.className || props.class || undefined;
}

function componentName(node: PublicNode) {
  if (typeof node.type === "string") return node.type;
  return node.type?.resolvedName || "";
}

async function SiteFrame({
  project,
  pageData,
  children,
}: {
  project: any;
  pageData: unknown;
  children: React.ReactNode;
}) {
  const preference = project.designPreference || {};
  const theme = preference.theme;
  const chrome: SiteChromeConfig = isValidSiteChrome(preference.siteChrome)
    ? preference.siteChrome
    : DEFAULT_SITE_CHROME;
  const navigation: SiteNavigation = resolveSiteNavigation(
    preference.navigation || DEFAULT_SITE_NAVIGATION,
  );
  const css = await publishedPageCss(pageData, theme, chrome);
  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <SiteNavbarView navigation={navigation} chrome={chrome} projectLogo={project.logo || ""} />
      <main>{children}</main>
      <SiteFooterView navigation={navigation} chrome={chrome} projectLogo={project.logo || ""} />
    </div>
  );
}

async function collectionItems(
  projectId: string,
  props: Record<string, any>,
): Promise<
  Array<{
    id: string;
    title: string;
    summary: string;
    image: string;
    href: string;
    price?: string;
    meta?: string;
    values?: Record<string, unknown>;
    fields?: Array<{ key: string; label: string; type: string }>;
  }>
> {
  const limit = Math.min(Math.max(Number(props.limit) || 6, 1), 24);
  const source = props.source;

  if (source === "products") {
    const rows = await db.query.products.findMany({
      where: and(
        eq(products.projectId, projectId),
        eq(products.status, "published"),
      ),
      limit,
    });
    return rows.map((item) => ({
      id: item.id,
      title: item.name,
      summary: item.shortDescription || item.description || "",
      price: item.price == null ? "" : String(item.price),
      image: Array.isArray(item.images) ? String(item.images[0] || "") : "",
      href: `/products/${item.slug}`,
    }));
  }

  if (source === "blogs") {
    const rows = await db.query.blogs.findMany({
      where: and(
        eq(blogs.projectId, projectId),
        eq(blogs.status, "published"),
        eq(blogs.isPublished, true),
      ),
      limit,
    });
    return rows.map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.excerpt || "",
      image: item.featuredImage || "",
      href: `/blogs/${item.slug}`,
      meta: item.publishedAt?.toLocaleDateString() || "",
    }));
  }

  if (source === "productCategories") {
    const rows = await db.query.productCategories.findMany({
      where: and(
        eq(productCategories.projectId, projectId),
        eq(productCategories.isActive, true),
      ),
      limit,
    });
    return rows.map((item) => ({
      id: item.id,
      title: item.heading || item.name,
      summary: item.description || "",
      image: item.image || "",
      href: `/categories/${item.slug}`,
    }));
  }

  if (source === "custom" && typeof props.collectionId === "string") {
    const collection = await db.query.customCollections.findFirst({ where: and(
      eq(customCollections.id, props.collectionId),
      eq(customCollections.projectId, projectId),
      eq(customCollections.isArchived, false),
    ) });
    if (!collection) return [];
    const rows = await db.query.customCollectionRecords.findMany({ where: and(
      eq(customCollectionRecords.collectionId, collection.id),
      eq(customCollectionRecords.status, "published"),
    ), limit, orderBy: (table, { asc, desc }) => [asc(table.sortOrder), desc(table.publishedAt), desc(table.createdAt)] });
    const fields = Array.isArray(collection.fields) ? collection.fields : [];
    const titleField = fields.find((field) => ["title", "name", "person", "product"].includes(field.key)) || fields.find((field) => ["text", "textarea"].includes(field.type));
    const summaryField = fields.find((field) => ["summary", "description", "quote", "content", "bio"].includes(field.key) && field.key !== titleField?.key);
    const imageField = fields.find((field) => field.type === "image");
    return rows.map((record) => ({
      id: record.id,
      title: String((titleField && record.values[titleField.key]) || collection.name),
      summary: summaryField ? String(record.values[summaryField.key] || "") : "",
      image: imageField ? String(record.values[imageField.key] || "") : "",
      href: "",
      values: record.values,
      fields,
    }));
  }

  return [];
}

async function renderNode(
  node: PublicNode,
  nodes: Record<string, PublicNode>,
  projectId: string,
  pageId: string,
  nodeId?: string,
  experience: Record<string, unknown> = {},
  headlineUsed = { value: false },
  buttonUsed = { value: false },
): Promise<any> {
  const props = node.props || {};
  const children = node.nodes
    ? node.nodes.map((id) => nodes[id]).filter(Boolean)
    : Array.isArray(props.children)
      ? props.children
      : [];
  const renderedChildren = await Promise.all(
    children.map(async (child, index) => {
      const element = await renderNode(
        child,
        nodes,
        projectId,
        pageId,
        child.id || node.nodes?.[index],
        experience,
        headlineUsed,
        buttonUsed,
      );
      return isValidElement(element)
        ? cloneElement(element, { key: child.id || index })
        : element;
    }),
  );
  const name = componentName(node).toLowerCase();
  const common = { className: classes(props), style: props.style };

  // Shared chrome is rendered once by SiteFrame. Keep old per-page chrome data
  // stored, but do not show it a second time.
  if (name === "navbar" || name === "sitefooter" || name === "footer" || props.tag === "footer") {
    return null;
  }

  if (name === "text") {
    const Tag = props.tag || "p";
    if (
      String(Tag).toLowerCase() === "h1" &&
      typeof experience.headline === "string" &&
      experience.headline.trim() &&
      !headlineUsed.value
    ) {
      headlineUsed.value = true;
      return <Tag {...common}>{experience.headline}</Tag>;
    }
    return (
      <Tag
        {...common}
        dangerouslySetInnerHTML={{ __html: cleanHtml(props.text) }}
      />
    );
  }
  if (name === "image") {
    return props.src ? (
      <img {...common} src={props.src} alt={props.alt || ""} />
    ) : null;
  }
  if (name === "button") {
    const href = props.href || props.link || "#";
    const buttonText =
      typeof experience.buttonText === "string" &&
      experience.buttonText.trim() &&
      !buttonUsed.value
        ? experience.buttonText
        : props.text || "Button";
    if (buttonText === experience.buttonText) buttonUsed.value = true;
    return (
      <a {...common} data-growth-variant-button href={href}>
        {buttonText}
      </a>
    );
  }
  if (name === "iframe") {
    return props.src ? (
      <iframe
        {...common}
        src={props.src}
        title={props.title || "Embedded content"}
      />
    ) : null;
  }
  if (name === "dynamiccollection") {
    const items = await collectionItems(projectId, props);
    return (
      <section className={props.sectionClassName || classes(props)}>
        {props.heading ? (
          <h2 className={props.headingClassName}>{props.heading}</h2>
        ) : null}
        {props.description ? (
          <p className={props.descriptionClassName}>{props.description}</p>
        ) : null}
        <div
          className={
            props.itemsContainerClassName ||
            "grid gap-6 md:grid-cols-2 xl:grid-cols-3"
          }
        >
          {items.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-3xl border border-border bg-white/70 shadow-sm"
            >
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-56 w-full object-cover"
                />
              ) : null}
              <div className="space-y-3 p-6">
                {item.href ? <a href={item.href} className="font-heading text-2xl font-semibold text-foreground">{item.title}</a> : <h3 className="font-heading text-2xl font-semibold text-foreground">{item.title}</h3>}
                {item.summary ? (
                  <p className="text-sm leading-6 text-muted-foreground">
                    {item.summary}
                  </p>
                ) : null}
                {props.source === "custom" && item.values ? (
                  <dl className="space-y-2 text-sm">
                    {(item.fields || []).filter((field) => !["title", "name", "person", "product", "summary", "description", "quote", "content", "bio"].includes(field.key) && field.type !== "image").map((field) => {
                      const value = item.values?.[field.key];
                      if (value === undefined || value === null || value === "") return null;
                      return <div key={field.key}><dt className="text-xs text-muted-foreground">{field.label}</dt><dd className="text-foreground">{typeof value === "boolean" ? value ? "Yes" : "No" : String(value)}</dd></div>;
                    })}
                  </dl>
                ) : null}
                {item.price ? (
                  <span className="font-semibold text-foreground">
                    {item.price}
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (name === "form") {
    let fields = Array.isArray(props.fields)
      ? props.fields.map((field: any) => ({
          key: String(field.name || "field"),
          label: String(field.label || "Field"),
          fieldType: String(field.type || "text"),
          required: Boolean(field.required),
          options: field.options || [],
          placeholder: field.placeholder || null,
          layout: field.colSpan || "col-span-full",
        }))
      : [];
    if (props.formId) {
      if (
        typeof props.formId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          props.formId,
        )
      )
        return (
          <p
            role="status"
            className="rounded-md border border-border p-3 text-sm text-muted-foreground"
          >
            This form is temporarily unavailable.
          </p>
        );
      const savedForm = await db.query.forms.findFirst({
        where: and(
          eq(forms.id, props.formId),
          eq(forms.projectId, projectId),
          eq(forms.status, "active"),
        ),
      });
      if (!savedForm)
        return (
          <p
            role="status"
            className="rounded-md border border-border p-3 text-sm text-muted-foreground"
          >
            This form is temporarily unavailable.
          </p>
        );
      const savedFields = await db.query.formFields.findMany({
        where: eq(formFields.formId, savedForm.id),
        orderBy: [formFields.sortOrder],
      });
      fields = savedFields.map((field) => ({
        key: field.key,
        label: field.label,
        fieldType: field.fieldType,
        required: field.required,
        options: Array.isArray(field.options)
          ? (field.options as string[])
          : [],
        placeholder: field.placeholder,
        layout: field.layout,
      }));
    }
    if (!fields.length) return null;
    return (
      <div {...common}>
        <PublicEnquiryForm
          formId={props.formId}
          pageId={pageId}
          nodeId={nodeId || node.id || props.id || "legacy-form"}
          fields={fields}
        />
      </div>
    );
  }

  const Tag = name === "form" ? "form" : name === "container" ? "div" : "div";
  return <Tag {...common}>{renderedChildren}</Tag>;
}

async function renderPageData(
  pageData: any,
  projectId: string,
  pageId: string,
  experience: Record<string, unknown> = {},
) {
  if (pageData?.craftState) {
    const nodes = pageData.craftState as Record<string, PublicNode>;
    const root = nodes.ROOT;
    if (root) {
      return renderNode(root, nodes, projectId, pageId, "ROOT", experience);
    }
  }

  if (Array.isArray(pageData?.sections)) {
    const headlineUsed = { value: false };
    const buttonUsed = { value: false };
    return Promise.all(
      pageData.sections.filter((section: any) =>
        !/(?:^|[-_\s])footer(?:$|[-_\s])/i.test(`${section?.id || ""} ${section?.name || ""}`),
      ).flatMap((section: any, sectionIndex: number) =>
        (section.components || []).map(
          async (component: any, index: number) => {
            const element = await renderNode(
              component,
              {},
              projectId,
              pageId,
              component.id || `${section.id || sectionIndex}:${index}`,
              experience,
              headlineUsed,
              buttonUsed,
            );
            return isValidElement(element)
              ? cloneElement(element, {
                  key: `${section.id || sectionIndex}:${component.id || index}`,
                })
              : element;
          },
        ),
      ),
    );
  }

  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ siteSlug: string; path?: string[] }>;
}) {
  const { siteSlug, path } = await params;
  const site = await db.query.projects.findFirst({
    where: eq(projects.subdomain, siteSlug),
  });
  if (!site) return { title: "Website" };
  const slug = `/${(path || []).join("/")}`.replace(/\/+/g, "/");
  const productMatch = slug.match(/^\/products\/([^/]+)$/);
  if (productMatch) {
    const product = await db.query.products.findFirst({
      where: and(
        eq(products.projectId, site.id),
        eq(products.slug, productMatch[1]),
        eq(products.status, "published"),
        eq(products.isActive, true),
      ),
    });
    if (product) {
      return {
        title: product.seoTitle?.trim() || product.name,
        description:
          product.seoDescription?.trim() ||
          product.shortDescription ||
          product.description ||
          undefined,
      };
    }
  }
  const blogMatch = slug.match(/^\/blogs\/([^/]+)$/);
  if (blogMatch) {
    const blog = await db.query.blogs.findFirst({
      where: and(
        eq(blogs.projectId, site.id),
        eq(blogs.slug, blogMatch[1]),
        eq(blogs.status, "published"),
        eq(blogs.isPublished, true),
      ),
    });
    if (blog) {
      return {
        title: blog.metaTitle?.trim() || blog.title,
        description: blog.metaDescription?.trim() || blog.excerpt || undefined,
      };
    }
  }
  const pageSlug = slug === "/" ? "home" : slug.slice(1);
  const page = await db.query.pages.findFirst({
    where: and(
      eq(pages.projectId, site.id),
      eq(pages.slug, pageSlug),
      eq(pages.status, "published"),
    ),
  });
  return {
    title: page?.metaTitle?.trim() || page?.title || site.name,
    description: page?.metaDescription?.trim() || undefined,
  };
}

export default async function PublicSitePage({
  params,
}: {
  params: Promise<{ siteSlug: string; path?: string[] }>;
}) {
  const { siteSlug, path } = await params;
  const requestHeaders = await headers();
  const hostname = normalizeHostname(
    requestHeaders.get("x-forwarded-host") ||
      requestHeaders.get("host") ||
      process.env.PUBLIC_REQUEST_HOST ||
      `${siteSlug}.${process.env.PLATFORM_DOMAIN || "localhost:3002"}`,
  );
  const userAgent = requestHeaders.get("user-agent") || undefined;
  const site = await getCachedSite(hostname);
  if (!site?.project || !site.project.isPublished) notFound();

  const slug = `/${(path || []).join("/")}`.replace(/\/+/g, "/");
  if (slug === "/cart" || slug === "/checkout") {
    await meterPublishedPageView(hostname, slug, userAgent);
    const targetType = slug.slice(1) as "cart" | "checkout";
    const assignments: Array<any> = [];
    const buttonText = assignments.find(
      (item: any) => typeof item.experience?.buttonText === "string",
    )?.experience.buttonText;
    const headline = assignments.find(
      (item: any) => typeof item.experience?.headline === "string",
    )?.experience.headline;
    return (
      <>
        <CheckoutExperience
          projectId={site.project.id}
          kind={targetType}
          experimentButtonText={buttonText}
          experimentHeadline={headline}
        />
        <GrowthTracker assignments={assignments} targetType={targetType} />
      </>
    );
  }
  if (slug === "/checkout/success" || slug === "/checkout/cancel") {
    await meterPublishedPageView(hostname, slug, userAgent);
    const assignments: Array<any> = [];
    return (
      <>
        <CheckoutResult
          projectId={site.project.id}
          type={slug.endsWith("success") ? "success" : "cancel"}
        />
        <GrowthTracker assignments={assignments} targetType="checkout" />
      </>
    );
  }
  const productMatch = slug.match(/^\/products\/([^/]+)$/);
  if (productMatch) {
    const product = await db.query.products.findFirst({
      where: and(
        eq(products.projectId, site.project.id),
        eq(products.slug, productMatch[1]),
        eq(products.status, "published"),
        eq(products.isActive, true),
      ),
    });
    if (!product) notFound();
    await meterPublishedPageView(hostname, slug, userAgent);
    const assignments: Array<any> = [];
    const experience =
      assignments.find(
        (item: any) => item.experience && typeof item.experience === "object",
      )?.experience || {};
    const price = product.discountedPrice ?? product.price;
    const image = Array.isArray(product.images)
      ? String(product.images[0] || "")
      : "";
    return (
      <>
        <SiteFrame project={site.project} pageData={null}>
        <section className="mx-auto grid max-w-6xl gap-8 px-5 py-10 md:grid-cols-2">
          <div className="overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-900">
            {image ? (
              <img
                src={image}
                alt={product.name}
                className="h-full min-h-72 w-full object-cover"
              />
            ) : null}
          </div>
          <section className="flex flex-col items-start justify-center">
            <p className="text-sm text-muted-foreground">
              {product.sku || product.productKind}
            </p>
            <h1 className="mt-2 text-3xl font-medium">
              {typeof experience.headline === "string" &&
              experience.headline.trim()
                ? experience.headline
                : product.name}
            </h1>
            {product.shortDescription || product.description ? (
              <p className="mt-4 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                {product.shortDescription || product.description}
              </p>
            ) : null}
            <div className="mt-7">
              <AddToCart
                projectId={site.project.id}
                product={{
                  id: product.id,
                  name: product.name,
                  description:
                    product.shortDescription || product.description || "",
                  price,
                  currency: site.project.currency,
                  productKind: product.productKind,
                  image,
                }}
                currency={site.project.currency}
                purchaseMode={site.project.purchaseMode}
                experimentButtonText={experience.buttonText}
              />
            </div>
          </section>
        </section>
        </SiteFrame>
        <GrowthTracker
          assignments={assignments}
          targetType="product"
          targetId={product.id}
        />
      </>
    );
  }
  const blogMatch = slug.match(/^\/blogs\/([^/]+)$/);
  if (blogMatch) {
    const blog = await db.query.blogs.findFirst({
      where: and(
        eq(blogs.projectId, site.project.id),
        eq(blogs.slug, blogMatch[1]),
        eq(blogs.status, "published"),
        eq(blogs.isPublished, true),
      ),
    });
    if (!blog) notFound();
    await meterPublishedPageView(hostname, slug, userAgent);
    return (
      <SiteFrame project={site.project} pageData={null}>
        <article className="mx-auto max-w-3xl px-5 py-12">
          {blog.featuredImage ? (
            <img
              src={blog.featuredImage}
              alt=""
              className="mb-8 max-h-[32rem] w-full rounded-2xl object-cover"
            />
          ) : null}
          <h1 className="text-4xl font-bold leading-tight">{blog.title}</h1>
          {blog.excerpt ? (
            <p className="mt-4 text-lg leading-7 text-muted-foreground">{blog.excerpt}</p>
          ) : null}
          <div
            className="published-blog-content mt-8 whitespace-pre-line"
            dangerouslySetInnerHTML={{ __html: cleanHtml(blog.content) }}
          />
        </article>
      </SiteFrame>
    );
  }
  const pageSlug = slug === "/" ? "home" : slug.slice(1);
  const page = await getCachedPage(site.project.id, pageSlug);
  if (!page) notFound();
  await meterPublishedPageView(hostname, slug, userAgent);
  const assignments: Array<any> = [];
  const experience =
    assignments.find(
      (item: any) => item.experience && typeof item.experience === "object",
    )?.experience || {};

  const pageData = page.publishedPageData || page.pageData;
  return (
    <>
      <SiteFrame project={site.project} pageData={pageData}>
        {await renderPageData(pageData, site.project.id, page.id, experience)}
      </SiteFrame>
      <GrowthTracker
        assignments={assignments}
        targetType="page"
        targetId={page.id}
      />
    </>
  );
}
