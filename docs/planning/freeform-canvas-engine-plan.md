# FlowStudio Custom Canvas Engine — Phase 1 (replace tldraw)

## Context

FlowStudio currently uses tldraw to power "Art Board" mode. We discovered tldraw's
license is not truly free for commercial use — it requires a separate paid agreement.
That's a real legal risk for a product we intend to sell. Rather than pay for tldraw
or keep using it under that risk, the decision (confirmed with the user) is to build
FlowStudio's own freeform canvas engine from scratch — original code, inspired by
(never copied from) tldraw/Figma/Miro/Excalidraw's UX ideas.

This is Phase 1 of a longer-term "build our own everything" direction (charts and
flowcharts could follow later), but only this phase — the freeform/art canvas — is
being scoped and started now, since it's the one with actual legal urgency. The user
is solo (just them + Claude Code), in no rush, and wants this built in an isolated
backup copy of the project so the live app / production deploy is never touched until
it's ready to merge back in.

## Decisions

**Foundation library: Konva.js + react-konva (both MIT license, verified against
current GitHub LICENSE files today).** Chosen over Fabric.js (fights a React-state-owns-
the-data architecture), raw Canvas/SVG (too much undifferentiated work for a solo
build — hit-testing, resize handles, drag from scratch), PixiJS (WebGL/game-oriented,
not a shape-editor fit for v1), and Paper.js (no maintained React bindings). Confirmed
`react-konva` 19.x is compatible with the app's installed React 19.2.7.

Architecture stance: **React state is the source of truth; Konva only renders it.**
No separate "editor store" the way tldraw has — this avoids tldraw's own wart where
the AI-facing format and the internal save format are two different things.

**One canonical JSON scene format**, used identically for AI generation, internal
state, and the saved `source` string — never two formats like tldraw's
`{elements}` (AI) vs `{snapshot}` (internal) split.

```ts
type CanvasDocument = { version: 1; shapes: CanvasShape[] };

type BaseShape = {
  id: string; x: number; y: number; rotation?: number;
  fill?: string; stroke?: string; strokeWidth?: number; opacity?: number;
  frameId?: string | null; locked?: boolean;
  text?: { content: string; fontSize?: number; fontFamily?: string;
           align?: "left" | "center" | "right"; color?: string; bold?: boolean };
};
type RectShape    = BaseShape & { type: "rectangle"; width: number; height: number; cornerRadius?: number };
type EllipseShape = BaseShape & { type: "ellipse";   width: number; height: number };
type DiamondShape = BaseShape & { type: "diamond";   width: number; height: number };
type StickyShape  = BaseShape & { type: "sticky";    width: number; height: number };
type TextShape    = BaseShape & { type: "text";      width: number; height: number };
type FrameShape   = BaseShape & { type: "frame";     width: number; height: number; name?: string };
type ArrowEndpoint = { x: number; y: number } | { shapeId: string; anchor?: "top"|"right"|"bottom"|"left"|"center"|"auto" };
type ArrowShape   = BaseShape & { type: "arrow" | "line"; start: ArrowEndpoint; end: ArrowEndpoint };
type CanvasShape = RectShape | EllipseShape | DiamondShape | StickyShape | TextShape | FrameShape | ArrowShape;
```

- Z-order = array order (no z-index field).
- Frame membership is a flat `frameId` reference, not a nested tree (easier for the AI
  to emit correctly, easier to patch one shape by id).
- Arrow binding is resolved at render time via `resolveArrowEndpoint(doc, endpoint)` —
  a bound arrow endpoint stores `{shapeId, anchor}`, not raw coordinates, so it follows
  the shape automatically when it moves/resizes (tldraw-inspired UX idea, original code).

**MVP feature slice:**
- Shapes: rectangle, ellipse, diamond, arrow/line, text, sticky note, frame.
- Interactions: select (click/shift-click/marquee), move, resize+rotate (via
  `Konva.Transformer`), delete, duplicate, keyboard nudge, zoom/pan, double-click text
  editing (contentEditable overlay — the standard technique for text input on canvas).
- Snapping: bounds snapping (alignment guides) + handle snapping (needed for arrow
  binding) in v1. Equal-gap snapping deferred.
- Frames: drag-into-frame assigns `frameId`; moving a frame moves its children.
  Resize-scales-children is deferred (ships the simple, correct behavior first).
- Explicitly deferred (not silently dropped): hand-drawn render style, rich text
  formatting beyond a bold flag, multiplayer, image shapes, nested frames, freehand
  pen tool, pixel-perfect export.
- **Undo/redo needs zero new code** — `editor-client.tsx`'s existing generic
  `undoStack`/`redoStack: string[]` mechanism (~lines 509-515, 651-669, 802-803) works
  automatically as long as the renderer serializes its whole document to one JSON
  string on every committed change, exactly like every other type already does.
