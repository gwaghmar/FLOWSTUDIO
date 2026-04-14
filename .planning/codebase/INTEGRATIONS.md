# External Integrations

**Analysis Date:** 2026-04-13

## APIs & External Services

**AI Providers (Vercel AI SDK):**
All provider logic is centralized in `apps/web/lib/ai-providers.ts`. Providers are selected per-user (BYOK) or fall back to the hosted key.

- **OpenAI** - Default AI provider
  - SDK: `@ai-sdk/openai`
  - Auth: `OPENAI_API_KEY` env var
  - Base URL override: `OPENAI_BASE_URL` (supports Portkey, OpenRouter, self-hosted)
  - Default model: configurable via `OPENAI_MODEL` (default: `gpt-4o-mini`)
  - Models: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `gpt-3.5-turbo`

- **Anthropic (Claude)** - Supported AI provider
  - SDK: `@ai-sdk/anthropic`
  - Auth: user-supplied BYOK key
  - Models: `claude-opus-4-5`, `claude-sonnet-4-5`, `claude-3-5-sonnet-20241022`, `claude-3-5-haiku-20241022`

- **Google Gemini** - Supported AI provider
  - SDK: `@ai-sdk/google`
  - Auth: user-supplied BYOK key
  - Models: `gemini-2.0-flash`, `gemini-1.5-pro`, `gemini-1.5-flash`, `gemini-pro`

- **Mistral AI** - Supported AI provider
  - SDK: `@ai-sdk/mistral`
  - Auth: user-supplied BYOK key
  - Models: `mistral-large-latest`, `mistral-medium-latest`, `mistral-small-latest`, `codestral-latest`

- **Groq** - Supported AI provider (fast inference)
  - SDK: `@ai-sdk/groq`
  - Auth: user-supplied BYOK key
  - Models: `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `mixtral-8x7b-32768`, `gemma2-9b-it`

- **Ollama (Local)** - Self-hosted OpenAI-compatible endpoint
  - SDK: `@ai-sdk/openai` (reused with custom base URL)
  - Base URL: `http://localhost:11434/v1` (default)
  - No API key required

- **AI Gateway / Proxy** (optional)
  - Auth: `AI_GATEWAY_KEY` forwarded as Bearer token to `OPENAI_BASE_URL`
  - Supports: Portkey, OpenRouter, or internal gateways

**BYOK (Bring Your Own Key):**
- User API keys are AES-encrypted at rest using `AI_KEY_ENCRYPTION_SECRET`
- Cipher stored in `users.ai_api_key_cipher`, last 4 chars in `users.ai_key_last4`
- Encryption logic: `apps/web/lib/ai-key-crypto.ts`
- Key management UI syncs to `users.ai_base_url`, `users.ai_model`, `users.ai_provider`

**AI Generation Endpoint:**
- Route: `apps/web/app/api/ai/generate/route.ts`
- Model listing: `apps/web/app/api/ai/list-models/route.ts`

---

## Data Storage

**Databases:**
- **PostgreSQL via Supabase** (primary)
  - Connection env var: `DATABASE_URL`
  - ORM: Drizzle ORM (`drizzle-orm/postgres-js`)
  - Driver: postgres.js with `max: 1` connection, `prepare: false` for serverless compatibility
  - SSL: auto-detected (disabled for localhost, required otherwise)
  - Connection: `apps/web/lib/db/index.ts` (lazy proxy singleton)
  - Schema: `apps/web/lib/db/schema.ts`
  - Migrations: `apps/web/lib/db/migrations/`
  - Drizzle config: `apps/web/drizzle.config.ts`
  - Tables: `user`, `workspace`, `project`, `revision`, `share_link`, `api_key`, `brand_kit`, `export_job`

**File Storage:**
- `users.logo_object_key` field in `brand_kit` table suggests object storage key pattern is tracked, but no S3/cloud storage SDK is present in `package.json`. Storage provider not fully implemented or handled externally.

**Caching:**
- In-memory only — `apps/web/lib/rate-limit.ts` uses a `Map<string, {n, reset}>` for rate limiting. No Redis or external cache detected.

---

## Authentication & Identity

**Auth Provider: Supabase Auth**
- SDK: `@supabase/supabase-js` + `@supabase/ssr`
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Server client: `apps/web/lib/supabase/server.ts` (cookie-based session for Server Components / Actions / Route Handlers)
- Client-side client: `apps/web/lib/supabase/client.ts`
- Middleware session refresh: `apps/web/lib/supabase/middleware.ts` (called from `apps/web/middleware.ts` on every request)
- Auth wrapper: `apps/web/auth.ts` — provides `auth()`, `signOut()` and a legacy `handlers` stub for route compatibility
- OAuth callback: `apps/web/app/api/auth/callback/route.ts` — exchanges Supabase one-time code for session cookie
- Login redirect protection: `apps/web/middleware.ts` guards `/app/*` routes

