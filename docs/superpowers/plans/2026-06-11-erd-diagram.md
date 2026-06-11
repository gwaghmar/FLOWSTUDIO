# ERD / Database Schema Diagram — Phase 2 Implementation

**Goal:** Add an `erd` diagram type — an interactive xyflow canvas of database **table
nodes** (name header + typed columns with PK/FK/UK markers) connected by relationship
edges — wired through the full vertical (AI generate, editor, share, embed, OG). Reuses
the `xyflow-base` built in Phase 1 (Cloud); needs **no** icon registry.

**Spec:** `docs/superpowers/specs/2026-06-11-erd-diagram-design.md`
**Roadmap:** `docs/superpowers/specs/2026-06-10-new-diagram-types-ROADMAP.md` (Phase 2 of 8)
**Pattern source:** Phase 1 (Cloud) — `2026-06-10-cloud-architecture-diagram.md`

## Source format `erd-json`

Reuses the reactflow `{nodes, edges}` shape:
- node `data`: `{ label: tableName, columns: [{ name, type?, key?: "PK"|"FK"|"UK" }] }`
- edge `label`: cardinality (`"1:N" | "1:1" | "N:M"`)

## Tasks (all complete)

1. **Core registry** — `packages/core/src/diagram-types.ts`: `DiagramType` union `| "erd"`;
   `aiOutputFormat` `| "erd-json"`; `DIAGRAM_TYPE_META` entry (label "Database Schema",
   icon `database`, color `#0891b2`); `DIAGRAM_SYSTEM_PROMPTS.erd` (schema + key/cardinality
   rules + blog few-shot); `DIAGRAM_TYPE_DEFAULTS.erd` (users/posts/comments). Core builds.
2. **Renderer** — `apps/web/components/diagrams/erd-renderer.tsx`: `TableNode` (cyan header +
   column rows, `KeyRound` PK / `Link2` FK / `UK` badge), node-level handles t/l/b/r,
   `ErdRenderer`, `autoLayoutErd` = `autoLayoutGraph(src,{rankdir:"LR",nodeWidth:200,nodeHeight:140,nodesep:60,ranksep:160})`.
   No new module beyond the renderer — `xyflow-base` reused unchanged.
3. **Editor wiring** — `editor-client.tsx`: dynamic import (`CanvasLoader label="Schema"`);
   `onFinish` auto-layout via reused `cloudNeedsLayout` (shape-agnostic); `handleAutoLayout`
   `erd` branch; auto-layout button condition + title; `QUICK_PROMPTS.erd`; canvas render branch.
4. **AI generate** — `app/api/ai/generate/route.ts`: `VALID_DIAGRAM_TYPES` += `erd`;
   `typeHints.erd`; `suggestedDiagramType` enum += `erd`; routing rule moves
   "ERD/database schema/entity relationship/data model/tables and relationships" → `erd`
   (was mermaid; mermaid keeps flowchart/sequence/class/gantt/mindmap/state/C4).
5. **Read-only surfaces** — `share-viewer.tsx` + `embed-viewer.tsx` (import + label + branch);
   `s/[token]/page.tsx` + `s/[token]/og/route.tsx` `TYPE_LABELS`; `diagram-icon.tsx`
   (`erd → Database`); `app/app/editor/page.tsx` `VALID_TYPES`.
   No change: `lib/source-highlight.tsx` (JSON default), `app/api/mcp/route.ts` (reads META).
6. **Docs + verify** — `CLAUDE.md` 8→9 types; PRD/ROADMAP/STATE. `tsc --noEmit` clean
   (only pre-existing `.test.ts` TS5097), `pnpm --filter @flowchart/web build` green,
   `pnpm test:unit` 32 pass. Smoke: erd default parses (3 tables/3 edges) and `autoLayoutErd`
   positions all nodes LR.

## Deferred (per spec non-goals)

- Per-column relation handles (handle on a specific column row) — v1 uses node-level handles,
  cardinality on the edge label.
- Canvas column-edit UI; DDL (`CREATE TABLE`) import/export.

## Next

Phase 3 (Org chart) — xyflow + person nodes, dagre **tree** layout — reuses `xyflow-base`.
