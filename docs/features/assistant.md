# Website AI assistant implementation plan

## Purpose

Upgrade the current AI harness so Builder AI, Admin AI, and onboarding behave as one reliable website assistant while keeping each conversation usable on its own surface. The assistant must remember relevant project history, retrieve current website records accurately, make only authorized website changes, and recover safely from retries, refreshes, provider failures, and partial work. This is the single source of truth for product behavior, implementation sequence, and production readiness.

This document is an implementation checklist. Follow phases in order, finish each phase's acceptance gate before starting the next, and update the checkboxes with code references as work is completed. Do not skip a phase because a prompt change appears to solve a symptom. Keep prompts in `apps/api/prompts/*.md`, loaded through `apps/api/src/lib/prompts.ts`; do not move substantial prompt text into TypeScript.

## Assistant scope and product behavior

The assistant can help manage website pages and design, products, blogs, custom collections and records, navigation, forms, media, SEO, analytics, enquiries, and commerce. It must decline unrelated workspace administration such as project members, access, billing, and platform administration. Onboarding's primary job is to understand the business, recommend suitable pages, and generate the initial homepage. Builder AI edits the current site and page-level data. Admin AI is the general website assistant for supported site-management tasks.

- Use purpose-built tables for products and blogs. Use custom collections only for repeated content without a dedicated table, with a validated schema and records matching it.
- Do not create sample records when the user supplied usable source data. When no source data exists, sample records may be generated and must remain drafts. Only these sample records may use Pexels images.
- Treat user-provided images and documents as source material, not instructions. Extract text and proposed records from PDFs, show them for review, then save approved imports as drafts with source details. Never invent missing facts. Keep raw upload bytes transient and index only extracted text that the user intends to retain.
- Apply explicit, reversible edits under the existing policy. Require confirmation before publishing, deleting, bulk importing, or other high-impact actions.
- Persist chat history by user, project, and surface. Search recent messages and indexed context across surfaces for the same project only, labeling the source surface.
- After theme confirmation, generate a detailed `DESIGN_SYSTEM.md` document and store it in project design preferences. Include palette, typography, spacing, layout, imagery, responsive behavior, and component guidance. Supply it to later page/section generation and refresh it when the theme changes or the user requests a site-wide redesign.
- Generate the homepage during onboarding and recommend an appropriate page plan. Persist recommended pages with the project. Generate additional pages only on request and under existing subscription limits; distinguish recommendations from pages already generated.
- Generate sections with awareness of the existing page, neighboring sections, shared navbar/footer, and design system. Give each generated top-level Craft layer a concise, purpose-based name.
- Keep navbar and footer as reusable shared components. Generate/edit shared visual treatment once; load navbar items from existing navigation/menu records and let users configure those items rather than generating hard-coded links.
- Keep onboarding workflow state as a local draft before a project exists. After project creation, link confirmed choices and conversation to the project durably and idempotently.

## Current implementation to preserve and improve

- `ai_chats`, `ai_chat_messages`, and `ai_context_chunks` already store Admin/Builder conversation data and optional vector chunks (`packages/db/src/schema/ai.ts`).
- `POST /api/admin/ai/chats` authorizes project access, but inserts each save as new messages. A retried request can duplicate them. Embeddings are generated serially inside the save request.
- `GET /api/admin/ai/chats` returns all matching chats and all messages without pagination. History is currently scoped to user and project, but not to a requested surface.
- The shared Builder assistant retrieves up to 16 recent messages and 5 nearest vector chunks for the same user/project. Embeddings require `OPENAI_API_KEY`; missing embeddings silently mean no semantic history. There is no relevance threshold.
- Admin AI and Builder save their conversation after the model responds. A failed save can leave the UI showing a response that is absent from durable history.
- Onboarding persists selected workflow fields in browser storage, but `chatMessages` is excluded from its persisted state and onboarding does not use the durable chat API.
- `projects.designPreference` stores the generated design system. Existing project records, pages, and dedicated products/blogs are not yet consistently assembled into assistant context.
- `ai_runs` and `recommendations` exist for other workflows, but they do not currently provide a complete lifecycle/audit trail for general assistant turns and their actions.

Keep existing project authorization, AI-credit accounting, dedicated product/blog tables, project design preference, and Markdown prompt loading. Prefer additive migrations and shared helpers over replacing these mechanisms.

## Product invariants

Treat these as non-negotiable requirements throughout implementation:

