"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { TLDefaultColorStyle, TLGeoShapeGeoStyle } from "@tldraw/tlschema";
import { createShapeId, toRichText } from "@tldraw/tlschema";
import "tldraw/tldraw.css";

const Tldraw = dynamic(
  async () => (await import("tldraw")).Tldraw,
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-slate-400">Loading canvas…</div> }
);

type Props = {
  source: string;
  onChange?: (source: string) => void;
  readOnly?: boolean;
};

/** Starter JSON uses a simplified `elements` list (no store snapshot). */
type LegacyGeoElement = {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation?: number;
  props?: Record<string, unknown>;
};

function legacyElementsToGeoShapes(elements: LegacyGeoElement[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shapes: any[] = [];

  for (const el of elements) {
    if (el.type !== "geo" || !el.props) continue;
    const p = el.props;
    const rawId = el.id.replace(/^shape:/, "");
    const text = String(p.text ?? "");
    shapes.push({
      id: createShapeId(rawId || "box"),
      type: "geo",
      x: el.x,
      y: el.y,
      rotation: el.rotation ?? 0,
      props: {
        geo: (typeof p.geo === "string" ? p.geo : "rectangle") as TLGeoShapeGeoStyle,
        w: Number(p.w) || 200,
        h: Number(p.h) || 80,
        color: (typeof p.color === "string" ? p.color : "blue") as TLDefaultColorStyle,
        fill: p.fill === "solid" ? "solid" : "none",
        dash: p.dash === "draw" ? "draw" : "solid",
        size: "m",
        font: p.font === "draw" ? "draw" : "sans",
        align: "middle",
        verticalAlign: "middle",
        richText: toRichText(text),
        labelColor: "black",
        url: "",
        growY: 0,
        scale: 1,
      },
    });
  }
  return shapes;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function applyDocumentToEditor(editor: any, src: string) {
  try {
    const data = JSON.parse(src) as { snapshot?: unknown; elements?: LegacyGeoElement[] };
    if (data?.snapshot) {
      editor.store.loadSnapshot(data.snapshot as Parameters<typeof editor.store.loadSnapshot>[0]);
      editor.zoomToFit({ animation: { duration: 0 } });
      return;
    }
    if (Array.isArray(data?.elements) && data.elements.length > 0) {
      const ids = [...editor.getCurrentPageShapeIds()];
      if (ids.length) editor.deleteShapes(ids);
      const partials = legacyElementsToGeoShapes(data.elements);
      if (partials.length) editor.createShapes(partials);
      editor.zoomToFit({ animation: { duration: 0 } });
    }
  } catch {
    /* empty or invalid — keep default canvas */
  }
}

export function TldrawRenderer({ source, onChange, readOnly = false }: Props) {
  const [parseError, setParseError] = useState<string | null>(null);
  const lastSource = useRef(source);
  const editorRef = useRef<unknown>(null);
  const isApplying = useRef(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMount = (editor: any) => {
    editorRef.current = editor;
    void (async () => {
      try {
        await applyDocumentToEditor(editor, source);
        setParseError(null);
      } catch (e) {
        setParseError(e instanceof Error ? e.message : "Could not load canvas");
      }
      lastSource.current = source;
    })();

    if (!readOnly) {
      editor.store.listen(
        () => {
          if (isApplying.current) return;
          try {
            const snapshot = editor.store.getSnapshot();
            const newSource = JSON.stringify({ snapshot });
            if (newSource !== lastSource.current) {
              lastSource.current = newSource;
              onChange?.(newSource);
            }
          } catch {
            /* ignore */
          }
        },
        { scope: "document" }
      );
    }
  };

  useEffect(() => {
    const editor = editorRef.current as Parameters<typeof applyDocumentToEditor>[0] | null;
    if (!editor) return;
    if (source === lastSource.current) return;
    isApplying.current = true;
    void (async () => {
      try {
        await applyDocumentToEditor(editor, source);
        setParseError(null);
      } catch (e) {
        setParseError(e instanceof Error ? e.message : "Could not load canvas");
      }
      lastSource.current = source;
      queueMicrotask(() => {
        isApplying.current = false;
      });
    })();
  }, [source]);

  return (
    <div className="relative h-full w-full">
      {parseError ? (
        <div className="absolute inset-x-0 top-4 z-10 mx-auto w-fit rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {parseError}
        </div>
      ) : null}
      <Tldraw
        onMount={handleMount}
        hideUi={readOnly}
      />
    </div>
  );
}
