# Cloud / Architecture Diagram Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `cloud` diagram type — an interactive xyflow canvas of provider/service icon nodes (AWS/GCP/Azure/generic) — wired through the full vertical (AI generate, editor, share, embed, OG), plus a shared `xyflow-base` reused by later Group A types.

**Architecture:** A new `cloud-renderer.tsx` reuses `@xyflow/react` via a new pure-helper module `lib/diagrams/xyflow-base.ts` (parse / serialize / dagre auto-layout / change-handler factory). Icons are split into pure data (`lib/diagrams/cloud-icons.ts`, unit-tested) and JSX glyphs (`lib/diagrams/cloud-glyphs.tsx`). Source format `cloud-json` reuses the reactflow `{nodes,edges}` shape plus `provider`/`service` on node data. Most `Record<DiagramType,…>` maps make TypeScript enforce completeness.

**Tech Stack:** Next.js 16, React, TypeScript, `@xyflow/react`, `@dagrejs/dagre`, lucide-react. Tests: `node --test --experimental-strip-types`.

**Spec:** `docs/superpowers/specs/2026-06-10-cloud-architecture-diagram-design.md`
**Roadmap:** `docs/superpowers/specs/2026-06-10-new-diagram-types-ROADMAP.md`

---

## File structure

**Create:**
- `apps/web/lib/diagrams/xyflow-base.ts` — pure graph helpers + change-handler factory.
- `apps/web/lib/diagrams/xyflow-base.test.ts` — unit tests for the pure helpers.
- `apps/web/lib/diagrams/cloud-icons.ts` — provider colors, token→glyph-id alias map, `resolveIconId`.
- `apps/web/lib/diagrams/cloud-icons.test.ts` — unit tests for `resolveIconId`.
- `apps/web/lib/diagrams/cloud-glyphs.tsx` — JSX glyph map keyed by glyph id.
- `apps/web/components/diagrams/cloud-renderer.tsx` — `IconNode`, `CloudRenderer`, `autoLayoutCloud`.

**Modify:**
- `packages/core/src/diagram-types.ts` — union, `aiOutputFormat`, `DIAGRAM_TYPE_META`, `DIAGRAM_SYSTEM_PROMPTS`, `DIAGRAM_TYPE_DEFAULTS`.
- `apps/web/components/editor-client.tsx` — dynamic import, render branch, `handleAutoLayout`, `QUICK_PROMPTS`.
- `apps/web/app/api/ai/generate/route.ts` — `VALID_DIAGRAM_TYPES`, `typeHints`, suggestion rule.
- `apps/web/components/share-viewer.tsx` + `apps/web/components/embed-viewer.tsx` — label + render branch.
- `apps/web/app/s/[token]/page.tsx`, `apps/web/app/s/[token]/og/route.tsx`, `apps/web/app/embed/[token]/page.tsx` — `TYPE_LABELS`.
- `apps/web/components/diagram-icon.tsx` — `iconMap`.
- `package.json` (root) — add new test files to `test:unit`.
- `CLAUDE.md` — diagram-types section 7 → 8.

**No change needed** (verified): `app/api/mcp/route.ts` (reads `DIAGRAM_TYPE_META` dynamically) and `lib/source-highlight.tsx` (defaults to JSON highlighting for non-mermaid/non-bpmn).

---

## Task 1: Core registry — register the `cloud` type

**Files:**
- Modify: `packages/core/src/diagram-types.ts` (union line 3-10; `aiOutputFormat` line 27; `DIAGRAM_TYPE_META` after line 97; `DIAGRAM_SYSTEM_PROMPTS` before its closing `};`; `DIAGRAM_TYPE_DEFAULTS` before its closing `};`)

`DIAGRAM_SYSTEM_PROMPTS` and `DIAGRAM_TYPE_DEFAULTS` are `Record<DiagramType,…>`, so the package will not compile until all four edits are present. Do them together.

- [ ] **Step 1: Add `cloud` to the `DiagramType` union**

In the union (line 3-10), add after the `bpmn` line:
```ts
  | "bpmn"           // Business Process Model and Notation
  | "cloud";         // Cloud / architecture diagrams with provider service icons
```
(Move the `;` from the `bpmn` line to the new `cloud` line.)

- [ ] **Step 2: Extend the `aiOutputFormat` union (line 27)**

```ts
  aiOutputFormat: "mermaid" | "excalidraw-json" | "reactflow-json" | "echarts-json" | "nivo-json" | "tldraw-json" | "bpmn-xml" | "cloud-json";
```

- [ ] **Step 3: Add the `DIAGRAM_TYPE_META` entry**

Insert as the last element of the `DIAGRAM_TYPE_META` array (after the `bpmn` entry, before the closing `];` at line 98):
```ts
  {
    id: "cloud",
    label: "Cloud Architecture",
    description: "AWS / GCP / Azure system & infrastructure diagrams with service icons",
    category: "technical",
    icon: "cloud",
    color: "#FF9900",
    subtypes: ["aws", "gcp", "azure", "multi-cloud"],
    aiOutputFormat: "cloud-json",
  },
```