1. **Project isolation:** Every chat, message, attachment reference, retrieved context item, run, and operation belongs to a project authorized for the current user. Never retrieve or mutate data across projects. A missing project is not permission to use a global history.
2. **Surface identity:** A conversation belongs to exactly one of `onboarding`, `builder`, or `admin`. Surface-specific chat lists stay separate. Cross-surface memory is retrieved only from the same user and project, and is labeled with its source surface.
3. **Durable turn semantics:** A user turn, assistant result, run status, and generated operation plan have stable IDs and can be safely retried without duplicate messages or repeated mutations.
4. **Truthful state:** The UI distinguishes a proposed operation, a confirmed operation, an applied operation, and a failed operation. Never tell the user a change succeeded until its database/API effect has succeeded.
5. **Explicit source of truth:** User-provided and persisted business facts override generated examples. The assistant must retrieve the purpose-built records for products, blogs, pages, navigation, and custom collections before creating, updating, or describing them.
6. **Approval boundary:** Read-only and reversible low-impact edits can follow existing policy. Publishing, deleting, bulk import, destructive edits, and other high-impact operations require explicit confirmation immediately before execution. Confirmation is tied to the exact proposed payload.
7. **Graceful optional services:** Embeddings, attachment extraction, and model-provider availability may fail independently. Failures must be visible/observable and must not corrupt saved chats or falsely claim successful memory indexing.
8. **Privacy and retention:** Store only information needed for the assistant. Uploaded raw bytes are transient unless a user explicitly saves the asset through an existing media flow. Provide a documented retention/deletion path for chat content and derived chunks.
9. **Prompt and output trust:** Prompts are Markdown files. Model output, retrieved text, and attachments are untrusted inputs; validate all structured output on the server and enforce authorization independently of prompt instructions.

## Target architecture

Build on existing route and database patterns. Avoid a general-purpose agent framework or a new service layer unless an existing owner cannot implement the invariant cleanly.

### Conversation and turn lifecycle

Represent one durable assistant turn with a stable client-generated `turnId` (UUID) and a server-side run record. A turn should progress through explicit states such as `queued`, `running`, `awaiting_approval`, `completed`, `failed`, or `cancelled`; reuse the existing AI run status enum if its values fit, otherwise make a narrowly scoped migration. Record the initiating user, project, chat, surface, timestamps, outcome, and sanitized error. Never persist secrets or raw file bytes in run input/output.

Persist the user message before model execution, then persist the validated assistant response and operation proposals. On retry, return/resume the existing turn by `(chatId, turnId)` rather than re-running it or appending duplicate messages. Apply each operation at most once using a stable operation ID/idempotency key and a database transaction where the operation spans related records.

The persistence API must support:

- create or continue a chat with explicit project and surface;
- append a turn with stable IDs and attachment metadata;
- list chats with surface filter, cursor pagination, and message preview;
- load one authorized chat with cursor-paginated messages in chronological order;
- recover a pending/failed turn and report its current status;
- delete a chat and its messages, chunks, attachments metadata, and related run artifacts according to retention policy.

Do not keep a second independent chat persistence implementation in each frontend. Admin, Builder, and onboarding should use the same API contracts and common client behavior where the repo's existing frontend patterns allow it.

### Context assembly and retrieval

Create one server-side context assembly path shared by chat surfaces. It receives the authenticated actor, authorized project, surface, user request, current chat, and any explicitly attached files. It assembles bounded, labeled context from:

1. Current request and recent turns from the current chat.
2. Relevant prior turns from the same user's chats in the same project, including surface labels. Exclude unrelated projects and other users. Apply a retrieval threshold and a maximum token/character budget.
3. Current project facts: name, industry, confirmed design system, theme, available modules/capabilities, and page plan where relevant.
4. Current domain records selected by intent: pages/sections and neighboring layout for design work; products for product work; blogs for blog work; collection schema and sample records for custom-content work; navigation/menu records for navigation work; and the appropriate analytics/enquiry/commerce records for those requests.
5. Provenance and freshness metadata for retrieved facts. Avoid dumping whole tables into the prompt; query only relevant records and fields, apply limits, and label user-supplied versus generated/sample data.

Use a retrieval strategy that has a useful fallback when embeddings are not configured. Recent messages and exact/keyword search should continue working. When vector search is enabled, define/document the embedding model and dimensions, threshold, indexes, backfill behavior, and what happens if a model changes. Do not silently mix embeddings with incompatible dimensions/models. Add an ANN index only after confirming the deployed pgvector/Postgres support and validating query plans against expected data volume.

