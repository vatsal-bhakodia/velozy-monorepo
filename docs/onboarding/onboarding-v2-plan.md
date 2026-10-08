# Onboarding reliability and feature plan

## Goal

Help a new user give the site builder enough accurate information, understand what will be generated, and recover when generation or setup fails. Keep the current onboarding visual theme and reusable UI. Do not show the business description in the site profile card.

## Implementation progress

- Completed in the current implementation pass: internationalized profile validation, site-type-based page suggestions with assistant edits in Site Structure, a persisted requested-page list, manual description progression, preservation of style/theme choices, strict generated-section checks, section retry/resume without duplicate saved or live sections, reversible section removal, project-creation idempotency, and removal of automatic sample-content seeding.
- Remaining before the full plan is complete: platform subscription checkout and authoritative entitlement enforcement, booking management and public appointment flow, a working paid AI-logo generator, and SEO add-on competitor research/strategy workflows.
- Do not enable publishing or paid-module gates until the platform subscription path can grant and revoke project entitlements reliably.

## Product rules

- Collect the business name, industry, business description, and site type/focus in the profile step. In Site Structure, seed and confirm a page plan first, then generate and refine homepage sections. Keep these answers editable and preserve them when navigating backward.
- A free account can generate, preview, and publish one homepage on a Velozy subdomain. It cannot create additional pages or connect a custom domain. Paid Launch and Scale plans use the limits and live prices in `pricing_config.json`.
- Ask the user to review generated content before publishing. Do not silently publish or seed fictional sample content.
- Booking setup is a real optional module with services, availability, appointments, confirmations, and customer booking management.
- AI logo generation is a subscription-gated feature. Competitor-informed SEO planning requires the separate SEO add-on and user confirmation before competitor crawling.
- Platform subscription billing is separate from Dodo credentials/webhooks used by merchants for their own storefront payments.

## Implementation phases

### 1. Input and navigation reliability

- Accept valid international names and industry labels; enforce documented maximum lengths in the UI and API.
- Show actionable validation beside missing or invalid fields and explain disabled progression.
- Remove timed chat auto-advance. Preserve the business description and all design choices through back/forward navigation and reload where onboarding state is already persisted.
- Make profile and page-plan answers reviewable before generation.

### 2. Homepage generation and recovery

- Collect and confirm intended page names in Site Structure before generating homepage sections, while limiting free generation to the homepage draft.
- Validate model output (nonempty section list, valid unique IDs/names, supported section kinds/configuration) before storing it.
- Add retryable error states, prevent duplicate live append/project creation, and expose partial generation failures rather than marking incomplete work complete.
- Make section removal undoable and require user confirmation before publishing or adding sample content.

### 3. Entitlements and subscriptions

- Treat `pricing_config.json` prices and limits as live; keep Free publishing limited to one homepage on a Velozy subdomain.
- Reuse and extend existing subscription records for project/site scope. Add server-authoritative entitlement checks for preview, publish, pages, and modules.
- Add platform checkout, signed/idempotent subscription webhooks, status reconciliation, and price-version persistence. Do not trust client-supplied prices or plan state and do not apply automatic overage charges.
- Keep merchant payment-provider setup and order webhooks isolated from platform subscription billing.

### 4. Paid modules

- Implement booking configuration and booking lifecycle APIs/UI with appointment conflict prevention and customer confirmation.
- Connect AI logo generation to an actual generation action with entitlement and usage checks, clear progress, and retryable failures.
- Gate competitor-informed planning behind the SEO add-on. Discover candidates from business/location, require user confirmation before crawling, label external estimates, avoid invented metrics/copying, and pause metered jobs when allowance is exhausted.

## Data and API expectations

- Persist the onboarding page plan and generation state so reloads and retries do not lose user decisions or create duplicate projects.
- Add authenticated APIs for plan/price display, checkout and subscription status, entitlements, page-plan persistence, and booking management. Validate authorization and entitlements server-side.
- Add schema migrations for project-scoped subscription/entitlement state and any onboarding/booking records; migrations must be reversible or have a documented safe rollback.
- Use idempotency keys for project creation, checkout callbacks, webhook events, and expensive generation actions. Use integer minor units for prices.

## Acceptance checks

- International and non-Latin business names work; invalid, missing, and overlong answers show actionable errors.
- Navigation does not erase answers, and description submission never advances on a timer.
- Free users can generate/retry/review one homepage and publish it on a Velozy subdomain; additional pages require a paid plan.
- Invalid/empty/duplicate model sections are rejected; failed or partial generation remains retryable and never silently completes.
- Refresh/retry does not duplicate a project, page section, subscription grant, appointment, or webhook side effect.
- Booking conflicts are rejected; unauthorized users cannot read or change project bookings.
- Invalid webhook signatures grant no entitlement; webhook retries are idempotent; merchant Dodo integrations remain unaffected.
- AI logo and SEO research are gated by the correct add-ons and usage allowances, with estimates clearly identified.

## Rollout

Ship input/generation reliability first. Deploy additive database migrations before APIs that depend on them. Enable platform billing and paid modules only after provider credentials, webhook verification, price configuration, and an end-to-end staging checkout are available. Existing projects and merchant payment integrations must continue working throughout rollout.
