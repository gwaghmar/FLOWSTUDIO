# Codebase Structure

**Analysis Date:** 2026-04-13

## Directory Layout

```
flowchart-studio/                     # Monorepo root
├── apps/
│   └── web/                          # Next.js 14+ App Router application
│       ├── app/                      # App Router pages and API routes
│       │   ├── api/                  # HTTP API routes
│       │   │   ├── ai/generate/      # AI diagram generation endpoint
│       │   │   ├── ai/list-models/   # AI provider model listing
│       │   │   ├── auth/             # Supabase auth callbacks
│       │   │   ├── billing/          # Stripe checkout + portal
│       │   │   ├── mcp/              # MCP HTTP transport endpoint
│       │   │   ├── openapi/          # OpenAPI spec route
│       │   │   ├── share/[token]/    # Public share link resolver
│       │   │   ├── v1/export/        # REST: server-side export (PNG/SVG/PDF)
│       │   │   ├── v1/validate/      # REST: diagram source validation
│       │   │   └── webhooks/stripe/  # Stripe event webhook handler
│       │   ├── actions/              # Next.js Server Actions (mutations)
│       │   ├── app/                  # Authenticated app pages
│       │   │   ├── admin/            # Admin panel (role-gated)
│       │   │   ├── billing/          # Billing/plan page
│       │   │   ├── editor/           # Diagram editor page
│       │   │   └── settings/         # User settings page
│       │   ├── docs/                 # Documentation page
│       │   ├── legal/                # Privacy + terms pages
│       │   ├── login/                # Login page
│       │   ├── pricing/              # Pricing page
│       │   └── s/[token]/            # Public share viewer page
│       ├── components/               # React client components
│       │   ├── diagrams/             # Per-type diagram renderers
│       │   └── settings/             # Settings panel components
│       ├── lib/                      # Server-side utilities and services
│       │   ├── db/                   # Drizzle ORM client + schema
│       │   └── supabase/             # Supabase client factories
│       ├── types/                    # TypeScript type declarations
│       ├── docs/                     # Static documentation MDX/content
│       ├── auth.ts                   # Auth wrapper (Supabase → AuthSession)
│       ├── middleware.ts             # Route protection + session refresh
│       ├── drizzle.config.ts         # Drizzle migration config
│       ├── next.config.ts            # Next.js configuration
│       ├── tailwind.config.ts        # Tailwind CSS configuration
│       └── tsconfig.json             # TypeScript configuration
├── packages/
│   ├── core/                         # Shared domain package (@flowchart/core)
│   │   └── src/
│   │       ├── index.ts              # Barrel export
│   │       ├── diagram-types.ts      # DiagramType, DiagramTypeMeta constants
│   │       ├── schemas.ts            # Zod schemas, ApiError, ErrorCode
│   │       ├── themes.ts             # Theme definitions
│   │       ├── templates.ts          # Starter diagram templates
│   │       └── social-presets.ts     # Export dimension presets
│   ├── mcp-server/                   # Standalone MCP stdio server
│   │   └── src/
│   │       └── index.ts              # MCP server entry point
│   └── cli/                          # CLI tool (@flowchart/cli)
│       └── src/
│           └── index.ts              # CLI entry point
├── e2e/                              # Playwright end-to-end tests
├── memory/                           # Project memory/notes
├── .planning/                        # GSD planning documents
├── .github/                          # GitHub Actions workflows
├── package.json                      # Root workspace scripts
├── pnpm-workspace.yaml               # pnpm workspace definition
├── playwright.config.ts              # Playwright E2E config
└── README.md
```

## Directory Purposes

**`apps/web/app/api/`:**
- Purpose: HTTP API routes served by Next.js
- Contains: Route handlers for AI generation, billing, MCP, REST v1, webhooks
- Key files: `api/ai/generate/route.ts`, `api/v1/export/route.ts`, `api/mcp/route.ts`, `api/webhooks/stripe/route.ts`

**`apps/web/app/actions/`:**
- Purpose: Server Actions for all authenticated CRUD operations
- Contains: `project.ts`, `share.ts`, `login.ts`, `ai-settings.ts`, `api-keys.ts`
- Pattern: Each file exports named async functions marked `"use server"`; all call `auth()` first