- [ ] **Step 4: Add the `DIAGRAM_SYSTEM_PROMPTS.cloud` entry**

Insert before the closing `};` of `DIAGRAM_SYSTEM_PROMPTS`:
```ts
  cloud: `You output ONLY valid JSON for a cloud / architecture diagram. No explanation, no markdown, no code fences.

Schema:
{
  "nodes": [
    { "id": "string", "data": { "label": "string", "provider": "aws|gcp|azure|generic", "service": "string" } }
  ],
  "edges": [
    { "id": "string", "source": "nodeId", "target": "nodeId", "label": "string (optional)" }
  ]
}

RULES:
- "service" MUST be one of these tokens (pick the closest): compute, function, container, storage, database, cache, cdn, load-balancer, api-gateway, queue, dns, firewall, auth, monitoring, user, browser, mobile, internet. Provider-specific names also work (ec2, lambda, s3, rds, dynamodb, cloudfront, alb, sqs, sns, route53, cognito, cloudwatch, gke, bigquery, pubsub, blob, cosmos, azure-functions, etc.) — they map to the right icon.
- "provider" is aws, gcp, azure, or generic. Use "generic" when no cloud is specified.
- "label" is the human caption (e.g. "Orders API", "User Table").
- Model the REQUEST / DATA FLOW with edges, left-to-right: clients → edge/CDN → gateway/LB → compute → data stores. Add edge "label" for protocols or actions when useful (https, put, read).
- 4-12 nodes for a typical prompt. Omit "position" — layout is automatic.

WHEN TO USE cloud: system design, infrastructure, deployment topology, "architecture diagram", "how X is hosted/deployed", cloud stack diagrams.

Example — "a serverless web app on AWS":
{"nodes":[{"id":"cdn","data":{"label":"CloudFront","provider":"aws","service":"cdn"}},{"id":"api","data":{"label":"API Gateway","provider":"aws","service":"api-gateway"}},{"id":"fn","data":{"label":"Handler","provider":"aws","service":"function"}},{"id":"db","data":{"label":"Orders","provider":"aws","service":"nosql-db"}}],"edges":[{"id":"e1","source":"cdn","target":"api"},{"id":"e2","source":"api","target":"fn"},{"id":"e3","source":"fn","target":"db","label":"put"}]}`,
```

- [ ] **Step 5: Add the `DIAGRAM_TYPE_DEFAULTS.cloud` entry**

Insert before the closing `};` of `DIAGRAM_TYPE_DEFAULTS`:
```ts
  cloud: JSON.stringify({
    nodes: [
      { id: "cdn", data: { label: "CloudFront", provider: "aws", service: "cdn" } },
      { id: "api", data: { label: "API Gateway", provider: "aws", service: "api-gateway" } },
      { id: "fn", data: { label: "Handler", provider: "aws", service: "function" } },
      { id: "db", data: { label: "Orders", provider: "aws", service: "nosql-db" } },
    ],
    edges: [
      { id: "e1", source: "cdn", target: "api" },
      { id: "e2", source: "api", target: "fn" },
      { id: "e3", source: "fn", target: "db", label: "put" },
    ],
  }),
```

- [ ] **Step 6: Build the core package to verify it compiles**

Run: `pnpm --filter @flowchart/core build`
Expected: builds with no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/diagram-types.ts
git commit -m "feat(core): register cloud diagram type (meta, prompt, default)"
```

---

## Task 2: Shared `xyflow-base` helpers (TDD)

**Files:**
- Create: `apps/web/lib/diagrams/xyflow-base.ts`
- Test: `apps/web/lib/diagrams/xyflow-base.test.ts`
- Modify: `package.json` (root) `test:unit` script

Top-level imports must be **type-only** (`import type`) so the module loads under `node --test` without pulling `@xyflow/react` runtime/CSS. Runtime xyflow helpers are dynamically imported inside the factory.

- [ ] **Step 1: Write the failing tests**

Create `apps/web/lib/diagrams/xyflow-base.test.ts`:
```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseGraph, serializeGraph, autoLayoutGraph } from "./xyflow-base.ts";

describe("parseGraph", () => {
  it("returns an empty graph on malformed JSON", () => {
    const g = parseGraph("not json");
    assert.deepEqual(g, { nodes: [], edges: [] });
  });
  it("fills a fallback position for nodes missing one", () => {
    const g = parseGraph(JSON.stringify({ nodes: [{ id: "a", data: {} }], edges: [] }));
    assert.equal(typeof g.nodes[0].position.x, "number");
    assert.equal(typeof g.nodes[0].position.y, "number");
  });
  it("preserves an existing position", () => {
    const g = parseGraph(JSON.stringify({ nodes: [{ id: "a", position: { x: 5, y: 7 }, data: {} }], edges: [] }));
    assert.deepEqual(g.nodes[0].position, { x: 5, y: 7 });
  });
});

