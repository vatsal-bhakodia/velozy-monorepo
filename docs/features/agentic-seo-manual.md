# Velozy SEO Engine: Agent Implementation Manual

**Version:** 1.0  
**Prepared:** 2026-10-14  
**Status:** implementation instructions, **not** a claim that the code already exists  
**Intended reader:** Codex or another coding agent working inside the actual Velozy repository; reviewing engineers and product QA  
**Primary implementation target:** production-grade, multi-tenant SEO capability inside Velozy, not a Surfer UI clone  
**Source of product truth:** This manual, current repository behavior, and canonical product configuration such as [`../pricing_config.json`](../pricing_config.json). Read this manual and trace the actual implementation before any code changes. This document specifies an implementation order, algorithms, interfaces and verification gates. Where a proposed design conflicts with an explicit authorization, credit, existing blog-scheduler, or SEO-scoring invariant, preserve that invariant and log an ADR for other conflicts.

> **Operator warning:** This is a precise engineering plan, not a license for blind autonomous changes. The agent MUST inspect the actual repo and report discrepancies before executing migrations, purchases, integrations or production publishing. Sample paths below are *suggested* names, not assertions about the current repository. Vendor APIs and prices change: verify contracts against the current docs before coding. All scoring weights, classification thresholds, latency/capacity SLOs and algorithms tagged **proposed** require evaluation and calibration; never present them as scientifically validated or as Google's ranking formula.

---

# PART A. OPERATING CONTRACT FOR THE CODING AGENT

## A0. Success definition

A website owner should be able to: connect/confirm their site -> understand its actual SEO problems -> identify relevant markets, rivals, keywords and topic clusters -> distinguish existing coverage from opportunities -> edit useful native content with evidence-backed guidance -> review and publish reversible fixes -> measure actual results. Make that flow work end-to-end before enabling high-volume generation or autopilot.

**Non-negotiable properties**

1. One shared, versioned SEO evidence platform powers audit, research, SERP analysis, Topical Map, Content Editor, recommendations and reporting.
2. `unknown`, `not available`, `not indexed`, `estimated`, and numeric `0` are different states. Never invent SV, KD, positions, competitor analytics or citations.
3. The *offline/free* editor hygiene score and AI answer-readiness checks are distinct from *SERP-informed* content fitness. No SEO score predicts rank.
4. A keyword cluster groups queries that can satisfy **one primary search intent on one canonical page**. A topic hub groups adjacent clusters, even when separate pages are justified.
5. Existing relevant pages take priority over automatically generating a new page. No doorway pages, thin pages, repetitive city pages, copied competitor text or keyword-stuffed templates.
6. Every paid operation is scoped, pre-budgeted, deduplicated, traceable, cancelable and reconciled. **No provider call during a local editor keystroke.**
7. Crawler, OAuth, team isolation, LLM input and publishing permissions are security boundaries, not optional QA tasks.
8. Research/preview by default; owner-specified autopilot requires an exact, bounded authorization. Existing scheduled blog publisher remains the only blog publication path.
9. Published Velozy sites, checkout and manual editing must work even if the SEO provider, queue or wallet is down.
10. Code must ship with tests, migrations, operational metrics and rollback paths. Never mark a milestone complete because the UI looks plausible.
11. The SEO campaign workspace replaces the Social Media Planner in the admin. It is an on-page SEO workflow; do not retain social-channel drafts, calendars, or publishing actions in that workspace.

## A1. Required agent workflow, for EVERY task

Execute one numbered milestone at a time. Do not start a dependent milestone until its **Gate** passes.

```text
READ current repo + specifications
  -> INVENTORY existing implementation and tests
  -> DESIGN small scoped change; document alternatives
  -> WRITE tests / fixtures for expected behavior
  -> IMPLEMENT smallest functional slice
  -> RUN format/lint/typecheck/unit/integration as available
  -> CHECK security, tenant scope, costs and regressions
  -> EXERCISE real feature via local app / preview
  -> DOCUMENT migration, new env vars, operational behavior
  -> PRESENT commit-sized summary + proof + unresolved risks
  -> WAIT for explicit owner approval at any irreversible or paid boundary
  -> START next milestone
```

At the end of each milestone, create/update `docs/seo/implementation-log.md` with:

```md
### M##: <milestone>
- Repo paths actually changed:
- DB migrations and reversibility:
- API routes and worker/job changes:
- Features implemented vs intentionally deferred:
- Test commands and exact results:
- Manually verified scenarios and screenshots/links if available:
- Data provenance and estimated recurring provider cost:
- Observability and rollback steps:
- Security review / project isolation checks:
- Risks and blocking decisions:
- Exit gate: PASS / FAIL (evidence)
```

**Agent must NOT**: install external paid services; enable live API spending; delete historical social records; deploy or migrate production; enable autopublishing; reset customer content; invent missing credentials; bypass robots/login/captcha; silently weaken security rules; or publish content without owner authorization.

## A2. Repository reconnaissance, before editing ANY code

**M00: Discover and record reality.** The previous blueprint assumes React/Vite admin, Express API, PostgreSQL/Drizzle, a Next/React publishing renderer, SEO routes, GSC integration, a scheduled blog system and project/team authorization. These are hypotheses until verified in repo.

Tasks:

1. Print workspace tree, package-manager lockfiles, workspaces, applications, libraries, CI workflows, migration history, deploy manifests and runtime versions. Prefer repo-native tools/commands.
2. Locate authorization functions, tenant/project/site relations, page-builder AST/block model, CMS/blog/product/collection/dynamic collection entities, URL router, renderer, sitemap/robots/canonical controls, asset/image handling, background jobs, events/outbox, GSC OAuth and server analytics. Search symbols and follow call paths, not just filename matches.
3. Identify any existing SEO audits, checklists, metadata editors, search queries, social marketing planner and scheduled blog writer. Determine what to reuse, replace or migrate. **Do not create duplicate tables, routes, publisher or credits ledger.**
4. Trace publish transaction end-to-end: editor -> saved revision -> deployment -> publicly rendered HTML. Record the canonical document revision identifier and preview URL mechanism.
5. Record baseline test status, missing test harnesses, queue implementation, secrets management, API/provider cost telemetry, production backup restore procedure.
6. Produce `docs/seo/00-repository-inventory.md` and `docs/seo/00-adr-register.md`. Mark assumptions `confirmed`, `contradicted`, `unverified`.
7. List 3 to 10 concrete decisions blocking safe implementation; propose defaults and ask owner only where consequences are meaningful. Continue on no-cost, isolated code if possible.

**Gate M00:** repository inventory identifies exact reuse hooks for auth, DB, editor, GSC, queue/scheduler, CMS, publishing and metering. Zero schema changes made. CI baseline known.

## A3. Dependency map and incremental delivery

```text
M00 repo inventory
  -> M01 contracts + architecture
  -> M02 persistence + migrations
  -> M03 tenant/authorization + activity audit
  -> M04 durable jobs + billing guardrails
  -> M05 native SEO foundation / CMS inventory
  -> M06 GSC + baseline metrics
  -> M07 safe own-site crawl + technical audits
  -> M08 localized SERP/keyword provider adapters
  -> M09 business profile / markets / onboarding
  -> M10 competitor discovery + dossiers
  -> M11 keyword acquisition, dedupe, metrics, intent
  -> M12 hybrid clustering + page mapping
  -> M13 coverage + Topical Map table/map
  -> M14 SERP Analyzer + evidence-based guidelines
  -> M15 deterministic editor hygiene/readiness scores
  -> M16 Content Audit + recommendation/action queue
  -> M17 internal link graph + safe insertion
  -> M18 content briefs / grounded AI writing
  -> M19 diff-based optimizer + content QA + publishing
  -> M20 strategy/roadmap and reporting
  -> M21 rank monitoring + specialty SEO (gated)
  -> M22 controlled autopilot (gated)
  -> M23 AI answer visibility measurement (gated)
  -> M24 scale, security, evaluation and release validation
```

This is a dependency order, not a single linear engineering sprint: M15's **local scoring core can be developed alongside M05**; M09 can be designed with M03; M24's test harness, telemetry and security requirements begin at M01 and are enforced continuously. The expensive dependent features MUST wait for evidence platform and safety gates.

**Suggested branch policy:** one milestone or cohesive submilestone per PR, schema changes forward-only and expand/migrate/contract, feature flags for every unproven path, migrations in staging before production.

## A4. Definitions and naming

- **Tenant**: billing/security organization or customer account.
- **Project**: Velozy workspace/site-management project with team roles.
- **Site**: owned published website(s), mapped domains and URL spaces, including preview/prod separation.
- **Market**: search engine + country/region/city target + language + device + optional search-vertical; never generic 'worldwide' SERP.
- **SEO Document**: one indexable or intentionally nonindexable publishable native entity (page, blog, product, collection, dynamic detail/template instance). It has a canonical URL and content revision.
- **Keyword**: locale-sensitive search query string, with original text and stable normalized key.
- **Keyword Metric**: provider- and date-specific estimate, not a timeless property of a keyword.
- **Intent Cluster**: phrases normally answered by one primary page with a consistent intent.
- **Topic Hub**: related intent clusters requiring potentially different pages.
- **Evidence**: permissioned fact/observation with source, context, timestamp, version and rights.
- **Recommendation**: explainable proposed action, evidence and expected business reason.
- **ChangeSet**: immutable reviewed patch over known content revision, not a direct LLM overwrite.
- **Job**: resumable, bounded work unit with owner, budget reservation, state and input fingerprint.

---

# PART B. SYSTEM DESIGN TO IMPLEMENT

## B1. Service topology; keep existing stack unless evidence requires change

```text
        Velozy Admin React/Vite + Native Page/Blog/Store Editors
                          | HTTPS (project-scoped)
                          v
                    Express API/BFF
      Auth / RBAC / input validation / usage quotation / approvals
                          |
              +-----------+---------------+
              |                           |
       PostgreSQL/Drizzle             Durable outbox
   canonical business state,                 |
   research records, job state               v
   revisions, credits ledger        Worker lease/dispatcher
              |                 +----+----+-------+---------+
              |                 |         |       |         |
          Evidence API       Crawl     Research   AI      Publisher
             / cache        worker     worker    worker   adaptor
              |                 |         |       |         |
              +-----------------+---------+-------+---------+
                       |         |         |
                    Site CMS  SERP/keyword  GSC/CrUX/etc
                       |
                  deployment events
                       |
             audit + perf + coverage refresh
```

**Start lean:** deploy independent worker processes sharing TS packages, Postgres and current queue infrastructure. Use Redis/BullMQ or similar if already present or justified by contention; database is durable system of record. Enqueue through transactionally persisted job/outbox. No synchronous whole-site crawl or content generation in an HTTP request.

**Suggested package boundaries** (map to actual repo instead of copying paths blindly):

```text
packages/seo-contracts/     # Zod DTOs, discriminated unions, job types
packages/seo-core/          # pure URL, locale, scoring, ranking, matching algorithms
packages/seo-documents/     # own-CMS content adapters / render extraction
packages/seo-providers/     # GSC, SERP, keyword, CWV, AI adapter interfaces
apps/api/.../seo/           # RBAC, REST controllers, approval, usage quotes
apps/worker/.../seo/        # durable tasks, fetch, clustering, QA, monitoring
apps/admin/.../seo/         # business onboarding, tables, map, recommendations
```

**Service boundary rule:** `seo-core` has no `fetch`, DB connection, provider SDK, browser DOM, LLM calls or React dependencies. Put pure algorithms and type-driven tests here.

## B2. Core typed contracts (code the types before tables and UI)

```ts
import { z } from 'zod';

export const Market = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  engine: z.enum(['google']).default('google'),
  country: z.string().length(2),                // ISO 3166-1 alpha-2
  subdivision: z.string().nullable(),          // user-facing region, if needed
  city: z.string().nullable(),
  providerLocationCode: z.string().nullable(), // resolved from provider catalog
  language: z.string().min(2),                 // BCP-47, e.g. en, hi, en-IN
  device: z.enum(['desktop', 'mobile']),
  priority: z.number().int().min(1),
  isConfirmed: z.boolean()
});

export const DataState = z.enum([
  'ok', 'partial', 'unknown', 'unavailable', 'stale', 'provider_failed', 'not_applicable'
]);

export const Evidence = z.object({
  id: z.string().uuid(), projectId: z.string().uuid(), siteId: z.string().uuid(),
  kind: z.enum(['native','user_confirmed','gsc','serp','keyword_provider','crawl','crux','analytics','ai_sample']),
  provider: z.string().nullable(), sourceRef: z.string().nullable(),
  marketId: z.string().uuid().nullable(), observedAt: z.string().datetime(),
  ingestedAt: z.string().datetime(), expiresAt: z.string().datetime().nullable(),
  confidence: z.enum(['observed','estimated','inferred','unverified']),
  licenseClass: z.string(), extractorVersion: z.string(), payloadVersion: z.number().int(),
  dataState: DataState,
});

export const Metric = z.object({
  value: z.number().finite().nullable(),
  unit: z.enum(['searches_month','percent','position','score','clicks','impressions','currency','milliseconds']),
  sourceEvidenceId: z.string().uuid().nullable(), dataState: DataState,
  // No value does not mean zero. No source => not displayable as factual observation.
});

export const ClusterCoverage = z.enum([
  'covered_verified','covered_partial','candidate_existing','planned',
  'missing','unknown','not_applicable'
]);

export type ChangePatch = {
  op: 'replace_text'|'insert_link'|'update_metadata'|'insert_section'|'remove_section';
  documentId: string; baseRevision: string; anchorNodeId?: string;
  beforeHash: string; afterData: unknown; justification: string;
  evidenceIds: string[];
};
```

**Contract rules:** IDs must match real repo ID types after inventory. Use Zod `safeParse` at every trust boundary. Distinguish `undefined` (field omitted), `null` (explicitly unknown) and `0` (observed/estimated zero). Add `schema_version`, `calibration_version`, and `analysis_version` to all versionable outputs. Tenant and project IDs come from authenticated context, never trusted only from request payload.

## B3. Standard API response and error model

```json
{
  "data": { "id": "...", "state": "partial" },
  "meta": {
    "generatedAt": "2026-10-14T00:00:00Z",
    "sourceCount": 8,
    "analysisVersion": "keyword-cluster-v1",
    "limits": { "requested": 100, "returned": 80 },
    "warnings": ["Search volume unavailable in this market"]
  }
}
```

`ProblemDetails`: `{ code, message, retryable, correlationId, fieldErrors? }`. Expected errors: `NO_SITE_ACCESS`, `GSC_PROPERTY_NOT_VERIFIED`, `MARKET_UNSUPPORTED`, `DATA_UNAVAILABLE`, `BUDGET_EXCEEDED`, `STALE_DOCUMENT_REVISION`, `APPROVAL_REQUIRED`, `PROVIDER_QUOTA`, `JOB_CANCELLED`, `SOURCE_LICENSE_RESTRICTED`. Do not convert failures into empty '0 issues' dashboards.

## B4. Data storage: implement around existing schemas, not in parallel

**Use/extend existing objects when present:** users/team roles, projects, sites, pages, posts, products, categories, dynamic collection records, assets, content versions, content plans, credit wallets, analytics events, publication history.

**Proposed minimal new relations:**

| Relation | Purpose | Required indexes / constraints |
|---|---|---|
| `seo_business_profile_versions` | confirmed offerings, intent/claims, owner version | unique(project, version); project FK |
| `seo_markets` | exact search contexts | unique(project, engine, country, subdivision, city, language, device) |
| `seo_integrations` | GSC connection and site authorization metadata | unique(project, provider, external_property); encrypted refresh-token reference |
| `seo_documents` | canonical native URL/page inventory + revision | unique(site, document_type, native_id); indexed(site, canonical_url) |
| `seo_evidence` | normalized provenance registry | indexes(site, kind, observed_at), (project, source_ref) |
| `seo_crawl_runs`, `seo_crawl_pages`, `seo_audit_issues` | crawl execution, normalized extracts and deduped findings | unique(run, normalized_url); unique(site, rule_id, target_fingerprint) |
| `seo_serp_snapshots`, `seo_serp_results` | licensed SERP observations | unique(provider, input_fingerprint, observed_bucket); (snapshot, organic_rank) |
| `seo_keywords`, `seo_keyword_metrics` | query lexicon + dated estimates | unique(market, language, normalized_text); (keyword, provider, observed_at) |
| `seo_keyword_sources` | seed lineage / origin | unique(keyword, source_type, source_ref) |
| `seo_competitor_candidates`, `seo_competitors` | classified and approved competitors | unique(site, market, root_domain, kind) |
| `seo_topic_hubs`, `seo_clusters`, `seo_cluster_keywords` | map hierarchy and stable membership | unique(cluster, keyword); market/hub indexes |
| `seo_cluster_lineage` | split/merge continuity | (old_cluster, new_cluster, operation_version) |
| `seo_cluster_page_mappings`, `seo_coverage_assessments` | mapped existing/new page and defensible coverage | unique(cluster, page, mapping_version); (cluster, assessed_at) |
| `seo_serp_guidelines`, `seo_content_evaluations` | reproducible editor evaluation and corpus features | (cluster, corpus_fingerprint); (document, revision, rubric_version) |
| `seo_recommendations`, `seo_strategy_versions`, `seo_tasks`, `seo_content_briefs` | action plan with supporting evidence | unique(site, recommendation_fingerprint) |
| `seo_changesets`, `seo_change_patches`, `seo_publication_events` | safe native content changes and rollback | unique(document, base_revision, changeset_nonce) |
| `seo_gsc_daily`, `seo_rank_observations` | first-party performance and separate rank checks | (site, date, dimensions) and (tracked_keyword, observed_at) |
| `seo_jobs`, `seo_job_attempts`, `seo_outbox` | durable jobs/worker handoff | unique(project, idempotency_key); (status, run_after, priority) |
| `seo_usage_reservations`, `seo_usage_ledger` | reservation/spend/refund atomicity | unique(project, operation_key); immutable ledger |
| `seo_campaign_permissions`, `seo_approvals`, `seo_activity` | role-limited authorization and audit | (site, action, status); actor/date |