**`apps/web/app/app/`:**
- Purpose: Authenticated app section (protected by middleware + layout auth check)
- Contains: Dashboard (`page.tsx`), Editor (`editor/page.tsx`), Admin, Billing, Settings
- Key files: `app/app/layout.tsx` (auth shell + nav), `app/app/editor/page.tsx` (editor data loader)

**`apps/web/components/`:**
- Purpose: React client-side components
- Contains: `editor-client.tsx` (main editor shell, ~1000+ lines), `diagram-icon.tsx`, `share-viewer.tsx`
- Key subdirectory: `diagrams/` — one renderer file per diagram type (bpmn, echarts, excalidraw, nivo, reactflow, tldraw)
- Key subdirectory: `settings/` — `ai-settings-panel.tsx`

**`apps/web/lib/`:**
- Purpose: Server-side utilities, service clients, business logic
- Contains:
  - `db/index.ts` — lazy Drizzle singleton
  - `db/schema.ts` — all table definitions
  - `db/migrations/` — SQL migration files
  - `supabase/client.ts` — browser Supabase client
  - `supabase/server.ts` — server-side Supabase client (cookie-based)
  - `supabase/middleware.ts` — session refresh helper
  - `api-auth.ts` — Bearer API key resolution
  - `ai-providers.ts` — provider/model registry
  - `ai-key-crypto.ts` — AES-256 BYOK key encryption
  - `entitlements.ts` — plan feature gating
  - `rate-limit.ts` — in-memory rate limiter
  - `user-sync.ts` — user + workspace provisioning
  - `echarts-presets.ts` — ECharts manipulation helpers

**`packages/core/src/`:**
- Purpose: Shared domain constants and validation schemas consumed by all workspace packages
- Key files: `diagram-types.ts` (7 `DiagramType` values + metadata), `schemas.ts` (Zod + `ApiError`), `themes.ts`, `templates.ts`

**`packages/mcp-server/src/`:**
- Purpose: Standalone MCP server for AI IDEs using stdio transport
- Key files: `index.ts` (MCP server with `diagram_set_source`, `diagram_apply_theme`, `diagram_list_templates`)

**`packages/cli/src/`:**
- Purpose: Terminal CLI that calls the Flowchart Studio web API
- Key files: `index.ts` (commands: `generate`, `list-types`; config from `~/.flowchart/config.json`)

**`e2e/`:**
- Purpose: Playwright end-to-end test suite
- Generated: No
- Committed: Yes

## Key File Locations

**Entry Points:**
- `apps/web/app/layout.tsx`: Root HTML document
- `apps/web/app/app/layout.tsx`: Authenticated app shell with navigation
- `packages/mcp-server/src/index.ts`: MCP stdio server entry
- `packages/cli/src/index.ts`: CLI entry

**Authentication:**
- `apps/web/auth.ts`: `auth()` and `signOut()` — Supabase wrapper
- `apps/web/middleware.ts`: Route guard for `/app/*`
- `apps/web/lib/supabase/server.ts`: Server-side Supabase client
- `apps/web/lib/supabase/middleware.ts`: Session refresh
- `apps/web/lib/api-auth.ts`: API key auth (`getPrincipalFromRequest`)

**Database:**
- `apps/web/lib/db/schema.ts`: All Drizzle table definitions (users, workspaces, projects, revisions, shareLinks, apiKeys)
- `apps/web/lib/db/index.ts`: Lazy Drizzle client singleton
- `apps/web/drizzle.config.ts`: Drizzle Kit migration config

**Core Logic:**
- `apps/web/app/actions/project.ts`: Project CRUD Server Actions
- `apps/web/app/api/ai/generate/route.ts`: AI diagram generation
- `apps/web/app/api/v1/export/route.ts`: Server-side PNG/SVG/PDF export
- `apps/web/lib/entitlements.ts`: Plan-based feature access
- `apps/web/lib/user-sync.ts`: User + workspace provisioning