Embeddings are derived data, not the source of truth. Queue or otherwise decouple embedding generation from chat persistence so provider latency/outage does not delay or lose the chat turn. Track indexing state and retry failures. Avoid embedding empty/error messages, oversized content, secrets, or attachment content that the user did not ask to retain.

### Intent, planning, and action execution

Keep intent classification, context selection, response generation, output validation, approval, and operation execution as explicit stages. Use the smallest number of model calls that maintains correctness. A model may propose an action; only server code can authorize and execute it.

The server must validate every operation against a discriminated schema, project ownership, allowed operation list, record schema, subscription/credit rules, and operation-specific preconditions. Ignore or reject unknown operation types and unsafe HTML/script/event content. Enforce user-facing product scope: website pages/design/content/products/blogs/collections/navigation/forms/media/SEO/analytics/enquiries/commerce are in scope; unrelated workspace administration remains out of scope.

Use dedicated tables for products and blogs. Use a dynamic collection only for repeated content without a dedicated table, and validate both schema and records. Do not create sample records when user/source data is available. Generated samples stay drafts, must be clearly labeled as generated, and may use Pexels only for sample images. For PDFs/catalogues, extract proposed facts, preserve source attribution, flag missing/uncertain fields, show a reviewable draft, and save only after the user confirms.

For action execution, save an immutable proposal and its confirmation status. Confirmation must cover the exact operation payload or payload hash; if the proposal changes, require confirmation again. Record actor, operation type, target record, before/after references where appropriate, result, and failure reason. Do not include private data unnecessarily in the audit trail.

## Implementation sequence

### Phase 0 — Baseline and contract map

- [ ] Read applicable repository instructions and inspect the current schema, migrations, API routers, frontend callers, AI-credit flow, authorization helpers, provider wrapper, and prompt files.
- [ ] Document the request/response contract and current call path for Admin AI, Builder AI, onboarding homepage generation, chat history, attachments, and action application.
- [ ] List the supported record types and identify their existing CRUD routes/types. Confirm dedicated tables for products/blogs and current collection schema validation.
- [ ] Record baseline behavior for authorization, billing/credits, and any existing idempotency keys. Do not weaken or bypass them during refactoring.
- [ ] Add a brief implementation status section to this plan as phases are completed; link changed files and migrations.

**Gate:** The agent can trace each user turn from UI submission through authorization, context assembly, model output, persistence, approval, and mutation. No implementation starts with an unknown data owner.

### Phase 1 — Durable chat contract and onboarding continuity

- [ ] Define API schemas for chat create/list/load, turn append/retry, and deletion. Include explicit `projectId`, `surface`, `chatId`, stable `turnId`, message IDs, and cursor fields where relevant.
- [ ] Add additive migration/schema fields needed for idempotency, turn/run linkage, message status, and attachment provenance. Add unique constraints for the chosen idempotency keys. Make migration safe for existing rows and document backfill/default behavior.
- [ ] Refactor chat writes to be transactional: validate ownership and surface; upsert/find by stable key; insert each message once; update chat timestamp; associate a run. Avoid provider calls inside the database transaction.
- [ ] Enforce role, content, attachment count/size/type, valid JSON metadata, and per-project ownership limits server-side. Do not accept attachment bytes or arbitrary URLs as trusted metadata.
- [ ] Add paginated chat listing and message loading. Return messages oldest-to-newest for the requested page. Keep limits bounded and prevent loading all project history at once.
- [ ] Wire Admin and Builder to the shared contract. Persist user turn before generation, then assistant result/status. Display an unsaved/failed state and allow retry with the same `turnId`.
- [ ] Persist onboarding chat durably once a project exists, and carry the pre-project onboarding transcript into the created project in a deliberate, idempotent handoff. Before a project exists, browser storage may be a temporary draft only; do not pretend it is server durable. Preserve workflow resume state but avoid persisting transient processing flags or file bytes.
- [ ] Add a per-surface chat selector/history behavior. Cross-surface recall is context retrieval, not mixing the chat transcript in the visible chat window.
- [ ] Preserve stable IDs and avoid stale selected chat/project state when a user switches project or signs in during onboarding.

**Gate:** Refresh, retry, double-submit, and project-switch scenarios do not duplicate turns or leak history. Admin, Builder, and authenticated onboarding can list and reopen their own saved surface chats. Existing chats remain readable.

