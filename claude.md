# CLAUDE.md — FlowStudio working notes

> Read this first. It captures the shape of the project, what's been built, and
> the conventions to follow. Update it as state changes.

---

## What this is

**FlowStudio** — an AI-powered diagram editor. Plain-text prompt in → rendered
diagram out. Aimed at solo creators (founders, indie hackers, technical writers)
who need diagrams for decks, blog posts, docs, social posts, and embeds.

URL pattern: prompt → AI picks diagram type → editor renders → user iterates →
share / embed / export.

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- **Drizzle ORM** on Postgres (Supabase)
- **Vercel AI SDK** (`ai`, `@ai-sdk/react`) — multi-provider (OpenAI / Anthropic / Google / Groq / Mistral)
- **Auth.js** (Supabase) — mock-auth mode for local
- Monorepo (pnpm): `apps/web` (Next app) + `packages/core` (shared types, prompts, themes)
- Mermaid + Excalidraw + ReactFlow (@xyflow) + ECharts + Nivo + tldraw + bpmn-js for diagram rendering

## Diagram types supported (7)

| Type | What it's for | Editing model |
|---|---|---|
| `mermaid` | Text grammar — flowchart, sequence, ER, gantt, mindmap, journey, pie, class, state (~13 subtypes) | source text |
| `excalidraw` | Whiteboard sketches | visual canvas + source |
| `reactflow` | Custom node graphs | drag-to-edit + source |
| `echarts` | Production charts | JSON source |
| `nivo` | Polished chart variants | JSON source (read-only) |
| `tldraw` | Free-form canvas | visual canvas + source |
| `bpmn` | BPMN 2.0 business process | visual modeler + XML source |

All renderers live in `apps/web/components/diagrams/*-renderer.tsx`. Editor is
`apps/web/components/editor-client.tsx` (one big file — every diagram type
branches inside its render section).

## Status — what's shipped

### Milestone 1.0 — AI Diagram Quality & Precision ✅
- WYSIWYG canvas (preview locks to export aspect ratio)
- Use-case awareness (AI infers presentation / social / docs / custom)
- Smarter AI generation (type-selection rules, ambiguityScore ≥ 90 to clarify, assumption banner)

### Milestone 1.1 — AI Iteration & Sharing ✅
- Surgical AI edits (`mode: "patch" | "create"`)
- Persistent version history (Clock icon dropdown, click to restore, history preserved)
- Public share + OG previews (`/s/[token]` page, branded 1200×630 og:image)

### Milestone 1.2 — Brand & Distribution ✅
- Brand kit (`brand_kit` table + Settings panel + Palette button)
- Iframe embeds (`/embed/[token]` chromeless viewer + copy `<iframe>` snippet)

### Milestone 1.3 — Legendary ✅
- **Real OG previews** — client captures a PNG at share-create time → stored on `share_link.preview_data_url` → og route serves the actual diagram
- **Streaming live preview** — Mermaid renders progressively as the AI types; `mermaid.parse()` gate + last-good-svg fallback prevents flicker on partial source; pulsing "Streaming" pill
- **AI-aware brand kit** — `/api/ai/generate` injects a BRAND PALETTE directive when a kit exists; AI uses those colors for echarts/mermaid theme overrides
- **Templates gallery** — `/app/templates` with 6 curated starters (onboarding funnel, OAuth, web arch, revenue chart, blog ER, roadmap gantt)