describe("serializeGraph", () => {
  it("round-trips nodes and edges", () => {
    const nodes = [{ id: "a", position: { x: 0, y: 0 }, data: { label: "A" } }];
    const edges = [{ id: "e", source: "a", target: "a" }];
    const json = serializeGraph(nodes as never, edges as never);
    assert.deepEqual(JSON.parse(json), { nodes, edges });
  });
});

describe("autoLayoutGraph", () => {
  it("assigns numeric positions to every node", async () => {
    const src = JSON.stringify({
      nodes: [{ id: "a", data: {} }, { id: "b", data: {} }],
      edges: [{ id: "e", source: "a", target: "b" }],
    });
    const out = await autoLayoutGraph(src);
    const parsed = JSON.parse(out);
    for (const n of parsed.nodes) {
      assert.equal(typeof n.position.x, "number");
      assert.equal(typeof n.position.y, "number");
    }
  });
  it("returns the original source on malformed JSON", async () => {
    assert.equal(await autoLayoutGraph("nope"), "nope");
  });
});
```

- [ ] **Step 2: Add the test file to the `test:unit` script and run it (expect failure)**

In root `package.json`, append the new file to `test:unit`:
```json
"test:unit": "node --test --experimental-strip-types apps/web/lib/auth-mode.test.ts apps/web/lib/deployment-readiness.test.ts apps/web/lib/db/mode.test.ts apps/web/lib/profile.test.ts apps/web/lib/diagrams/xyflow-base.test.ts",
```
Run: `pnpm test:unit`
Expected: FAIL — cannot resolve `./xyflow-base.ts`.

- [ ] **Step 3: Implement `xyflow-base.ts`**

Create `apps/web/lib/diagrams/xyflow-base.ts`:
```ts
import type { Node, Edge, NodeChange, EdgeChange, Connection } from "@xyflow/react";

export type GraphData = { nodes: Node[]; edges: Edge[] };

export function parseGraph(source: string): GraphData {
  try {
    const data = JSON.parse(source) as GraphData;
    return {
      nodes: (data.nodes ?? []).map((n, i) => ({
        ...n,
        position: n.position ?? { x: 100 + (i % 4) * 220, y: 80 + Math.floor(i / 4) * 140 },
      })),
      edges: data.edges ?? [],
    };
  } catch {
    return { nodes: [], edges: [] };
  }
}

export function serializeGraph(nodes: Node[], edges: Edge[]): string {
  return JSON.stringify({ nodes, edges });
}

export type LayoutOpts = {
  rankdir?: "LR" | "TB";
  nodeWidth?: number;
  nodeHeight?: number;
  nodesep?: number;
  ranksep?: number;
};

export async function autoLayoutGraph(source: string, opts: LayoutOpts = {}): Promise<string> {
  const { rankdir = "LR", nodeWidth = 160, nodeHeight = 60, nodesep = 80, ranksep = 120 } = opts;
  try {
    const dagre = (await import("@dagrejs/dagre")).default;
    const data = JSON.parse(source) as GraphData;
    const graph = new dagre.graphlib.Graph();
    graph.setDefaultEdgeLabel(() => ({}));
    graph.setGraph({ rankdir, nodesep, ranksep });
    data.nodes.forEach((n) => graph.setNode(n.id, { width: nodeWidth, height: nodeHeight }));
    data.edges.forEach((e) => graph.setEdge(e.source, e.target));
    dagre.layout(graph);
    const laid = data.nodes.map((n) => {
      const pos = graph.node(n.id);
      return { ...n, position: { x: pos.x - nodeWidth / 2, y: pos.y - nodeHeight / 2 } };
    });
    return JSON.stringify({ nodes: laid, edges: data.edges });
  } catch {
    return source;
  }
}

export type ChangeHandlers = {
  onNodesChange: (changes: NodeChange[]) => Promise<void>;
  onEdgesChange: (changes: EdgeChange[]) => Promise<void>;
  onConnect: (connection: Connection) => void;
};

export function makeChangeHandlers(args: {
  data: GraphData;
  readOnly: boolean;
  push: (nodes: Node[], edges: Edge[]) => void;
  edgeId: () => string;
}): ChangeHandlers {
  const { data, push, edgeId } = args;
  return {
    onNodesChange: async (changes) => {
      const { applyNodeChanges } = await import("@xyflow/react");
      push(applyNodeChanges(changes, data.nodes), data.edges);
    },
    onEdgesChange: async (changes) => {
      const { applyEdgeChanges } = await import("@xyflow/react");
      push(data.nodes, applyEdgeChanges(changes, data.edges));
    },
    onConnect: (connection) => {
      const newEdge: Edge = {
        id: edgeId(),
        source: connection.source as string,
        target: connection.target as string,
        type: "smoothstep",
      };
      push(data.nodes, [...data.edges, newEdge]);
    },
  };
}
```

- [ ] **Step 4: Run the tests (expect pass)**

Run: `pnpm test:unit`
Expected: PASS — all `xyflow-base` tests green, existing tests still green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/diagrams/xyflow-base.ts apps/web/lib/diagrams/xyflow-base.test.ts package.json
git commit -m "feat(diagrams): add shared xyflow-base graph helpers"
```

