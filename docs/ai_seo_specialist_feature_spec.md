# Velozy AI SEO Specialist

**Product specification and implementation blueprint**  
**Status:** Product and implementation specification; implementation is phased
**Audience:** Product, design, engineering, AI agents, QA, and Codex  
**Purpose:** Automate a credible SEO specialist's workflow, from understanding a business through research, prioritization, execution, and measurement.

> Core promise: Velozy learns what a business offers, where it competes, and what it wants to achieve. It discovers and studies relevant competitors, investigates real search demand, audits the website, creates an explainable SEO roadmap, drafts and implements approved improvements, and measures outcomes over time. The admin SEO campaign replaces the current social media planner; it is an on-page SEO workflow, not a social publishing tool.
>
> SEO is not guaranteed ranking. Velozy must never promise traffic or revenue growth, invent keyword volumes, or claim a ranking without supporting data.

---

## 1. Product principles

1. **Diagnose before prescribing.** A specialist first learns the business, customer, location, competitors, and existing performance. Do not generate generic blogs immediately.
2. **Differentiate business competitors from search competitors.** Physical competitors, brands competing for sales, and sites ranking for a query are not always the same.
3. **Collect evidence, then reason.** Crawling shows public content and site architecture. Search ranking, volume, traffic estimates, and links require appropriate data sources. LLMs should never fabricate metrics.
4. **Human checkpoints where they matter.** Confirm business profile, markets, competitors, initial strategy, and autopublishing authorization. No need for human approval on every safe read-only analysis.
5. **Use a strategy, not a content mill.** Prioritize pages, technical repairs, internal links, useful content, local visibility, and measurable conversion improvements. Only create pages with unique value.
6. **One shared view of the business.** Reuse Velozy's actual product/service catalogue, CMS, forms, bookings, store, and analytics data, subject to permissions.
7. **Modular pricing.** Basic on-page SEO belongs to normal hosting plans; advanced research and ongoing automation are optional. Meter expensive operations transparently.
8. **Explain every recommendation.** Show evidence, expected outcome, confidence, cost, and whether changes need approval.
9. **Respect privacy and the open web.** Enforce authorization, crawl policies and rate limits, and prevent SSRF and unsafe publishing.
10. **No black-box autopilot.** Maintain version history, task logs, rollback, and budget limits.
11. **Publish within a clear authorization boundary.** A project owner explicitly enables campaign autopilot and its scope. Within that scope, validated page and product-category improvements can publish directly; blog content is published through a scheduled job. Users can pause automation at any time.

## 2. What a human SEO specialist actually does

A competent specialist normally follows an iterative cycle:

| Stage | Specialist's activity | Velozy's equivalent | Deliverable |
|---|---|---|---|
| 1. Discovery | Interview client, understand offering, customers, markets and goals | AI prefill + guided confirmations | Verified business brief |
| 2. Baseline | Review traffic, existing rankings, indexation and conversions | Own-site crawl + GSC + product analytics | Baseline dashboard |
| 3. Technical audit | Check crawlability, indexing, canonicalization, redirects, structure and performance | Rule-based crawler and technical tests | Issue inventory with priorities |
| 4. Market and SERP study | Research real search queries, intent, competing pages and SERP features | Location/language-specific SERP & keyword APIs | Search landscape |
| 5. Competitor benchmarking | Evaluate relevant competitors' positioning, structures, topics and links | Domain discovery + user approval + targeted crawl | Competitor dossiers |
| 6. Keyword research | Expand seed terms, cluster intents, prioritize opportunities | Keyword APIs + clustering + relevance logic | Keyword map and opportunity backlog |
| 7. Site strategy | Map target topics to existing/new URLs; prioritize fixes | AI-assisted planning with deterministic checks | Approved 30/60/90-day roadmap |
| 8. Implementation | Fix site issues, optimize pages, develop content, interlink, improve local SEO | Native Velozy CMS/editor + agent drafts | Live approved changes |
| 9. Measurement | Track indexation, visibility, clicks, conversions, leads and revenue | GSC + site analytics + rank data | Impact and work reports |
| 10. Iteration | Update priorities as performance and competitors change | Periodic scoped refresh jobs | Updated roadmap |

A strategy may prioritize fixing existing pages instead of creating any new blog posts.

## 3. What the user sees: onboarding

### 3.1 Prefill first, ask only for uncertain information

