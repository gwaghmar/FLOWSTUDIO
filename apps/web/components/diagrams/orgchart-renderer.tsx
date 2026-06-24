"use client";

import { useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { Handle, Position, BackgroundVariant, type Node, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { parseGraph, serializeGraph, makeChangeHandlers, autoLayoutGraph, type GraphData, type ManualLayoutOpts } from "@/lib/diagrams/xyflow-base";

const ReactFlowProvider = dynamic(async () => (await import("@xyflow/react")).ReactFlowProvider, { ssr: false });
const ReactFlow = dynamic(async () => (await import("@xyflow/react")).ReactFlow, {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-slate-400">Loading org chart…</div>,
});
const Background = dynamic(async () => (await import("@xyflow/react")).Background, { ssr: false });
const Controls = dynamic(async () => (await import("@xyflow/react")).Controls, { ssr: false });
const MiniMap = dynamic(async () => (await import("@xyflow/react")).MiniMap, { ssr: false });

type PersonNodeData = { label: string; title?: string; color?: string };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function PersonNode({ data }: { data: PersonNodeData }) {
  const accent = data.color ?? "#7c3aed";
  return (
    <div className="flex min-w-[150px] items-center gap-2.5 rounded-xl border-2 border-slate-200 bg-white px-3 py-2 shadow-md transition-all hover:shadow-lg">
      <Handle id="t" type="target" position={Position.Top} className="bg-violet-400!" />
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
        style={{ backgroundColor: accent }}
      >
        {initials(data.label)}
      </span>
      <div className="min-w-0">
        <div className="truncate text-[13px] font-semibold text-slate-800">{data.label}</div>
        {data.title && <div className="truncate text-[11px] text-slate-500">{data.title}</div>}
      </div>
      <Handle id="b" type="source" position={Position.Bottom} className="bg-violet-400!" />
    </div>
  );
}

const nodeTypes = { person: PersonNode };

type Props = { source: string; onChange?: (source: string) => void; readOnly?: boolean };

function OrgChartInner({ source, onChange, readOnly = false }: Props) {
  const data: GraphData = useMemo(() => {
    const g = parseGraph(source);
    return {
      nodes: g.nodes.map((n) => ({ ...n, type: "person" })),
      edges: g.edges.map((e) => ({ ...e, sourceHandle: e.sourceHandle ?? "b", targetHandle: e.targetHandle ?? "t" })),
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

export function OrgChartRenderer({ source, onChange, readOnly = false }: Props) {
  return (
    <ReactFlowProvider>
      <OrgChartInner source={source} onChange={onChange} readOnly={readOnly} />
    </ReactFlowProvider>
  );
}

export function autoLayoutOrgChart(source: string, opts: ManualLayoutOpts = {}): Promise<string> {
  const s = opts.spacingScale ?? 1;
  return autoLayoutGraph(source, { rankdir: opts.rankdir ?? "TB", nodeWidth: 180, nodeHeight: 90, nodesep: Math.round(40 * s), ranksep: Math.round(90 * s) });
}
