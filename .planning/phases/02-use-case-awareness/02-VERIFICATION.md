---
phase: 02-use-case-awareness
verified: 2026-04-16T00:00:00Z
status: human_needed
score: 14/15 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 12/15
  gaps_closed:
    - "When AI returns suggestedPresetId, canvas preset updates automatically (setPresetId now called alongside setUseCaseId)"
    - "AI-inferred use-case is pre-filled in the Use-for selector (setUseCaseId now called with correct mapping)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Generate same diagram with Use-for=Presentation vs Use-for=Documentation and compare node density"
    expected: "Presentation has <=5 top-level nodes with short labels; Documentation has all entities, annotated edges, high density"
    why_human: "USE_CASE_STYLE_INSTRUCTIONS are correctly injected into the generation prompt but LLM compliance with density rules requires live generation comparison"
---

# Phase 2: Use-Case Awareness Verification Report

**Phase Goal:** Detect user use-case context (pitch deck, LinkedIn post, documentation) from natural language and auto-configure the canvas preset and diagram generation style accordingly.
**Verified:** 2026-04-16T00:00:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (setUseCaseId + setPresetId dual-write fix in handleChatSend)

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Typing "for my pitch deck" returns suggestedPresetId: landscape in API response | ✓ VERIFIED | route.ts line 506: `"pitch deck", "presentation", "slides", "keynote"… -> "landscape"` |
| 2 | Typing "LinkedIn post" returns suggestedPresetId: square_feed in API response | ✓ VERIFIED | route.ts line 507: `"LinkedIn", "LinkedIn post", "Twitter"… -> "square_feed"` |
| 3 | A prompt with no platform signal returns suggestedPresetId: null (no change) | ✓ VERIFIED | defaultIntentPlan (line 174) sets suggestedPresetId: null; response only spreads it when non-null (line 609) |
| 4 | The IntentPlan type includes suggestedPresetId field | ✓ VERIFIED | route.ts line 33: `suggestedPresetId?: SocialPresetId \| null` |
| 5 | The API response JSON includes suggestedPresetId when non-null | ✓ VERIFIED | route.ts line 609: conditional spread `...(intentPlan.suggestedPresetId != null ? { suggestedPresetId: … } : {})` |
| 6 | Toolbar shows Use-for selector for mermaid/reactflow/nivo/bpmn types | ✓ VERIFIED | editor-client.tsx line 1033: guard on `["mermaid","reactflow","nivo","bpmn"].includes(diagramType)` + select bound to useCaseId |
| 7 | When AI returns suggestedPresetId, canvas preset updates automatically | ✓ VERIFIED | editor-client.tsx lines 463–468: both setUseCaseId(inferredUseCase) AND setPresetId(data.suggestedPresetId) called — GAP FIX CONFIRMED |
| 8 | Selecting Presentation in Use-for switches preset to landscape | ✓ VERIFIED | handleUseCaseChange line 633: `if (id === "presentation") setPresetId("landscape")` |
| 9 | Selecting Social in Use-for switches preset to square_feed | ✓ VERIFIED | handleUseCaseChange line 634: `else if (id === "social") setPresetId("square_feed")` |
| 10 | Selecting Documentation or Custom does not change the preset | ✓ VERIFIED | handleUseCaseChange only branches on presentation/social; documentation and custom fall through with no setPresetId call |
| 11 | The Use-for selector shows the currently active use-case | ✓ VERIFIED | editor-client.tsx line 1039: `value={useCaseId}` bound to state |
| 12 | UseCaseId type is exported from packages/core | ✓ VERIFIED | diagram-types.ts line 802 exports `UseCaseId`; index.ts: `export * from "./diagram-types.js"` picks it up |
| 13 | The generate API accepts useCaseId in request body and injects use-case style block | ✓ VERIFIED | route.ts line 421: useCaseId in reqBody type; line 432: extracted; line 433: USE_CASE_STYLE_INSTRUCTIONS lookup; line 558: appended to generationInstruction |
| 14 | useCaseId=custom produces no style instruction change (existing behavior preserved) | ✓ VERIFIED | diagram-types.ts line 822: `custom: ""` — empty; conditional append at line 558 produces nothing |
| 15 | Diagram with useCaseId=presentation uses fewer nodes/larger text than useCaseId=documentation | ? NEEDS HUMAN | Style instructions correctly injected (presentation LOW density <=5 nodes; documentation HIGH density ALL entities) — LLM behavioral compliance requires live generation test |

**Score:** 14/15 truths verified

---

### Gap Fix Verification

The reported gap — handleChatSend calling setPresetId without setUseCaseId — is **confirmed closed**.

editor-client.tsx lines 463–468 (current state):

```typescript
if (data.suggestedPresetId) {
  const inferredUseCase: UseCaseId =
    data.suggestedPresetId === "landscape" ? "presentation" :
    (["square_feed", "vertical_feed", "story_reel"].includes(data.suggestedPresetId) ? "social" : "custom");
  setUseCaseId(inferredUseCase);       // present and correct
  setPresetId(data.suggestedPresetId); // present and correct
}
```