**Editor:**
- `apps/web/components/editor-client.tsx`: Main interactive editor Client Component
- `apps/web/components/diagrams/`: Per-type renderers (echarts, excalidraw, reactflow, nivo, tldraw, bpmn)

**Shared Types:**
- `packages/core/src/diagram-types.ts`: `DiagramType` union + `DIAGRAM_TYPE_META`
- `packages/core/src/schemas.ts`: `ApiError`, `MermaidSourceSchema`, `ErrorCode`
- `packages/core/src/themes.ts`: Theme definitions
- `packages/core/src/index.ts`: Barrel re-export of all core exports

**Configuration:**
- `apps/web/next.config.ts`: Next.js config
- `apps/web/tailwind.config.ts`: Tailwind config
- `apps/web/tsconfig.json`: TypeScript config (includes `@` path alias for `apps/web/`)
- `pnpm-workspace.yaml`: Workspace package globs
- `playwright.config.ts`: E2E test config

## Naming Conventions

**Files:**
- Route files: exactly `page.tsx`, `layout.tsx`, or `route.ts` per Next.js App Router convention
- Lib utilities: `kebab-case.ts` (e.g., `ai-key-crypto.ts`, `rate-limit.ts`)
- Components: `kebab-case.tsx` (e.g., `editor-client.tsx`, `diagram-icon.tsx`)
- Renderer components: `[type]-renderer.tsx` (e.g., `echarts-renderer.tsx`)

**Directories:**
- App Router segments: lowercase kebab-case (e.g., `app/app/admin/`, `app/api/ai/`)
- Dynamic segments: bracket notation (e.g., `[token]`, `[...nextauth]`)
- Lib subdirectories: lowercase (e.g., `lib/db/`, `lib/supabase/`)

**Exports:**
- Server Actions: named async functions (`listProjects`, `createProject`, `saveProject`)
- API routes: named HTTP method exports (`GET`, `POST`, `PUT`, `DELETE`)
- Core package: named exports from barrel `packages/core/src/index.ts`

## Where to Add New Code

**New API endpoint:**
- Create directory: `apps/web/app/api/[endpoint-name]/route.ts`
- Use `auth()` or `getPrincipalFromRequest()` for auth
- Return typed `ApiError` from `@flowchart/core` on errors

**New Server Action (mutation):**
- Add to existing file or create: `apps/web/app/actions/[domain].ts`
- Mark file with `"use server"` directive
- Always call `auth()` first and validate ownership

**New diagram renderer:**
- Add: `apps/web/components/diagrams/[type]-renderer.tsx`
- Import dynamically in `apps/web/components/editor-client.tsx` with `{ ssr: false }`
- Add `DiagramType` entry to `packages/core/src/diagram-types.ts`

**New page in authenticated area:**
- Create: `apps/web/app/app/[page-name]/page.tsx`
- Auth is enforced by middleware + `apps/web/app/app/layout.tsx`

**New shared constant/type:**
- Add to appropriate file in `packages/core/src/`
- Re-export from `packages/core/src/index.ts`

**New lib utility:**
- Add: `apps/web/lib/[utility-name].ts`
- Server-only utilities do not need `"use server"` unless they are Server Actions

**New database table:**
- Add table definition: `apps/web/lib/db/schema.ts`
- Run migration: `pnpm db:push` (pushes schema to Supabase Postgres)

**Tests:**
- E2E tests: `e2e/` directory using Playwright
- Unit tests: `apps/web/` with vitest/Jest (see `package.json` test scripts)

## Special Directories

**`.planning/`:**
- Purpose: GSD planning documents (roadmap, phase plans, codebase intelligence)
- Generated: No
- Committed: Yes

**`apps/web/.next/`:**
- Purpose: Next.js build output
- Generated: Yes
- Committed: No

**`apps/web/lib/db/migrations/`:**
- Purpose: Drizzle Kit SQL migration files
- Generated: Yes (via `drizzle-kit generate`)
- Committed: Yes

**`packages/*/dist/`:**
- Purpose: Compiled TypeScript output for `core`, `cli`, `mcp-server`
- Generated: Yes (via tsup/tsc)
- Committed: No

---

*Structure analysis: 2026-04-13*