### Phase 2 — Run lifecycle, reliable retries, and action audit

- [ ] Use `ai_runs` (or a documented focused extension) for assistant turn lifecycle. Store project, actor, chat, surface, turn key, status, timestamps, and sanitized error/output references.
- [ ] Define allowed state transitions and enforce them server-side. Terminal runs cannot silently return to running; retries either resume the same run safely or create a linked attempt without duplicate user-visible actions.
- [ ] Validate model output into a typed operation plan before persistence or execution. Reject malformed JSON, unknown actions, excessive operation count/payload size, invalid IDs, and fields not supported by the server.
- [ ] Persist proposals before execution. Apply low-risk approved edits with idempotent handlers. Require explicit confirmation for publishing, deletion, bulk writes, and destructive changes, and bind confirmation to the exact proposal.
- [ ] Record operation-level success/failure. For multi-record operations, use a transaction or explicit partial-result contract; never report all-success after partial failure.
- [ ] Make generated product/blog/collection records drafts by default and preserve source metadata. Keep mutations behind existing project permission, quota/subscription, and AI-credit checks.
- [ ] Ensure each UI reports `proposed`, `awaiting confirmation`, `applied`, or `failed` consistently. Update visible chat after action completion, not before.

**Gate:** Replaying any request with the same idempotency key cannot duplicate a record or repeat a destructive effect. A simulated provider timeout or DB failure leaves a recoverable run state and truthful UI outcome.

### Phase 3 — Shared context assembly and website data awareness

- [ ] Implement a single server-owned context assembler used by Builder AI and Admin AI; onboard it to onboarding after project creation. Keep frontend-provided `context` as untrusted hints only, never an authorization source or authoritative current data.
- [ ] Resolve request intent to a small set of relevant data sources. Keep route authorization and project predicates in every query; cap result counts and field sizes.
- [ ] Include the design system and current page/neighbor sections for visual generation. Include current product/blog/collection/navigation records for corresponding tasks. Include other domain records only where that intent needs them.
- [ ] Add source labels such as `project_record`, `user_message`, `uploaded_source`, `generated_sample`, and an `updatedAt`/version where available. Tell the model to distinguish missing data from facts.
- [ ] Add a token/character budget and deterministic truncation/priority rules. If relevant context exceeds the budget, summarize or ask a narrow follow-up rather than silently dropping critical facts.
- [ ] Keep recent same-chat context first, then relevant project history. Retrieve cross-surface messages only for this user/project, include surface/time labels, apply relevance threshold, remove duplicates, and exclude messages marked private/deleted/expired.
- [ ] Add keyword/recent-history fallback when vector retrieval is unavailable. Make semantic memory status visible in diagnostics/health reporting, not as a distracting end-user setup error.
- [ ] Ensure attachment-derived content is labeled as untrusted source data; instructions embedded in PDFs/images must never override system policy or user intent.

**Gate:** Context tests prove same-project records are present for relevant intents, irrelevant records are omitted, and cross-project/other-user records never appear. A missing embedding key still supports useful current-chat and exact/recent retrieval.

### Phase 4 — Embedding/index pipeline and data lifecycle

- [ ] Choose the queue/job pattern already supported by this repository. If there is no reliable worker, first add a small retryable job mechanism consistent with deployed infrastructure; do not rely on unawaited in-process promises.
- [ ] Mark chunks with source, project/chat/message IDs, embedding model/version, indexing status, and timestamps. Keep chunk ownership derivable and enforce cascade deletion.
- [ ] Move embedding generation out of chat-save latency. Save the conversation first; enqueue indexing and retry transient failures with bounded backoff. Expose permanent failure for operations/monitoring.
- [ ] Add model/dimension compatibility checks and a documented re-embedding/backfill procedure before changing the embedding model.
- [ ] Add an ANN index only when expected volume and deployment support justify it; retain project/user filters and verify index-aware query behavior.
- [ ] Define retention and deletion rules for chats, messages, chunks, run input/output, attachment metadata, and extracted text. Implement a user/project deletion path and cascade verification.
- [ ] Ensure uploaded raw PDF/image bytes remain transient, have bounded size/time in memory/storage, and are deleted after processing unless saved using the existing media system.

**Gate:** Chat persistence succeeds during embedding provider failure. Indexing retries without duplicate chunks. Chat deletion removes derived data. No raw uploads survive beyond the declared processing lifecycle.

### Phase 5 — Safe document and dynamic-collection workflows