Use data from the Velozy project to prepopulate business name, website URL, description, products/services, content language, existing pages and contact details. Explicitly ask the user to **confirm or correct** inferred facts. Store source and confidence for each field.

### 3.2 Required discovery fields

| Field | Example | Notes |
|---|---|---|
| Business name and website | Acme Bridal, acme.example | From project, editable |
| Industry | Jewellery and accessories | Taxonomy plus custom choice |
| Primary niches | Bridal gold jewellery; custom rings | Support multiple, prioritized niches |
| Products/services | Custom bridal sets, repairs, etc. | Extract from verified catalogue; confirm |
| Business model | Physical store, online, both; B2B, B2C or both | These are separate dimensions |
| Customer geography | Local, regional, national, selected countries, worldwide | Include explicit cities, regions and countries |
| Search languages | English, Hindi | A country can have multiple languages |
| Ideal customer | Brides in Delhi NCR | Optional detailed segments |
| Business goals | Orders, booked appointments, enquiries, leads, readership | Multi-select with one primary goal |
| Main conversion | Checkout, booking, form submission, phone call | Must correspond to trackable event |
| Brand constraints | Tone, regulated claims, prohibited topics | Mandatory before autopublishing |

**Geographic rules:**
- *Local:* Require service area/city, country, and service radius or relevant districts. Physical location and service area are distinct.
- *National:* Require country and relevant languages; distinguish nationwide delivery from nationwide physical service.
- *International:* Require a set of target countries and languages; store priority and whether pages/offers differ per market.
- *Worldwide:* Do not treat every country as one SERP. Ask for 1–3 initial priority markets/languages or suggest them and obtain confirmation.
- An online-only business can still compete locally; business model and geographic scope must not be conflated.

### 3.3 Optional, valuable discovery fields

- Price positioning (budget/midmarket/premium), key differentiators, primary business cities, delivery countries, seasonal demand, certifications, verified customer FAQs.
- Known competitors supplied by user, brands not to compare with, preferred regions for expansion.
- Current marketing channels, existing SEO agency/campaigns, business KPIs and publishing preferences.
- For local SEO: actual storefronts, service areas, hours and Google Business Profile verification status.

### 3.4 Business profile confirmation screen

Show a short editable summary: **what we sell**, **to whom**, **where**, **in what language**, **what outcome matters**. Require confirmation before competitor discovery. Users can revisit setup whenever business scope changes.

## 4. Establish SEO baseline before recommendations

### 4.1 Connect first-party sources

- Google Search Console (verified property): queries, pages, countries, device mix, impressions, clicks, CTR and average position where available.
- Velozy analytics: sessions and conversions, attribution when available, product/booking/form outcomes and funnel events.
- Native CMS/route metadata: pages, canonical URLs, template types, status and last published dates.
- Optional: Google Analytics integration, Google Business Profile integration when supported and authorized.

Do not use third-party estimates as the site's actual analytics. Show date ranges and last synced timestamps. GSC query exports may be incomplete and anonymized; metrics need context.

### 4.2 Crawl own website and run technical audit

Audit categories:

**Discoverability/indexing**
- robots.txt, XML sitemaps, noindex, HTTP status, redirect chains, canonical tags, broken links, orphan pages and internal crawl depth.
- Identify discrepancies between submitted pages, indexable pages and indexed pages when GSC indexing data is available.
- Distinguish 'not indexed' from 'invalid'; Google may choose not to index otherwise valid content.

**Content/on-page**
- H1/title/meta patterns, duplicate or thin content requiring human review, page intent, descriptive URLs, heading hierarchy, image alt text, internal anchors, relevant structured data, topical completeness.
- Duplicate titles or missing meta descriptions are indicators, not automatic SEO emergencies. Prioritize by impact.

**Rendering/experience**
- Mobile rendering, layout stability and Core Web Vitals when valid field or lab data exists; accessibility/usability checks.
- Track LCP, INP and CLS without claiming that passing thresholds guarantees rankings.

**Architecture/international**
- Navigational structure, URL clusters, breadcrumbs, paginated resources, multilingual alternate URLs and hreflang validity where applicable.

Every audit issue should contain: rule ID, evidence URLs, impact/priority, confidence, suggested fix, estimated effort, status, owner, and rollback approach.

## 5. Find competitor URLs automatically

### 5.1 New website with no rankings