---

## Task 3: Cloud icon data + resolver (TDD)

**Files:**
- Create: `apps/web/lib/diagrams/cloud-icons.ts`
- Test: `apps/web/lib/diagrams/cloud-icons.test.ts`
- Modify: `package.json` (root) `test:unit` script

- [ ] **Step 1: Write the failing tests**

Create `apps/web/lib/diagrams/cloud-icons.test.ts`:
```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveIconId, PROVIDER_COLORS } from "./cloud-icons.ts";

describe("resolveIconId", () => {
  it("maps a base token to itself", () => {
    assert.equal(resolveIconId("database"), "database");
  });
  it("maps a provider-specific alias to its base glyph", () => {
    assert.equal(resolveIconId("lambda"), "function");
    assert.equal(resolveIconId("s3"), "storage");
    assert.equal(resolveIconId("dynamodb"), "database");
  });
  it("is case-insensitive", () => {
    assert.equal(resolveIconId("Lambda"), "function");
  });
  it("falls back to box for unknown tokens", () => {
    assert.equal(resolveIconId("totally-unknown"), "box");
  });
});

describe("PROVIDER_COLORS", () => {
  it("has a color for every provider", () => {
    for (const p of ["aws", "gcp", "azure", "generic"] as const) {
      assert.match(PROVIDER_COLORS[p], /^#[0-9a-fA-F]{6}$/);
    }
  });
});
```

- [ ] **Step 2: Add to `test:unit` and run (expect failure)**

In root `package.json`, append `apps/web/lib/diagrams/cloud-icons.test.ts` to the `test:unit` command (space-separated, before the closing quote).
Run: `pnpm test:unit`
Expected: FAIL — cannot resolve `./cloud-icons.ts`.

- [ ] **Step 3: Implement `cloud-icons.ts`**

Create `apps/web/lib/diagrams/cloud-icons.ts`:
```ts
export type CloudProvider = "aws" | "gcp" | "azure" | "generic";

export const PROVIDER_COLORS: Record<CloudProvider, string> = {
  aws: "#FF9900",
  gcp: "#4285F4",
  azure: "#0078D4",
  generic: "#6366f1",
};

export const GLYPH_IDS = [
  "compute", "function", "container", "storage", "database", "cache", "cdn",
  "load-balancer", "api-gateway", "queue", "dns", "firewall", "auth",
  "monitoring", "user", "browser", "mobile", "internet", "box",
] as const;
export type GlyphId = (typeof GLYPH_IDS)[number];

// token (lowercased) -> base glyph id. Extension point for an official icon pack:
// merge additional aliases here, or check an override map first in resolveIconId.
const ALIASES: Record<string, GlyphId> = {
  // compute
  ec2: "compute", vm: "compute", compute: "compute", server: "compute", instance: "compute",
  "compute-engine": "compute", droplet: "compute",
  // function / serverless
  lambda: "function", function: "function", faas: "function", "cloud-functions": "function",
  "azure-functions": "function", "cloud-run": "function", worker: "function",
  // container / orchestration
  container: "container", docker: "container", ecs: "container", fargate: "container",
  kubernetes: "container", k8s: "container", gke: "container", aks: "container", eks: "container",
  // storage (object/block/file)
  s3: "storage", gcs: "storage", blob: "storage", storage: "storage", "object-storage": "storage",
  "block-storage": "storage", "file-storage": "storage", ebs: "storage", bucket: "storage",
  // databases (incl. warehouse/search)
  rds: "database", database: "database", db: "database", "sql-db": "database", "nosql-db": "database",
  dynamodb: "database", firestore: "database", cosmos: "database", postgres: "database",
  mysql: "database", mongodb: "database", "data-warehouse": "database", bigquery: "database",
  redshift: "database", snowflake: "database", search: "database", elasticsearch: "database",
  // cache
  cache: "cache", redis: "cache", elasticache: "cache", memcached: "cache",
  // cdn / edge
  cdn: "cdn", cloudfront: "cdn", cloudflare: "cdn", "edge": "cdn",
  // load balancer
  "load-balancer": "load-balancer", lb: "load-balancer", alb: "load-balancer", elb: "load-balancer",
  nlb: "load-balancer",
  // api gateway
  "api-gateway": "api-gateway", apigw: "api-gateway", api: "api-gateway", gateway: "api-gateway",
  // messaging / streaming
  queue: "queue", sqs: "queue", sns: "queue", pubsub: "queue", "event-bus": "queue",
  eventbridge: "queue", kafka: "queue", stream: "queue", kinesis: "queue",
  // dns
  dns: "dns", route53: "dns",
  // firewall / security
  firewall: "firewall", waf: "firewall", "security-group": "firewall",
  // auth / identity
  auth: "auth", cognito: "auth", iam: "auth", identity: "auth", oauth: "auth",
  // monitoring / logging
  monitoring: "monitoring", cloudwatch: "monitoring", logging: "monitoring", grafana: "monitoring",
  metrics: "monitoring",
  // clients
  user: "user", users: "user", client: "user",
  browser: "browser", web: "browser", frontend: "browser",
  mobile: "mobile", app: "mobile", ios: "mobile", android: "mobile",
  internet: "internet", external: "internet", public: "internet",
};

export function resolveIconId(service: string | undefined): GlyphId {
  if (!service) return "box";
  return ALIASES[service.toLowerCase()] ?? "box";
}
```