**Never** copy 27 table names blindly. Use a schema diff against actual repo and an ADR per reuse decision. Prefer scoped composite foreign keys where possible; every child row must be scoped by site/project or safely join through scoped parent. Use Postgres JSONB for extensible provider payloads (where permitted), but typed columns for joins, statuses, scores, dates and foreign keys. Use `timestamptz` UTC; store original market timezone where required for aggregation.

**Minimal SQL illustrative pattern** (translate to Drizzle schema and actual key types):

```sql
CREATE TABLE seo_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  site_id uuid NOT NULL,
  type text NOT NULL,
  state text NOT NULL CHECK (state IN
    ('queued','reserved','running','retry_wait','paused_budget',
     'paused_permission','succeeded','failed_final','cancelled')),
  idempotency_key text NOT NULL,
  payload_json jsonb NOT NULL,
  payload_schema_version integer NOT NULL,
  input_hash text NOT NULL,
  attempt integer NOT NULL DEFAULT 0,
  lease_owner text,
  lease_until timestamptz,
  run_after timestamptz NOT NULL DEFAULT now(),
  progress_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, idempotency_key)
);
CREATE INDEX seo_jobs_dispatch_idx ON seo_jobs (state, run_after)
  WHERE state IN ('queued','retry_wait');
```

**Migration method:** 1) additive nullable schema 2) backfill with recorded cursors 3) dual-read or compatibility adapter 4) validation checks 5) flip feature flag 6) enforce constraints 7) remove obsolete paths only in later version. Test empty database, old database, partial migration and rollback. Don't use `DROP TABLE` for social history absent explicit owner decision.

## B5. Evidence, licensing and snapshots

For each source store: source kind, provider, external URL/opaque ID, source capture context, observed time, ingestion time, TTL, rights class, raw-data retention policy, extraction version, normalized fact value, confidence and status. Evidence references should be immutable; a newer observation adds a new row/version. Expiry does not delete the reason historical decisions were made, subject to license and privacy retention.

**Access tiers:**
- native site/public crawl: source excerpts subject to site ownership, crawl rights and retention;
- GSC: strictly customer-property-specific, encrypted OAuth credentials; never cross-share;
- SERP/paid keyword: only cache/store/redistribute per provider contract, tenant-visible metrics as allowed;
- competitor page extracts: minimum necessary structured facts, bounded retention; do not keep full copyrighted bodies by default;
- generated editorial content: user-owned project content with clear version/history;
- AI sample observations: prompt/model/region/time/mode and raw cited URLs when rights allow.

Every recommendation must be explainable using supporting evidence IDs and must have a freshness policy. If missing or expired, mark it and schedule refresh only when budget exists.

## B6. Permissions and ownership matrix

| Action | Viewer | Editor | Project admin | Owner |
|---|---:|---:|---:|---:|
| Read audit/map/performance | yes (project scoped) | yes | yes | yes |
| Modify target keyword/page mapping | no | optionally (configured) | yes | yes |
| Start paid research | no | only with delegated budget | yes with budget | yes |
| Draft proposed content | no | yes | yes | yes |
| Publish manually | no | per existing CMS permission | yes | yes |
| Approve autopilot scope/new market/budget | no | no | no unless explicitly delegated | yes |
| Change campaign permissions / connect Google property | no | no | only under approved policy | yes |
| View billing, revoke OAuth / pause autopilot | no | no | policy dependent | yes |

Enforce in API, worker (re-check at execution), DB query and publisher; UI hiding is not authorization. Each approval binds `{owner, project, site, actionTypes, pageTypes, markets, maxSpend, maxFrequency, expiry, contentPolicyVersion, authorizationRevision}`. Revocation increments the revision; running publish commits must re-check it.

---
# PART C. BUILD MILESTONES: FOUNDATION AND RESEARCH

## M01. Shared contracts and architecture decisions

**Dependencies:** M00. **Create:** contract package, Zod schemas, OpenAPI generation or maintained OpenAPI, ADRs, unit-test harness.

Procedure:
1. Map existing project/site/user IDs and error/response conventions to the B2 schemas. Decide names and types. Keep core schemas versioned.
2. Implement pure normalization helpers for markets, dates, URL identity, keyword identity, provider evidence and document type. Keep external input distinct from trusted normalized state.
3. Define provider interface `SearchProvider`, `KeywordProvider`, `GscProvider`, `PageMetricsProvider` and `EmbeddingProvider` with explicit support/capabilities, per-call quote and data rights.
4. Define REST DTOs for start/status/result of asynchronous research and for read-only paginated lists.
5. Define discriminated union for `SeoJobPayload` by job type, each with Zod validation and payload version, and `SeoJobResult` by type.
6. Define stable classification enumerations. No free-form status strings invented in controllers.
7. Document every environment variable that might be needed; feature remains disabled until configured.

**Test fixtures:** valid/invalid locale, empty result, unknown metric, pre-expired evidence, unsupported device, non-URL canonical and malformed AI JSON. Strict round-trip serialization.

**Gate:** contracts compile independently, generator produces accurate OpenAPI, tests cover invalid input and schema upgrades, ADRs describe chosen queue and evidence retention.

## M02. Persistence, migration framework and query isolation

**Dependencies:** M01. **Create:** Drizzle schema migrations, indexes and scoped repositories; seed factories.

Procedure:
1. Compare B4 with existing SQL tables. Avoid a second copy of documents, credit wallets, published content and blog scheduling.
2. Write a migration for **minimum end-to-end slice only**: profiles, markets, documents, evidence, jobs and activity. Grow schema with feature migrations.
3. Every repository function takes server-derived `ProjectScope { tenantId, projectId, siteId, actor }`. No general `findById(id)` for tenant-owned data.
4. Add DB constraints: not-null FKs, unique idempotency keys, checks for finite nonnegative metrics, unique normalized keywords, valid legal states and revision numbers.
5. Add a `schema_version` to JSON payloads; when payload changes, create data upgrader, do not treat old records as new shapes.
6. Implement cursor-paginated queries with order `(created_at,id)` (or deterministic `(priority,id)` for relevance). Use composite indexes to prevent table scans.
7. Validate schema with forward/backward compatible migration tests. Export and inspect EXPLAIN plans on 100k synthetic rows for key queries.

**Security invariant:** Querying a valid document ID belonging to another project returns same not-found behavior as nonexistent ID. Test cross-tenant joins, bulk mutations, evidence joins and worker job reads.

**Gate:** fresh/stale database migrations pass, seed/rollback run where supported, no cross-tenant access, index plans reviewed, no destructive changes.

## M03. Audit, role checks and scoped approvals

**Dependencies:** M01/M02.

1. Wrap existing auth middleware with `requireSeoPermission(project, action)`, using current team-role model.
2. Define `SeoAction`: `seo.read`, `seo.edit_mapping`, `seo.research_paid`, `seo.draft`, `seo.approve_change`, `seo.publish`, `seo.autopilot_manage`, `seo.integrations_manage`.
3. Persist user, role, source IP or session fingerprint where legally appropriate, action, object ID, prior state, new state, correlated job and timestamp.
4. Build approval API to bind a *specific* strategy revision or changeset hash, not a mutable free-text promise.
5. On role reduction, owner revocation or project suspension, invalidate future runs and prevent publication at transaction boundary.
6. Ensure social planner replacement only changes intended navigation/workflows. Preserve historical records until an approved migration.

**Gate:** negative tests for unauthorized access, stale approvals, revoked owner scope, missing role and cross-project work all pass.

## M04. Durable jobs, operational quotas and credit reservations

**Dependencies:** M02/M03. **This is mandatory before paid SERP/crawl/LLM actions.**

### Entitlement and package boundaries

| Layer | Required behavior |
|---|---|
| Website foundation | Include basic manual on-page SEO and site controls according to the active website plan. Manual editor changes do not spend AI credits. |
| General AI wallet | Meter general AI generation separately from the SEO package allowance; apply project roles and spending limits. |
| SEO Growth | Grant the configured competitor, research, tracking, audit, roadmap, and included content allowances. |
| SEO Autopilot | Be mutually exclusive with Growth, not stacked; add only its configured higher limits, schedules, and explicitly authorized automation. |
| Communications | Keep email/SMS/WhatsApp delivery usage separate from SEO research and AI writing allowances. |

Read prices, entitlements, limits, allowance quantities, and package inclusion from [`../pricing_config.json`](../pricing_config.json) and the authoritative entitlement service. Do not duplicate numeric prices or limits in SEO code or this manual. Included standard content jobs must not also debit the general AI wallet; charge for extra work only after its allowance is exhausted and the user approves the quoted charge. Paid research pauses when its budget is exhausted, while published sites, checkout, stored reports, and manual editing remain available. No surprise overages or automatic top-ups without explicit owner opt-in and a cap.

### Data/state model

```text
queued -> reserved -> running -> succeeded
               \-> retry_wait -> running
               \-> paused_budget / paused_permission
               \-> cancelled / failed_final
```

`run_id`, `input_hash`, `cursor`, `lease_until`, `cost_quote`, `reservation_id`, `config_version`, `auth_revision`, `attempt`, `last_error_code`, `result_id` must be durable.

**Algorithm: transactional enqueue + outbox**

```text
POST /seo/.../research with Idempotency-Key:
  authorize actor, validate input and market
  compute canonical input fingerprint (canonical JSON + provider/schema/version)
  find cached still-valid results if permitted
  compute explicit max paid cost + project quota estimate
  BEGIN DB TRANSACTION:
     check entitlement and ownership
     insert-or-select unique project/idempotency_key job
     if new: reserve quota/wallet balance with row lock or atomic UPDATE
     if new: insert outbox event
  COMMIT
  return 202 {jobId, quote, statusUrl} (or cached 200)

Dispatcher:
  read unsent outbox events with row locking, enqueue execution, mark sent
Worker:
  atomically lease due job (FOR UPDATE SKIP LOCKED or equivalent)
  revalidate auth revision, budget, data/provider policy
  check persisted cursor & completed substeps
  call providers with operation-specific idempotency where supported
  save each observation and cost atomically; checkpoint cursor
  on success publish immutable result and settle reservation
  on retryable failure backoff+jitter; respect Retry-After
  on permanent failure settle actually billable external cost per published policy,
    release unspent reserved units; never make balances negative
```

**Critical ambiguity:** external APIs may bill even if the network times out. Record a call-attempt ID *before* dispatch, provider task ID afterward, and reconcile before retrying ambiguous paid requests. Avoid automatic blind retries of chargeable POST calls without provider idempotency/retrieval. Reservations are internal money/accounting records and require a separate immutable ledger for customer-facing units and platform actual costs.

**Failure cases:** crash after reservation but before enqueue, crash after provider bill but before response, worker dies mid-crawl, provider rate limit, user cancels, plan expires, auth revoked, concurrent identical requests, duplicate outbox delivery, replay after deployment. Add reaper for expired leases and reconciliation sweeper.

**Gate:** automated concurrency test runs 100 simultaneous same/different-key requests and proves no negative credit, duplicate charge or duplicate publish. Kill worker during each state transition; show resumability. Queue can be empty/disabled without taking production site down.

## M05. Native site SEO foundation and rendered document inventory

**Dependencies:** M02. **Work on actual published HTML, not editor preview markup.**

### Native document adapter

```ts
type SeoDocument = {
  siteId: string; documentId: string; type: 'page'|'blog'|'product'|'collection'|'dynamic_detail'|'dynamic_index';
  nativeId: string; canonicalUrl: string; publicUrl: string;
  publicationState: 'draft'|'scheduled'|'published'|'archived';
  revision: string; templateId?: string; locale: string;
  title: string | null; description: string | null; h1: string[];
  bodyText: string; sectionAst: SeoNode[]; images: ImageOccurrence[]; links: LinkOccurrence[];
  robots: { indexAllowed: boolean; followAllowed: boolean; evidence: string[] };
  sourceHash: string; extractionVersion: string;
};
```

Create adapters that transform **page-builder structured blocks**, blog HTML, products, categories, and dynamic collection template+instance content into this representation. Do not `replace(/<[^>]+>/g,'')` to parse HTML. Use a maintained HTML parser for legacy HTML, and native AST for the builder. Exclude invisible elements, script/style, navigation/footer boilerplate, editor controls, duplicated global layout components. Distinguish meaningful and decorative images and only count visible content. Use Unicode word segmentation and handle mixed Hindi/English safely.

### Rendered SEO invariants

1. Stable canonical URL per intended indexable document; respect domain, deployment, locales, pagination and query/variant policies.
2. `robots.txt`, meta robots and X-Robots-Tag are consistent with route purpose; staging/admin/private routes not in public sitemap.
3. Sitemap lists only appropriate published canonical URLs, with valid `<loc>` and truthful `lastmod` when available. Chunk/index for large sites. Never publish unpublished dynamic instances.
4. SSR/prerender returns useful content in server HTML; don't depend on client hydration for critical title, headings, links, product data or text.
5. `title`, meta description, canonical, OpenGraph, hreflang if configured and relevant JSON-LD generated from verified native data. No fabricated ratings/reviews. Validate schema eligibility and completeness by page type.
6. HTTP 404/410/301/302 and canonical behavior correct on old routes and domain mappings. Do not redirect unrelated deleted pages to homepage by default.
7. One primary H1 guideline does not mean automatically rewriting a legitimate page. Expose human-review warnings where appropriate.
8. Dynamic collections: template-level defaults, per-record overrides, inherited fields, locale prefixes, pagination, faceted filtering, route collisions, structured data and conditional `noindex` safeguards.
9. Add publish event hooks containing site, native ID, old/new URLs, revision and content hash to trigger incremental SEO invalidation.

**URL normalization design:** resolve relative links against trusted origin; strip URL fragments for page identity; normalize host capitalization, IDNA and default ports; preserve meaningful path case, trailing slash policies and query params until site route rules determine identity. Never indiscriminately drop query parameters (some represent distinct indexable resources). Store `rawUrl`, `resolvedUrl`, `normalizedFetchUrl`, `canonicalClaimUrl` separately.

**Tests:** 404/indexable pages, canonical across www/non-www, dynamic page vs index, search/filter query params, deleted product, multisite custom domain, zero products, 100k collection URLs, relative internal links, preview/staging noindex, HTML snapshots from build output.

**Gate:** production-like published pages have correct server-rendered discoverable markup; generated sitemap and canonical/redirect tests pass. Native inventory uses source-of-truth CMS revisions.

## M06. Search Console connection, measurement baseline and data quality

**Dependencies:** M03/M04/M05.

### OAuth + property authorization

1. Request minimum required GSC read scopes; use secure OAuth state, PKCE where applicable, encrypted token storage and revocation cleanup.
2. Fetch sites/properties available to user. Match selected property against owned verified site/domains, distinguishing Domain properties (`sc-domain:...`) from URL-prefix properties. User must explicitly choose authorized property.
3. A domain match inferred from string alone is **not** proof of property access. Require an API-verified property selection.
4. Handle incomplete data, anonymized queries, API aggregation semantics and dates. Show latest available data date; Google data is not real-time.
5. Provide explicit reconnect/disconnect and permission-failure UI.

### Daily ingestion strategy

```text
For each authorized property + requested searchType:
  bootstrap recent bounded daily ranges, oldest to newest
  for date, request selected aggregate dimensions in separate queries:
     [date] and [date,page] and [date,query] and [date,country,device]
     add page+query only for targeted pages or constrained segments
  paginate with rowLimit/startRow where supported
  de-duplicate by property + date + exact requested dimensional tuple
  checkpoint each completed date/dimension slice
  refresh last several days according to data revision/latency policy
  mark row extraction completeness as partial when provider caps may apply
  never sum independently sampled grouped tables into site total
```

