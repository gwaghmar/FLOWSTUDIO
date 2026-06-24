"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { Handle, Position, type Node, type Edge, type NodeChange, type EdgeChange, type Connection, BackgroundVariant } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// Dynamically import React Flow to avoid SSR issues
const ReactFlowProvider = dynamic(
  async () => (await import("@xyflow/react")).ReactFlowProvider,
  { ssr: false }
);
const ReactFlow = dynamic(
  async () => (await import("@xyflow/react")).ReactFlow,
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-slate-400">Loading graph…</div> }
);
const Background = dynamic(async () => (await import("@xyflow/react")).Background, { ssr: false });
const Controls = dynamic(async () => (await import("@xyflow/react")).Controls, { ssr: false });
const MiniMap = dynamic(async () => (await import("@xyflow/react")).MiniMap, { ssr: false });

type ReactFlowData = {
  nodes: Node[];
  edges: Edge[];
};

type Props = {
  source: string;
  onChange?: (source: string) => void;
  onNodeClick?: (id: string) => void;
  readOnly?: boolean;
};

// Custom styled node component
function CustomNode({ data }: { data: { label: string; description?: string; color?: string; isActive?: boolean } }) {
  return (
    <div
      style={{ 
        borderColor: data.isActive ? "#fbbf24" : (data.color ?? "#6366f1"), 
        borderWidth: data.isActive ? 3 : 2,
        boxShadow: data.isActive ? "0 0 20px rgba(251, 191, 36, 0.4)" : "none"
      }}
      className={`min-w-[160px] rounded-xl border-2 bg-white px-5 py-3 text-center shadow-md transition-all ${data.isActive ? "scale-105" : "hover:shadow-lg"}`}
    >
      <Handle type="target" position={Position.Top} className="bg-slate-300!" />
      <div className="text-[13px] font-bold text-slate-800">{data.label}</div>
      {data.description && <div className="mt-1 text-[11px] leading-relaxed text-slate-500">{data.description}</div>}
      <Handle type="source" position={Position.Bottom} className="bg-slate-300!" />
    </div>
  );
}

const nodeTypes = {
  custom: CustomNode,
};

function parseSource(source: string): ReactFlowData {
  try {
    const data = JSON.parse(source) as ReactFlowData;
    return {
      nodes: (data.nodes ?? []).map((n, i) => ({
        ...n,
        type: "custom", // Force use of CustomNode
        // React Flow crashes on nodes without a `position`. Fall back to a
        // gentle staircase so AI-generated source missing positions still renders.
        position: n.position ?? { x: 100 + (i % 4) * 220, y: 80 + Math.floor(i / 4) * 140 },
        data: { ...n.data, isActive: (n.data as Record<string, unknown>)?.isActive ?? false },
      })),
      edges: (data.edges ?? []).map((e) => ({
        ...e,
        animated: !!(e as Record<string, unknown>).isActive,
        style: (e as Record<string, unknown>).isActive ? { stroke: "#fbbf24", strokeWidth: 3 } : {},
      })),
    };
  } catch {
    return { nodes: [], edges: [] };
  }
}

function ReactFlowInner({ source, onChange, onNodeClick, readOnly }: Props) {
  const data = useMemo(() => parseSource(source), [source]);
  const lastSource = useRef(source);

  const pushChange = useCallback(
    (nodes: Node[], edges: Edge[]) => {
      if (readOnly) return;
      const newSource = JSON.stringify({ nodes, edges });
      if (newSource !== lastSource.current) {
        lastSource.current = newSource;
        onChange?.(newSource);
      }
    },
    [onChange, readOnly]
  );

  const onNodesChange = useCallback(
    async (changes: NodeChange[]) => {
      const { applyNodeChanges } = await import("@xyflow/react");
      const updated = applyNodeChanges(changes, data.nodes);
      pushChange(updated, data.edges);
    },
    [data, pushChange]
  );

  const onEdgesChange = useCallback(
    async (changes: EdgeChange[]) => {
      const { applyEdgeChanges } = await import("@xyflow/react");
      const updated = applyEdgeChanges(changes, data.edges);
      pushChange(data.nodes, updated);
    },
    [data, pushChange]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        id: `e${connection.source}-${connection.target}-${Date.now()}`,
        source: connection.source,
        target: connection.target,
        type: "smoothstep",
      };
      pushChange(data.nodes, [...data.edges, newEdge]);
    },
    [data, pushChange]
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={data.nodes}
        edges={data.edges}
        nodeTypes={nodeTypes}
        onNodesChange={readOnly ? undefined : onNodesChange}
        onEdgesChange={readOnly ? undefined : onEdgesChange}
        onConnect={readOnly ? undefined : onConnect}
        onNodeClick={(_e, node) => onNodeClick?.(node.id)}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
        fitView
        attributionPosition="bottom-right"
        defaultEdgeOptions={{ type: "smoothstep", animated: false }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#f1f5f9" gap={20} variant={BackgroundVariant.Dots} />
        <Controls />
        <MiniMap 
          nodeColor={(n) => (n.data as { color?: string; isActive?: boolean })?.isActive ? "#fbbf24" : (n.data as { color?: string })?.color ?? "#6366f1"}
          className="bg-white! shadow-lg border border-slate-200 rounded-lg overflow-hidden"
        />
      </ReactFlow>
    </div>
  );
}

export function ReactFlowRenderer({ source, onChange, onNodeClick, readOnly = false }: Props) {
  return (
    <ReactFlowProvider>
      <ReactFlowInner source={source} onChange={onChange} onNodeClick={onNodeClick} readOnly={readOnly} />
    </ReactFlowProvider>
  );
}

export async function autoLayoutReactFlow(
  source: string,
  opts: { rankdir?: "LR" | "TB"; spacingScale?: number } = {},
): Promise<string> {
  try {
    const dagre = (await import("@dagrejs/dagre")).default;
    const data = JSON.parse(source) as ReactFlowData;
    const graph = new dagre.graphlib.Graph();
    graph.setDefaultEdgeLabel(() => ({}));
    const s = opts.spacingScale ?? 1;
    graph.setGraph({ rankdir: opts.rankdir ?? "LR", nodesep: Math.round(80 * s), ranksep: Math.round(120 * s) });
    data.nodes.forEach((n) => graph.setNode(n.id, { width: 160, height: 60 }));
    data.edges.forEach((e) => graph.setEdge(e.source, e.target));
    dagre.layout(graph);
    const laid = data.nodes.map((n) => {
      const pos = graph.node(n.id);
      return { ...n, position: { x: pos.x - 80, y: pos.y - 30 } };
    });
    return JSON.stringify({ nodes: laid, edges: data.edges });
  } catch {
    return source;
  }
}
