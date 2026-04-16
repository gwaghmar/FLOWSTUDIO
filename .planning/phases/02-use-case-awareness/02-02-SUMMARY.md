---
plan: 02-02
phase: 02-use-case-awareness
status: complete
commit: 426f8dc
---

# Summary: 02-02 — "Use for" Selector UI + Wire suggestedPresetId

## What Was Built

Extended `apps/web/components/editor-client.tsx` with a `useCaseId` state, `handleUseCaseChange` function, a "Use for" `<select>` in the canvas toolbar, and wiring of the AI-inferred `suggestedPresetId` field to automatically update the canvas preset on AI response.

## Key Changes

### `apps/web/components/editor-client.tsx`
- Added local `UseCaseId = "presentation" | "social" | "documentation" | "custom"` type (fallback until Plan 03 exports it from core)
- Added `useCaseId` state (`useState<UseCaseId>("custom")`) after `presetId` state
- Added `handleUseCaseChange` callback: maps `presentation → landscape`, `social → square_feed`; `documentation` and `custom` do not change the preset
- Inserted "Use for" `<select>` in the canvas toolbar (after Phase 1 preset selector, before right-side actions):
  - Visible only for mermaid/reactflow/nivo/bpmn diagram types
  - 4 options: Custom, Presentation, Social, Documentation
  - `aria-label="Use case"` for accessibility
- Updated `handleChatSend` data type to include `suggestedPresetId?: SocialPresetId`
- Added `setPresetId(data.suggestedPresetId)` call after `setSource` when AI returns a non-null preset ID

## Self-Check: PASSED

| Criterion | Status |
|-----------|--------|
| `UseCaseId` type present in file | ✓ |
| `useState<UseCaseId>("custom")` state | ✓ |
| `handleUseCaseChange` maps presentation→landscape, social→square_feed | ✓ |
| "Use for" `<select>` with `aria-label="Use case"` | ✓ |
| Toolbar select has all 4 options | ✓ |
| `data.suggestedPresetId` typed in handleChatSend | ✓ |
| `setPresetId(data.suggestedPresetId)` called when truthy | ✓ |
| TypeScript: no errors in editor-client.tsx | ✓ |

## key-files

### created
_(none — plan modifies existing file only)_

### modified
- `apps/web/components/editor-client.tsx` — useCaseId state, handleUseCaseChange, Use-for toolbar selector, suggestedPresetId wiring
