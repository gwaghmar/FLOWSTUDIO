import type { EChartsOption } from "echarts";

export type EChartsUiTheme = "light" | "dark";
export type ChartFamilyId = "bar" | "line" | "area" | "pie" | "donut";

export function detectChartFamily(opt: EChartsOption | null): ChartFamilyId {
  if (!opt?.series) return "bar";
  const s = Array.isArray(opt.series) ? opt.series[0] : opt.series;
  if (!s || typeof s !== "object") return "bar";
  const t = (s as { type?: string }).type;
  if (t === "pie") {
    const r = (s as { radius?: string | string[] }).radius;
    if (Array.isArray(r)) return "donut";
    return "pie";
  }
  if (t === "line") {
    if ((s as { areaStyle?: unknown }).areaStyle) return "area";
    return "line";
  }
  return "bar";
}

export const COLOR_PALETTES: Record<string, string[]> = {
  indigo: ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#84cc16"],
  sunset: ["#f97316", "#ec4899", "#8b5cf6", "#6366f1", "#14b8a6", "#eab308", "#ef4444"],
  ocean: ["#0ea5e9", "#06b6d4", "#14b8a6", "#6366f1", "#8b5cf6", "#64748b"],
  forest: ["#15803d", "#22c55e", "#84cc16", "#a3e635", "#ca8a04", "#65a30d"],
};

export function parseEChartsJson(source: string): EChartsOption | null {
  try {
    return JSON.parse(source) as EChartsOption;
  } catch {
    return null;
  }
}

/** Merge editor quick-style changes into the stored JSON (single source of truth). */
export function applyColorPalette(source: string, paletteId: keyof typeof COLOR_PALETTES): string {
  const opt = parseEChartsJson(source);
  if (!opt) return source;
  const colors = COLOR_PALETTES[paletteId];
  if (!colors) return source;
  const next = { ...opt, color: colors };
  return JSON.stringify(next);
}

export function applyChartFamily(source: string, family: ChartFamilyId): string {
  const opt = parseEChartsJson(source);
  if (!opt) return source;
  const series = Array.isArray(opt.series) ? [...opt.series] : opt.series ? [{ ...opt.series }] : [];
  if (series.length === 0) return source;

  const xAxis = opt.xAxis as { type?: string; data?: string[] } | undefined;
  const categories = Array.isArray(xAxis?.data) ? xAxis!.data! : [];

  if (family === "pie" || family === "donut") {
    const first = series[0] as { name?: string; data?: number[] };
    const data = categories.map((name, i) => ({
      name,
      value: Array.isArray(first?.data) ? first.data[i] ?? 0 : 0,
    }));
    const inner = family === "donut" ? "45%" : "0%";
    const outer = family === "donut" ? "75%" : "70%";
    const pieSeries = {
      type: "pie" as const,
      radius: family === "donut" ? [inner, outer] : "65%",
      center: ["50%", "55%"],
      data,
      emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: "rgba(0,0,0,0.25)" } },
      label: { formatter: "{b}: {c} ({d}%)" },
    };
    const next: EChartsOption = {
      ...opt,
      xAxis: undefined,
      yAxis: undefined,
      series: [pieSeries],
    };
    if (next.grid) delete (next as { grid?: unknown }).grid;
    return JSON.stringify(next);
  }

  const nextSeries = series.map((s) => {
    const base = { ...(s as object) } as Record<string, unknown>;
    if (family === "bar") {
      return {
        ...base,
        type: "bar",
        smooth: undefined,
        areaStyle: undefined,
        stack: base.stack,
      };
    }
    if (family === "line") {
      return {
        ...base,
        type: "line",
        smooth: true,
        areaStyle: undefined,
      };
    }
    if (family === "area") {
      return {
        ...base,
        type: "line",
        smooth: true,
        areaStyle: { opacity: 0.25 },
      };
    }
    return base;
  });

  const next: EChartsOption = { ...opt, series: nextSeries };
  return JSON.stringify(next);
}

export function toggleLegend(source: string, show: boolean): string {
  const opt = parseEChartsJson(source);
  if (!opt) return source;
  const legend = typeof opt.legend === "object" && opt.legend !== null ? { ...opt.legend } : {};
  return JSON.stringify({ ...opt, legend: { ...legend, show } });
}

export function toggleDataLabels(source: string, show: boolean): string {
  const opt = parseEChartsJson(source);
  if (!opt) return source;
  const series = Array.isArray(opt.series) ? opt.series : [opt.series].filter(Boolean);
  const nextSeries = series.map((s) => {
    const o = (typeof s === "object" && s !== null ? s : {}) as Record<string, unknown>;
    return { ...o, label: { ...((o.label as object) ?? {}), show } };
  });
  return JSON.stringify({ ...opt, series: nextSeries });
}

export function toggleStack(source: string, stacked: boolean): string {
  const opt = parseEChartsJson(source);
  if (!opt) return source;
  const series = Array.isArray(opt.series) ? opt.series : [opt.series].filter(Boolean);
  const nextSeries = series.map((s) => {
    const o = (typeof s === "object" && s !== null ? s : {}) as Record<string, unknown>;
    if ((o.type as string) !== "bar" && (o.type as string) !== "line") return o;
    return stacked ? { ...o, stack: "total" } : { ...o, stack: undefined };
  });
  return JSON.stringify({ ...opt, series: nextSeries });
}

