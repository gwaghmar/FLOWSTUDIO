# Cloud / Architecture Diagrams — Phase 1 Design

> First new diagram type. Adds a `cloud` type: an interactive canvas of provider/service
> icon nodes (AWS/GCP/Azure/generic) with connections. Also builds the shared
> `xyflow-base` that ERD / Org chart / Mind map (Phases 2-4) reuse.
>
> Parent: `2026-06-10-new-diagram-types-ROADMAP.md`.

## Goals

1. New selectable diagram type `cloud` that renders an interactive xyflow canvas of
   service-icon nodes connected by edges.
2. AI generates valid `cloud` source from architecture/infra prompts.
3. Drag-to-edit on canvas + source-panel JSON edit, both write back to `source`.
4. Hybrid icon set: original trademark-safe glyphs now, structured so an official icon
   pack can be dropped in later.
5. Full vertical: share, embed, OG, picker, highlight, MCP.

## Non-goals (v1)

- Container/group nodes (VPC/region boxes) — deferred to v1.1.
- Refactoring `reactflow-renderer.tsx` onto `xyflow-base` — it works; leave it to avoid
  regression. The base is *new* code consumed by `cloud-renderer` first.
- Official trademarked icon assets — structure supports them; not shipped now.

## Source format: `cloud-json`

Reuses the reactflow `{nodes, edges}` shape, with `provider`/`service` on node data:

```json
{
  "nodes": [
    { "id": "cdn", "data": { "label": "CloudFront", "provider": "aws", "service": "cdn" } },
    { "id": "api", "data": { "label": "API Gateway", "provider": "aws", "service": "api-gateway" } },
    { "id": "fn",  "data": { "label": "Handler", "provider": "aws", "service": "function" } },
    { "id": "db",  "data": { "label": "Orders", "provider": "aws", "service": "nosql-db" } }
  ],
  "edges": [
    { "id": "e1", "source": "cdn", "target": "api" },
    { "id": "e2", "source": "api", "target": "fn" },
    { "id": "e3", "source": "fn",  "target": "db", "label": "put" }
  ]
}
```

- `position` optional — renderer falls back to a staircase (like reactflow); auto-layout
  available via the Wand2 button.
- `service` must be a key in the icon registry; unknown services fall back to a generic
  "box" glyph (never crash).
- `provider` drives color theming; `label` is the user-facing caption.

## New shared module: `lib/diagrams/xyflow-base.ts`

Extracted scaffolding (generalized from `reactflow-renderer.tsx`), consumed by
`cloud-renderer` and later Group A renderers:

- `parseGraph(source): { nodes, edges }` — safe JSON parse, position fallback, returns
  empty graph on error.
- `serializeGraph(nodes, edges): string` — stable JSON.
- `makeChangeHandlers({ data, readOnly, onChange })` — returns `onNodesChange`,
  `onEdgesChange`, `onConnect` using `applyNodeChanges` / `applyEdgeChanges` (dynamic
  import, same as today).
- `autoLayoutGraph(source, opts?)` — generalized `autoLayoutReactFlow`; `opts` =
  `{ rankdir = "LR", nodeWidth = 160, nodeHeight = 60, nodesep = 80, ranksep = 120 }`.
  Try/catch returns original source.

## New module: `lib/diagrams/cloud-icons.tsx`

```ts
export type CloudProvider = "aws" | "gcp" | "azure" | "generic";
export type CloudIcon = { id: string; label: string; category: string; glyph: ReactNode };

export const PROVIDER_COLORS: Record<CloudProvider, string> = {
  aws: "#FF9900", gcp: "#4285F4", azure: "#0078D4", generic: "#6366f1",
};

export const CLOUD_ICONS: Record<string, CloudIcon> = { /* ~30-40 entries */ };

export function resolveIcon(service: string): CloudIcon;   // falls back to "box"
```

**Icon registry (~36 originals)** — simplified, monochrome SVG glyphs tinted per provider,
keyed by category-token (provider-neutral so one glyph serves all providers):

- compute: `compute`, `function`, `container`, `kubernetes`, `vm`, `worker`
- storage: `object-storage`, `block-storage`, `file-storage`, `backup`
- database: `sql-db`, `nosql-db`, `cache`, `data-warehouse`, `search`
- network: `cdn`, `load-balancer`, `api-gateway`, `dns`, `vpc`, `firewall`, `vpn`
- messaging: `queue`, `pubsub`, `event-bus`, `stream`
- security: `auth`, `secrets`, `iam`, `waf`
- ops: `monitoring`, `logging`, `ci-cd`
- clients: `user`, `browser`, `mobile`, `iot`, `internet`

**Hybrid / pluggability:** `resolveIcon` is the single lookup point. A future official pack
is added by merging into `CLOUD_ICONS` (or an override map checked first in `resolveIcon`).
Documented inline as the extension point. No official assets ship in v1.