1. Extract approved niche, offering, buyer intent, target geography, language and commercial goal.
2. Generate several *diverse*, specific seed search queries: core services/products, local variants, commercial modifiers, and problem-oriented searches.
3. Run localized SERP requests through an available source. Prefer open-source components for collection and processing where they can provide reliable evidence; use a configured SERP/keyword provider when actual localized result sets or keyword metrics are needed. Record engine, locale, device, provider, and retrieval time. Do not imply an open-source crawler can supply search volumes or rankings by itself.
4. Extract organic result URLs and candidate domains, normalize hostnames and deduplicate root domains as appropriate.
5. Classify candidates: **direct business**, **search competitor**, **aspirational**, **directory/marketplace**, **publisher/informational**, or **irrelevant**.
6. Validate candidate business relevance using public site metadata and a small, budgeted crawl before showing suggestions.
7. Score by industry/niche overlap, offering overlap, market overlap, business model, relevance across seed queries, and SERP visibility. Never present scores as objective certainty.
8. Present 5–10 candidates with *why shown*, matched queries, region and last checked date. Let user confirm, remove or add URLs.
9. Deep crawl **only confirmed** candidates; refresh on demand or on the paid schedule.

### 5.2 Established website with existing rankings

Use existing ranking overlap/domain competitor tools as an additional discovery source. Keep search competitor and commercial competitor lists distinct. A marketplace may rank for the terms without being a comparable business model.

### 5.3 Sample seed queries

For a Delhi bridal jewellery retailer:
- `bridal jewellery shop delhi`
- `custom bridal gold jewellery delhi`
- `bridal jewellery showroom near south delhi`
- `buy bridal jewellery online india`

Do not search only broad topics such as `jewellery`; they often pull in irrelevant publishers and national brands.

### 5.4 Approval UX

- User selects 3–5 priority competitors (package-dependent).
- Show source query, type and relevance explanation.
- Allow manual URL entry with server-side domain validation and safety checks.
- Permit future changes with a research-refresh budget.
- Save competitor revisions, timestamps and user identity.

## 6. Analyze confirmed competitors like a specialist

### 6.1 What crawling can reveal

For each competitor, discover sitemap and important categories, then selectively crawl public pages:
- Site hierarchy and navigation; service/product category URLs.
- Page title, description, canonical, headers, schema, copy structure, FAQs and internal links.
- Content clusters, articles, update cadence where discoverable, CTA placement and conversion flows.
- Representative top categories and distinctive value propositions.
- Technically observable public signals (redirects, broken links, structured metadata).

Use a controlled worker separate from web request handlers. The current API and admin are TypeScript/Node; prefer **Crawlee** as the first open-source candidate so the crawler can share the existing runtime and types. Evaluate **Crawl4AI** only if its extraction quality justifies operating a separate Python worker. Prefer sitemap and known candidate URLs to unrestricted whole-domain crawling. Save normalized text and structured observations, not indiscriminate HTML copies.

### 6.2 What crawling alone cannot reveal

**Never infer as a fact:** actual Google ranking, monthly search volume, keyword difficulty, real competitor analytics, conversion rate, organic traffic or full backlink profile from website HTML alone.

Use ranking/SERP data providers for search visibility and keyword gaps. Label third-party organic traffic as **estimates**. Use first-party GSC only for verified owned properties.

### 6.3 Research dossier per competitor

- Identity, region, language, type and confirmed status.
- Representative key pages, primary themes, offering overlap, notable UX/positioning, observed internal linking patterns.
- Verified third-party keywords and ranking positions with snapshot date/provider (if purchased).
- Content strengths, gaps relative to user business, constraints, confidence and source URLs.
- Suggested ethical lessons, not copied text, brand claims or layouts.

## 7. Keyword research and search intent

A human specialist doesn't simply copy keywords from competitor sites. Build a candidate universe from:
- Verified products/services and synonyms.
- GSC queries already earning impressions.
- Competitor ranked keywords and domain/page intersections when available.
- Actual SERP related searches, questions and intent signals.
- Location and language modifiers.
- Seasonal and funnel variants (information, comparison, transactional, navigation).

Normalize, deduplicate and cluster by **search intent and topic**, not just string similarity. Preserve localized search volume, provider difficulty estimate, CPC when relevant, ranking URL, SERP features, freshness and provenance.

### 7.1 Keyword prioritization

Combine: business relevance, revenue/conversion potential, user intent, demonstrable demand, ranking feasibility, topical fit, current site authority, existing page performance and production effort. Don't blindly prioritize the highest-volume terms.

Example output:

| Cluster | Intent | Assigned URL/action | Rationale |
|---|---|---|---|
| Bridal jewellery Delhi | Local commercial | Improve existing bridal category | Direct buyer intent |
| Custom bridal set pricing | Commercial investigation | New FAQ/guide or service page | Addresses buyer question |
| 22K vs 18K gold | Informational | Supporting educational article | Supports internal journey |

These are illustrations, not verified metrics.

### 7.2 Keyword cannibalization and page mapping

Map every target cluster to an existing URL or justified new URL. Avoid creating a new page if a strong matching one exists. A specialist may merge, redirect, update, or interlink pages when multiple URLs target indistinguishable intents.

## 8. Formulate an actionable SEO strategy

Before any automated writing, generate a versioned SEO plan with:

1. Business goal and baseline.
2. Priority search markets and languages.
3. Approved competitors and their observed strengths.
4. Technical fixes sorted by expected impact and effort.
5. Keyword clusters and existing/new destination URLs.
6. Content pillar/cluster architecture and internal linking plan.
7. Local SEO actions when appropriate, including human-managed Google Business Profile consistency and location pages with unique value.
8. Ecommerce SEO actions when appropriate: category pages, product unique content, variants/canonicals, merchant structured data when eligible.
9. International SEO actions when appropriate: locale URLs, translated/localized content, hreflang, market-specific offerings.
10. Off-page opportunities: relevant partnerships, useful assets and earned editorial links; never automated spam outreach or paid-link schemes.
11. 30/60/90-day milestones with owners, estimated cost, dependencies and validation checkpoints.
12. KPIs, data sources, expected measurement delay and success criteria.

AI must explain **why** each action is recommended using concrete inputs. The system must not guarantee rankings or forecast traffic as certainty.

## 9. Executing the plan inside Velozy

### 9.1 Types of executable tasks

- **Technical fixes:** Update canonical, sitemap, robots directives, redirects, page metadata, structured data or internal links, only after validation.
- **Existing page optimization:** Refresh copy, product/service descriptions, headings, FAQ and links while preserving business facts.
- **New commercial pages:** Create only for real services, products, markets and demonstrably distinct user intent.
- **Educational content:** Research-backed blog posts or guides, useful examples, citations and links to relevant business pages.
- **Local SEO:** Location-specific services and verified business details; no mass-generated doorway pages.
- **Content maintenance:** Refresh information if stale or performance signals justify it; avoid rewriting simply because time passed.

### 9.2 Writing workflow

`Opportunity -> Brief -> Evidence gathering -> Draft -> Factual validation -> SEO/brand QA -> Preview -> authorized publish or scheduled blog -> Monitor`

Each content brief should specify goal, reader, intent, target keyword cluster, source evidence, unique business information, CTA, outline, internal links, target URL and prohibited claims.

Generated content should be original, helpful and fact-checked. Never copy competitor articles or falsely claim testimonials, prices, certifications, product availability, medical/legal advice or performance results.

### 9.3 Human control modes

| Mode | Behavior |
|---|---|
| Manual | User initiates research and generation; user publishes |
| Assisted | Agent proposes and drafts plan/calendar; user approves each publish |
| Autopilot | After an owner explicitly enables the campaign and approves its topics, markets, content rules, budget and publishing scope, the agent can publish validated page/product-category updates directly and schedule blogs. Risky changes still need separate approval. |

Approval always required for: changing core business claims, publishing sensitive regulated advice, modifying checkout/payment settings, deleting pages, major redirect/canonical changes, adding new markets, or exceeding budgets. The one-time campaign authorization is not blanket permission for actions outside its saved scope. Newly generated pages must pass uniqueness, factuality, link, metadata, and duplicate/cannibalization checks before direct publication. Blog posts must be created as drafts and flow through the existing scheduled blog publishing mechanism; never publish a blog immediately as a side effect of research or generation.

Autopilot must support pause, versioning, audit trail, notification, editorial lock and rollback.

## 10. Measurement and ongoing specialist iteration

### 10.1 KPIs

**Visibility:** indexed pages, non-brand impressions, target-query positions where sourced, clicks and CTR.  
**Engagement:** qualified organic sessions, landing-page engagement, conversions.  
**Business:** form enquiries, bookings, attributed orders, conversion value where available.  
**Delivery:** fixes shipped, useful pages published, content performance, spend per result.

Segment by market, device, page type, branded vs non-branded traffic and date; account for seasonality and measurement limitations. Correlation is not proof that an AI-produced article caused revenue growth.