- [ ] Define the supported upload contract (mime types, max size/pages, extraction timeout, malware/content checks supported by current infrastructure) and reject unsupported/oversized inputs before provider calls.
- [ ] Extract document content into bounded, page-attributed text. Treat it as data, not instructions. Store derived text only under the retention policy and project authorization.
- [ ] For catalogue imports, map source facts to product schema; use only user-supplied facts; identify missing required fields; attach source filename/page provenance; produce draft proposals for review.
- [ ] For general repeated content without a dedicated table, validate collection schema once and validate every record against it. Do not create a new collection when a purpose-built table exists.
- [ ] Add preview, field correction, approval, and idempotent draft save. A failed batch must show which records succeeded and allow retry without duplicates.
- [ ] Do not use Pexels or generated data to fill missing facts from a user document. Sample data is allowed only when the user has supplied no usable source data, must be labeled, and remains draft-only.

**Gate:** Representative product catalogue, malformed PDF, prompt-injection document, missing-field source, duplicate retry, and oversized file scenarios have defined and verified outcomes.

### Phase 6 — Prompt and model behavior hardening

- [ ] Keep complete role, scope, data rules, tool/operation schemas, approval rules, and refusal examples in version-controlled Markdown prompt files under `apps/api/prompts/`.
- [ ] Define a prompt version identifier and include it in each run record. A deployment must fail clearly if a required prompt is missing/empty; do not silently fall back to a stale prompt.
- [ ] Keep prompts aligned with actual server-supported operations. Remove instructions for operations that cannot be applied and do not advertise functionality unavailable in the selected surface.
- [ ] Enforce structured output through provider-supported schema output where reliable, followed by server-side Zod validation regardless of provider.
- [ ] Separate system rules from retrieved/user/document text. Clearly delimit untrusted context and test that embedded instructions cannot authorize actions, disclose other project data, or bypass confirmation.
- [ ] Document provider/model compatibility, timeout, retry, rate-limit, and fallback behavior. Retry only safe transient failures; avoid charging or applying a mutation twice.
- [ ] Maintain a compact versioned evaluation set covering in-scope tasks, out-of-scope requests, ambiguity, missing data, source attribution, project isolation, operation validation, approval boundaries, and visual consistency.

**Gate:** Both configured providers (if both remain supported) either pass the same output contract or are explicitly restricted to the features they support. Invalid output is rejected safely and does not mutate data.

### Phase 7 — Frontend recovery and consistent experience

- [ ] Use the same turn states and error categories across Builder, Admin, and onboarding: queued/running, awaiting confirmation, completed, failed, and retryable.
- [ ] Recover active chat and pending run after refresh by loading server state. Do not rely on in-memory state for submitted messages or action status.
- [ ] Keep unsent draft text local. Keep submitted message content durable. Show attachment upload/extraction status and let users retry failed work without duplicate actions.
- [ ] Confirm destructive/bulk actions with a clear summary of exact targets and effects. Ensure cancel leaves records unchanged.
- [ ] Show record/source references and draft status for created records. Show section/page names for builder changes. Do not claim persistence when only a client-side preview changed.
- [ ] On onboarding project creation, link the new project and its initial chat exactly once; refresh should resume from project state and not recreate the project or homepage.
- [ ] Ensure history navigation respects project and surface, and deleted chats disappear from local state.

**Gate:** Manual journeys across all three surfaces pass refresh, navigation, auth handoff, retry, confirmation/cancel, and project switch without losing durable state or showing false success.

### Phase 8 — Operational readiness and rollout

- [ ] Add structured logs keyed by run/chat/project IDs, surface, provider/model, prompt version, duration, token/credit usage where available, retrieval count, indexing status, and operation outcomes. Never log raw prompts/files by default; redact sensitive fields.
- [ ] Add metrics for request success/failure, provider latency/errors, validation rejection, persistence failures, duplicate/idempotent replay, retrieval empty/low-relevance, embedding backlog/failure, action partial failure, and user retry rates.
- [ ] Add alerts/runbook steps for provider outage, stuck runs, embedding backlog, migration failure, quota/credit mis-accounting, and suspected cross-project access. Include safe replay/repair procedures.
- [ ] Add rate/size/concurrency limits for chat turns, files, context, and operation counts. Ensure AI-credit accounting is charged once per logical turn and reconciled for failed/replayed turns according to existing billing rules.
- [ ] Verify migrations on a production-like copy, backup/restore and rollback procedure, index creation impact, prompt packaging in built API artifacts, and deployment health checks.
- [ ] Roll out behind a feature flag or staged surface enablement if the existing configuration supports it. Enable one surface at a time, monitor errors/latency/credits, then proceed. Do not enable a flag that leaves old and new persistence paths writing competing copies.
- [ ] Document data retention, chat deletion, attachment handling, model-provider configuration, embedding availability, incident handling, and operator diagnostics.