**OAuth Providers (configured in Supabase dashboard):**
- GitHub: `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`
- Google: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
- Apple: `AUTH_APPLE_ID`, `AUTH_APPLE_SECRET`

**Admin Access:**
- Role-based: `users.role` column (`user` | `admin`)
- `ADMIN_EMAILS` env var — comma-separated emails auto-promoted to admin on sign-in
- Admin guard utility: `apps/web/lib/admin.ts`

---

## Payments & Billing

**Stripe** - Subscription billing
- SDK: `stripe` ^17.6.0
- Env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_ANNUAL`
- Plans: `free` (default) → `pro` (paid)
- Checkout route: `apps/web/app/api/billing/checkout/route.ts` — creates Stripe Checkout session (subscription mode, monthly or annual)
- Portal route: `apps/web/app/api/billing/portal/route.ts` — customer billing portal
- Stripe customer ID stored in `users.stripe_customer_id`
- Plan entitlements: `apps/web/lib/entitlements.ts`
- Credits system: `users.credits_balance` (free tier uses credits; Pro is unlimited)

---

## Monitoring & Observability

**Error Tracking:**
- Not detected — no Sentry, Datadog, or similar SDK present

**Logs:**
- `console.*` logging; Next.js default output
- `debug.log` file present at project root (likely gitignored dev output)

**Health Check:**
- `apps/web/app/api/health/route.ts` — used by Playwright webServer config to detect server readiness at `/api/health`

---

## CI/CD & Deployment

**Hosting:**
- Vercel
  - Config: `apps/web/vercel.json`
  - Install command: `cd ../.. && pnpm install --frozen-lockfile`
  - Build command: `cd ../.. && pnpm --filter @flowchart/core build && pnpm --filter @flowchart/web build`

**CI Pipeline:**
- `.github/` directory present but contents not examined
- Playwright E2E: `playwright.config.ts` — chromium only, `e2e/` test dir, retries on CI

---

## MCP (Model Context Protocol)

**HTTP MCP Server (embedded in web app):**
- Endpoint: `/api/mcp` (GET/POST/DELETE)
- Route: `apps/web/app/api/mcp/route.ts`
- SDK: `@modelcontextprotocol/sdk` ^1.29.0
- Transport: `WebStandardStreamableHTTPServerTransport` (stateless, session-less)
- Tools exposed: `generate_diagram`, `list_diagram_types`
- Intended clients: Cursor IDE, Claude Code, other MCP-compatible AI IDEs

**Standalone MCP Server package:**
- Package: `packages/mcp-server` (`@flowchart/mcp-server`)
- SDK: `@modelcontextprotocol/sdk` ^1.12.0
- Run: `tsx watch src/index.ts` (dev), `node dist/index.js` (prod)

---

## Webhooks & Callbacks

**Incoming Webhooks:**
- Stripe: `POST /api/webhooks/stripe` — handles `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated`, `invoice.payment_failed`
  - Route: `apps/web/app/api/webhooks/stripe/route.ts`
  - Verification: `stripe.webhooks.constructEvent()` using `STRIPE_WEBHOOK_SECRET`

**Outgoing Webhooks:**
- None detected

---

## Public REST API

Versioned API exposed for external integrations:
- `GET/POST /api/v1/export` — `apps/web/app/api/v1/export/route.ts`
- `POST /api/v1/validate` — `apps/web/app/api/v1/validate/route.ts`
- `GET /api/openapi` — OpenAPI spec route at `apps/web/app/api/openapi/route.ts`
- API key auth: hashed keys stored in `api_key` table (`apps/web/lib/api-auth.ts`)
- Share links: `GET /api/share/[token]` — token-based public access with expiry

---

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` — PostgreSQL connection string (Supabase pooler recommended for production)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `AI_KEY_ENCRYPTION_SECRET` — Min 16 chars, encrypts stored BYOK keys

**Optional env vars:**
- `AUTH_SECRET` — Legacy NextAuth compatibility
- `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` — GitHub OAuth
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — Google OAuth
- `AUTH_APPLE_ID` / `AUTH_APPLE_SECRET` — Apple OAuth
- `ADMIN_EMAILS` — Comma-separated admin email list
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_PRO*` — Stripe billing
- `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_MODEL` — Hosted AI key
- `AI_GATEWAY_KEY` — Proxy/gateway bearer token

**Secrets location:**
- `apps/web/.env.local` (gitignored, dev)
- Vercel environment variables (production)
- Root `.env.example` documents all vars

---

*Integration audit: 2026-04-13*
