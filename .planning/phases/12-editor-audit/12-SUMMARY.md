---
phase: 12-editor-audit
status: complete
milestone: 1.3
---

# Summary: Phase 12 — Editor Quality Audit & Fixes

## What Was Found

Asked: "are diagrams perfect?" Audited each of the 7 renderers + the editor's source pipeline end-to-end. Found five real defects and one big UX gap.

## Defects Fixed

### 1. BPMN — cannot recover from a parse error
The BPMN renderer used to conditionally render either the `<div ref={containerRef}>` OR a centered error block, swapping based on `parseError`. When source went from bad → good, the container element was just being created for the first time and `containerRef.current` was null in the init effect, so the viewer never re-initialized. Diagram appeared permanently broken until full page reload.

**Fix:** container is always mounted. Parse error renders as a small absolute-positioned banner over the (possibly stale) canvas, never tears down the DOM target.

### 2. ECharts — cannot recover from initial parse failure
Same pattern. The init effect runs once on mount; if source is invalid then, `chartRef.current` stays null. The source-update effect early-returns when chart is null, so subsequent valid source never lands.

**Fix:** the source-update effect now lazy-initializes the chart if one doesn't exist yet. Also moved the error banner to an absolute overlay so the container stays sized.

### 3. ReactFlow — crashes on AI-generated nodes without `position`
`parseSource()` was passing nodes through unchanged. AI sometimes emits nodes with only `id` + `data` (no position), which makes React Flow throw.

**Fix:** fall back to a staircase layout (`x: 100 + (i%4)*220, y: 80 + floor(i/4)*140`) for any node missing `position`. Existing positions are untouched.

### 4. Mermaid render effect — re-initializes the library on every render
The effect I added in Phase 10 was calling `mermaid.initialize(...)` inside the async render block. That's idempotent but wasteful and could race with concurrent renders.

**Fix:** Split into two effects. The first calls `mermaid.initialize()` only when `[theme, diagramType]` changes. The second renders.

### 5. Mermaid — silent failure on broken hand-edited source
The Phase 10 effect kept the last-good SVG on any parse error, which is correct DURING AI streaming but is confusing when the user breaks the source manually — the diagram doesn't update and there's no hint why.

**Fix:** new `mermaidRenderError` state. During AI streaming the behavior is unchanged (silent last-good). When not streaming and parse fails, a small amber banner at the bottom of the canvas shows the parse error (first line only). `data-no-export` so it doesn't appear in PNG exports.

## UX Gap Closed

### Source code editor
The editor was importing `mermaid` but never used it AND had no textarea where users could manually edit the source. The only way to change a diagram was to ask the AI. Hand-edit was impossible — including fixing a typo or renaming a node.

**Added:** a Source toggle button (Code2 icon) in the canvas toolbar next to the AI Chat toggle. Opens a right-side aside (mirror of the AI panel structure) with a monospaced textarea bound to `source`. Every keystroke records an undo entry, so ⌘Z still works. Live-applies to the preview through the same render pipeline used for AI updates.

## Files

### modified
- `apps/web/components/diagrams/bpmn-renderer.tsx` — container always mounted, error becomes overlay
- `apps/web/components/diagrams/echarts-renderer.tsx` — lazy init on source update, error overlay
- `apps/web/components/diagrams/reactflow-renderer.tsx` — fallback positions
- `apps/web/components/editor-client.tsx` — split init/render effects, error banner, new Source panel + state + toolbar toggle

### created
- `.planning/phases/12-editor-audit/12-SUMMARY.md`

## Verification

- `pnpm build` clean
- `tsc --noEmit` clean
- 14/14 unit tests pass

The remaining 41 lint warnings are all from pre-existing dead state declarations (e.g., `setShowTypePanel`, `setEchartsUiTheme`) — none introduced by this phase.