**Warning:** Search Analytics may return top rows only. The API does not promise the entire long-tail query universe. A slice may be partial. Different dimension groupings use different denominators and cannot always be combined. CTR = clicks/impressions only for compatible aggregates. Position is an impression-weighted reported average, not a fixed rank; do not call it 'rank tracking'. Search Console is only for verified owned properties.

Store `property`, `search_type`, exact grouping/dimension keys, clicks, impressions, CTR, position, provider last date, extraction metadata and ingestion completeness. For large sites prioritize site/page aggregates and selectively fetch query dimensions (cost/quota aware). Support GSC URL Inspection as a separately quota-controlled optional exact-URL check; it is not a sitewide indexed-page enumeration API.

**Baseline cards:** organic clicks/impressions and trend with comparable date ranges, branded/nonbranded estimated grouping only when query rows support it, top landing pages, new/declining pages, potential CTR opportunities, GSC connection status, known indexing observations.

**Gate:** OAuth authorization/revocation proven, sample sites match GSC UI at compatible aggregation level within documented limitations, no private cross-site access, partial states visible. Test zero-data new website separately.

## M07. Safe crawling and evidence-driven technical audit

**Dependencies:** M04/M05. **Default engine:** use Crawlee's CheerioCrawler for accessible static HTML; use PlaywrightCrawler only when necessary and allowed, with strict budgets. Never make browser rendering the default for every page.

### Crawl plan

```text
Input: verified owned site origin + canonical routing inventory + crawl budget
Discover: owned CMS URLs -> sitemap(s) -> internal <a href> graph -> selected redirects
Queue: URL normalized + referring source + depth + priority + route/template type
Before ANY request:
  validate URL and DNS/IP, ownership/allowed origin, robots policy,
  scheme, port, redirect target, URL length, per-host concurrency/rate budget
Fetch: conditional GET (ETag/Last-Modified) where applicable
Parse: status, headers, redirect chain, robots, canonical, title, meta, H1,
       rendered visibility/links, structured data, images, hreflang, body hash
Persist: normalized compact extract + linked source evidence + fetch status
Derive issues using versioned pure rules; aggregate by page and template
Finish: coverage report (attempted/succeeded/blocked/failed/partial)
```

**Security checklist:** only http/https; forbid embedded credentials; DNS resolve and pin/connect safely; deny RFC1918, loopback, link-local, multicast, reserved, cloud metadata and internal Kubernetes/service names; check every redirect and DNS re-resolution; limit redirects/bytes/decompression; protect against zip bombs, infinite calendars, query traps, weird encoded hosts, IPv6 pitfalls, DNS rebinding. Do not pass attacker URLs to unrestricted browser or backend metadata endpoints. Respect robots and site-level concurrency. External competitor crawl uses even stricter limits, not the owned-site authorization.

**Incrementality:** key cache by `{site, canonicalFetchUrl, etag/lastmod/contentHash, extractorVersion}`, re-fetch changed/broken/problem URLs more frequently, snapshot representative template pages, invalidate on native publication events. Avoid exhaustive per-day recrawls on very large sites.

### Initial audited rules and severity

| Rule key | Input/evidence | Deterministic finding | Suggested action |
|---|---|---|---|
| `INDEXABLE_4XX` | status + intended route | indexable or internally linked 4xx | restore content or fix referring link |
| `REDIRECT_CHAIN` | response chain | excessive/looping hops | update canonical destination, inspect migration |
| `SITEMAP_NONCANONICAL` | sitemap + canonical | sitemap lists redirect/noindex/noncanonical | update sitemap source |
| `ROBOTS_SITEMAP_CONFLICT` | robots directives | disallowed public indexed-intent URL | confirm intention, fix safely |
| `CANONICAL_ERROR` | canonical parser | missing/invalid/multi/out-of-scope/conflicting | align with chosen route policy |
| `BROKEN_INTERNAL_LINK` | graph + status | internal target fails or loop | update link or valid destination |
| `ORPHAN_PAGE` | native inventory + graph | intended indexable page has zero discoverable inlinks, excluding valid top-level exceptions | propose contextual navigation |
| `EMPTY_PRIMARY_CONTENT` | rendered body extraction | body not visible/server-rendered | fix template/rendering |
| `DUPLICATE_TITLE_CLUSTER` | title map | titles collide on important unrelated indexable pages | review titles; don't auto-penalize |
| `MISSING_ALT_MEANINGFUL` | semantic image adapter | informative image lacks alternative text | draft truthful description |
| `SCHEMA_INVALID` | emitted JSON-LD parser/schema | invalid JSON/types/mismatched native facts | correct schema object |
| `HREFLANG_BROKEN` | locale relationships | invalid reciprocal/canonical mismatches | fix locale mapping |
| `DUPLICATE_CANONICAL_TARGET` | different URL canonical claims | different pages canonicalize together unexpectedly | review route/content |
| `CWV_POOR` | valid CrUX/PSI context | measured LCP/INP/CLS issue | actionable frontend engineering fix |

Avoid treating a missing meta description or title-character count as a blanket emergency. Prioritize by actual indexability, affected valuable pages, risk, repair cost and uncertainty.

### Issue identity / priority

`issueFingerprint = SHA256(siteId + ruleVersion + normalizedTarget + stableEvidenceKey)`; dedupe repeated crawl runs, preserve first/last seen, resolved/regressed timestamps. Severity is based on **observed functional damage**, not how scary the check sounds.

Proposed priority vector:

```text
impact = business_page_value * discoverability_or_user_harm * affected_page_scope
confidence = evidence_reliability * rule_precision
work_rank = impact * confidence / max(estimated_engineering_effort, epsilon)
```

All normalized components are explicitly 0..1 except effort. Use conservative defaults, show component values and calibration version, do not imply Google impact percent or search-rank certainty. Fixes changing robots/canonicals/redirects still require review even when a rule is deterministic.

**Gate:** crawl captures true status and extraction results for controlled fixtures, SSR and broken-link regressions appear in issues, robots/SSRF tests pass, time/memory/domain limits enforced, failed crawl never displays 'healthy'.

## M08. Provider adapters, localized SERP data and metrics

**Dependencies:** M04, M09 market model (can prototype with typed market fixtures). **Initial candidate:** DataForSEO or another licensed provider with localized SERPs, keyword metrics, competitor domain intersection and historical rank data. Run a provider bakeoff in India/US across languages and local cities before selection.

### Interface contract

```ts
type ResearchContext = {
  siteId: string; market: z.infer<typeof Market>;
  purpose: 'competitor_discovery'|'keyword_research'|'clustering'|'serp_guidelines'|'tracking';
  budgetId: string; requestId: string;
};

interface SerpProvider {
  capabilities(): Promise<{ markets: string[]; devices: string[]; methods: string[] }>;
  quote(input: { keyword: string; context: ResearchContext; depth: number }): Promise<CostQuote>;
  fetchOrganic(input: { keyword: string; context: ResearchContext; depth: number }): Promise<SerpSnapshot>;
}
interface KeywordProvider {
  quote(input: KeywordBatch): Promise<CostQuote>;
  expand(input: KeywordSeedBatch): Promise<KeywordSuggestion[]>;
  metrics(input: KeywordBatch): Promise<KeywordMetricObservation[]>;
  domainIntersection?(input: DomainIntersectionQuery): Promise<RankedKeywordObservation[]>;
}
```

### Implement adapter in this sequence

1. Download provider location/language catalog; bind Velozy `Market` to supported location **ID**, not hand-written city code guesses.
2. Implement request budget quote, retries only for retry-safe operations, timeouts, circuit breaker and provider-specific status parsing. Scrub auth from logs.
3. For DataForSEO Google SERP, consider `/v3/serp/google/organic/live/advanced` for on-demand small interactive queries and Standard POST/GET for bulk. A Live task is one per call; Standard scheduling is generally more economical for planned bulk jobs. Confirm current vendor limits/charges before committing.
4. For keyword metrics, candidate is `/v3/dataforseo_labs/google/keyword_overview/live`, with batch size constrained by published endpoint limits. Record provider search volume **estimate** with historical month, location, language and data basis; keyword 'competition' from ads is not automatically organic KD.
5. Parse organic results separately from ads, local packs, AI overview, PAA, video and featured snippets; preserve actual SERP feature types as recorded by provider.
6. Deduplicate fetch using `SHA256(provider+engine+keyword_normalized+marketLocationCode+language+device+depth+method+providerParamsVersion)` plus TTL and license. Reuse only within vendor contract and privacy policy.
7. Persist provider task ID, cost when returned, request options, outcome and capability limitations. Never compute 'rank' from HTML scrape unless it is actual observed rank source; no search-volume inference from related-search count.
8. Expose a mock provider with deterministic recorded JSON fixtures. All automated tests use mock/recorded data, not chargeable live API.
9. Before real integration, write a `provider-matrix.md`: cost/query, update frequency, markets, fail rate, reuse rights, P95 duration, citations, limits, language quality, source freshness and representative invoice.

**Gate:** same request maps correctly to different country/city/language/device; fail and timeout states persist; max spend honored; repeated idempotency has zero unnecessary calls; a sampled vendor result is displayed with correct estimate labels.

## M09. Business profile, market selection and SEO onboarding

**Dependencies:** M03/M05.

### Input collection and confirmation

Prefill from native site: verified store/service catalog, title/description, business identity, contact/locations, existing languages, conversion events, typical purchase model. AI may propose classification but every unverified field displays its origin/confidence. Require owner/edit-permitted user confirmation before research.

Required fields:
- business name, website/site ID, industry and up to several prioritized niches;
- concrete verified products/services and disallowed claims;
- B2B/B2C, online/in-person and local/national/international scope **as separate dimensions**;
- target country/cities/service areas, languages and initial device priority;
- customer/problem, primary conversion, business goal and available measurement event;
- brand terms, competitor exclusion and content/regulated-topic restrictions.

### Geography algorithm

```text
if LOCAL:
  require business physical location or served region, country, city/service area;
  distinguish shop address vs where service is delivered
if NATIONAL:
  require explicit country, languages and ability to serve entire country
if INTERNATIONAL:
  require enumerated country-language markets with priorities
if WORLDWIDE:
  require user confirmation of initial 1-3 focus country-language markets
for each:
  validate language-country support against provider catalog
  resolve provider location code, store original and normalized region IDs
```

**Do not** automatically crawl all countries for `worldwide`. Reconfirm when scope or offerings change. Store versioned profile facts and provenance; invalidation triggers re-prioritization instead of silently changing approved publishing scope.

**Gate:** onboarding for local jewellery shop, country-wide e-commerce brand, multi-country SaaS and worldwide unspecified market requires proper confirmations and renders distinct research requests.

## M10. Competitor discovery, classification, confirmation, dossier

**Dependencies:** M08/M09/M07 limited crawler.

### Discovery algorithm

1. Generate 5 to 15 *diverse*, verified-offering-based seed queries for each priority market: core commercial, local service, transactional, comparison/solution searches. Avoid undirected `jewellery` / `fitness` one-word searches.
2. Use paid localized SERP source. Capture top 10 to 20 organic positions, root domain, page URL, query, rank and snapshot ID. Respect budget and cache.
3. Aggregate candidate domains, excluding user's owned network and clearly unrelated pages. Keep **search competitors** (rank for queries) separate from **commercial competitors** (sell same type of offering) and directories/publishers/forums.
4. If rights/crawl policy permit, fetch at most a few representative home/category/service pages for each shortlisted domain; classify using reproducible observable features (products/services, region, model). AI may extract structured features but must cite page evidence.
5. Score candidates with **proposed** weighted evidence, to be calibrated:

```text
serp_presence = sum over distinct relevant seed queries of (business_query_weight * 1/log2(organic_rank+1))
query_breadth = # distinct relevant seed queries ranking / # queried seed queries
business_overlap = verified product/service taxonomy overlap (0..1)
market_overlap = verified serviced geography/language overlap (0..1)
format_fit = business model/type compatibility (0..1)
score = 0.35*normalized_serp_presence + 0.20*query_breadth
      + 0.25*business_overlap + 0.15*market_overlap + 0.05*format_fit
```

Differentiate `score` (heuristic relevance) from actual SEO authority. If commercial competitor type is unverified, surface it as `possible` and invite correction. Present 5 to 10 choices with matched queries, observed URLs, type, country/date and **why**.
6. Require user confirmation before any deep competitor crawl. Store approvals and snapshot IDs. Deep crawl only approved domains with strict robots and per-domain pages/bytes limits.
7. Build dossier: public site hierarchy; representative categories; title/H1/schema; observed internal links; content topics; SERP observations when provided; topical gaps; observed language/locale; strategic lessons (no copying).

**Gate:** local jewellery competitor recommendations are relevant to the user's locality; national marketplace may appear as SERP competitor but not falsely as like-for-like local shop; removal/addition works; no deep crawl before confirmation.

## M11. Keyword discovery, cleaning, intent labelling and metric acquisition

**Dependencies:** M08/M09/M10/M06 optional.

### Candidate generation without AI hallucinations

Sources, ordered by known business relevance:
1. Verified native catalog/service names and synonyms, product categories and approved common terms.
2. GSC query rows (partial top queries, never interpreted as all actual search demand).
3. Real competitor ranking/domain intersection exports from provider where licensed.
4. SERP-related queries, PAA and supported keyword provider suggestions.
5. Controlled modifier templates (locations, price, buy, repair, alternative, compare) **as candidate strings only**; they do not acquire monthly volumes until vendor metrics are fetched.
6. Human-added seed queries with provenance.

### Text normalization and de-duplication

```ts
function normalizeKeyword(raw: string, locale: string): string {
  const s = raw.normalize('NFKC').trim().replace(/\s+/gu, ' ');
  // Unicode-aware locale mapping; avoid blind ASCII transliteration or stemming.
  return s.toLocaleLowerCase(locale);
}
```

Persist original string, normalized string, `marketId`, language/script, source IDs, branded/competitor-branded flag, detected entities, validated business relevance and possible spam/unsafe content flag. Do not merge different languages, cities, currencies or product variants because embeddings are close. Keep lexical duplicates distinct from semantically related alternatives.

### Intent classifier (proposed)

Use rule features + actual SERP page-type distribution and user/LLM review in that order. Labels: informational, transactional, commercial investigation, navigational, local, mixed, unknown. Extract modifier indicators (`buy`, `best`, `cost`, `near me`, brand, city), but their presence alone is not conclusive. Build confusion-matrix evaluation per market/language and mark low confidence if observed SERP mixes service pages, forum posts and guides.

### Paid metric fetch order

Only buy metrics for useful candidates after quality filtering/deduplication: business relevance -> seed lineage -> practical opportunity -> refresh as quotas permit. Store each volume, keyword difficulty, CPC, trends separately, with provider/version/market/date and whether estimated. Missing metrics are null and should not be assigned artificial 0/100 KD or 0 monthly searches.

**Gate:** 1k+ mixed keyword candidates dedupe without lost city/intent distinctions, every metric links to real provider evidence, no generic LLM-created volume/KD.

## M12. Hybrid SERP-overlap clustering and existing-page mapping

**Dependencies:** M11/M08/M05. **This is the most important algorithmic milestone.**

### Goal and truth labels

Cluster two queries together when **one useful page** is normally a satisfactory main result for both queries in the **same search market**. Semantically similar concepts can require different pages (`buy` vs `guide`; `Delhi` vs `Mumbai`). Label a human review dataset before finalizing weights: for each keyword pair, `same_page`, `related_separate_page`, `unrelated`, or `uncertain`, with reviewer reason.

### Stage 1: Fast candidate generation (avoid all-pairs O(N^2))

- Partition by market, language, subject category, geography, brand restrictions and broad intent.
- Compute dense multilingual embedding for keyword+context and sparse token features. Cache by embedding model version/text hash.
- Use ANN indexing (pgvector HNSW for moderate site sizes, external vector index only when justified) to obtain top `k=20..50` neighbor candidates plus normalized lexical neighbors and shared-source pairs.
- Use deterministic fallback if embeddings unavailable (token overlap + morphology/locale-aware terms + parent offering). **Never** use embeddings alone to merge intent clusters.
- Limit candidate edge budget per keyword; select a few representative head/mid/tail queries for localized SERP requests.

### Stage 2: SERP overlap and context features

For query `a` and `b`, retrieve or reuse top organic URLs at the **same** `(engine, market, language, device, capture window)`.

```text
A = canonicalized distinct organic URLs in top N for a
B = canonicalized distinct organic URLs in top N for b
jaccard = |A∩B| / |A∪B|  (0 if both missing, but state = unavailable)
rank_weighted_overlap = sum(u in A∩B) min(w(rankA(u)), w(rankB(u)))
                         / sum(u in A∪B) max(w(rankA(u)), w(rankB(u)))
w(r) = 1/log2(r+1)
page_type_similarity = 1 - JensenShannonDistance(distribution(A.types), distribution(B.types))
intent_agreement = confidence-aware classifier / human label consistency
locale_agreement = strict compatible location and language gate
```