### 10.2 Cadence

- **Daily or event-driven:** Check job failures, publishing problems and important own-site crawl/indexation regressions; don't needlessly buy fresh SERP data.
- **Weekly (Autopilot):** Review GSC trends, new query opportunities, active plan progress, selected keyword checks and material competitor changes.
- **Monthly (Growth):** Updated keyword opportunity list, competitor refresh within allowance, prioritized tasks, content performance and next-month calendar.
- **Quarterly:** Reconfirm business goals, customer markets and strategy; audit cannibalization and content quality.

New sites need patience: performance data may be sparse for weeks or months. No automated system can guarantee Google will crawl, index or rank new pages.

### 10.3 Feedback loop

`Published work -> GSC and conversions -> Interpretation with confidence -> Action: keep, improve, merge, redirect, pause -> New approved plan`

Avoid 'refresh everything' behavior. Respect customers' chosen goals and time/cost budgets.

## 11. SEO-specific pricing and credit system

Separate predictable subscriptions from metered, expensive work.

### 11.1 Entitlement layers

1. **Website foundation:** Essential editable on-page SEO, sitemap, canonical controls, redirects, basic audits. No AI credit charge for manual edits.
2. **General AI wallet:** Page/section rewrites, article drafts, image generation and other generation actions. Shared per project with role-based spending policies.
3. **SEO Growth add-on:** Approved competitor profiles, research units, initial strategy, scheduled audits, and included content-generation jobs.
4. **SEO Autopilot add-on:** Replaces Growth (not stacked). Higher research and content allowances, scheduled execution, approval policy and monitoring.
5. **Communication usage:** Email/SMS/WhatsApp costs separate from SEO credits; don't include in 'free' AI writes.

### 11.2 Sample allowance model (illustrative only)

| Item | SEO Growth | SEO Autopilot |
|---|---:|---:|
| Confirmed competitor profiles | 3 | 5 |
| SEO research units per month | 100 | 400 |
| Included standard blog jobs/month | 4 | 12 |
| Included landing page jobs/month | 2 | 5 |
| Keyword tracking allowance | 25 | 100 |
| Competitor refresh | Monthly | Weekly |
| Strategy refresh | Monthly | Weekly |
| Publish | Approval required | Rules-based autopublish possible |

Suggested add-on pricing from broader Velozy plan: **India ₹999/mo Growth and ₹2,499/mo Autopilot**, with separate international USD charm prices set in the central pricing configuration. These are proposals, not validated unit economics. Read prices and limits from entitlement configuration, not duplicated constants in SEO code.

### 11.3 Metering rules

- A **research unit** represents a normalized bundle of paid SERP/keyword/crawl operations. Do not expose arbitrary provider API costs to customers. A task must have an estimated quota requirement before launch.
- A **general AI credit** covers generative operations, with action-specific weights determined from model/tool costs.
- Included blog/page jobs are **not additionally charged** general AI credits for standard generation. Premium extra images or explicit extra drafts may be metered with informed consent.
- Discovery preview may have a small free budget; expensive scans require confirmation and entitlement.
- Reserve usage atomically, settle actual charges, return unused reservation, refund failed jobs, and enforce idempotency.
- Team members share project balances; roles and optional per-member budgets govern who can spend.
- Exhausted credits stop new paid tasks, **not** live websites, checkout, or manual editor functionality.
- No surprise overages or automatic purchases unless owner has explicitly opted in, with monthly cap.
- Log model/provider, cost, credits, job, actor, snapshot and refunds.

## 12. Technical architecture

```text
Velozy Admin (React) + Verified Business Profile
          |
          v
Express API + SEO Campaign State / Project Authorization
          |
    +-----+-----------+------------------+
    |                 |                  |
Search / SEO Sources  Crawl Worker      First-party Data
(SERP, keywords,      (Crawlee first;   (GSC, Velozy CMS,
 ranks, backlinks)    controlled)        analytics, leads)
    |                 |                  |
    +-----------------+------------------+
                      |
          Evidence Store + Normalization
                      |
          Competitor and Keyword Research
                      |
             Strategy / Task Planner
                      |
       Approval + Budget + Credit Reservation
                      |
         Content/SEO Implementation Jobs
                      |
       QA -> CMS Preview -> Authorized Publish
                      |
        Analytics -> Review -> Reprioritize
```