- [ ] **Step 4: Run the tests (expect pass)**

Run: `pnpm test:unit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/diagrams/cloud-icons.ts apps/web/lib/diagrams/cloud-icons.test.ts package.json
git commit -m "feat(diagrams): add cloud icon registry + resolver"
```

---

## Task 4: Cloud glyph SVGs

**Files:**
- Create: `apps/web/lib/diagrams/cloud-glyphs.tsx`

Glyphs are simple monochrome SVGs using `currentColor` so the node can tint them per provider. Not unit-tested (JSX) — verified by `tsc`.

- [ ] **Step 1: Implement `cloud-glyphs.tsx`**

Create `apps/web/lib/diagrams/cloud-glyphs.tsx`:
```tsx
import type { ReactNode } from "react";
import type { GlyphId } from "./cloud-icons";

const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;
function Svg({ children }: { children: ReactNode }) {
  return <svg viewBox="0 0 24 24" width="22" height="22" {...s}>{children}</svg>;
}

export const GLYPHS: Record<GlyphId, ReactNode> = {
  compute: <Svg><rect x="4" y="6" width="16" height="12" rx="2" /><path d="M9 10h6M9 14h6" /></Svg>,
  function: <Svg><path d="M14 4h-2a3 3 0 0 0-3 3v3H6m3 0v4a3 3 0 0 1-3 3" /><path d="M9 12h6" /></Svg>,
  container: <Svg><rect x="3" y="9" width="4" height="4" /><rect x="8" y="9" width="4" height="4" /><rect x="13" y="9" width="4" height="4" /><path d="M3 16h16" /></Svg>,
  storage: <Svg><path d="M4 7c0 1.7 3.6 3 8 3s8-1.3 8-3-3.6-3-8-3-8 1.3-8 3Z" /><path d="M4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7" /></Svg>,
  database: <Svg><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6" /><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" /></Svg>,
  cache: <Svg><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 5v14M16 5v14M4 12h16" /></Svg>,
  cdn: <Svg><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4c2.5 2.3 2.5 13.7 0 16M12 4c-2.5 2.3-2.5 13.7 0 16" /></Svg>,
  "load-balancer": <Svg><circle cx="12" cy="5" r="2" /><circle cx="6" cy="19" r="2" /><circle cx="12" cy="19" r="2" /><circle cx="18" cy="19" r="2" /><path d="M12 7v4M12 11H6v6M12 11h6v6M12 11v6" /></Svg>,
  "api-gateway": <Svg><path d="M7 4v16M17 4v16" /><path d="M7 8h10M7 16h10" /><circle cx="12" cy="12" r="1.5" /></Svg>,
  queue: <Svg><rect x="3" y="8" width="4" height="8" /><rect x="9" y="8" width="4" height="8" /><rect x="15" y="8" width="4" height="8" /><path d="M19 12h2M1 12h2" /></Svg>,
  dns: <Svg><circle cx="12" cy="12" r="8" /><path d="M12 4v16M4 9h16M4 15h16" /></Svg>,
  firewall: <Svg><rect x="4" y="5" width="16" height="14" rx="1" /><path d="M4 9.7h16M4 14.3h16M9 5v4.7M15 9.7v4.6M9 14.3V19" /></Svg>,
  auth: <Svg><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /><circle cx="12" cy="15.5" r="1.3" /></Svg>,
  monitoring: <Svg><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M6 12l3-3 2 2 3-4 4 5" /><path d="M9 20h6" /></Svg>,
  user: <Svg><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" /></Svg>,
  browser: <Svg><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 8h18M7 6h.01M10 6h.01" /></Svg>,
  mobile: <Svg><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M11 18h2" /></Svg>,
  internet: <Svg><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4c3 3 3 13 0 16-3-3-3-13 0-16" /></Svg>,
  box: <Svg><rect x="5" y="5" width="14" height="14" rx="2" /></Svg>,
};
```

