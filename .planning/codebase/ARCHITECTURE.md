# Architecture

**Analysis Date:** 2026-04-13

## Pattern Overview

**Overall:** Next.js App Router monorepo with server-centric architecture

**Key Characteristics:**
- Server Components handle auth, data fetching, and initial render; Client Components handle interactive editor canvas
- Server Actions (not REST) used for all authenticated mutations (CRUD)
- Multi-tenant data model: User → Workspace → Projects
- Dual authentication: Supabase session cookies for web users; hashed Bearer API keys (`fc_…`) for programmatic access
- Shared `@flowchart/core` package provides domain types, schemas, themes, and templates to all consumers (web, CLI, MCP server)

## Layers

**Core Package (`@flowchart/core`):**
- Purpose: Single source of truth for domain types, Zod schemas, diagram metadata, themes, templates, presets
- Location: `packages/core/src/`
- Contains: `diagram-types.ts`, `schemas.ts`, `themes.ts`, `templates.ts`, `social-presets.ts`
- Depends on: Zod only
- Used by: `apps/web`, `packages/cli`, `packages/mcp-server`

**Middleware Layer:**
- Purpose: Supabase session refresh on every request; route protection for `/app/*`
- Location: `apps/web/middleware.ts`
- Contains: Auth guard that redirects unauthenticated requests to `/login?callbackUrl=…`
- Depends on: `lib/supabase/middleware.ts`

**Server Components (Pages):**
- Purpose: Data loading, auth checks, hydrating Client Components with props
- Location: `apps/web/app/` (all `page.tsx` and `layout.tsx` files)
- Contains: Dashboard (`app/app/page.tsx`), Editor (`app/app/editor/page.tsx`), Admin (`app/app/admin/page.tsx`), Billing, Settings
- Depends on: `auth.ts`, Server Actions, `lib/` utilities
- Used by: Rendered by Next.js on request

**Server Actions:**
- Purpose: Authenticated database mutations invoked directly from Server or Client Components
- Location: `apps/web/app/actions/`
- Contains: `project.ts`, `share.ts`, `login.ts`, `ai-settings.ts`, `api-keys.ts`
- Pattern: Each action calls `auth()`, resolves workspace, then queries `db`
- Depends on: `auth.ts`, `lib/db`, `lib/user-sync.ts`

**API Routes:**
- Purpose: External HTTP endpoints (AI generation, v1 REST, billing webhooks, MCP, share tokens)
- Location: `apps/web/app/api/`
- Contains: `ai/generate/`, `ai/list-models/`, `v1/export/`, `v1/validate/`, `api/mcp/`, `billing/checkout/`, `billing/portal/`, `webhooks/stripe/`, `share/[token]/`, `auth/`
- Auth: `lib/api-auth.ts` (`getPrincipalFromRequest`) for v1 endpoints; `auth()` for session-only endpoints
- Depends on: `lib/db`, `@flowchart/core`, Stripe SDK, Vercel AI SDK

**Lib Layer:**
- Purpose: Reusable server-side utilities — database client, auth helpers, business logic
- Location: `apps/web/lib/`
- Contains:
  - `db/index.ts` — lazy singleton Drizzle/Postgres client
  - `db/schema.ts` — Drizzle table definitions (users, workspaces, projects, revisions, shareLinks, apiKeys)
  - `supabase/` — Supabase client factories (`client.ts`, `server.ts`, `middleware.ts`)
  - `api-auth.ts` — Bearer API key verification
  - `ai-providers.ts` — AI provider/model registry
  - `ai-key-crypto.ts` — AES-256 encryption of stored BYOK API keys
  - `entitlements.ts` — plan-based feature access (`free` | `pro`)
  - `rate-limit.ts` — in-memory rate limiter
  - `user-sync.ts` — ensures User + Workspace exist after first login
  - `echarts-presets.ts` — ECharts theme/chart manipulation helpers

**Client Components:**
- Purpose: Interactive editor (code editor, live preview, export controls, AI assistant)
- Location: `apps/web/components/`
- Contains: `editor-client.tsx` (main editor shell), `diagrams/` (per-type renderers), `settings/ai-settings-panel.tsx`, `diagram-icon.tsx`, `share-viewer.tsx`
- Pattern: Heavy use of `dynamic()` with `ssr: false` for diagram renderers that require browser APIs
- Depends on: `@flowchart/core`, Server Actions (called via import)

**MCP Server (standalone):**
- Purpose: MCP stdio transport for AI IDEs (Cursor, Claude Code) — runs as a separate process
- Location: `packages/mcp-server/src/index.ts`
- Contains: MCP tools (`diagram_set_source`, `diagram_apply_theme`, `diagram_list_templates`)
- Depends on: `@flowchart/core`, `@modelcontextprotocol/sdk`

**CLI Package:**
- Purpose: Terminal tool to generate diagrams via the web API
- Location: `packages/cli/src/index.ts`
- Commands: `generate`, `list-types`
- Depends on: `@flowchart/core`, reads `~/.flowchart/config.json` for API key/baseUrl

## Data Flow

**Authenticated Page Request:**
1. Next.js middleware runs `updateSession(request)` from `lib/supabase/middleware.ts` to refresh cookie
2. Middleware redirects `/app/*` to `/login` if no Supabase user
3. Server Component calls `auth()` → `lib/supabase/server.ts` → returns `AuthSession | null`
4. Server Component calls Server Action (e.g., `listProjects()`) which re-validates auth and queries `db`
5. Returns hydrated page with data passed as props to Client Components

