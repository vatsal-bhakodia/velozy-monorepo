# Marketing site expansion plan

**Status:** Partially implemented; the salon solution page and its JSON-driven page template are implemented. Remaining pages and tools below are planned work.
**Research checked:** 2026-10-09. **Wix sitemap reference:** User-provided snapshot dated 2026-10-14; not independently crawled. Competitor page structures change; recheck them before implementation.

## Goal

Expand Velozy's marketing site to answer the specific questions people search before choosing a website builder, help visitors start a site, and attract relevant organic traffic. Pages should explain a real Velozy use case and lead naturally to creating a website. Do not promise rankings, traffic, or conversion outcomes.

## What exists today

- The marketing app serves a homepage, `/pricing`, and JSON-backed pages at `/industries/[slug]`. Each solution JSON supplies its route slug; `apps/marketing/src/content/solutions/index.ts` currently registers local entries and is the lookup boundary for a later API source. The salon entry serves `/industries/salon-website-builder` with the shared page template; the previous `/solutions/salon-website` URL permanently redirects there.
- Velozy generates responsive business websites from a business profile and page plan. The intended pricing rules allow one free homepage on a Velozy subdomain, with additional pages/custom domains on paid plans; subscription checkout and authoritative entitlements are still listed as incomplete.
- The repository contains website publishing, forms/enquiries, blog/CMS, commerce workflows, manual on-page SEO and sitemap support. Pricing configuration describes booking and paid AI SEO modules, but the onboarding plan lists the booking lifecycle and competitor-informed SEO workflow as unfinished. Treat configured or planned features as unavailable until the production path works.
- A working paid AI logo generator is also listed as remaining work. Do not imply any of these incomplete capabilities are generally available on a competitor landing page.
- There is no public standalone tools directory in the marketing app today. Existing internal image editing or SEO APIs do not by themselves make a public free tool available.

Before publishing any offer page, confirm the matching capability, entitlement, current price, and working signup path. Keep marketing copy consistent with `pricing_config.json` and the product's actual release state.

## Competitor research and takeaways

Research checked against the competitors' public pages on 2026-10-09. This is a content and product-page review, not a ranking or keyword-volume study.