Mapping correctness:
- landscape → "presentation" ✓
- square_feed | vertical_feed | story_reel → "social" ✓  
- link_preview (others) → "custom" ✓

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/web/app/api/ai/generate/route.ts` | IntentPlan with suggestedPresetId; keyword rules; API response spread | ✓ VERIFIED | All present; VALID_PRESET_IDS whitelist guards parse; response conditional spread |
| `apps/web/components/editor-client.tsx` | useCaseId state; Use-for selector; suggestedPresetId+useCaseId applied on AI response | ✓ VERIFIED | State line 178; selector line 1037; dual-write fix lines 463–468; handleUseCaseChange line 630 |
| `packages/core/src/diagram-types.ts` | UseCaseId type + USE_CASE_STYLE_INSTRUCTIONS record | ✓ VERIFIED | Lines 802 and 808; all 4 use-cases with substantive instruction strings |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| intentInstruction keyword rules | IntentPlan.suggestedPresetId | LLM JSON return | ✓ WIRED | Prompt rules lines 505–513; parseIntentPlan validates against VALID_PRESET_IDS |
| IntentPlan.suggestedPresetId | NextResponse.json return | Conditional spread line 609 | ✓ WIRED | Only included when non-null |
| handleChatSend response handler | setPresetId + setUseCaseId | data.suggestedPresetId from fetch | ✓ WIRED | Both calls present lines 467–468 |
| Use-for select onChange | setPresetId + setUseCaseId | handleUseCaseChange | ✓ WIRED | Lines 630–635; all four use-case branches handled |
| editor-client.tsx handleChatSend | reqBody.useCaseId in route.ts | fetch POST body | ✓ WIRED | useCaseId at line 400; route.ts line 432 reads it |
| USE_CASE_STYLE_INSTRUCTIONS[useCaseId] | generationInstruction | String append line 558 | ✓ WIRED | Conditional append; custom="" yields no addition |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| editor-client.tsx Use-for select | useCaseId state | useState("custom") + setUseCaseId() from AI response/user selection | Yes — driven by real AI response field | ✓ FLOWING |
| route.ts success response | suggestedPresetId | intentPlan.suggestedPresetId from LLM JSON parsed + validated | Yes — real LLM output validated against VALID_PRESET_IDS | ✓ FLOWING |
| generationInstruction useCaseStyleBlock | style string | USE_CASE_STYLE_INSTRUCTIONS[useCaseId] lookup | Yes — non-empty for presentation/social/documentation | ✓ FLOWING |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| USECASE-01 | 02-01 | AI infers platform from keywords and sets export preset automatically | ✓ SATISFIED | Keyword rules in intentInstruction; suggestedPresetId in API response; client sets presetId on receipt |
| USECASE-02 | 02-02 | Editor exposes Use-for selector that overrides AI-inferred preset | ✓ SATISFIED | Selector rendered in toolbar for mermaid/reactflow/nivo/bpmn; handleUseCaseChange drives both state changes |
| USECASE-03 | 02-03 | AI adjusts diagram style based on resolved use-case | ? NEEDS HUMAN | Style instructions correctly injected into generation prompt — LLM behavioral compliance requires live generation |
| USECASE-04 | 02-02, 02-03 | AI-inferred use-case pre-filled in Use-for selector | ✓ SATISFIED | setUseCaseId(inferredUseCase) called on AI response (lines 464–467); selector value bound to useCaseId state |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `editor-client.tsx` | 22–23 | Local `type UseCaseId` with comment "Fallback until packages/core exports UseCaseId" — core now exports it | ⚠️ Warning | Redundant type alias; structurally identical so no runtime impact; should be removed and replaced with core import |

No TODOs, FIXME, placeholders, empty handlers, or stub return patterns found in modified files.

---

### Human Verification Required

#### 1. Use-case style conventions affect AI output density (USECASE-03)

**Test:** Open the editor. Generate the same prompt (e.g., "Show a user signup flow") twice:
1. "Use for" selector set to **Presentation**
2. "Use for" selector set to **Documentation**

**Expected:**
- Presentation result: ≤5 top-level nodes, 2–4 word node labels, minimal or no edge annotations
- Documentation result: all named entities/actors present, every transition edge annotated, subgraphs expand detail without hiding it

**Why human:** The `USE_CASE_STYLE_INSTRUCTIONS` strings are substantive and correctly appended to the generation prompt (confirmed via static analysis), but whether the LLM reliably respects the density constraints across prompts requires live generation comparison. This cannot be verified by grep.

---

### Gaps Summary

No blocking gaps remain after the fix applied in commit `fix(02-02): sync useCaseId when AI returns suggestedPresetId`.

Original gap — `handleChatSend` setting `presetId` from `suggestedPresetId` without also updating `useCaseId`, causing the Use-for selector to stay on "Custom" even after AI-inferred preset was applied — is confirmed closed with correct use-case mapping logic.

One item prevents `passed` status: USECASE-03 behavioral verification (whether the AI actually produces sparser output in presentation mode vs documentation mode). This is a live-generation human check only.

Minor tech debt: the local `UseCaseId` type alias at `editor-client.tsx` lines 22–23 is now redundant — `packages/core` exports the identical type and the file already imports other types from core.

---

_Verified: 2026-04-16T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
