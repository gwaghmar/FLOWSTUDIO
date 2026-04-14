# FlowStudio

**FlowStudio** is a web app where you describe what you want in plain text and AI generates the right diagram for you — instantly.

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

## What is Pending

### Phase 1 — WYSIWYG Canvas (in progress)
The preview canvas does not yet match the export size. When you pick "Landscape 16:9", the canvas should visually lock to that ratio so what you see is exactly what you export.

### Phase 2 — Use-Case Awareness (not started)
AI does not yet infer your target platform from your words. Typing "for my pitch deck" should automatically switch to landscape 16:9. A "Use for" selector will let you manually override the inferred use-case.

### Phase 3 — Smarter AI Generation (not started)
- AI sometimes picks the wrong diagram type (flowchart instead of sequence diagram)
- Does not always extract all entities and relationships from your description
- Does not adapt density/style to cues like "simple" or "for a presentation"
- Clarification questions trigger too often — should only ask when truly necessary
- No "what I assumed" notice shown after silent generation

---

## Deploy

1. Import repo to Vercel, set **Root Directory** to `apps/web`
2. Add env vars from `.env.example` in the Vercel dashboard
3. Run `pnpm db:push` against your Supabase `DATABASE_URL`
