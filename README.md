# Velozy

Velozy is a platform for small businesses to create, edit, publish, and manage their websites. This monorepo contains the public marketing site, authenticated admin, visual page builder, site renderer, API, background worker, and shared TypeScript packages.

## Product overview

The main workflow starts with a business profile and site plan, then takes the owner through generated or manually edited pages, publishing, and ongoing site management. The platform also includes content and blog management, forms and enquiries, commerce workflows, site metadata, and project settings. Feature availability can depend on a plan or integration; check the current application and [pricing configuration](docs/pricing_config.json) before describing a capability as available.

## Repository layout

| Path | Responsibility |
| --- | --- |
| `apps/marketing` | Public marketing website (Next.js, port 3000). |
| `apps/admin` | Admin application for authentication, onboarding, site and business management (React/Vite, port 5173). |
| `apps/builder` | Visual page editor (Next.js, port 3001; proxied through the admin during local development). |
| `apps/sites` | Renderer for published customer websites (Next.js, port 3002). |
| `apps/api` | Express API for project, content, publishing, integration, and platform workflows (port 4000). |
| `apps/worker` | Background jobs using the shared database and Redis/BullMQ. |
| `packages/db` | PostgreSQL schema, Drizzle migrations, and database access. |
| `packages/contracts` | Shared domain and API contracts. |
| `packages/api-client` | Shared API client. |
| `packages/site-chrome` | Shared site header/footer components. |
| `packages/theme-presets` | Shared visual theme presets. |
| `packages/brand-assets` | Shared logos, icons, and brand assets. |
| `docs` | Product specifications, implementation plans, design guidance, and operations documentation. |

The workspace uses pnpm and Turborepo. Supabase provides local authentication and supporting services; PostgreSQL is accessed through Drizzle. Redis supports background job coordination.

## Local development

### Requirements

- Node.js 22 or newer
- pnpm 10 (the repository pins pnpm 10.18.2)
- Docker with the Compose plugin

### Start local services

From the repository root:

```bash
pnpm install
pnpm dlx supabase start
docker compose up -d redis
cp .env.example .env
pnpm dlx supabase status
```

Copy the local database URL and Supabase keys reported by `supabase status` into `.env`:

| Variable | Local value or source |
| --- | --- |
| `DATABASE_URL` | Local Postgres connection URL from `supabase status` (port 54322 by default). |
| `SUPABASE_URL` | `http://127.0.0.1:54321` |
| `SUPABASE_ANON_KEY` | Anon key from `supabase status`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key from `supabase status`; server-side only. |
| `VITE_SUPABASE_URL` | Same value as `SUPABASE_URL`. |
| `VITE_SUPABASE_ANON_KEY` | Same value as `SUPABASE_ANON_KEY`. |
| `INTEGRATION_ENCRYPTION_KEY` | Generate with `openssl rand -hex 32`; keep stable so saved provider credentials remain readable. |
| `REDIS_URL` | `redis://127.0.0.1:6379` |
| `VITE_API_URL` | `http://localhost:4000` |
| `NEXT_PUBLIC_ADMIN_URL` | `http://localhost:5173` |
| `NEXT_PUBLIC_VELOZY_API_URL` | `http://localhost:4000` |
| `PLATFORM_DOMAIN` | `localhost:3002` |

`SUPABASE_JWKS_URL` is optional; the API derives it from `SUPABASE_URL` when unset. Keep the server role key, database URL, encryption key, and provider secrets out of `VITE_*` variables because browser bundles expose those values.

AI generation requires a key for the selected provider. Set `AI_PROVIDER=openai` with `OPENAI_API_KEY`, or `AI_PROVIDER=gemini` with `GEMINI_API_KEY`. `PEXELS_API_KEY` is optional and only needed for Pexels image search. Provider model overrides are listed in `.env.example`. Restart the dev processes after changing `.env`.

Optional SEO research integrations use `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD` for paid keyword research, `AHREFS_API_KEY` for domain rating lookups, and `GOOGLE_SEO_API_KEY` for CrUX and PageSpeed Insights data. Keep these server-side; only configure them when using the corresponding features.

Apply local Supabase setup migrations and the application database schema, then start the workspace:

```bash
pnpm dlx supabase migration up --local
pnpm db:migrate
pnpm dev
```

`pnpm dev` starts the apps through Turborepo. The root scripts load `.env` for the API, worker, and database commands.

### Local URLs

| Service | URL |
| --- | --- |
| Marketing site | `http://localhost:3000` |
| Admin | `http://localhost:5173` |
| Visual builder (through admin proxy) | `http://localhost:5173/page-builder/builder?id=...` |
| Builder service | `http://localhost:3001` |
| Published sites | `http://localhost:3002` (for example, `<site>.localhost:3002`) |
| API | `http://localhost:4000` |
| API readiness | `http://localhost:4000/ready` |
| Supabase API | `http://127.0.0.1:54321` |
| Supabase Studio | `http://127.0.0.1:54323` |

Sign-in, sign-up, and onboarding are served by the admin. Marketing links to the admin for these account workflows. Use the admin-proxied builder URL so the editor can access the Supabase session and onboarding data.

Payment and delivery providers are connected per project in **Settings → Payment Providers** and **Settings → Delivery Providers**. Configure provider webhooks against `https://<your-api-host>/api/webhooks/<provider>` and enter signing secrets in Settings. Keep `INTEGRATION_ENCRYPTION_KEY` unchanged after connecting providers.

## Common commands

```bash
pnpm dev                 # Start all apps
pnpm typecheck           # Typecheck all workspaces
pnpm test                # Run workspace tests
pnpm lint                # Run workspace lint scripts
pnpm build               # Build all workspaces
pnpm db:generate         # Generate Drizzle migrations from schema changes
pnpm db:migrate          # Apply committed Drizzle migrations
docker compose stop redis
pnpm dlx supabase stop
```

After restarting local services, run `docker compose up -d redis` and `pnpm dlx supabase start` again. Stopping services preserves local data. Avoid `docker compose down -v` or `supabase db reset` unless you intend to erase it.

## Documentation

- [Documentation index](docs/README.md)
- [Marketing site expansion plan](docs/marketing-site-expansion.md)
- [Agentic SEO implementation manual](docs/features/agentic-seo-manual.md)
- [AI assistant specification](docs/features/assistant.md)
- [Onboarding specification](docs/features/onboarding.md)
- [Admin design guide](docs/style/admin-design.md)
- [Marketing design guide](docs/style/marketing-design.md)
- [Platform billing operations](docs/platform-billing.md)
- [Pricing and plan limits](docs/pricing_config.json)

Product and implementation documents describe planned work as well as current behavior. Check each document's status and verify the implementation before treating a planned feature as shipped.
