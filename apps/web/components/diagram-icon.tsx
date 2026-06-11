"use client";

import {
  GitFork,
  PencilRuler,
  Network,
  BarChart2,
  AreaChart,
  LayoutTemplate,
  Workflow,
  Cloud,
  type LucideIcon,
} from "lucide-react";
import type { DiagramType } from "@flowchart/core";

/** Render icon by DiagramType id */
export function DiagramTypeIcon({ type, className, size }: { type: DiagramType; className?: string; size?: number }) {
  const iconMap: Record<DiagramType, LucideIcon> = {
    mermaid: GitFork,
    excalidraw: PencilRuler,
    reactflow: Network,
    echarts: BarChart2,
    nivo: AreaChart,
    tldraw: LayoutTemplate,
    bpmn: Workflow,
    cloud: Cloud,
  };
  const Icon = iconMap[type] ?? GitFork;
  return <Icon size={size ?? 18} className={className} />;
}