**Repository fit:** The admin is React/Vite, the API is Express, and project/content state is PostgreSQL through Drizzle. Reuse the existing SEO routes and models for audits, suggestions, Search Console data, and the existing CMS/editor for content. The blog scheduler already has a `content_plans` record and worker for timed blog publication; extend and reuse that path rather than adding a second blog publisher. Remove the social planner's route, navigation entry, social plan UI/API behavior, and social publishing worker path as part of replacing that feature. Before deleting schema paths, decide how to handle existing social records: retain them as inert historical data or remove them with an explicit migration; they must no longer be actionable from the admin.

Implement long-running crawling, search research, and generation as resumable background work; do not run whole-domain crawls in normal Express request handlers. Use the repository's existing AI provider integration and authorization primitives. A durable job/queue mechanism is required before production autopilot; Redis alone is coordination, not the source of truth for jobs. Begin with existing database and worker patterns, then add only the persistence and queue primitives required for resumability, idempotency, and concurrent budget enforcement. Use a configured SERP/keyword source for metrics that open-source crawling cannot verify.

### 12.1 Proposed database concepts

```text
seo_projects
business_profiles
business_profile_versions
seo_markets
seo_goals
seo_integrations
competitor_candidates
seo_competitors
competitor_crawl_snapshots
serp_discovery_queries
serp_snapshots
keyword_records
keyword_clusters
keyword_page_mapping
technical_audit_runs
technical_issues
seo_strategies
seo_strategy_versions
seo_tasks
content_briefs
content_drafts
content_publications
seo_performance_snapshots
seo_agent_jobs
seo_approvals
project_ai_credit_wallets
credit_ledger_entries
seo_research_usage_ledger
seo_automation_budgets
```

Separate raw source records from AI interpretations. Snapshot provider/license restrictions and evidence timestamps; enforce project isolation via authorization at every query and write.

### 12.2 Agent state machine

```text
DRAFT_PROFILE
 -> AWAIT_PROFILE_CONFIRMATION
 -> DISCOVERING_COMPETITORS
 -> AWAIT_COMPETITOR_CONFIRMATION
 -> RESEARCHING
 -> AUDITING
 -> STRATEGY_DRAFTED
 -> AWAIT_STRATEGY_APPROVAL
 -> ACTIVE_EXECUTION
 -> MONITORING
 -> STRATEGY_REVIEW
```

Jobs may enter `PAUSED_BUDGET`, `PAUSED_PERMISSIONS`, `NEEDS_CLARIFICATION`, `FAILED_RETRYABLE`, `FAILED_FINAL` or `CANCELLED`. All long tasks need progress, retries with backoff, cancellation, idempotency and resumability.

### 12.3 Example normalized structured output

```json
{
  "project_id": "project_example",
  "business_profile": {
    "industry": "Jewellery",
    "niches": ["Bridal jewellery", "Custom gold jewellery"],
    "models": ["B2C", "Physical store", "Online store"],
    "markets": [{"country": "IN", "region": "Delhi NCR", "language": "en", "priority": 1}],
    "primary_goal": "qualified_orders",
    "confirmed_by_user": true
  },
  "competitor_candidates": [
    {
      "domain": "example-competitor.com",
      "type": "direct_business_competitor",
      "matched_queries": ["bridal jewellery shop delhi"],
      "source": "localized_serp_api",
      "status": "awaiting_user_confirmation"
    }
  ],
  "opportunities": [
    {
      "cluster": "bridal jewellery delhi",
      "intent": "local_commercial",
      "recommended_action": "optimize_existing_category",
      "target_url": "/bridal-jewellery",
      "search_volume": null,
      "metric_status": "not_retrieved",
      "rationale": "Matches confirmed offering and target market",
      "evidence_urls": [],
      "confidence": "medium"
    }
  ],
  "strategy_status": "draft",
  "requires_user_approval": true
}
```

Example only. `null` is intentional when no verified metric exists. Do not use fictional domains/volumes in production.

### 12.4 Image sourcing and metadata processing