Normalize URLs with correct redirect/canonical evidence; avoid falsely merging distinct pages under one root domain for URL-level overlap. SERP datasets may be missing/capped, so track denominator and availability. For very sparse sampled keywords, compute a provisional confidence and schedule representative checks rather than confidently merging.

### Stage 3: Constrained pair scoring and graph partition

**Initial experimental formula** (must calibrate, do not hardcode as universal truth):

```text
pairScore = 0.55*rankWeightedOverlap
          + 0.25*pageTypeAndIntentAgreement
          + 0.20*semanticSimilarity
```

Hard-negative gates override numeric score: different geography where local intent matters; transactional vs clearly informational; product-detail vs category-listing intents; branded navigational collision; inconsistent language; incompatible result formats. Build undirected weighted graph only for candidate pairs above **tuned threshold** AND passing constraints. Find groups by constrained union-find with **cluster-level consistency checks** or community detection with reassignment; naive transitive union can incorrectly merge A-B and B-C even if A-C require separate pages. Before merging components, require no known hard-negative across the two groups, compatible centroid/intent, and sufficiently strong representative SERP agreement. Mark uncertain bridges for manual review.

### Stage 4: Cluster name and main query

Choose primary keyword by verified business fit, observed SERP intent representativeness, known demand if available, and clarity. Not simply biggest volume. AI may write *label* and summary using provided member keywords but cannot insert new member queries without provenance.

### Stage 5: Stable clusters across refreshes

Persist `clusterId` and snapshot/algorithm versions. Match new clusters to old by weighted keyword-member Jaccard + intent + mapped page affinity, then assign stable IDs only above tuned threshold; split and merge create `seo_cluster_lineage` records. Do not silently discard associated tasks, performance or approved mappings. Flag large topology changes for review.

### Stage 6: Map cluster to native page

Candidate page selection:

1. retrieve explicit owner mappings and existing page targeting signals;
2. search native `SeoDocument` embeddings/terms filtered to correct site/market/type;
3. compute page-intent fit (body+headers+canonical type+offering/locale);
4. validate that target page is published/intended indexable and not a competing canonical or archived URL;
5. detect `many pages -> one intent` cannibalization candidates and `one page -> distinct contradictory intents` overloading;
6. prefer `optimize_existing` when fit strong; `add_section` when missing subquestions; `create_page` only when no adequate URL; `merge/redirect` only after human approval;
7. user approves mapping; evidence + confidence persisted.

**Gate:** curated pairs in fixtures meet target pairwise precision/recall benchmarks chosen before launch; explicitly demonstrate correct nonmerges: buying vs advice, Delhi vs Mumbai, product category vs SKU, brand vs generic, Hindi vs English locale variant. Old cluster IDs/tasks remain traceable after split/merge.

## M13. Topic hubs, coverage engine and interactive Topical Map

**Dependencies:** M12/M07/M05.

### Hub-building algorithm

Connect *distinct intent clusters* using category taxonomy, shared customer journey, semantic closeness, supporting-question relationships and existing CMS navigation. Assign a topic hub label to groups with coherent business relevance. A hub does not imply one page. Let user exclude irrelevant hubs and prioritize commercial topics.

### Coverage state machine

```text
not_applicable: owner/domain policy excludes business relevance or market
unknown: crawler/semantic extraction/mapping evidence insufficient
planned: an approved task/brief exists, but no satisfying published page
missing: assessed relevant cluster; no adequate published native page
candidate_existing: page likely relevant; needs mapping/content review
covered_partial: mapped live page exists, but material intent gap OR serious indexability conflict
covered_verified: mapped canonical page published; content satisfies main intent,
                  technical indexability checks pass; freshness/provenance known
```

**IMPORTANT:** `covered_verified` means Velozy confirmed content presence and technical suitability, **not that Google indexed or ranked the URL**. Show a distinct GSC URL Inspection state only where available. `noindex` or blocked target must never be covered_verified. `unknown` is not `missing`.

### Coverage scoring (transparent)

Display **primary counts**: `fully covered / assessed applicable clusters` and `partial, planned, unknown, irrelevant` separately. Optional weighted coverage uses a documented heuristic:

```text
weighted_coverage = sum(importance_i * coverage_factor_i) / sum(importance_i)
coverage_factor_i = 1 for verified; 0.5 for partial; 0 for missing/planned
Exclude unknown and not_applicable from weighted denominator;
BUT display missing-data fraction separately, never hide 80% unassessed clusters.
```

Importance may be equal per cluster by default or optional business-fit weighted. Show count-based unweighted ratio like `7/28` and weighting method distinctly. `partial=0.5` is an illustrative product score, not a ranking factor, calibrate/test if implemented.

### Recommendation engine for uncovered clusters

Per cluster choose from `improve_existing`, `add_section`, `create_service_page`, `create_product_category`, `create_blog`, `merge_competing_pages`, `add_internal_links`, `fix_indexability`, `mark_irrelevant` based on mapping, technical issue, business type, SERP intent and goal. Every recommendation references cluster, site, source IDs, estimated effort and validation procedure. Don't generate a page for each keyword.

### UI delivery (table first)

- Query `GET /seo/map?marketId=&view=table&cursor=&coverage=&intent=&minDemand=...` with server pagination and totals.
- Table: hub, cluster name, primary keyword, intent, real SV/KD if available, page mapping, coverage state, confidence, next action, last analysis date.
- Drawer: contained query variants, exact SERP evidence, competing pages, map/change approval, reason for coverage state and proposed URL.
- Filters: business value, geography/language, coverage, KD and monthly SV where known, search text, content action.
- Mutations: map existing page, mark irrelevant with reason, accept/reject recommendation, create brief. No hidden automatic publish.
- Map toggle: semantic original Velozy design; same dataset as table, fixed layout per map version; hub circles / intent clusters and aggregated keyword marks; pan, zoom, legend, tooltip and deep-link state.
- Scale: hundreds -> SVG acceptable; >5k nodes -> Canvas/WebGL and viewport tile/LOD clustering, not 20k React DOM icons. Compute layout worker-side/off-main-thread. Keyboard/table alternative and no color-only legend.
- Only show high/medium difficulty rings if ring semantics are explicitly defined by Velozy, not as an imitation of Surfer's unknown geometry.

**Gate:** every map node drill-down matches table and backend, user override persists, unknown not counted as absent, filters paginate correctly at 50k keywords, slow provider leaves stale but labelled map accessible.

## M14. SERP Analyzer and research-based content guidelines

**Dependencies:** M12/M08/M07 crawler.

### Comparable corpus creation

1. Select a confirmed target cluster and `Market`.
2. Retrieve current/cached localized SERP for its representative queries, keeping observed rank and SERP snapshot reference.
3. Present organic result list and classify result page type: article, landing/service, product, collection, local listing, forum/discussion, video, home page, unknown. Do not compare unrelated page types.
4. Select 5..12 comparable, crawlable, policy-permitted pages. Support manual exclusion, and record why each was included/excluded.
5. Parse body, headings/questions/entities, titles, page schema, section count, list/table usage, inline media, external citations and approximate body text length. Exclude nav/footer/cookie pop-ups and repeated template blocks.
6. Aggregate per feature with median, IQR, sample count and missing data; compute common *helpful topic facets* based on observed structure, not raw term frequencies alone.
7. Generate versioned guidelines with evidence citation to source page/section and confidence. AI may summarize the already-extracted facets but not add unsupported claims.

### Topic/entity facet identification (proposed)

Use `sentence/paragraph -> chunk`, `entity extraction + keyphrase candidate extraction`, semantic dedupe, then document-frequency across comparable top results. Require meaningful distinct documents. Example:

```text
facet_support(f) = sum_pages[facet present and intent-compatible] / comparable_page_count
facet_relevance(f) = semantic similarity to user intent + query context
facet_priority(f) = support * relevance * factual_verifiability * missing_on_target
```

**Never** treat a frequently used word as a forced keyword density target. Exclude promotional boilerplate, generic footers, legally unsupported claims and irrelevant co-occurrences. For products show variant/spec questions rather than article word-count quotas; for how-to pages show actionable steps/safety rather than an exact headings quota. Provide examples, caveats, and data sample size.

### Corpus-aware content fit scoring

Optional experimental score with dimensions (all observable):
- intent alignment, 30%;
- missing relevant facets/questions, 25%;
- information organization/extractability, 15%;
- target entity/context clarity, 15%;
- supporting useful detail and internal navigation, 15%.

**These are proposed starting weights, not validated ranking weights.** Mark score `unavailable` if corpus is too small, outdated, off-market or wrong page type. Return score dimensions, sample size, exclusions, data freshness and confidence. Fit score never overwrites deterministic editor hygiene or readiness score.

**Gate:** analyzer compares actual SERP sources rather than imagined competitors; excluding irrelevant forum changes corpus statistics; unknown/blocked content affects sample size; guides are explainable and do not demand spammy repetition.

---
# PART D. BUILD MILESTONES: EDITING, IMPLEMENTATION AND MEASUREMENT

## M15. Deterministic native SEO Editor Score + AI answer-readiness

**Dependencies:** M05 shared SeoDocument adapter, M01 contracts. **Ship this before any paid SERP-dependent fit score.**

### Architecture

```text
unsaved editor AST/form values
    -> pure type-aware adapter (page, blog, product, collection, dynamic)
    -> SeoEvaluationInput (visible body, title render fallback, description,
                           h1/sections, meaningful images, links, approved target)
    -> versioned deterministic evaluators (no network, no AI)
    -> {score, coverage, criteria[], prioritizedFixes[], counters, state}
    -> live sidebar in same transaction-free browser render
```

Reuse one shared module between admin and builder; don't maintain different implementations in each. The evaluation should be incremental/debounced only if parsing huge AST costs too much; no async paid calls, and editing must never freeze due to scoring.

### Exact V1 SEO hygiene dimensions from original specification

| Dimension | Available weight | Checks |
|---|---:|---|
| Effective metadata | 25 | effective title 12, meta description 13 |
| Content structure | 25 | clear primary heading 10, semantic hierarchy/sections 10, readable paragraph/list structure 5 |
| Content usefulness | 20 | type-aware body detail 10, clarity/organization 5, obvious repetition 5 |
| Media and links | 10 | applicable descriptive alt and link anchor checks |
| Target relevance | 20 | topic context in title/body **only when user or approved brief supplies target** |

### Exact V1 AI answer-readiness dimensions

| Dimension | Available weight | Checks |
|---|---:|---|
| Subject and context | 30 | identifiable subject/entity, audience/context |
| Answer placement | 30 | clear useful opening answer/summary where appropriate |
| Extractable structure | 25 | well-labelled sections, lists/facts where useful |
| Explicitness | 15 | clear dates/units/qualifiers/entity references where applicable |

**Scoring formula:**

```ts
type Criterion = {
  id: string; weight: number;
  applicable: boolean; observable: boolean;
  earned: number; // 0..weight, or exact discrete subcheck scoring
  status: 'pass'|'partial'|'fail'|'not_applicable'|'not_assessable';
  evidence: string[]; recommendedFix?: string;
};
function scoreCriteria(criteria: Criterion[]): {score: number|null; assessedWeight: number; totalWeight: number} {
  const included = criteria.filter(c => c.applicable && c.observable);
  const assessedWeight = included.reduce((n,c) => n + c.weight, 0);
  if (!assessedWeight) return {score:null, assessedWeight:0, totalWeight:criteria.reduce((n,c)=>n+c.weight,0)};
  const earned = included.reduce((n,c) => n + Math.max(0, Math.min(c.weight, c.earned)), 0);
  return {score:Math.round(100 * earned / assessedWeight), assessedWeight,
          totalWeight: criteria.reduce((n,c)=>n+c.weight,0)};
}
```

**Check applicability correctness:**
- Target relevance (20) is excluded when **no approved target exists**; do not AI-infer one to inflate the score. Show denominator coverage.
- Missing editable supported metadata is a failure, not 'not applicable'.
- A decorative image with `alt=""` is allowed; meaningful image missing alt is a relevant failure; zero images means no alt criterion to judge.
- Product description and category page have different appropriate detail expectations from articles. No blanket 1,000-word rule.
- Description length ranges are editorial usability guidance, not fixed Google ranking factors. Apply effective title/description publishing fallback rules.
- A H1 is assessed semantically from rendered body, not regex over HTML. Do not count global navigation headings.
- Heading/word/paragraph counters derive only from visible body text, excluding metadata, template-only boilerplate and hidden editor widgets.
- AI readiness cannot assert 'will be cited by ChatGPT'; it assesses clarity only.
- If malformed legacy content is not safely parseable, return `unavailable`, not 0 or a stale previously cached score.
- `score` never gates save, draft, schedule, or manual publishing. It is guidance.

**Recommended fix ranking:** `recoverable_score_points * user_visible_value / max(edit_effort, small_constant)`, with special precedence for incorrect facts and severe technical indexability issues *outside* this editorial score. Fix text points to exact editable field/node. Do not suggest stuffing a target phrase.

**Integration:** page builder settings and canvas, blog editor, product edit/variant UI where metadata is present, collection/category editor, future dynamic template settings. Compute from unsaved state and render near SEO metadata. Save score snapshots optionally on publish for audit, but client score is authoritative for immediate feedback only.

**Tests:** no target keyword, no body, legacy malformed content, Unicode/Hindi, images all decorative, meaningfully missing alt, valid fallbacks, duplicate H1, product with zero paragraphs but rich specifications, changed unsaved H1, hidden builder elements, async save race. Snapshot rubric V1 scores with fixed fixtures; increment rubric version if weights change.

**Gate:** all metadata-bearing editors display the same score for the same normalized document; response is deterministic and network-free; coverage/exclusion labels truthful and UI never blocks save/publish.

## M16. Content Audit, cannibalization, opportunity scoring and task queue

**Dependencies:** M06/M07/M12/M14 optional. This module picks **existing pages worth fixing**, not a queue for creating new articles by default.

### Input features per page

- Native source: published/canonical/indexable state, date, document type, last modified revision, business priority.
- GSC: search performance in comparable time windows and actual query evidence (partial query set caveat).
- Crawl: critical technical issues, broken internal links, content body summary and language.
- Clusters: target coverage, missing relevant facets, content fit where enough SERP data exists.
- Conversions: owned Velozy form/booking/checkout funnel attribution when enabled and consented.
- Change history: recently updated/published pages, to avoid noisy 'update again' loops.

### Audit detectors and guardrails

| Detector | Initial evidence requirement | Output |
|---|---|---|
| `INDEXABILITY_REGRESSION` | prior indexable state + new observed noindex/redirect/4xx | repair, urgent |
| `BROKEN_VALUE_PAGE` | high-intent native page and broken link/critical render issue | repair |
| `CTR_REVIEW_CANDIDATE` | sufficient impressions, comparable query/device/market and snippet evidence | review title/description, not guaranteed CTR uplift |
| `LOSING_CLICKS` | sufficient compatible GSC clicks/impressions across comparable periods | investigate competitors/seasonality/site change |
| `RANK_IMPRESSION_DIVERGENCE` | sufficiently sampled GSC aggregates with matching dimensions | investigate, not automatic title rewrite |
| `TOPIC_COVERAGE_GAP` | relevant cluster, mapped target, observed missing useful facet | content brief / add section |
| `CANNIBALIZATION_CANDIDATE` | overlapping GSC queries + closely matching intents + multiple pages | human review of merge/canonical/internal architecture |
| `STALE_FACT` | user-verified date, product/catalog fact or stale disclaimer | factual refresh |
| `ORPHAN_VALUABLE_PAGE` | published page + link graph with no meaningful inlink | propose contextually relevant source links |
| `EARLY_NEW_PAGE` | recently published, minimal measurement data | monitor; **do not** declare failure |

### Time-series anomaly method (proposed)

For each page/market/consistent search type, compute 28-day rolling total and comparable prior 28-day period; also compare same seasonal period where year-over-year data exists. Use minimum sample thresholds to suppress random small-volume noise (these are **tuneable**). Detect meaningful change using e.g. Poisson or negative-binomial approximate confidence interval for low count data, or Bayesian credible interval when appropriate, plus absolute business impact. Don't confuse a 100% drop from two clicks with catastrophic SEO decline.

```text
trend_candidate = supported_data
  AND enough observations
  AND (absolute delta exceeds business-relevant threshold)
  AND (estimated uncertainty interval suggests change)
  AND (no overriding data outage)
```

Flag algorithm/data quality explicitly. Show what we measured, what we **hypothesize**, what action can be tested and when to recheck. Never say 'Google penalized page' from a click-drop chart alone.

### Cannibalization detection (proposed)

- Candidate retrieval: same search queries observed for multiple canonical owned URLs, same cluster and competing intent, or high internal similarity.
- Compute overlap by query impressions weighted within same time window, intent compatibility, SERP intent, canonical policy and product hierarchy.
- Don't flag legitimate paginated product URLs, translated locale versions, different city service offices, clear category/product page hierarchy, or brand vs generic pages unless evidence supports true competition.
- Suggested actions: keep & differentiate, interlink, consolidate, canonical review, redirect (human approval), or ignore with reason. Explicitly **do not** auto-301 pages based solely on content similarity.