export function toggleSplitLine(source: string, show: boolean): string {
  const opt = parseEChartsJson(source);
  if (!opt) return source;
  const yAxis = opt.yAxis;
  const patchAxis = (ax: unknown) => {
    if (ax === undefined || ax === null) return ax;
    if (Array.isArray(ax)) {
      return ax.map((a) =>
        typeof a === "object" && a !== null
          ? { ...a, splitLine: { ...((a as { splitLine?: object }).splitLine ?? {}), show } }
          : a
      );
    }
    if (typeof ax === "object") {
      return { ...ax, splitLine: { ...((ax as { splitLine?: object }).splitLine ?? {}), show } };
    }
    return ax;
  };
  return JSON.stringify({ ...opt, yAxis: patchAxis(yAxis) });
}

/**
 * Presentation-only merge: animation, toolbox, dataZoom, grid — does not replace user colors/series.
 * Used by the renderer; stored `source` stays minimal unless user edits JSON or quick controls.
 */
export function mergeWithBuiltInDefaults(option: EChartsOption, uiTheme: EChartsUiTheme): EChartsOption {
  const out: EChartsOption = { ...option };

  if (out.animation !== false && out.animation == null) {
    out.animation = true;
    out.animationDuration = 650;
    out.animationEasing = "cubicOut";
  }

  if (!out.toolbox) {
    out.toolbox = {
      show: true,
      orient: "horizontal",
      right: 12,
      top: 10,
      feature: {
        saveAsImage: { title: "Save as image" },
        dataView: { readOnly: false, title: "Data view" },
        restore: { title: "Restore" },
        magicType: {
          type: ["line", "bar", "stack"],
          title: { line: "Line", bar: "Bar", stack: "Stack" },
        },
        dataZoom: { title: { zoom: "Zoom", back: "Reset zoom" } },
      },
    };
  }

  const x = out.xAxis as { data?: unknown[]; type?: string } | undefined;
  const catLen = Array.isArray(x?.data) ? x.data.length : 0;
  if (catLen > 4 && !out.dataZoom && x?.type === "category") {
    out.dataZoom = [
      { type: "inside", xAxisIndex: 0 },
      { type: "slider", xAxisIndex: 0, height: 22, bottom: 8 },
    ];
    if (!out.grid || typeof out.grid !== "object") {
      out.grid = { left: "3%", right: "4%", bottom: "12%", containLabel: true };
    } else {
      const g = out.grid as Record<string, unknown>;
      const bottom =
        typeof g.bottom === "string" || typeof g.bottom === "number" ? g.bottom : "12%";
      out.grid = { ...g, bottom, containLabel: true };
    }
  }

  if (!out.color) {
    out.color = COLOR_PALETTES.indigo;
  }

  if (!out.grid && (out.xAxis || out.yAxis)) {
    out.grid = { left: "3%", right: "4%", bottom: "3%", containLabel: true };
  }

  // Keep chart text from colliding with toolbox / legend chrome.
  if (out.title) {
    if (Array.isArray(out.title)) {
      out.title = out.title.map((t) =>
        typeof t === "object" && t !== null ? { ...t, top: (t as { top?: string | number }).top ?? 40 } : t
      );
    } else if (typeof out.title === "object") {
      out.title = { ...out.title, top: (out.title as { top?: string | number }).top ?? 40 };
    }
  }

  if (out.legend && typeof out.legend === "object") {
    const lg = out.legend as { top?: string | number; bottom?: string | number };
    out.legend = { ...lg, top: lg.top ?? undefined, bottom: lg.bottom ?? 8 };
  }

  if (uiTheme === "dark") {
    out.backgroundColor = out.backgroundColor ?? "#0f172a";
    const textStyle = { color: "#e2e8f0" };
    if (out.title && typeof out.title === "object") {
      out.title = { ...out.title, textStyle: { ...((out.title as { textStyle?: object }).textStyle ?? {}), ...textStyle } };
    }
    if (out.legend && typeof out.legend === "object") {
      out.legend = { ...out.legend, textStyle: { ...((out.legend as { textStyle?: object }).textStyle ?? {}), ...textStyle } };
    }
    const patchAxisColors = (ax: unknown) => {
      if (Array.isArray(ax)) {
        return ax.map((a) =>
          typeof a === "object" && a !== null
            ? {
                ...a,
                axisLine: { lineStyle: { color: "#475569" } },
                axisLabel: { color: "#94a3b8" },
                splitLine: { lineStyle: { color: "#334155", type: "dashed" } },
              }
            : a
        );
      }
      if (typeof ax === "object" && ax !== null) {
        return {
          ...ax,
          axisLine: { lineStyle: { color: "#475569" } },
          axisLabel: { color: "#94a3b8" },
          splitLine: { lineStyle: { color: "#334155", type: "dashed" } },
        };
      }
      return ax;
    };
    out.xAxis = patchAxisColors(out.xAxis) as EChartsOption["xAxis"];
    out.yAxis = patchAxisColors(out.yAxis) as EChartsOption["yAxis"];
  }

  return out;
}
