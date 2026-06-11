# Org Chart Diagrams — Phase 3 Design

> Third new diagram type. Adds an `orgchart` type: an interactive canvas of person
> nodes (name + title + avatar initials) in a top-down reporting tree. Reuses
> `xyflow-base` (Phase 1) with a dagre **TB** tree layout.
>
> Parent: `2026-06-10-new-diagram-types-ROADMAP.md`. Predecessors: cloud (P1), erd (P2).

## Goals
1. New `orgchart` type rendering an interactive xyflow tree of person nodes.
2. AI generates valid `orgchart` source from "org chart / reporting structure / hierarchy" prompts.
3. Drag-to-edit on canvas + source-panel JSON edit, both write back to `source`.
4. Full vertical: share, embed, OG, picker, highlight.

## Why a dedicated type vs the reactflow "orgchart" subtype?
ReactFlow's `orgchart` is a generic colored-box graph the user lays out by hand. The
`orgchart` type is a **person-node** tree with one-click **dagre top-down tree layout** —
the right tool for reporting structures. AI routes org/hierarchy intent here.

## Source format: `orgchart-json`
Reuses `{nodes, edges}`:
```json
{
  "nodes": [
    { "id": "ceo", "data": { "label": "Jane Smith", "title": "CEO" } },
    { "id": "cto", "data": { "label": "Bob Lee", "title": "CTO" } }
  ],
  "edges": [ { "id": "e1", "source": "ceo", "target": "cto" } ]
}
```
- `label` = person name; `title` = role (optional); `color` optional accent.
- Edges are reporting lines (manager → report), top-down.
- `position` optional — staircase fallback, auto-layout via Wand2 (TB).

## Renderer: `components/diagrams/orgchart-renderer.tsx`
Mirror of `erd-renderer`, using `xyflow-base` + a `PersonNode`:
- `PersonNode({ data })` — rounded white card: avatar circle with initials (accent-tinted),
  bold name, muted title. Node-level handles: top (target), bottom (source) for the tree.
- `nodeTypes = { person: PersonNode }`; parse forces `type: "person"`.
- `OrgChartRenderer({ source, onChange, readOnly })`.
- `autoLayoutOrgChart(source)` = `autoLayoutGraph(source, { rankdir: "TB", nodeWidth: 180, nodeHeight: 90, nodesep: 40, ranksep: 90 })`.

## Editor wiring (`editor-client.tsx`)
- Dynamic import `OrgChartRenderer` (`CanvasLoader label="Org chart"`).
- Canvas render branch `diagramType === "orgchart"` — **wrapper uses `w-full`** (the
  cloud/erd 0-width fix; the free-form xyflow canvas must fill its flex parent).
- `onFinish` post-gen auto-layout via `cloudNeedsLayout` → `autoLayoutOrgChart`.
- `handleAutoLayout` orgchart branch; auto-layout button condition + title; `QUICK_PROMPTS.orgchart`.
- Edges default sourceHandle "b" (bottom) / targetHandle "t" (top) for clean tree lines.

## AI generate route
- `VALID_DIAGRAM_TYPES` += `orgchart`; `typeHints.orgchart`; `suggestedDiagramType` enum += orgchart.
- Routing: move "org chart / reporting structure / company hierarchy / who reports to whom /
  team structure" → `orgchart` (was reactflow). reactflow keeps pipeline/network/tree/swimlane.
- `DIAGRAM_SYSTEM_PROMPTS.orgchart`: JSON schema + top-down rule + an exec-team few-shot.

## Read-only surfaces
- `share-viewer` + `embed-viewer`: import + `orgchart` branch (readOnly).
- `DIAGRAM_TYPE_LABELS.orgchart = "Org chart"` (+ `TYPE_LABELS` in share page, og route).
- `diagram-icon`: `orgchart → lucide Users`.
- `app/app/editor/page.tsx`: `VALID_TYPES` += orgchart.
- highlight (JSON default) + MCP (reads META) — no change.

## Core registry
- union `| "orgchart"`; `aiOutputFormat` `| "orgchart-json"`.
- META: `{ id:"orgchart", label:"Org Chart", description:"Reporting structures and company hierarchies — person nodes in a top-down tree", category:"business", icon:"users", color:"#7c3aed", subtypes:["company","team","reporting"], aiOutputFormat:"orgchart-json" }`.
- `DIAGRAM_SYSTEM_PROMPTS.orgchart` + `DIAGRAM_TYPE_DEFAULTS.orgchart` (CEO → CTO/CFO/VP Sales → reports).

## Verification
- No new pure module → no new unit suite. `tsc --noEmit` clean; `pnpm --filter @flowchart/web build`; `pnpm test:unit`.
- Live headless Playwright: `?type=orgchart` renders person nodes in a tree, drag works,
  canvas width > 0 (the w-full check).

## Definition of done
All touchpoints wired; AI generates valid orgchart; canvas + source editing work; share/embed/OG
handle it; build + tests green; live render verified; CLAUDE.md → 10 types. Then Phase 4 (Mind map).
