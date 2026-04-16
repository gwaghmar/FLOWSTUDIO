---
plan: 02-01
phase: 02-use-case-awareness
status: complete
commit: 3710b05
---

# Summary: 02-01 — Server-side Platform Inference + suggestedPresetId in API Response

## What Was Built

Extended `apps/web/app/api/ai/generate/route.ts` to detect platform keywords in user prompts and return a suggested canvas preset ID in the AI generation API response — enabling the editor to auto-switch canvas size with no additional LLM call.

## Key Changes

### `apps/web/app/api/ai/generate/route.ts`
- Imported `SocialPresetId` from `@flowchart/core`
- Added `suggestedPresetId?: SocialPresetId | null` to `IntentPlan` type
- `defaultIntentPlan()` now returns `suggestedPresetId: null`
- `VALID_PRESET_IDS` constant added at module scope (whitelist of 5 valid preset IDs)
- `parseIntentPlan()` validates the LLM-returned `suggestedPresetId` against the whitelist — any non-whitelisted value coerced to `null`
- `intentInstruction` string extended with:
  - `"suggestedPresetId"` field in the JSON schema declaration
  - 8-rule keyword→preset mapping block (pitch deck→landscape, LinkedIn→square_feed, etc.)
  - Strict default-null instruction to prevent false positives
- Success response conditionally spreads `suggestedPresetId` only when non-null (cleaner response payload)

## Self-Check: PASSED

| Criterion | Status |
|-----------|--------|
| `SocialPresetId` imported in route.ts | ✓ |
| `IntentPlan` type has `suggestedPresetId?: SocialPresetId \| null` | ✓ |
| `VALID_PRESET_IDS` whitelist at module scope | ✓ |
| `parseIntentPlan` validates and coerces `suggestedPresetId` | ✓ |
| `intentInstruction` contains `"pitch deck"` keyword mapping | ✓ |
| Success response conditionally includes `suggestedPresetId` | ✓ |
| TypeScript: no errors in route.ts | ✓ |

## key-files

### created
_(none — plan modifies existing file only)_

### modified
- `apps/web/app/api/ai/generate/route.ts` — IntentPlan type, platform inference rules, response field
