# Codebase Concerns

**Analysis Date:** 2026-04-13

---

## Tech Debt

**In-memory rate limiter not suitable for multi-instance deployments:**
- Issue: `rateLimit()` stores hit counts in a module-level `Map` that is reset on every process restart / cold start. On serverless platforms (Vercel) each Lambda instance has its own Map, making rate limits per-instance rather than global.
- Files: `apps/web/lib/rate-limit.ts`
- Impact: Effective rate limit is `limit × number-of-instances` in production. Burst traffic can exceed intended limits trivially.
- Fix approach: Replace with Redis/Upstash-based sliding window rate limiter. Use `@upstash/ratelimit` or equivalent.

**`adminListUsers` fetches all users without pagination:**
- Issue: `adminListUsers()` does `SELECT * FROM users ORDER BY email` with no `LIMIT`. Will time out or cause high DB load at scale.
- Files: `apps/web/app/actions/admin.ts` (line: `return db.select(...).from(users).orderBy(desc(users.email))`)
- Impact: Admin page becomes unusable as user count grows.
- Fix approach: Add `limit`/`offset` or cursor-based pagination to the query and admin page UI.

**Revisions table grows unbounded:**
- Issue: Every call to `saveProject()` inserts a new revision row unconditionally. There is no prune/cap logic.
- Files: `apps/web/app/actions/project.ts`
- Impact: `revision` table grows indefinitely. Storage costs increase and queries on revisions slow down.
- Fix approach: Keep N most recent revisions per project (e.g., 50), deleting older ones on each save: `DELETE FROM revision WHERE project_id = ? AND id NOT IN (SELECT id FROM revision WHERE project_id = ? ORDER BY created_at DESC LIMIT 50)`.

**Stale schema tables with no backing code:**
- Issue: `brandKits` and `exportJobs` tables are defined in the schema but have no corresponding API routes, server actions, or UI code anywhere in the codebase.
- Files: `apps/web/lib/db/schema.ts` (lines `brandKits`, `exportJobs` table definitions)
- Impact: Schema drift, confusing future developers, and unnecessary migration complexity.
- Fix approach: Remove the table definitions (and their migrations) or implement the feature they were intended for.

**`parseAdminEmails()` creates a new Set on every single call:**
- Issue: `parseAdminEmails()` splits and constructs a `Set<string>` from `ADMIN_EMAILS` env var every invocation. It is called in `isAdminEmail()`, `isAdminEmail()` in `requireAdmin()`, and in `ensureUserAndWorkspace()`.
- Files: `apps/web/lib/admin.ts`
- Impact: Minor repeated work on every authenticated request. Not critical but wasteful.
- Fix approach: Memoize/cache the result at module initialization: `const ADMIN_EMAIL_SET = new Set(...)` at module level.

**Dual auth system remnants (NextAuth types + Supabase wrapper):**
- Issue: Auth was migrated from NextAuth (v4/v5) to Supabase Auth, but `apps/web/auth.ts` still exports `handlers` as a stub, `apps/web/types/next-auth.d.ts` still exists as a type declaration file, and `apps/web/app/api/auth/callback/route.ts` exists alongside the stub handler.
- Files: `apps/web/auth.ts`, `apps/web/types/next-auth.d.ts`
- Impact: Confusion about the actual auth layer; dead code and type definitions for a library no longer in use.
- Fix approach: Remove `next-auth.d.ts`, remove the stub `handlers` export from `auth.ts`, and delete any legacy NextAuth route files if they are unused.

---

## Security Considerations

**SSRF risk from user-controlled `aiBaseUrl`:**
- Risk: The AI settings form accepts an arbitrary `aiBaseUrl` string from the user, stores it in the database, and the AI generation route passes it directly to the AI SDK client. A malicious authenticated user could set `baseUrl` to an internal metadata URL (e.g., `http://169.254.169.254/latest/meta-data/` on AWS) or internal services, causing the server to make requests to them.
- Files: `apps/web/app/actions/ai-settings.ts` (`baseUrl` stored without validation), `apps/web/app/api/ai/generate/route.ts` (`baseUrl` used in `buildLanguageModel`)
- Current mitigation: None — the value is used as-is.
- Recommendations: Validate `aiBaseUrl` against an allowlist of known provider base URLs, or at a minimum check that it is an HTTPS URL with a non-private/non-loopback host. Reject `localhost`, `127.x.x.x`, `10.x`, `172.16–31.x`, `192.168.x`, `169.254.x` ranges.