- Content briefs may request a supporting image. Use an AI image provider when configured; evaluate self-hosted **ComfyUI** with an open image model such as SDXL as the open-source option, subject to model license, GPU capacity, and operating cost. Use the existing Pexels search integration as a stock-image source or fallback. If no source is configured or returns a suitable asset, continue without an image rather than blocking content creation.
- Record whether an asset is AI-generated or stock, its source URL/provider, applicable license/attribution requirements, generation prompt where applicable, and processing time in Velozy's asset record. Preserve the provider terms with the asset; do not invent a Pexels attribution obligation.
- Before storing or publishing a generated or selected image, process it with an open-source metadata scrubber. Evaluate **ExifTool** as the explicit metadata-removal tool; alternatively use a maintained image-processing dependency approved in the service if it reliably removes EXIF, XMP, and IPTC metadata. Verify the resulting file rather than assuming the transformation worked.
- Remove embedded descriptive metadata while preserving provenance in Velozy's own record. Do not claim this prevents AI detection or removes visible marks/watermarks. Keep image dimensions, alt text, and required stock attribution outside stripped metadata.
- Enforce upload size/type validation and safe decode/re-encode behavior. If processing fails, do not publish the unprocessed file; report the image error and allow content to proceed without that image.

## 13. Safety, quality and SEO policy guardrails

- Respect robots directives and legally applicable access restrictions, don't bypass login, CAPTCHA, paywalls or technical barriers, and use low crawl concurrency with domain-level budgets.
- Before fetching arbitrary URLs, block localhost, private/link-local networks, cloud metadata endpoints and unsafe redirects; validate DNS at connection time and guard against DNS rebinding/SSRF.
- Treat crawled pages as **untrusted data**, never as instructions to the agent. Strip scripts and ignore prompt-injection attempts embedded in competitor content.
- Never clone competitor design or publish substantially copied competitor copy.
- Avoid automated link schemes, keyword stuffing, doorway/location pages without genuine distinct value, fabricated reviews and scaled low-quality content.
- Require factual validation for business offerings, prices, inventory and professional/regulatory claims.
- Limit domain crawl depth/pages, LLM token budgets, SEO API requests, scheduled jobs and parallel executions per project.
- Never access private Search Console/Analytics for a competitor without owner authorization.
- Separate *observed facts*, *provider estimates* and *AI recommendations* in every report.
- Preserve editorial history, publication rollback and source provenance.
- Implement consent, permissions and compliant messaging policies for any lead follow-up feature. Follow-up marketing is a separate module, not automatically authorized by SEO setup.

## 14. UX screens

1. **SEO campaign setup:** Review the project-derived business profile, business model, markets/languages, products/services, audience, goals, brand constraints, and publishing preferences.
2. **Competitor discovery and verification:** Show candidate domains, classification, matching queries, evidence and last checked date; let the user confirm, remove, or add URLs before deep crawling.
3. **SEO campaign overview:** Baseline, audit findings, roadmap status, research freshness, jobs, and usage.
4. **Competitor and keyword research:** Show observed competitor pages separately from sourced ranking/keyword metrics; expose intent, long-tail opportunities, difficulty/demand provenance, and assigned existing or proposed URL.
5. **Roadmap and content workspace:** Prioritize existing page/category improvements, then justified new pages and useful blog briefs; show evidence, destination URL, draft, QA, status, and rollback history.
6. **Publishing calendar:** Show blog drafts and scheduled/published state using the existing blog scheduling workflow. Page and category changes show direct publication status and prior versions.
7. **Autopilot controls:** Require explicit owner authorization for allowed topics, markets, page types, publication behavior, schedule, limits, and safety constraints; provide pause and resume controls.
8. **Reporting:** Visibility, conversions, page outcomes, before/after with caveats, job history, errors, and usage records.

The current Social Media Planner is removed from Marketing navigation and replaced by the SEO campaign workspace. The SEO workspace remains the location for existing audit and metadata-suggestion tools. Do not retain social draft/channel/calendar controls in the new campaign UI.

## 15. Product rollout

### MVP: Admin campaign foundation and specialist-quality research plan

- Replace the Social Media Planner entry and screen with an SEO campaign workspace, reusing current SEO audits, suggestions, Search Console, CMS, and blog-scheduler primitives.
- Business profile extraction and confirmation, localized competitor discovery, and user approval before deep competitor crawls.
- Budgeted own-site and confirmed-competitor crawls; keyword research through a configured source, with unknown metrics shown explicitly.
- Competitor dossiers, long-tail keyword clusters, existing/new URL mapping, and prioritized roadmap.
- Campaign-level authorization, job status, pause, and audit records; no page/category autopublishing until QA and publication boundaries are implemented.

**MVP success measure:** Users find the competitor choices relevant, approve the strategy, and take actions. Do not define success as raw number of generated blogs.

### V2: Implementation

