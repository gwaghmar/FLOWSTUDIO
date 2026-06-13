"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  source: string;
  onChange?: (source: string) => void;
  readOnly?: boolean;
};

type FlowRef = {
  $type: string;
  sourceRef?: FlowRef;
  targetRef?: FlowRef;
  outgoing?: FlowRef[];
  incoming?: FlowRef[];
  rootElements?: FlowRef[];
  flowElements?: FlowRef[];
};

/** bpmn-auto-layout walks incoming/outgoing refs; app sources only carry sourceRef/targetRef, so backfill the inverse refs or every edge gets dropped. */
function linkFlowRefs(container: FlowRef) {
  for (const el of container.flowElements ?? []) {
    if (el.$type === "bpmn:SequenceFlow") {
      const src = el.sourceRef;
      const tgt = el.targetRef;
      if (src) { (src.outgoing ??= []); if (!src.outgoing.includes(el)) src.outgoing.push(el); }
      if (tgt) { (tgt.incoming ??= []); if (!tgt.incoming.includes(el)) tgt.incoming.push(el); }
    } else if (el.flowElements) {
      linkFlowRefs(el);
    }
  }
}

/** Re-flow a BPMN process: regenerate DI so bpmn-auto-layout places every shape and edge. */
export async function autoLayoutBpmn(source: string): Promise<string> {
  const [{ BpmnModdle }, { layoutProcess }] = await Promise.all([
    import("bpmn-moddle"),
    import("bpmn-auto-layout"),
  ]);
  const moddle = new BpmnModdle();
  const { rootElement } = await moddle.fromXML(source);
  for (const root of (rootElement as unknown as FlowRef).rootElements ?? []) {
    if (root.$type === "bpmn:Process") linkFlowRefs(root);
  }
  const { xml } = await moddle.toXML(rootElement);
  return layoutProcess(xml);
}

export function BpmnRenderer({ source, onChange, readOnly = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  type BpmnInstance = {
    destroy: () => void;
    importXML: (xml: string) => Promise<{ warnings: string[] }>;
    saveXML?: (opts: { format: boolean }) => Promise<{ xml: string }>;
    get: (name: string) => unknown;
  };
  type CanvasApi = {
    resized: () => void;
    zoom: (fit: "fit-viewport" | number, center?: "auto" | { x: number; y: number }) => void;
    viewbox: (
      box?: { x: number; y: number; width: number; height: number }
    ) =>
      | {
          x: number;
          y: number;
          width: number;
          height: number;
          scale?: number;
          inner?: { width: number; height: number; x: number; y: number };
          outer?: { width: number; height: number };
        }
      | void;
  };
  type EventBusApi = { on: (event: string, fn: () => void) => void };
  type ModelingApi = { saveXML: (opts: { format: boolean }) => Promise<{ xml: string }> };

  const viewerRef = useRef<BpmnInstance | null>(null);
  const onChangeRef = useRef(onChange);
  const sourceRef = useRef(source);
  const hasInitialFitRef = useRef(false);
  const hasBoundChangeListenerRef = useRef(false);
  const lastImportedSourceRef = useRef<string>("");
  const [parseError, setParseError] = useState<string | null>(null);

  onChangeRef.current = onChange;
  sourceRef.current = source;

  const fitToViewport = useCallback((force = false) => {
    if (hasInitialFitRef.current && !force) return;
    const viewer = viewerRef.current;
    const container = containerRef.current;
    if (!viewer || !container) return;

    const canvas = viewer.get("canvas") as CanvasApi;
    const w = container.clientWidth;
    const h = container.clientHeight;

    // Guard for first-paint sizing race: defer fit if container hasn't sized yet.
    if (w < 8 || h < 8) {
      requestAnimationFrame(() => {
        if (!hasInitialFitRef.current) {
          canvas.zoom("fit-viewport");
          hasInitialFitRef.current = true;
        }
      });
      return;
    }

    canvas.zoom("fit-viewport", "auto");
    const vb = canvas.viewbox();
    // Add a small margin after fit so bottom edges/labels are not clipped.
    if (vb && vb.scale) {
      canvas.zoom(vb.scale * 0.92, "auto");
    }
    hasInitialFitRef.current = true;
  }, []);

  // Initialize BPMN instance once (or when readOnly mode flips viewer/modeler type).
  useEffect(() => {
    if (!containerRef.current) return;
    let mounted = true;
    let resizeObserver: ResizeObserver | null = null;

    const init = async () => {
      try {
        const BpmnJS = (await import("bpmn-js")).default;
        if (!mounted || !containerRef.current) return;

        viewerRef.current?.destroy();
        viewerRef.current = null;
        hasBoundChangeListenerRef.current = false;
        hasInitialFitRef.current = false;

        const BpmnCtor = readOnly ? BpmnJS : (await import("bpmn-js/lib/Modeler")).default;
        const viewer = new BpmnCtor({
          container: containerRef.current,
          height: "100%",
        }) as unknown as BpmnInstance;
        viewerRef.current = viewer;

        const canvas = viewer.get("canvas") as CanvasApi;
        const containerEl = containerRef.current;
        if (containerEl && typeof canvas.resized === "function") {
          resizeObserver = new ResizeObserver(() => {
            canvas.resized();
          });
          resizeObserver.observe(containerEl);
        }

        if (!readOnly && onChangeRef.current && !hasBoundChangeListenerRef.current) {
          const eventBus = viewer.get("eventBus") as EventBusApi;
          const modeling = viewer as ModelingApi;
          eventBus.on("element.changed", async () => {
            try {
              const { xml } = await modeling.saveXML({ format: true });
              onChangeRef.current?.(xml);
            } catch {
              /* ignore */
            }
          });
          hasBoundChangeListenerRef.current = true;
        }

        await viewer.importXML(sourceRef.current);
        lastImportedSourceRef.current = sourceRef.current;
        fitToViewport();
        setParseError(null);
      } catch (e) {
        if (mounted) {
          setParseError(e instanceof Error ? e.message : "Failed to parse BPMN");
        }
      }
    };

    void init();

    return () => {
      mounted = false;
      resizeObserver?.disconnect();
      resizeObserver = null;
      viewerRef.current?.destroy();
      viewerRef.current = null;
      hasBoundChangeListenerRef.current = false;
      hasInitialFitRef.current = false;
    };
  }, [readOnly, fitToViewport]);

  // Update XML without re-creating viewer; preserve zoom/pan after initial fit.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (source === lastImportedSourceRef.current) return;

    let cancelled = false;
    void (async () => {
      try {
        await viewer.importXML(source);
        lastImportedSourceRef.current = source;
        if (cancelled) return;
        fitToViewport(true);
        setParseError(null);
      } catch (e) {
        if (!cancelled) {
          setParseError(e instanceof Error ? e.message : "Failed to parse BPMN");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [source, fitToViewport]);

  return (
    <div className="relative h-full w-full bg-white">
      <div ref={containerRef} className="h-full w-full" />
      {parseError ? (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center">
          <div className="pointer-events-auto max-w-lg rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 shadow-xs">
            <span className="font-medium">BPMN parse error: </span>
            <span className="font-mono">{parseError}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
