"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import "@excalidraw/excalidraw/index.css";
import { restore } from "@excalidraw/excalidraw";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawElement = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppState = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BinaryFiles = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawImperativeAPI = any;

const Excalidraw = dynamic(
  async () => {
    const { Excalidraw } = await import("@excalidraw/excalidraw");
    return Excalidraw;
  },
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-slate-400">Loading whiteboard…</div> }
);

type ExcalidrawData = {
  type: string;
  version: number;
  elements: ExcalidrawElement[];
  appState?: Partial<AppState>;
};

/** Excalidraw's restore() assumes text elements have a string `text`; undefined crashes in normalizeEOL. */
function sanitizeExcalidrawElements(elements: ExcalidrawElement[] | undefined | null): ExcalidrawElement[] {
  if (!elements?.length) return [];
  return elements.map((el) => {
    if (!el || typeof el !== "object") return el;
    if (el.type !== "text") return el;
    if (typeof el.text === "string") return el;
    const text = el.text == null ? "" : String(el.text);
    return { ...el, text };
  });
}

function restoreScene(data: ExcalidrawData) {
  return restore(
    {
      elements: sanitizeExcalidrawElements(data.elements),
      appState: {
        ...data.appState,
        viewBackgroundColor: data.appState?.viewBackgroundColor ?? "#ffffff",
      },
    },
    null,
    null
  );
}

type Props = {
  source: string;
  onChange?: (source: string) => void;
  readOnly?: boolean;
};

export function ExcalidrawRenderer({ source, onChange, readOnly = false }: Props) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const isUpdatingFromProp = useRef(false);
  const lastSource = useRef(source);

  const parseResult = useMemo((): { ok: true; data: ExcalidrawData } | { ok: false; error: string } => {
    try {
      const data = JSON.parse(source) as ExcalidrawData;
      return { ok: true, data };
    } catch {
      return { ok: false, error: "Invalid Excalidraw JSON" };
    }
  }, [source]);

  // Sync external source changes into Excalidraw
  useEffect(() => {
    if (source === lastSource.current) return;
    lastSource.current = source;
    if (!parseResult.ok || !apiRef.current) return;
    const data = parseResult.data;
    const { elements, appState } = restoreScene(data);
    isUpdatingFromProp.current = true;
    apiRef.current.updateScene({ elements, appState });
    setTimeout(() => { isUpdatingFromProp.current = false; }, 100);
  }, [source, parseResult]);

  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], _appState: AppState, _files: BinaryFiles) => {
      if (isUpdatingFromProp.current || readOnly) return;
      const updated: ExcalidrawData = {
        type: "excalidraw",
        version: 2,
        elements: elements as ExcalidrawElement[],
        appState: { viewBackgroundColor: _appState.viewBackgroundColor ?? "#ffffff" },
      };
      const newSource = JSON.stringify(updated);
      if (newSource !== lastSource.current) {
        lastSource.current = newSource;
        onChange?.(newSource);
      }
    },
    [onChange, readOnly]
  );

  const initialRestored = useMemo(() => {
    if (!parseResult.ok) return null;
    return restoreScene(parseResult.data);
  }, [parseResult]);

  return (
    <div className="relative h-full min-h-[560px] w-full [&_.excalidraw]:h-full">
      {!parseResult.ok ? (
        <div className="flex h-full items-center justify-center">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {parseResult.error}
          </div>
        </div>
      ) : (
        <Excalidraw
          excalidrawAPI={(api) => { apiRef.current = api; }}
          initialData={{
            elements: initialRestored?.elements ?? [],
            appState: {
              ...initialRestored?.appState,
              isLoading: false,
            },
          }}
          onChange={handleChange}
          viewModeEnabled={readOnly}
          UIOptions={{
            canvasActions: {
              export: false,
              loadScene: false,
            },
          }}
        />
      )}
    </div>
  );
}

export async function exportExcalidrawToPng(source: string): Promise<Blob | null> {
  try {
    const { exportToBlob } = await import("@excalidraw/excalidraw");
    const data = JSON.parse(source) as ExcalidrawData;
    const blob = await exportToBlob({
      elements: sanitizeExcalidrawElements(data.elements),
      appState: { exportWithDarkMode: false, ...data.appState },
      files: null,
      mimeType: "image/png",
    });
    return blob;
  } catch {
    return null;
  }
}

export async function exportExcalidrawToSvg(source: string): Promise<string | null> {
  try {
    const { exportToSvg } = await import("@excalidraw/excalidraw");
    const data = JSON.parse(source) as ExcalidrawData;
    const svg = await exportToSvg({
      elements: sanitizeExcalidrawElements(data.elements),
      appState: { exportWithDarkMode: false, ...data.appState },
      files: null,
    });
    return new XMLSerializer().serializeToString(svg);
  } catch {
    return null;
  }
}
