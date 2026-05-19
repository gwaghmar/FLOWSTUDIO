# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the monorepo root unless noted.

```bash
pnpm install                   # install all workspace deps; also builds @flowchart/core
pnpm dev                       # start web app at localhost:3040 (Turbopack)
pnpm build                     # build core then web
pnpm lint                      # run ESLint across all packages
pnpm test                      # Playwright e2e tests (root-level)

# Database (run from apps/web or via root alias)
pnpm db:push                   # push schema to Postgres (Drizzle)
pnpm db:studio                 # open Drizzle Studio
pnpm db:generate               # generate migration files

# MCP server
pnpm mcp:dev                   # run packages/mcp-server in dev mode

# Core package (must rebuild after changes)
cd packages/core && pnpm build
```

## Monorepo Structure

```
apps/web          — Next.js 15 App Router app (@flowchart/web)
packages/core     — Shared types, schemas, templates (@flowchart/core, ESM-only)
packages/mcp-server — MCP server exposing diagram tools
e2e/              — Playwright tests (root-level)
```

`@flowchart/core` is a local workspace package. After modifying it, run `pnpm build` in `packages/core` — the web app won't pick up changes otherwise.

## Web App Architecture (`apps/web`)

### Route layout

```
app/
  layout.tsx            # root layout
  page.tsx              # public landing page
  (app routes)/app/     # auth-gated editor and dashboard
    editor/             # diagram editor (canvas + AI chat)
    billing/            # upgrade / plan management
    settings/           # user settings (AI keys, provider)
    admin/              # admin panel
  api/
    ai/agent/           # streaming AI agent endpoint (tool-calling loop)
    ai/generate/        # simple one-shot generation
    ai/list-models/     # enumerate available models for the configured provider
    auth/               # Supabase OAuth callback + legacy nextauth stub
    billing/checkout    # Stripe checkout session
    billing/portal      # Stripe customer portal
    billing/webhooks    # Stripe webhook handler
    mcp/                # MCP server mounted as Next.js route
    v1/                 # public REST API (export, validate)
    share/              # shared diagram viewer token resolution
    health/             # health check
  actions/              # Next.js Server Actions
    project.ts          # CRUD for projects
    ai-settings.ts      # save/load BYOK AI keys
    api-keys.ts         # public API key management
    share.ts            # share link creation
    admin.ts            # admin operations
    login.ts            # auth helpers
  login/                # public sign-in page
  pricing/              # public pricing page
  s/[token]/            # public share viewer
components/
  diagrams/             # per-renderer components:
    bpmn-renderer.tsx, echarts-renderer.tsx, excalidraw-renderer.tsx,
    nivo-renderer.tsx, reactflow-renderer.tsx, tldraw-renderer.tsx
lib/
  db/schema.ts          # Drizzle ORM schema (PostgreSQL)
  db/index.ts           # DB client
  supabase/             # Supabase client/server/middleware helpers
  ai-providers.ts       # provider registry + LanguageModel factory
  ai-key-crypto.ts      # AES encrypt/decrypt for BYOK keys
  entitlements.ts       # plan-based feature gates
  rate-limit.ts         # in-memory rate limiter
  user-sync.ts          # ensure user+workspace row on first AI call
auth.ts                 # auth() helper — mock in dev (MOCK_AUTH=true), real Supabase in prod
middleware.ts           # enforces /app/* auth; redirects to /login when MOCK_AUTH is off
```

### Auth

`auth.ts` exports `auth()` which branches on the `MOCK_AUTH` env var. In local dev (no `MOCK_AUTH` set) it returns a mock user automatically. Set `MOCK_AUTH=false` to test real Supabase auth locally. In production `MOCK_AUTH` is ignored unless `ALLOW_MOCK_AUTH_IN_PRODUCTION=true` is also set. Route protection in `middleware.ts` is active and enforces `/app/*` — unauthenticated users are redirected to `/login?callbackUrl=...`.

### AI Pipeline

