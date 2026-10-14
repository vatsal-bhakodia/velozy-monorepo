# Documentation guidance

These instructions cover documentation organization and maintenance. They do not replace code-specific instructions or repository guidance for application changes.

## Document index

| Document | Purpose |
| --- | --- |
| `docs/README.md` | Documentation index and contributor entry point. |
| `docs/style/admin-design.md` | Single visual and interaction guide for admin pages. |
| `docs/style/marketing-design.md` | Visual and interaction guidance for marketing pages. |
| `docs/platform-billing.md` | Platform subscription billing setup and operations. |
| `docs/pricing_config.json` | Canonical product pricing and plan-limit configuration. |
| `docs/marketing-site-expansion.md` | Marketing site expansion requirements and phases. |
| `docs/features/assistant.md` | Unified AI assistant behavior, harness architecture, implementation phases, and production readiness. |
| `docs/features/agentic-seo-manual.md` | Canonical SEO engine design, algorithms, implementation milestones, safety gates, and verification plan. |
| `docs/features/onboarding.md` | Onboarding input, generation, subscription, and paid-module requirements. |
| `apps/api/prompts/*.md` | Runtime instructions for individual AI tasks. These are loaded by the API and are not product-planning documents. |
| `apps/*/components/README.md` | Local component ownership and migration notes for each app. |

The repository root `README.md` describes the project and developer setup. Component `README.md` files stay beside their code because their guidance is local to that directory.

## How to maintain docs

- Before creating a Markdown file, search this index and existing docs for the same subject. Extend the existing owner when the scope matches.
- Keep one canonical document per subject. Merge overlapping guidance, resolve contradictions against current product behavior/code, and remove the old file after updating links.
- Use short, lowercase, descriptive names with hyphens. Keep files under `docs/` and use a subdirectory only when it groups a real topic family such as `ai/` or `onboarding/`.
- Keep product specs, implementation plans, operational setup, and runtime prompts distinct. Do not merge runtime prompts into product plans: prompts are executable inputs with their own deployment path.
- Keep documentation-specific instructions here. Keep component-specific instructions in the component README next to the code. Avoid duplicating general repository instructions.
- State whether a document describes current behavior, planned work, or operational setup. Keep implementation status and links current when code changes.
- Prefer actionable requirements, concise headings, checklists, and acceptance criteria. Avoid repeating repository instructions or copying large code sections that will drift.
- When renaming or deleting a doc, search the repository for its old path and update every link/reference in the same change.
