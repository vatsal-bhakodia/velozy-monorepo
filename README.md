# Velozy monorepo

This workspace is being migrated from the legacy application in `../main`. It
is not the production entrypoint until the migration is complete. See the
[documentation index](docs/README.md) for current product plans and guides.

## Local setup

Prerequisites: Node.js 22 or newer, pnpm 10, and Docker with the Compose plugin.
Enter the `monorepo` directory, then run the remaining commands there.

```bash
cd monorepo
pnpm install
pnpm dlx supabase start
docker compose up -d redis
pnpm dlx supabase status
cp .env.example .env
```

Fill in `.env` using the values from `pnpm dlx supabase status`. The local
Supabase API URL is `http://127.0.0.1:54321`; port `54323` is Supabase Studio,
not the API. Use the `anon` key for browser variables and keep the service role
key and database URL on the server only.

| Variable                    | Local value or source                                                  |
| --------------------------- | ---------------------------------------------------------------------- |
| `DATABASE_URL`              | Database URL from `supabase status` (local Postgres uses port `54322`) |
| `INTEGRATION_ENCRYPTION_KEY` | Server-only 32-byte hex key from `openssl rand -hex 32` (keep stable; saved provider credentials depend on it) |
| `REDIS_URL`                 | `redis://127.0.0.1:6379`                                               |
| `SUPABASE_URL`              | `http://127.0.0.1:54321`                                               |
| `SUPABASE_ANON_KEY`         | Anon key from `supabase status`                                        |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key from `supabase status`                                |
| `VITE_SUPABASE_URL`         | Same as `SUPABASE_URL`                                                 |
| `VITE_SUPABASE_ANON_KEY`    | Same as `SUPABASE_ANON_KEY`                                            |
| `NEXT_PUBLIC_ADMIN_URL`     | `http://localhost:5173` (marketing links to admin)                     |
| `NEXT_PUBLIC_VELOZY_API_URL` | `http://localhost:4000` (published-site checkout API)                 |
| `AI_PROVIDER`               | `openai` (default) or `gemini`                                         |
| `OPENAI_API_KEY`            | Your OpenAI API key when `AI_PROVIDER=openai`                          |
| `GEMINI_API_KEY`            | Your Gemini API key when `AI_PROVIDER=gemini`                          |
| `PEXELS_API_KEY`            | Optional Pexels API key for image search                               |
| `PLATFORM_DOMAIN`           | `localhost:3002` for local published site URLs                         |

`SUPABASE_JWKS_URL` is optional. If used, set it to
`http://127.0.0.1:54321/auth/v1/.well-known/jwks.json`; otherwise remove the
empty line from `.env`. The API derives this URL from `SUPABASE_URL` when the
variable is absent. Keep the other URL and port defaults in `.env.example`
unless your local ports differ.

AI section generation in onboarding requires the key for the selected provider.
For example, put `AI_PROVIDER=openai` and `OPENAI_API_KEY=...` in the root
`monorepo/.env`; or use `AI_PROVIDER=gemini` and `GEMINI_API_KEY=...`.
`PEXELS_API_KEY` is only needed for the Pexels image search endpoint. The
provider model names can be overridden with the optional `*_CHAT_MODEL` and
`*_CODING_MODEL` variables shown in `.env.example`. Restart `pnpm dev` after
changing `.env` so the API receives the new values. Keep API keys out of
`VITE_*` variables, which are exposed to the browser.

Payment and delivery providers are configured per project in **Settings → Payment Providers** and **Settings → Delivery Providers**. Configure each provider's webhook to `https://<your-api-host>/api/webhooks/<provider>` and enter its signing secret in Settings. Keep `INTEGRATION_ENCRYPTION_KEY` unchanged after connecting providers; changing it makes stored credentials unreadable.

After saving `.env`, apply the application schema and start the apps:

```bash
pnpm dlx supabase migration up --local
pnpm db:migrate
pnpm dev
```

The root commands load `monorepo/.env` for Drizzle, the API, and the worker.
`pnpm dev` starts every app. Marketing uses `http://localhost:3000`, the
builder server uses `http://localhost:3001`, published sites use
`http://localhost:3002`, admin uses `http://localhost:5173`, and the API uses
`http://localhost:4000`. Check `http://localhost:4000/ready` for API and Redis
readiness. If a port is occupied, stop the process using it before starting
the apps.

After onboarding, the builder opens at `http://localhost:5173/page-builder/builder?id=...`.
Use that admin-origin URL for the editor: the Vite dev server proxies the builder
and API so the Supabase session and onboarding data remain available. The
editor saves generated page data to Postgres and uses the same URL for later
edits. Publishing a page serves it at `<site>.localhost:3002`. Restart
`pnpm dev` after changing Vite or Next configuration.
For a project created before this builder handoff, open **Admin → Pages → Edit**;
an empty page with saved onboarding sections will start generation there.

Sign-in, sign-up, and onboarding now run in admin at `/signin`, `/signup`, and
`/onboard`. Marketing links to those routes and redirects its old routes to
admin. Local Supabase OAuth/email callbacks use the admin `/auth/callback`
route; restart the local Supabase stack after changing `supabase/config.toml`.
Visitors can start onboarding without signing in. The draft is saved in the
browser's local storage, and a sign-in or sign-up modal appears before site
structure generation. Returning from Google or email confirmation resumes the
saved draft in admin.

## Everyday commands

```bash
pnpm dev                 # Start all apps; Ctrl+C stops them
pnpm dlx supabase migration up --local  # Apply Supabase Storage setup
pnpm db:migrate          # Apply committed Drizzle migrations
pnpm db:generate         # Generate a migration after changing packages/db/src/schema.ts
pnpm typecheck           # Typecheck workspaces
pnpm build               # Build workspaces
docker compose stop redis
pnpm dlx supabase stop
```

Run `docker compose up -d redis` and `pnpm dlx supabase start` again after a
restart. Their local data is retained when stopped. Avoid `docker compose down
-v` or `supabase db reset` unless you intend to erase local data.
