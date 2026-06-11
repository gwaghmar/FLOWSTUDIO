# FlowStudio — Product Requirements Document

> Single source of truth for what FlowStudio is, what's shipped, and what's
> still open. Cross-references `.planning/ROADMAP.md` (high-level) and the
> per-phase folders under `.planning/phases/`.
>
> Last updated: 2026-06-02

---

## 1. Product

**FlowStudio** is an AI-powered diagram editor for solo creators (founders,
indie hackers, technical writers). The core loop:

> plain-text prompt → AI picks diagram type → editor renders → user iterates
> → share / embed / export

### Target user
- Founder building a deck and needs an architecture diagram
- Indie hacker writing a blog post and needs a sequence diagram
- Technical writer documenting a process and needs a flowchart
- PM sketching a funnel for a LinkedIn post

### Why FlowStudio vs Mermaid / Excalidraw / Lucidchart
- **Prompt-first** — no learning a grammar, no dragging boxes
- **Right type, automatically** — AI picks flowchart vs sequence vs ER vs chart
- **WYSIWYG export** — canvas matches export aspect ratio (deck, story, square)
- **One brand kit** — palette applies to every diagram automatically
- **Share + embed first-class** — public link with real OG image; paste-able iframe

---

## 2. Stack (locked)

- Next.js 15 App Router + TypeScript + Tailwind
- Drizzle ORM + Postgres (Supabase)
- Vercel AI SDK — OpenAI / Anthropic / Google / Groq / Mistral
- Auth.js (Supabase adapter); mock-auth in local
- pnpm monorepo: `apps/web` + `packages/core`
- Renderers: Mermaid, Excalidraw, ReactFlow (@xyflow), ECharts, Nivo, tldraw, bpmn-js

---

## 3. Diagram type coverage (9 types)

| Type | Status | Editing model |
|---|---|---|
| Mermaid (~13 subtypes) | [x] | source text |
| Excalidraw | [x] | visual + source |
| ReactFlow | [x] | drag + source |
| ECharts | [x] | JSON source |
| Nivo | [x] | JSON source (read-only) |
| tldraw | [x] | visual + source |
| BPMN 2.0 | [x] | visual modeler + XML |
| Cloud / Architecture | [x] | drag + source (xyflow icon nodes) |
| ERD / Database schema | [x] | drag + source (xyflow table nodes) |

---

## 4. Shipped — Milestone tracker

### Milestone 1.0 — AI Diagram Quality & Precision
- [x] **Phase 1: WYSIWYG Canvas** — preview locks to export aspect ratio; dimension label visible
- [x] **Phase 2: Use-Case Awareness** — AI infers presentation / social / docs / custom; "Use for" override selector
- [x] **Phase 3: Smarter AI Generation** — per-type selection rules + content-depth guidelines; ambiguityScore ≥ 90 to clarify; assumption banner

### Milestone 1.1 — AI Iteration & Sharing
- [x] **Phase 4: Surgical AI Edits** — `mode: "patch" | "create"`; follow-ups patch instead of rebuild
- [x] **Phase 5: Persistent Version History** — Clock icon dropdown, click-to-restore, history preserved across restores
- [x] **Phase 6: Public Share with OG Previews** — `/s/[token]` HTML viewer + 1200×630 branded og:image + 404

### Milestone 1.2 — Brand & Distribution
- [x] **Phase 7: Brand Kit** — `brand_kit` table; Settings UI; one-click Palette apply in editor
- [x] **Phase 8: Iframe Embeds** — `/embed/[token]` chromeless viewer; Embed button copies paste-ready `<iframe>`

### Milestone 1.3 — Legendary
- [x] **Phase 9: Real OG Previews** — client captures PNG at share-create → `share_link.preview_data_url` → OG route serves the actual diagram
- [x] **Phase 10: Streaming Live Preview** — Mermaid renders progressively as AI types; `mermaid.parse()` gate + last-good-svg fallback; pulsing "Streaming" pill
- [x] **Phase 11: AI-aware Brand Kit + Templates Gallery** — `/api/ai/generate` injects BRAND PALETTE directive; `/app/templates` ships with 6 curated starters

### New diagram types (Group A — xyflow custom-node family)
- [x] **Phase 1: Cloud / Architecture** — `cloud` type; xyflow icon nodes (AWS/GCP/Azure/generic) + shared `xyflow-base`; trademark-safe glyph registry
- [x] **Phase 2: ERD / Database schema** — `erd` type; xyflow table nodes (typed columns, PK/FK/UK, relationship edges with cardinality); reuses `xyflow-base`; AI routes DB-schema intent here
- [ ] Phase 3: Org chart · Phase 4: Mind map · Phase 5: Quadrant · Phase 6: Timeline · Phase 7: Wireframe · Phase 8: Customer journey (roadmap: `docs/superpowers/specs/2026-06-10-new-diagram-types-ROADMAP.md`)