**Spoofable `X-Forwarded-For` used as rate limit key:**
- Risk: Multiple API routes derive their rate limit key from `req.headers.get("x-forwarded-for")`. This header can be freely spoofed by any client if the app is not sitting behind a trusted reverse proxy that strips/overrides it.
- Files: `apps/web/app/api/share/[token]/route.ts`, `apps/web/app/api/v1/export/route.ts`, `apps/web/app/api/v1/validate/route.ts`
- Current mitigation: None.
- Recommendations: Use only the rightmost non-private IP from `X-Forwarded-For` (set by a trusted proxy), or configure the deployment platform to inject a verified client IP header. On Vercel, use the `x-real-ip` / `x-vercel-proxied-for` header.

**Static encryption salt for all BYOK API keys:**
- Risk: `encryptAiApiKey()` derives the AES-256 key using `scryptSync(secret, "flowchart-ai-byok-salt", 32)` — a hardcoded salt identical for every user. If the `AI_KEY_ENCRYPTION_SECRET` is compromised, an attacker can decrypt every user's stored API key in one pass using the same derived key.
- Files: `apps/web/lib/ai-key-crypto.ts`
- Current mitigation: AES-256-GCM with random IV per ciphertext provides ciphertext indistinguishability.
- Recommendations: Generate a random per-record salt, store it alongside the IV (e.g., in the cipher payload prefix), and use it in `scryptSync`. This ensures each user's key requires separate derivation even if the master secret leaks.

**No Content Security Policy headers:**
- Risk: `apps/web/next.config.ts` configures no `headers()`. The app renders user-controlled diagram source (Mermaid, Excalidraw, ReactFlow, ECharts) in SVG/canvas. Without a CSP, any future XSS vector in a renderer would have no second line of defense.
- Files: `apps/web/next.config.ts`
- Current mitigation: None.
- Recommendations: Add `headers()` returning `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy` headers in `next.config.ts`.

**MCP HTTP endpoint is unauthenticated:**
- Risk: `apps/web/app/api/mcp/route.ts` accepts MCP requests without any authentication check. Any external party can call the endpoint to list diagram types or attempt tool invocations. The `generate_diagram` tool makes downstream fetch calls to `/api/ai/generate` which require auth (returning 401), but listing capabilities and probing the endpoint leaks implementation details.
- Files: `apps/web/app/api/mcp/route.ts`
- Current mitigation: Downstream AI generate route requires auth.
- Recommendations: Require a bearer token or shared secret header on the MCP endpoint, or restrict it to localhost/internal traffic only.

**Sensitive files present in workspace:**
- Risk: `debug.log` (942 bytes) and `aws configure ssoaws configure sso.txt` (34 bytes) exist at the repository root. These may contain credentials or session artifacts from developer tooling.
- Files: `debug.log`, `aws configure ssoaws configure sso.txt`
- Current mitigation: Root `.gitignore` has `*.db` coverage but does not list these filenames.
- Recommendations: Add both filenames to `.gitignore`, review contents for any credential exposure, and rotate any credentials found.

---

## Performance Bottlenecks

**Database connection pool capped at 1:**
- Problem: `postgres(url, { max: 1 })` restricts the entire Next.js app to a single Postgres connection at a time.
- Files: `apps/web/lib/db/index.ts`
- Cause: Deliberately set to 1 to avoid exhausting free-tier connection limits (likely Supabase free tier with ≤20 connections), but creates request serialization under any concurrent load.
- Improvement path: Raise to `max: 5–10` for production, or use PgBouncer/Supabase's connection pooler in transaction mode and set `prepare: false` (already done). Use environment-based pool size to keep 1 only in dev/free.

**Two sequential AI calls per generation request:**
- Problem: Every `POST /api/ai/generate` fires two `generateText()` model calls: an intent-analysis pass followed by the actual diagram generation. On slow models this doubles latency.
- Files: `apps/web/app/api/ai/generate/route.ts`
- Cause: Design choice for better prompting quality.
- Improvement path: Make the intent analysis a streaming parallel pre-pass, or skip it for "low" detail-level prompts (already partially done via `detailLevel` but still calls the model).

