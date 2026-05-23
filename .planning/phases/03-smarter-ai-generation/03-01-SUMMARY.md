---
plan: 03-01
phase: 03-smarter-ai-generation
status: complete
---

# Summary: 03-01 — System Prompt Overhaul (All 7 Diagram Types)

## What Was Built

Rewrote `DIAGRAM_SYSTEM_PROMPTS` in `packages/core/src/diagram-types.ts` so every one of the seven diagram types now carries (a) a type-selection / layout-pattern decision section, (b) a type-specific content extraction checklist, and (c) at least one few-shot example demonstrating correct subtype selection.

## Key Changes

### `packages/core/src/diagram-types.ts`
- **mermaid**: tightened SUBTYPE SELECTION rules (e.g. `sequenceDiagram` REQUIRED when ≥2 actors exchange messages); added explicit CONTENT EXTRACTION CHECKLIST (actors, decisions, ER entities, duration cues). Existing 3 few-shot examples retained as reference pattern.
- **excalidraw**: added LAYOUT-PATTERN SELECTION (linear flow / wireframe / concept cluster / architecture / sketch), extraction checklist, two few-shot examples (login wireframe; frontend→API→DB flow).
- **reactflow**: added SUBTYPE SELECTION (orgchart / tree / pipeline / network / swimlane), extraction checklist, two few-shot examples (engineering org chart; CI/CD pipeline).
- **echarts**: added SUBTYPE SELECTION mapping data shape to chart type (bar/line/pie/scatter/radar/heatmap/treemap/sankey/funnel/gauge/candlestick), extraction checklist, two few-shot examples (quarterly revenue bar; conversion funnel).
- **nivo**: added SUBTYPE SELECTION, extraction checklist, two few-shot examples (radar product comparison; calendar commit heatmap).
- **tldraw**: added COMPOSITION-PATTERN SELECTION (slide / mockup grid / hierarchy / connected flow / hub-and-spoke), extraction checklist, two few-shot examples (key benefits slide; onboarding flow).
- **bpmn**: added PROCESS-SHAPE SELECTION (simple / decision-heavy / parallel / inclusive / multi-actor lanes / exception), extraction checklist, two few-shot guidance examples (support ticket with lanes; image processing with parallel gateway).

## Self-Check: PASSED

| Criterion | Status |
|-----------|--------|
| All 7 types have selection/decision section | ✓ |
| All 7 types have content extraction checklist | ✓ |
| All 7 types have at least one few-shot example | ✓ |
| Type signatures unchanged | ✓ |
| `pnpm --filter @flowchart/core build` succeeds | ✓ |

## key-files

### modified
- `packages/core/src/diagram-types.ts` — `DIAGRAM_SYSTEM_PROMPTS` record overhaul