### Editor polish pass (post-1.3)
- [x] **Phase 12: Renderer audit** — 5 real bugs fixed across BPMN / ECharts / ReactFlow / Mermaid
- [x] Source code editor — right-side panel, monospaced textarea (was missing before)
- [x] Syntax highlighting in Source panel (zero-dep textarea over highlighted `<pre>`)
- [x] Mermaid theme picker dropdown (11 themes)
- [x] ReactFlow auto-layout button (Wand2)
- [x] Reset zoom + pan (⌘0)
- [x] Brand-kit colors reach Mermaid theme variables
- [x] Tab key indents in source panel (no focus-steal)
- [x] Line-number gutter in source panel
- [x] Empty-state CTA in source panel

---

## 5. Open work — not shipped

### Editor polish (priority order, from CLAUDE.md "keep going" list)
- [ ] Bracket auto-pair in source editor (`{`, `[`, `"`)
- [ ] Search / replace in source panel (⌘F)
- [ ] Line / column indicator in source-panel footer
- [ ] Dark mode for editor chrome (diagram themes already exist)
- [ ] Auto-layout buttons for BPMN / Excalidraw (libs support it; no UI trigger yet)

### Growth / distribution
- [ ] AI-suggested templates — "we recommend the OAuth template for that prompt"
- [ ] Public profile pages — `/u/[handle]` showing a user's published diagrams

### Known gaps (not yet on roadmap)
- [ ] Export job queue surface (`exportJobs` table exists, no UI)
- [ ] API keys UI surface (`apiKeys` table exists, no UI)
- [ ] Playwright e2e for streaming preview + share flow (config exists, coverage thin)

---

## 6. Non-goals (don't propose these)

- CodeMirror / Monaco for the source editor — zero-dep highlighter is intentional
- Headless browser for OG image generation — client-capture is the deliberate trade-off
- Real-time multi-user collaboration — out of scope for solo-creator target
- Self-hosted Mermaid renderer — CDN/npm path is fine
- Mobile editor — view + share on mobile, edit on desktop

---

## 7. Architecture cheat sheet

```
apps/web/
  app/
    (app)/                  authed editor, projects, templates
    api/ai/generate/        2-pass intent → generation; brand-kit injection
    api/ai/agent/           tool-call alt pipeline
    s/[token]/              public share viewer + OG route
    embed/[token]/          chromeless iframe viewer
    actions/                project, share, brand-kit, templates (server actions)
  components/
    editor-client.tsx       ~1700-line editor; branches on diagramType
    diagrams/*-renderer.tsx one per type, contract { source, onChange?, readOnly? }
  lib/
    db/schema.ts            users, workspaces, projects, revisions, shareLinks,
                            brandKits, apiKeys, exportJobs
    db/migrations/          drizzle migrations + journal
    source-highlight.tsx    zero-dep syntax highlighter (Mermaid + JSON)
packages/core/
  src/diagram-types.ts      DIAGRAM_SYSTEM_PROMPTS (per-type rules + few-shot)
  src/use-cases.ts          USE_CASE_STYLE_INSTRUCTIONS
```

---

## 8. Decisions log (durable)

| ID | Decision | Why |
|----|----------|-----|
| D-01 | Improve existing 2-pass AI pipeline; don't replace | Intent → generation works; tune prompts and thresholds |
| D-02 | WYSIWYG via CSS aspect-ratio on canvas container | No canvas resize logic; export still runs full resolution |
| D-03 | Clarification threshold = ambiguityScore ≥ 90 | Most prompts should generate immediately |
| D-04 | Use-case drives both export preset AND generation style | Single source of truth for "what this diagram is for" |
| D-05 | Every diagram type gets selection rules + extraction checklist + few-shots | Bring all 7 to Mermaid's quality |
| D-06 | Assumption banner is separate from chat assistantMessage | Both surfaces have a job |
| D-07 | Client-side PNG capture for OG previews (no headless browser) | Cost / cold-start trade-off |
| D-08 | Zero-dep source highlighter (no CodeMirror / Monaco) | Bundle size + simplicity |
| D-09 | Work directly on `master` | Solo dev; push after each phase |

---

## 9. Verification commands

```bash
pnpm install
pnpm --filter @flowchart/web dev                # localhost:3000
pnpm --filter @flowchart/web build              # catches issues tsc misses
pnpm --filter @flowchart/web exec tsc --noEmit  # ignore pre-existing .test.ts errors
pnpm test:unit                                  # 14 tests, 5 suites
pnpm exec playwright test                       # e2e
pnpm --filter @flowchart/web db:generate        # new migration
pnpm --filter @flowchart/web db:push            # apply schema
```

---

## 10. How this PRD stays alive

- When a phase ships → check its box here AND write the `NN-SUMMARY.md` in `.planning/phases/`
- When a decision is made → append to §8 with a new D-NN
- When scope shifts → move items between §4 (shipped) / §5 (open) / §6 (non-goals)
- `.planning/STATE.md` remains the milestone pointer; this PRD is the full picture