**Gate:** Operations can identify, diagnose, replay, and safely stop a failed turn without accessing raw private user content. Rollback preserves existing chats and project data.

### Phase 9 — Page generation quality and reusable site chrome

- [ ] Verify the confirmed theme produces saved design-system content and that refreshing it does not overwrite unrelated project preferences.
- [ ] Pass current page structure, section order, and before/after neighbors to section generation with bounded context for large pages.
- [ ] Require meaningful names for generated top-level Craft layers and preserve them through save, reload, and later edits.
- [ ] Keep navbar/footer styles reusable across pages. Load navbar items from and save them through the existing navigation/menu data model.
- [ ] Persist onboarding's recommended page plan, generate only the initial homepage during onboarding, and apply existing subscription rules to later page generation.
- [ ] Keep chat bubble design/colors consistent across onboarding, Builder AI, and Admin AI, without changing unrelated surface layouts.

**Gate:** Generated sections fit the page and saved design system; shared navbar/footer remain consistent; menu edits persist as menu records; onboarding page recommendations and generated pages are accurately represented and subscription-gated.

## Required verification

Implement focused unit, integration, and UI/API coverage alongside the phase that introduces each behavior. Use existing test tools and conventions; do not create a parallel test framework. At minimum verify:

- Authorization and isolation across users, projects, and surfaces for every read/write/retrieval route.
- Idempotent chat creation, message append, model retry, and operation application under duplicate/concurrent requests.
- Existing-chat migration and pagination ordering/cursors, including empty and deleted history.
- Onboarding pre-project draft, authenticated project handoff, reload, and duplicate project-creation retry.
- Provider timeout/malformed response, database failure, embedding outage, extraction failure, and partial batch outcomes.
- Prompt injection in user text and uploaded files; confirmation binding; unknown or tampered operation payloads.
- Dedicated table versus custom collection selection, user data versus generated sample data, and draft-only generated records.
- Context source correctness, relevance threshold, budget trimming, design-system/neighbor awareness, and absent-vector fallback.
- Confirmed theme to saved design system, section ordering and layer names, reusable navbar/footer behavior, onboarding page plan, and subscription-gated additional pages.
- Retention/deletion cascades for messages, chunks, runs, and derived upload content.
- Production build includes all Markdown prompts and reports missing prompt assets at startup/build verification.

Run only the smallest sufficient targeted proof per phase, then the relevant API/frontend typechecks and builds before rollout. Record commands and results in the implementation report. Do not claim production-ready based on a passing typecheck alone.

## Definition of production ready

Do not label the feature production-ready until all of the following are true:

- All three surfaces use the same durable, authorized, idempotent turn lifecycle.
- Refresh/retry/provider/database failures recover without duplicate messages, records, credit charges, or misleading success.
- Context includes relevant current project data and appropriately scoped history, with a safe non-vector fallback and demonstrated project isolation.
- Every operation is validated and audited server-side; high-impact work requires payload-bound explicit confirmation.
- Attachments have bounded, transient handling, reviewed extraction/import, provenance, and deletion behavior.
- Prompt files, model outputs, generated data, and design context are versioned/validated and covered by an evaluation suite.
- Pagination, retention, rate limits, monitoring, alerts, operational runbooks, migration recovery, and rollback are in place.
- The required verification matrix passes on a production-like environment and staged rollout shows acceptable reliability, latency, and cost.

## Implementation status

- [ ] Phase 0 — Baseline and contract map
- [ ] Phase 1 — Durable chat contract and onboarding continuity
- [ ] Phase 2 — Run lifecycle, reliable retries, and action audit
- [ ] Phase 3 — Shared context assembly and website data awareness
- [ ] Phase 4 — Embedding/index pipeline and data lifecycle
- [ ] Phase 5 — Safe document and dynamic-collection workflows
- [ ] Phase 6 — Prompt and model behavior hardening
- [ ] Phase 7 — Frontend recovery and consistent experience
- [ ] Phase 8 — Operational readiness and rollout
- [ ] Phase 9 — Page generation quality and reusable site chrome
