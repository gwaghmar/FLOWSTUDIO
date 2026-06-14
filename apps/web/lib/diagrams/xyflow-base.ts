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

/** Strict validation for cloud/erd/orgchart JSON (parseGraph is deliberately lenient): one+ node with a string id, edges referencing existing nodes. */
export function validateGraphSource(source: string): { ok: true } | { ok: false; reason: string } {
  let data: unknown;
  try { data = JSON.parse(source); } catch { return { ok: false, reason: "Invalid JSON" }; }
  if (!data || typeof data !== "object") return { ok: false, reason: "Expected an object with a nodes array" };
  const nodes = (data as { nodes?: unknown }).nodes;
  if (!Array.isArray(nodes) || nodes.length === 0) return { ok: false, reason: "Needs at least one node" };
  const ids = new Set<string>();
  for (const n of nodes) {
    const id = (n as { id?: unknown } | null)?.id;
    if (typeof id !== "string" || id.length === 0) return { ok: false, reason: "Every node needs a non-empty string id" };
    ids.add(id);
  }
  const edges = (data as { edges?: unknown }).edges ?? [];
  if (!Array.isArray(edges)) return { ok: false, reason: "edges must be an array" };
  for (const e of edges) {
    const src = (e as { source?: unknown } | null)?.source;
    const tgt = (e as { target?: unknown } | null)?.target;
    if (typeof src !== "string" || typeof tgt !== "string") return { ok: false, reason: "Every edge needs a string source and target" };
    if (!ids.has(src) || !ids.has(tgt)) return { ok: false, reason: `Edge references unknown node: ${src} -> ${tgt}` };
  }
  return { ok: true };
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
        source: connection.source,
        target: connection.target,
        type: "smoothstep",
      };
      push(data.nodes, [...data.edges, newEdge]);
    },
  };
}
