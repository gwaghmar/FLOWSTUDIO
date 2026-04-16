# Phase 3: Smarter AI Generation — Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Improve the quality, accuracy, and immediacy of AI-generated diagrams. Three distinct improvements:
1. Rewrite all 7 diagram system prompts with type-selection decision rules, content depth checklists, and few-shot examples
2. Fix the intent pipeline clarification gate — raise threshold to ambiguityScore ≥ 90 and update intent prompt instructions
3. Add a dismissible assumption notice banner in the editor after silent generation

New capabilities NOT in scope: adding diagram renderer types, changing export formats, changing the 2-pass AI pipeline architecture, multi-diagram batch generation, user preset persistence.
</domain>

<decisions>
## Implementation Decisions

### A — System prompt overhaul
- **D-01:** Full uniform rewrite across all 7 diagram types. Every type gets: (1) a type-selection subtype decision section, (2) per-type content extraction checklist, (3) 1–2 few-shot examples demonstrating correct type selection and full entity extraction. Mermaid already has good content — preserve its structure as the reference pattern and bring all other types up to the same level.
- **D-02:** Each type's extraction checklist is type-specific. Examples:
  - `mermaid`: existing subtype rules retained + deepen extraction (all actors, all steps, all decision branches)
  - `bpmn`: include all named lanes, all gateway types (exclusive/parallel/inclusive), happy path AND exception paths, SLA constraints if mentioned
  - `reactflow`: include all node types, all state transitions, swim-lane groupings if mentioned
  - `excalidraw`: include all spatial groupings, all connection directions, all labeled components
  - `echarts` / `nivo`: include all named series, all axes, all data categories explicitly mentioned
  - `tldraw`: include all hierarchy levels, all labeled boxes/arrows, all connection patterns mentioned
- **D-03:** Few-shot examples added to all 7 types. Each example should demonstrate correct type selection (e.g., for mermaid: sequence vs flowchart), not just syntax. Examples should reflect user prompts similar to AI-01/AI-02/AI-03 success criteria.
- **D-04:** Changes are confined to `packages/core/src/diagram-types.ts` — `DIAGRAM_SYSTEM_PROMPTS` record only. No structural changes to how prompts are consumed.

### B — Intent pipeline clarification fix
- **D-05:** Raise the server-side clarification gate from `ambiguityScore >= 68` to `ambiguityScore >= 90`. Change line ~530 in `route.ts`: `const shouldClarify = intentPlan.shouldAskClarification && intentPlan.ambiguityScore >= 90;`
- **D-06:** Update the intent prompt's `shouldAskClarification` instruction in `intentInstruction` to be more conservative: "Set `shouldAskClarification: true` ONLY when a critical actor, entity, or structure is completely absent from the prompt AND you cannot make a reasonable assumption. Most requests — even vague ones — should generate immediately with assumptions noted. Do NOT ask for clarification if the user's intent is clear enough to produce a useful diagram."
- **D-07:** The `ambiguityScore >= 90` numeric boundary is enforced server-side in `route.ts`. The model's own `shouldAskClarification` flag is still checked (logical AND), maintaining the two-gate system — both must be true to trigger a clarification.
- **D-08:** No changes to `ambiguityScore` range or how it's clamped. The `clampAmbiguityScore` helper stays as-is.

### C — Assumption notice banner
- **D-09:** After a silent generation (no clarification asked), a slim dismissible banner appears between the toolbar and the canvas container in `editor-client.tsx`. It does NOT replace the existing `assistantMessage` in the chat — both coexist.
- **D-10:** Banner content format: `Generated as: {resolvedType} · {presetLabel} · {detailLevel} detail`
  - `resolvedType` = the actual diagram subtype used (from `intentPlan.suggestedSubtype` if set, otherwise `diagramType`)
  - `presetLabel` = human-readable name of the active preset (e.g., "Landscape 16:9", "Square 1:1", "Custom")
  - `detailLevel` = "Low" / "Medium" / "High" (capitalised) from `intentPlan.detailLevel`
- **D-11:** The API response needs to include `detailLevel` and `resolvedSubtype` fields so the frontend can populate the banner. Add to the success JSON response in `route.ts`:
  - `detailLevel: intentPlan.detailLevel` (already in intentPlan)
  - `resolvedSubtype: (intentPlan as any).suggestedSubtype ?? diagramType`
- **D-12:** Banner auto-dismisses after 8 seconds. User can also dismiss via × button. State is local to the generation — new generation replaces the previous banner.
- **D-13:** Banner is only shown when `needsClarification` is false AND `source` is non-null. Never shown for clarification responses or error states.
- **D-14:** Styling: slim bar (height ~36px), neutral background (e.g., `bg-muted/80` with `border-b`), small text with `×` at the right edge. Not a blocking modal.

### Agent's Discretion
- Exact wording of per-type extraction checklists (follow D-02 intent but agent writes the specifics).
- Exact few-shot example content for each type — should be semantically appropriate to each type's domain.
- Whether to add `resolvedSubtype` directly to the response JSON object or derive it client-side from existing fields.
- React state management for the banner (useState with useEffect timeout is fine).
- Exact Tailwind classes for the banner appearance — consistent with the existing toolbar style.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above.

### Key files to read before implementing

| File | What to read |
|------|--------------|
| `packages/core/src/diagram-types.ts` | `DIAGRAM_SYSTEM_PROMPTS` (lines ~105–end) — current prompts for all 7 types; structure to extend |
| `apps/web/app/api/ai/generate/route.ts` | `intentInstruction` string (lines ~474–520), `shouldClarify` gate (line ~530), success JSON return (lines ~600–615) |
| `apps/web/components/editor-client.tsx` | `handleChatSend` (lines ~395–480), toolbar and canvas render area (lines ~1000–1060) |

### Requirements covered by this phase
- AI-01: Correct diagram type selection
- AI-02: Full entity/relationship extraction
- AI-03: Style cue respect (handled via use-case style block from Phase 2 + depth rules)
- AI-04: Clarification threshold ≥ 90
- AI-05: Dismissible assumption notice after silent generation
</canonical_refs>

<deferred>
## Deferred Ideas

(None raised during discussion)
</deferred>