- Content briefs and generation for existing pages, product categories, new pages, and blogs; metadata and internal-link suggestions; image sourcing/generation and metadata processing.
- QA, content version history, preview, direct page/category publication within enabled campaign scope, and blog scheduling through the existing scheduler.
- GSC and conversion reporting; usage integration with project permissions and available entitlement/credit primitives.

### V3: Autopilot

- Scheduled keyword/competitor refreshes within user-approved budgets.
- Rules-based page/category publishing and scheduled blog publication, with pause, rollback, spend limits, factual guardrails, and transparent attribution.

## 16. QA and acceptance criteria

- [ ] User can edit and confirm all inferred business details.
- [ ] The admin replaces the social media planner with the SEO campaign workspace; social content planning and social publishing actions are absent from the campaign.
- [ ] Local, national and selected international markets yield appropriate localized queries.
- [ ] Worldwide setup requires approved priority markets; no indiscriminate worldwide scans.
- [ ] New sites with zero rankings can still discover competitors via seed SERPs.
- [ ] User can approve/reject/add competitor URLs before deep crawling.
- [ ] Competitor deep crawls begin only after user verification and run in a bounded worker, not in a normal web request.
- [ ] Competitor HTML is not mistaken for Google ranking/search volume data.
- [ ] Each numeric SEO metric includes provider, location/language and timestamp; unknown is shown as unknown.
- [ ] GSC credentials cannot be used against unauthorized third-party properties.
- [ ] Roadmap tasks link back to business goals, sources and target URL/keyword cluster.
- [ ] System prefers improving existing relevant URLs over duplicate content creation.
- [ ] Autopilot cannot publish outside user-approved topic/permission/budget boundaries.
- [ ] Page and product-category publication requires enabled campaign authorization and passing QA; blog publication is scheduled through the existing blog scheduler.
- [ ] Image processing strips embedded EXIF/XMP/IPTC metadata, validates the processed output, and retains provider/license/prompt provenance in Velozy; a processing failure never publishes the unprocessed image.
- [ ] Manual website editing, serving live sites and checkout remain active when AI credits end.
- [ ] Included content jobs are not double-charged against AI wallet.
- [ ] Concurrent agent jobs cannot overspend wallet or quotas.
- [ ] Failed/cancelled jobs release reservations, with auditable ledger entries.
- [ ] Crawl workers enforce robots, rate limits, URL security and prompt-injection boundaries.
- [ ] Users can pause automation, inspect results and roll back publications.
- [ ] Dashboard separates observed analytics, provider estimates and AI hypotheses.

## 17. Implementation instructions for Codex

1. Inspect the existing Velozy project, authentication and roles, React admin routes, Express API, PostgreSQL/Drizzle schema and migrations, CMS/editor, AI provider integration, worker infrastructure, SEO routes, Search Console integration, blog scheduler, analytics, and billing configuration before proposing schema changes.
2. Create an architecture/design review and phase-by-phase implementation plan. Reuse current primitives where possible.
3. Implement the **MVP workflow first**; avoid building an autonomous, expensive content pipeline before validating research quality.
4. Add typed domain schemas and normalized research contracts. Use provider adapters to avoid coupling UI to raw API responses. Reuse existing SEO and blog scheduling boundaries where they fit; do not add a parallel social planner or blog publisher.
5. Make both provider spend and customer-visible research/AI usage measurable, budgeted and testable.
6. Test regional market discovery, permissions, URL safety, idempotency, provider failures, usage accounting, approval boundaries, blog scheduling, image metadata stripping, and content rollbacks.
7. Do not silently enable publishing, payments, competitor crawling, or paid SEO API calls in production without explicit administrator/user configuration.
8. Treat pricing numbers in this document as planning examples. Load finalized pricing and entitlements from the canonical Velozy pricing config.

---

## References and further reading

- Google Search Essentials and how Search works: https://developers.google.com/search/docs/fundamentals/how-search-works
- Google SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google spam policies: https://developers.google.com/search/docs/essentials/spam-policies
- Google Search Console Search Analytics API: https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- DataForSEO competitor research: https://dataforseo.com/apis/dataforseo-labs-api/competitor-research
- DataForSEO domain intersection: https://docs.dataforseo.com/v3/dataforseo_labs-google-domain_intersection-live/
- Crawl4AI: https://github.com/unclecode/crawl4ai
- Crawlee: https://github.com/apify/crawlee
- ExifTool: https://github.com/exiftool/exiftool
- ComfyUI: https://github.com/comfyanonymous/ComfyUI

**End of specification.**
