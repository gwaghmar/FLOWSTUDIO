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
      <Handle id="t" type="target" position={Position.Top} className="bg-slate-300!" />
      <Handle id="l" type="target" position={Position.Left} className="bg-slate-300!" />
      <span style={{ color }} className="flex h-7 w-7 items-center justify-center">{glyph}</span>
      <div className="text-center text-[12px] font-semibold text-slate-800">{data.label}</div>
      <Handle id="b" type="source" position={Position.Bottom} className="bg-slate-300!" />
      <Handle id="r" type="source" position={Position.Right} className="bg-slate-300!" />
    </div>
  );
}

const nodeTypes = { icon: IconNode };

type Props = { source: string; onChange?: (source: string) => void; readOnly?: boolean };

function CloudInner({ source, onChange, readOnly = false }: Props) {
  const data: GraphData = useMemo(() => {
    const g = parseGraph(source);
    return {
      nodes: g.nodes.map((n) => ({ ...n, type: "icon" })),
      edges: g.edges.map((e) => ({ ...e, sourceHandle: e.sourceHandle ?? "r", targetHandle: e.targetHandle ?? "l" })),
    };
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

  const { onNodesChange, onEdgesChange, onConnect } = useMemo(
    () => makeChangeHandlers({
      data,
      push,
      edgeId: () => `e${++edgeCounter.current}-${data.nodes.length}`,
    }),
    [data, push]
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