### Prioritization

```text
priority = eligible_business_value * problem_severity * evidence_confidence
           * potential_conversion_impact / max(estimated_effort, epsilon)
```

Value and impact are internally normalized heuristics; missing conversion data is marked unknown, not fabricated revenue estimates. Produce 3-5 top actions with tangible next steps and reasons. Dedup recommendations by target/problem and preserve previous dismissal/status across refresh.

**Gate:** seeded GSC regressions and crawler issue fixtures create correct actions; a new site with no GSC data still gets technical/content recommendations; no mass duplicate task creation; each card has data provenance and an actionable destination.

## M17. Internal linking graph, recommendations and safe insertion

**Dependencies:** M05/M07/M12/M03.

### Graph data

Nodes = normalized indexable owned URLs or known draft/proposed destinations; directed edges = detected internal anchors with source document+revision, target canonical URL, anchor text, DOM/AST node location, rel/nofollow, status and placement (body/nav/footer/template). Separate meaningful **contextual body links** from repeated site-wide navigation.

### Candidate generation

1. Find target pages with orphan state, high business priority, fresh useful article, or underlinked clusters.
2. Retrieve potential source pages in compatible language/market with semantic similarity to target and related approved topic hub. Respect content type and purchase journey.
3. Extract possible anchor locations from paragraph text/AST (whole spans/sentences); do **not** invent anchor phrases if they do not read naturally.
4. Exclude: existing same link from that context, self-links, redirects/404, `noindex` or draft destination, cross-language mismatches without an explicit alternate locale, button/navigation code, protected checkout/legal copy, SEO spam patterns, anchors already overloaded.
5. Rank candidate pair with explainable heuristic:

```text
link_score = 0.35 * contextual_relevance
           + 0.25 * target_business_priority
           + 0.20 * source_target_user_journey
           + 0.10 * orphan_helpfulness
           + 0.10 * anchor_naturalness
           - penalties_for_repeated_anchor_or_excessive_link_count
```

Calibration required. Provide **why** link helps reader, exact source text excerpt and target page. Never infer PageRank transfer numbers from internal graph without a validated model.

### Mutation algorithm

```text
User approves suggested link
  -> resolve source doc and current revision
  -> verify source excerpt+node id still matches proposal base hash
  -> ensure target canonical URL exists/published/indexable
  -> AST patch: replace text-range with semantic link node
  -> validate no double links/nested links, link count, rendering and URL
  -> save ChangeSet, show preview/diff
  -> authorized publish via M19 path
  -> crawl rendered result and verify anchor in body
```

**Gate:** zero accidental anchors in menus/JSON strings, patch conflict is safe on stale content, target redirects/canonicals verified, inserted links genuinely appear after deployment, link suggestions materially relevant in human audit.

## M18. Content briefs, fact registry, AI writer and media processing

**Dependencies:** M09/M12/M14/M04/M03. **Do not write from SERP snippets alone.**

### Content brief object

```ts
type ContentBrief = {
  siteId: string; clusterId: string; targetDocumentId?: string;
  recommendedAction: 'new_page'|'refresh'|'add_section'|'blog'|'collection';
  primaryIntent: string; audience: string; marketId: string; goal: string;
  proposedUrl?: string; titleOptions: string[]; keyQuestions: string[];
  requiredVerifiedFacts: {claim: string; evidenceId: string}[];
  nonVerifiableTopics: string[]; bannedClaims: string[];
  helpfulSources: {url: string; usage: string; retrievedAt: string}[];
  internalLinks: {documentId: string; purpose: string}[];
  requiredUniqueBusinessValue: string[]; outline: {heading: string; evidenceIds: string[]}[];
  risk: 'low'|'sensitive'|'regulated'; estimatedAIUnits: number;
  reviewStatus: string; briefVersion: number;
};
```

### Content generation pipeline

```text
1 APPROVED OPPORTUNITY
  user confirms real product/service intent and page action
2 FACT MATRIX
  gather versioned first-party verified offerings, prices, availability,
  locations, policy, reviews (only real), source documents and citations
3 RESEARCH PACKAGE
  SERP facets, known questions, comparable formats, readable public sources
4 BRIEF
  page goal, audience, reader questions, internal link path, CTA, outline,
  missing verified facts and forbidden statements
5 OUTLINE REVIEW (manual/assisted; autopilot only in approved limited scope)
6 DRAFT PER SECTION
  instruct LLM to use allowed facts, avoid unsupported specifics,
  produce structured native AST or typed sections, not uncontrolled HTML
7 FACT EXTRACTION
  extract every concrete claim (price, statistic, law, certification,
  medical advice, date, availability, location, performance)
8 VERIFICATION
  match claim to exact permitted evidence or mark as unverified;
  failure -> omit, generalize safely or send to editor for confirmation
9 ORIGINALITY + DIFFERENTIATION
  detect near-duplicates within tenant/site and superficial SERP paraphrase;
  require real examples, business-specific details or true user value
10 SEO/READABILITY/BRAND QA
  intent, structure, links, schema fit, accessibility, prohibited content
11 PREVIEW/CHANGESET
  save draft and cite sources in editorial review metadata
12 AUTHORIZED PUBLISH
  blog -> existing scheduled blog publisher, never immediate side effect
13 POST-PUBLISH VERIFY + MONITOR
```

**AI prompt schema:** use structured tool/JSON outputs, schema-validated content sections, direct citations to provided evidence IDs, `unknown` rather than guesses and clear refusal to manufacture testimonials. Lower-temperature alone is not a correctness safeguard. The LLM is not permitted to override user claims, scrape more domains on its own, make provider calls or set publish permissions.

**Fact matrix algorithm:** split draft into atomic claims; classify `verified_first_party`, `verified_public_source`, `time_sensitive_requires_recheck`, `unsupported`, `opinion/editorial`. Claims involving product price/inventory, customer testimonials, certifications, opening hours, safety/health/legal statements and comparative superlatives require verified references. Validate source access and timestamp. Unsupported facts block autonomous publication. Maintain reviewer corrections as verified facts with source and expiry.

**Original value rubric** (human-tested): Does this page give a buyer/reader information specific to the business, an actionable explanation/decision aid, enough detail to satisfy intent, and no substantial duplication? Reject polished but empty generalized introductions, fake 'statistics show', clickbait headlines and repetitions designed to reach a score.

### Media and image workflow

1. Determine whether meaningful supporting imagery is actually needed. A page should not block on image generation.
2. Use permitted provider: native user asset first; configured Pexels (with actual usage rights checked); configured image generation as optional paid action; evaluate ComfyUI/self-hosting only after GPU/license economics and safety review.
3. Save asset provenance (origin, provider, license, attribution requirement if any, prompt where relevant, original filename hash, content type, dimensions, created date) **in Velozy DB**.
4. Decode/re-encode securely; strip EXIF/XMP/IPTC with vetted library/ExifTool and verify scrubbed file. Retain provenance in DB rather than exposing location metadata in the file.
5. Generate truthful alt describing image's purpose in page context, not keyword stuffing. Decorative images receive `alt=""`.
6. Enforce MIME/size/dimensions, AV scanning when infrastructure supports it, copyright/licensing policy, no unprocessed fallback after strip failure.

**Gate:** case studies across real product, local service, informational guide and YMYL/regulated content yield fact-traceable drafts; unsupported claims fail; duplicate content and unsafe media blocked; blogs remain scheduled via original code path.

## M19. Inspectable optimizer, approvals, publishing and rollback

**Dependencies:** M03/M05/M17/M18. This milestone is where research becomes actual website changes and must be engineered as a transactionally safe product, not `save(LLM_output)`.

### ChangeSet model

```text
id, project/site, documentId, documentType, baseRevision, proposedRevision,
patches[], beforeHash, afterHash, intent, evidenceIds[], originAgentJob,
riskClass, previewUrl, QAResults[], approver, approvalRevision,
publicationStatus, deploymentId, verifiedLiveUrl, rollbackRevision,
created/approved/deployed/verified timestamps
```

**Patch types**: targeted metadata update, heading text replacement, paragraph change, section insertion, contextual internal link, schema field update, URL/canonical/redirect change. Treat last three as higher risk. No destructive arbitrary HTML replacement or script injection from LLM.

### Reliable patch algorithm

```text
propose(change, target):
  assert edit permission and target tenant/site
  normalize and validate patch schema
  compare target CURRENT revision to patch.baseRevision
  if different -> return STALE_DOCUMENT_REVISION and require rebase
  check AST anchor node ids + before text hash exactly match
  apply patch to clone, never mutate production object
  verify no broken nodes/links and known business claim invariants
  compute readable text+structure diff and normalized after hash
  save immutable changeset proposal

approve(change):
  assert appropriate role/owner risk policy
  bind signature/approval to exact content hash, scope, policy revision
  record approval event; never approve 'all future unknown changes'

publish(change):
  compare current document revision, auth revision, budget and scope again
  prepublish QA + site routing + SEO metadata validation
  lock/CAS document revision, write new content revision and deploy event
  blog: schedule through existing blog scheduler, do not bypass
  await deployment success event, fetch rendered public URL
  verify expected text/metadata/link/canonical/status on LIVE response
  mark verified or failed; reconcile job/notification and retry policy
```

### Risk tiers

| Tier | Examples | Approval |
|---|---|---|
| Low | drafting title suggestion, adding missing alt to meaningful image, contextual body-link candidate | review; owner-approved autopilot MAY apply after gates |
| Medium | editing primary page copy, adding FAQ/spec section, scheduled blog draft, product collection intro | human until validated; limited owner-scoped autopilot later |
| High | price/availability/regulated claims, deleting route, 301/302 redirect, canonical change, robots/noindex, locale architecture, core product offering | explicit human approval every high-risk change |
| Forbidden | altering checkout/payment/KYC settings from SEO engine, fabricated reviews, backlink spam, unapproved new market, indiscriminate bulk page generation | never via SEO autopilot |

**Rollback:** a revert is itself an audited ChangeSet over current revision; preserve intervening legitimate edits instead of blindly restoring entire old object. If the target has changed since publication, show conflict and create human review. Verify reverted live output. Keep dependent redirects/links in mind and never promise atomic global deploy if rendering architecture does not support it.

**Gate:** stale revision, revoked approval, paused autopilot and quota exhaustion all block publish; low-risk simulated changes render correctly; double-click/retry cannot publish twice; rollback repairs the actual rendered URL.

## M20. SEO strategy, work queue, measurement and reporting

**Dependencies:** M06/M07/M12/M16/M19.

### Versioned SEO strategy

A 30/60/90-day strategy records baseline, confirmed markets/goals, competitor and SERP evidence, prioritized issue and content opportunities, destination URL, tasks, dependencies, estimated effort/cost, actor permissions, expected *directional* business benefit and measurement definition. Version after significant profile/market changes. Users approve work strategy separately from autopilot permission.

### Task plan generation algorithm

```text
inputs = [critical technical issues, content audits, topic coverage gaps,
          important existing pages, internal link opportunities]
filter out unsupported offering, irrelevant market, duplicates, already-done tasks
rank by business relevance + feasibility + evidence strength + dependencies
build dependency DAG: e.g. fix noindex before content rewrite; publish hub before links
pack into weekly/monthly capacity and research budget
show top N actions with link to exact native editor/URL and validation target
```

If a user has no qualified conversion tracking, prioritize measurable events (forms, checkout, bookings) setup, but do not fabricate revenue baselines. SEO itself does not automatically authorize marketing campaigns.

### Instrumentation and impact interpretation

For each published ChangeSet, record exact deployed timestamp, page/cluster, edit kind, business goal, expected leading signal, and pre-change GSC windows. In reporting, compare compatible GSC page/market/device slices using complete or marked-partial data and sufficient delays. Overlay seasonality and sitewide updates when known. Present **before/after association**, never claim isolated causal lift without experimental controls. Cohort pages by original content type and market. A site may take weeks/months to show measurable changes.

### UI pages

- Campaign: replace the former Social Media Planner navigation entry/screen with the SEO campaign workspace. Reuse existing SEO audits, metadata suggestions, Search Console, CMS, and authorization paths; remove social-channel planning and publishing actions from the campaign UI.
- Overview: site health (audited URLs/date), GSC clicks/impressions (with freshness), next actions, work history and research usage.
- Audit: reproducible issues, impacted URLs and templates, severity/evidence and fix/retest.
- Research: competitors/keywords/intent and provider data caveats.
- Topical Map: table/map, coverage, next action.
- Content Editor: native metadata/content score, SERP guides, patch preview.
- Content Audit/Tasks: optimize existing pages before broad new page suggestions.
- Plan/Calendar: work DAG, editorial approvals, reuse existing scheduled blog calendar.
- Performance: GSC, conversions, page changes, uncertainty and notes.
- Settings: business markets, integrations, access, budget, autopilot and audit trail.

**Gate:** from one evidence-linked recommendation, user can open correct document, apply reviewed change, publish and later see the action and outcome; reports do not confuse provider traffic estimates with verified conversions.

## M21. Rank tracking, ecommerce, local and international SEO

**Dependencies:** M08/M20/M05. Ship when research engine and economics stable.

### Rank tracking

- User selects query+market+device+site domain and allowed cadence. Each observation stores exact SERP snapshot, observed organic position/URL, timestamp, provider and data caveats.
- If result not present in fetched depth, status `not_observed_within_depth`, **not rank 0** or absolute absence from Google.
- Localized differences and personalization mean a sampled rank is not universal. GSC average position remains a separate display.
- Schedule at most paid-plan cadence and throttle low-value unchanged keywords; important rank change alerts need consecutive confirmations / min confidence to avoid churn.

### Ecommerce-specific rules

- Product vs collection target intent; SKU variants, stock, real price/currency, canonical URL and crawlable product information.
- Faceted/filter URLs: explicit policy for indexable unique demand versus nonindexable duplicate states; avoid unlimited filter combinations in sitemap.
- Structured data only from true catalog values (offers, price, availability, shipping/returns where supported); never create aggregate ratings without real reviews.
- Product pagination, out-of-stock handling, discontinued products, SKU merges and merchant feed consistency. Price/availability changes never auto-published from speculative SEO generation.
- Dynamic category/location templates must include unique verifiable value; detect near-duplicate city/taxonomy pages.

### Local-business rules

- Storefront NAP (name/address/phone), opening hours/service area, schema from approved first-party data; business location distinct from service region.
- Nearby city landing pages only when actual meaningful local service/support differences exist; otherwise strengthen one genuine service area page.
- Google Business Profile integration only with customer authorization and supported APIs; no fake local reviews or automated review manipulation.

### International SEO

- Represent locale pages as groups; enforce valid hreflang language/country codes, reciprocal alternates where appropriate, self-reference and proper canonicals.
- Avoid blanket global canonicals pointing all locales at English; don't treat machine translation alone as a reason to create hundreds of thin locales.
- Regionally correct offerings, currencies, shipping and customer support, and language-specific keyword research instead of simply translating head keywords.

**Gate:** chosen rank observation has source/date/market and no misleading GSC conflation; product variant, filters, city pages and hreflang fixtures demonstrate desired canonical/indexing behavior.

## M22. Authorized SEO autopilot (DO NOT implement early)

**Dependencies:** M04/M19/M20/M24 operational gates. Disabled by default, explicit owner toggle only after demonstration of safe human workflow.

### Owner-authored authorization contract

```json
{
  "mode": "autopilot",
  "projectId": "real_project_id",
  "siteId": "real_site_id",
  "allowedActionTypes": ["metadata_suggestion", "safe_link_insert", "scheduled_blog_draft"],
  "allowedDocumentTypes": ["page", "blog", "collection"],
  "allowedMarketIds": ["confirmed_market_id"],
  "blockedTopics": ["medical advice", "unverified guarantees"],
  "maxResearchUnitsMonthly": 100,
  "maxGenerationJobsMonthly": 4,
  "maxSpendMonthly": 1000,
  "maxPublicationsPerWeek": 2,
  "requireReviewFor": ["canonical_change", "redirect", "core_business_claim", "product_price"],
  "approvalRevision": 1,
  "expiresAt": "2026-11-14T00:00:00Z"
}
```

**Example only:** amount/cadence are demonstration values, not product prices or automatic defaults.

Execution:
1. Scheduled worker creates work proposals from approved plan only. It cannot expand a market, budget, site or topic on its own.
2. Run exact budget quote/reservation and check permission revision before research, before LLM, before save and before final publish.
3. Apply risk policy. Low-risk content operations use fully validated ChangeSet; high-risk always creates approval request.
4. Blogs are drafts published by **existing scheduled blog job** only, with no immediate publish side effect. Page/category edits can use direct native publish only when owner scope specifically permits and M19 checks pass.
5. Stop on uncertain facts, unusual content volume, duplicate detection, provider cost anomaly, failed QA, stale scope and indexing regression.
6. Provide one-click **PAUSE**, job cancellation, scheduled disable, email/in-app incident notice where permitted, complete activity ledger and rollback.
7. Roll out to internal/staging -> trusted pilot tenants -> bounded small percentage with kill switch. Owner has preview of exact activity scope and monthly maximum.

