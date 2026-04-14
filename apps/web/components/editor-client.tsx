"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import mermaid from "mermaid";
import { toPng, toSvg } from "html-to-image";
import JSZip from "jszip";
import {
  THEMES,
  buildMermaidConfig,
  SOCIAL_PRESETS,
  getPreset,
  DIAGRAM_TYPE_META,
  DIAGRAM_TYPE_DEFAULTS,
  getDiagramTypeMeta,
  MERMAID_SUBTYPE_META,
  getMermaidSubtypeMeta,
  type SocialPresetId,
  type DiagramType,
  type MermaidSubtype,
} from "@flowchart/core";
import Link from "next/link";
import { DiagramTypeIcon } from "@/components/diagram-icon";
import { saveProject, createProject } from "@/app/actions/project";
import { createShareLink } from "@/app/actions/share";
import dynamic from "next/dynamic";
import type { EChartsRendererHandle } from "@/components/diagrams/echarts-renderer";
import {
  applyChartFamily,
  applyColorPalette,
  COLOR_PALETTES,
  parseEChartsJson,
  toggleDataLabels,
  toggleLegend,
  toggleSplitLine,
  toggleStack,
  detectChartFamily,
  type ChartFamilyId,
  type EChartsUiTheme,
} from "@/lib/echarts-presets";

const ExcalidrawRenderer = dynamic(
  () => import("./diagrams/excalidraw-renderer").then((m) => ({ default: m.ExcalidrawRenderer })),
  { ssr: false, loading: () => <CanvasLoader label="Whiteboard" /> }
);
const ReactFlowRenderer = dynamic(
  () => import("./diagrams/reactflow-renderer").then((m) => ({ default: m.ReactFlowRenderer })),
  { ssr: false, loading: () => <CanvasLoader label="Node graph" /> }
);
const EChartsRenderer = dynamic(
  () => import("./diagrams/echarts-renderer").then((m) => ({ default: m.EChartsRenderer })),
  { ssr: false, loading: () => <CanvasLoader label="Chart" /> }
);
const NivoRenderer = dynamic(
  () => import("./diagrams/nivo-renderer").then((m) => ({ default: m.NivoRenderer })),
  { ssr: false, loading: () => <CanvasLoader label="Chart" /> }
);
const TldrawRenderer = dynamic(
  () => import("./diagrams/tldraw-renderer").then((m) => ({ default: m.TldrawRenderer })),
  { ssr: false, loading: () => <CanvasLoader label="Canvas" /> }
);
const BpmnRenderer = dynamic(
  () => import("./diagrams/bpmn-renderer").then((m) => ({ default: m.BpmnRenderer })),
  { ssr: false, loading: () => <CanvasLoader label="BPMN" /> }
);

function CanvasLoader({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center bg-white text-slate-400">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
        <span className="text-sm">Loading {label}…</span>
      </div>
    </div>
  );
}

type ChatMessage = { id: string; role: "assistant" | "user"; content: string };
type UiState = { showGrid?: boolean; fontId?: string; paletteId?: string; customBackground?: string; customAccent?: string };
type FontOption = { id: string; label: string; cssValue: string };

