# ERD / DB Schema Diagrams — Phase 2 Design

> Second new diagram type. Adds an `erd` type: an interactive canvas of database
> table nodes (name header + typed columns with PK/FK markers) connected by
> relationship edges. Reuses the `xyflow-base` built in Phase 1 (Cloud).
>
> Parent: `2026-06-10-new-diagram-types-ROADMAP.md`. Predecessor: `2026-06-10-cloud-architecture-diagram-design.md`.

## Goals

1. New selectable diagram type `erd` that renders an interactive xyflow canvas of
   table nodes connected by relationship edges.
2. AI generates valid `erd` source from database-schema / "tables and relationships" prompts.
3. Drag-to-edit on canvas + source-panel JSON edit, both write back to `source`.
4. Full vertical: share, embed, OG, picker, highlight, MCP.

## Why a dedicated `erd` type when Mermaid already has `erDiagram`?

Mermaid's `erDiagram` subtype is text-grammar only — no drag, no visual layout
control. The `erd` type is the **visual, drag-to-edit** ER editor (table nodes you
can move, relationships you can draw on the canvas), consistent with the Group A
node family. Both stay; the AI routes explicit DB-schema intent to the visual `erd`.

## Non-goals (v2)

- Per-column relation handles (handles attached to a specific column row) — v1 uses
  node-level handles; cardinality is carried on the edge label. Deferred to v2.1.
- Column-level editing UI (add/rename column via canvas form) — edit via source panel.
- Inline DDL import/export (`CREATE TABLE` ⇄ erd-json) — future.

## Source format: `erd-json`

Reuses the reactflow `{nodes, edges}` shape, with `label` + `columns` on node data:

```json
{
  "nodes": [
    { "id": "users", "data": { "label": "users", "columns": [
      { "name": "id", "type": "uuid", "key": "PK" },
      { "name": "email", "type": "text" },
      { "name": "created_at", "type": "timestamp" }
    ]}},
    { "id": "posts", "data": { "label": "posts", "columns": [
      { "name": "id", "type": "uuid", "key": "PK" },
      { "name": "author_id", "type": "uuid", "key": "FK" },
      { "name": "title", "type": "text" }
    ]}}
  ],
  "edges": [
    { "id": "e1", "source": "users", "target": "posts", "label": "1:N" }
  ]
}
```

- `columns[].key` is optional, one of `"PK" | "FK" | "UK"`.
- `position` optional — `parseGraph` staircase fallback, auto-layout via Wand2.
- `label` on an edge carries cardinality ("1:N", "1:1", "N:M").
- Malformed JSON / missing columns never crash (empty array fallback).

## Reuse: `lib/diagrams/xyflow-base.ts` (no change)

`parseGraph` / `serializeGraph` / `makeChangeHandlers` / `autoLayoutGraph` are
graph-shape agnostic — the ERD renderer consumes them unchanged. The Phase-1 layout
opts get tuned per-call (`autoLayoutErd` passes taller node dims). No icon registry
is needed (unlike Cloud), so there is **no** `erd-icons` / `erd-glyphs` module.

## New renderer: `components/diagrams/erd-renderer.tsx`

Mirror of `cloud-renderer`, using `xyflow-base` + a `TableNode`:

- `TableNode({ data })` — a card: colored header with the table name; a list of
  column rows, each showing `name` (left), `type` (right, muted), and a key badge —
  `PK` → indigo `KeyRound`, `FK` → slate `Link2`, `UK` → amber dot. Node-level handles
  on top+left (target) and bottom+right (source), matching the cloud `IconNode`.
- `nodeTypes = { table: TableNode }`; parse forces `type: "table"`.
- Export `ErdRenderer({ source, onChange, readOnly })`.
- Export `autoLayoutErd(source)` = `autoLayoutGraph(source, { rankdir: "LR", nodeWidth: 200, nodeHeight: 140, nodesep: 60, ranksep: 160 })`.

