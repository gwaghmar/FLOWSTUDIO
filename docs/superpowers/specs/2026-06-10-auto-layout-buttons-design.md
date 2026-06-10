# Auto-layout buttons for BPMN & Excalidraw — Design

> Polish item #5. Add a Wand2 auto-layout/tidy button to the BPMN and Excalidraw
> renderers, mirroring the ReactFlow auto-layout that already exists.

## Context

ReactFlow already has auto-layout:

- A `Wand2` button in the editor toolbar, shown only when `diagramType === "reactflow"`
  (`editor-client.tsx:1739`).
- `handleAutoLayout()` (`editor-client.tsx:809`) — guards on type, imports the renderer,
  calls a pure `source -> source` transform, `recordUndo` + `setSource` + toast.
- `autoLayoutReactFlow(source)` (`reactflow-renderer.tsx:163`) — pure async transform using
  dagre; `try/catch` returns the original source on failure.

This item extends that exact pattern to BPMN and Excalidraw.

## Goals

1. BPMN: a real graph auto-layout (left-to-right tree) via the official `bpmn-auto-layout`.
2. Excalidraw: a grid-tidy that snaps every element's position to a fixed grid.
3. One shared `handleAutoLayout` that branches on `diagramType`.
4. Show the Wand2 button for `reactflow | bpmn | excalidraw`, with a per-type tooltip.

## Non-goals

- No reflow/repack of Excalidraw elements (would break arrow bindings on a freeform
  canvas). Snap-to-grid only.
- No new layout engine for ReactFlow — its dagre path is untouched.

## Design

### Dependency

Add `bpmn-auto-layout` (official bpmn-io package) to `apps/web`. It is the only way to
compute BPMN DI coordinates; bpmn-js's modeler has no native auto-layout. API:
`layoutProcess(xml: string): Promise<string>` — takes BPMN XML, returns XML with a fresh
left-to-right layout (DI shapes/edges).

### `autoLayoutBpmn(source)` — new export in `bpmn-renderer.tsx`

Pure async `source -> source`, mirroring `autoLayoutReactFlow`:

```ts
export async function autoLayoutBpmn(source: string): Promise<string> {
  try {
    const { layoutProcess } = await import("bpmn-auto-layout");
    return await layoutProcess(source);
  } catch {
    return source;
  }
}
```

On success, `setSource(next)` flows into the renderer's existing update effect
(`bpmn-renderer.tsx:151`), which re-imports the XML and re-fits — no extra wiring.

### `tidyExcalidraw(source)` — new export in `excalidraw-renderer.tsx`

Pure `source -> source` JSON transform. Snap each element's `x`/`y` to a 20px grid.
`points` arrays are left untouched (they are relative to `x`/`y`, so the whole shape
shifts by the same snap delta and stays internally consistent). Sizes are preserved.

```ts
const GRID = 20;
const snap = (n: number) => Math.round(n / GRID) * GRID;

export function tidyExcalidraw(source: string): string {
  try {
    const data = JSON.parse(source) as ExcalidrawData;
    const elements = (data.elements ?? []).map((el) =>
      el && typeof el === "object" && typeof el.x === "number" && typeof el.y === "number"
        ? { ...el, x: snap(el.x), y: snap(el.y) }
        : el
    );
    return JSON.stringify({ ...data, elements });
  } catch {
    return source;
  }
}
```

Rationale for snap-only over repack: arrows/lines carry absolute bindings to shapes.
Repacking shapes into a fresh grid disconnects bound connectors, which on a freeform
whiteboard is worse than no tidy. Uniform snap keeps every element's relative structure
and binding metadata intact while aligning top-left corners to a grid.

Bound arrows may end up at most ~`GRID` px off their anchor after a snap; Excalidraw
re-derives bound geometry on the next edit. Acceptable for a tidy action, and undoable.

### `handleAutoLayout` — branch on type (`editor-client.tsx:809`)

Replace the `reactflow`-only guard with a per-type branch that resolves the transform,
then keeps the existing `recordUndo` / `setSource` / toast flow:

```ts
const handleAutoLayout = useCallback(async () => {
  try {
    let next = source;
    if (diagramType === "reactflow") {
      next = await (await import("./diagrams/reactflow-renderer")).autoLayoutReactFlow(source);
    } else if (diagramType === "bpmn") {
      next = await (await import("./diagrams/bpmn-renderer")).autoLayoutBpmn(source);
    } else if (diagramType === "excalidraw") {
      next = (await import("./diagrams/excalidraw-renderer")).tidyExcalidraw(source);
    } else {
      return;
    }
    if (next === source) {
      showToast("Layout unchanged");
      return;
    }
    recordUndo(source);
    setSource(next);
    showToast("Auto-layout applied · ⌘Z to undo");
  } catch (e) {
    console.error("[auto-layout]", e);
    showToast("Could not auto-layout");
  }
}, [diagramType, source, recordUndo, showToast]);
```

### Button (`editor-client.tsx:1739`)

Show for the three types; tooltip per type:

```tsx
{(["reactflow", "bpmn", "excalidraw"] as DiagramType[]).includes(diagramType) && (
  <button
    type="button"
    onClick={() => void handleAutoLayout()}
    title={
      diagramType === "bpmn" ? "Auto-layout the BPMN diagram"
      : diagramType === "excalidraw" ? "Snap elements to grid"
      : "Auto-layout the node graph"
    }
    className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
  >
    <Wand2 className="h-4 w-4" />
  </button>
)}
```

## Error handling

Both transforms are `try/catch` returning original source -> `handleAutoLayout` shows
"Layout unchanged". An unexpected throw is caught and shows "Could not auto-layout".
No new validation beyond this (trusts internal callers, per conventions).

## Testing / verification

- `pnpm --filter @flowchart/web exec tsc --noEmit` (ignore pre-existing `.test.ts` errors).
- `pnpm --filter @flowchart/web build`.
- Manual: BPMN diagram -> Wand2 reflows into a clean left-to-right tree; Excalidraw
  scene -> Wand2 snaps elements to grid; ReactFlow still works unchanged.
- No unit tests added — pure transforms with library/JSON I/O; covered by manual + build.

## Docs

Fix the stale CLAUDE.md "Open polish list": mark items 1, 2, 3, 7 as already shipped,
and record #5 as shipped for BPMN (real layout) + Excalidraw (grid-tidy), noting the
snap-only rationale.
