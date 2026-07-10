# FlowStudio — SaaS Readiness Audit & Market Analysis

**Date:** 2026-07-06 (see 2026-07-10 update below)
**Scope:** Full regression/readiness audit of the codebase and live infrastructure, competitive market analysis, cost strategy, and a go-forward recommendation.

---

## Update — 2026-07-10

A separate, concurrent Claude Code session shipped 21 commits directly to `master` in the days after this audit (`5775737` → `29dee92`), closing several items below and adding scope this audit never covered. This section corrects the record; the rest of the document is left as originally written for the historical trail.

**Also renamed:** the product is now branded **"drawxyz"** everywhere in the UI (title, header, footer, passkey RP name) — the npm package name (`@flowchart/web`) and this repo are unchanged. Live at `drawxyz.vercel.app` (the old `flowstudio-*.vercel.app` aliases still resolve to the same deployment).

**Confirmed CLOSED (verified against current `master`, not just commit messages):**
- §1.3 watermark bug — genuinely fixed. `showWatermark = plan !== "pro"` (`app/app/editor/page.tsx:65`), and the watermark `<div>` no longer carries `data-no-export`, so it now survives free-tier exports as intended. The same commit (`a2eac29`) also fixed an audit-missed bug: Agent Mode never deducted AI credits, letting free users bypass the credit gate entirely.
- §1.4 no password reset — genuinely fixed. Full `/auth/forgot-password` → `/auth/reset-sent` → `/auth/reset-password` flow via `password-reset.ts`, using Supabase's `resetPasswordForEmail`.
- New, beyond original scope: **passkey (WebAuthn) auth** as a full alternative to password login (`actions/passkey.ts`, `settings/passkeys/page.tsx`), and **real-time collaboration** — live cursors/presence and edit sync (`use-collaboration.ts`, `use-edit-sync.ts`, 3 new schema tables: `project_collaborator`, `project_edit`, `collaborator_presence`). Neither was flagged as needed in the original audit; both are substantial net-new surface area to keep in mind for the punch list below (more auth/session code paths, another realtime dependency to keep cheap).

**Confirmed STILL OPEN (re-checked against current `master`):**
- §1.4 OAuth is dead UI — still true. `signInGoogle/GitHub/Apple` exist only in `actions/login.ts`; no component renders them.
- §1.4 no account deletion / change email / change password in Settings — still true.
- §1.6 rate limiting in-memory fallback — code unchanged (`lib/rate-limit.ts` still falls back to a per-process `Map` without Upstash env vars). Whether Upstash is actually configured on Vercel is unverified.
- §1.6 no error tracking — still true, no Sentry or equivalent anywhere.
- §1.6 no transactional email provider — still true (Resend/SendGrid/nodemailer absent); password reset currently rides entirely on Supabase's built-in mailer, which is fine for that one flow but doesn't cover receipts or other transactional mail.
- §1.5 `exportJobs` table — still defined, still unused.

