---
plan: 03-03
phase: 03-smarter-ai-generation
status: complete
---

# Summary: 03-03 — Assumption Disclosure Banner

## What Was Built

Added a slim disclosure banner that surfaces after silent AI generation, showing the resolved subtype, active canvas preset, and detail level. It complements (does not replace) the chat `assistantMessage` and auto-dismisses after 8 seconds.

## Key Changes

### `apps/web/app/api/ai/generate/route.ts`
- Streamed data payload now includes `resolvedSubtype`:
  ```ts
  resolvedSubtype: intentPlan.suggestedSubtype ?? effectiveDiagramType
  ```

### `apps/web/components/editor-client.tsx`
- New state `assumptionBanner: string | null` declared above the streamData effect so the auto-dismiss effect can read it.
- `streamData` effect builds the formatted banner string when `meta.needsClarification === false && meta.resolvedSubtype`:
  ```
  Generated as: {resolvedSubtype} · {presetLabel} · {Detail} detail
  ```
  The `presetLabel` uses the newly inferred `suggestedPresetId` first to avoid a stale render against the previous preset.
- New `useEffect` clears the banner after 8 seconds.
- New JSX: a 36px-tall muted slate banner with an × dismiss button, rendered immediately after the existing `aiNotice` banner and before the toolbar.

## Self-Check: PASSED

| Criterion | Status |
|-----------|--------|
| `resolvedSubtype` in streamed response | ✓ |
| Banner rendered conditionally on `needsClarification === false && resolvedSubtype` | ✓ |
| 8-second auto-dismiss timer | ✓ |
| Manual × dismiss button | ✓ |
| Slim ~36px slate-tinted bar (D-14 style spec) | ✓ |
| Coexists with `aiNotice` and chat assistantMessage | ✓ |
| TypeScript: no errors (only pre-existing .test.ts errors) | ✓ |
| `pnpm --filter @flowchart/web build` succeeds | ✓ |

## key-files

### modified
- `apps/web/app/api/ai/generate/route.ts`
- `apps/web/components/editor-client.tsx`