**Editor Save:**
1. `EditorClient` (client component) calls `saveProject(id, patch)` Server Action
2. Server Action: `auth()` → verify ownership → `db.update(projects)` + `db.insert(revisions)` → `revalidatePath("/app")`

**AI Generation (web):**
1. Client calls `POST /api/ai/generate` with `{ source, history, diagramType }`
2. Route handler: `auth()` → check credits/plan → decrypt BYOK key or use server key → `generateText()` via Vercel AI SDK → deduct credits → return generated source

**AI Generation (REST API / programmatic):**
1. Client sends `POST /api/v1/export` with `Authorization: Bearer fc_…`
2. `getPrincipalFromRequest()`: hashes token with SHA-256, looks up `apiKeys` table, resolves user plan
3. Same generation/export pipeline as above

**Billing:**
1. `POST /api/billing/checkout` → Stripe Checkout session → redirect to Stripe
2. Stripe webhook `POST /api/webhooks/stripe` → update `users.plan` and `users.stripeCustomerId`

**State Management:**
- Server state: PostgreSQL via Drizzle (single source of truth)
- Client state: React `useState`/`useRef` within `EditorClient` — no global client store
- Cache: `revalidatePath` called after mutations to bust Next.js page cache

## Key Abstractions

**`AuthSession`:**
- Purpose: Unified session shape abstracting Supabase user object
- Examples: `apps/web/auth.ts`
- Pattern: `auth()` async function returns `AuthSession | null`; every server action calls it first

**`@flowchart/core` exports:**
- Purpose: Shared domain constants — diagram types, Zod schemas, themes, templates
- Examples: `packages/core/src/diagram-types.ts`, `packages/core/src/schemas.ts`
- Pattern: Imported by `apps/web`, `packages/cli`, `packages/mcp-server` to ensure consistency

**`ApiPrincipal`:**
- Purpose: Discriminated union representing either a web session user or a programmatic API key caller
- Examples: `apps/web/lib/api-auth.ts`
- Pattern: `getPrincipalFromRequest(req)` returns `{ type: "user"; userId; plan } | { type: "anonymous" }`

**Drizzle `db` proxy:**
- Purpose: Lazy singleton database client that defers connection until first query (allows `next build` without `DATABASE_URL`)
- Examples: `apps/web/lib/db/index.ts`
- Pattern: `Proxy` wrapping `drizzle(postgres(DATABASE_URL))` with connection pooling via `postgres` (`max: 1`)

**MCP HTTP endpoint:**
- Purpose: Exposes AI diagram generation as an MCP tool over HTTP (Streamable HTTP transport) in addition to the standalone stdio server
- Examples: `apps/web/app/api/mcp/route.ts`
- Pattern: Stateless — each request creates a fresh `Server` instance

## Entry Points

**Web Application:**
- Location: `apps/web/app/layout.tsx`
- Triggers: Next.js App Router; HTML shell with global fonts and CSS
- Responsibilities: Root HTML document, font variables, global stylesheet

**Authenticated App Shell:**
- Location: `apps/web/app/app/layout.tsx`
- Triggers: Any route under `/app/`
- Responsibilities: Session check, `ensureUserAndWorkspace`, nav header with credits display

**MCP Stdio Server:**
- Location: `packages/mcp-server/src/index.ts`
- Triggers: `node index.js` (stdio transport)
- Responsibilities: Exposes `diagram_set_source`, `diagram_apply_theme`, `diagram_list_templates` MCP tools

**CLI:**
- Location: `packages/cli/src/index.ts`
- Triggers: `npx @flowchart/cli generate "…"`
- Responsibilities: Reads `~/.flowchart/config.json`, calls web API, writes output

## Error Handling

**Strategy:** Typed error responses using `ApiError` shape from `@flowchart/core`

**Patterns:**
- API routes return `NextResponse.json({ error, code }, { status })` using `ErrorCode` enum from `packages/core/src/schemas.ts`
- Server Actions throw `Error` (caught by Next.js error boundaries or caller)
- `db` client throws on missing `DATABASE_URL`; `app/app/layout.tsx` catches and renders an inline warning banner rather than crashing
- Rate limiting via `rateLimit(key, limit, windowMs)` in `lib/rate-limit.ts`; returns `429` on breach

## Cross-Cutting Concerns

**Logging:** `console.error` only; no structured logging framework
**Validation:** Zod schemas defined in `@flowchart/core` (`MermaidSourceSchema`, `ApiErrorSchema`, etc.); validated at API route boundaries
**Authentication:** Supabase Auth via `auth()` in server components/actions; `getPrincipalFromRequest()` for API key auth in REST routes; middleware guards `/app/*`
**Authorization:** `ensureUserAndWorkspace(email)` lazily provisions user + default workspace on first access; plan-gated features via `getPlanForEmail(email)` and `entitlements.ts`
**Encryption:** User BYOK API keys AES-256 encrypted at rest via `lib/ai-key-crypto.ts`; API keys stored as SHA-256 hashes in `apiKeys.keyHash`

---

*Architecture analysis: 2026-04-13*