**In progress, not yet confirmed working (this session, same thread as this audit):** the database was fully down (no Supabase project existed at all — confirmed by listing the connected Supabase account, which had 8 unrelated projects and nothing for this product). Mid-fix as of this update: Neon connected via Vercel's Storage integration for `DATABASE_URL`, a new standalone Supabase project created for Auth only (`NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` handed off), production redeployed. Confirmed via direct fetch that `/`, `/login`, and `/api/health` render correctly with no crashes and zero runtime errors logged — but zero real traffic has hit the site, so an actual signup → save → share round-trip is still unverified. This sandbox's network policy blocks outbound requests to `*.vercel.app` (confirmed via the proxy's own status endpoint: `403` policy denial), so it cannot be verified from here with `curl` or a real browser — needs a manual click-test.

---

## Executive summary

**The product is more built than you think — and less sellable than it looks.** The codebase is genuinely feature-rich (22 diagram types, real Stripe billing plumbing, credit metering, RLS, SSRF guards, atomic credit reservation) and fully green: typecheck clean, 90/90 unit tests pass, production build succeeds, and the latest Vercel deploy is READY with zero runtime errors in the last 7 days.

But it cannot take money today for one infrastructure reason and five product reasons:

1. **There is no database.** The Supabase account connected to this project has 8 projects — none of them is FlowStudio. The old project is paused; the new one was never created. Nothing persists: no accounts, no projects, no subscriptions.
2. **The #1 paid feature is broken**: the free-tier watermark is stripped from every export, so free users already get the Pro outcome.
3. No email verification, no password reset, no account deletion.
4. The pricing page advertises Pro features that don't exist (server export, batch ZIP, priority limits).
5. Rate limiting silently degrades to per-instance memory without Upstash — the hosted AI key is exposed to abuse.
6. No error tracking, no transactional email — you'd be operating a paid service blind.

**Market verdict:** the niche is real but the ceiling is modest. Diagram-only AI tools top out around $2–3M ARR (Eraser $2.8M, Napkin $1.7M despite 5M signups); the breakout ($100M+ Gamma) broadened the artifact beyond diagrams. FlowStudio's honest play is **"Napkin AI but editable and brandable"** for solo creators, with the share/embed loop and template gallery as $0-budget distribution. Total run cost to first customers: **~$20–30/month**. Break-even: ~3 paying customers.

**Recommendation: pursue it — but as a tightly-scoped 90-day experiment with kill criteria, not an open-ended build.** The remaining work to "chargeable" is roughly 2–3 focused weeks, listed below in order.

---

## Part 1 — Regression & readiness audit

### 1.1 What's verified healthy (checked in this session)

| Check | Result |
|---|---|
| `tsc --noEmit` | Clean, exit 0 |
| Unit tests | 90/90 pass across 20 suites |
| Production build (`next build`) | Succeeds |
| Latest Vercel production deploy | READY (commit `5775737`, login redesign) |
| Vercel runtime errors (last 7 days) | Zero clusters reported |
| Secrets hygiene | Only `.env.example` tracked; real `.env` gitignored |
| Security headers | CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy set in `next.config.ts` |

Note: "zero runtime errors" partly reflects zero traffic, and the earlier `auth()` graceful-degradation fix means pages render signed-out instead of 500ing. The site is *up* but hollow — see 1.2.

Also note: `CLAUDE.md` is stale relative to the code. It doesn't mention the billing routes, credits system, RLS, demo hardening, or the warm-cream UX overhaul that recent commits added. The planning docs' "100% complete / no blockers" measures feature milestones, not commercial readiness.

### 1.2 BLOCKER — the database does not exist

Confirmed via the Supabase account connected to this session: projects present are CarbonIQ, DOCFLOW, BUILDIFY AI, burdlife, personal website, VoiceFitAI, Legendary Investor, AetherOps. **No FlowStudio/flowchart project.** The migration described in CLAUDE.md ("new account created, steps pending") stalled at step 0 — the project was never created.

Consequences in production right now:
- No sign-ups persist, no projects save, no share links resolve, no Stripe webhook has anywhere to write `users.plan`.
- The mock-DB fallback is correctly guarded out of production (`lib/db/mode.ts`), so DB-dependent paths fail gracefully rather than serving fake data — but they still fail.

**Fix path (half a day):** create the project (Supabase, or better: Neon free tier — see Part 3), set `DATABASE_URL` + `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel env, run `pnpm --filter @flowchart/web db:push`, redeploy.

### 1.3 BLOCKER — the watermark is stripped from exports

- Pricing promises "No watermark on exports" as the core Pro benefit (`pricing/page.tsx:146`).
- The watermark element carries `data-no-export` (`editor-client.tsx:2373`).
- **Every export path filters out `data-no-export` nodes** (`editor-client.tsx:1174, 1245, 1248, 1298, 1339`).
- Net effect: a free user's exported PNG/SVG/PDF has no watermark. The paid differentiator does nothing.

**Fix:** only apply the `data-no-export` filter when `plan === "pro"`; free exports keep the watermark node.

### 1.4 Majors — account lifecycle (all missing)

| Gap | Evidence | Why it blocks charging |
|---|---|---|
| No email verification | `supabase/config.toml:221,256` (`enable_confirmations = false`), sign-up auto-confirms | Free-credit farming with fake emails; billing keyed to unverified addresses |
| No password reset | No `resetPasswordForEmail` call, no UI link on `login/page.tsx` | Paying users who forget passwords are permanently locked out |
| No account deletion / change email / password | Absent from `app/settings/page.tsx` | GDPR/CCPA exposure; basic trust |
| OAuth is dead UI | `signInGoogle/GitHub/Apple` exist in `app/actions/login.ts:26-70` but no component renders them | Password-only signup hurts conversion; the work is 90% done, just unwired |

### 1.5 Majors — monetization enforcement gaps

The billing skeleton is genuinely production-grade: Stripe Checkout (`api/billing/checkout`), Billing Portal, webhook with signature verification handling the full subscription lifecycle (`api/webhooks/stripe`), `plan` column with CHECK constraint, `creditsBalance` (default 5) atomically reserved before generation and refunded on failure (`api/ai/generate/route.ts:44-58,486`). Keep all of it.

What's not enforced or over-promised:
- **"Priority API access / higher limits"** — flat 60/min for everyone regardless of plan (`generate/route.ts:151`, `agent/route.ts:58`). Advertised on the pricing page; doesn't exist.
- **"Server export (PNG/PDF), batch ZIP"** advertised in `settings/page.tsx:82` — no server export route exists; `exportJobs` table (`schema.ts:167`) is defined and referenced nowhere. Either build it or (cheaper) remove the promise.
- **Pro = unlimited hosted AI with no dollar cap** (`skipCredits = plan === "pro"`). One abusive Pro account can burn unbounded tokens on your key, bounded only by 60 req/min. Add a generous monthly generation cap (e.g. 500/mo) instead of "unlimited".
- **Editor shows a hardcoded fake credit count** — `const creditsBalance = 100;` with the real fetch commented out (`app/editor/page.tsx:67-69`). API enforces the real balance, so the UI lies to users about what they have.

### 1.6 Majors — operational readiness

- **Rate limiting degrades to a per-instance in-memory Map** when `UPSTASH_REDIS_REST_URL/TOKEN` are unset (`lib/rate-limit.ts:66`). On Vercel that means per-lambda, reset on cold start — the demo endpoint's 15/day/IP cap and all per-user AI limits are bypassable via concurrency. Upstash free tier fixes this at $0.
- **No error tracking** (no Sentry/PostHog/anything). Errors go to `console.*`. You cannot debug a paid service blind. Sentry free tier is enough.
- **No transactional email path** — no Resend/SendGrid/nodemailer; relies entirely on Supabase's mailer with confirmations disabled. No receipts, no reset mails, no verification mails.
- **Health check is a static `{ok:true}`** (`api/health/route.ts`) — checks nothing.
- **No env validation at boot** — missing secrets fail lazily mid-request.

### 1.7 Minors / debt

- `workspaces` table implies teams but has only `ownerId` — no membership/invite tables. Fine for a solo-creator product; just never say "team" in marketing until it's real.
- `apply_patch`/`update_node` agent results applied client-side without server validation (documented, lower risk).
- PDF export can produce ~10 MB files (documented follow-up).
- Google AI key in local `.env` is invalid (blocks the live agent verifier test).
- ~41 pre-existing unused-vars lint warnings in `editor-client.tsx` (known, leave alone).

### 1.8 The "chargeable" punch list, in order

| # | Task | Effort |
|---|---|---|
| 1 | Create DB (Neon free), set Vercel env, `db:push`, redeploy, click-test signup→save→share | 0.5 day |
| 2 | Fix watermark: keep it in free-tier exports | 0.5 day |
| 3 | Enable email confirmations + password reset flow (Supabase Auth or Resend) | 1–2 days |
| 4 | Wire the existing Google/GitHub OAuth buttons into the login page | 0.5 day |
| 5 | Upstash Redis (free) for real rate limiting | 0.5 day |
| 6 | True-up the pricing page: remove server-export/batch/priority claims; replace "unlimited" with a 500/mo Pro cap; fix the fake credit counter | 0.5 day |
| 7 | Sentry (free) + Resend (free) + real health check + boot-time env validation | 1 day |
| 8 | Account deletion + change password in settings | 1 day |
| 9 | Payments: swap/augment Stripe with an MoR (see Part 3 — Stripe India is invite-only) | 1–2 days |

Total: **~2–3 focused weeks to honestly chargeable.**

---

## Part 2 — Market analysis (researched mid-2026)

### 2.1 Competitive landscape

| Tool | Pricing | AI capability | Weakness FlowStudio can exploit |
|---|---|---|---|
| **Eraser.io** (DiagramGPT) | ~$10–12/user/mo, unlimited AI on paid | Prompt/code → ~5 technical diagram types; design docs | Narrow type coverage; team-oriented, not creator-oriented |
| **Mermaid Chart** | Free = 3 diagrams; paid tiers credit-metered; going sales-led/enterprise | AI chat writing Mermaid; MCP server | Mermaid-only; abandoning the $8–12 self-serve prosumer as it moves upmarket |
| **Whimsical AI** | Pro $10–12/mo; free = 100 AI actions *lifetime* | Text → flowchart/mindmap/sequence | Hard lifetime cap; proprietary lock-in |
| **Miro AI** | $8–20/user/mo; 10 pooled credits/member/mo | Board-level AI assist | Stingy credits, billing complaints; AI is a bolt-on |
| **Lucidchart AI** | $9–15/user/mo | Text → flowchart/ERD/UML | Enterprise-gated features, price-hike backlash, slow |
| **FigJam AI** | Requires $16/mo Figma seat | 3 diagram types | Trapped inside Figma |
| **Napkin AI** | Free 500 credits/wk; $9 / $22/mo | Text → infographic-style visuals (closest analog to the social-card angle) | **Generic outputs, limited tweakability, no brand consistency** — 5M users, only ~$1.7M ARR (~0.03% conversion) |
| **Excalidraw+** | $6–7/user/mo, 100 text-to-diagram/day + BYOK | Mermaid conversion under the hood | Basic AI; no social/marketing visual types |
| **draw.io** | Free; AI tied to Confluence licensing | Multi-engine prompt-to-diagram | Locked to Atlassian; dated UX |
| **ChatGPT/Claude/Gemini direct** | $0–20/mo (already paid) | Emit Mermaid/SVG free | No persistence, editing, sharing, embeds, brand |
| **Canva / Gamma** (adjacent) | $8–20/mo | Social visuals / presentations | Don't do structured/technical diagrams well |

### 2.2 Is anyone paying? (the honest numbers)

- **Gamma: $100M+ ARR, 600k paying, $2.1B valuation, profitable with 52 people** — proves the "prompt → publish-ready visual artifact" wallet exists at $8–20/mo, but they broadened beyond diagrams.
- **Eraser: ~$2.8M ARR** with 25 people — real business, won by narrowing to engineering design docs.
- **Napkin: ~$1.7M ARR on 5M registered users** despite $19.5M raised — massive demand for text-to-visual, terrible conversion because output is generic and un-editable. *This is simultaneously the demand proof and the cautionary tale.*
- **Mermaid Chart** raised $7.5M and is pivoting enterprise — vacating the indie/prosumer slot.
- Recurring complaint across every incumbent: **opaque AI-credit systems** (no rollover, lifetime caps, credit-per-word). Users hate them.

**Read:** willingness to pay is $8–15/mo when output is genuinely publish-ready or workflow-embedded. Diagram-only ceiling ≈ low single-digit $M ARR. For a solo founder, $2–10k MRR is a realistic 12-month success case, not $100k.

### 2.3 The free-AI-chat threat, and how survivors answer it

ChatGPT/Claude emit Mermaid for free. The tools that still charge differentiate on:
1. **Persistence + lifecycle** — a diagram in chat scrollback is frozen; versioned, shareable, updatable diagrams are the product. (FlowStudio has version history + share links — already built.)
2. **Being the render/edit surface for chat output** — Mermaid Chart's "paste from Claude" import is their top-of-funnel. FlowStudio should have a "paste Mermaid/JSON from ChatGPT" import path prominently.
3. **Agent-native (2026's shift)** — an MCP server so coding agents can create/patch diagrams and get back share links turns the threat into a channel.
4. **Visual polish chat can't render** — branded, publish-ready cards. This is where the 12 social types + brand kit shine.
5. **Workflow embedding** — embeds in Notion/Ghost/Substack/blogs for individual creators is genuinely underserved (incumbent embeds assume team-license viewers).

### 2.4 The 5 exploitable gaps (ranked for FlowStudio)

1. **"Napkin AI but editable and brandable."** Napkin proved 5M people want text→visual and proved they leave when they can't tweak or brand it. FlowStudio = AI generation + real editor + brand kit across 22 types. This is the positioning.
2. **Share/embed as the product.** OG-image share links, chromeless embeds, `/u/[handle]` profiles — every shared diagram is an ad. Add a "Made with FlowStudio" badge on free-tier shares (viral loop + upgrade incentive).
3. **Flat, honest pricing against credit fatigue.** "300 generations, $9/mo, they roll over" is a differentiating *message* an indie with modern cheap inference can afford. (Not literally "unlimited" — see cost controls.)
4. **The prosumer hole Mermaid Chart is vacating** — devs/technical writers wanting Mermaid + AI + hosting + themes at ~$9 self-serve.
5. **MCP / agent-native surface** — a FlowStudio MCP server (create/patch diagram → share link) rides the agent wave for near-zero build cost given the agent route already exists.

Threats to respect: Canva AI 2.0 and Gamma squeeze the social-visual side from above; "AI diagram generator" SEO is saturated with affiliate roundups (distribution must come from embeds/templates/build-in-public, not head terms).

---

## Part 3 — Cost strategy & go-forward plan

### 3.1 AI costs are a rounding error — stop worrying about them

Per-generation cost at ~2k in / 1k out tokens (mid-2026 pricing):

| Model | Cost per generation | Use for |
|---|---|---|
| Gemini 2.5 Flash-Lite | ~$0.0006 (has a real free tier, ~1,500 req/day) | Free-tier users, social-json types |
| GPT-5 nano / Mistral Small | ~$0.0005 | Social-json (schema-constrained) |
| GPT-5 mini / Gemini 3 Flash | ~$0.0025–0.004 | Mermaid/BPMN (syntax-sensitive) |
| Claude Haiku 4.5 | ~$0.007 | Agent Mode quality default |

Even 100 free generations/user/month costs $0.06–0.70. The architecture already de-risks cheap models: 12/22 types are schema-validated JSON, and `validateAndRepairOutput` + `mermaid.parse()` make cheap-model-plus-one-retry ~10× cheaper than premium-first-try. Add prompt caching (the big static `DIAGRAM_SYSTEM_PROMPTS` are a perfect cache prefix — 50–90% input discounts) and route free users to free-tier upstreams (Gemini/Groq) so abuse costs $0.

**BYOK** (already built, encrypted) is the escape valve for heavy users — keep it as a paid-plan feature.

### 3.2 Infrastructure: the ~$21/month stack

| Piece | Choice | Cost |
|---|---|---|
| Hosting | Vercel — Hobby ($0) pre-revenue; **Pro required once you charge** (Hobby is explicitly non-commercial) | $0 → $20/mo |
| Database | **Neon free tier** instead of Supabase — scale-to-zero but *never pauses* (Supabase free pauses after 7 days idle, which is exactly what killed you). Drizzle on plain Postgres = zero code change, `db:push` and done. 0.5GB free is thousands of users of metadata | $0 |
| Rate limiting | Upstash Redis free tier | $0 |
| Error tracking | Sentry free tier | $0 |
| Email | Resend free tier (3k/mo) | $0 |
| Domain | — | ~$1/mo |

If you keep Supabase for bundled auth, it's Pro $25/mo — the auth code already targets it, so that's a defensible convenience spend. Otherwise Neon + Auth.js.

**Projected totals:** $0–1/mo pre-revenue → ~$26–32/mo at 100 users (~10 paying) → ~$52–87/mo at 500 users (~50 paying). **Break-even ≈ 3 paying customers at $9/mo.**

### 3.3 Payments — Stripe India is a problem

New Indian Stripe accounts are **invite-only**. Rather than a US LLC via Atlas (2–6 weeks, ~$300+ and annual compliance), use a **Merchant of Record** — they're the legal seller, handle global tax/VAT/GST, and pay out to Indian bank accounts:

- **Dodo Payments** (4% + $0.40) — purpose-built for founders in non-Stripe countries incl. India.
- **Polar.sh** (4–5% + $0.40) — best Next.js DX, drop-in checkout + webhooks.
- Graduate to **Paddle** (5% + $0.50 flat, no intl surcharge) if international volume grows.

At $9/mo, MoR fees ≈ $0.85/sale — the premium over raw Stripe buys zero tax-compliance work, which for a solo founder is the whole point. The existing Stripe webhook/plan-flipping logic ports over with modest changes (both Polar and Dodo have Stripe-like subscription webhooks).

### 3.4 Pricing recommendation

- **Free:** sign-in required for any generation; 15 generations/mo; watermark on exports; "Made with FlowStudio" badge on shares/embeds.
- **Pro — $9/mo (or $79/yr):** 300–500 generations/mo (not "unlimited"), no watermark, brand kit, BYOK, all export formats.
- Never anonymous hosted-key generation beyond the existing hardened landing demo.
- Message it against credit fatigue: generous, understandable numbers, rollover.

### 3.5 $0-budget go-to-market (in order of expected ROI)

1. **Public template gallery as programmatic SEO** — the highest-leverage move and the asset is 80% built. Make `/app/templates` public and indexable, one page per type × use case ("2x2 matrix maker", "tournament bracket generator", "org chart generator", "SWOT template"). 22 types × ~10 use cases = 200+ long-tail transactional pages. Target "generator/maker/template" queries (tool intent survives AI Overviews; informational queries don't).
2. **Share/embed viral loop** — free-tier badge on `/s/[token]` and `/embed/[token]`; the social-card types (tierlist, versus, iceberg, alignment, bingo) are natively viral X/LinkedIn formats.
3. **Build-in-public on X/LinkedIn** — 3–4 posts/week; post diagrams made with the product (each one is a demo), real numbers, lessons.
4. **"Paste from ChatGPT/Claude" import page** — free top-of-funnel that converts the biggest threat into a channel.
5. **FlowStudio MCP server** — create/patch diagram from any agent, get a share link back. Small build (agent route exists), rides the 2026 agent wave, genuinely differentiating.
6. **Product Hunt** — once, later, for the backlink; expect ~1.5k visitors/120 signups at best. Don't over-invest.

### 3.6 Should you pursue this? Honest verdict

**Yes — as a scoped bet, not a company-defining one.**

For it: the hard engineering is done and healthy; remaining work to chargeable is 2–3 weeks; run cost is ~$21/mo; demand is proven (Napkin's 5M signups); the incumbent failure modes (generic output, credit fatigue, enterprise pivots) map exactly onto what FlowStudio already does well; break-even is 3 customers.

Against it: category ceiling is low single-digit $M ARR; Canva/Gamma squeeze from above; SEO head terms are saturated; Napkin's 0.03% conversion shows signups ≠ revenue.

**90-day plan with kill criteria:**
- **Weeks 1–3:** the chargeable punch list (§1.8) — DB, watermark, auth lifecycle, rate limiting, honest pricing page, MoR payments, Sentry/Resend.
- **Weeks 4–8:** distribution — public template/SEO pages, share badge, paste-from-chat import, build-in-public cadence.
- **Weeks 9–12:** MCP server + iterate on whatever the funnel data says.
- **Kill / pivot criteria at day 90:** < 300 signups or < 5 paying customers → stop feature work, keep it alive at ~$21/mo as a portfolio piece and SEO asset, move on. ≥ 10 paying → double down on the social-card + embed angle (the differentiated part), not more diagram types.

**Things NOT to build next** (scope discipline): more diagram types (22 is already a maintenance surface), teams/multi-user workspaces, server-side export infra, realtime collaboration, native mobile. Every one of those is an incumbent's game.
