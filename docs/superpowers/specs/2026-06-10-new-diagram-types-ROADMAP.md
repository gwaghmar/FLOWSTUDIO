# New Diagram Types — Phased Roadmap

> Decomposition for "add more super-popular canvas diagram types." Each type is a full
> vertical built end-to-end one at a time. This roadmap is the parent; each type gets its
> own design spec + implementation plan.

## What a new diagram type touches (the vertical)

**Core registry** — `packages/core/src/diagram-types.ts`:
- `DiagramType` union
- `DIAGRAM_TYPE_META` (label, description, category, icon, color, subtypes, aiOutputFormat)
- `DIAGRAM_SYSTEM_PROMPTS[type]`
- `DIAGRAM_TYPE_DEFAULTS[type]`

**App** (`apps/web`):
- `components/diagrams/<type>-renderer.tsx` — the renderer (+ optional `autoLayout<Type>` / png export)
- `components/editor-client.tsx` — dynamic import, canvas render branch, type-picker entry, auto-layout branch
- `app/api/ai/generate/route.ts` — `VALID_DIAGRAM_TYPES`, intent-extraction instructions, output-format note
- `components/share-viewer.tsx` + `components/embed-viewer.tsx` — read-only render branch
- `app/s/[token]/page.tsx`, `app/s/[token]/og/route.tsx`, `app/embed/[token]/page.tsx` — `TYPE_LABELS`
- `lib/source-highlight.tsx` — JSON grammar (most new types are JSON)
- `components/diagram-icon.tsx` — picker icon
- `app/api/mcp/route.ts` — MCP tool type enum

## Architecture: the ReactFlow custom-node family (Group A)

The existing `reactflow-renderer.tsx` forces every node to one `CustomNode`. Group A types
(Cloud, ERD, Org chart, Mind map) are each a **new renderer file** that reuses the
`@xyflow/react` scaffolding (parse → nodes/edges → `applyNodeChanges`/`onConnect` →
`pushChange`; dagre auto-layout) but swaps in a **type-specific node component**:

- Cloud → icon node (provider/service glyph + label)
- ERD → table node (header + column rows + relation handles)
- Org chart → person node (name/title/avatar), dagre tree layout
- Mind map → branch node, radial/tree layout

Shared scaffolding is extracted into a small `lib/diagrams/xyflow-base.ts` helper
(parse, change handlers, JSON serialize, dagre layout with configurable rankdir) so each
renderer is just its node component + config. This keeps the four renderers small and
consistent and is built as part of Phase 1 (Cloud), then reused.

Group B types (Wireframe, Timeline, Quadrant, Journey) each need a bespoke canvas and do
not share the xyflow base.

## Phases (each = its own spec + plan + verify + commit)

| Phase | Type | Group | Engine | Est. effort |
|------|------|-------|--------|-------------|
| 1 | **Cloud / Architecture** | A | xyflow + icon nodes (+ new `xyflow-base`) | M (sets the pattern) |
| 2 | **ERD / DB schema** | A | xyflow + table nodes | M |
| 3 | **Org chart** | A | xyflow + person nodes, dagre tree | S |
| 4 | **Mind map** | A | xyflow + branch nodes, radial layout | M |
| 5 | **Quadrant / 2×2 matrix** | B | bespoke SVG canvas | S |
| 6 | **Timeline / Roadmap** | B | bespoke canvas, swimlanes + milestones | L |
| 7 | **Wireframe / UI mockup** | B | bespoke canvas, component palette | L |
| 8 | **Customer journey map** | B | bespoke swimlane canvas | M |

Order rationale: Group A first (Phase 1 builds shared infra the next three reuse), cheapest
high-value B type (Quadrant) next, then the heavier bespoke canvases. Re-evaluate priority
after each phase based on how it lands.

## Per-type definition of done

- Renders from AI-generated source; drag/edit on canvas writes back to source; source-panel
  edit re-renders.
- AI `generate` route produces valid source for the type; intent extraction routes prompts
  to it when appropriate.
- Share (`/s`), embed (`/embed`), and OG image all handle the type.
- `tsc --noEmit` clean (minus pre-existing `.test.ts`); `pnpm build` green; manual smoke test.
- Type-picker entry with icon, label, description, subtypes.

## Open decision carried into Phase 1

Cloud icon set: ship an **original simplified glyph set** (service categories with provider
color theming, dependency-free, trademark-safe) vs. pull a **third-party official AWS/GCP/
Azure icon dependency** (recognizable, but heavier + trademark considerations). Resolved in
the Phase 1 (Cloud) design before implementation.
