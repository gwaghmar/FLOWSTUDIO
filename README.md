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

Milestones 1.0, 1.1, and 1.2 are **complete**.

### Milestone 1.0 — AI Diagram Quality & Precision ✅

- **WYSIWYG Canvas** — preview locks to the selected export aspect ratio and updates immediately on preset change
- **Use-Case Awareness** — AI infers the target platform from your words; "Use for" selector lets you override; style conventions adapt
- **Smarter AI Generation** — all 7 prompts include type-selection rules, extraction checklists, and few-shot examples; clarification threshold raised to `ambiguityScore ≥ 90`; silent generations surface a "Generated as: …" banner

### Milestone 1.1 — AI Iteration & Sharing ✅

- **Surgical AI Edits** — follow-up prompts patch the existing diagram instead of regenerating; "Regenerate" toggle forces a full rebuild
- **Persistent Version History** — every save creates an auto-labeled revision; click the Clock icon in the toolbar to browse history and restore any prior version (history is preserved — restores stack on top)
- **Public Share with OG Previews** — `/s/[token]` renders a read-only diagram with a branded 1200×630 OG image and proper 404 for expired/missing links

### Milestone 1.2 — Brand & Distribution ✅

- **Brand Kit** — set your workspace colors in Settings (primary, secondary, accent, background); the editor's Palette button applies them to any diagram in one click
- **Iframe Embeds** — `/embed/[token]` serves a chromeless viewer; the editor's "Embed" button copies a paste-ready `<iframe>` snippet

---

## Deploy

1. Import repo to Vercel, set **Root Directory** to `apps/web`
2. Add env vars from `.env.example` in the Vercel dashboard
3. Run `pnpm db:push` against your Supabase `DATABASE_URL`