**Gate:** fuzz tests + chaos tests prove autopilot never changes wrong project, market, page type, payment settings or high-risk metadata and cannot overspend or publish after revocation. Conduct a real rollback drill before production release.

## M23. AI answer visibility / AI Tracker (optional advanced module)

**Dependencies:** M20/M04 and terms-compliant provider access. Avoid asserting brand is 'visible in ChatGPT' based on one generated response.

- User-approved market/topic/brand prompt set, with version, language, persona and comparison queries. Do not automatically generate deceptive or personal-data prompts.
- Choose model/provider/answer-search mode with documented API terms, repeated sampling frequency and sample size. Record model/version, system conditions where supplied, location availability, prompt, execution time, raw answer retention policy and sample cost.
- Parse: exact brand name mention, fuzzy variant with manual validation, explicitly cited source URL/domain, positive/negative/neutral factual context only where justifiable. **Mention != cited source != recommendation.**
- Use multiple samples and show fraction of observed runs with sampling confidence interval, but do not claim it measures all real user searches or universal citation probability.
- Segment by model/mode/market and provide 'not supported' where geography/personalization/search access cannot be reproduced.
- Candidate optimization actions must improve useful first-party content, crawlability and factual clarity, not manipulate model outputs or fake citations.
- Apply cost controls and data retention/privacy just like other research jobs.

**Gate:** output clearly labels sampled methodology and limitations; exact citation URLs are observed rather than invented; repeated prompts measured reproducibly to degree supported by provider.

## M24. Platform reliability, security, scaling and launch readiness

**Start work at M01; final gate after every implemented milestone.**

### Scaling tactics

- Treat number of indexed/crawlable pages, keyword candidates, SERP observations and historical GSC rows as separate growth axes.
- Use cursor pagination for all large lists; column-select only needed records; no full keyword list JSON dumped to browser.
- Partition growing daily observations by date/site when query benchmarks require it; retention/compression according to provider license and product needs.
- Use bounded queue concurrency per tenant, domain, provider and job type. Fair scheduling prevents one 100k-page tenant from starving small tenants.
- Cache by exact market/language/device/context/license/TTL; dedupe duplicate in-flight requests.
- Use incremental document hashes, events and dependency invalidation to recompute only impacted topics/URLs; full cluster recomputes at controlled cadence.
- Store large permitted crawl extracts/screenshots in lifecycle-managed object storage only when justified; DB holds compact normalized facts, hashes, pointers and evidence.
- Vector index for keyword/page candidates after evaluating size/quality; no all-pairs embeddings or 100k DOM map nodes.
- Use OpenTelemetry-compatible tracing where available: request -> job -> provider -> evidence -> recommendation -> changeset -> deploy.
- Kill switches: whole SEO research, each paid provider, crawl workers, content writer, direct publish, autopilot.

### Proposed operational targets (test objectives, NOT achieved guarantees)

| SLI | Initial test target | Verification |
|---|---|---|
| Read-only overview p95 | <500 ms excluding first cold expensive joins | k6 or equivalent with realistic fixtures |
| Paginated keyword/map table p95 | <700 ms per page under test load | DB EXPLAIN + load test |
| Editor local hygiene evaluation | <150 ms median on representative documents | unit benchmark across page types |
| Paid background research request response | 202 in <1s after durable reservation | API integration benchmark |
| Queue job duplicate spending | zero on replay and concurrent retries | chaos/ledger audit |
| Cross-tenant data exposure | zero in automated adversarial suite | API/repo tests |
| Unauthorized changes published | zero in revoke/approval fuzz cases | end-to-end security suite |
| Map performance for 10k nodes | pan/zoom not DOM-bound, responsive at target hardware | performance profiling |
| Failure recovery | no unreconciled reservation after sweeper SLA | kill-worker/restore simulation |

Targets can change after actual measurements; publish real SLOs only after validation and owner agreement. Never promise support for 1M keywords without demonstrating data/provider economics and queue throughput.

### Security / threat modeling

- Tenant isolation, missing FK scopes, stale permission checks, auth of GSC sites, OAuth secret storage, private-data retention.
- SSRF, redirect IP changes, DNS rebinding, IPv6 and decompression bombs, crawler crawl traps, robots and request pacing.
- Prompt injection in competitor pages, SERP snippets, uploaded PDFs/media or AI output; treat all external content as **data**. Strip HTML, validate structured output; do not let text request secrets/actions.
- Model-generated XSS or dangerous HTML/URLs injected into native builder AST; strict allowed node/attribute schema and sanitizer at publish/render boundary.
- Idempotency, queue poisoning, exhaustion through repeated research clicks, provider spend burst and concurrency races.
- Migration corruption, event loss, backup restore, stale cache and vendor licensing violations.
- Auto-changing business facts, sensitive compliance categories and robots/canonicals.

**Gate:** threat model peer-reviewed, fuzz and load suites pass against staging, DB restore tested, on-call runbooks written, metrics and alerts enabled, no blocking data license/privacy issues.

---
# PART E. CONCRETE API, STORAGE AND EVENT IMPLEMENTATION CONTRACTS

## E1. Resource endpoints (mount under the repository's existing API prefix)

**Canonical suggested prefix:** `/v1/projects/:projectId/seo`. Add site ID route/query where project manages multiple sites. Never trust project ID from URL without auth membership check. All mutation endpoints require appropriate CSRF protection (if cookie auth), typed body validation, operation ID and activity record. All list endpoints require cursor-based pagination and maximum page size.

| Route | Verb | Permission | Behavior and result |
|---|---|---|---|
| `/overview` | GET | read | first-party baseline, last crawl, 3 next actions, statuses/freshness |
| `/profile` | GET | read | confirmed/AI-prefilled facts, version and sources |
| `/profile` | PATCH | profile.manage | creates a new version; validates facts; triggers affected analysis invalidation |
| `/profile/confirm` | POST | profile.manage | confirms exact profile version, audit entry |
| `/markets` | GET/POST | read/profile.manage | prioritized locale and provider location mapping |
| `/integrations/gsc/start` | POST | integrations.manage | secure OAuth initiation/state |
| `/integrations/gsc/callback` | GET | integration callback | verify state/code/property; never arbitrary redirect |
| `/integrations/gsc` | GET/DELETE | read/integrations.manage | status; revoke local property link/token as appropriate |
| `/gsc/sync` | POST | research, quota | `202` resumable data ingestion job |
| `/crawls` | POST | research | `202` own-site crawl with scope/budget |
| `/crawls/:runId` | GET | read | crawl job outcome and coverage/incomplete reasons |
| `/audits/issues` | GET | read | paginated issues with first/last seen/evidence |
| `/audits/issues/:id/resolve` | POST | edit | mark manual resolution; must schedule/re-run verification |
| `/competitors/discover` | POST | research + budget | localized SERP candidate job |
| `/competitors/candidates` | GET | read | proposed domains, matched queries and confidence |
| `/competitors/approve` | POST | edit | owner-approved list/version, crawl authorization |
| `/competitors/:id` | GET | read | dossier with source evidence and data age |
| `/keywords/research` | POST | research + budget | `202` seed expansion/metrics pipeline |
| `/keywords` | GET | read | paginated source-aware query metrics and intent |
| `/clusters/rebuild` | POST | research + budget | `202`, reason + map target version |
| `/clusters` | GET | read | filterable/searchable cluster table |
| `/clusters/:id` | GET | read | member keywords, intent evidence, mapped URLs |
| `/clusters/:id/map-page` | POST | edit_mapping | optimistic versioned manual mapping |
| `/clusters/:id/mark-irrelevant` | POST | edit_mapping | reviewer reason and scope |
| `/map` | GET | read | aggregated map data + version/cursor/tile fields |
| `/serp/analyses` | POST | research + budget | create/reuse corpus and guidelines job |
| `/serp/analyses/:id` | GET | read | comparable results, exclusion decisions, stats |
| `/documents/:id/hygiene-evaluate` | POST | editor edit | optional server parity/check; NO provider call |
| `/documents/:id/content-fit` | POST | research + quota | evaluate existing approved SERP corpus only or quote async |
| `/content-audit` | GET | read | prioritized existing pages/issue hypotheses |
| `/link-suggestions` | GET | read | contextual anchors, source/target and reasons |
| `/content-briefs` | POST/GET | draft/read | versioned brief creation/list; action must reference cluster |
| `/content-briefs/:id/draft` | POST | draft + budget | `202` AI draft job from approved brief |
| `/changesets` | POST/GET | draft/read | immutable patch against native base revision |
| `/changesets/:id/approve` | POST | approve | immutable hash-bound approval |
| `/changesets/:id/publish` | POST | publish | `202` deploy job with revalidation |
| `/changesets/:id/rollback` | POST | publish | new inverse changeset with conflict checks |
| `/recommendations` | GET | read | evidence, priority, linked task and dismiss state |
| `/strategies` | POST/GET | strategy.manage/read | versioned plan, approvals and 30/60/90-day tasks |
| `/performance` | GET | read | GSC first-party plus conversions and change annotations |
| `/ranks` | GET/POST | read/tracking.manage | selected keyword observations and schedule |
| `/autopilot` | GET/PATCH | read/owner | strict explicit scopes/pause/revoke |
| `/jobs/:id` | GET | read | immutable result ref, stage, remaining steps and charge status |
| `/jobs/:id/cancel` | POST | job.cancel | cancellation request with immediate auth revocation where needed |
| `/usage` | GET | read | units, reservations, settled usage, remaining budget |
| `/activity` | GET | read | project-scoped audit records |

### Example expensive-job flow

**Request:**

```http
POST /v1/projects/{projectId}/seo/keywords/research
Content-Type: application/json
Idempotency-Key: project-generated-unique-operation-id

{
  "siteId": "<actual owned site id>",
  "marketIds": ["<confirmed market id>"],
  "seeds": ["bridal jewellery shop", "bridal jewellery appointment"],
  "sourcePolicy": {"useVerifiedCatalog": true, "useGsc": true, "usePaidMetrics": true},
  "limits": {"maxKeywords": 250, "maxProviderSpend": 2.0},
  "quoteId": "<valid unexpired quote id>"
}
```

**Response:**

```json
{
  "data": {
    "jobId": "<uuid>", "state": "queued", "resultId": null,
    "reservedUsage": {"researchUnits": 8}, "maxProviderSpend": 2.0,
    "statusUrl": "/v1/projects/<id>/seo/jobs/<uuid>"
  },
  "meta": {"deduplicated": false, "estimated": true}
}
```

Actual currency type/exchange terms come from centralized pricing; `2.0` is an example maximum in provider accounting currency, not an automatic charge. Validate quote TTL, user/project/site, requested markets, source plan and inputs hash. User sees estimated units **before** paid job starts. Returning a quote from an API alone must not spend money; research execution does.

### Example cluster read response

```json
{
  "data": {
    "id": "<uuid>", "marketId": "<uuid>", "hubId": "<uuid>",
    "label": "Custom bridal jewellery pricing",
    "mainKeyword": "custom bridal jewellery price",
    "intent": "commercial_investigation",
    "keywordCount": 8,
    "searchVolume": {"value": null,"unit":"searches_month","sourceEvidenceId":null,"dataState":"unknown"},
    "coverage": {"state":"candidate_existing","mappedDocumentId":"<uuid>","assessmentVersion":"coverage-v1"},
    "recommendedAction": "review_existing_page",
    "confidence": 0.73,
    "evidenceIds": ["<source-uuid>"],
    "analysisVersion": "cluster-v1"
  }
}
```

`confidence=0.73` is **illustrative** and must be calibrated or replaced with confidence bands; never create fake numeric precision on production UI.

## E2. Event schema and invalidation behavior

Each event includes `{eventId, version, projectId, siteId, producedAt, correlationId, actorOrJobId, data}`. Publish through transactional outbox where DB state and event must be atomic.

| Event | Consumer | Required action |
|---|---|---|
| `site.document.published` | inventory, links, coverage, sitemap | update one document/graph neighborhood, invalidate relevant cluster coverage |
| `site.route.changed` | canonicals, sitemap, links, task verification | invalidate old/new route, test redirects |
| `seo.profile.confirmed` | research planner | mark incompatible market/keyword results stale; do not wipe history |
| `seo.gsc.synced` | performance, content audit | recompute affected date windows, not whole research universe |
| `seo.crawl.completed` | audit/coverage | update issues and page technical eligibility |
| `seo.serp.observed` | competitor/rank/cluster | invalidate dependent analysis only where snapshot context matches |
| `seo.cluster.rebuilt` | coverage, map, plans | compute lineage, reattach approved mappings carefully |
| `seo.guidelines.ready` | editor | update guidelines version, do not overwrite unsaved draft |
| `seo.changeset.approved` | publisher | enqueue only if publisher authorization separately passes |
| `seo.changeset.deployed` | verification crawler, reports | re-fetch live URL, annotate deployment and baseline |
| `seo.permission.revoked` | queue and publisher | invalidate pending/running scoped jobs before commit |
| `seo.budget.threshold` | UI/notification | warn or pause new paid tasks based on cap |

**Event consumer rule:** at-least-once delivery expected; consumer inserts dedup by `(eventId, consumerVersion)`. Handles missing dependency by retry, poison event to DLQ with alert; never silently drop approved publishing events.

## E3. Database extraction and query examples

### Keyword lexicon uniqueness

```sql
-- Example only; use actual column types and Drizzle migration style.
CREATE UNIQUE INDEX seo_keywords_unique_market_text
ON seo_keywords (market_id, language, normalized_text);
CREATE INDEX seo_keyword_metrics_latest
ON seo_keyword_metrics (keyword_id, provider, observed_at DESC);
CREATE UNIQUE INDEX seo_cluster_keywords_unique
ON seo_cluster_keywords (cluster_id, keyword_id);
```

### Cluster and mapping invariants

- One keyword should normally have one *primary cluster* per map version, but soft secondary topical hub membership is permitted when explicitly modelled. Avoid silent many-to-many semantic duplicate clusters.
- Cluster can point at at most one **primary canonical target** for a given site/market/version. Track alternate candidate URLs as separate review records.
- Mapping uniqueness is enforced where logically appropriate, not by forbidding a page from participating in adjacent hub reporting. Separate `primary_target_cluster_id` from supporting coverage.
- Cluster ID can survive a refresh while membership changes; query/recommendation results must always reference `analysisVersion`.
- Dates and license-aware evidence must be retained sufficiently to explain a previous action, without violating retention contracts.

### Job + ledger invariants

- Reservation transitions are immutable ledger additions, not direct balance overwrites.
- `available >= 0` as an invariant; settlement cannot exceed reserved units without explicit bounded overage authorization.
- Each vendor charge has an internally unique attempt ID and reconciliation status.
- A job either points to one successful immutable result or an explicit terminal failure; a retry cannot create two published results for the same job.
- Failed jobs refund unused customer research reservations according to disclosed policy; provider charges already incurred recorded separately and reviewed for cost leakage.

## E4. Environment and secrets reference (add to repo's real config system)

```env
# Example names only. Keep everything disabled unless configured.
SEO_FEATURE_ENABLED=false
SEO_PAID_RESEARCH_ENABLED=false
SEO_AUTOPILOT_ENABLED=false
SEO_DIRECT_PUBLISH_ENABLED=false
SEO_DEFAULT_CRAWL_MAX_PAGES=200
SEO_DEFAULT_COMPETITOR_CRAWL_MAX_PAGES=25
SEO_PER_PROJECT_CONCURRENT_RESEARCH_JOBS=2
SEO_SERP_CACHE_TTL_HOURS=168
SEO_EMBEDDING_MODEL_VERSION=<chosen version>
SEO_CLUSTER_ALGORITHM_VERSION=cluster-v1
SEO_COVERAGE_ALGORITHM_VERSION=coverage-v1
SEO_CONTENT_RUBRIC_VERSION=editor-v1
# Secrets via secrets manager, NOT committed .env:
# GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET
# SEO_SERP_PROVIDER_USER / SEO_SERP_PROVIDER_SECRET
# SEO_AI_PROVIDER_KEY / ASSET_PROVIDER_KEY
```

Values above are conservative **configuration examples**. Provider TTL and cache rights must follow contract. Feature flag credentials are never returned in settings JSON or logs; secrets have rotation procedure. Use existing repo env parsing (e.g., zod/envalid) rather than inventing parallel env readers.

## E5. Worker execution recipe

Workers must implement a common `JobHandler`:

```ts
interface JobHandler<I,O> {
  validate(input: unknown): I;
  quote(input: I, ctx: ScopedJobContext): Promise<CostQuote>;
  execute(input: I, ctx: ScopedJobContext): AsyncGenerator<JobCheckpoint, O>;
  reconcile?(ctx: ScopedJobContext): Promise<void>;
}
```

