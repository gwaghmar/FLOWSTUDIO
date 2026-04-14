---
phase: 01-wysiwyg-canvas
plan: 01
subsystem: ui
tags: [react, canvas, aspect-ratio, social-presets, mermaid]

requires: []
provides:
  - Preset selector (select + dimension label) in canvas top toolbar for mermaid/reactflow/nivo/bpmn
  - Mermaid canvas container fixed to CSS aspect-ratio matching export preset dimensions
  - Custom export default changed from 1080×1080 to 1920×1080 (16:9)
affects: [verification, export]

tech-stack:
  added: []
  patterns:
    - "CSS aspectRatio property used to enforce export dimensions on canvas container"
    - "overflow-hidden on canvas container clips diagram content to preset bounds"

key-files:
  created: []
  modified:
    - apps/web/components/editor-client.tsx

key-decisions:
  - "Used `width: frameW + aspectRatio: frameW/frameH` CSS to enforce dimensions — removes minWidth/minHeight/width:max-content that previously allowed canvas to expand with content"
  - "Preset selector inserted after diagram-type label in canvas toolbar (not only in Export flyout)"
  - "Custom export default set to 1920×1080 to match WYSIWYG-02 requirement"

patterns-established:
  - "Canvas aspect-ratio: set frameRef style to {width: frameW, aspectRatio: `${frameW} / ${frameH}`} — downstream export still reads from innerRef SVG directly so PNG/SVG/ZIP exports are unaffected"

requirements-completed:
  - WYSIWYG-01
  - WYSIWYG-02
  - WYSIWYG-03
  - WYSIWYG-04

duration: 15min
completed: 2026-04-14
---

# Phase 01: WYSIWYG Canvas — Plan 01 Summary

**Fixed mermaid canvas to enforce export-preset aspect ratio via CSS, and surfaced preset selector + dimension label directly in canvas toolbar.**

## What Was Built

### Task 1 — Preset selector and dimension label in canvas toolbar
- Inserted a `<select>` (aria-label="Canvas size preset") after the diagram-type label in the canvas top toolbar
- Shows for `mermaid`, `reactflow`, `nivo`, `bpmn` diagram types only
- Includes all 5 SOCIAL_PRESETS entries + "Custom" option
- A `<span>` immediately after shows `{frameW}×{frameH}` at all times (WYSIWYG-04)
- Shares the same `presetId`/`setPresetId` state as the Export flyout — selecting a preset in the toolbar also applies to exports

### Task 2 — Mermaid canvas aspect-ratio + custom 16:9 default
- `customExportWidth` initial state: 1080 → **1920** (WYSIWYG-02: custom defaults to 16:9)
- `frameRef` div style: replaced `minWidth/minHeight/width:max-content/height:max-content` with `width: ${frameW}px; aspectRatio: ${frameW} / ${frameH}` (WYSIWYG-01, WYSIWYG-03)
- Changed `overflow-visible` → `overflow-hidden` class on frameRef (clips diagram to canvas boundary)
- Changed `innerRef` div classes: `inline-flex min-h-full min-w-full items-start justify-start p-8` → `flex min-h-full w-full items-center justify-center p-8 overflow-hidden` (centers diagram in fixed canvas)

## Verification Results

| Check | Result |
|-------|--------|
| `aria-label="Canvas size preset"` present in toolbar | ✓ line 999 |
| `aspectRatio: \`${frameW} / ${frameH}\`` in frameRef style | ✓ line 1136 |
| `customExportWidth` default = 1920 | ✓ line 175 |
| `overflow-hidden rounded-xl shadow-xl` on frameRef | ✓ line 1142 |
| `minWidth`/`minHeight` removed from mermaid canvas | ✓ (0 matches) |
| TypeScript errors in editor-client.tsx | ✓ none (pre-existing error in share-viewer.tsx unrelated) |

## Commit

`593e10d` feat(01-01): add preset selector to toolbar and fix mermaid canvas aspect-ratio