| Competitor | What they publish | What this means for Velozy |
| --- | --- | --- |
| [Kleap industries](https://kleap.co/industries) | A directory of 13 audience groups, each leading to an industry page. The individual [restaurant page](https://kleap.co/industries/restaurant-website-builder) includes a product-specific headline, menu/booking/enquiry capabilities, real customer examples, setup steps, related restaurant types, and FAQs. The [construction page](https://kleap.co/industries/construction-website-builder) specifies project pages, quote forms, service areas, and an SEO/domain/analytics checklist. | This validates the 13 audience groups in this plan, but the useful asset is the audience-specific workflow and proof. For Velozy, describe what its site generator can actually produce, and don't claim booking, SEO setup, menus, or other integrations that are not live. Make the first pages strong before scaling out the directory. |
| [Kleap tools](https://kleap.co/tools) | A 41-item directory split into Brand & Identity, Name Generators, Content & Copy, Website Tools, and Business Apps & Internal Tools. It includes logo, color, image, copy, SEO, QR and website utilities, plus CRM/inventory/project-management/client-portal/ATS builders. Some entries on the page are explicitly labelled “Currently unavailable”; the directory also says limits differ by tool. | Use category hubs and focused tool URLs, but treat the directory as a competitor's inventory, not a validation that every tool is worth building. Prioritize simple website-preparation utilities Velozy can make real. Exclude internal app builders and tools unrelated to website creation. Do not publish a tool directory entry before the tool works. |
| [Wix business templates](https://www.wix.com/website/templates/html/business) | A large template library with filters for website type and industry. Its business collection links subcategories such as consulting/coaching, marketing, technology, finance, law, and real estate. Template cards say who each design is for and name included features such as blog, events, stores, or bookings. Wix separately markets [website creation](https://www.wix.com/), [SEO features](https://www.wix.com/seo/features), and an [SEO learning hub](https://www.wix.com/seo/learn). | A template/industry directory works best when visitors can inspect genuine examples and filter by intent. Velozy does not have a public template catalog in the marketing app, so initially sell “build a website for this business” with real previews rather than pretending there is a browsable template marketplace. Separate SEO product information from educational SEO guides. |
| [Squarespace local-business templates](https://www.squarespace.com/templates/browse/topic/local-business/type/services) | Templates are browsable by subject and site type; local-business pages focus on services, testimonials, and contact information. Its navigation separates Website, Business, Marketing, and Business Tools. The [free tools hub](https://www.squarespace.com/tools/) promotes five adjacent jobs: business-name ideas, logo creation, image resizing, domain-name ideas, and link-in-bio; the [image resizer](https://www.squarespace.com/tools/image-resizer) is its own functional utility page. | Organize Velozy around the visitor's job (build, grow, prepare assets), then connect each tool to the relevant website workflow. Image sizing is a strong early free tool because it helps users prepare site media and can run locally in the browser. Avoid name/domain availability claims without a live domain data source. |
| [Durable AI website builder](https://durable.com/ai-website-builder) | A focused AI-builder sales page explains the generation flow, editing, SEO/content, templates, customer management, and FAQs. Durable extends into CRM, bookings, name/logo generation and other business services. It also publishes industry and service-business articles, including [restaurant](https://durable.com/blog/ai-website-builder-for-restaurants) and [construction](https://durable.com/blog/ai-website-builder-for-construction) content. | Give Velozy a clear AI-builder page showing input → generated pages → editing → publishing, then use industry pages to show the actual generated output. Business apps beyond Velozy's current website-builder scope are not part of this plan. Treat competitor claims and statistics in their own blogs as their claims, not evidence to repeat. |
| [Hostinger AI Builder](https://www.hostinger.com/ai-builder) | One page distinguishes manual/drag-and-drop building from its conversational/agentic mode and lists sites and web apps it targets. Hostinger also publishes separate AI website-builder and small-business pages and reports creating 44 new template category pages across locales in one release. | Be explicit about Velozy's one generation-and-editing flow and its limits. Create separate pages only for distinct user intent. Don't imitate hundreds of template or locale pages without that inventory and real localized value. |
| [Webflow industry templates](https://webflow.com/templates/search/industry) | A marketplace organized by dozens of industries, with filters for style, one-page/multi-page, free/premium, and sort order. Template cards expose an actual design and purchase/use action. | This directory earns its breadth from a large real template inventory and filtering. It is not a reason to create empty Velozy template category pages. Revisit `/website-templates` only after Velozy can show real, maintained example sites or templates. |
| Wix sitemap (user-provided snapshot, 2026-10-14) | Separates product and feature pages, tools, industry/template groups, comparison pages, blogs/guides, resources, and company pages. It spans website building, ecommerce, domains, business software, portfolios, events, education, creative work, SEO, analytics, accessibility, and security. | Use the taxonomy to check for missing visitor jobs and navigation hubs: product/features, relevant tools, industries, comparisons, and editorial content. Do not copy Wix's full inventory: domains, tax/payments, bookings, CRM, headless, app marketplace, enterprise/developer services, and template marketplace need real Velozy capabilities and proof first. |

### Competitive gap and Velozy's angle

The competitors reviewed cover three different offers: large browsable template inventories (Wix, Webflow, Squarespace), focused AI site generation (Kleap, Durable, Hostinger), and adjacent business utilities (Kleap, Squarespace, Durable). Velozy's most credible near-term organic opportunity is to connect its existing business-profile/page-plan generation to concrete small-business website needs. Its pages should show what the user supplies, the pages Velozy can generate, what the user can edit, what publishing/plan limits apply, and a real preview or example. A long tool catalog, unverified customer examples, unsupported integrations, or a promise to rank would weaken that offer.

Competitor page structures establish content patterns and query themes, not demand. The keyword examples below are intent targets, not volume estimates. A competitor's large sitemap is a taxonomy reference, not evidence that Velozy should publish the same number of pages. Before adding the next wave, check Velozy Search Console and localized SERP/keyword data; record source, country/language, date, intent, and existing Velozy URL to avoid overlap.

## Recommended site map

Create a small number of navigable hubs, then publish focused pages under each. Example URLs are proposed; check for existing redirects and naming conventions before implementation.

### 1. Product and use-case pages

| Page | Search intent / example query | Priority |
| --- | --- | --- |
| `/website-builder` | website builder; small business website builder; build a business website; website builder with contact form; service business website builder | P0; one canonical general product page; describe forms and catalogue enquiries only as implemented |
| `/ai-website-builder` | AI website builder; AI website generator; create a website with AI; AI website builder for small business; generate a business website from a description | P0; explain the Velozy generation/edit/publish flow |
| `/pricing` | website builder pricing; AI website builder pricing; free website builder; free AI website builder | P0; explain the free homepage/subdomain limit and paid plan capabilities from live pricing; do not imply that all features are free |
| `/features` | website builder features; website features for small business | P1; hub only after the listed capabilities and their plan access have been verified |
| `/features/website-editor` | website editor; drag-and-drop website editor | P1; describe the real page builder and editing workflow; do not claim arbitrary HTML editing unless supported |
| `/features/forms-and-enquiries` | website contact forms; website enquiry management | P1; distinguish enquiry capture from CRM or lead-management automation |
| `/features/blog-and-cms` | website builder with blog; website CMS | P1; explain real CMS/blog authoring and publishing access by plan |
| `/features/seo-and-sitemap` | website SEO features; website sitemap | P1; cover implemented metadata, sitemap, and basic on-page controls; keep advanced AI SEO separate until live |
| `/features/online-store` | website builder ecommerce features; online store features | P1 only after checkout, order management, and plan access work end to end |
| `/features/custom-domains` | connect custom domain to website | P1 only after paid entitlements and domain connection flow work end to end |
| `/website-templates` | website templates for small business | P1; only if visitors can browse real examples/templates |
| `/seo-tools` | website SEO tools; SEO tools for small business | P1 after an accurate feature audit; separate built-in basic SEO from the planned paid research/automation module |
| `/ai-seo` | AI SEO tools; SEO automation for small business | P2 after the paid competitor research, strategy, and publishing workflow is actually available |
| `/solutions/online-store` | online store website builder; ecommerce website builder for small business; create an online store | P1; only describe currently supported commerce and checkout |
| `/solutions/bookings` | booking website builder | P1 after booking configuration and public booking flow ship |
| `/solutions/blog` | website builder with blog; business website with a blog; small business blog builder | P1 after blog publishing is available to target plans |
| `/solutions/landing-page` | landing page builder | P2; publish when the product has a clear landing-page workflow |

Keep “small business website builder” on `/website-builder` unless Search Console/SERP research later shows a genuinely different need worth a separate page. Do not create thin pages that target near-synonyms such as “AI website maker” and “AI website creator” with the same copy.

Treat `/features` as a capability index, not a promise to reproduce Wix's complete product catalog. Initially organize verified capabilities into **Build and edit** (AI generation and page editor), **Publish** (pages and domains only when available for the plan), **Content** (pages and blog/CMS), **Capture enquiries** (forms), **Grow** (implemented basic SEO and sitemap), and **Sell online** (only working commerce flows). A feature gets an individual indexable URL only when it has distinct search intent, complete product evidence, a useful example, plan/availability details, and non-duplicative content; otherwise keep it as a section on `/features` or the canonical product page. Do not create separate pages for “drag and drop”, “HTML builder”, “no-code”, “one-page”, or similar labels unless the actual editing capability and distinct intent support those claims.

These query families broaden coverage without requiring one URL per phrase. Treat them as hypotheses to validate against first-party queries and localized SERPs, and assign each phrase to one canonical destination:

| Query family | Example queries | Canonical destination and guardrail |
| --- | --- | --- |
| Free entry point | free website builder; free AI website builder; build a website for free | `/pricing` and `/ai-website-builder`; state clearly that Free covers one homepage on a Velozy subdomain and describe trial AI credits accurately. Do not suggest free custom domains or unlimited pages. |
| Business website creation | small business website builder; create a business website; website creator for small business; no-code website builder | `/website-builder` or `/ai-website-builder` according to the query's AI intent. Explain the actual profile-to-page-plan-to-editing workflow; don't split spelling variants into separate pages. |
| Website features | website builder with contact form; website builder with blog; website builder with custom domain; website builder with SEO tools | Use the relevant product/solution page or feature section. Match each claim to working implementation and plan access; paid billing/entitlement paths must be live before promoting gated features. |
| Store and service workflows | ecommerce website builder; online store builder; booking website builder; website builder for service businesses | Use `/solutions/online-store`, `/solutions/bookings`, or the canonical business page. Only target booking after its public lifecycle works, and store queries after checkout and order management work end to end. |
| Choosing a builder | best website builder for small business; AI website builder vs website builder; Velozy vs [named product]; [competitor] alternative | Start with an evidence-based comparison guide, not a landing page for every competitor. Publish only with dated, verified product comparisons, a clear audience fit, and useful limitations; never imply benchmark results without a reproducible benchmark. |
| Learning before building | how to make a website for a small business; what pages should a business website have; how much does a business website cost; how to create a website with AI | Publish original guides answering the question directly, with examples and costs sourced from current public pricing. Link to one relevant builder/solution page. |

Do not create an indexable page for every keyword variation. Keep free, AI, pricing, feature, and comparison intent on the smallest set of pages that fully answers each intent; use headings, FAQs, and internal links to cover close variants. Create a new route only when SERP intent, product proof, and distinct useful content justify it.

### Comparison pages

Create `/compare` as an index only when at least two reviewed comparisons are ready. Start with the comparisons most relevant to Velozy's positioning; do not generate every “X vs Y” URL found in a competitor sitemap.

| Candidate page | Priority | Publish condition |
| --- | --- | --- |
| `/compare/velozy-vs-wix` | P1 | First Wix-inspired comparison; explain best-fit audience and verified differences in setup, editing, publishing, pricing, and feature availability. |
| `/compare/velozy-vs-squarespace` | P2 | Validate distinct comparison intent and keep pricing/features current from primary sources. |
| `/compare/velozy-vs-wordpress` | P2 | Specify which WordPress product/hosting setup is being compared; avoid treating all WordPress deployments as one product. |
| `/compare/velozy-vs-shopify` | P2 | Publish only for the ecommerce audience and after Velozy's commerce flow is production-ready. |
| `/compare/velozy-vs-webflow` | P3 | Publish if search evidence supports it and the comparison clarifies the different user and site-building needs. |
| `/compare/velozy-vs-hostinger` | P3 | Publish if localized query evidence and current product facts support a useful comparison. |

Every comparison must have an “as of” date, primary-source links, symmetrical criteria, Velozy's real limitations, and a clear explanation of who each option suits. Recheck prices and material feature claims quarterly and before campaigns. Do not invent benchmark results, imply endorsement, use unsupported “best” claims, or create competitor pages whose only change is the competitor name.

### Blog and editorial hub

The marketing app has no public editorial blog route today; the product CMS/blog capability is separate. Add `/blog` and `/blog/[slug]` only when editorial ownership, review, publishing, and maintenance are assigned. Begin with a small set of durable categories and original articles:

| Blog category | Example editorial topics | Guardrail |
| --- | --- | --- |
| Website building | How to make a small-business website; which pages a business website needs; what to prepare before building | Answer the question directly; link to `/website-builder` or `/ai-website-builder` without duplicating their sales copy. |
| AI website creation | How AI website generation works; how to review and edit an AI-generated site | Explain Velozy's actual workflow and limits; do not imply one-click accuracy or guaranteed results. |
| Industry website guides | Menus and contact details for café sites; project/service-area content for contractors; portfolio content for photographers | Complement, do not duplicate, the corresponding industry landing page; include useful editorial detail. |
| Website operations | Page metadata and sitemaps; accessible images and color contrast; preparing images for the web | Teach only verified workflows; distinguish general advice from features Velozy provides. |
| Product updates | New editor, publishing, CMS, or commerce capabilities | Publish only when the change is shipped; date the update and revise related feature pages. |

Keep buying comparisons under `/compare` and in-depth tutorials under `/blog`; do not create thin duplicate articles for each builder, industry, or keyword. Each post needs an author/editor, publication and update dates where relevant, sources for changing claims, canonical metadata, category links, and a contextual product/industry link. Only include published, reviewed articles in the sitemap.

### 2. Industry solutions

Build an industry directory and reusable industry pages for the industries below. Use the descriptive `/industries/[industry]-website-builder` route pattern, as in `/industries/salon-website-builder`; keep the full website-builder keyword phrases in page titles and content. Start with the 13 industries already represented in Kleap's public directory and requested for Velozy:

| Canonical page | Long-tail query themes to validate | Useful audience-specific content |
| --- | --- | --- |
| `/industries/salon-website-builder` | website builder for salons; salon website builder; beauty salon website | Services/treatments, staff, gallery, location, contact; only advertise online appointments after booking works |
| `/industries/cafe-website-builder` | cafe website builder; bakery website builder; cafe website with menu | Menu, hours, address, seasonal specials, catering/enquiries; distinguish cafés/bakeries from full-service restaurants |
| `/industries/church-website-builder` | church website builder; church website design | Service times, ministries, events, directions, community information; donations only if payments support the flow |
| `/industries/construction-website-builder` | construction website builder; contractor website builder; roofing website builder | Trades/services, real project gallery, service area, quote-request form; don't claim estimating software |
| `/industries/education-website-builder` | education website builder; tutor website builder; course website | Courses, teachers, enrollment details, FAQs, enquiry path; avoid claiming a learning-management system |
| `/industries/event-website-builder` | event website builder; event page builder | Program, venue, date/time, practical information, registration/enquiry link; don't claim ticketing unless supported |
| `/industries/fitness-coaching-website-builder` | fitness website builder; personal trainer website builder; coaching website | Coaches, classes, timetable, location, intro/enquiry path; memberships/payments only when supported |
| `/industries/healthcare-website-builder` | healthcare website builder; medical practice website builder; clinic website | Care/service descriptions, team, hours, location, contact; no patient portal, medical advice, or compliance claims unless verified |
| `/industries/law-firm-website-builder` | law firm website builder; attorney website builder; lawyer website | Practice areas, attorney profiles, locations, consultation enquiries; no case outcome claims or legal advice |
| `/industries/nonprofit-website-builder` | nonprofit website builder; charity website builder | Mission, programs, impact evidence, volunteering and contact; donations only where a supported payment flow is live |
| `/industries/professional-services-website-builder` | professional services website builder; consultant website builder; accounting firm website | Expertise, services, team, case studies with permission, and lead enquiry |
| `/industries/real-estate-website-builder` | real estate website builder; realtor website builder; property agent website | Agent profile, local expertise, featured properties and enquiries; no MLS/feed integration claim unless supported |
| `/industries/restaurant-website-builder` | restaurant website builder; restaurant website with menu; restaurant booking website | Menu, hours, address, booking link/enquiry; clearly distinguish reservations from online ordering |

Start with these 13 because the competitor directory already demonstrates an audience taxonomy and Velozy's general business-site generation can produce relevant brochure pages. The query phrases above are hypotheses, not researched volumes. Validate each cluster before publishing; merge overlapping pages if SERP intent is the same. After this set, test dedicated pages for plumbers/electricians/roofers, accounting, photography/portfolio, pet services, wedding vendors, and retail. Webflow's industry inventory and Wix's template filters support these as recognizable template categories, but Velozy should add them only when page examples and customer demand justify them.

Use the broader Wix template sitemap as a candidate taxonomy for the next industry wave, not as a launch checklist:

| Candidate group | Example routes to validate | Page-specific proof needed |
| --- | --- | --- |
| Home and local services | `/industries/plumber-website-builder`, `/industries/electrician-website-builder`, `/industries/cleaning-website-builder`, `/industries/auto-repair-website-builder` | Real service-area, project, quote/enquiry, hours, and contact examples; do not claim dispatch or estimating systems. |
| Professional and business services | `/industries/consultant-website-builder`, `/industries/accountant-website-builder`, `/industries/marketing-agency-website-builder` | Audience-specific service pages, team/proof content, and lead enquiry; regulated claims require review. |
| Creative and portfolio | `/industries/photography-website-builder`, `/industries/graphic-designer-website-builder`, `/industries/architect-website-builder`, `/industries/musician-website-builder` | A real portfolio/gallery structure and authorized sample work; do not imply client or booking marketplace features. |
| Events, travel, and hospitality | `/industries/wedding-website-builder`, `/industries/hotel-website-builder`, `/industries/vacation-rental-website-builder`, `/industries/caterer-website-builder` | Distinct event/property information and enquiry flows; reservations, inventory, or ticketing only after those systems work. |
| Commerce verticals | `/industries/jewelry-store-website-builder`, `/industries/fashion-store-website-builder`, `/industries/handmade-store-website-builder` | End-to-end product catalog, checkout, orders, and plan access; do not target these before commerce readiness. |

Prioritize home services and creative portfolios first if Search Console/SERP research confirms intent and Velozy can show good examples. Merge a candidate into an existing industry page when the audience and expected page structure are substantially the same. Do not create separate indexable pages for every Wix template category, locale, or near-synonym.

Industry pages must be honest about feature dependencies. For example, promote bookings only when booking is usable; present quote forms as enquiries rather than automated estimates; don't advertise a restaurant ordering flow unless checkout and fulfilment support it.

### 3. Tools directory

Create a `/tools` hub with descriptive categories. Kleap's 41-result directory proves that competitors use tools as a traffic entry point, but its own listing marks some tools unavailable and includes broad app-builder features. Velozy should launch a smaller set of complete, website-adjacent tools. Launch individual routes only when the tool is usable and has a clear free/paid policy:

| Tool page | Category | Recommendation |
| --- | --- | --- |
| `/tools/image-resizer` | Website & images | **First free tool.** Browser-local crop/resize with common website and social dimensions, preview, and download. Squarespace offers this as a standalone free utility; it is a direct pre-publishing job for Velozy users. |
| `/tools/image-compressor` | Website & images | **Second free tool.** Compress locally where practical; show actual before/after file size and format. Kleap promotes this exact utility. Never promise a fixed compression percentage. |
| `/tools/favicon-generator` | Brand & identity | **Early free tool.** Turn user text or an uploaded image into downloadable favicon files; directly supports website launch. |
| `/tools/meta-tag-generator` | SEO | **Early free tool.** User enters page topic/name/description and receives editable title/description tags with character guidance and copy. No AI required for a useful first version; don't promise rankings. |
| `/tools/open-graph-preview` | SEO / sharing | **Early free tool.** Preview title, description, and image from user input. State that social platforms may render differently. |
| `/tools/contrast-checker` | Accessibility / design | **Early free tool.** Check chosen foreground/background colors against WCAG contrast thresholds and explain the result. Kleap surfaces this alongside brand tools; it helps make websites readable. |
| `/tools/qr-code-generator` | Website & business utilities | **Optional free tool.** Generate a downloadable QR code for a user-supplied URL; validate the URL and keep generation local. Do not bundle restaurant ordering, payment, or analytics claims into the utility. |
| `/tools/color-picker` | Brand & identity | **Optional free tool.** Return HEX/RGB/HSL values from a chosen color. Simple, but lower acquisition priority than image and SEO preparation tools. |
| `/tools/robots-txt-generator` | SEO | **Later free tool.** Generate a safe, editable file for common cases. Explain that robots.txt controls crawling, not access security; Velozy already plans/presents site-level robots controls on paid tiers. |
| `/tools/json-ld-generator` | SEO | **Later free tool.** Support a narrow set of schema types with validation and warnings. Only generate fields supplied by the user; never fabricate reviews, ratings, addresses, or offers. |
| `/tools/business-name-generator` | Brand & identity | **Later AI tool.** Generate names with clear usage limits. Decide free allowance vs credits only after model cost is measured. Do not promise domain availability without a real registrar/domain check. |
| `/tools/logo-maker` | Brand & identity | **Paid, after implementation.** The product plan calls for a subscription-gated AI logo feature, but onboarding marks it incomplete. Ship only after generation, entitlement checks, usage metering, and purchase path work. |
| `/tools/ai-image-generator` | Images | **Paid, after implementation.** Productize image generation only when available. Show credit cost before generation and explain output rights/limitations. |

Do not build everything in Wix or Kleap's directories. Defer invoice/paystub generators, tax calculators, domain registration/search/availability tools, business cards, YouTube title/tag tools, email marketing, CRM/ATS/inventory/project-management/client-portal builders, mobile apps, headless/enterprise solutions, app marketplaces, and restaurant menu QR ordering. These either target other audiences, require unsupported workflows or data, or do not help the primary website-building journey. Wix title generation is covered by the meta-tag tool rather than a duplicate tool. Invoice generation is a reasonable business-suite feature, but it is not a fit for Velozy's current general website builder. Defer generic AI copy tools until related content generation can be exposed as a trustworthy public tool with metering and useful export. A color palette generator, CSS gradient generator, and button generator may be added later if usage supports a broader design-utility hub.

Free tools should be genuinely usable without hidden account gates. If a tool uses paid AI or a paid third-party API, show its limits and price before the costly action. Keep client files local for image utilities unless remote processing is essential and disclosed.

### 4. Guides and examples

Add a small guides/examples area once the site can maintain original, useful material. Good candidates include:

- How to make a website for a specific business type.
- What pages a business website should include.
- How to prepare business information and images before generating a website.
- How to set up page titles, descriptions, sitemap, and Search Console for a new business website (teach verified product workflows; don't sell it as keyword research).
- Website examples for supported industries, using real Velozy examples with permission or clearly labeled illustrative mockups.
- Learning articles for people choosing a website builder, including how to compare options; keep product-vs-product pages under `/compare`.

Map every guide to a specific audience question and link to a relevant solution/product page. Do not mass-generate generic city pages, thin “X vs Y” pages, or pages that only swap the industry/location name. Local pages require a real local product, service, or evidence-backed example.

## Reusable page template and content ownership

Use a shared page renderer and a small typed content registry for stable solution and product pages. The URL slug selects authored page data; the registry supplies metadata, industry-specific value proposition, supported capabilities, page outline, examples, FAQs, related links, and CTA. Reuse layout and UI, not identical body copy.

Each industry page should include:

1. A specific title, H1, intro, and CTA describing the website need.
2. Audience-relevant pages/sections Velozy can generate (for example, services, menu, team, projects, or contact).
3. Only supported workflows and features, with plan/add-on notes where relevant.
4. Helpful setup checklist and content to prepare.
5. A realistic example or preview that actually matches the industry.
6. Unique FAQs based on real objections and workflow, not keyword variants.
7. Links to related solutions, supported features, pricing, and guides.
8. Page title, description, canonical URL, social metadata, accessible headings/images, and an appropriate structured-data type only when the visible content supports it.

Keep page facts and marketing claims in authored data, not inferred from URL strings. Do not build an open-ended route that returns indexable content for arbitrary query parameters. Unknown slugs should return a real 404. Make pages server-rendered or statically rendered for crawlability, add them to the XML sitemap, and use a canonical URL. Add `noindex` to thin previews, duplicate filtered listings, and unreviewed drafts.

## Keyword and SEO workflow

1. Start with real search terms and questions from verified Velozy Search Console data, support/onboarding questions, and localized keyword/SERP research.
2. Group queries by intent and map one primary intent to one canonical page. Keep informational guides separate from commercial builder and solution pages.
3. Estimate value using product fit, intent, current visibility, conversion path, effort, and verified demand. Treat third-party volume/difficulty as estimates with source/date.
4. Create or update a page only when Velozy can provide distinct, accurate value for the searcher. Merge overlapping targets instead of competing with our own page.
5. Review indexing, impressions, clicks, and conversions after publication. Improve or retire pages that do not serve visitors; don't use traffic projections as guarantees.

For SEO campaigns, follow the [agentic SEO implementation manual](./features/agentic-seo-manual.md): do not invent search volume/rankings; get user confirmation before competitor crawling; respect module access and provider budgets; and do not publish pages automatically outside the user's authorization.

## Phased delivery

### Phase 0 — truthful foundations

- Audit published product capabilities, plan gates, and marketing claims against current code and pricing.
- Add site metadata, canonical URL, sitemap coverage, robots rules, and analytics/Search Console measurement as appropriate.
- Add `/solutions`, `/features`, `/tools`, `/compare`, and `/blog` navigation only as each hub has useful, reviewed initial content.

### Phase 1 — highest-fit organic pages

- The first industry page, `/industries/salon-website-builder`, and its data-driven page template are implemented. The salon page includes its hero, capability cards, creation steps, mid-page CTA, visual showcase, salon site-section examples, practical SEO guidance, FAQs, and final CTA. Build `/website-builder`, `/ai-website-builder`, an industry directory, and the remaining industry pages from the first directory after validating query intent and feature claims.
- Build `/features` around verified Velozy capabilities and publish only the distinct feature detail pages listed above when their workflows and access levels are confirmed.
- Build the reusable page data/template, unique content review, metadata, sitemap, internal links, and 404 behavior at the same time.
- Track impressions, clicks, starts, and published-site conversions by page.

### Phase 2 — useful public utilities

- Release browser-local image resizing and compression, then practical on-page SEO/share-preview utilities.
- Add each tool to a category hub with operating instructions, export, limitations, and links back to a relevant website workflow.
- Add AI name/logo/image tools only after generation, cost disclosure, metering, entitlement, and retry/failure paths work end to end.

### Phase 3 — expansion from evidence

- Publish `/compare/velozy-vs-wix` first after a source-backed product/pricing review; add other comparison routes only when distinct query intent is supported.
- Launch `/blog` with assigned editorial review and the categories above; publish durable how-to and industry guidance before time-sensitive or high-volume output.
- Add the second-wave industries from the Wix-derived candidate groups only where search evidence, onboarding fit, and real example sites support unique pages.
- Add remaining supported product/use-case pages and real examples where query data and onboarding fit support them.
- Refresh pages from performance data; remove duplicate or unsupported offers.

## Acceptance criteria

- Every indexable page has one clear search intent, a descriptive title/H1, original helpful content, metadata, canonical URL, and a relevant next step.
- A shared template creates consistent accessible layouts while page data contains genuinely industry-specific content and real capability claims.
- Sitemap contains only canonical, indexable published pages. Unknown slugs return 404; duplicate and low-value views are not indexed.
- `/features` lists only verified capabilities; each feature detail page explains actual behavior, limitations, and plan availability.
- Industry expansion is drawn from the documented candidate list and requires distinct audience value and a real example before indexing.
- Comparison pages contain dated, source-backed facts, explain Velozy's limitations, and receive quarterly and pre-campaign reviews.
- Blog posts have editorial ownership, review, canonical metadata, and source/update handling; only approved published posts enter the sitemap.
- All page claims match working capabilities and published plan access; roadmap items are labeled as unavailable until launched.
- Tools disclose what is local, uploaded, metered, free, or paid before the user acts. Costly operations have server-side entitlement, authorization, usage limits, and failure handling.
- Analytics can distinguish organic landings and conversion starts by page without claiming SEO results are guaranteed.
