# FlowStudio

**FlowStudio** is a web app where you describe what you want in plain text and AI generates the right diagram for you � instantly.

Supports **7 diagram types**: Mermaid, Excalidraw, ReactFlow, ECharts, Nivo, TLDraw, and BPMN. Export as PNG or SVG at exact sizes for any platform (presentations, social media, docs, etc.).

---

## What it does

- Type a description like *"OAuth login flow between browser, API, and auth server"* ? AI picks the right diagram type and draws it
- Supports social media presets (16:9, square, story) and custom export sizes
- Multi-provider AI: OpenAI, Anthropic, Google, Groq, Mistral
- Save, share, and export diagrams
- Auth + Stripe billing built in

---

## Tech Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- **Drizzle ORM** + Postgres (Supabase)
- **Vercel AI SDK** for multi-provider AI
- Auth.js (GitHub OAuth + dev credentials)
- Monorepo: `apps/web` (web app) + `packages/core` (shared types/prompts)

---

## Quick Start

```bash
pnpm install
cp .env.example apps/web/.env.local
# Fill in DATABASE_URL, AUTH_SECRET, and your AI provider key
cd apps/web && pnpm db:push
pnpm dev
```

Open http://localhost:3000. In dev, sign in with **Demo email** on `/login`.

---

## Status

Milestone 1.0 — AI Diagram Quality & Precision — **complete**.

### Phase 1 — WYSIWYG Canvas ✅
Preview canvas locks to the selected export aspect ratio (Landscape 16:9, Story 9:16, Square 1:1, Vertical 4:5, Link preview) and updates immediately on preset change.

### Phase 2 — Use-Case Awareness ✅
AI infers the target platform from your words ("pitch deck" → Landscape 16:9, "LinkedIn post" → Square 1:1, etc.) and the editor surfaces a "Use for" selector you can override manually. Style conventions adapt to the use-case.

### Phase 3 — Smarter AI Generation ✅
- All 7 diagram-type system prompts now include type-selection rules, content extraction checklists, and few-shot examples
- Clarification threshold raised to `ambiguityScore ≥ 90` — most prompts generate immediately with noted assumptions
- After silent generation, a slim "Generated as: {subtype} · {preset} · {detail} detail" banner appears for 8 seconds

---

## Deploy

1. Import repo to Vercel, set **Root Directory** to `apps/web`
2. Add env vars from `.env.example` in the Vercel dashboard
3. Run `pnpm db:push` against your Supabase `DATABASE_URL`
