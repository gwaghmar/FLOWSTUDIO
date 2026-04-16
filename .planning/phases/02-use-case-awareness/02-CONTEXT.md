# Phase 2: Use-Case Awareness — Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

AI infers target platform from prompt keywords and sets the correct export preset automatically. User can manually set or override the inferred use-case via a "Use for" selector in the editor. Generation quality changes based on the active use-case (Presentation = sparse/large, Social = icon-friendly, Documentation = dense/annotated).

New capabilities NOT in scope: adding new diagram types, changing export formats, user preference persistence across sessions.

</domain>

<decisions>
## Implementation Decisions

### A — Inference location
- **D-01:** Inference is server-side. The AI intent planning pass (LLM pass 1 in `route.ts`) already extracts `requestedStyle[]` — extend `IntentPlan` to also return `suggestedPresetId: SocialPresetId | null`. The editor reads `suggestedPresetId` from the API response and calls `setPresetId` if not `null`. No new LLM call added — this is one extra field on the existing intent JSON.
- **D-02:** The inference prompt in `route.ts` (the `intentInstruction` string) gets a new section: a keyword→preset mapping the model must follow (e.g., "pitch deck / presentation / slides → `landscape`", "Instagram / LinkedIn / social → `square_feed`", "story / reel / TikTok → `story_reel`", "README / docs / documentation → any, no change"). The model returns `null` for `suggestedPresetId` when no strong platform signal is present — do not infer from weak signals.
- **D-03:** Client side: `handleChatSend` in `editor-client.tsx` reads `suggestedPresetId` from the API response. If non-null, call `setPresetId(suggestedPresetId)` before applying the diagram source. Reflects immediately on the canvas via Phase 1's aspect-ratio enforcement.

### B — "Use for" selector UI
- **D-04:** Selector lives in the canvas top toolbar, immediately after the Phase 1 preset selector (same toolbar row). Keeps both controls together — "what shape" (preset) and "what context" (use-case) are adjacent.
- **D-05:** Four options as a `<select>`: `presentation` / `social` / `documentation` / `custom`. Labels: "Presentation", "Social", "Documentation", "Custom". Default: `"custom"` (no style conventions applied until user or AI sets one). Maps to `UseCaseId` type in `packages/core`.
- **D-06:** The "Use for" selector is only shown for `mermaid`, `reactflow`, `nivo`, `bpmn` diagram types — same condition as the preset selector. `excalidraw`, `tldraw`, `echarts` are excluded.

### C — Preset ↔ Use-case coupling
- **D-07:** Selecting a use-case in the "Use for" selector sets BOTH the style mode AND switches the preset to the canonical default for that use-case:
  - `presentation` → `landscape` (1920×1080)
  - `social` → `square_feed` (1080×1080)
  - `documentation` → no preset change (keep current)
  - `custom` → no preset change (keep current)
- **D-08:** Preset selector (Phase 1) remains independently usable — changing preset does NOT change the use-case. The use-case selector is a higher-level control that can set the preset, but not vice versa.
- **D-09:** AI inference (D-01) sets `suggestedPresetId` only — it does NOT set `useCaseId`. The "Use for" selector is driven only by the user. AI inference and the "Use for" selector are independent signals.

### D — Style mode generation conventions
- **D-10:** Three non-custom use-cases each get a dedicated style instruction block, appended to `DIAGRAM_SYSTEM_PROMPTS` in `packages/core/src/diagram-types.ts` (or injected at call time in `route.ts`). Append to the `generationInstruction` string sent in the generation LLM call.
- **D-11:** Style conventions per use-case:
  - `presentation`: max 5 top-level nodes, large clear labels, minimal edge annotations, no sub-steps unless explicitly asked. Prioritize whitespace and visual clarity.
  - `social`: max 3-4 main elements, bold labels, icon-friendly shapes, no tabular annotations. High visual impact, low text density.
  - `documentation`: full depth — all entities, relationships, and steps extracted. Include annotations, edge labels, sub-steps. Dense but accurate.
  - `custom` (default): no additional style instruction — existing behavior unchanged.
- **D-12:** The `useCaseId` is passed in the API request body from the editor (`reqBody.useCaseId`). Route reads it and selects the appropriate style block. No new LLM call — appended to existing `generationInstruction`.

### Agent's Discretion
- TypeScript type for `UseCaseId`: define as `"presentation" | "social" | "documentation" | "custom"` in `packages/core/src/index.ts` or a new `use-cases.ts` file — agent's choice.
- Exact wording of the style instruction blocks for each use-case — follow D-11 intent but agent writes the prompts.
- Whether `suggestedPresetId` inference logic lives inline in the `intentInstruction` string or as a separate helper — agent's choice for maintainability.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above.

### Key files to read before implementing
- `apps/web/app/api/ai/generate/route.ts` — full AI pipeline: IntentPlan type, intentInstruction string, generationInstruction string, reqBody parsing
- `apps/web/components/editor-client.tsx` — handleChatSend (lines ~373–490), toolbar section (lines ~975–995), presetId state (line ~174)
- `packages/core/src/diagram-types.ts` — DIAGRAM_SYSTEM_PROMPTS (the generation prompts for each type)
- `packages/core/src/social-presets.ts` — SocialPresetId type and SOCIAL_PRESETS array
- `packages/core/src/index.ts` — current exports (add UseCaseId here or in new file)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `presetId` / `setPresetId` state in `editor-client.tsx` — D-03 calls `setPresetId` directly from `handleChatSend` response handler
- Phase 1 preset selector in canvas toolbar (line ~991–1010 after Phase 1 changes) — D-04 inserts "Use for" selector immediately after it
- `SocialPresetId` type from `packages/core` — already imported in editor; `suggestedPresetId` response field uses same type
- `generationInstruction` string in `route.ts` (line ~527) — D-12 appends use-case style block here

### Established Patterns
- Canvas toolbar controls: `<select>` with `rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600` classes — follow same pattern as Phase 1 preset selector
- API request body: untyped cast `as { prompt?: string; ... }` — add `useCaseId?: UseCaseId` to the same cast
- IntentPlan type: plain TypeScript interface in `route.ts` — add `suggestedPresetId?: SocialPresetId | null` field

### Integration Points
- `handleChatSend` return handler: after `setSource(finalSource)`, add `if (data.suggestedPresetId) setPresetId(data.suggestedPresetId)`
- `generationInstruction` in `route.ts`: append `\nUse-case style: ${useCaseStyleBlock}` at end when `useCaseId` is non-null and non-custom

</code_context>

<specifics>
## Specific Ideas

- Inference must only trigger on strong, explicit platform signals — "pitch deck", "LinkedIn", "Instagram story", "README". Weak signals ("make it nice", "for my team") must return `suggestedPresetId: null`. This avoids surprising preset changes on ambiguous prompts.
- "Use for" selector default is `"custom"` — no style conventions applied by default. User opts in or AI inference sets the preset (not the use-case selector).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-use-case-awareness*
*Context gathered: 2026-04-16*
