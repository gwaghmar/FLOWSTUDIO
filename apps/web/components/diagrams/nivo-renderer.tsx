"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";

// Dynamically import Nivo to avoid SSR issues (uses browser APIs)
const ResponsiveBar = dynamic(async () => (await import("@nivo/bar")).ResponsiveBar, { ssr: false });
const ResponsiveLine = dynamic(async () => (await import("@nivo/line")).ResponsiveLine, { ssr: false });
const ResponsivePie = dynamic(async () => (await import("@nivo/pie")).ResponsivePie, { ssr: false });
const ResponsiveRadar = dynamic(async () => (await import("@nivo/radar")).ResponsiveRadar, { ssr: false });
const ResponsiveTreeMap = dynamic(async () => (await import("@nivo/treemap")).ResponsiveTreeMap, { ssr: false });
const ResponsiveSankey = dynamic(async () => (await import("@nivo/sankey")).ResponsiveSankey, { ssr: false });
const ResponsiveNetwork = dynamic(async () => (await import("@nivo/network")).ResponsiveNetwork, { ssr: false });

type NivoData = {
  type: string;
  data: unknown;
  keys?: string[];
  indexBy?: string;
  colors?: unknown;
  [key: string]: unknown;
};

type Props = {
  source: string;
  // Nivo charts are always read-only — bidirectional editing is not supported.
  readOnly?: boolean;
};

const NIVO_THEME = {
  background: "#ffffff",
  textColor: "#334155",
  fontSize: 13,
  axis: {
    domain: { line: { stroke: "#e2e8f0", strokeWidth: 1 } },
    legend: { text: { fontSize: 13, fill: "#475569", fontWeight: 600 } },
    ticks: { line: { stroke: "#e2e8f0", strokeWidth: 1 }, text: { fontSize: 11, fill: "#64748b" } },
  },
  grid: { line: { stroke: "#f1f5f9", strokeWidth: 1 } },
  legends: {
    title: { text: { fontSize: 12, fill: "#334155" } },
    text: { fontSize: 12, fill: "#475569" },
    ticks: { line: {}, text: { fontSize: 10, fill: "#64748b" } },
  },
  tooltip: {
    container: { background: "#1e293b", color: "#f8fafc", fontSize: 13, borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" },
  },
};

export function NivoRenderer({ source }: Props) {
  const parseResult = useMemo((): { ok: true; config: NivoData } | { ok: false; error: string } => {
    try {
      const data = JSON.parse(source) as NivoData;
      return { ok: true, config: data };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Invalid chart config" };
    }
  }, [source]);

  if (!parseResult.ok) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="w-full max-w-lg rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">Chart configuration error</p>
          <p className="mt-1 font-mono text-xs">{parseResult.error}</p>
        </div>
      </div>
    );
  }

  const config = parseResult.config;

  const colors = (config.colors as { scheme?: string } | string[] | undefined);
  const colorValue = colors ?? { scheme: "nivo" };

  const commonProps = {
    theme: NIVO_THEME,
    animate: true,
    motionConfig: "gentle" as const,
    margin: { top: 40, right: 120, bottom: 60, left: 80 },
  };

  switch (config.type) {
    case "bar":
      return (
        <div className="h-full w-full bg-white p-4">
          <ResponsiveBar
            {...commonProps}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data={config.data as any}
            keys={config.keys as string[]}
            indexBy={config.indexBy as string ?? "id"}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            colors={colorValue as any}
            padding={0.3}
            borderRadius={4}
            borderWidth={0}
            labelSkipWidth={12}
            labelSkipHeight={12}
            legends={[{ dataFrom: "keys", anchor: "bottom-right", direction: "column", translateX: 120, itemWidth: 100, itemHeight: 20, itemsSpacing: 2 }]}
            axisBottom={{ tickSize: 5, tickPadding: 5, tickRotation: -20 }}
            tooltip={({ id, value, color }) => (
              <div className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white shadow-xl">
                <span style={{ color }}>{id}</span>: <strong>{value}</strong>
              </div>
            )}
          />
        </div>
      );

    case "line":
      return (
        <div className="h-full w-full bg-white p-4">
          <ResponsiveLine
            {...commonProps}
            data={config.data as { id: string; data: { x: string | number; y: number }[] }[]}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            colors={colorValue as any}
            enableSlices="x"
            pointSize={8}
            pointBorderWidth={2}
            pointBorderColor={{ from: "serieColor" }}
            useMesh
            curve="monotoneX"
            legends={[{ anchor: "bottom-right", direction: "column", translateX: 120, itemWidth: 100, itemHeight: 20, itemsSpacing: 2 }]}
          />
        </div>
      );

    case "pie":
      return (
        <div className="h-full w-full bg-white p-4">
          <ResponsivePie
            {...commonProps}
            data={config.data as { id: string; value: number; label?: string }[]}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            colors={colorValue as any}
            innerRadius={0.5}
            padAngle={0.7}
            cornerRadius={3}
            activeOuterRadiusOffset={8}
            arcLinkLabelsSkipAngle={10}
            arcLinkLabelsTextColor="#334155"
            arcLinkLabelsThickness={2}
            arcLabelsSkipAngle={10}
            legends={[{ anchor: "bottom", direction: "row", translateY: 56, itemWidth: 100, itemHeight: 18, itemsSpacing: 2 }]}
          />
        </div>
      );

    case "radar":
      return (
        <div className="h-full w-full bg-white p-4">
          <ResponsiveRadar
            {...commonProps}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data={config.data as any}
            keys={config.keys as string[]}
            indexBy={config.indexBy as string ?? "category"}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            colors={colorValue as any}
            fillOpacity={0.25}
            blendMode="multiply"
            legends={[{ anchor: "top-left", direction: "column", itemWidth: 80, itemHeight: 20, itemsSpacing: 2 }]}
          />
        </div>
      );

    case "treemap":
      return (
        <div className="h-full w-full bg-white p-4">
          <ResponsiveTreeMap
            {...commonProps}
            data={config.data as { name: string; children?: unknown[] }}
            identity="name"
            value="value"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            colors={colorValue as any}
            labelSkipSize={12}
            borderWidth={2}
            borderColor={{ from: "color", modifiers: [["darker", 0.3]] }}
          />
        </div>
      );

    case "sankey":
      return (
        <div className="h-full w-full bg-white p-4">
          <ResponsiveSankey
            {...commonProps}
            data={config.data as { nodes: { id: string }[]; links: { source: string; target: string; value: number }[] }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            colors={colorValue as any}
            nodeOpacity={1}
            nodeThickness={18}
            nodeSpacing={24}
            nodeBorderWidth={0}
            linkOpacity={0.5}
            enableLinkGradient
            labelPosition="outside"
            labelOrientation="vertical"
            labelPadding={16}
          />
        </div>
      );

    case "network":
      return (
        <div className="h-full w-full bg-white p-4">
          <ResponsiveNetwork
            {...commonProps}
            data={config.data as { nodes: { id: string; [k: string]: unknown }[]; links: { source: string; target: string; [k: string]: unknown }[] }}
            repulsivity={6}
            iterations={60}
            nodeColor={(n) => String((n as { color?: string }).color ?? "#6366f1")}
            nodeBorderWidth={1}
            nodeBorderColor={{ from: "color", modifiers: [["darker", 0.4]] }}
            linkThickness={2}
            linkBlendMode="multiply"
          />
        </div>
      );

    default:
      return (
        <div className="flex h-full items-center justify-center text-slate-500">
          Unknown chart type: <code className="ml-2 text-sm">{config.type}</code>
        </div>
      );
  }
}
