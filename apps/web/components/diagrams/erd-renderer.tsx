"use client";

import { useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { Handle, Position, BackgroundVariant, type Node, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { KeyRound, Link2 } from "lucide-react";
import { parseGraph, serializeGraph, makeChangeHandlers, autoLayoutGraph, type GraphData } from "@/lib/diagrams/xyflow-base";

const ReactFlowProvider = dynamic(async () => (await import("@xyflow/react")).ReactFlowProvider, { ssr: false });
const ReactFlow = dynamic(async () => (await import("@xyflow/react")).ReactFlow, {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-slate-400">Loading schema…</div>,
});
const Background = dynamic(async () => (await import("@xyflow/react")).Background, { ssr: false });
const Controls = dynamic(async () => (await import("@xyflow/react")).Controls, { ssr: false });
const MiniMap = dynamic(async () => (await import("@xyflow/react")).MiniMap, { ssr: false });

type Column = { name: string; type?: string; key?: "PK" | "FK" | "UK" };
type TableNodeData = { label: string; columns?: Column[] };

function KeyBadge({ k }: { k?: Column["key"] }) {
  if (k === "PK") return <KeyRound className="h-3 w-3 text-indigo-500" aria-label="Primary key" />;
  if (k === "FK") return <Link2 className="h-3 w-3 text-slate-400" aria-label="Foreign key" />;
  if (k === "UK") return <span className="text-[9px] font-bold text-amber-500" aria-label="Unique key">UK</span>;
  return <span className="inline-block h-3 w-3" />;
}

function TableNode({ data }: { data: TableNodeData }) {
  const columns = data.columns ?? [];
  return (
    <div className="min-w-[180px] overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-md transition-all hover:shadow-lg">
      <Handle id="t" type="target" position={Position.Top} className="bg-cyan-400!" />
      <Handle id="l" type="target" position={Position.Left} className="bg-cyan-400!" />
      <div className="bg-cyan-600 px-3 py-1.5 text-center text-[13px] font-bold tracking-wide text-white">{data.label}</div>
      <div className="divide-y divide-slate-100">
        {columns.map((c, i) => (
          <div key={`${c.name}-${i}`} className="flex items-center gap-2 px-3 py-1 text-[11px]">
            <KeyBadge k={c.key} />
            <span className={`flex-1 ${c.key === "PK" ? "font-semibold text-slate-800" : "text-slate-700"}`}>{c.name}</span>
            {c.type && <span className="font-mono text-[10px] text-slate-400">{c.type}</span>}
          </div>
        ))}
      </div>
      <Handle id="b" type="source" position={Position.Bottom} className="bg-cyan-400!" />
      <Handle id="r" type="source" position={Position.Right} className="bg-cyan-400!" />
    </div>
  );
}

const nodeTypes = { table: TableNode };

type Props = { source: string; onChange?: (source: string) => void; readOnly?: boolean };

function ErdInner({ source, onChange, readOnly = false }: Props) {
  const data: GraphData = useMemo(() => {
    const g = parseGraph(source);
    return {
      nodes: g.nodes.map((n) => ({ ...n, type: "table" })),
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

export function ErdRenderer({ source, onChange, readOnly = false }: Props) {
  return (
    <ReactFlowProvider>
      <ErdInner source={source} onChange={onChange} readOnly={readOnly} />
    </ReactFlowProvider>
  );
}

export function autoLayoutErd(source: string): Promise<string> {
  return autoLayoutGraph(source, { rankdir: "LR", nodeWidth: 200, nodeHeight: 140, nodesep: 60, ranksep: 160 });
}