`ScopedJobContext` contains DB repos already scoped to tenant/project/site; approved market IDs; cancellation checker; immutable config/version; paid-provider client with remaining-budget guard; evidence writer; job trace ID; idempotent checkpoint and usage ledger. Do not pass raw all-powerful DB handles/secret credentials to model outputs or downloaded crawl HTML.

Suggested handlers:

```text
SeoOwnedSiteCrawlJob
SeoGscSyncJob
SeoCompetitorDiscoveryJob
SeoConfirmedCompetitorCrawlJob
SeoKeywordResearchJob
SeoKeywordMetricJob
SeoClusterBuildJob
SeoCoverageAssessmentJob
SeoSerpGuidelineJob
SeoContentAuditJob
SeoAIContentDraftJob
SeoChangeSetPublishJob
SeoRankCheckJob
SeoAiVisibilitySamplingJob
```

For each handler, write contract test with fake provider and fake clock, timeout and cancellation test, one crash-after-checkpoint replay, plan-expiry test, and data-rights test. Avoid bundling the entire research universe into one opaque mega-job; use child-job checkpoints with stable IDs and explicit dependencies.

---

# PART F. ALGORITHM VALIDATION AND TEST PROGRAM

## F1. Golden test dataset: create BEFORE tuning clustering and recommendations

A production SEO engine needs labeled reality, not visually plausible screenshots. Build a version-controlled `tests/fixtures/seo-gold/` dataset with a clear rights/consent policy. Include anonymized first-party Velozy projects and openly permissible synthetic sites. Aim initially for 20-50 annotated site/market scenarios with hundreds of keyword-pair labels, then expand as usage grows.

Strata to include:

1. Indian hyperlocal shop (Delhi jewellery): Hindi and English, `near me`, neighborhood, physical vs online.
2. Indian local service (dentist or non-sensitive plumber): different service areas, appointment intents; careful handling of regulated claims.
3. National ecommerce: category vs product/SKU variants, faceted categories, out-of-stock inventory.
4. Global SaaS/B2B: English variants US/UK/IN, informational vs software-buying intents, customer-segment pages.
5. Education publisher: same university and course variant, outdated pages, syllabus updates, nested topic hierarchy.
6. Restaurant/hotel or appointment-based business: true localized commercial intent, opening hours and structured data.
7. Multilingual site: Hindi/English, locale URLs, transliterated terms and hreflang.
8. Brand-heavy or marketplace SERP: directories rank alongside true competitor shops.
9. Fresh domain: no indexed/ranking data and empty GSC charts.
10. Large site: tens of thousands of products, crawl constraints, map visualization and link graph.

Per fixture include:
- approved business profile and supported markets;
- 5-20 known candidate SERP competitor domains and **human type labels**;
- query list, locale, real provider snapshot or licensed/synthetic clearly flagged;
- keyword pair label with intent and `same_page` judgement;
- correct approved native page mapping if existing;
- coverage states and evidence sufficient to justify them;
- audit findings with reproductions and nonissues;
- safe expected improvements and unsafe changes that must be rejected.

### Suggested machine-readable gold labels

```json
{
  "fixtureId": "commerce-intent-001",
  "market": {"country":"IN","language":"en","device":"mobile"},
  "queryA": "buy running shoes online",
  "queryB": "how to choose running shoes",
  "label": "related_separate_page",
  "reason": "transactional product listing versus informational buying guide",
  "labelerCount": 2,
  "adjudicated": true
}
```

Separate fully synthetic fixture values from true provider observations. No made-up volumes in any golden example presented as actual search demand.

## F2. Algorithm evaluation and release thresholds

**Thresholds here are proposed pilot targets, not evidence of achieved quality.** Set baselines from a manual heuristic and use held-out data to avoid overfitting.

| Component | Metrics | Initial release objective |
|---|---|---|
| Competitor type classifier | precision/recall per direct business, SERP, directory | prioritize high precision of direct competitors, inspect false positives |
| Intent classifier | macro-F1 + confusion by market/language | meaningful improvement over lexical heuristic baseline |
| Same-page pair classifier | precision, recall, false-merges (most harmful) | aim >=0.90 precision on audited same-page links; separate local/commercial cases |
| Cluster grouping | pairwise B-Cubed precision/recall, purity | higher priority to avoid false merging divergent intents |
| URL mapping | top-1 correct mapping, false new-page recommendations | minimize unnecessary new pages; quantify false candidate mapping |
| Coverage | precision of `covered_verified`, unknown false-negative rate | >=0.95 verified precision in reviewed pilot, maintain honest unknowns |
| SERP facet extraction | supported-facet precision, relevance, citation completeness | no hallucinated source-backed facets in sampled reviews |
| Audit issue rules | precision, reproducibility and resolution detection | critical indexability failures must be reliably reproduced |
| Content score | determinism, field coverage, rubric agreement | 100% agreement with fixed rule fixtures and no provider calls |
| AI factual checks | unsupported-claim rate, high-risk claims published | zero unauthorized high-risk factual claims in release test set |
| Internal linking | editorial usefulness, anchor correctness, postpublish link presence | zero AST corruption; majority editor-accepted suggestions |
| Jobs/credits | double charge, negative balance, unrefunded failed reservation | zero under deterministic concurrency/chaos suite |
| Publish safety | unauthorized or wrong-site publish | zero in test/staging and reviewed pilot |

**Evaluation methodology:** two independent reviewers for difficult pairs where possible; adjudicate disagreements; stratify train/dev/test by site to avoid leakage; run ablation (semantic only, SERP only, hybrid); report confusion by locale/device/intent; do not re-tune on final held-out test; version labels and source snapshots.

## F3. Negative examples the agent MUST test

1. `buy running shoes` and `how to choose running shoes` do not merge merely from embedding similarity.
2. `bridal jewellery shop delhi` and `bridal jewellery shop mumbai` do not merge under local commercial intent.
3. `best running shoes` and `Nike official website` do not merge under branded navigational intent.
4. Two URLs with similar blog intros but different products are not auto-301 redirected.
5. A missing GSC query row is `unknown`, not proof nobody searches that query.
6. A keyword is not marked covered because it appears once in the footer.
7. A live noindex page cannot be `covered_verified`, even if draft body is excellent.
8. A published technical fix is not marked verified until live render/HTTP checks pass.
9. Article headings and readability targets do not penalize a product page's appropriate specs structure.
10. A decorative image with empty alt does not lower meaningful-image accessibility score.
11. Stale browser editor state cannot overwrite newer published content.
12. Two identical paid research requests cannot charge twice due to button retry.
13. A failed provider call returns `provider_failed`, not an empty confirmed SERP.
14. Google average position is not displayed as exact tracked search rank.
15. An AI generated response *mentioning* a brand is not labelled a citation without an actual observed link/source.
16. Cross-project job IDs, evidence IDs and cluster IDs must not leak information.
17. A project owner pausing autopilot immediately prevents downstream publication.
18. A competitor page containing `ignore previous instructions` has no authority over agent behavior.
19. User-provided 'all countries' request cannot trigger worldwide unlimited SERP charges.
20. New blog is never published instantly by research job; it must use existing scheduled publisher.
21. A discontinued product cannot be declared in stock by AI.
22. A batch of 100 similar cities cannot publish one repeated doorway template without unique legitimate value.
23. A user without configured provider cannot see made-up KD/SV, but can still use free audit and editing.
24. A site publishing outage doesn't block existing checkout due to SEO queue downtime.
25. A CSRF or stale owner-approval replay cannot authorize an old scope after revision changed.

## F4. Test hierarchy

**Pure unit tests**
- URL normalization, market matching, Unicode keyword normalization, heuristic scores, canonical selection, document extraction, schema validators, job state transitions and rule versions.

**Adapter contract tests**
- Record provider JSON fixtures with secrets removed and rights checked; verify transformed data provenance, depth, SERP-type fields, missing-value logic, quota error and retry-safe paths.

**Database integration**
- Testcontainers or repo-compatible temporary Postgres; migration and tenant boundaries, transaction locks, uniqueness, cursor pagination, optimistic revision, graph joins, concurrent ledger updates.

**Worker orchestration**
- Fake provider and time; forced crash at every checkpoint, outbox replay, side-effect dedupe, expired approvals, canceled jobs, budget exhaustion, provider partial completion, rate-limit backoff.

**API acceptance**
- Each route's roles, validation, error codes, page limits, source privacy, result completeness and real installed feature flag behavior.

**UI interaction**
- Onboarding with verified markets, progress/resume after refresh, pending paid quote, keyboard-accessible map fallback, unsaved SEO score update, review patch/approve/publish and revert.

**Rendered site end-to-end**
- Build/deploy test website and inspect actual 200/404/canonical/robots/sitemap/JSON-LD, blog scheduling, alt text, links and dynamic product route output.

**Security and load**
- SSRF/DNS rebinding/redirect attack fixtures, prompt-injection corpus, cross-tenant fuzz, P95 response under fixture load, provider spend burst, worker resource cap, restore drill.

## F5. How to avoid 'AI slop' quantitatively

Run an editorial review sample of every new draft/optimization feature across multiple sites. Record separate `factualAccuracy`, `specificBusinessValue`, `searchIntentSatisfaction`, `originality`, `readability`, `helpfulInternalNavigation` and `regulatoryRisk`. Never average away a factual red flag: any serious unverified business fact blocks autonomy regardless of aggregate quality score. Measure how many AI-suggested paragraphs editors **keep** after edits, percentage accepted without rewrite, and genuinely useful conversions/task completion. The goal is better user outcomes, not content volume or an inflated editorial score.

### Factuality review checklist

- Is every precise price, offer, location, certification and statistic supported by an owner-confirmed or reliable dated source?
- Is information newly useful, or just rephrased competitor content?
- Does page answer actual visitor questions and include actionable next steps?
- Is language natural for requested market and customer, not generated SEO filler?
- Are visuals necessary and licensed, with correct alt and safe metadata?
- Did the optimizer preserve facts and customer trust, including returns/shipping/claims?
- Would a reader choose to keep this content even if search engines did not exist?

---
# PART G. EXECUTION TICKETS, RELEASE ORDER AND OPERATIONS

## G1. Generate project tickets in this order

A milestone can contain multiple PRs. Use the following as the **real agent queue**. Do not skip a proof step. Each item becomes an issue/PR with fixtures, tests, documentation and its explicit gate.

### Release R0: platform SEO and safe foundations

- [ ] `SEO-001` Inspect repo and document all existing SEO, auth, CMS, dynamic collections, scheduled blog, GSC, metrics, AI wallet and publish paths. **Proof:** inventory and ADRs.
- [ ] `SEO-002` Add versioned contracts, Zod validation, OpenAPI and core testing package. **Proof:** independent typecheck and negative contract tests.
- [ ] `SEO-003` Add minimal additive migrations and project-scoped SEO repositories. **Proof:** tenant leak tests and migration replay.
- [ ] `SEO-004` Wire consistent SEO role/permission middleware and immutable activity logging. **Proof:** cross-tenant and revocation tests.
- [ ] `SEO-005` Durable jobs/outbox/reaper skeleton; no paid provider enabled. **Proof:** kill-worker replay.
- [ ] `SEO-006` Credit reservation/settlement and internal cost accounting integration, reuse existing wallet. **Proof:** concurrent idempotency tests.
- [ ] `SEO-007` Native `SeoDocument` adapters across pages, blog, products, collections and dynamic records. **Proof:** HTML/AST fixtures.
- [ ] `SEO-008` Rendered canonical, robots, sitemap, SSR and structured-data fixes. **Proof:** actual HTTP/HTML tests.
- [ ] `SEO-009` Versioned editor hygiene/readiness scores and live UI in all metadata-bearing editors. **Proof:** unsaved-state parity and rubric fixtures.
- [ ] `SEO-010` Business profile/market setup, confirmation and geographic validation. **Proof:** four onboarding scenario tests.
- [ ] `SEO-011` GSC OAuth/property selection and baseline dashboard. **Proof:** authorized property and correct aggregation handling.
- [ ] `SEO-012` Own-site crawler and versioned technical issues. **Proof:** false positive/SSRF/robots fixture suite.

**R0 release gate:** native websites are technically indexable as intended, score sidebar is accurate and free, owned GSC and audit are useful, queue/credits/permissions stable, no autopilot; site hosting/editor/checkout unaffected by SEO failures.

### Release R1: credible SEO research and Topical Map

- [ ] `SEO-013` Compare paid SERP/keyword providers on actual target markets and secure rights. **Proof:** documented costs and provider bakeoff.
- [ ] `SEO-014` Add provider adapter with no-cost replay fixtures and production feature flag. **Proof:** localization, failure and contract tests.
- [ ] `SEO-015` Seed-query generator from verified business catalog and localized markets. **Proof:** relevance labeling.
- [ ] `SEO-016` SERP search competitor extraction/type classification and candidate UX. **Proof:** direct-vs-directory evaluation.
- [ ] `SEO-017` Competitor owner approval and selective public crawl/dossier. **Proof:** cannot deep-crawl unapproved domains.
- [ ] `SEO-018` Keyword lexicon, Unicode normalization, provenance and metric observations. **Proof:** multilingual tests, all metrics sourced.
- [ ] `SEO-019` Intent classifier + human gold dataset/labeling UI or review fixture. **Proof:** confusion matrix.
- [ ] `SEO-020` Embedding/lexical ANN candidate retrieval with versioned vectors. **Proof:** bounded query cost at 10k+ keywords.
- [ ] `SEO-021` Same-page SERP-overlap scoring and hard-negative constraints. **Proof:** held-out pairwise evaluation.
- [ ] `SEO-022` Constrained clustering, stable IDs, versioned lineage and incremental rebuild. **Proof:** deterministic split/merge fixtures.
- [ ] `SEO-023` Native page candidate mapping, owner-reviewed primary target and cannibalization cases. **Proof:** mapping evaluation.
- [ ] `SEO-024` Coverage state engine with unknown/partial/verified and indexability validation. **Proof:** coverage gold precision.
- [ ] `SEO-025` Topic hubs, recommendations and accessible paginated table. **Proof:** actual task results for new and established sites.
- [ ] `SEO-026` Visual Topical Map with zoom, filters, summary/tile data and URL-deeplink drawer. **Proof:** 10k-node performance and table parity.

**R1 release gate:** selected pilot tenants get relevant competitor choices and keyword clusters, honest demand estimates, proper mappings and five evidence-backed actions. The map remains useful without graphical visualization and does not create unnecessary pages.

### Release R2: SERP-driven content work and measurable execution

- [ ] `SEO-027` SERP Analyzer comparable corpus, extraction and exclusion UI. **Proof:** sample-coverage stats and reproducibility.
- [ ] `SEO-028` Content facet extraction, source citations, guidelines and optional fit score. **Proof:** expert editorial review.
- [ ] `SEO-029` Content Audit detectors and priority/task creation. **Proof:** GSC window/false alert tests.
- [ ] `SEO-030` Native link graph, orphan identification and relevance-ranking suggestions. **Proof:** reviewed accepted-link sample.
- [ ] `SEO-031` Safe contextual anchor AST insertion with revision-check. **Proof:** published link verification.
- [ ] `SEO-032` Evidence-backed content briefs + verified business fact registry. **Proof:** supported/unsupported claims test.
- [ ] `SEO-033` AI writer: typed output, per-section evidence, original-value rubric and QA. **Proof:** reviewer keep-rate baseline and factuality report.
- [ ] `SEO-034` Optional supporting images, provenance/licensing, secure metadata scrubbing. **Proof:** EXIF/XMP/IPTC strip verification.
- [ ] `SEO-035` Minimal content optimizer patches and diffs for existing pages. **Proof:** no unrelated rewriting, stale-revision test.
- [ ] `SEO-036` ChangeSet approval/publish/rollback and native deploy verification. **Proof:** authorized publish and revert drill.
- [ ] `SEO-037` Blog draft scheduling through existing scheduler, product/collection safe publisher. **Proof:** no second blog publishing path.
- [ ] `SEO-038` Strategy/30-60-90 roadmap and work-status reconciliation. **Proof:** priority and dependency acceptance.
- [ ] `SEO-039` Performance and change timeline (GSC and conversion analytics). **Proof:** source-labelled before/after reports.

**R2 release gate:** owner can complete research -> recommendation -> native edit -> review -> publish -> verify -> monitor without copy/pasting into another app. No unsupported fact is auto-published; rollbacks actually repair live HTML.

### Release R3: specialized SEO and scale

- [ ] `SEO-040` Keyword rank tracking by explicit market/device/schedule with no-result handling. **Proof:** source/context display.
- [ ] `SEO-041` E-commerce canonical faceting/variant/schema/out-of-stock audits. **Proof:** realistic product fixtures.
- [ ] `SEO-042` Local business NAP/service area and legitimate location landing-page checks. **Proof:** prevent doorway duplication.
- [ ] `SEO-043` International markets and hreflang/locale URL checks. **Proof:** alternate/canonical tests.
- [ ] `SEO-044` Incremental refresh, provider cache rights, DB retention and partitioning as needed. **Proof:** cost and query benchmarks.
- [ ] `SEO-045` Large-site map LOD/worker layout/crawler fairness. **Proof:** benchmark under 10k+ clusters and competing tenants.
- [ ] `SEO-046` Team/export/reporting features and commercial entitlements. **Proof:** account boundary and usage tests.