- **Export starts free** by doing nothing special — falls into the existing generic
  `html-to-image` DOM-screenshot fallback (`handleExport`, ~lines 1249-1357) that
  tldraw already uses today. A pixel-perfect upgrade (matching the ECharts
  `forwardRef`/`useImperativeHandle` pattern) is a later, optional improvement.

**AI integration:**
- `update_diagram` (full rewrite) needs no new mechanism — just a new
  `DIAGRAM_SYSTEM_PROMPTS.freeform` entry (`packages/core/src/diagram-types.ts`) that
  emits the section-2 schema directly, and a new `FreeformCanvasSchema` (Zod) in
  `apps/web/lib/diagrams/validate-output.ts`, following the exact pattern already used
  for every other JSON-based type.
- New tool `update_shape`: an id-addressed "patch one shape's properties" tool,
  generalizing the existing `update_node` (currently hardcoded to reactflow only,
  `agent/route.ts` ~line 312) instead of reusing the naive string-based `apply_patch`
  (confirmed to be a pure `split/join` with zero structural awareness —
  `apps/web/lib/agent-tools.ts:1-10` — a bad fit for a real scene graph). Applied
  client-side in `editor-client.tsx`'s existing tool-effect-application `useEffect`
  (~line 1095), same pattern as the current `update_node` branch, addressed by
  `shapes[]` instead of `nodes[]`.

**Type id: `"freeform"`**, label "Free Canvas", `category: "whiteboard"` (lands in the
existing Art Board mode tab alongside Excalidraw), `aiOutputFormat: "freeform-json"`.

## New files

- `apps/web/components/diagrams/freeform-renderer.tsx` — `{source, onChange, readOnly}`
  contract (same convention every renderer follows), dynamic-imported client-only,
  same `isApplying`/`lastSource` ref-guard pattern as `tldraw-renderer.tsx:90-144` to
  prevent update feedback loops, but driven by react-konva + local React state.
- `apps/web/lib/diagrams/freeform-canvas.ts` — pure logic: types, `parseFreeformSource`,
  `serializeFreeformDocument`, `resolveArrowEndpoint`, shape defaults, id generation,
  hit-test/frame-membership helpers. Same architectural role as `xyflow-base.ts`.
- `apps/web/lib/diagrams/freeform-canvas.test.ts` — unit tests (parse/serialize
  round-trip, `resolveArrowEndpoint`, reference validation), added to `test:unit`.
- `apps/web/components/diagrams/freeform/Shape.tsx`, `TextEditorOverlay.tsx`,
  `SelectionTransformer.tsx`, `SnapGuides.tsx`, `Toolbar.tsx` — small focused pieces
  instead of one large renderer file.

## Modified files (existing "add a diagram type" checklist, applied to `"freeform"`)

- `packages/core/src/diagram-types.ts` — add `"freeform"` to `DiagramType`, add
  `"freeform-json"` to `aiOutputFormat`, one `DIAGRAM_TYPE_META` entry, one mandatory
  `DIAGRAM_SYSTEM_PROMPTS.freeform` entry (TS requires it — it's a `Record` over the
  full union).
- `apps/web/lib/diagrams/validate-output.ts` — `FreeformCanvasSchema` + a
  `validateFreeformRefs()` helper (mirrors `validateReactFlowEdgeRefs`, lines 171-178)
  checking for dangling `frameId`/arrow `shapeId` references and duplicate ids; add
  `"freeform"` to the JSON-types dispatch array (~line 194) and a new branch (~220).
- `apps/web/app/api/ai/agent/route.ts` — add the `update_shape` tool next to
  `update_node` (~line 312), mention it in the STRATEGY prompt text the same way
  `update_node` is currently called out as reactflow-only (~lines 254-273).
- `apps/web/components/editor-client.tsx` — dynamic import (~line 118 region), render
  branch with **mandatory `w-full`** on the wrapper (documented CLAUDE.md gotcha —
  Group-A canvases collapse to 0px in the flex parent without it, ~line 2823 region),
  `update_shape` tool-effect branch (~line 1095), suggestion chips entry (~line 1624),
  Source-panel-visibility list (~line 2646, recommend including for parity).
- `apps/web/app/app/editor/page.tsx` — add `"freeform"` to `VALID_TYPES` (line 19).
- `apps/web/app/s/[token]/page.tsx` + `og/route.tsx` — add `freeform: "Free Canvas"`
  to each `TYPE_LABELS`.
- `apps/web/components/share-viewer.tsx` + `embed-viewer.tsx` — each needs its own
  dynamic import + `TYPE_LABELS` entry + render branch (standalone viewers, don't
  reuse `editor-client.tsx`).