**No AI response caching:**
- Problem: Identical prompts with the same diagram type always trigger fresh upstream API calls. Common prompts ("create a login flow") produce redundant spend.
- Files: `apps/web/app/api/ai/generate/route.ts`
- Cause: No caching layer exists.
- Improvement path: Hash (`sha256`) the normalized prompt + diagramType and cache responses in Redis for 1–24 hours before forwarding to the AI provider.

---

## Fragile Areas

**Recursive `ensureUserAndWorkspace` on constraint violation:**
- Files: `apps/web/lib/user-sync.ts`
- Why fragile: On a `23505` (unique violation) during user insert, the function calls itself recursively to re-fetch. There is no recursion depth guard. A persistent DB error or race could overflow the call stack.
- Safe modification: Restructure to use a loop with a maximum of 2 retries, or use `INSERT … ON CONFLICT DO NOTHING … RETURNING` with a follow-up SELECT.
- Test coverage: None visible.

**Expired share link cleanup depends on manual re-creation:**
- Files: `apps/web/app/actions/share.ts`, `apps/web/lib/db/schema.ts` (`shareLinks` table has `expiresAt`)
- Why fragile: Share links with `expiresAt` set are never pruned. The table grows over time and queries on it slow down. The comment in `createShareLink` notes it deletes old non-expiring links to avoid sprawl, but expired-by-date links are never deleted.
- Safe modification: Add a periodic cleanup job or a DELETE with `WHERE expires_at < NOW()` inside the read path or a cron route.
- Test coverage: No tests for expiry behavior.

**`lastSource` module-level mutable state in MCP server:**
- Files: `packages/mcp-server/src/index.ts`
- Why fragile: `let lastSource = ...` at module scope is shared across all concurrent MCP requests if the server handles multiple connections. A race condition can cause one session's source to overwrite another's.
- Safe modification: Move `lastSource` into session/connection-scoped storage or make tools stateless.
- Test coverage: None.

**Cookie `setAll` silently swallows all errors:**
- Files: `apps/web/lib/supabase/server.ts`
- Why fragile: The `catch {}` in `setAll` is intended only for read-only Server Component contexts, but it also masks genuine cookie write failures (e.g., malformed cookie options, middleware errors), leading to silent session corruption.
- Safe modification: Check for the specific error type thrown by Next.js in read-only contexts rather than catching all errors; rethrow unexpected errors.
- Test coverage: None.

---

## Missing Critical Features

**No revision viewer/history UI:**
- Problem: The revisions table is populated on every save, but there is no UI to browse or restore past revisions. The stored data is invisible to users.
- Blocks: Full value of auto-save history; user recovery from bad AI edits.

**No API key rate limiting per key (only per user):**
- Problem: Rate limiting on `/api/v1/validate` uses `validate:key:${userId}` for authenticated keys, but there is no per-key rate limit, so a user with multiple API keys (allowed) can multiply their effective rate limit by creating more keys.
- Files: `apps/web/app/api/v1/validate/route.ts`, `apps/web/lib/rate-limit.ts`

---

## Test Coverage Gaps

**Auth session/token flows:**
- What's not tested: Supabase session refresh, middleware redirect behavior, `ensureUserAndWorkspace` race conditions.
- Files: `apps/web/lib/supabase/server.ts`, `apps/web/middleware.ts`, `apps/web/lib/user-sync.ts`
- Risk: Auth regressions go undetected between Supabase SDK upgrades.
- Priority: High

**AI generate route credit/billing logic:**
- What's not tested: Credit decrement atomicity, `skipCredits` bypass paths, BYOK key decryption failure paths.
- Files: `apps/web/app/api/ai/generate/route.ts`
- Risk: Billing bugs are silent; free users could gain unlimited generation.
- Priority: High

**Rate limiter correctness:**
- What's not tested: Window reset behavior, concurrent increment correctness, per-instance isolation.
- Files: `apps/web/lib/rate-limit.ts`
- Risk: Rate limits are ineffective in production without knowing they are broken.
- Priority: Medium

**Share link creation/expiry:**
- What's not tested: Expired link rejection, token hash collisions, deduplication logic.
- Files: `apps/web/app/actions/share.ts`, `apps/web/app/api/share/[token]/route.ts`
- Risk: Expired links remain accessible or active links are accidentally deleted.
- Priority: Medium

---

*Concerns audit: 2026-04-13*
