---
phase: 04-ai-iteration
status: complete
---

# Summary: Phase 4 — Surgical AI Edits

## What Was Built

Added a `mode: "patch" | "create"` distinction to the AI generate pipeline so follow-up prompts edit the existing diagram instead of regenerating it from scratch. Editor sends `patch` by default once source exists and exposes an explicit "Regenerate" toggle for forced full regeneration.

## Key Changes

### `apps/web/app/api/ai/generate/route.ts`
- New `mode?: "patch" | "create"` field on the request body
- `generationMode` resolved server-side: explicit flag wins, otherwise inferred from whether `currentSource` is non-empty
- New `patchDirective` injected at the top of the generation system prompt when patching — instructs the model to preserve IDs/structure and emit minimal diffs
- Assumption note now reads "Patched existing diagram" when in patch mode
- Streamed response includes `generationMode` so the UI can react

### `apps/web/components/editor-client.tsx`
- New `forceCreateNext` state — one-shot flag that flips the next request to `create`
- `useChat` body now includes `mode: forceCreateNext || !source.trim() ? "create" : "patch"`
- Toolbar pill next to "Agent Mode" toggles `forceCreateNext` — visually highlighted (amber) when armed
- `forceCreateNext` resets automatically in `onFinish`
- Revision label pre-set after each AI response (`AI patched: …` or `AI regenerated: …`)

## Success Criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | "rename X to Y" preserves all other nodes | ✓ (patch directive enforces) |
| 2 | "add error branch after Validate" inserts without disturbing happy path | ✓ |
| 3 | Editor sends `mode: "patch"` when source is non-empty | ✓ |
| 4 | Patch prompt tells model to keep IDs unless explicitly asked to change | ✓ |
| 5 | "Regenerate from scratch" still available | ✓ (toolbar pill) |

## key-files

### modified
- `apps/web/app/api/ai/generate/route.ts`
- `apps/web/components/editor-client.tsx`