- `apps/web/app/page.tsx` — cosmetic marketing copy, optional.
- `packages/core/src/templates.ts` — 1-2 starter templates once stable, optional.
- `apps/web/package.json` — add `konva` + `react-konva`.

**Flagged decision, not to be made silently:** once freeform is stable, do we (a) fully
remove tldraw (deps, renderer, prompt entry) and repoint Art Board at freeform only —
cleanest, resolves the license risk completely — or (b) keep the tldraw renderer
present-but-hidden from new-diagram creation for a while, since **existing saved
projects/share-links in the database already have `diagramType: "tldraw"`** and
ripping it out breaks opening those unless there's also a migration step. Revisit this
at merge-back time, not now.

## Build order (each step independently testable — `tsc --noEmit` + manual click-through)

0. Set up the isolated workspace (below).
1. Static rendering: schema + pure functions + unit tests; renderer draws a hardcoded
   fixture (no interactivity yet). Proves the schema and render pipeline.
2. Selection + move + delete + keyboard nudge. Wire `onChange`. **Explicitly verify**
   the existing undo/redo stack works with zero new code (move a shape, Cmd+Z, confirm
   revert) — a claim to test, not assume.
3. Resize + rotate (`Konva.Transformer`).
4. Text editing (contentEditable overlay, commit on blur/Escape).
5. Snapping (bounds + handle).
6. Arrow tool + binding; verify a bound arrow follows when its shape moves/resizes.
7. Frames (drag-into assigns `frameId`, moving a frame moves children).
8. Sticky notes + insertion toolbar + tool-mode state machine.
9. Zoom/pan ergonomics (wheel-zoom around cursor, space-drag pan, fit-to-content).
10. AI generation: system prompt + Zod schema + `update_diagram` wiring; test with
    real prompts.
11. `update_shape` tool: server + client wiring; test with an agent-mode prompt like
    "make the second box red."
12. Full wiring checklist (`VALID_TYPES`, `TYPE_LABELS` ×2, share/embed viewers,
    suggestion chips, Source-panel toggle) — pure plumbing, done last.
13. Optional post-MVP polish: copy/paste, alignment/distribute toolbar, equal-gap
    snapping, pixel-perfect export, hand-drawn render mode, gallery templates.
14. Merge-back (below).

## Isolated workspace setup

A literal full copy of the project — not a git worktree (the user asked for "a
backup," specifically). This keeps the live app/deploy completely untouched.

```bash
rsync -a --exclude node_modules --exclude .next \
  /Users/redforman/FLOWSTUDIO/ /Users/redforman/FLOWSTUDIO-canvas-lab/
cd /Users/redforman/FLOWSTUDIO-canvas-lab
git remote remove origin        # belt-and-suspenders: no path to push to the real repo
pnpm install
pnpm --filter @flowchart/web dev   # Next.js auto-picks a free port if 3040 is busy
```

All milestone work happens in `FLOWSTUDIO-canvas-lab`. Commit there after each
milestone as a checkpoint. The live `/Users/redforman/FLOWSTUDIO` repo is not touched
until merge-back.

## Merge-back (once the build order above reaches milestone 12 and is dogfooded)

1. Diff the lab copy's touched files against the *current* state of the live repo
   (it will likely have moved on in the meantime) rather than assuming nothing changed.
2. Port by hand: copy wholly-new files directly; re-apply the small additive edits
   (new entries in existing dispatch tables/records/render chains) onto the live
   repo's current versions — don't blindly overwrite, to avoid reverting unrelated
   live-repo changes made during the build.
3. Do the tldraw coexist-vs-replace decision (flagged above) as its own separate,
   independently revertible commit, after the "add freeform" commit lands and passes
   verification.
4. Run `pnpm --filter @flowchart/web exec tsc --noEmit`, `pnpm --filter @flowchart/web
   build`, `pnpm test:unit`, and a manual click-through of Art Board mode before
   committing.
5. CLAUDE.md currently documents working directly on master for this repo — given the
   size of this change, ask the user at merge-back time whether they still want that,
   or a feature branch/PR instead, rather than assuming.

## Verification (throughout the build, in the lab workspace)

- `pnpm --filter @flowchart/web exec tsc --noEmit` after each milestone.
- `pnpm --filter @flowchart/web build` after UI-affecting milestones.
- `pnpm test:unit` stays green (freeform-canvas tests added incrementally).
- Manual pass via `pnpm --filter @flowchart/web dev`: draw shapes, move/resize/rotate,
  type labels, draw arrows and confirm they bind and follow, group into a frame,
  undo/redo through a sequence of edits, zoom/pan, then a full AI-generation round
  trip ("draw me a simple org chart" → confirm valid output) and a targeted edit
  ("make the second box red" → confirm `update_shape` applies correctly).