The agent endpoint (`/api/ai/agent`) uses **Vercel AI SDK** (`ai@4.1.45`, `@ai-sdk/react@1.1.20` — pinned; do not bump without testing). It:
1. Resolves the API key: `x-openai-key` header → BYOK cipher stored in DB → `GOOGLE_GENERATIVE_AI_API_KEY` / `OPENAI_API_KEY` / `AI_GATEWAY_KEY` env
2. Calls `streamText` with tool-calling enabled (tools: `apply_patch`, `update_node`, `add_node`)
3. Streams the response back via Vercel AI SDK's data-stream protocol

Supported providers: OpenAI, Anthropic, Google Gemini, Mistral, Groq, Ollama, custom OpenAI-compatible.

### Data Model (Drizzle schema)

Key tables in `lib/db/schema.ts`:
- `user` — auth identity, `plan` (`free`/`pro`), `credits_balance`, BYOK key cipher
- `workspace` — belongs to a user (auto-created on first AI call via `user-sync.ts`)
- `project` — belongs to a workspace; stores `source` (diagram markup), `diagramType`, `themeId`
- `revision` — point-in-time snapshots of `project.source`
- `share_link` — tokenised read-only share URLs
- `api_key` — hashed keys for the public v1 REST API

### Diagram Renderers

Each `diagramType` maps to a renderer component in `components/diagrams/`:
- `mermaid` — default; text-based flowcharts
- `reactflow` — node-based editor via `@xyflow/react`
- `excalidraw` — freehand canvas via `@excalidraw/excalidraw`
- `tldraw` — whiteboard via `tldraw`
- `bpmn` — business process via `bpmn-js`
- `echarts` / `nivo` — data visualisation charts

`@flowchart/core` exports the canonical `diagramType` enum, theme list, and Zod schemas shared by web and MCP server.

## Key Environment Variables

Set in `apps/web/.env.local` (copy from `.env.example`):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Supabase pooler in prod) |
| `AI_KEY_ENCRYPTION_SECRET` | AES key for BYOK cipher storage (min 16 chars) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Default hosted AI key (Gemini) |
| `OPENAI_API_KEY` | Default hosted AI key (OpenAI) |
| `OPENAI_MODEL` / `GOOGLE_MODEL` | Override default model per provider |
| `AI_GATEWAY_KEY` | Optional AI proxy/gateway bearer token |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Billing |
| `STRIPE_PRICE_PRO_MONTHLY` / `_ANNUAL` | Stripe price IDs |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client config |
| `ADMIN_EMAILS` | Comma-separated emails promoted to `role=admin` on sign-in |

## Dev State / Known Mocks

- **Auth**: `auth()` in `auth.ts` branches on `MOCK_AUTH` env var (default: mock in dev, real Supabase in prod). Real Supabase OAuth is wired and enforced when `MOCK_AUTH` is unset/false.
- **DB**: `lib/db/index.ts` uses a Proxy that intercepts all Drizzle calls. If `DATABASE_URL` is absent or the connection is refused (`ECONNREFUSED`), it returns an in-memory mock (not SQLite). Set `MOCK_DB=true` to force mock mode explicitly.
- **Plan**: `getPlanForEmail()` in `lib/entitlements.ts` reads from the real DB. Free users see watermarks and credit limits; Pro users are unlimited.
- **Route protection**: `middleware.ts` enforces `/app/*` auth when `MOCK_AUTH` is not active — redirects to `/login?callbackUrl=...`.
- **AI tools**: `web_search` in `/api/ai/agent` is removed; `fetch_external_data` returns sample rows for demo purposes.
- **Admin panel** (`/app/admin`) shows a live Production Readiness section — use it to verify env config before deploying.

## Coding Conventions

- `@/` path alias points to `apps/web/` root
- Server Actions are in `app/actions/`; use them for mutations rather than API routes where possible
- API routes return typed `ApiError` (`{ error, code, details? }`) from `@flowchart/core` on failure
- Tailwind with custom tokens (`bg-background`, `text-text-main`, `text-primary`, etc.) — see `tailwind.config.ts`
