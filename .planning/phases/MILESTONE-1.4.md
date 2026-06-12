# Milestone 1.4 — Core Verification + Social Diagram Pack

> Approved 2026-06-12. Approach B: one "social card" engine, 12 subtypes.

## Goal

1. Prove the core flow works end-to-end and fix what doesn't.
2. Add 12 daily-use, social-media-shareable diagram types via a single new
   rendering engine, plus one-click social export.

## Architecture decision (D-07)

All 12 new types are **JSON in → styled static card out** — no node-graph
interaction. Instead of 12 renderers, build **one `social-renderer.tsx`**
(Group B family, parallel to the Group A xyflow family) that switches on a
`subtype` field in the JSON source:

```json
{ "subtype": "timeline", "title": "...", "items": [...] }
```

- Each subtype = one layout component in `apps/web/components/diagrams/social/`
  + a few-shot block in its system prompt.
- All 12 appear in the type picker as separate entries; under the hood they map
  to `diagramType: "social"` with the subtype embedded in the source JSON.
  (If the picker/AI routing needs distinct `DiagramType` values, they alias to
  the same renderer — decide in planning.)
- Brand-kit aware from day one (palette + font reach the card styles).
- Built at social aspect ratios: 1:1, 4:5, 16:9.
- Editing model: form-less for now — Source panel (JSON) + AI patch edits.
  Inline click-to-edit text is a later polish item, not in this milestone.

## Phases

### Phase 0 — Verify & fix core flow
Run the app locally, drive the full flow in a real browser (Chrome DevTools
MCP per workspace MEMORY.md, 1280×800):
prompt → AI generation → editor render → save → version history → share link
→ `/s/[token]` → embed → export PNG. Also sign-in flow (mock auth) and the
templates gallery. Fix every break found. Verification gate: tsc + build +
`pnpm test:unit` green, plus a written list of what was tested and what was
fixed.

### Phase 1 — Social engine + flagship 4 + social export
- `social-renderer.tsx` + subtype layouts: **timeline**, **versus**,
  **matrix2x2** (2×2 quadrant), **funnel**.
- System prompts with type-selection rules + few-shots (match Mermaid prompt
  quality per D-05).
- Wire: editor branch, type picker, share viewer, embed viewer, OG, TYPE_LABELS.
- **Social export presets**: one-click PNG at 1:1 / 4:5 / 16:9 + copy-to-clipboard.

### Phase 2 — Fun pack
Subtypes: **venn** (2-3 sets), **tierlist** (S/A/B/C/D rows), **iceberg**
(layered depth), **alignment** (3×3 grid + 1-axis spectrum variant).

### Phase 3 — Personal & games
Subtypes: **budget** (income → category split), **habits** (monthly streak
grid), **bingo** (5×5 card), **bracket** (single-elimination tournament).

## Out of scope

- Inline click-to-edit on cards (Source panel + AI edits suffice for v1)
- Animated exports / video
- Direct posting to social APIs (export + clipboard is the share path)
- The pre-existing open polish list items 1-7 (resume after this milestone)

## Success criteria

- Phase 0: every step of the core flow demonstrated working in the browser.
- Each new subtype: AI generates a sensible card from a one-line prompt,
  renders correctly, exports at all 3 social ratios, share/embed/OG work.
- All phases: tsc, build, unit tests green; pushed to master per phase.
