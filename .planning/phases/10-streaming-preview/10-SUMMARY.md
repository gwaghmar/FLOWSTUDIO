---
phase: 10-streaming-preview
status: complete
milestone: 1.3
---

# Summary: Phase 10 — Streaming Live Preview

## What Was Built

Two things, fixed together:

1. **The editor finally renders Mermaid live.** Despite importing the `mermaid` library, the editor had no useEffect that actually called `mermaid.render()` — the canvas was an empty div. Added the rendering pipeline.

2. **Streaming-aware rendering.** While the AI is streaming source, the canvas updates progressively. Partial/invalid source is detected via `mermaid.parse()` first; on parse failure the last-good SVG stays on screen so the canvas never flickers to empty between chunks.

Plus a small "Streaming" pill + animated ring on the canvas while the AI generates.

## Architecture

Single `useEffect` in `editor-client.tsx` tied to `[source, theme, diagramType, aiLoading]`:

- Bail early if `diagramType !== "mermaid"` (other types use their own React renderers).
- Empty source → clear canvas + reset last-good.
- Sequence counter (`renderSeqRef`) drops stale results when a newer render starts mid-flight.
- Debounce: 120 ms while `aiLoading`, immediate when not. Manual typing feels snappy; AI streaming doesn't thrash.
- `mermaid.parse(source)` first — cheap validity check. Invalid prefixes don't reach the expensive render path.
- On render success → `lastGoodSvgRef.current = svg`, innerHTML swap.
- On parse/render failure → keep the previous innerHTML untouched (last-good wins). No flicker.

The "Streaming" indicator: a pulsing indigo ring around the frame + a small pill in the top-left with the Sparkles icon, both tagged `data-no-export` so they never appear in exported PNGs.

## Success Criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Editor renders Mermaid diagrams as you type (was previously missing) | ✓ |
| 2 | During AI streaming, canvas updates progressively, not just at the end | ✓ (debounced renders on every parse-valid chunk) |
| 3 | Invalid partial source does not flicker the canvas to empty | ✓ (last-good SVG retained on parse failure) |
| 4 | Stale renders are discarded if a newer one starts mid-flight | ✓ (renderSeqRef gate) |
| 5 | Visual cue indicates streaming is happening | ✓ (ring + pill, data-no-export) |

## Notes

Only Mermaid is text-streamable. JSON-backed types (echarts, reactflow, etc.) need a complete `JSON.parse` to render, so partial JSON can't progressively render. Those renderers do still receive source updates as React props on each chunk — they just stay on the last fully-valid JSON until a new complete object arrives. The streaming ring shows for any AI generation regardless of type.

## key-files

### modified
- `apps/web/components/editor-client.tsx` — new render effect + streaming indicator

### created
- `.planning/phases/10-streaming-preview/10-SUMMARY.md`
