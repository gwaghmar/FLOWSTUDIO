---
plan: 03-02
phase: 03-smarter-ai-generation
status: complete
---

# Summary: 03-02 — Intent Pipeline Clarification Fix

## What Was Built

Added a conservative `shouldAskClarification` directive to the intent prompt so the model rarely asks questions — combined with the existing server-side gate of `ambiguityScore >= 90`, this implements the two-gate clarification system specified in Phase 3.

## Key Changes

### `apps/web/app/api/ai/generate/route.ts`
- Added the following rule to `intentInstruction`:

  > Set `shouldAskClarification: true` ONLY when a critical actor, entity, or structure is completely absent from the prompt AND you cannot make a reasonable assumption. Most requests — even vague ones — should generate immediately with assumptions noted in `assumptions`. Do NOT ask for clarification if the user's intent is clear enough to produce a useful diagram. Prefer producing something and noting assumptions over blocking on questions.

- Server-side gate already at `intentPlan.shouldAskClarification && intentPlan.ambiguityScore >= 90` (verified, no change needed).

## Self-Check: PASSED

| Criterion | Status |
|-----------|--------|
| Conservative shouldAskClarification rule present in intentInstruction | ✓ |
| Server-side threshold `>= 90` enforced | ✓ |
| Both flags AND-ed | ✓ |
| `clampAmbiguityScore` unchanged | ✓ |
| TypeScript: no errors | ✓ |

## key-files

### modified
- `apps/web/app/api/ai/generate/route.ts` — intent prompt directive