## Editor wiring (`components/editor-client.tsx`)

- Dynamic import `ErdRenderer` (`CanvasLoader label="Schema"`).
- Canvas render branch `diagramType === "erd"` (mirror cloud's `minHeight:600px` wrapper).
- `onFinish` post-gen: reuse `cloudNeedsLayout` (shape-agnostic) → if no positions, run
  `autoLayoutErd` so AI output lands laid-out.
- `handleAutoLayout`: add an `erd` branch (calls `autoLayoutErd`).
- Auto-layout button condition + title: include `erd`.
- `QUICK_PROMPTS.erd`: ["Add a junction table", "Add a foreign key", "Add timestamps", "Normalize this"].
- Type-picker entry is driven by `DIAGRAM_TYPE_META` (free).

## AI generate route (`app/api/ai/generate/route.ts`)

- Add `"erd"` to `VALID_DIAGRAM_TYPES`.
- `typeHints.erd`: "Extract every entity/table, its columns with types, primary keys (PK),
  foreign keys (FK), unique keys (UK), and the relationships (1:1 / 1:N / N:M) between tables."
- `suggestedDiagramType` enum string: add `erd`.
- Routing rule: move "ERD", "database schema", "entity relationship", "tables and
  relationships", "data model" → `erd` (was mermaid). Mermaid keeps flowchart/sequence/
  class/gantt/mindmap.
- `DIAGRAM_SYSTEM_PROMPTS.erd`: JSON-only, the `erd-json` schema, the key/cardinality
  rules, and a blog few-shot (users → posts → comments).

## Read-only surfaces

- `share-viewer.tsx` + `embed-viewer.tsx`: `ErdRenderer` dynamic import + `erd` branch (readOnly).
- `DIAGRAM_TYPE_LABELS.erd = "Database schema"` (share-viewer Record — required to compile).
- `TYPE_LABELS.erd = "Database schema"` in `s/[token]/page.tsx`, `s/[token]/og/route.tsx`.
- `diagram-icon.tsx`: `erd → lucide Database`.
- `app/app/editor/page.tsx`: add `erd` to `VALID_TYPES`.
- `lib/source-highlight.tsx`: no change (defaults to JSON for non-mermaid/non-bpmn).
- `app/api/mcp/route.ts`: no change (reads `DIAGRAM_TYPE_META` dynamically).

## Core registry (`packages/core/src/diagram-types.ts`)

- `DiagramType` union: add `| "erd"`.
- `aiOutputFormat` union: add `"erd-json"`.
- `DIAGRAM_TYPE_META` entry:
  `{ id: "erd", label: "Database Schema", description: "Entity-relationship diagrams — tables, columns, keys, and relationships", category: "technical", icon: "database", color: "#0891b2", subtypes: ["tables","relationships","keys"], aiOutputFormat: "erd-json" }`
- `DIAGRAM_SYSTEM_PROMPTS.erd` and `DIAGRAM_TYPE_DEFAULTS.erd` (blog schema starter).

## Error handling

- `parseGraph` never throws; a node with no `columns` renders header-only.
- `autoLayoutGraph` try/catch returns original.
- Unknown `key` value → no badge (falls through). No extra validation layers.

## Testing / verification

- No new pure module → no new unit suite (xyflow-base already covered in Phase 1).
- `pnpm --filter @flowchart/web exec tsc --noEmit` (ignore pre-existing `.test.ts` errors).
- `pnpm --filter @flowchart/web build`.
- `pnpm test:unit` stays green.
- Manual: generate "a blog database schema" → erd renders table nodes with columns;
  drag a table; edit source; Wand2 auto-layouts; share + embed + OG show it.

## Definition of done

All vertical touchpoints wired; AI generates valid erd source; canvas + source editing
both work; share/embed/OG handle it; build + tests green; CLAUDE.md "diagram types"
section updated to 9 types. Then proceed to Phase 3 (Org chart) reusing `xyflow-base`.
