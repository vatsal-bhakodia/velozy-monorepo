import { and, count, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { parse } from "node-html-parser";
import { createDb, schema } from "@velozy/db";
import { htmlToSectionJson } from "../../api/src/lib/html-to-section-json.js";
import { processPrompt } from "../../api/src/lib/process-prompt.js";
import { runCampaignResearch } from "./seo-campaign-research.js";

type Database = ReturnType<typeof createDb>;
type DatabaseTransaction = Parameters<
  Parameters<Database["transaction"]>[0]
>[0];

const ALLOWED_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "blockquote",
  "br",
  "a",
  "div",
  "section",
]);

function safeHtml(html: string) {
  const root = parse(html);
  for (const node of root.querySelectorAll(
    "script,style,iframe,svg,object,embed,form,input,button",
  ))
    node.remove();
  const visit = (node: any) => {
    for (const child of [...(node.childNodes || [])]) {
      if (child.nodeType !== 1) continue;
      const tag = child.tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        child.replaceWith(...child.childNodes);
        continue;
      }
      const href = tag === "a" ? child.getAttribute("href") : null;
      for (const attr of [
        ...(child.attributes ? Object.keys(child.attributes) : []),
      ])
        child.removeAttribute(attr);
      if (href && (/^\/(?!\/)/.test(href) || /^https:\/\//i.test(href)))
        child.setAttribute("href", href.slice(0, 1000));
      visit(child);
    }
  };
  visit(root);
  return root.innerHTML.slice(0, 50_000);
}

function parseJson(text: string) {
  const raw = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(raw) as Record<string, any>;
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 255) || "seo-content"
  );
}

async function generateDraft(
  db: ReturnType<typeof createDb>,
  campaignId: string,
  input: Record<string, unknown>,
) {
  const opportunityId = String(input.opportunityId || "");
  const [campaign, opportunity] = await Promise.all([
    db.query.seoCampaigns.findFirst({
      where: eq(schema.seoCampaigns.id, campaignId),
    }),
    db.query.seoCampaignOpportunities.findFirst({
      where: and(
        eq(schema.seoCampaignOpportunities.id, opportunityId),
        eq(schema.seoCampaignOpportunities.campaignId, campaignId),
      ),
    }),
  ]);
  if (!campaign || !opportunity)
    throw new Error("Campaign opportunity no longer exists");
  const target = opportunity.targetId
    ? opportunity.targetType === "collection"
      ? await db.query.productCategories.findFirst({
          where: eq(schema.productCategories.id, opportunity.targetId),
        })
      : opportunity.targetType === "page"
        ? await db.query.pages.findFirst({
            where: eq(schema.pages.id, opportunity.targetId),
          })
        : null
    : null;
  const response = await processPrompt(
    "Write useful, original on-page SEO content for this verified business. Return JSON only with title, metaTitle (60 characters max), metaDescription (160 characters max), excerpt, and bodyHtml. Only use supplied facts. Do not create fake claims, testimonials, prices, locations, certifications, or statistics. bodyHtml must use only p, h2, h3, ul, ol, li, strong, em, blockquote, and a elements. Do not include scripts, styles, images, forms, or event handlers. Do not copy competitor wording. Include a natural long-tail phrase without keyword stuffing.",
    JSON.stringify({
      business: campaign.profile,
      opportunity,
      existingTarget: target,
      instructions:
        "Keywords are opportunities, not verified volume or ranking metrics.",
    }),
  );
  const result = parseJson(response);
  for (const key of ["title", "metaTitle", "metaDescription", "bodyHtml"])
    if (typeof result[key] !== "string" || !result[key].trim())
      throw new Error(`AI returned an invalid ${key}`);
  const bodyHtml = safeHtml(result.bodyHtml);
  if (!bodyHtml) throw new Error("AI returned empty content");
  const title = result.title.trim().slice(0, 255);
  const metaTitle = result.metaTitle.trim().slice(0, 60);
  const metaDescription = result.metaDescription.trim().slice(0, 160);
  const content = parse(bodyHtml).textContent.trim();
  const draft = {
    title,
    slug: slugify(title),
    metaTitle,
    metaDescription,
    excerpt:
      typeof result.excerpt === "string"
        ? result.excerpt.trim().slice(0, 1000)
        : content.slice(0, 240),
    content: opportunity.targetType === "blog" ? bodyHtml : content,
    bodyHtml,
    section:
      opportunity.targetType === "page"
        ? htmlToSectionJson(bodyHtml, `seo-${opportunity.id}`)
        : undefined,
  };
  await db
    .update(schema.seoCampaignOpportunities)
    .set({ draft, status: "draft", updatedAt: new Date() })
    .where(eq(schema.seoCampaignOpportunities.id, opportunity.id));
  await maybeAutopublish(db, campaign.id, opportunity.id, draft);
  return { opportunityId: opportunity.id, draftReady: true };
}

