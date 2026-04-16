---
plan: 02-03
phase: 02-use-case-awareness
status: complete
commit: f7cbab2
---

# Summary: 02-03 — Use-case Style Conventions in Core + API Pipeline Wiring

## What Was Built

Three-file change closing the full use-case awareness loop:
1. `packages/core/src/diagram-types.ts` — `UseCaseId` type + `USE_CASE_STYLE_INSTRUCTIONS` record exported
2. `apps/web/app/api/ai/generate/route.ts` — reads `useCaseId` from request body, appends style block to generation instruction
3. `apps/web/components/editor-client.tsx` — passes `useCaseId` in fetch POST body from `handleChatSend`

## Key Changes

### `packages/core/src/diagram-types.ts`
- Added `export type UseCaseId = "presentation" | "social" | "documentation" | "custom"`
- Added `export const USE_CASE_STYLE_INSTRUCTIONS: Record<UseCaseId, string>` with:
  - `presentation`: max 5 top-level nodes, short/bold labels, LOW density
  - `social`: max 4 elements, punchy labels, VERY LOW density
  - `documentation`: ALL entities extracted, annotated edges, HIGH density
  - `custom`: `""` — no instruction, preserves existing behavior

### `apps/web/app/api/ai/generate/route.ts`
- Added `USE_CASE_STYLE_INSTRUCTIONS` to value import from `@flowchart/core`
- Added `UseCaseId` to type import from `@flowchart/core`
- Added `useCaseId?: UseCaseId` to `reqBody` type cast
- Added `useCaseId` variable (defaults to `"custom"`) and `useCaseStyleBlock` from the instructions record
- `generationInstruction` now conditionally appends `useCaseStyleBlock` at the end when non-empty

### `apps/web/components/editor-client.tsx`
- `handleChatSend` fetch POST body now includes `useCaseId` from state

## Self-Check: PASSED

| Criterion | Status |
|-----------|--------|
| `UseCaseId` exported from `packages/core/src/diagram-types.ts` | ✓ |
| `USE_CASE_STYLE_INSTRUCTIONS` exported with all 4 keys | ✓ |
| `USE_CASE_STYLE_INSTRUCTIONS.custom === ""` | ✓ |
| `USE_CASE_STYLE_INSTRUCTIONS["presentation"]` contains "PRESENTATION" | ✓ |
| `USE_CASE_STYLE_INSTRUCTIONS["documentation"]` contains "ALL named entities" | ✓ |
| `USE_CASE_STYLE_INSTRUCTIONS` imported in route.ts | ✓ |
| `reqBody.useCaseId` typed as `UseCaseId` | ✓ |
| `useCaseStyleBlock` appended to `generationInstruction` | ✓ |
| `handleChatSend` passes `useCaseId` in fetch body | ✓ |
| TypeScript: no errors in any of the 3 files | ✓ |

## key-files

### created
_(none — plan modifies existing files only)_

### modified
- `packages/core/src/diagram-types.ts` — UseCaseId type + USE_CASE_STYLE_INSTRUCTIONS
- `apps/web/app/api/ai/generate/route.ts` — useCaseId read from request, style block appended to instruction
- `apps/web/components/editor-client.tsx` — useCaseId passed in generateAI fetch body