const FONT_OPTIONS: FontOption[] = [
  { id: "geist", label: "Geist Sans", cssValue: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif" },
  { id: "inter", label: "Inter", cssValue: "Inter, ui-sans-serif, system-ui, sans-serif" },
  { id: "mono", label: "Geist Mono", cssValue: "var(--font-geist-mono), ui-monospace, monospace" },
  { id: "serif", label: "System Serif", cssValue: "ui-serif, Georgia, Cambria, serif" },
];

const UI_META_PREFIX = "%% ui:";

function parseUiFromSource(raw: string): { source: string; ui: UiState } {
  const lines = raw.split("\n");
  const first = lines[0]?.trim() ?? "";
  if (!first.startsWith(UI_META_PREFIX)) return { source: raw, ui: {} };
  try { return { source: lines.slice(1).join("\n"), ui: JSON.parse(first.slice(UI_META_PREFIX.length)) as UiState }; }
  catch { return { source: raw, ui: {} }; }
}
function embedUiInSource(raw: string, ui: UiState): string {
  return `${UI_META_PREFIX}${JSON.stringify(ui)}\n${parseUiFromSource(raw).source.trimStart()}`;
}

function summarizeDiagramSource(diagramType: DiagramType, source: string): string {
  const trimmed = source.trim();
  if (!trimmed) return "Empty diagram.";
  if (diagramType === "mermaid" || diagramType === "bpmn") {
    const lines = trimmed.split("\n").map((line) => line.trim()).filter(Boolean);
    return lines.slice(0, 18).join("\n");
  }
  try {
    const parsed = JSON.parse(trimmed) as {
      elements?: unknown[];
      nodes?: unknown[];
      edges?: unknown[];
      series?: unknown[];
      type?: string;
      data?: unknown[] | Record<string, unknown>;
    };
    if (diagramType === "excalidraw") {
      const count = Array.isArray(parsed.elements) ? parsed.elements.length : 0;
      return `Excalidraw scene with ${count} elements.`;
    }
    if (diagramType === "reactflow") {
      const nodeCount = Array.isArray(parsed.nodes) ? parsed.nodes.length : 0;
      const edgeCount = Array.isArray(parsed.edges) ? parsed.edges.length : 0;
      return `React Flow graph with ${nodeCount} nodes and ${edgeCount} edges.`;
    }
    if (diagramType === "echarts") {
      const seriesCount = Array.isArray(parsed.series) ? parsed.series.length : 0;
      return `ECharts config with ${seriesCount} series.`;
    }
    if (diagramType === "nivo") {
      const dataCount = Array.isArray(parsed.data) ? parsed.data.length : 0;
      return `Nivo chart type "${parsed.type ?? "unknown"}" with ${dataCount} data items.`;
    }
    if (diagramType === "tldraw") {
      const count = Array.isArray(parsed.elements) ? parsed.elements.length : 0;
      return `tldraw document with ${count} elements.`;
    }
  } catch {
    return `${diagramType} source is present but not fully parseable.`;
  }
  return `${diagramType} source available.`;
}

export type AiAssistantHint =
  | { kind: "byok"; providerLabel: string }
  | { kind: "server" }
  | { kind: "none" };

type Props = {
  initialSource: string;
  initialThemeId: string;
  initialTitle: string;
  initialDiagramType: DiagramType;
  projectId: string | null;
  showWatermark: boolean;
  aiAssistantHint?: AiAssistantHint;
};

export function EditorClient({
  initialSource,
  initialThemeId,
  initialTitle,
  initialDiagramType,
  projectId,
  showWatermark,
  aiAssistantHint = { kind: "none" },
}: Props) {
  const parsedInitial = useMemo(() => parseUiFromSource(initialSource), [initialSource]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(projectId);
  const [source, setSource] = useState(parsedInitial.source);
  const [themeId, setThemeId] = useState(initialThemeId);
  const [title, setTitle] = useState(initialTitle);
  const [diagramType, setDiagramType] = useState<DiagramType>(initialDiagramType);
  const [presetId, setPresetId] = useState<SocialPresetId>("square_feed");
  const [customExportWidth, setCustomExportWidth] = useState(1920);
  const [customExportHeight, setCustomExportHeight] = useState(1080);
  const [pngScale, setPngScale] = useState<1 | 2 | 3>(2);
  const [zipIncludeCustom, setZipIncludeCustom] = useState(false);
  const [showGrid, setShowGrid] = useState(Boolean(parsedInitial.ui.showGrid));
  const [zoom, setZoom] = useState(1);
  const [fontId, setFontId] = useState(parsedInitial.ui.fontId ?? "geist");
  const [paletteId, setPaletteId] = useState(parsedInitial.ui.paletteId ?? "default");
  const [customBackground, setCustomBackground] = useState(parsedInitial.ui.customBackground ?? "#f8fafc");
  const [customAccent, setCustomAccent] = useState(parsedInitial.ui.customAccent ?? "#6366f1");
  const [parseError, setParseError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showTypePanel, setShowTypePanel] = useState(false);
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [showEchartsStylePanel, setShowEchartsStylePanel] = useState(false);
  const [echartsUiTheme, setEchartsUiTheme] = useState<EChartsUiTheme>("light");
  /** Raw source hidden by default; power users expand. Opens automatically on parse errors. */
  const [sourceExpanded, setSourceExpanded] = useState(true);
  /** Active Mermaid subtype — only used when diagramType === "mermaid" */
  const [mermaidSubtype, setMermaidSubtype] = useState<MermaidSubtype>("flowchart");
  /** Tools / chat column — hide for focus on diagram (persisted). */
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content: initialDiagramType === "mermaid"
        ? `Hi! I can generate Mermaid diagrams — flowcharts, sequences, ERDs, Gantt charts, mind maps, and more. Pick a subtype above, then describe what you want.`
        : `Hi! I can generate and edit ${getDiagramTypeMeta(initialDiagramType).label} diagrams. Describe what you want and I'll build it.`,
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [compactAiContext, setCompactAiContext] = useState(false);
  const [isMermaidPanning, setIsMermaidPanning] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const exportWrapId = useId();
  const sourcePanelBodyId = useId();
  const leftPanelHydrated = useRef(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const echartsRef = useRef<EChartsRendererHandle>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const mermaidViewportRef = useRef<HTMLDivElement>(null);
  const mermaidPanStartRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const chatListRef = useRef<HTMLDivElement>(null);
  const previousSourceRef = useRef(source);
  const sourceAutoExpandedRef = useRef(false);
  const sourceSuppressAutoExpandRef = useRef(false);
  const lastSavedSnapshot = useRef("");
  const hasHydratedRef = useRef(false);

  const typeMeta = useMemo(() => getDiagramTypeMeta(diagramType), [diagramType]);
  const theme = useMemo(() => THEMES.find((t) => t.id === themeId) ?? THEMES[0], [themeId]);
  const selectedFont = useMemo(() => FONT_OPTIONS.find((x) => x.id === fontId) ?? FONT_OPTIONS[0], [fontId]);
  const bgColor = paletteId === "default" ? (theme.themeVariables.background ?? "#f8fafc") : customBackground;
  const accentColor = paletteId === "default" ? (theme.themeVariables.primaryColor ?? "#6366f1") : customAccent;
  const uiState = useMemo(() => ({ showGrid, fontId, paletteId, customBackground, customAccent }), [showGrid, fontId, paletteId, customBackground, customAccent]);
  const sourceWithUi = useMemo(() => diagramType === "mermaid" ? embedUiInSource(source, uiState) : source, [source, uiState, diagramType]);
  // When loading an existing project, lastSavedSnapshot starts as "" — treat that as "saved" so we don't show "Unsaved" before any changes.
  const isDirty = useMemo(() => {
    if (lastSavedSnapshot.current === "" && projectId !== null) return false;
    return JSON.stringify({ source: sourceWithUi, themeId, title }) !== lastSavedSnapshot.current;
  }, [sourceWithUi, themeId, title, projectId]);
  /** Derive from isDirty + saving — avoid useEffect(setState) on isDirty (can contribute to update loops). */
  const saveState: "saved" | "saving" | "unsaved" = saving ? "saving" : isDirty ? "unsaved" : "saved";

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); }, []);

  // Text flowchart rendering (depend on themeId + primitives — not theme object — to avoid spurious effect re-runs)
  useEffect(() => {
    if (diagramType !== "mermaid") return;
    let cancelled = false;
    const mermaidTheme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];
    (async () => {
      const cfg = buildMermaidConfig(mermaidTheme);
      mermaid.initialize({ ...cfg, themeVariables: { ...cfg.themeVariables, fontFamily: selectedFont.cssValue, background: bgColor, primaryColor: accentColor, primaryBorderColor: accentColor, lineColor: accentColor, nodeBorder: accentColor, titleColor: accentColor }, startOnLoad: false, suppressErrorRendering: true });
      try {
        const id = `m${exportWrapId.replace(/:/g, "")}${Date.now()}`;
        const { svg } = await mermaid.render(id, source);
        if (cancelled) return;
        if (innerRef.current) innerRef.current.innerHTML = svg;
        setParseError(null);
      } catch (e) {
        if (!cancelled) setParseError(e instanceof Error ? e.message : "Invalid diagram text");
      }
    })();
    return () => { cancelled = true; };
  }, [source, themeId, exportWrapId, selectedFont.cssValue, bgColor, accentColor, diagramType]);

  // localStorage hydration
  useEffect(() => {
    const key = `flowchart-ui:${currentProjectId ?? "draft"}`;
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const p = JSON.parse(cached) as UiState;
        if (typeof p.showGrid === "boolean") setShowGrid(p.showGrid);
        if (typeof p.fontId === "string") setFontId(p.fontId);
        if (typeof p.paletteId === "string") setPaletteId(p.paletteId);
        if (typeof p.customBackground === "string") setCustomBackground(p.customBackground);
        if (typeof p.customAccent === "string") setCustomAccent(p.customAccent);
      }
    } catch { /* ignore */ } finally { hasHydratedRef.current = true; }
  }, [currentProjectId]);

  useEffect(() => { if (!hasHydratedRef.current) return; localStorage.setItem(`flowchart-ui:${currentProjectId ?? "draft"}`, JSON.stringify(uiState)); }, [currentProjectId, uiState]);
  useEffect(() => { if (chatListRef.current) chatListRef.current.scrollTop = chatListRef.current.scrollHeight; }, [chatMessages]);

  useEffect(() => {
    if (diagramType === "mermaid" && parseError) {
      if (!sourceSuppressAutoExpandRef.current) {
        sourceAutoExpandedRef.current = true;
        setSourceExpanded(true);
      }
      return;
    }
    if (diagramType === "mermaid" && !parseError && sourceAutoExpandedRef.current) {
      sourceAutoExpandedRef.current = false;
      setSourceExpanded(false);
    }
    if (diagramType === "mermaid" && !parseError) {
      sourceSuppressAutoExpandRef.current = false;
    }
  }, [parseError, diagramType]);

  // Hydrate export + AI compact toggles (local-only)
  useEffect(() => {
    try {
      const w = localStorage.getItem("flowchart-export:customWidth");
      const h = localStorage.getItem("flowchart-export:customHeight");
      const s = localStorage.getItem("flowchart-export:pngScale");
      const c = localStorage.getItem("flowchart-ai:compact");
      if (w && Number.isFinite(Number(w))) setCustomExportWidth(Math.max(200, Math.min(8192, Math.round(Number(w)))));
      if (h && Number.isFinite(Number(h))) setCustomExportHeight(Math.max(200, Math.min(8192, Math.round(Number(h)))));
      if (s === "1" || s === "2" || s === "3") setPngScale(Number(s) as 1 | 2 | 3);
      if (c === "true") setCompactAiContext(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("flowchart-export:customWidth", String(customExportWidth));
      localStorage.setItem("flowchart-export:customHeight", String(customExportHeight));
      localStorage.setItem("flowchart-export:pngScale", String(pngScale));
      localStorage.setItem("flowchart-ai:compact", String(compactAiContext));
    } catch {
      /* ignore */
    }
  }, [customExportWidth, customExportHeight, pngScale, compactAiContext]);

  useEffect(() => {
    if (!exportOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest?.("[data-export-menu-root]")) return;
      setExportOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [exportOpen]);

  useEffect(() => {
    try {
      const v = localStorage.getItem("flowchart-editor:leftPanelOpen");
      if (v === "false") setLeftPanelOpen(false);
    } catch {
      /* ignore */
    }
    leftPanelHydrated.current = true;
  }, []);

  useEffect(() => {
    if (!leftPanelHydrated.current) return;
    try {
      localStorage.setItem("flowchart-editor:leftPanelOpen", String(leftPanelOpen));
    } catch {
      /* ignore */
    }
  }, [leftPanelOpen]);

  // Keyboard shortcuts
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      if (currentProjectId) { await saveProject(currentProjectId, { source: sourceWithUi, themeId, title, diagramType }); }
      else { const newId = await createProject(title || "Untitled", sourceWithUi, themeId, diagramType); setCurrentProjectId(newId); }
      lastSavedSnapshot.current = JSON.stringify({ source: sourceWithUi, themeId, title });
    } finally { setSaving(false); }
  }, [currentProjectId, sourceWithUi, themeId, title, diagramType]);

  const handleChatSend = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || aiLoading) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setAiLoading(true);
    setAiError(null);
    try {
      const history = chatMessages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
      // For mermaid, prepend subtype hint so the model knows which diagram variant to produce
      const aiHint = diagramType === "mermaid" ? getMermaidSubtypeMeta(mermaidSubtype).aiHint : "";
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiHint + text,
          diagramType,
          title,
          currentSource: source.slice(0, compactAiContext ? 800 : 2000),
          diagramSummary: summarizeDiagramSource(diagramType, source),
          conversationHistory: history,
          compact: compactAiContext,
        }),
      });
      let data: { source?: string | null; error?: string; needsClarification?: boolean; assistantMessage?: string } = {};
      try {
        const ct = res.headers.get("content-type");
        if (ct?.includes("application/json")) {
          data = (await res.json()) as { source?: string; error?: string };
        } else {
          const t = await res.text();
          data = { error: t.slice(0, 200) || `HTTP ${res.status}` };
        }
      } catch {
        data = { error: "Could not read AI response" };
      }
      if (!res.ok) {
        const errMsg = data.error ?? "AI request failed";
        setAiError(errMsg);
        setChatMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: `Sorry, I hit an error: ${errMsg}` }]);
        return;
      }
      if (data.needsClarification) {
        setChatMessages((prev) => [...prev, {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.assistantMessage?.trim() || "I need one clarification before generating the diagram. What should be the main outcome?",
        }]);
        return;
      }
      if (typeof data.source === "string") {
        let finalSource = data.source;

        // For mermaid: validate syntax client-side and auto-retry once if broken
        if (diagramType === "mermaid" && finalSource.trim()) {
          try {
            await mermaid.parse(finalSource);
          } catch (parseErr) {
            const errorText = parseErr instanceof Error ? parseErr.message : String(parseErr);
            setChatMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: "Got a syntax error — fixing it automatically…" }]);
            try {
              const retryRes = await fetch("/api/ai/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  prompt: `Fix this Mermaid parse error and output only the corrected diagram source.\nError: ${errorText}\nBroken diagram:\n${finalSource}`,
                  diagramType: "mermaid",
                  currentSource: finalSource,
                  compact: true,
                }),
              });
              if (retryRes.ok) {
                const retryData = (await retryRes.json()) as { source?: string };
                if (typeof retryData.source === "string" && retryData.source.trim()) {
                  finalSource = retryData.source;
                }
              }
            } catch { /* use original if retry network fails */ }
          }
        }

        previousSourceRef.current = source;
        setSource(finalSource);
        showToast("Diagram updated · ↩ to undo");
        const activeLabel = diagramType === "mermaid" ? getMermaidSubtypeMeta(mermaidSubtype).label : typeMeta.label;
        const msg = data.assistantMessage?.trim()
          ? `Done! Updated your ${activeLabel}. ${data.assistantMessage}`
          : `Done! Updated your ${activeLabel}. Ask me to refine it further.`;
        setChatMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: msg }]);
      }
    } catch {
      setAiError("Network error");
      setChatMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: "Network error. Please try again." }]);
    } finally { setAiLoading(false); }
  }, [chatInput, aiLoading, chatMessages, diagramType, mermaidSubtype, source, title, typeMeta.label, showToast, compactAiContext]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const inField = (e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA";
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void handleSave();
      }
      // ⌘/Ctrl+Enter for AI is handled on the AI textarea only (not diagram source).
      if (!inField && e.key.toLowerCase() === "g") {
        e.preventDefault();
        setShowGrid((p) => !p);
      }
      if (!inField && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setLeftPanelOpen((p) => !p);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave, handleChatSend]);

  const downloadBlob = (blob: Blob, name: string) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href); };

  const handleExport = useCallback(async (format: "png" | "svg" | "zip") => {
    setIsExporting(true);
    try {
      const fn = title || "diagram";
    if (diagramType === "mermaid" && (format === "png" || format === "svg")) {
      const svg = innerRef.current?.querySelector("svg");
      if (!svg) return;
      if (format === "svg") {
        const serialized = new XMLSerializer().serializeToString(svg);
        downloadBlob(new Blob([serialized], { type: "image/svg+xml" }), `${fn}.svg`);
        return;
      }
      const du = await toPng(svg as unknown as HTMLElement, { pixelRatio: pngScale, backgroundColor: bgColor });
      downloadBlob(await (await fetch(du)).blob(), `${fn}.png`);
      return;
    }
    if (diagramType === "excalidraw") {
      if (format === "png") { const { exportExcalidrawToPng } = await import("./diagrams/excalidraw-renderer"); const b = await exportExcalidrawToPng(source); if (b) downloadBlob(b, `${fn}.png`); }
      else if (format === "svg") { const { exportExcalidrawToSvg } = await import("./diagrams/excalidraw-renderer"); const s = await exportExcalidrawToSvg(source); if (s) downloadBlob(new Blob([s], { type: "image/svg+xml" }), `${fn}.svg`); }
      return;
    }
    if (diagramType === "echarts") {
      const bg = echartsUiTheme === "dark" ? "#0f172a" : "#ffffff";
      if (format === "png") {
        const url = echartsRef.current?.getDataURL({ type: "png", pixelRatio: pngScale, backgroundColor: bg });
        if (url) {
          const a = document.createElement("a");
          a.href = url;
          a.download = `${fn}.png`;
          a.click();
        }
        return;
      }
      if (format === "svg") {
        const url = echartsRef.current?.getDataURL({ type: "svg" });
        if (url) {
          const a = document.createElement("a");
          a.href = url;
          a.download = `${fn}.svg`;
          a.click();
        }
        return;
      }
      return;
    }
    const node = frameRef.current;
    if (!node) return;
    if (format === "png") { const du = await toPng(node, { pixelRatio: pngScale, filter: (n) => !(n as HTMLElement).hasAttribute?.("data-no-export") }); downloadBlob(await (await fetch(du)).blob(), `${fn}.png`); }
    else if (format === "svg") { const s = await toSvg(node, { filter: (n) => !(n as HTMLElement).hasAttribute?.("data-no-export") }); downloadBlob(await (await fetch(s)).blob(), `${fn}.svg`); }
    else if (format === "zip" && diagramType === "mermaid") {
      const zip = new JSZip();
      const pw = node.style.width, ph = node.style.height;
      try {
        for (const p of SOCIAL_PRESETS) {
          node.style.width = `${p.width}px`; node.style.height = `${p.height}px`;
          await new Promise((r) => setTimeout(r, 150));
          const du = await toPng(node, { pixelRatio: pngScale });
          zip.file(`${p.id}-${p.width}x${p.height}.png`, await (await fetch(du)).blob());
        }
        if (zipIncludeCustom) {
          const w = Math.max(200, Math.min(8192, Math.round(customExportWidth)));
          const h = Math.max(200, Math.min(8192, Math.round(customExportHeight)));
          node.style.width = `${w}px`;
          node.style.height = `${h}px`;
          await new Promise((r) => setTimeout(r, 150));
          const du = await toPng(node, { pixelRatio: pngScale });
          zip.file(`custom-${w}x${h}.png`, await (await fetch(du)).blob());
        }
      } finally { node.style.width = pw; node.style.height = ph; }
      downloadBlob(await zip.generateAsync({ type: "blob" }), `${fn}-social.zip`);
    }
    } finally {
      setIsExporting(false);
    }
  }, [diagramType, source, title, echartsUiTheme, pngScale, zipIncludeCustom, customExportWidth, customExportHeight, bgColor]);

  const handleShare = useCallback(async () => {
    setIsSharing(true);
    try {
      let id = currentProjectId;
      if (!id) { id = await createProject(title || "Untitled", sourceWithUi, themeId, diagramType); setCurrentProjectId(id); }
      else { await saveProject(id, { source: sourceWithUi, themeId, title, diagramType }); }
      const token = await createShareLink(id);
      await navigator.clipboard.writeText(`${window.location.origin}/s/${encodeURIComponent(token)}`);
      showToast("Share link copied!");
    } finally {
      setIsSharing(false);
    }
  }, [currentProjectId, sourceWithUi, themeId, title, diagramType, showToast]);

  const handleSwitchType = useCallback((newType: DiagramType) => {
    if (newType === diagramType) { setShowTypePanel(false); return; }
    previousSourceRef.current = source;
    setDiagramType(newType);
    if (newType === "mermaid") {
      setMermaidSubtype("flowchart");
      setSource(MERMAID_SUBTYPE_META[0].starter);
    } else {
      setSource(DIAGRAM_TYPE_DEFAULTS[newType]);
    }
    setShowTypePanel(false);
    setSourceExpanded(false);
    sourceAutoExpandedRef.current = false;
    setParseError(null);
    setAiError(null);
    setChatMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "assistant", content: `Switched to ${getDiagramTypeMeta(newType).label}. The canvas was reset to a starter template — tell me what to build next.` },
    ]);
  }, [diagramType, source]);

  const handleSwitchMermaidSubtype = useCallback((subtype: MermaidSubtype) => {
    if (subtype === mermaidSubtype) return;
    const meta = getMermaidSubtypeMeta(subtype);
    setMermaidSubtype(subtype);
    setSource(meta.starter);
    setParseError(null);
    setAiError(null);
    setChatMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "assistant", content: `Switched to ${meta.label} diagram. Tell me what to build and I'll generate it.` },
    ]);
  }, [mermaidSubtype]);

  const preset = useMemo(() => presetId === "custom" ? null : getPreset(presetId), [presetId]);
  const frameW = preset?.width ?? customExportWidth;
  const frameH = preset?.height ?? customExportHeight;
  const previewScale = Math.min(1.8, Math.max(0.4, zoom));

  const QUICK_PROMPTS: Partial<Record<DiagramType, string[]>> = {
    mermaid: getMermaidSubtypeMeta(mermaidSubtype).quickPrompts,
    excalidraw: ["Add more steps", "Create a user journey", "Sketch a system design"],
    reactflow: ["Add a decision node", "Build an org chart", "Add error path"],
    echarts: ["Change to line chart", "Add second series", "Make it a pie chart", "Add gradient colors"],
    nivo: ["Change to bar chart", "Add monthly data", "Use dark theme"],
    bpmn: ["Add approval gateway", "Add error boundary", "Add a swimlane"],
    tldraw: ["Add shapes", "Create a wireframe", "Add text labels"],
  };

  const sourceLabel = ["mermaid", "bpmn"].includes(diagramType) ? "Source" : "JSON Source";

  return (
    <div className="flex min-h-0 w-full flex-1 flex-row overflow-hidden bg-transparent">

      {/* Left: metadata, collapsible source, style, actions, AI chat — can hide for full-width diagram */}
      {leftPanelOpen && (
      <aside className="flex h-full min-h-0 w-[320px] shrink-0 flex-col border-r border-slate-200 bg-white">

        {/* Header */}
        <div className="shrink-0 border-b border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/app" className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors">← Projects</Link>
            <button
              type="button"
              onClick={() => setLeftPanelOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              title="Hide panel (⌘B)"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/></svg>
            </button>
          </div>
          <div className="mt-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 placeholder:font-normal placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
              placeholder="Untitled diagram"
            />
            <div className="mt-2 flex items-center gap-2">
              <span className={`h-2 w-2 shrink-0 rounded-full transition-colors ${
                saveState === "saved" ? "bg-emerald-400" : saveState === "saving" ? "bg-amber-400 animate-pulse" : "bg-slate-300"
              }`} />
              <span className="text-xs text-slate-400 flex-1">
                {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Unsaved changes"}
              </span>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || saveState === "saved"}
                className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>

        {/* Diagram type strip */}
        <div className="shrink-0 border-b border-slate-200 px-4 py-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Type</p>
          <div className="flex flex-wrap gap-1.5">
            {DIAGRAM_TYPE_META.map((dt) => (
              <button
                key={dt.id}
                type="button"
                onClick={() => handleSwitchType(dt.id)}
                title={dt.description}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  dt.id === diagramType
                    ? "border-indigo-300 bg-indigo-50 text-indigo-700 shadow-sm"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <DiagramTypeIcon type={dt.id} size={12} />
                {dt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mermaid subtype strip — only when mermaid is selected */}
        {diagramType === "mermaid" && (
          <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Subtype</p>
            <div className="flex flex-wrap gap-1">
              {MERMAID_SUBTYPE_META.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => handleSwitchMermaidSubtype(sub.id)}
                  title={sub.label}
                  className={`rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                    sub.id === mermaidSubtype
                      ? "border-indigo-300 bg-indigo-100 text-indigo-700"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Collapsible source (advanced / raw text) */}
        <div className="shrink-0 border-b border-slate-200">
          <button
            type="button"
            id={`source-toggle-${exportWrapId}`}
            aria-expanded={sourceExpanded}
            aria-controls={sourcePanelBodyId}
            onClick={() => {
              setSourceExpanded((prev) => {
                const next = !prev;
                if (!next && diagramType === "mermaid" && parseError) {
                  // If the user explicitly collapses while the diagram is invalid,
                  // don’t keep auto-reopening it on repeated render errors.
                  sourceSuppressAutoExpandRef.current = true;
                  sourceAutoExpandedRef.current = false;
                }
                if (next) {
                  sourceSuppressAutoExpandRef.current = false;
                }
                return next;
              });
            }}
            className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left hover:bg-slate-50 focus-visible:outline-none"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {sourceLabel}
            </span>
            <span className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
              {parseError && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">⚠ Error</span>}
              <span className={`text-slate-400 transition-transform ${sourceExpanded ? "rotate-180" : ""}`}>▼</span>
            </span>
          </button>
          {sourceExpanded && (
            <div
              id={sourcePanelBodyId}
              role="region"
              aria-labelledby={`source-toggle-${exportWrapId}`}
              className="flex flex-col border-t border-slate-100" style={{ height: '200px' }}
            >
              <textarea
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="min-h-0 h-full flex-1 resize-none bg-[#0d1117] px-4 py-3 text-[12.5px] leading-[1.65] text-[#e6edf3] caret-indigo-400 focus:outline-none"
              style={{ fontFamily: "ui-monospace, 'Fira Code', Menlo, Consolas, monospace" }}
                placeholder={diagramType === "mermaid" ? "flowchart LR\n  A --> B" : diagramType === "bpmn" ? "BPMN XML…" : `${diagramType} JSON…`}
                spellCheck={false}
              />
              {parseError && <div className="shrink-0 border-t border-red-900/20 bg-red-950/50 px-4 py-1.5 text-[11px] leading-snug text-red-300" style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{parseError}</div>}
            </div>
          )}
        </div>

        {/* Flowchart text style controls */}
        {diagramType === "mermaid" && (
          <div className="shrink-0 border-b border-slate-200">
            <button type="button" onClick={() => setShowStylePanel((p) => !p)} className="flex w-full items-center justify-between px-3 py-2 text-[11px] text-slate-500 hover:bg-slate-50">
              <span className="font-semibold uppercase tracking-wide">Style</span>
              <span>{showStylePanel ? "▲" : "▼"}</span>
            </button>
            {showStylePanel && (
              <div className="space-y-2 border-t border-slate-100 px-3 pb-3 pt-2">
                <div>
                  <label htmlFor="editor-mermaid-theme" className="block text-[10px] text-slate-500 mb-0.5">Theme</label>
                  <select id="editor-mermaid-theme" value={themeId} onChange={(e) => setThemeId(e.target.value)} className="w-full rounded border border-slate-200 px-2 py-1 text-xs">{THEMES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                </div>
                <div>
                  <label htmlFor="editor-mermaid-font" className="block text-[10px] text-slate-500 mb-0.5">Font</label>
                  <select id="editor-mermaid-font" value={fontId} onChange={(e) => setFontId(e.target.value)} className="w-full rounded border border-slate-200 px-2 py-1 text-xs">{FONT_OPTIONS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer"><input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} className="rounded" />Show grid overlay</label>
              </div>
            )}
          </div>
        )}

        {diagramType === "echarts" && (
          <div className="shrink-0 border-b border-slate-200">
            <button type="button" onClick={() => setShowEchartsStylePanel((p) => !p)} className="flex w-full items-center justify-between px-3 py-2 text-[11px] text-slate-500 hover:bg-slate-50">
              <span className="font-semibold uppercase tracking-wide">Quick style</span>
              <span>{showEchartsStylePanel ? "▲" : "▼"}</span>
            </button>
            {showEchartsStylePanel && (() => {
              const eo = parseEChartsJson(source);
              const fam = detectChartFamily(eo);
              const series0 = eo?.series && Array.isArray(eo.series) ? eo.series[0] : eo?.series;
              const labelShow = Boolean(series0 && typeof series0 === "object" && (series0 as { label?: { show?: boolean } }).label?.show);
              const legendShow = eo?.legend === undefined || eo?.legend === null || (typeof eo.legend === "object" && (eo.legend as { show?: boolean }).show !== false);
              const stacked = Boolean(series0 && typeof series0 === "object" && (series0 as { stack?: string }).stack);
              const yAxis = eo?.yAxis;
              const y0 = Array.isArray(yAxis) ? yAxis[0] : yAxis;
              const gridOn = typeof y0 === "object" && y0 !== null ? (y0 as { splitLine?: { show?: boolean } }).splitLine?.show !== false : true;
              const paletteKey = (Object.keys(COLOR_PALETTES).find((k) => {
                const pal = COLOR_PALETTES[k as keyof typeof COLOR_PALETTES];
                return Array.isArray(eo?.color) && eo!.color![0] === pal[0];
              }) ?? "indigo") as keyof typeof COLOR_PALETTES;
              return (
                <div className="space-y-2 border-t border-slate-100 px-3 pb-3 pt-2">
                  <div>
                    <label className="mb-0.5 block text-[10px] text-slate-500">Preview theme</label>
                    <select
                      value={echartsUiTheme}
                      onChange={(e) => setEchartsUiTheme(e.target.value as EChartsUiTheme)}
                      className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-0.5 block text-[10px] text-slate-500">Chart type</label>
                    <select
                      value={fam}
                      onChange={(e) => setSource(applyChartFamily(source, e.target.value as ChartFamilyId))}
                      className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                    >
                      <option value="bar">Bar</option>
                      <option value="line">Line</option>
                      <option value="area">Area</option>
                      <option value="pie">Pie</option>
                      <option value="donut">Donut</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-0.5 block text-[10px] text-slate-500">Color palette</label>
                    <select
                      value={paletteKey}
                      onChange={(e) => setSource(applyColorPalette(source, e.target.value as keyof typeof COLOR_PALETTES))}
                      className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                    >
                      {Object.keys(COLOR_PALETTES).map((k) => (
                        <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                    <input type="checkbox" checked={legendShow} onChange={(e) => setSource(toggleLegend(source, e.target.checked))} className="rounded" />
                    Show legend
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                    <input type="checkbox" checked={labelShow} onChange={(e) => setSource(toggleDataLabels(source, e.target.checked))} className="rounded" />
                    Data labels
                  </label>
                  {fam !== "pie" && fam !== "donut" && (
                    <>
                      <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                        <input type="checkbox" checked={stacked} onChange={(e) => setSource(toggleStack(source, e.target.checked))} className="rounded" />
                        Stack series
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                        <input type="checkbox" checked={gridOn} onChange={(e) => setSource(toggleSplitLine(source, e.target.checked))} className="rounded" />
                        Y grid lines
                      </label>
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        )}


        {/* AI Assistant */}
        <div className="flex min-h-0 flex-1 flex-col bg-white">
          <div className="shrink-0 border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">AI Assistant</h2>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs text-slate-400"><DiagramTypeIcon type={diagramType} size={11} />{diagramType === "mermaid" ? getMermaidSubtypeMeta(mermaidSubtype).label : typeMeta.label} · ⌘Enter</p>
              <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-slate-400">
                <input type="checkbox" checked={compactAiContext} onChange={(e) => setCompactAiContext(e.target.checked)} className="rounded" />
                Low cost
              </label>
            </div>
            {aiAssistantHint.kind === "byok" ? (
              <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs leading-snug text-emerald-800">
                ✓ Using your key · <span className="font-semibold">{aiAssistantHint.providerLabel}</span>
              </p>
            ) : aiAssistantHint.kind === "server" ? (
              <p className="mt-2 text-xs text-slate-400">Using server key.</p>
            ) : (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs leading-snug text-amber-900">
                <Link href="/app/settings" className="font-semibold underline underline-offset-2 hover:text-amber-950">
                  Add an API key
                </Link>{" "}
                — OpenAI, Gemini, Claude, Groq and more.
              </p>
            )}
          </div>

          <div ref={chatListRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${msg.role === "user" ? "bg-indigo-600 text-white rounded-br-sm" : "bg-slate-100 text-slate-800 rounded-bl-sm"}`}>{msg.content}</div>
              </div>
            ))}
            {aiLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-3">
                  <div className="flex gap-1.5">{[0, 150, 300].map((d) => <div key={d} className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d}ms` }} />)}</div>
                </div>
              </div>
            )}
          </div>

          {aiError && <div className="shrink-0 mx-4 mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{aiError}</div>}

          <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-2.5 flex flex-wrap gap-1.5">
            {(QUICK_PROMPTS[diagramType] ?? []).map((qp) => (
              <button key={qp} type="button" onClick={() => setChatInput(qp)} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">{qp}</button>
            ))}
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    void handleChatSend();
                  }
                }}
                placeholder="Describe what to build or change…"
                rows={3}
                data-ai-chat-input
                className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm leading-relaxed focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              <button type="button" onClick={() => void handleChatSend()} disabled={aiLoading || !chatInput.trim()} className="self-end rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50">
                {aiLoading ? "…" : "↑"}
              </button>
            </div>
          </div>
        </div>
      </aside>
      )}

      {/* Canvas — full width when left panel hidden */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {!leftPanelOpen && (
          <button
            type="button"
            onClick={() => setLeftPanelOpen(true)}
            className="absolute left-0 top-28 z-20 flex items-center rounded-r-lg border border-slate-200 border-l-0 bg-white py-4 pl-1 pr-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50"
            aria-label="Show tools and AI panel"
            title="Show tools & AI (⌘B)"
          >
            ›
          </button>
        )}
        <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
          {/* Zoom */}
          <div className="flex shrink-0 items-center gap-0.5">
            <button type="button" onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))} className="rounded px-1.5 py-1 text-xs text-slate-500 hover:bg-slate-100">−</button>
            <span className="w-11 text-center text-xs tabular-nums text-slate-600">{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom((z) => Math.min(3, z + 0.1))} className="rounded px-1.5 py-1 text-xs text-slate-500 hover:bg-slate-100">+</button>
            <button type="button" onClick={() => setZoom(1)} className="rounded px-1.5 py-1 text-xs text-slate-400 hover:bg-slate-100" title="Reset zoom">↺</button>
          </div>
          <div className="h-4 w-px shrink-0 bg-slate-200" />
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-slate-500">
            <DiagramTypeIcon type={diagramType} size={13} />
            <span className="font-medium">
              {diagramType === "mermaid" ? getMermaidSubtypeMeta(mermaidSubtype).label : typeMeta.label}
            </span>
          </span>
          {(["mermaid", "reactflow", "nivo", "bpmn"] as DiagramType[]).includes(diagramType) && (
            <>
              <div className="h-4 w-px shrink-0 bg-slate-200" />
              <div className="flex shrink-0 items-center gap-1.5">
                <select
                  value={presetId}
                  onChange={(e) => setPresetId(e.target.value as SocialPresetId)}
                  className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:border-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  aria-label="Canvas size preset"
                >
                  {SOCIAL_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                  <option value="custom">Custom</option>
                </select>
                <span className="text-xs tabular-nums text-slate-400" aria-label="Export dimensions">
                  {frameW}×{frameH}
                </span>
              </div>
            </>
          )}
          {/* Right-side actions */}
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            {showWatermark && (
              <span className="rounded border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">Free plan</span>
            )}
            <button
              type="button"
              onClick={() => { const prev = previousSourceRef.current; if (prev === source) return; previousSourceRef.current = source; setSource(prev); }}
              title="Undo last AI change"
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
            >
              ↩ Undo
            </button>
            <button
              type="button"
              onClick={() => void handleShare()}
              disabled={isSharing}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {isSharing ? "…" : "Share"}
            </button>
            <div className="relative" data-export-menu-root>
              <button
                type="button"
                onClick={() => setExportOpen((p) => !p)}
                disabled={isExporting}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                aria-expanded={exportOpen}
              >
                {isExporting ? "…" : "Export ▾"}
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full z-30 mt-1 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => void handleExport("png")} className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">PNG</button>
                    <button type="button" onClick={() => void handleExport("svg")} className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">SVG</button>
                    {diagramType === "mermaid" && (
                      <button type="button" onClick={() => void handleExport("zip")} className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50" title="All social presets">ZIP</button>
                    )}
                  </div>
                  {["mermaid", "reactflow", "nivo", "bpmn"].includes(diagramType) && (
                    <div className="mt-3 grid gap-2">
                      <div>
                        <label htmlFor="editor-export-preset" className="mb-1 block text-[11px] font-medium text-slate-500">Canvas size</label>
                        <select id="editor-export-preset" value={presetId} onChange={(e) => setPresetId(e.target.value as SocialPresetId)} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs">
                          {SOCIAL_PRESETS.map((p) => (<option key={p.id} value={p.id}>{p.label} ({p.width}×{p.height})</option>))}
                          <option value="custom">Custom…</option>
                        </select>
                      </div>
                      {presetId === "custom" && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label htmlFor="editor-export-custom-w" className="mb-1 block text-[11px] font-medium text-slate-500">Width</label>
                            <input id="editor-export-custom-w" type="number" inputMode="numeric" min={200} max={8192} value={customExportWidth} onChange={(e) => setCustomExportWidth(Math.max(200, Math.min(8192, Math.round(Number(e.target.value) || 0))))} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs" />
                          </div>
                          <div>
                            <label htmlFor="editor-export-custom-h" className="mb-1 block text-[11px] font-medium text-slate-500">Height</label>
                            <input id="editor-export-custom-h" type="number" inputMode="numeric" min={200} max={8192} value={customExportHeight} onChange={(e) => setCustomExportHeight(Math.max(200, Math.min(8192, Math.round(Number(e.target.value) || 0))))} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1">
                      <label htmlFor="editor-export-scale" className="mb-1 block text-[11px] font-medium text-slate-500">PNG scale</label>
                      <select id="editor-export-scale" value={pngScale} onChange={(e) => setPngScale(Number(e.target.value) as 1 | 2 | 3)} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs">
                        <option value={1}>1×</option><option value={2}>2×</option><option value={3}>3×</option>
                      </select>
                    </div>
                    {diagramType === "mermaid" && (
                      <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                        <input type="checkbox" checked={zipIncludeCustom} onChange={(e) => setZipIncludeCustom(e.target.checked)} className="rounded" />
                        Add custom
                      </label>
                    )}
                  </div>
                  {["excalidraw", "tldraw"].includes(diagramType) && (
                    <p className="mt-2 text-[10px] leading-snug text-slate-400">Native canvas export — custom sizes don&apos;t apply.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className={
            diagramType === "bpmn"
              ? "flex min-h-0 flex-1 items-stretch justify-center overflow-auto bg-transparent p-3"
              : "flex min-h-0 flex-1 items-start justify-center overflow-auto bg-transparent p-3"
          }
        >
          {diagramType === "mermaid" && (
            <div
              ref={mermaidViewportRef}
              className={`h-full w-full overflow-auto rounded-xl ${isMermaidPanning ? "cursor-grabbing" : "cursor-grab"}`}
              onMouseDown={(e) => {
                if (e.button !== 0 || !mermaidViewportRef.current) return;
                const el = mermaidViewportRef.current;
                mermaidPanStartRef.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
                setIsMermaidPanning(true);
              }}
              onMouseMove={(e) => {
                const start = mermaidPanStartRef.current;
                const el = mermaidViewportRef.current;
                if (!start || !el) return;
                el.scrollLeft = start.left - (e.clientX - start.x);
                el.scrollTop = start.top - (e.clientY - start.y);
              }}
              onMouseUp={() => {
                mermaidPanStartRef.current = null;
                setIsMermaidPanning(false);
              }}
              onMouseLeave={() => {
                mermaidPanStartRef.current = null;
                setIsMermaidPanning(false);
              }}
            >
              <div style={{ transform: `scale(${previewScale})`, transformOrigin: "top left", width: "max-content", height: "max-content", padding: "12px" }}>
                <div
                  ref={frameRef}
                  style={{
                    width: `${frameW}px`,
                    aspectRatio: `${frameW} / ${frameH}`,
                    backgroundColor: bgColor,
                    backgroundImage: showGrid ? "radial-gradient(circle, #c8c8c8 1px, transparent 1px)" : undefined,
                    backgroundSize: showGrid ? "24px 24px" : undefined,
                    fontFamily: selectedFont.cssValue,
                  }}
                  className="relative overflow-hidden rounded-xl shadow-xl"
                >
                  <div ref={innerRef} className="flex min-h-full w-full items-center justify-center p-8 overflow-hidden" />
                  {showWatermark && <div data-no-export className="absolute bottom-3 right-4 text-[10px] opacity-30 text-slate-600 font-medium select-none">Made with Flowchart Studio</div>}
                </div>
              </div>
            </div>
          )}
          {diagramType === "excalidraw" && <div className="w-full h-full rounded-xl overflow-hidden shadow-xl bg-white" style={{ minHeight: "600px" }}><ExcalidrawRenderer source={source} onChange={setSource} /></div>}
          {diagramType === "reactflow" && (
            <div
              ref={frameRef}
              className="rounded-xl overflow-hidden shadow-xl bg-white"
              style={{ width: `${frameW}px`, height: `${frameH}px`, transform: `scale(${previewScale})`, transformOrigin: "top center" }}
            >
              <ReactFlowRenderer source={source} onChange={setSource} />
            </div>
          )}
          {diagramType === "echarts" && (
            <div
              ref={frameRef}
              className="rounded-xl overflow-hidden shadow-xl bg-white"
              style={{ width: "900px", height: "600px", transform: `scale(${previewScale})`, transformOrigin: "top center" }}
            >
              <EChartsRenderer ref={echartsRef} source={source} onChange={setSource} uiTheme={echartsUiTheme} />
            </div>
          )}
          {diagramType === "nivo" && (
            <div
              ref={frameRef}
              className="rounded-xl overflow-hidden shadow-xl bg-white"
              style={{ width: `${frameW}px`, height: `${frameH}px`, transform: `scale(${previewScale})`, transformOrigin: "top center" }}
            >
              <NivoRenderer source={source} />
            </div>
          )}
          {diagramType === "tldraw" && <div className="w-full h-full rounded-xl overflow-hidden shadow-xl" style={{ minHeight: "600px" }}><TldrawRenderer source={source} onChange={setSource} /></div>}
          {diagramType === "bpmn" && (
            <div className="flex h-full min-h-0 w-full max-w-full flex-col self-stretch">
              <div
                ref={frameRef}
                className="flex h-full min-h-[520px] flex-1 flex-col overflow-hidden rounded-xl bg-white shadow-xl"
                style={{ transform: `scale(${previewScale})`, transformOrigin: "top center" }}
              >
                <div className="min-h-0 flex-1">
                  <BpmnRenderer source={source} onChange={setSource} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-5 py-3 text-sm text-white shadow-xl animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