async function claimWithinMonthlyLimit(
  tx: DatabaseTransaction,
  campaignId: string,
  opportunityId: string,
  limitTypes: string[],
  cap: number,
  monthStart: Date,
) {
  // Serialize all autopilot publications for this campaign while checking the
  // cap. The claim and publication must commit together to avoid duplicate
  // retries or concurrent jobs exceeding the configured limit.
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${campaignId}))`);
  const [claim] = await tx
    .update(schema.seoCampaignOpportunities)
    .set({ status: "publishing", updatedAt: new Date() })
    .where(
      and(
        eq(schema.seoCampaignOpportunities.id, opportunityId),
        eq(schema.seoCampaignOpportunities.status, "draft"),
      ),
    )
    .returning({ id: schema.seoCampaignOpportunities.id });
  if (!claim) return false;
  const [{ value: used }] = await tx
    .select({ value: count() })
    .from(schema.seoCampaignPublications)
    .where(
      and(
        eq(schema.seoCampaignPublications.campaignId, campaignId),
        inArray(schema.seoCampaignPublications.targetType, limitTypes),
        isNull(schema.seoCampaignPublications.rollbackOf),
        gte(schema.seoCampaignPublications.publishedAt, monthStart),
      ),
    );
  if (cap <= 0 || used >= cap)
    throw new Error(
      "Monthly autopilot limit reached; draft awaits manual review.",
    );
  return true;
}

async function maybeAutopublish(
  db: ReturnType<typeof createDb>,
  campaignId: string,
  opportunityId: string,
  draft: Record<string, any>,
) {
  const [campaign, opportunity] = await Promise.all([
    db.query.seoCampaigns.findFirst({
      where: eq(schema.seoCampaigns.id, campaignId),
    }),
    db.query.seoCampaignOpportunities.findFirst({
      where: and(
        eq(schema.seoCampaignOpportunities.id, opportunityId),
        eq(schema.seoCampaignOpportunities.campaignId, campaignId),
      ),
    }),
  ]);
  if (!campaign?.autopilotEnabled || !opportunity) return;
  const settings = campaign.settings as Record<string, boolean | number>;
  const authorizedBy = campaign.autopilotAuthorizedBy;
  if (!authorizedBy) return;
  if (
    !opportunity.approvedAt ||
    !opportunity.autopilotEligible ||
    (opportunity.score || 0) < 70 ||
    (opportunity.evidenceCoverage || 0) < 100
  ) {
    await db
      .update(schema.seoCampaignOpportunities)
      .set({
        draft: {
          ...draft,
          automationNote:
            "This roadmap item lacks owner approval or complete evidence; review it manually.",
        },
        updatedAt: new Date(),
      })
      .where(eq(schema.seoCampaignOpportunities.id, opportunity.id));
    return;
  }
  const project = await db.query.projects.findFirst({
    where: eq(schema.projects.id, campaign.projectId),
    columns: { userId: true },
  });
  if (!project || project.userId !== authorizedBy) {
    await db
      .update(schema.seoCampaignOpportunities)
      .set({
        draft: {
          ...draft,
          automationNote:
            "Project ownership changed; review this draft manually.",
        },
        updatedAt: new Date(),
      })
      .where(eq(schema.seoCampaignOpportunities.id, opportunity.id));
    return;
  }
  const allowed =
    opportunity.targetType === "page"
      ? settings.pagePublishing
      : opportunity.targetType === "collection"
        ? settings.categoryPublishing
        : settings.blogScheduling;
  if (!allowed) return;
  if (["published", "scheduled", "publishing"].includes(opportunity.status))
    return;
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const limitTypes =
    opportunity.targetType === "blog" ? ["blog"] : ["page", "collection"];
  const cap =
    opportunity.targetType === "blog"
      ? Number(settings.maxBlogsPerMonth || 0)
      : Number(settings.maxPagesPerMonth || 0);
  try {
    if (opportunity.targetType === "blog") {
      const slug = slugify(String(draft.slug || draft.title));
      const existing = await db.query.blogs.findFirst({
        where: eq(schema.blogs.slug, slug),
      });
      if (existing)
        throw new Error(
          "Blog URL already exists; draft requires manual review",
        );
      const days = Math.max(
        1,
        Math.min(90, Number(settings.blogScheduleDays || 7)),
      );
      const scheduledAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      await db.transaction(async (tx) => {
        if (
          !(await claimWithinMonthlyLimit(
            tx,
            campaign.id,
            opportunity.id,
            limitTypes,
            cap,
            monthStart,
          ))
        )
          return;
        const [blog] = await tx
          .insert(schema.blogs)
          .values({
            projectId: campaign.projectId,
            authorId: authorizedBy,
            title: String(draft.title),
            slug,
            excerpt: String(draft.excerpt || ""),
            content: String(draft.content || ""),
            featuredImage:
              typeof draft.imageUrl === "string" ? draft.imageUrl : null,
            metaTitle: String(draft.metaTitle || ""),
            metaDescription: String(draft.metaDescription || ""),
            status: "draft",
            isPublished: false,
          })
          .returning();
        const [plan] = await tx
          .insert(schema.contentPlans)
          .values({
            projectId: campaign.projectId,
            kind: "blog",
            blogId: blog.id,
            status: "scheduled",
            scheduledAt,
            timezone: "UTC",
            createdBy: authorizedBy,
          })
          .returning();
        await tx
          .insert(schema.seoCampaignPublications)
          .values({
            campaignId: campaign.id,
            opportunityId: opportunity.id,
            targetType: "blog",
            targetId: blog.id,
            beforeValue: { created: true },
            afterValue: { blogId: blog.id, planId: plan.id, scheduledAt },
            publishedBy: authorizedBy,
          });
        await tx
          .update(schema.seoCampaignOpportunities)
          .set({ status: "scheduled", targetId: blog.id, updatedAt: now })
          .where(eq(schema.seoCampaignOpportunities.id, opportunity.id));
      });
      return;
    }
    if (opportunity.targetType === "collection") {
      const target = opportunity.targetId
        ? await db.query.productCategories.findFirst({
            where: and(
              eq(schema.productCategories.id, opportunity.targetId),
              eq(schema.productCategories.projectId, campaign.projectId),
            ),
          })
        : null;
      const title = String(draft.title || "New category");
      const slug = slugify(
        String(
          opportunity.targetPath?.replace(/^\/+/, "") || draft.slug || title,
        ),
      );
      if (
        !target &&
        (await db.query.productCategories.findFirst({
          where: and(
            eq(schema.productCategories.projectId, campaign.projectId),
            eq(schema.productCategories.slug, slug),
          ),
        }))
      )
        throw new Error(
          "Category URL already exists; draft requires manual review",
        );
      const beforeValue = target
        ? {
            heading: target.heading,
            description: target.description,
            metaTitle: target.metaTitle,
            metaDescription: target.metaDescription,
            image: target.image,
            isActive: target.isActive,
          }
        : { created: true };
      const afterValue = {
        heading: title,
        description: String(draft.content || ""),
        metaTitle: String(draft.metaTitle || ""),
        metaDescription: String(draft.metaDescription || ""),
        image:
          typeof draft.imageUrl === "string"
            ? draft.imageUrl
            : target?.image || null,
        isActive: true,
      };
      await db.transaction(async (tx) => {
        if (
          !(await claimWithinMonthlyLimit(
            tx,
            campaign.id,
            opportunity.id,
            limitTypes,
            cap,
            monthStart,
          ))
        )
          return;
        const [category] = target
          ? await tx
              .update(schema.productCategories)
              .set({ ...afterValue, updatedAt: now })
              .where(eq(schema.productCategories.id, target.id))
              .returning()
          : await tx
              .insert(schema.productCategories)
              .values({
                projectId: campaign.projectId,
                name: title,
                slug,
                ...afterValue,
              })
              .returning();
        await tx
          .insert(schema.seoCampaignPublications)
          .values({
            campaignId: campaign.id,
            opportunityId: opportunity.id,
            targetType: "collection",
            targetId: category.id,
            beforeValue,
            afterValue,
            publishedBy: authorizedBy,
          });
        await tx
          .update(schema.seoCampaignOpportunities)
          .set({ status: "published", targetId: category.id, updatedAt: now })
          .where(eq(schema.seoCampaignOpportunities.id, opportunity.id));
      });
      return;
    }
    const target = opportunity.targetId
      ? await db.query.pages.findFirst({
          where: and(
            eq(schema.pages.id, opportunity.targetId),
            eq(schema.pages.projectId, campaign.projectId),
          ),
        })
      : null;
    if (
      target?.pageData &&
      typeof target.pageData === "object" &&
      "craftState" in (target.pageData as Record<string, unknown>)
    )
      throw new Error(
        "Visual editor pages require manual application; draft awaits review",
      );
    const title = String(draft.title || target?.title || "New page");
    const slug = slugify(
      String(
        target?.slug ||
          opportunity.targetPath?.replace(/^\/+/, "") ||
          draft.slug ||
          title,
      ),
    );
    if (
      !target &&
      (await db.query.pages.findFirst({
        where: and(
          eq(schema.pages.projectId, campaign.projectId),
          eq(schema.pages.slug, slug),
        ),
      }))
    )
      throw new Error("Page URL already exists; draft requires manual review");
    const current =
      target?.pageData && typeof target.pageData === "object"
        ? (target.pageData as Record<string, any>)
        : {};
    const section = draft.section;
    if (!section || typeof section !== "object")
      throw new Error("Generated page draft has no content section");
    if (typeof draft.imageUrl === "string")
      section.components = [
        ...(Array.isArray(section.components) ? section.components : []),
        {
          id: `seo-image-${opportunity.id}`,
          type: "Image",
          props: { src: draft.imageUrl, alt: String(draft.imageAlt || title) },
        },
      ];
    const pageData = {
      ...current,
      sections: [
        ...(Array.isArray(current.sections) ? current.sections : []),
        section,
      ],
    };
    const beforeValue = target
      ? {
          title: target.title,
          metaTitle: target.metaTitle,
          metaDescription: target.metaDescription,
          pageData: target.pageData,
          publishedPageData: target.publishedPageData,
          status: target.status,
        }
      : { created: true };
    await db.transaction(async (tx) => {
      if (
        !(await claimWithinMonthlyLimit(
          tx,
          campaign.id,
          opportunity.id,
          limitTypes,
          cap,
          monthStart,
        ))
      )
        return;
      const [page] = target
        ? await tx
            .update(schema.pages)
            .set({
              title,
              metaTitle: String(draft.metaTitle || ""),
              metaDescription: String(draft.metaDescription || ""),
              pageData,
              publishedPageData: pageData,
              status: "published",
              updatedAt: now,
            })
            .where(eq(schema.pages.id, target.id))
            .returning()
        : await tx
            .insert(schema.pages)
            .values({
              projectId: campaign.projectId,
              title,
              slug,
              metaTitle: String(draft.metaTitle || ""),
              metaDescription: String(draft.metaDescription || ""),
              pageData,
              publishedPageData: pageData,
              status: "published",
            })
            .returning();
      await tx
        .insert(schema.seoCampaignPublications)
        .values({
          campaignId: campaign.id,
          opportunityId: opportunity.id,
          targetType: "page",
          targetId: page.id,
          beforeValue,
          afterValue: { ...draft, pageData },
          publishedBy: authorizedBy,
        });
      await tx
        .update(schema.projects)
        .set({
          isPublished: true,
          publishedAt: now,
          publishedVersion: sql`${schema.projects.publishedVersion} + 1`,
          updatedAt: now,
        })
        .where(eq(schema.projects.id, campaign.projectId));
      await tx
        .update(schema.seoCampaignOpportunities)
        .set({ status: "published", targetId: page.id, updatedAt: now })
        .where(eq(schema.seoCampaignOpportunities.id, opportunity.id));
    });
  } catch (error) {
    const current = await db.query.seoCampaignOpportunities.findFirst({
      where: eq(schema.seoCampaignOpportunities.id, opportunity.id),
    });
    const currentDraft = (current?.draft || draft) as Record<string, unknown>;
    await db
      .update(schema.seoCampaignOpportunities)
      .set({
        draft: {
          ...currentDraft,
          automationNote:
            error instanceof Error
              ? error.message
              : "Autopilot requires manual review",
        },
        updatedAt: new Date(),
      })
      .where(eq(schema.seoCampaignOpportunities.id, opportunity.id));
  }
}

export async function processSeoCampaignJob(
  db: ReturnType<typeof createDb>,
  jobId: string,
) {
  const job = await db.query.seoCampaignJobs.findFirst({
    where: eq(schema.seoCampaignJobs.id, jobId),
  });
  if (!job) throw new Error("SEO campaign job record not found");
  await db
    .update(schema.seoCampaignJobs)
    .set({
      status: "running",
      progress: 5,
      attempts: job.attempts + 1,
      lastError: null,
      updatedAt: new Date(),
    })
    .where(eq(schema.seoCampaignJobs.id, job.id));
  const runId =
    typeof (job.input as Record<string, unknown>)?.runId === "string"
      ? String((job.input as Record<string, unknown>).runId)
      : null;
  if (job.kind === "research" && runId)
    await db
      .update(schema.seoCampaignResearchRuns)
      .set({ status: "running", startedAt: new Date() })
      .where(eq(schema.seoCampaignResearchRuns.id, runId));
  try {
    const result =
      job.kind === "research"
        ? runId
          ? await runCampaignResearch(db, job.campaignId, runId)
          : (() => {
              throw new Error("Research run ID is missing");
            })()
        : job.kind === "generate"
          ? await generateDraft(
              db,
              job.campaignId,
              job.input as Record<string, unknown>,
            )
          : (() => {
              throw new Error("Unsupported SEO campaign job type");
            })();
    await db
      .update(schema.seoCampaignJobs)
      .set({
        status: "succeeded",
        progress: 100,
        result,
        updatedAt: new Date(),
      })
      .where(eq(schema.seoCampaignJobs.id, job.id));
  } catch (error) {
    if (job.kind === "research" && runId)
      await db
        .update(schema.seoCampaignResearchRuns)
        .set({
          status: "failed",
          lastError:
            error instanceof Error
              ? error.message.slice(0, 1000)
              : "Research failed",
          completedAt: new Date(),
        })
        .where(eq(schema.seoCampaignResearchRuns.id, runId));
    await db
      .update(schema.seoCampaignJobs)
      .set({
        status: "failed",
        lastError:
          error instanceof Error
            ? error.message.slice(0, 1000)
            : "SEO job failed",
        updatedAt: new Date(),
      })
      .where(eq(schema.seoCampaignJobs.id, job.id));
    throw error;
  }
}
