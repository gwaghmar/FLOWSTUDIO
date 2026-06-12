# Phase 13 — Social Card Engine — SUMMARY

**Status:** Complete  
**Milestone:** 1.4 — Social Card Engine  
**Closed:** 2026-06-12

---

## What shipped

### Tasks 1–8 (commit history, oldest → newest)

| Commit | Scope | What it does |
|--------|-------|--------------|
| 2efea52 | `feat(social)` | Parse module — `parseSocialCard()` with normalizing parser, coordinate clamping (matrix2x2), empty-array defaults; 5 TDD tests |
| 3634371 | `feat(core)` | Registers `timeline`, `versus`, `matrix2x2`, `funnel` in `DiagramType` union + `DIAGRAM_SYSTEM_PROMPTS` |
| 49040ce | `feat(diagrams)` | Social card renderer — single dispatcher + 4 layout sub-components (pure HTML/Tailwind, `cqw` fluid sizing) |
| aae659d | `feat(editor)` | Wires social card types into canvas branch, type picker icons, and `diagramType` state |
| cf07898 | `feat(share)` | Social card types in share viewer, embed viewer, OG type-label maps |
| b0f7bc5 | `fix(ai)` | Corrects versus typeHint to two sides only |
| 73a1be0 | `feat(ai)` | AI generation — typeHints + intent routing for the 4 new types |
| 4ee4aeb | `fix(ai)` | Corrects timeline typeHint and routing rules |
| 90dae76 | `feat(export)` | Copy diagram as PNG to clipboard via Export ▾ → Copy image |
| 5fd67ed | `fix(export)` | Adds excalidraw and echarts dark-mode branches to `handleCopyImage` |
| 6bc6446 | `feat(templates)` | 4 starter templates in gallery for the social card types |

### Feature surface
- **4 new diagram types**: `timeline`, `versus`, `matrix2x2`, `funnel`
- **Full pipeline coverage**: AI generation → editor canvas → source panel → share page → embed viewer → OG preview → templates gallery
- **Copy image**: Export ▾ → Copy image — PNG to clipboard, all types including excalidraw and echarts dark mode
- **Social card renderer**: `social-card-renderer.tsx` dispatching to `TimelineCard`, `VersusCard`, `Matrix2x2Card`, `FunnelCard`
- **Parse module**: `apps/web/lib/diagrams/social-cards.ts` — `parseSocialCard()` with TDD coverage (5 tests)
- **Templates**: 4 starters added to the gallery

---

## What was verified

### Test gate
```
pnpm test:unit
```
Result: **44 tests, 44 pass, 0 fail** across 8 suites. Includes the 5 new `parseSocialCard` tests.

### Build gate
```
pnpm --filter @flowchart/web build
```
Result: **Build succeeded** — Compiled in 13.5s, TypeScript clean, 31 routes generated.

---

## What is deferred / blocked

### Browser verification — deferred to manual verification
The dev server was not running during this session and the Gemini key / Supabase DB were not confirmed as configured. The following require manual verification before considering the phase 100% end-to-end:
- `cqw` fluid sizing under `html-to-image` export (social card PNG correctness at various viewport sizes)
- AI generation end-to-end (Gemini key required for live generate → social card flow)
- OG preview for social card share links (requires DB to create a share link)
- Copy image for each social card type in a running browser

### Known follow-up: `validateAndRepairOutput` gap
`apps/web/app/api/ai/generate/route.ts` → `validateAndRepairOutput` has no handler for social card types. This is a pre-existing gap that also affects `cloud`, `erd`, and `orgchart`. Social JSON parses cleanly from the AI in practice (the parse module normalizes it), but strict repair logic does not exist. Tracked as a future hardening task.

---

## Key files added / modified

- `packages/core/src/diagram-types.ts` — 4 new types registered
- `apps/web/lib/diagrams/social-cards.ts` — parse module
- `apps/web/lib/diagrams/social-cards.test.ts` — 5 unit tests
- `apps/web/components/diagrams/social-card-renderer.tsx` — renderer
- `apps/web/components/editor-client.tsx` — canvas branch + icon + copy-image
- `apps/web/components/share-viewer.tsx` — type labels
- `apps/web/components/embed-viewer.tsx` — type labels
- `apps/web/app/s/[token]/og/route.tsx` — type labels
- `apps/web/app/api/ai/generate/route.ts` — intent routing + typeHints
- `apps/web/app/templates/page.tsx` — 4 starter templates
