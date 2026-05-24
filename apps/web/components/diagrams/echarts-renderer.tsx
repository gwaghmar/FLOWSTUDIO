"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { EChartsOption } from "echarts";
import type { EChartsUiTheme } from "@/lib/echarts-presets";
import { mergeWithBuiltInDefaults } from "@/lib/echarts-presets";

export type EChartsRendererHandle = {
  getDataURL: (opts?: {
    type?: "png" | "jpeg" | "svg";
    pixelRatio?: number;
    backgroundColor?: string;
  }) => string | undefined;
};

type Props = {
  source: string;
  onChange?: (source: string) => void;
  readOnly?: boolean;
  uiTheme?: EChartsUiTheme;
};

export const EChartsRenderer = forwardRef<EChartsRendererHandle, Props>(function EChartsRenderer(
  { source, onChange, readOnly = false, uiTheme = "light" },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<import("echarts").ECharts | null>(null);
  const sourceRef = useRef(source);
  const onChangeRef = useRef(onChange);
  const readOnlyRef = useRef(readOnly);
  const applyingFromPropRef = useRef(false);
  const [parseError, setParseError] = useState<string | null>(null);

  sourceRef.current = source;
  onChangeRef.current = onChange;
  readOnlyRef.current = readOnly;

  useImperativeHandle(ref, () => ({
    getDataURL: (opts) => chartRef.current?.getDataURL(opts),
  }));

  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;

    void (async () => {
      const echarts = await import("echarts");
      if (cancelled || !containerRef.current) return;

      chartRef.current?.dispose();

      const themeName = uiTheme === "dark" ? "dark" : undefined;
      const chart = echarts.init(containerRef.current, themeName, { renderer: "svg" });
      chartRef.current = chart;

      if (cancelled) {
        chart.dispose();
        if (chartRef.current === chart) chartRef.current = null;
        return;
      }

      const onResize = () => chart.resize();
      window.addEventListener("resize", onResize);

      const onLegend = (e: unknown) => {
        const ev = e as { selected?: Record<string, boolean> };
        if (applyingFromPropRef.current || readOnlyRef.current || !onChangeRef.current || !ev.selected) return;
        try {
          const raw = sourceRef.current;
          const opt = JSON.parse(raw) as EChartsOption & { legend?: { selected?: Record<string, boolean> } };
          const legend =
            typeof opt.legend === "object" && opt.legend !== null ? { ...opt.legend } : {};
          opt.legend = { ...legend, selected: ev.selected };
          onChangeRef.current(JSON.stringify(opt));
        } catch {
          /* ignore */
        }
      };
      chart.on("legendselectchanged", onLegend);

      try {
        const merged = mergeWithBuiltInDefaults(JSON.parse(sourceRef.current) as EChartsOption, uiTheme);
        applyingFromPropRef.current = true;
        chart.setOption(merged, { notMerge: true });
        setParseError(null);
        requestAnimationFrame(() => {
          applyingFromPropRef.current = false;
        });
      } catch (e) {
        setParseError(e instanceof Error ? e.message : "Invalid chart configuration");
      }

      dispose = () => {
        window.removeEventListener("resize", onResize);
        chart.off("legendselectchanged", onLegend);
        chart.dispose();
        if (chartRef.current === chart) chartRef.current = null;
      };
    })();

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [uiTheme]);

  // Source updates: try to apply to existing chart, or recover by re-initializing
  // if the chart was never created (initial source was invalid then became valid).
  useEffect(() => {
    let opt: EChartsOption;
    try {
      opt = mergeWithBuiltInDefaults(JSON.parse(source) as EChartsOption, uiTheme);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Invalid chart configuration");
      return;
    }

    const chart = chartRef.current;
    if (chart) {
      applyingFromPropRef.current = true;
      chart.setOption(opt, { notMerge: true });
      setParseError(null);
      requestAnimationFrame(() => {
        applyingFromPropRef.current = false;
      });
      return;
    }

    // No chart yet — try to initialize now that we have a valid option.
    let cancelled = false;
    void (async () => {
      const echarts = await import("echarts");
      if (cancelled || !containerRef.current) return;
      const themeName = uiTheme === "dark" ? "dark" : undefined;
      const created = echarts.init(containerRef.current, themeName, { renderer: "svg" });
      chartRef.current = created;
      applyingFromPropRef.current = true;
      created.setOption(opt, { notMerge: true });
      setParseError(null);
      requestAnimationFrame(() => {
        applyingFromPropRef.current = false;
      });
    })();
    return () => { cancelled = true; };
  }, [source, uiTheme]);

  return (
    <div className="relative flex h-full min-h-[400px] w-full flex-col bg-white">
      <div ref={containerRef} className="min-h-0 flex-1 w-full" />
      {parseError ? (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center">
          <div className="pointer-events-auto max-w-lg rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 shadow-sm">
            <span className="font-medium">Chart error: </span>
            <span className="font-mono">{parseError}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
});