- [ ] **Step 2: Typecheck the web app**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: only the pre-existing `.test.ts` `TS5097` errors (6 of them); no errors in `cloud-glyphs.tsx`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/diagrams/cloud-glyphs.tsx
git commit -m "feat(diagrams): add cloud service glyph SVGs"
```

---

## Task 5: Cloud renderer

**Files:**
- Create: `apps/web/components/diagrams/cloud-renderer.tsx`

Mirrors `reactflow-renderer.tsx`, using `xyflow-base` + `IconNode`.

- [ ] **Step 1: Implement `cloud-renderer.tsx`**

Create `apps/web/components/diagrams/cloud-renderer.tsx`:
```tsx
"use client";

import { useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { Handle, Position, BackgroundVariant, type Node, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { parseGraph, serializeGraph, makeChangeHandlers, autoLayoutGraph, type GraphData } from "@/lib/diagrams/xyflow-base";
import { resolveIconId, PROVIDER_COLORS, type CloudProvider } from "@/lib/diagrams/cloud-icons";
import { GLYPHS } from "@/lib/diagrams/cloud-glyphs";

const ReactFlowProvider = dynamic(async () => (await import("@xyflow/react")).ReactFlowProvider, { ssr: false });
const ReactFlow = dynamic(async () => (await import("@xyflow/react")).ReactFlow, {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-slate-400">Loading architecture…</div>,
});
const Background = dynamic(async () => (await import("@xyflow/react")).Background, { ssr: false });
const Controls = dynamic(async () => (await import("@xyflow/react")).Controls, { ssr: false });
const MiniMap = dynamic(async () => (await import("@xyflow/react")).MiniMap, { ssr: false });

type IconNodeData = { label: string; provider?: CloudProvider; service?: string };

function IconNode({ data }: { data: IconNodeData }) {
  const color = PROVIDER_COLORS[data.provider ?? "generic"];
  const glyph = GLYPHS[resolveIconId(data.service)];
  return (
    <div className="flex min-w-[120px] flex-col items-center gap-1.5 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 shadow-md transition-all hover:shadow-lg">
      <Handle type="target" position={Position.Top} className="bg-slate-300!" />
      <Handle type="target" position={Position.Left} className="bg-slate-300!" />
      <span style={{ color }} className="flex h-7 w-7 items-center justify-center">{glyph}</span>
      <div className="text-center text-[12px] font-semibold text-slate-800">{data.label}</div>
      <Handle type="source" position={Position.Bottom} className="bg-slate-300!" />
      <Handle type="source" position={Position.Right} className="bg-slate-300!" />
    </div>
  );
}

const nodeTypes = { icon: IconNode };

type Props = { source: string; onChange?: (source: string) => void; readOnly?: boolean };

function CloudInner({ source, onChange, readOnly = false }: Props) {
  const data: GraphData = useMemo(() => {
    const g = parseGraph(source);
    return { ...g, nodes: g.nodes.map((n) => ({ ...n, type: "icon" })) };
  }, [source]);
  const lastSource = useRef(source);
  const edgeCounter = useRef(0);

  const push = useCallback(
    (nodes: Node[], edges: Edge[]) => {
      if (readOnly) return;
      const next = serializeGraph(nodes, edges);
      if (next !== lastSource.current) {
        lastSource.current = next;
        onChange?.(next);
      }
    },
    [onChange, readOnly]
  );

  const { onNodesChange, onEdgesChange, onConnect } = makeChangeHandlers({
    data,
    readOnly,
    push,
    edgeId: () => `e${++edgeCounter.current}-${data.nodes.length}`,
  });

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={data.nodes}
        edges={data.edges}
        nodeTypes={nodeTypes}
        onNodesChange={readOnly ? undefined : onNodesChange}
        onEdgesChange={readOnly ? undefined : onEdgesChange}
        onConnect={readOnly ? undefined : onConnect}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
        fitView
        defaultEdgeOptions={{ type: "smoothstep", animated: false }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#f1f5f9" gap={20} variant={BackgroundVariant.Dots} />
        <Controls />
        <MiniMap className="bg-white! shadow-lg border border-slate-200 rounded-lg overflow-hidden" />
      </ReactFlow>
    </div>
  );
}

export function CloudRenderer({ source, onChange, readOnly = false }: Props) {
  return (
    <ReactFlowProvider>
      <CloudInner source={source} onChange={onChange} readOnly={readOnly} />
    </ReactFlowProvider>
  );
}

export function autoLayoutCloud(source: string): Promise<string> {
  return autoLayoutGraph(source, { rankdir: "LR" });
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: only the pre-existing 6 `.test.ts` errors; nothing in `cloud-renderer.tsx`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/diagrams/cloud-renderer.tsx
git commit -m "feat(diagrams): add cloud architecture renderer"
```

---

## Task 6: Wire the renderer into the editor

**Files:**
- Modify: `apps/web/components/editor-client.tsx` (dynamic imports ~line 80; `handleAutoLayout` line 809-825; `QUICK_PROMPTS` line 1211-1219; render branch after the `reactflow` block ~line 1985)

- [ ] **Step 1: Add the dynamic import**

After the `ReactFlowRenderer` dynamic import (around line 80-83), add:
```tsx
const CloudRenderer = dynamic(
  () => import("./diagrams/cloud-renderer").then((m) => ({ default: m.CloudRenderer })),
  { ssr: false, loading: () => <CanvasLoader label="Architecture" /> }
);
```

- [ ] **Step 2: Extend `handleAutoLayout` to support cloud**

Replace the body of `handleAutoLayout` (line 809-825) with a type-branched version:
```tsx
  const handleAutoLayout = useCallback(async () => {
    try {
      let next = source;
      if (diagramType === "reactflow") {
        next = await (await import("./diagrams/reactflow-renderer")).autoLayoutReactFlow(source);
      } else if (diagramType === "cloud") {
        next = await (await import("./diagrams/cloud-renderer")).autoLayoutCloud(source);
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

- [ ] **Step 3: Show the auto-layout button for cloud**

In the auto-layout button condition (line 1739) change:
```tsx
{diagramType === "reactflow" && (
```
to:
```tsx
{(diagramType === "reactflow" || diagramType === "cloud") && (
```
And update its `title` prop to:
```tsx
title={diagramType === "cloud" ? "Auto-layout the architecture" : "Auto-layout the node graph"}
```

- [ ] **Step 4: Add a `QUICK_PROMPTS` entry**

In `QUICK_PROMPTS` (line 1211-1219), add:
```tsx
  cloud: ["Add a load balancer", "Put it on GCP", "Add a cache layer", "Add a message queue"],
```

- [ ] **Step 5: Add the canvas render branch**

After the `reactflow` render branch (ends ~line 1985, just before the `echarts`/next branch), add:
```tsx
{diagramType === "cloud" && (
  <div
    ref={frameRef}
    className="rounded-xl overflow-hidden shadow-xl bg-white"
    style={{ minHeight: "600px", height: "100%" }}
  >
    <CloudRenderer source={source} onChange={setSource} readOnly={false} />
  </div>
)}
```
(If `frameRef` is already used by the `reactflow` branch and cannot be shared, omit the `ref` — match whatever the `reactflow` branch does; the wrapper styling is what matters.)

- [ ] **Step 6: Build the web app**

Run: `pnpm --filter @flowchart/web build`
Expected: build succeeds; full route table prints; no type errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/editor-client.tsx
git commit -m "feat(editor): wire cloud renderer + auto-layout into editor"
```

---

## Task 7: AI generate route

**Files:**
- Modify: `apps/web/app/api/ai/generate/route.ts` (`VALID_DIAGRAM_TYPES` line 180; `typeHints` line 540-548; suggestion rules line 582-590)

- [ ] **Step 1: Add cloud to `VALID_DIAGRAM_TYPES` (line 180)**

```ts
const VALID_DIAGRAM_TYPES: DiagramType[] = ["mermaid", "excalidraw", "reactflow", "echarts", "nivo", "tldraw", "bpmn", "cloud"];
```

- [ ] **Step 2: Add the cloud `typeHints` entry**

`typeHints` is `Record<DiagramType, string>`, so this is required to compile. Add inside the object (line 540-548):
```ts
  cloud:      "Extract: cloud provider (aws/gcp/azure/generic), the services/components involved, and the request/data flow direction (clients -> edge -> gateway -> compute -> data). Map each component to a service token from the cloud icon registry.",
```

- [ ] **Step 3: Add a suggestion rule**

In the `suggestedDiagramType rules` text block (line 582-590), add a bullet before the DEFAULT line:
```
  - "architecture diagram", "system design", "infrastructure", "cloud diagram", "AWS/GCP/Azure", "how it's deployed", "deployment topology" → "cloud"
```

- [ ] **Step 4: Typecheck**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: only the pre-existing 6 `.test.ts` errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/ai/generate/route.ts
git commit -m "feat(ai): generate cloud architecture diagrams"
```

---

## Task 8: Read-only surfaces (share, embed, OG, icon)

**Files:**
- Modify: `apps/web/components/share-viewer.tsx` (`DIAGRAM_TYPE_LABELS` line 100-108; render branches line 159-183)
- Modify: `apps/web/components/embed-viewer.tsx` (render branches line 102-126; its labels map if present)
- Modify: `apps/web/app/s/[token]/page.tsx` (`TYPE_LABELS` line 9-12)
- Modify: `apps/web/app/s/[token]/og/route.tsx` (`TYPE_LABELS` line 10-18)
- Modify: `apps/web/app/embed/[token]/page.tsx` (`TYPE_LABELS` if present)
- Modify: `apps/web/components/diagram-icon.tsx` (`iconMap` line 17-26)

- [ ] **Step 1: share-viewer — label (required, it's `Record<DiagramType,…>`)**

Add to `DIAGRAM_TYPE_LABELS` (line 100-108):
```ts
  cloud: "Cloud architecture",
```

- [ ] **Step 2: share-viewer — import + render branch**

Add a dynamic import next to the other renderer imports in `share-viewer.tsx`:
```tsx
const CloudRenderer = dynamic(() => import("./diagrams/cloud-renderer").then((m) => m.CloudRenderer), { ssr: false });
```
(Match the existing import style in this file — if it uses `{ default: ... }` mapping, follow that.)
Add a render branch after the `reactflow` branch (around line 167):
```tsx
{diagramType === "cloud" && (
  <div className="h-[600px]">
    <CloudRenderer source={data.source} readOnly onChange={() => {}} />
  </div>
)}
```

- [ ] **Step 3: embed-viewer — import + render branch**

Mirror Step 2 in `embed-viewer.tsx`: add the `CloudRenderer` dynamic import and a `cloud` render branch matching that file's existing reactflow branch structure (around line 102-126). If `embed-viewer.tsx` has its own labels map keyed by `DiagramType`, add `cloud: "Cloud architecture"` to it.

- [ ] **Step 4: TYPE_LABELS in the three page/route files**

`app/s/[token]/page.tsx` (line 9-12) — add `cloud: "Cloud architecture",` to `TYPE_LABELS`.
`app/s/[token]/og/route.tsx` (line 10-18) — add `cloud: "Cloud architecture",`.
`app/embed/[token]/page.tsx` — if it has a `TYPE_LABELS`, add the same entry.

- [ ] **Step 5: diagram-icon — `iconMap` (required, `Record<DiagramType,…>`)**

In `components/diagram-icon.tsx`, import `Cloud` from lucide-react (add to the existing import from `"lucide-react"`), and add to `iconMap` (line 17-26):
```ts
  cloud: Cloud,
```

- [ ] **Step 6: Build the web app**

Run: `pnpm --filter @flowchart/web build`
Expected: build succeeds, no type errors. (A missing `Record<DiagramType,…>` key would have failed here.)

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/share-viewer.tsx apps/web/components/embed-viewer.tsx apps/web/app/s/\[token\]/page.tsx apps/web/app/s/\[token\]/og/route.tsx apps/web/app/embed/\[token\]/page.tsx apps/web/components/diagram-icon.tsx
git commit -m "feat(share): render cloud diagrams in share/embed/OG + picker icon"
```

---

## Task 9: Docs + full verification

**Files:**
- Modify: `CLAUDE.md` (diagram-types table — currently "Diagram types supported (7)")

- [ ] **Step 1: Update CLAUDE.md**

Change the heading "## Diagram types supported (7)" to "(8)" and add a row to the table:
```
| `cloud` | AWS/GCP/Azure system & infra diagrams with service icons | drag-to-edit + source (xyflow) |
```
Also update the renderers sentence to note `cloud-renderer.tsx` and the new `lib/diagrams/` helpers (`xyflow-base.ts`, `cloud-icons.ts`, `cloud-glyphs.tsx`).

- [ ] **Step 2: Full typecheck**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: only the 6 pre-existing `.test.ts` `TS5097` errors.

- [ ] **Step 3: Unit tests**

Run: `pnpm test:unit`
Expected: all green, including the new `xyflow-base` and `cloud-icons` suites.

- [ ] **Step 4: Full build**

Run: `pnpm --filter @flowchart/web build`
Expected: success, full route table.

- [ ] **Step 5: Manual smoke test (document results)**

Run `pnpm --filter @flowchart/web dev`, then:
1. New project → pick "Cloud Architecture" → confirm the default diagram renders 4 icon nodes (CloudFront → API Gateway → Handler → Orders) with edges.
2. Prompt the AI: "a serverless web app on AWS" → confirm a cloud diagram renders with recognizable icons.
3. Drag a node → confirm the source JSON updates.
4. Edit the source JSON (change a `service` token) → confirm the icon updates; an unknown token shows the generic box.
5. Click the Wand2 button → confirm nodes re-layout left-to-right.
6. Share the project → open `/s/[token]` → confirm the cloud diagram renders read-only and the OG card shows "Cloud architecture".
7. Copy the embed → open `/embed/[token]` → confirm it renders.

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add cloud architecture diagram type (8 types)"
```

---

## Self-review notes

- **Spec coverage:** xyflow-base (Task 2), hybrid icon set data+glyphs with pluggable alias map (Tasks 3-4), renderer + IconNode + autoLayoutCloud (Task 5), cloud-json registry/prompt/default (Task 1), editor wiring incl. auto-layout button (Task 6), AI generate + intent (Task 7), share/embed/OG/highlight/icon/MCP (Task 8; highlight & MCP need no change — noted), tests + CLAUDE.md (Tasks 2/3/9). All spec sections mapped.
- **handleAutoLayout overlap with polish #5:** Task 6 rewrites it for reactflow+cloud; when polish #5 resumes it adds bpmn/excalidraw branches to the same switch. No conflict.
- **Deferred (per spec non-goals):** container/group nodes; refactoring reactflow-renderer onto xyflow-base; official trademarked icons (alias map is the drop-in point).