## New renderer: `components/diagrams/cloud-renderer.tsx`

Mirror of `reactflow-renderer` structure, using `xyflow-base` + an `IconNode`:

- `IconNode({ data })` — rounded white card: provider-tinted glyph (via `resolveIcon` +
  `PROVIDER_COLORS[data.provider]`), bold service/`label` caption, handles on top+bottom
  (and left+right for freer arch wiring). Active-state styling mirrors `CustomNode`.
- `nodeTypes = { icon: IconNode }`; parse forces `type: "icon"`.
- Export `ReadOnly`-capable `CloudRenderer({ source, onChange, readOnly })`.
- Export `autoLayoutCloud(source)` = `autoLayoutGraph(source, { rankdir: "LR" })`.
- Export `exportCloudToPng?` — deferred; OG uses client capture like others.

## Editor wiring (`components/editor-client.tsx`)

- Dynamic import `CloudRenderer`.
- Canvas render branch `diagramType === "cloud"` (drag-edit, onChange → setSource).
- Type-picker entry (driven by `DIAGRAM_TYPE_META`, so mostly free).
- `handleAutoLayout`: add a `cloud` branch (calls `autoLayoutCloud`). Note: polish #5
  (paused) also edits this function for bpmn/excalidraw; whichever lands first, the other
  reconciles by adding its branch — no conflict in intent.

## AI generate route (`app/api/ai/generate/route.ts`)

- Add `"cloud"` to `VALID_DIAGRAM_TYPES`.
- Intent extraction instruction: "Extract providers (aws/gcp/azure), services, and the
  request/data flow direction. Map each component to a `service` token from the cloud icon
  registry."
- `DIAGRAM_SYSTEM_PROMPTS.cloud`: when-to-pick rules (system design / infrastructure /
  "architecture diagram" / "how X is deployed"), the `cloud-json` schema, the **full list
  of valid `service` tokens**, and a few-shot (serverless AWS web app:
  cdn→api-gateway→function→nosql-db). Instruct: prefer registry tokens; use `generic`
  provider when unspecified.

## Read-only surfaces

- `share-viewer.tsx` + `embed-viewer.tsx`: add `cloud` branch rendering `CloudRenderer`
  with `readOnly`.
- `TYPE_LABELS.cloud = "Cloud Architecture"` in `app/s/[token]/page.tsx`,
  `app/s/[token]/og/route.tsx`, `app/embed/[token]/page.tsx`.
- `lib/source-highlight.tsx`: treat `cloud` as JSON (reuse JSON grammar).
- `components/diagram-icon.tsx`: map `cloud` → lucide `cloud` icon.
- `app/api/mcp/route.ts`: add `cloud` to the exposed type enum.

## Core registry (`packages/core/src/diagram-types.ts`)

- `DiagramType` union: add `| "cloud"`.
- `DiagramTypeMeta.aiOutputFormat` union: add `"cloud-json"`.
- `DIAGRAM_TYPE_META` entry:
  `{ id: "cloud", label: "Cloud Architecture", description: "AWS/GCP/Azure system & infra diagrams with service icons", category: "technical", icon: "cloud", color: "#FF9900", subtypes: ["aws","gcp","azure","multi-cloud"], aiOutputFormat: "cloud-json" }`
- `DIAGRAM_SYSTEM_PROMPTS.cloud` and `DIAGRAM_TYPE_DEFAULTS.cloud` (the serverless AWS
  starter from the schema example).

## Error handling

- `parseGraph` and `resolveIcon` never throw (empty graph / generic glyph fallbacks).
- `autoLayoutGraph` try/catch returns original.
- AI emitting an unknown `service` → generic box glyph, still renders. No extra validation
  layers (trust internal callers, per conventions).

## Testing / verification

- New unit tests (`packages/core` or `apps/web` test dir, matching existing style):
  - `resolveIcon` returns the box fallback for unknown tokens and the right icon for known.
  - `parseGraph` returns an empty graph on malformed JSON and applies position fallback.
  - `autoLayoutGraph` assigns positions to all nodes.
- `pnpm --filter @flowchart/web exec tsc --noEmit` (ignore pre-existing `.test.ts` errors).
- `pnpm --filter @flowchart/web build`.
- `pnpm test:unit` stays green (+ new tests).
- Manual: generate "a serverless web app on AWS" → cloud diagram renders with icons; drag a
  node; edit source; Wand2 auto-layouts; share + embed + OG show it.

## Definition of done

All vertical touchpoints wired; AI generates valid cloud source; canvas + source editing
both work; share/embed/OG handle it; build + tests green; CLAUDE.md "diagram types" section
updated to 8 types. Then proceed to Phase 2 (ERD) reusing `xyflow-base`.