**R3 release gate:** performance, SEO correctness and unit economics proven on realistically large pilot data, not single happy-path marketing examples.

### Release R4: automation and AI visibility (owner-gated)

- [ ] `SEO-047` Owner authorization object, review UX, budgets, expiring scopes and pause. **Proof:** revocation tests.
- [ ] `SEO-048` Bounded job planner and safe direct page/category publishing, blog scheduling only. **Proof:** project/market/page limits invariant.
- [ ] `SEO-049` Kill switches, incident notifications, manual override and true rollback drill. **Proof:** disaster game-day.
- [ ] `SEO-050` AI prompt/model sample-run observability and citation parser with disclosures. **Proof:** mention/citation separation.
- [ ] `SEO-051` Ongoing impact/calibration experiments and alert quality review. **Proof:** shadow mode before enabling customers.

**R4 release gate:** independent permissions/cost/security review, staging incident drills and initial low-risk human pilot success. Until then, default stays assisted/manual.

## G2. Stop conditions: when the agent must ask for a decision

Stop the specific destructive/paid path and ask the owner before:

- choosing a paid SERP/keyword provider and contract with unknown redistribution/cache rights;
- enabling Google OAuth in production or requesting new scopes not already authorized;
- changing site renderer routing/canonical policy in a way that could affect existing indexed URL structure;
- deleting/repurposing social data or changing the scheduler holding live blog jobs;
- migrating or deleting old content and collections, changing live URL slugs or redirects;
- selecting final SEO add-on prices, customer allowances or permitting actual overage billing;
- any production DB migration/reindex requiring locks or downtime;
- enabling AI direct publication, page bulk generation, premium image generation or public crawling outside approved domains;
- handling privacy sensitive data, YMYL/legal/health claims, or suspected provider terms noncompliance;
- proceeding when evaluation false-merge/coverage precision or publish-safety gates fail.

Other independent, reversible no-cost implementation can continue after documenting the blocker.

## G3. Feature flags and progressive enablement

```text
Stage 0: all new SEO subsystems hidden; internal fixtures/test projects only
Stage 1: basic native SEO and deterministic score for internal builds
Stage 2: baseline GSC/crawl for selected opted-in own sites
Stage 3: paid research shadow mode with strict budget cap, no publishing
Stage 4: Topical Map + recommendations for beta site owners
Stage 5: native content editing/approval with explicit manual publish
Stage 6: specialized SEO and broader supported markets
Stage 7: supervised low-risk autopilot for explicit opt-in, kill switch on
Stage 8: AI visibility tracker only where provider methodology reliable
```

Each stage requires last stage pass, cost reporting and operator rollback. Roll back by flag **without** dropping user data. For provider incidents: show last good labelled snapshot, stop new charges, keep editor/live site healthy.

## G4. Operational runbooks to produce

Create `docs/seo/runbooks/` with one document per incident:

1. **Provider outage:** flag new paid research unavailable, keep cached evidence with stale label, backoff, alert, queue handling and invoices reconciliation.
2. **OAuth revoked:** stop GSC sync, delete/disconnect token according to user request/policy, keep historical reports per retention policy; show reconnect.
3. **Crawler blocked/security alert:** pause host, inspect robots and DNS, never bypass blocking, quarantine suspicious input and security trace.
4. **Queue backlog:** monitor age, isolate heavy project, maintain fair scheduling, return paid reservation if job canceled before spend.
5. **Negative credit/double charge suspicion:** freeze new paid tasks, reconcile attempt IDs and ledger, customer correction and audit logging.
6. **Autopilot unintended change:** global publish kill switch, inspect activity/changeset/revision, safe revert, root-cause review and customer notice.
7. **Google traffic drop:** avoid causal speculation, check sitewide deployment, robots/canonical/indexability, GSC data anomalies, changed SERP; prioritize investigation.
8. **Data migration failure:** stop writers, backup/restore decision, verify dual read and schema compat, no silent loss of customer content.
9. **Provider licensing notice:** disable unauthorized display/caching, preserve contractual audit trail and re-run with compliant source.
10. **AI unsupported claims published:** immediately pause affected workflow, roll back content safely, identify source/agent chain, notify owner, add gold negative fixture.

## G5. Observability dashboard specification

**Service health:** p50/p95/p99 APIs, worker queue length and oldest job age, retry rate, lease expiries, consumer dead-letter count, crawl pages/min, browser memory/CPU, provider error/timeouts, GSC sync lag, publication verification lag, DB replication/backups.

**Cost health:** provider spend/day/tenant/feature/market, requests per keyword research, cache hit rate, AI input/output tokens and cost, reservation-to-spend leakage, invoice reconciliation and gross margin by SEO entitlement. Keep sensitive numbers internal.

**Quality health:** competitor acceptance rate, keyword-cluster editorial correction rate, false URL mapping, false covered status, content draft keep-rate, QA rejection reasons, internal-link acceptance rate, verified fix closure, SEO task completion time, owner engagement and measured page performance where sufficiently observed.

**Security health:** auth denials and cross-site probes, SSRF rejects, adversarial crawl content, unexpected publish attempts, unusual wallet bursts, revoked scope use, external URL denied events. Never log secrets, full OAuth tokens or unnecessarily sensitive page/user data.

## G6. Suggested release smoke-test scenario: local jewellery shop

This is a test narrative only. Example company and keywords have **no verified search volume** until provider data is fetched.

1. Create test store with physical Delhi location, national shipping optionally disabled, categories for bridal jewellery and custom rings.
2. Publish actual category page and one informative article with honest details, a real conversion form, sitemap and server-rendered canonicals.
3. Onboard: choose local Delhi target, language `en`, target 'appointment enquiries', confirm products/service area/brand and allowed claims.
4. Connect test GSC property if available; otherwise dashboard explicitly says 'not connected' or 'no data' and continues with supported analysis.
5. Crawl owned test store; seed an intentional broken link and noindex in a key landing page. Detect concrete issues and verify fixes later.
6. Run a bounded localized SERP discovery in recorded test data. Distinguish direct jewellers from directories.
7. Approve one relevant direct competitor. No deep crawl allowed before step 7.
8. Research real recorded keywords, maintain unknown when metrics missing. Produce cluster for custom bridal sets and different cluster for general gold purity education.
9. Map current bridal category to correct commercial cluster; mark educational cluster as missing when there is no adequate page.
10. Topical Map shows current partial/full status for category with evidence, the missing educational topic, and counts with stated denominator.
11. SERP Analyzer reads comparable category results, excluding a forum and video result when format not comparable; delivers source-backed editorial guidance.
12. Editor sidebar shows unsaved score changes as category title/intro edits happen, without API charge.
13. User accepts a specific useful description enhancement, previews AST diff, publishes and verifies page rendering.
14. Engine suggests a contextual link from educational article only where visitor intent fits; no forced keyword-stuffed anchor.
15. After deployment, recorded ChangeSet and relevant audit issue verify from live URL; measurement card shows GSC baseline only when available.
16. Cancel a second paid job mid-flight. Show reconciliation/refund rather than negative credits.
17. Simulate cross-project document ID, project owner revocation and stale revision on publication; all are denied.

**Exit:** all 17 steps demonstrable in staging with evidence and screenshots/recordings, plus automated regression coverage for negative cases.

## G7. Suggested smoke-test scenario: large product catalogue

Use generated synthetic products, legitimate categorical relationships and no paid vendor use. Ensure 50k product routes are not all fetched serially for each run; sitemap indexes/chunks render; faceted URL combinations do not explode; source hashes skip unchanged product revisions; 10k+ visible map marks use aggregation; canonical variants behave consistently; ranking/keyword lists paginate; link graph avoids every product linking to every other; background worker budgeting is fair under competing small-site jobs; publishing one product invalidates only its route, cluster coverage and nearby link graph rather than global full recompute.

## G8. Continuous improvement experiments

On opt-in pilots, run meaningful product experiments, not uncontrolled Google-ranking promises:

- **Competitor discovery:** reviewer accepts/edits suggested domains (classification precision).
- **Topical Map:** users successfully map/find one genuinely needed page rather than create duplicates (actionable quality).
- **Content Audit:** suggested page improvements lead to work completion and reduced critical errors (observed fixes).
- **Editor:** users keep useful guidance changes after 2 weeks (editor acceptance/quality).
- **Performance:** track page outcomes by comparable time windows, controlling for obvious seasonality and concurrent changes where possible. Do not claim guaranteed uplift.
- **Provider cost:** track cost per *accepted useful recommendation* and per *completed meaningful task*, not merely calls or generated words.

Experiment analysis must segment by site age, market, type and page indexability. A site with zero search data should not be used to claim a ranking uplift.

---

# PART H. COPY/PASTE KICKOFF PROMPT FOR CODEX OR IMPLEMENTATION AGENT

**The following prompt is intended to be pasted into the actual Velozy repository's agent session together with this manual and the current repository. It deliberately forbids pretending unknown repository structure is confirmed.**

```text
You are implementing Velozy's production SEO Engine.

Mandatory read order:
1. docs/features/agentic-seo-manual.md
2. docs/pricing_config.json
3. Relevant actual repository docs, code, tests, migrations and runtime configuration

Do not assume existing code shape from file names in the specifications.

Begin with M00 ONLY. Inventory current repo: workspaces/apps, Express APIs,
React/Vite admin, page builder/editor AST, CMS/products/collections/dynamic
routes, real published renderer, site SEO metadata, GSC integration,
background scheduler, blog publisher, credits, authorization and migrations.
Create the two discovery documents and show gaps before writing new feature code.

After I approve the M00 architecture mapping, implement M01, then M02 and
subsequent milestones in the documented dependency order, one PR-sized
complete vertical slice at a time. For each change:
- cite actual source files being reused;
- write tests before or with implementation;
- keep tenant/site scoping and versioned evidence;
- prevent paid calls without quote, approved budget and idempotent reservation;
- keep manual website editor/published sites/checkout independent of SEO outages;
- do not invent volumes/KD/ranks, factual business claims or SEO outcomes;
- prefer existing pages, no duplicate/cannibalizing content mill;
- preserve existing blog scheduler and centralized pricing/credit ledger;
- use safe ChangeSets, explicit permissions, preview and rollback for publishing;
- keep autopilot disabled until its own safety release gate;
- log exact test output, runtime behavior, costs, unresolved issues and exit gate.

When the task is incomplete, clearly show what was not built.
Never say a milestone is completed because mock data or a screenshot appears.
Stop and ask before irreversible production migrations, external paid spending,
credential changes, publish enablement, deleting social records, changing live
canonical/route policy or overriding an explicit risk gate.

First response: provide M00 repo findings, reused code paths, contradictions,
missing prerequisites, and a proposed first small implementation PR.
```

## H1. Definition of done for a single coding-agent ticket

A ticket is **done** only if:
- implementation is integrated into actual existing code path, not standalone unused service;
- typed contracts and errors are correct and versioned;
- tests cover happy and failure/permission/unknown conditions;
- tenant/project isolation is tested where data accessed;
- paid calls/queues/costs are bounded and separately accounted for if applicable;
- user sees correct loading, partial, stale, unavailable, failed and completed states;
- operational dashboard/trace supports diagnosis;
- migration/backfill/rollback notes exist for persistent changes;
- a reviewer can reproduce via concrete commands and demo fixture;
- acceptance gate in this manual passes, otherwise status is **blocked or partial**, not done.

## H2. Milestone status checklist for the project owner

```md
# Velozy SEO Implementation Status

| Milestone | Status | Evidence / PR | Risk or blocker |
|---|---|---|---|
| M00 inventory | NOT STARTED | | |
| M01 contracts | NOT STARTED | | |
| M02 persistence | NOT STARTED | | |
| M03 permissions | NOT STARTED | | |
| M04 jobs/credits | NOT STARTED | | |
| M05 native SEO | NOT STARTED | | |
| M06 GSC | NOT STARTED | | |
| M07 crawl/audit | NOT STARTED | | |
| M08 providers | NOT STARTED | | |
| M09 onboarding | NOT STARTED | | |
| M10 competitors | NOT STARTED | | |
| M11 keywords | NOT STARTED | | |
| M12 clustering/mapping | NOT STARTED | | |
| M13 Topical Map | NOT STARTED | | |
| M14 SERP Analyzer | NOT STARTED | | |
| M15 local scores | NOT STARTED | | |
| M16 Content Audit | NOT STARTED | | |
| M17 links | NOT STARTED | | |
| M18 writing/media | NOT STARTED | | |
| M19 changesets/publish | NOT STARTED | | |
| M20 strategy/report | NOT STARTED | | |
| M21 specialty/ranks | NOT STARTED | | |
| M22 autopilot | NOT STARTED | | |
| M23 AI visibility | NOT STARTED | | |
| M24 reliability/evals | NOT STARTED | | |
```

---

# PART I. SUPPORTING PRIMARY DOCUMENTATION AND VERIFICATION BOUNDARIES

## I1. Google platform references

- Google SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google Search Essentials: https://developers.google.com/search/docs/essentials
- Google spam policies, including scaled content abuse: https://developers.google.com/search/docs/essentials/spam-policies
- Google guidance on generative AI content: https://developers.google.com/search/docs/fundamentals/using-gen-ai-content
- GSC Search Analytics query (top-row limitations and dimensions): https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- GSC usage limits (Search Analytics and URL Inspection): https://developers.google.com/webmaster-tools/limits
- GSC URL Inspection API: https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect
- Google canonicalization: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- Structured data general guidelines: https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- Core Web Vitals: https://web.dev/articles/vitals

## I2. Provider and crawling references

- DataForSEO organic SERP overview: https://docs.dataforseo.com/v3/serp-google-organic-overview/
- DataForSEO Google Organic Live Advanced: https://docs.dataforseo.com/v3/serp/google/organic/live/advanced
- DataForSEO Keyword Overview: https://docs.dataforseo.com/v3/dataforseo_labs-google-keyword_overview-live/
- DataForSEO domain intersection: https://docs.dataforseo.com/v3/dataforseo_labs-google-domain_intersection-live/
- Crawlee: https://crawlee.dev/
- Crawlee code/docs: https://github.com/apify/crawlee
- Cheerio: https://cheerio.js.org/
- pgvector: https://github.com/pgvector/pgvector
- PostgreSQL SKIP LOCKED: https://www.postgresql.org/docs/current/sql-select.html
- ExifTool: https://exiftool.org/

## I3. Surfer product feature references (not proprietary algorithms)

- Surfer introduction: https://docs.surferseo.com/en/articles/7859434-what-is-surfer
- Sites: https://docs.surferseo.com/en/articles/11027846-introduction-to-sites
- Topical Map / content ideas: https://docs.surferseo.com/en/articles/11401619-step-1-how-to-find-new-content-ideas
- Content Audit: https://docs.surferseo.com/en/articles/9182497-content-audit-beta
- SERP Analyzer: https://docs.surferseo.com/en/articles/7831346-reading-your-results-in-serp-analyzer
- Content Editor: https://docs.surferseo.com/en/articles/5700347-content-editor-overview
- AI Tracker: https://docs.surferseo.com/en/articles/11667466-ai-tracker

**Source boundary:** Surfer describes its external products, but not the exact internal Topical Map graph placement, content score, keyword clusters, sources or relevance thresholds. Every hybrid algorithm, suggested schema, weights, version, gating strategy and API design in this manual is a **Velozy engineering proposal**. Google documentation establishes SEO/policy/API limits; it does not validate SEO score weights or traffic-growth forecasts. Provider API endpoints and licensing are current-doc candidates requiring validation during M08. Follow the real repo and current contracts over stale sample paths or hardcoded examples.

## I4. Changes from the previous blueprint that are deliberate

- Recasts conceptual phases as 25 dependency-aware build milestones and 51 implementation tickets.
- Preserves original deterministic rubric weights but *separates* paid SERP-informed scoring.
- Provides explicit typed interfaces, data state semantics, full budget/reservation and job replay algorithms.
- Emphasizes gold labels and false-merge control before Topical Map graphics.
- Makes page/content verification and real rendered publishing mandatory, including dynamic collections and safe internal links.
- Adds failure-mode, rights/privacy, observability, migration, permissions and release procedures.
- Keeps blog publishing via original scheduler, not through an invented second publisher.
- Forbids automatic high-risk route/canonical/pricing/legal edits even in autopilot.

**Completion condition for this document:** It is usable as a comprehensive build specification. **It does not mean the described implementation, providers, tests or infrastructure have been run or verified against the actual repository.** Start M00, record real repo facts, then implement one gated ticket at a time.

---

**END OF VELOZY SEO AGENT IMPLEMENTATION MANUAL**