### Editor polish pass (post-1.3) ✅
- Full audit of all 7 renderers — fixed 5 real bugs (BPMN/ECharts couldn't recover from parse errors, ReactFlow crashed on AI nodes without positions, Mermaid re-init on every render, silent failure on broken hand edits)
- Added the missing **Source code editor** — right-side panel with monospaced textarea (the editor had no manual-edit surface before)
- **ReactFlow auto-layout** button (Wand2 icon)
- **Reset zoom + pan** (⌘0)
- Brand-kit colors now actually reach the Mermaid theme variables
- **Syntax highlighting** in the Source panel (zero-dep — textarea over highlighted `<pre>`)
- **Mermaid theme picker** dropdown (11 themes, all hidden previously)
- **Tab key** indents (instead of stealing focus); **line numbers** gutter; friendly **empty-state CTA**

## Key files

### Editor
- `apps/web/components/editor-client.tsx` — the main editor (~1700 lines, one big component). Holds all state: source, themeId, paletteId, customBackground/Accent, fontId, undoStack, redoStack, AI message state via `useChat`. Branches on `diagramType` in render.
- `apps/web/components/diagrams/*-renderer.tsx` — one renderer per diagram type. Common contract: `{ source: string, onChange?: (s: string) => void, readOnly?: boolean }`.
- `apps/web/lib/source-highlight.tsx` — tiny syntax highlighter used by the Source panel (Mermaid + JSON grammars).

### AI pipeline
- `apps/web/app/api/ai/generate/route.ts` — main generation route. Two-pass (intent → generation). Honors `mode` (patch / create) and injects brand-kit palette when present.
- `apps/web/app/api/ai/agent/route.ts` — alternate "Agent Mode" pipeline with tool calls.
- `packages/core/src/diagram-types.ts` — `DIAGRAM_SYSTEM_PROMPTS` (one per type, each with type-selection rules + few-shot).
- `packages/core/src/use-cases.ts` — `USE_CASE_STYLE_INSTRUCTIONS` (presentation / social / documentation / custom).

### Server actions
- `apps/web/app/actions/project.ts` — `createProject`, `saveProject`, `listProjects`, `getProject`, `deleteProject`, `listRevisions`, `restoreRevision`
- `apps/web/app/actions/share.ts` — `createShareLink(projectId, previewDataUrl?)`, `updateSharePreview`
- `apps/web/app/actions/brand-kit.ts` — `getBrandKit`, `saveBrandKit`
- `apps/web/app/actions/templates.ts` — `forkTemplate(id)`

### Public pages
- `/s/[token]` — public share viewer (HTML + branded OG)
- `/s/[token]/og` — serves real diagram PNG if captured, else branded card
- `/embed/[token]` — chromeless viewer for iframes
- `/app/templates` — gallery of starter diagrams

### Schema
- `apps/web/lib/db/schema.ts` — drizzle tables: `users`, `workspaces`, `projects`, `revisions`, `shareLinks` (with `previewDataUrl`), `brandKits`, `apiKeys`, `exportJobs`
- Migrations under `apps/web/lib/db/migrations/`. Add new ones via `pnpm --filter @flowchart/web db:generate` (or hand-write + journal entry).

## Conventions

### Branching / commits
- **Work directly on `master`** — the user authorized this in the "make it legendary" session. Push after each completed phase / fix.
- Commit messages: `feat(scope): subject` / `fix(scope): subject` / `chore(scope): subject`. Body explains the *why*, not just the *what*.
- Never use `--no-verify` or `--no-gpg-sign`. Never force-push master.
- `claude/loving-brown-MphvU` is the legacy feature branch — fully merged into master, can be deleted whenever.

### Code style
- **No emojis** in code or commits unless explicitly requested.
- **No comments explaining what code does** — only WHY when non-obvious. Identifiers carry the meaning.
- **No multi-line docstrings.** One-line max.
- **No backwards-compat shims** for code that wasn't shipped publicly.
- **No new validation / error handling** for impossible cases. Trust internal callers.
- Default `text-` color is `slate-*`. Indigo for primary accents. Amber for warnings/streaming. Red for errors.

### State patterns (in editor-client.tsx)
- Undo: `recordUndo(source)` before any mutating change. 50-step capped via `UNDO_LIMIT`.
- Source vs source-with-UI: `source` is the diagram body. `sourceWithUi` (mermaid only) prepends `%% ui:{json}` for persisting palette/font/etc. Use `parseUiFromSource()` to split back.
- Streaming: `aiLoading` from `useChat`. The Mermaid render effect debounces 120 ms while loading, 0 ms otherwise, and uses `mermaid.parse()` to keep the last-good SVG visible on partial input.

### Verification
- After every fix: `pnpm --filter @flowchart/web exec tsc --noEmit` (filter `.test.ts` errors, those are pre-existing).
- After every UI change: `pnpm --filter @flowchart/web build` (catches issues tsc misses).
- `pnpm test:unit` — 14 tests across 5 suites. Should stay green.

### Lint warnings to ignore
There are ~41 pre-existing `@typescript-eslint/no-unused-vars` warnings in `editor-client.tsx` from old state that was never wired (e.g. `setShowTypePanel`, `setEchartsUiTheme`, `setShowStylePanel`). Don't fix unless explicitly asked — could break implicit dependencies.

## Planning docs

- `.planning/STATE.md` — current milestone / phase status
- `.planning/ROADMAP.md` — high-level roadmap with checkboxes
- `.planning/phases/MILESTONE-*.md` — milestone-level plans
- `.planning/phases/NN-name/NN-SUMMARY.md` — per-phase summary after completion

When starting a new phase, create the folder + a `NN-CONTEXT.md` if you need
planning notes; write the `NN-SUMMARY.md` at the end. Don't create planning
docs the user didn't ask for.

## Open polish list (not yet shipped)

If the user says "keep going" without specifying:
1. Bracket auto-pair in the source editor (`{`, `[`, `"`)
2. Search/replace in the source panel (⌘F)
3. Line/column indicator in the source-panel footer
4. Dark mode for the editor chrome (themes exist for diagrams only)
5. Auto-layout buttons for BPMN / Excalidraw (they have built-in layout, no UI trigger)
6. AI-suggested templates ("we recommend the OAuth template for that prompt")
7. Public profile pages — `/u/[handle]` showing a user's published diagrams

## Things to NOT do

- **Don't merge the legacy branch back.** `claude/loving-brown-MphvU` is dead — its work is all on master.
- **Don't push to a non-master branch** without explicit ask.
- **Don't add CodeMirror / Monaco** for the source editor. The current zero-dep highlighter is intentional. Only revisit if the user asks for autocomplete or multi-cursor.
- **Don't render planning/docs files unless asked.** No `README.md` or `*.md` creation by default.
- **Don't add headless browser infra** for OG image generation. The client-capture approach in Phase 9 is the deliberate trade-off.
- **Don't try to use `gh` CLI** — this environment only has the GitHub MCP server. Repository scope is `gwaghmar/flowstudio` only.

## Quick how-tos

### Add a new diagram type
1. Add it to `DiagramType` union in `packages/core/src/diagram-types.ts`
2. Add a system prompt in `DIAGRAM_SYSTEM_PROMPTS`
3. Create `apps/web/components/diagrams/<type>-renderer.tsx` with `{ source, onChange?, readOnly? }` contract
4. Dynamic-import it in `editor-client.tsx`
5. Add a render branch in the canvas section (search "diagramType ===")
6. Add label to `TYPE_LABELS` in `/s/[token]/page.tsx` and `/og/route.tsx`
7. Add support in `share-viewer.tsx` and `embed-viewer.tsx`

### Add a new server action
- Drop in `apps/web/app/actions/<name>.ts`
- Start with `"use server"`
- Use `auth()` + `ensureUserAndWorkspace(email)` for the auth pattern
- `revalidatePath()` what changed

### Run the app locally
```bash
pnpm install
pnpm --filter @flowchart/web dev
```
DB is mock by default. To connect Supabase, set `DATABASE_URL` and `pnpm --filter @flowchart/web db:push`.
