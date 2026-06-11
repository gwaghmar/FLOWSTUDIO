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
