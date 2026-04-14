# Coding Conventions

**Analysis Date:** 2026-04-13

## Naming Patterns

**Files:**
- React components: `kebab-case.tsx` — e.g., `editor-client.tsx`, `share-viewer.tsx`, `diagram-icon.tsx`
- API route handlers: `route.ts` inside nested directories under `app/api/`
- Server actions: `kebab-case.ts` in `app/actions/` — e.g., `project.ts`, `login.ts`, `api-keys.ts`
- Lib utilities: `kebab-case.ts` in `apps/web/lib/` — e.g., `ai-providers.ts`, `rate-limit.ts`
- Zod schema files: `schemas.ts` inside packages

**Functions:**
- camelCase for all functions: `listProjects`, `createProject`, `getPrincipalFromRequest`, `demoSignIn`
- Async functions used extensively (all DB operations and server actions are `async`)
- Private/internal helpers not exported explicitly stay at module scope

**Variables:**
- camelCase for variables and object keys
- Boolean flags: `ok`, `isActive`, `inString`, `escape` (short idiomatic names in low-scope code)

**Types/Interfaces:**
- PascalCase for all types and interfaces: `ApiPrincipal`, `DiagramType`, `ProviderMeta`, `ChatTurn`
- Zod schemas: `PascalCase` + `Schema` suffix — `MermaidSourceSchema`, `ApiErrorSchema`, `ExportOptionsSchema`
- Type aliases derived from Zod with `z.infer<typeof Schema>`: `type ApiError = z.infer<typeof ApiErrorSchema>`
- `type` keyword preferred over `interface` throughout

**Constants:**
- SCREAMING_SNAKE_CASE for module-level constants: `DIAGRAM_TYPE_META`, `PROVIDER_META`, `THEMES`, `SOCIAL_PRESETS`, `DIAGRAM_SYSTEM_PROMPTS`

## Code Style

**Formatting:**
- No `.prettierrc` found in project root — relies on editor defaults + ESLint
- Double quotes for strings in TypeScript/TSX
- Semicolons used

**Linting:**
- Tool: ESLint with flat config — `apps/web/eslint.config.mjs`
- Extends: `next/core-web-vitals` and `next/typescript`
- Ignores: `.next/**`, `node_modules/**`, `dist/**`, `next-env.d.ts`
- Deliberate suppression: `// eslint-disable-next-line @typescript-eslint/no-require-imports` used for CommonJS interop in `apps/web/app/api/v1/export/route.ts`

**TypeScript:**
- `strict: true` in all tsconfigs
- Target: `ES2017` for web app, `ES2022` for packages
- Path alias `@/*` maps to project root in `apps/web/tsconfig.json`
- `import type { ... }` used explicitly for type-only imports throughout

## Import Organization

**Order:**
1. External packages (Node built-ins, then npm): `"next/server"`, `"ai"`, `"zod"`, `"drizzle-orm"`
2. Internal workspace packages: `"@flowchart/core"`
3. App-local path aliases: `"@/auth"`, `"@/lib/db"`, `"@/lib/rate-limit"`

**Path Aliases:**
- `@/*` → root of `apps/web/` (e.g., `@/lib/db`, `@/auth`, `@/components/diagram-icon`)
- `@flowchart/core` → shared types, schemas, themes, templates
- `@flowchart/web` → web app package (used in pnpm filter commands)

**ESM vs. CJS:**
- All source is ESM (`import`/`export`)
- Single deliberate CJS exception: `require("svg-to-pdfkit")` in `apps/web/app/api/v1/export/route.ts` with explicit eslint-disable comment

## Directives

**React Server/Client split:**
- `"use client"` at top of files with hooks, browser state, or interactive UI — e.g., `apps/web/components/editor-client.tsx`
- `"use server"` at top of server action files — e.g., `apps/web/app/actions/project.ts`, `apps/web/app/actions/login.ts`

## Error Handling

**API routes — typed error responses:**
```typescript
const body: ApiError = {
  error: "Too many requests",
  code: "RATE_LIMITED",
  details: { retryAfter: rl.retryAfter },
};
return NextResponse.json(body, { status: 429 });
```
- All error payloads typed as `ApiError` from `@flowchart/core`
- Error codes are a Zod enum defined in `packages/core/src/schemas.ts`: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `RATE_LIMITED`, `ENTITLEMENT_REQUIRED`, `INSUFFICIENT_CREDITS`, `EXPORT_TIMEOUT`, `INTERNAL_ERROR`
- HTTP status codes consistent: 400 validation, 401 auth, 402 entitlement, 429 rate limit, 500 internal

**Server actions — throw pattern:**
```typescript
const session = await auth();
const email = session?.user?.email;
if (!email) throw new Error("Unauthorized");
```

**Auth helper pattern:**
```typescript
if (error || !data.url) throw new Error(error?.message ?? "OAuth failed");
```

**Catch blocks:**
- Empty catch blocks `catch {}` used when the error is intentionally discarded
- `catch (e)` used when error message is forwarded: `e instanceof Error ? e.message : "Invalid body"`

## Validation

**Pattern:** Zod schemas defined in `packages/core/src/schemas.ts`, parsed at API boundaries:
```typescript
const source = MermaidSourceSchema.parse(json.source);
```
- `.parse()` throws on failure (caught by surrounding try-catch)
- Schema constraints inline: `.min(1)`, `.max(500_000)`, `.int().positive().max(8192)`

## Logging

**Framework:** `console.error` only (no logging library)

**Patterns:**
- Prefixed with bracketed context tag: `console.error("[AI generate error]", e)`, `console.error("[ensureUserAndWorkspace]", e)`
- Errors logged only, no debug/info logging in production paths

## Comments

**Section dividers in larger files:**
```typescript
// ─── Config ──────────────────────────────────────────────────────────────────
```

**JSDoc-style block comments:**
- Used at top of `packages/cli/src/index.ts` to document CLI usage and configuration
- Inline type comments on schema fields and diagram type definitions (e.g., `// Text-based: flowchart…`)

**Inline behavior notes:**
- Non-obvious decisions explained inline: `// Prefer Enter to submit — button click alone may not complete the server action`
- `// eslint-disable-next-line` always accompanied by rule name

## Module Design

**Exports:**
- Named exports for all functions and constants
- Default exports only for config objects (`export default eslintConfig`, `export default defineConfig(...)`)

**Barrel files:**
- `packages/core/src/index.ts` re-exports everything: `export * from "./schemas.js"`
- No barrel files inside `apps/web/` — imports go directly to module files

## Database Access

**Pattern:** Direct Drizzle ORM builder pattern, no repository abstraction:
```typescript
await db.select().from(projects).where(eq(projects.workspaceId, workspace.id)).orderBy(desc(projects.updatedAt));
```
- Limit-1 queries destructured: `const [p] = await db.select()...limit(1)`
- IDs generated with `crypto.randomUUID()`
- Timestamps use `new Date()` assigned to variable and reused for consistency within a transaction

---

*Convention analysis: 2026-04-13*
