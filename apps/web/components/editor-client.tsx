"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import mermaid from "mermaid";
import { toPng, toSvg } from "html-to-image";
import JSZip from "jszip";
import { Logo } from "@/components/logo";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  Sparkles,
  ArrowUp,
  Bot,
  Undo,
  Redo,
  Share2,
  Settings2,
  Play,
  CheckCircle2,
  AlertCircle,
  Circle,
  Loader2,
  ChevronDown,
  MessageSquare,
  Clock,
  Palette,
  Code2,
  Wand2,
  Paintbrush,
  Search,
  ChevronUp,
  X,
  Moon,
  Sun,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  type UseCaseId,
} from "@flowchart/core";
import Link from "next/link";
import { DiagramTypeIcon } from "@/components/diagram-icon";
import { highlightSource } from "@/lib/source-highlight";
import { applyPatch } from "@/lib/agent-tools";
import { matchTemplateId } from "@/lib/template-match";
import { TEMPLATES } from "@/lib/templates";
import type { Template } from "@/lib/templates";
import { usePresence, presenceColor } from "@/lib/use-presence";
import { saveProject, createProject, listRevisions, restoreRevision } from "@/app/actions/project";
import { getBrandKit } from "@/app/actions/brand-kit";
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
const CloudRenderer = dynamic(
  () => import("./diagrams/cloud-renderer").then((m) => ({ default: m.CloudRenderer })),
  { ssr: false, loading: () => <CanvasLoader label="Architecture" /> }
);
const ErdRenderer = dynamic(
  () => import("./diagrams/erd-renderer").then((m) => ({ default: m.ErdRenderer })),
  { ssr: false, loading: () => <CanvasLoader label="Schema" /> }
);
const OrgChartRenderer = dynamic(
  () => import("./diagrams/orgchart-renderer").then((m) => ({ default: m.OrgChartRenderer })),
  { ssr: false, loading: () => <CanvasLoader label="Org chart" /> }
);
const SocialCardRenderer = dynamic(
  () => import("./diagrams/social-card-renderer").then((m) => ({ default: m.SocialCardRenderer })),
  { ssr: false, loading: () => <CanvasLoader label="Card" /> }
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
type UiState = { showGrid?: boolean; fontId?: string; paletteId?: string; customBackground?: string; customAccent?: string; backgroundPattern?: string };
type FontOption = { id: string; label: string; cssValue: string };
type ReactFlowSourceNode = {
  id: string;
  data?: Record<string, unknown>;
  style?: Record<string, unknown>;
  [key: string]: unknown;
};

const FONT_OPTIONS: FontOption[] = [
  { id: "geist", label: "Geist Sans", cssValue: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif" },
  { id: "inter", label: "Inter", cssValue: "Inter, ui-sans-serif, system-ui, sans-serif" },
  { id: "mono", label: "Geist Mono", cssValue: "var(--font-geist-mono), ui-monospace, monospace" },
  { id: "serif", label: "System Serif", cssValue: "ui-serif, Georgia, Cambria, serif" },
];

const UI_META_PREFIX = "%% ui:";
const UNDO_LIMIT = 50;

const BRACKET_PAIRS: Record<string, string> = {
  "(": ")",
  "[": "]",
  "{": "}",
  '"': '"',
  "'": "'",
  "`": "`",
};
const BRACKET_CLOSERS = new Set(Object.values(BRACKET_PAIRS));
const BRACKET_OPENERS = new Set(Object.keys(BRACKET_PAIRS));

function caretFromOffset(value: string, offset: number): { line: number; col: number } {
  const before = value.slice(0, offset);
  const newlineIdx = before.lastIndexOf("\n");
  const line = (before.match(/\n/g)?.length ?? 0) + 1;
  const col = offset - newlineIdx;
  return { line, col };
}

function cloudNeedsLayout(src: string): boolean {
  try {
    const d = JSON.parse(src) as { nodes?: { position?: unknown }[] };
    return Array.isArray(d?.nodes) && d.nodes.length > 0 && d.nodes.every((n) => !n.position);
  } catch {
    return false;
  }
}

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

function matchTemplate(prompt: string): Template | null {
  const id = matchTemplateId(prompt);
  return id ? (TEMPLATES.find((t) => t.id === id) ?? null) : null;
}

type Props = {
  initialSource: string;
  initialThemeId: string;
  initialTitle: string;
  initialDiagramType: DiagramType;
  projectId: string | null;
  showWatermark: boolean;
  aiAssistantHint?: AiAssistantHint;
  isExample?: boolean;
  creditsBalance?: number;
  initialPrompt?: string | null;
  userEmail?: string;
  userName?: string;
};

export function EditorClient({
  initialSource,
  initialThemeId,
  initialTitle,
  initialDiagramType,
  projectId,
  showWatermark,
  aiAssistantHint = { kind: "none" },
  isExample = false,
  creditsBalance,
  initialPrompt,
  userEmail = "user@example.com",
  userName = "You",
}: Props) {
  const parsedInitial = useMemo(() => parseUiFromSource(initialSource), [initialSource]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(projectId);
  const [source, setSource] = useState(parsedInitial.source);
  const [themeId, setThemeId] = useState(initialThemeId);
  const [title, setTitle] = useState(initialTitle);
  const [diagramType, setDiagramType] = useState<DiagramType>(initialDiagramType);
  const [presetId, setPresetId] = useState<SocialPresetId>("square_feed");
  const [useCaseId, setUseCaseId] = useState<UseCaseId>("custom");
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
  const [showBgPanel, setShowBgPanel] = useState(false);
  const [backgroundPattern, setBackgroundPattern] = useState<"none" | "dots" | "grid" | "lines">(
    (parsedInitial.ui.backgroundPattern as "none" | "dots" | "grid" | "lines") ?? "none"
  );
  const [echartsUiTheme, setEchartsUiTheme] = useState<EChartsUiTheme>("light");
  /** Raw source hidden by default; power users expand. Opens automatically on parse errors. */
  const [sourceExpanded, setSourceExpanded] = useState(true);
  /** Active Mermaid subtype — only used when diagramType === "mermaid" */
  const [mermaidSubtype, setMermaidSubtype] = useState<MermaidSubtype>("flowchart");
  /** Tools / chat column — hide for focus on diagram (persisted). */
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [sourcePanelOpen, setSourcePanelOpen] = useState(false);
  const [sourceCaret, setSourceCaret] = useState<{ line: number; col: number }>({ line: 1, col: 1 });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCaseSensitive, setSearchCaseSensitive] = useState(false);
  const [searchActiveIdx, setSearchActiveIdx] = useState(0);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replaceQuery, setReplaceQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const [agentTasks, setAgentTasks] = useState<{ id: string; label: string; status: "pending" | "loading" | "completed" }[]>([]);
  const [compactAiContext, setCompactAiContext] = useState(false);
  const [isAgentMode, setIsAgentMode] = useState(false);
  const [forceCreateNext, setForceCreateNext] = useState(false);
  const [pendingRevisionLabel, setPendingRevisionLabel] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [revisions, setRevisions] = useState<{ id: string; label: string | null; createdAt: Date }[]>([]);
  const [revisionsDirty, setRevisionsDirty] = useState(0);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [applyingBrand, setApplyingBrand] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [suggestedTemplate, setSuggestedTemplate] = useState<Template | null>(null);
  const [pendingSuggestInput, setPendingSuggestInput] = useState<string>("");
  const presenceOthers = usePresence(currentProjectId, userEmail, userName);
  const [input, setInput] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [toolEffects, setToolEffects] = useState<Record<string, { status: "applied" | "noop" | "error"; label: string; detail?: string }>>({});
  const brandKitInFlight = useRef<Set<string>>(new Set());

  const bodyRef = useRef<Record<string, unknown>>({});
  useEffect(() => {
    bodyRef.current = {
      diagramType,
      themeId,
      title,
      currentSource: source.slice(0, compactAiContext ? 800 : 2000),
      diagramSummary: summarizeDiagramSource(diagramType, source),
      compact: compactAiContext,
      useCaseId,
      mode: forceCreateNext || !source.trim() ? "create" : "patch",
    };
  });

  useEffect(() => {
    const stored = localStorage.getItem("flowstudio-dark-mode");
    if (stored !== null) {
      setDarkMode(stored === "true");
    } else {
      setDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("flowstudio-dark-mode", String(darkMode));
  }, [darkMode]);

  // useChat binds the transport once; a useMemo keyed on isAgentMode does NOT
  // re-route after the toggle flips. Route per-request via a ref instead so the
  // Agent Mode toggle actually reaches /api/ai/agent.
  const isAgentModeRef = useRef(isAgentMode);
  isAgentModeRef.current = isAgentMode;
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ai/generate",
        prepareSendMessagesRequest: ({ messages, body }) => ({
          api: isAgentModeRef.current ? "/api/ai/agent" : "/api/ai/generate",
          body: { messages, ...bodyRef.current, ...(body ?? {}) },
        }),
      }),
    []
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getMessageText = (m: any): string =>
    Array.isArray(m?.parts)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? m.parts.filter((p: any) => p?.type === "text").map((p: any) => p.text ?? "").join("")
      : "";

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
    onFinish: async ({ message }) => {
      const text = getMessageText(message);
      if (text.trim()) {
        let cleaned = cleanModelOutput(text);
        if (cleaned && cleaned.trim() !== source.trim()) {
          if (diagramType === "cloud" && cloudNeedsLayout(cleaned)) {
            cleaned = await (await import("./diagrams/cloud-renderer")).autoLayoutCloud(cleaned);
          } else if (diagramType === "erd" && cloudNeedsLayout(cleaned)) {
            cleaned = await (await import("./diagrams/erd-renderer")).autoLayoutErd(cleaned);
          } else if (diagramType === "orgchart" && cloudNeedsLayout(cleaned)) {
            cleaned = await (await import("./diagrams/orgchart-renderer")).autoLayoutOrgChart(cleaned);
          }
          recordUndo(source);
          setSource(cleaned);
        }
      }
      setAgentTasks((prev) => prev.map(t => t.id === "generate" ? { ...t, status: "completed" } : t));
      showToast("Diagram updated · ⌘Z to undo");
      const lastUserMsg = messages.filter((m) => m.role === "user").slice(-1)[0];
      const lastUserInput = lastUserMsg ? getMessageText(lastUserMsg).trim() : "";
      const promptSnippet = lastUserInput.slice(0, 60);
      const aiLabel = forceCreateNext
        ? `AI regenerated${promptSnippet ? `: ${promptSnippet}` : ""}`
        : `AI patched${promptSnippet ? `: ${promptSnippet}` : ""}`;
      setSuggestedTemplate(null);
      setPendingRevisionLabel(aiLabel);
      void handleSave(aiLabel);
      if (forceCreateNext) setForceCreateNext(false);
    },
    onError: (err) => {
      console.error("[ai-chat]", err);
      setAgentTasks([]);
      if (forceCreateNext) setForceCreateNext(false);
      showToast("Could not update diagram — see console");
    },
  });

  const aiLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (status === "streaming") {
      setAgentTasks([
        { id: "intent", label: "Analyzing intent...", status: "completed" },
        { id: "structure", label: "Planning structure...", status: "completed" },
        { id: "generate", label: "Streaming diagram...", status: "loading" },
      ]);
    }
  }, [status]);

  const sendChatMessage = useCallback((text: string) => {
    void sendMessage({ text });
  }, [sendMessage]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const streamData = useMemo<any[]>(() => {
    const out: unknown[] = [];
    for (const m of messages) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parts: any[] = Array.isArray((m as { parts?: unknown[] }).parts) ? (m as { parts: unknown[] }).parts as any[] : [];
      for (const p of parts) {
        if (p?.type === "data-meta" && p.data) out.push(p.data);
      }
    }
    return out;
  }, [messages]);

  const [assumptionBanner, setAssumptionBanner] = useState<string | null>(null);

  // Handle incoming data stream (replacing experimental_onData)
  useEffect(() => {
    if (!streamData || streamData.length === 0) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta = streamData[0] as any;
    if (!meta) return;
    
    if (meta.suggestedPresetId) {
      const inferredUseCase: UseCaseId =
        meta.suggestedPresetId === "landscape" ? "presentation" :
        (["square_feed", "vertical_feed", "story_reel"].includes(meta.suggestedPresetId) ? "social" : "custom");
      setUseCaseId(inferredUseCase);
      setPresetId(meta.suggestedPresetId);
    }
    if (meta.typeSwitched && meta.diagramType) {
      setDiagramType(meta.diagramType);
      if (meta.diagramType === "mermaid") setMermaidSubtype("flowchart");
    }
    if (meta.assistantMessage) {
      setAiNotice(meta.assistantMessage);
    }
    // D-09/D-10: formatted "Generated as: …" banner after silent generation only.
    // Skip the banner for patch responses — assistantMessage already says "Patched existing diagram".
    if (meta.needsClarification === false && meta.resolvedSubtype && meta.generationMode !== "patch") {
      const detail = typeof meta.detailLevel === "string"
        ? meta.detailLevel.charAt(0).toUpperCase() + meta.detailLevel.slice(1)
        : "Medium";
      // Use newly inferred preset from this response if present, otherwise current state
      const activePresetId: SocialPresetId | "custom" = meta.suggestedPresetId ?? presetId;
      const activePreset = activePresetId === "custom" ? null : getPreset(activePresetId as SocialPresetId);
      const presetLabel = activePreset?.label ?? "Custom";
      setAssumptionBanner(`Generated as: ${meta.resolvedSubtype} · ${presetLabel} · ${detail} detail`);
    }
  }, [streamData, presetId]);

  // D-12: auto-dismiss assumption banner after 8 seconds
  useEffect(() => {
    if (!assumptionBanner) return;
    const t = setTimeout(() => setAssumptionBanner(null), 8000);
    return () => clearTimeout(t);
  }, [assumptionBanner]);

  // Server-side validation may emit a corrected source after the stream
  // ends (when the model's first attempt fails structural checks). Apply
  // it, replacing the in-progress streamed text.
  useEffect(() => {
    if (!streamData || streamData.length === 0) return;
    for (const entry of streamData) {
      const e = entry as { correctedSource?: string; validationRepaired?: boolean; validationFailed?: boolean; validationReason?: string };
      if (e?.validationRepaired && typeof e.correctedSource === "string" && e.correctedSource.length > 5) {
        setSource(e.correctedSource);
        setToast("AI output had a structural issue — automatically repaired.");
        setTimeout(() => setToast(null), 3000);
        break;
      }
      if (e?.validationFailed && e?.validationReason) {
        setToast(`AI output may be invalid: ${e.validationReason.slice(0, 80)}`);
        setTimeout(() => setToast(null), 3000);
        break;
      }
    }
  }, [streamData]);

  // Sync source with streaming AI response
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "assistant" && aiLoading) {
      const cleaned = cleanModelOutput(getMessageText(lastMessage));
      if (cleaned && cleaned.length > 5) {
        setSource(cleaned);
      }
    }
  }, [messages, aiLoading]);

  // Keep sourceRef current so tool effects can read latest source without stale closures.
  useEffect(() => { sourceRef.current = source; }, [source]);

  const lastGoodSvgRef = useRef<string | null>(null);
  const renderSeqRef = useRef(0);

  const recordUndo = useCallback((snapshot: string) => {
    setUndoStack(prev => {
      if (prev[prev.length - 1] === snapshot) return prev;
      return [...prev.slice(-(UNDO_LIMIT - 1)), snapshot];
    });
    setRedoStack([]);
  }, []);

  const handleUndo = useCallback(() => {
    setUndoStack(prev => {
      if (!prev.length) return prev;
      const snapshot = prev[prev.length - 1];
      setRedoStack(r => [sourceRef.current, ...r].slice(0, UNDO_LIMIT));
      setSource(snapshot);
      return prev.slice(0, -1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setRedoStack(prev => {
      if (!prev.length) return prev;
      const snapshot = prev[0];
      setUndoStack(u => [...u, sourceRef.current].slice(-UNDO_LIMIT));
      setSource(snapshot);
      return prev.slice(1);
    });
  }, []);

  const searchMatches = useMemo(() => {
    if (!searchQuery) return [] as number[];
    const hay = searchCaseSensitive ? source : source.toLowerCase();
    const needle = searchCaseSensitive ? searchQuery : searchQuery.toLowerCase();
    if (!needle) return [];
    const out: number[] = [];
    let i = 0;
    while (i <= hay.length - needle.length) {
      const idx = hay.indexOf(needle, i);
      if (idx === -1) break;
      out.push(idx);
      i = idx + Math.max(1, needle.length);
    }
    return out;
  }, [source, searchQuery, searchCaseSensitive]);

  useEffect(() => {
    if (searchActiveIdx >= searchMatches.length && searchMatches.length > 0) {
      setSearchActiveIdx(0);
    }
  }, [searchMatches.length, searchActiveIdx]);

  const focusMatch = useCallback((idx: number) => {
    const ta = sourceTextareaRef.current;
    if (!ta || searchMatches.length === 0) return;
    const safe = ((idx % searchMatches.length) + searchMatches.length) % searchMatches.length;
    const start = searchMatches[safe];
    const end = start + searchQuery.length;
    setSearchActiveIdx(safe);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start, end);
      const before = source.slice(0, start);
      const line = (before.match(/\n/g)?.length ?? 0) + 1;
      const lineHeight = 20;
      const scroller = sourceScrollRef.current;
      if (scroller) {
        const target = (line - 1) * lineHeight - 60;
        if (target < scroller.scrollTop || target > scroller.scrollTop + scroller.clientHeight - 80) {
          scroller.scrollTop = Math.max(0, target);
        }
      }
      setSourceCaret(caretFromOffset(source, end));
    });
  }, [searchMatches, searchQuery, source]);

  const replaceCurrent = useCallback(() => {
    if (searchMatches.length === 0) return;
    const start = searchMatches[searchActiveIdx] ?? searchMatches[0];
    const end = start + searchQuery.length;
    recordUndo(source);
    const next = source.slice(0, start) + replaceQuery + source.slice(end);
    setSource(next);
    requestAnimationFrame(() => {
      const ta = sourceTextareaRef.current;
      if (!ta) return;
      const caret = start + replaceQuery.length;
      ta.focus();
      ta.setSelectionRange(caret, caret);
      setSourceCaret(caretFromOffset(next, caret));
    });
  }, [searchMatches, searchActiveIdx, searchQuery, replaceQuery, source, recordUndo]);

  const replaceAll = useCallback(() => {
    if (searchMatches.length === 0) return;
    recordUndo(source);
    let next = "";
    let cursor = 0;
    for (const start of searchMatches) {
      next += source.slice(cursor, start) + replaceQuery;
      cursor = start + searchQuery.length;
    }
    next += source.slice(cursor);
    setSource(next);
  }, [searchMatches, searchQuery, replaceQuery, source, recordUndo]);

  const openSearch = useCallback(() => {
    setSourcePanelOpen(true);
    setSearchOpen(true);
    const ta = sourceTextareaRef.current;
    if (ta && ta.selectionStart !== ta.selectionEnd) {
      const selected = ta.value.slice(ta.selectionStart, ta.selectionEnd);
      if (selected && !selected.includes("\n")) setSearchQuery(selected);
    }
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    });
  }, []);

  // Keyboard shortcuts: Cmd/Ctrl+Z = undo, Cmd/Ctrl+Shift+Z or Ctrl+Y = redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo(); else handleUndo();
      }
      if (e.key === "y") { e.preventDefault(); handleRedo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo, handleRedo]);

  const [aiError, setAiError] = useState<string | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
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
  const sourceScrollRef = useRef<HTMLDivElement>(null);
  const sourceTextareaRef = useRef<HTMLTextAreaElement>(null);
  const mermaidPanStartRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const chatListRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef(source);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const sourceAutoExpandedRef = useRef(false);
  const sourceSuppressAutoExpandRef = useRef(false);
  const lastSavedSnapshot = useRef(
    isExample
      ? JSON.stringify({ source: parsedInitial.source, themeId: initialThemeId, title: initialTitle })
      : ""
  );
  const hasHydratedRef = useRef(false);
  const promptAppendedRef = useRef(false);

  useEffect(() => {
    if (initialPrompt && !promptAppendedRef.current) {
      promptAppendedRef.current = true;
      setTimeout(() => {
        setLeftPanelOpen(true);
        sendChatMessage(initialPrompt);
      }, 100);
    }
  }, [initialPrompt, sendChatMessage]);

  const typeMeta = useMemo(() => getDiagramTypeMeta(diagramType), [diagramType]);
  const theme = useMemo(() => THEMES.find((t) => t.id === themeId) ?? THEMES[0], [themeId]);
  const selectedFont = useMemo(() => FONT_OPTIONS.find((x) => x.id === fontId) ?? FONT_OPTIONS[0], [fontId]);
  const bgColor = paletteId === "default" ? (theme.themeVariables.background ?? "#f8fafc") : customBackground;
  const accentColor = paletteId === "default" ? (theme.themeVariables.primaryColor ?? "#6366f1") : customAccent;
  const uiState = useMemo(() => ({ showGrid, fontId, paletteId, customBackground, customAccent, backgroundPattern }), [showGrid, fontId, paletteId, customBackground, customAccent, backgroundPattern]);
  const sourceWithUi = useMemo(() => diagramType === "mermaid" ? embedUiInSource(source, uiState) : source, [source, uiState, diagramType]);

  // Initialize Mermaid when theme OR brand-applied palette changes. Brand-kit
  // colors override the active theme's primary/background so applying a brand
  // kit visually changes the Mermaid diagram, not just the canvas background.
  useEffect(() => {
    if (diagramType !== "mermaid") return;
    const base = buildMermaidConfig(theme);
    const brandOverrides =
      paletteId !== "default"
        ? {
            primaryColor: customAccent,
            primaryBorderColor: customAccent,
            lineColor: customAccent,
            background: customBackground,
          }
        : {};
    mermaid.initialize({
      ...base,
      themeVariables: { ...base.themeVariables, ...brandOverrides },
      startOnLoad: false,
      suppressErrorRendering: true,
    });
  }, [theme, diagramType, paletteId, customAccent, customBackground]);

  const [mermaidRenderError, setMermaidRenderError] = useState<string | null>(null);

  // Live Mermaid preview — renders the active source into the preview canvas.
  // Streaming-aware: validates with mermaid.parse() before rendering, and on
  // parse failure (common during AI streaming) it keeps the last good render
  // visible so the canvas doesn't flicker to empty between chunks.
  useEffect(() => {
    if (diagramType !== "mermaid") return;
    const node = innerRef.current;
    if (!node) return;
    const trimmed = source.trim();
    if (!trimmed) {
      node.innerHTML = "";
      lastGoodSvgRef.current = null;
      setMermaidRenderError(null);
      return;
    }
    // Debounce while AI is actively streaming to avoid re-rendering on every
    // chunk. Render immediately when not streaming so manual edits feel snappy.
    const delay = aiLoading ? 120 : 0;
    const seq = ++renderSeqRef.current;
    const t = setTimeout(() => {
      void (async () => {
        try {
          // Cheap validity check first — avoids the expensive render+throw cycle
          // on partial streamed source.
          await mermaid.parse(trimmed);
          const { svg } = await mermaid.render(`m${seq}-${Math.floor(Math.random() * 1e9)}`, trimmed);
          if (seq !== renderSeqRef.current) return;
          lastGoodSvgRef.current = svg;
          node.innerHTML = svg;
          setMermaidRenderError(null);
        } catch (e) {
          if (seq !== renderSeqRef.current) return;
          const msg = e instanceof Error ? e.message.split("\n")[0] : "Invalid Mermaid syntax";
          // Mid-stream: keep last good silently. Otherwise surface the error so
          // the user knows their manual edit broke parsing.
          if (aiLoading) {
            if (!lastGoodSvgRef.current) node.innerHTML = "";
          } else {
            setMermaidRenderError(msg);
            if (!lastGoodSvgRef.current) node.innerHTML = "";
          }
        }
      })();
    }, delay);
    return () => clearTimeout(t);
  }, [source, diagramType, aiLoading, theme, paletteId, customAccent, customBackground]);
  // When loading an existing project, lastSavedSnapshot starts as "" — treat that as "saved" so we don't show "Unsaved" before any changes.
  const isDirty = useMemo(() => {
    if (lastSavedSnapshot.current === "" && projectId !== null) return false;
    return JSON.stringify({ source: sourceWithUi, themeId, title }) !== lastSavedSnapshot.current;
  }, [sourceWithUi, themeId, title, projectId]);
  /** Derive from isDirty + saving — avoid useEffect(setState) on isDirty (can contribute to update loops). */
  const saveState: "saved" | "saving" | "unsaved" = saving ? "saving" : isDirty ? "unsaved" : "saved";

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); }, []);

  const handleAutoLayout = useCallback(async () => {
    try {
      let next = source;
      if (diagramType === "reactflow") {
        next = await (await import("./diagrams/reactflow-renderer")).autoLayoutReactFlow(source);
      } else if (diagramType === "cloud") {
        next = await (await import("./diagrams/cloud-renderer")).autoLayoutCloud(source);
      } else if (diagramType === "erd") {
        next = await (await import("./diagrams/erd-renderer")).autoLayoutErd(source);
      } else if (diagramType === "orgchart") {
        next = await (await import("./diagrams/orgchart-renderer")).autoLayoutOrgChart(source);
      } else if (diagramType === "bpmn") {
        next = await (await import("./diagrams/bpmn-renderer")).autoLayoutBpmn(source);
      } else {
        return;
      }
      if (next === source) {
        showToast("Layout unchanged");
        return;
      }
      recordUndo(source);
      setSource(next);
      showToast("Auto-layout applied · ⌘Z to undo");
    } catch (e) {
      console.error("[auto-layout]", e);
      showToast("Could not auto-layout");
    }
  }, [diagramType, source, recordUndo, showToast]);

  const handleApplyBrandKit = useCallback(async (): Promise<boolean> => {
    setApplyingBrand(true);
    try {
      const kit = await getBrandKit();
      if (!kit || !kit.palette) {
        showToast("No brand kit yet — set one in Settings");
        return false;
      }
      recordUndo(source);
      setCustomAccent(kit.palette.primary);
      if (kit.palette.background) setCustomBackground(kit.palette.background);
      setPaletteId("brand");
      showToast(`Applied "${kit.name}" · ⌘Z to undo`);
      return true;
    } catch (e) {
      console.error("[brand-kit]", e);
      showToast("Could not apply brand kit");
      return false;
    } finally {
      setApplyingBrand(false);
    }
  }, [source, recordUndo, showToast]);

  const cleanModelOutput = (text: string) => {
    // Strip markdown code blocks
    let cleaned = text.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "");
    // Strip metadata prefix if AI included it in stream
    if (cleaned.includes(UI_META_PREFIX)) {
      cleaned = cleaned.split("\n").slice(1).join("\n");
    }
    return cleaned.trim();
  };

  const handleNodeClick = useCallback((nodeId: string) => {
    setInput(`Edit node [${nodeId}]: `);
  }, [setInput]);

  // Keyboard shortcuts
  const handleSave = useCallback(async (labelOverride?: string) => {
    if (saving) return;
    setSaving(true);
    try {
      const sourceToSave = diagramType === "mermaid" ? embedUiInSource(source, uiState) : source;
      const label = labelOverride ?? pendingRevisionLabel ?? undefined;
      if (currentProjectId) {
        await saveProject(currentProjectId, { source: sourceToSave, themeId, title, diagramType }, label);
      }
      else {
        const newId = await createProject(title || "Untitled", sourceToSave, themeId, diagramType);
        setCurrentProjectId(newId);
      }
      lastSavedSnapshot.current = JSON.stringify({ source: sourceToSave, themeId, title });
      setPendingRevisionLabel(null);
      setRevisionsDirty((v) => v + 1);
      showToast("Project saved");
    } catch {
      showToast("Save failed — check your connection");
    } finally {
      setSaving(false);
    }
  }, [currentProjectId, source, uiState, themeId, title, diagramType, showToast, pendingRevisionLabel, saving]);

  const handleChatSubmit = useCallback((_e?: React.FormEvent<HTMLFormElement> | React.KeyboardEvent) => {
    if (!input.trim() || aiLoading) return;
    const match = matchTemplate(input);
    if (match && !suggestedTemplate) {
      setPendingSuggestInput(input);
      setSuggestedTemplate(match);
      setInput("");
      return;
    }
    const text = input;
    setInput("");
    sendChatMessage(text);
  }, [input, aiLoading, suggestedTemplate, sendChatMessage]);

  const handleUseCaseChange = useCallback((id: UseCaseId) => {
    setUseCaseId(id);
    // D-07: use-case change drives preset to canonical default
    if (id === "presentation") setPresetId("landscape");
    else if (id === "social") setPresetId("square_feed");
    // "documentation" and "custom" do not change the preset
  }, []);

  // Apply agent tool results to editor state; record each outcome in toolEffects.
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "assistant") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = Array.isArray((lastMessage as { parts?: unknown[] }).parts) ? (lastMessage as { parts: unknown[] }).parts as any[] : [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolParts = parts.filter((p: any) => typeof p?.type === "string" && p.type.startsWith("tool-"));
    if (toolParts.length === 0) return;

    const snapshotBeforeTools = sourceRef.current;
    let liveSource = sourceRef.current;
    let mutated = false;
    const effects: Record<string, { status: "applied" | "noop" | "error"; label: string; detail?: string }> = {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toolParts.forEach((tp: any) => {
      if (tp.state !== "output-available") return;
      const id: string = tp.toolCallId;
      if (toolEffects[id]) return; // already applied (idempotent)
      const result = tp.output;
      if (!result || !result.success) return;
      const toolName: string = tp.toolName ?? String(tp.type).slice(5);

      if (toolName === "update_diagram" && result.sourceCode) {
        liveSource = result.sourceCode;
        mutated = true;
        setSource(result.sourceCode);
        effects[id] = { status: "applied", label: "Diagram updated" };
      } else if (toolName === "apply_patch" && typeof result.find === "string") {
        const { source: next, replaced } = applyPatch(liveSource, result.find, result.replace ?? "");
        if (replaced > 0) {
          liveSource = next;
          mutated = true;
          setSource(next);
          effects[id] = { status: "applied", label: `Replaced ${replaced} occurrence${replaced === 1 ? "" : "s"}` };
        } else {
          effects[id] = { status: "noop", label: "Couldn't find that text", detail: result.find.slice(0, 60) };
        }
      } else if (toolName === "update_node" && diagramType === "reactflow") {
        try {
          const parsed = JSON.parse(liveSource);
          const nodes: ReactFlowSourceNode[] = Array.isArray(parsed.nodes) ? parsed.nodes : [];
          const updatedNodes = nodes.map((n) => n.id === result.id ? { ...n, data: result.data ? { ...n.data, ...result.data } : n.data, style: result.style ? { ...n.style, ...result.style } : n.style } : n);
          const next = JSON.stringify({ ...parsed, nodes: updatedNodes }, null, 2);
          liveSource = next;
          mutated = true;
          setSource(next);
          effects[id] = { status: "applied", label: `Updated node ${result.id}` };
        } catch {
          effects[id] = { status: "error", label: "Couldn't update node" };
        }
      } else if (toolName === "set_title" && result.title) {
        setTitle(result.title);
        effects[id] = { status: "applied", label: `Renamed to "${result.title}"` };
      } else if (toolName === "set_theme" && result.themeId) {
        setThemeId(result.themeId);
        effects[id] = { status: "applied", label: `Theme → ${result.themeId}` };
      } else if (toolName === "set_palette" && result.paletteId) {
        setPaletteId(result.paletteId);
        effects[id] = { status: "applied", label: `Palette → ${result.paletteId}` };
      } else if (toolName === "set_use_case" && result.useCaseId) {
        handleUseCaseChange(result.useCaseId);
        effects[id] = { status: "applied", label: `Use case → ${result.useCaseId}` };
      } else if (toolName === "apply_brand_kit") {
        if (!brandKitInFlight.current.has(id)) {
          brandKitInFlight.current.add(id);
          void handleApplyBrandKit().then((ok) => {
            setToolEffects((prev) => ({ ...prev, [id]: ok ? { status: "applied", label: "Applied brand kit" } : { status: "error", label: "No brand kit set" } }));
          });
        }
      }
    });

    if (Object.keys(effects).length > 0) {
      setToolEffects((prev) => ({ ...prev, ...effects }));
    }
    if (mutated) {
      setUndoStack((prev) => {
        if (prev[prev.length - 1] === snapshotBeforeTools) return prev;
        return [...prev.slice(-(UNDO_LIMIT - 1)), snapshotBeforeTools];
      });
      setRedoStack([]);
    }
  }, [messages, diagramType, toolEffects, handleUseCaseChange, handleApplyBrandKit]);

  const downloadBlob = (blob: Blob, name: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Fetch revisions when history opens or after a save/restore mutates them
  useEffect(() => {
    if (!historyOpen || !currentProjectId) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await listRevisions(currentProjectId);
        if (!cancelled) setRevisions(rows.map((r) => ({ ...r, createdAt: new Date(r.createdAt) })));
      } catch (e) {
        console.error("[revisions]", e);
      }
    })();
    return () => { cancelled = true; };
  }, [historyOpen, currentProjectId, revisionsDirty]);

  // Close the History dropdown when clicking outside it
  useEffect(() => {
    if (!historyOpen) return;
    function onMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-history-menu-root]")) setHistoryOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [historyOpen]);

  // Close the Theme dropdown when clicking outside it
  useEffect(() => {
    if (!themeMenuOpen) return;
    function onMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-theme-menu-root]")) setThemeMenuOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [themeMenuOpen]);

  const handleRestore = useCallback(async (revisionId: string) => {
    if (!currentProjectId) return;
    setRestoringId(revisionId);
    try {
      const { source: restored } = await restoreRevision(currentProjectId, revisionId);
      recordUndo(source);
      const parsed = diagramType === "mermaid"
        ? parseUiFromSource(restored)
        : { source: restored, ui: {} as UiState };
      setSource(parsed.source);
      // Also restore UI metadata (palette, accent, font, etc.) so the diagram
      // visually matches the snapshot, not just structurally.
      if (diagramType === "mermaid") {
        const ui = parsed.ui;
        if (typeof ui.showGrid === "boolean") setShowGrid(ui.showGrid);
        if (ui.fontId) setFontId(ui.fontId);
        if (ui.paletteId) setPaletteId(ui.paletteId);
        if (ui.customBackground) setCustomBackground(ui.customBackground);
        if (ui.customAccent) setCustomAccent(ui.customAccent);
        if (ui.backgroundPattern) {
          setBackgroundPattern(ui.backgroundPattern as "none" | "dots" | "grid" | "lines");
        }
      }
      setRevisionsDirty((v) => v + 1);
      showToast("Revision restored · ⌘Z to undo");
      setHistoryOpen(false);
    } catch (e) {
      console.error("[restore]", e);
      showToast("Could not restore revision");
    } finally {
      setRestoringId(null);
    }
  }, [currentProjectId, source, diagramType, recordUndo, showToast]);

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
        if (format === "png") { 
          const { exportExcalidrawToPng } = await import("./diagrams/excalidraw-renderer"); 
          const b = await exportExcalidrawToPng(source); 
          if (b) downloadBlob(b, `${fn}.png`); 
        } else if (format === "svg") { 
          const { exportExcalidrawToSvg } = await import("./diagrams/excalidraw-renderer"); 
          const s = await exportExcalidrawToSvg(source); 
          if (s) downloadBlob(new Blob([s], { type: "image/svg+xml" }), `${fn}.svg`); 
        }
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
      if (format === "png") { 
        const du = await toPng(node, { pixelRatio: pngScale, filter: (n) => !(n as HTMLElement).hasAttribute?.("data-no-export") }); 
        downloadBlob(await (await fetch(du)).blob(), `${fn}.png`); 
      } else if (format === "svg") { 
        const s = await toSvg(node, { filter: (n) => !(n as HTMLElement).hasAttribute?.("data-no-export") }); 
        downloadBlob(await (await fetch(s)).blob(), `${fn}.svg`); 
      } else if (format === "zip" && diagramType === "mermaid") {
        const zip = new JSZip();
        const pw = node.style.width, ph = node.style.height;
        try {
          for (const p of SOCIAL_PRESETS) {
            node.style.width = `${p.width}px`; 
            node.style.height = `${p.height}px`;
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
        } finally { 
          node.style.width = pw; 
          node.style.height = ph; 
        }
        downloadBlob(await zip.generateAsync({ type: "blob" }), `${fn}-social.zip`);
      }
    } finally {
      setIsExporting(false);
    }
  }, [diagramType, source, title, echartsUiTheme, pngScale, zipIncludeCustom, customExportWidth, customExportHeight, bgColor]);

  const handleCopyImage = useCallback(async () => {
    setIsExporting(true);
    try {
      let dataUrl: string | undefined;
      if (diagramType === "mermaid") {
        const svg = innerRef.current?.querySelector("svg");
        if (svg) dataUrl = await toPng(svg as unknown as HTMLElement, { pixelRatio: pngScale, backgroundColor: bgColor });
      } else if (diagramType === "excalidraw") {
        const { exportExcalidrawToPng } = await import("./diagrams/excalidraw-renderer");
        const blob = await exportExcalidrawToPng(source);
        if (!blob) return;
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        showToast("Image copied — paste it anywhere");
        return;
      } else if (diagramType === "echarts") {
        dataUrl = echartsRef.current?.getDataURL({ type: "png", pixelRatio: pngScale, backgroundColor: echartsUiTheme === "dark" ? "#0f172a" : "#ffffff" });
      } else if (frameRef.current) {
        dataUrl = await toPng(frameRef.current, { pixelRatio: pngScale, filter: (n) => !(n as HTMLElement).hasAttribute?.("data-no-export") });
      }
      if (!dataUrl) return;
      const [, b64] = dataUrl.split(",");
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "image/png" });
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      showToast("Image copied — paste it anywhere");
    } catch {
      showToast("Copy failed — try Export PNG instead");
    } finally {
      setIsExporting(false);
    }
  }, [diagramType, source, pngScale, bgColor, echartsUiTheme, showToast]);

  /**
   * Capture a 1200x630 PNG of the current diagram for OG previews. Best-effort:
   * returns undefined on any failure so the OG route falls back to the
   * branded card.
   */
  const captureSharePreview = useCallback(async (): Promise<string | undefined> => {
    try {
      const node = frameRef.current;
      if (!node) return undefined;
      const rect = node.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return undefined;
      // Render at OG-card aspect (~1.91:1). Scale to keep file size reasonable.
      const targetWidth = 1200;
      const pixelRatio = Math.min(2, Math.max(1, targetWidth / Math.max(rect.width, 1)));
      const dataUrl = await toPng(node, {
        pixelRatio,
        backgroundColor: bgColor,
        filter: (n) => !(n as HTMLElement).hasAttribute?.("data-no-export"),
        cacheBust: true,
      });
      // Drop if it's too large to store (server enforces this too).
      if (dataUrl.length > 380_000) return undefined;
      return dataUrl;
    } catch (e) {
      console.warn("[share-preview]", e);
      return undefined;
    }
  }, [bgColor]);

  const handleShare = useCallback(async () => {
    setIsSharing(true);
    try {
      let id = currentProjectId;
      if (!id) {
        id = await createProject(title || "Untitled", sourceWithUi, themeId, diagramType);
        setCurrentProjectId(id);
      } else {
        await saveProject(id, { source: sourceWithUi, themeId, title, diagramType });
      }
      const preview = await captureSharePreview();
      const token = await createShareLink(id, preview);
      await navigator.clipboard.writeText(`${window.location.origin}/s/${encodeURIComponent(token)}`);
      showToast(preview ? "Share link copied · preview attached" : "Share link copied!");
    } finally {
      setIsSharing(false);
    }
  }, [currentProjectId, sourceWithUi, themeId, title, diagramType, captureSharePreview, showToast]);

  const handleCopyEmbed = useCallback(async () => {
    setIsSharing(true);
    try {
      let id = currentProjectId;
      if (!id) {
        id = await createProject(title || "Untitled", sourceWithUi, themeId, diagramType);
        setCurrentProjectId(id);
      } else {
        await saveProject(id, { source: sourceWithUi, themeId, title, diagramType });
      }
      const preview = await captureSharePreview();
      const token = await createShareLink(id, preview);
      const url = `${window.location.origin}/embed/${encodeURIComponent(token)}`;
      const snippet = `<iframe src="${url}" width="800" height="500" frameborder="0" style="border:1px solid #e2e8f0;border-radius:8px" allowfullscreen></iframe>`;
      await navigator.clipboard.writeText(snippet);
      showToast("Embed code copied!");
    } finally {
      setIsSharing(false);
    }
  }, [currentProjectId, sourceWithUi, themeId, title, diagramType, captureSharePreview, showToast]);

  const handleSwitchType = useCallback((newType: DiagramType) => {
    if (newType === diagramType) { setShowTypePanel(false); return; }
    recordUndo(source);
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
  }, [diagramType, source, recordUndo]);

  const handleSwitchMermaidSubtype = useCallback((subtype: MermaidSubtype) => {
    if (subtype === mermaidSubtype) return;
    const meta = getMermaidSubtypeMeta(subtype);
    setMermaidSubtype(subtype);
    setSource(meta.starter);
    setParseError(null);
    setAiError(null);
  }, [mermaidSubtype]);

  const handleResetView = useCallback(() => {
    setZoom(1);
    const vp = mermaidViewportRef.current;
    if (vp) {
      const targetLeft = Math.max(0, (vp.scrollWidth - vp.clientWidth) / 2);
      vp.scrollTo({ left: targetLeft, top: 0, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        void handleSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        setLeftPanelOpen((p) => !p);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "0") {
        e.preventDefault();
        handleResetView();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave, handleResetView, openSearch]);

  const preset = useMemo(() => presetId === "custom" ? null : getPreset(presetId), [presetId]);
  const frameW = preset?.width ?? customExportWidth;
  const frameH = preset?.height ?? customExportHeight;
  const previewScale = Math.min(1.8, Math.max(0.4, zoom));

  const QUICK_PROMPTS: Partial<Record<DiagramType, string[]>> = {
    mermaid: getMermaidSubtypeMeta(mermaidSubtype).quickPrompts,
    excalidraw: ["Add more steps", "Create a user journey", "Sketch a system design"],
    reactflow: ["Add a decision node", "Build an org chart", "Add error path"],
    cloud: ["Add a load balancer", "Put it on GCP", "Add a cache layer", "Add a message queue"],
    erd: ["Add a junction table", "Add a foreign key", "Add timestamps", "Normalize this schema"],
    orgchart: ["Add a direct report", "Add an HR department", "Insert a VP layer", "Add a co-founder"],
    echarts: ["Change to line chart", "Add second series", "Make it a pie chart", "Add gradient colors"],
    nivo: ["Change to bar chart", "Add monthly data", "Use dark theme"],
    bpmn: ["Add approval gateway", "Add error boundary", "Add a swimlane"],
    tldraw: ["Add shapes", "Create a wireframe", "Add text labels"],
  };

  const sourceLabel = ["mermaid", "bpmn"].includes(diagramType) ? "Source" : "JSON Source";

  return (
    <div className={`flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-white${darkMode ? " dark" : ""}`}>
      {/* GLOBAL TOP HEADER (Lovable style) */}
      <header className="shrink-0 flex items-center justify-between border-b border-slate-200 px-4 py-1.5 bg-white z-50">
        {/* Left: Logo & Dropdown */}
        <div className="flex items-center gap-4 relative">
          <button 
            onClick={() => setIsNavMenuOpen(!isNavMenuOpen)}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors p-1 rounded-md hover:bg-slate-50"
          >
            <Logo className="h-5 w-5 shadow-xs rounded-sm shadow-orange-500/20" />
            <span className="font-semibold text-slate-900 tracking-tight">{title || "Flowchart Studio"}</span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {isNavMenuOpen && (
            <div className="absolute top-full left-0 mt-1 w-48 rounded-xl border border-slate-200 bg-white shadow-lg z-100 py-1 text-sm">
              <Link href="/" className="block px-4 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900">Home</Link>
              <Link href="/app" className="block px-4 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900">Projects</Link>
              <Link href="/app/settings" className="block px-4 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900">Settings</Link>
              <div className="h-px bg-slate-100 my-1" />
              <button className="block w-full text-left px-4 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900">Change Logo</button>
            </div>
          )}

          <div className="flex items-center gap-1">
             <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                <div className="h-4 w-4 border-2 border-slate-300 rounded-full border-t-transparent animate-spin-slow" title="History" />
             </button>
          </div>
        </div>

        {/* Center: Tabs & Preview/Code */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden sm:flex items-center bg-slate-100 p-1 rounded-xl">
           <button
             onClick={() => setSourceExpanded(false)}
             className={`flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold rounded-lg transition-colors ${!sourceExpanded ? "bg-white shadow-xs text-slate-900" : "text-slate-500 hover:text-slate-900"}`}
           >
              <Play className="h-3.5 w-3.5" /> Preview
           </button>
           <button
             onClick={() => setSourceExpanded(true)}
             className={`flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold rounded-lg transition-colors ${sourceExpanded ? "bg-white shadow-xs text-slate-900" : "text-slate-500 hover:text-slate-900"}`}
           >
              <div className="h-3 w-3 border border-slate-400 rounded-xs" /> Code
           </button>
        </div>

        {/* Right: Share, Publish, Presence avatars, User avatar */}
        <div className="flex items-center gap-2">
           <button
             onClick={() => void handleShare()}
             disabled={isSharing}
             className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200 disabled:opacity-60"
           >
             <Share2 className="h-3.5 w-3.5" /> {isSharing ? "Sharing…" : "Share"}
           </button>
           <button
             onClick={() => void handleCopyEmbed()}
             disabled={isSharing}
             title="Copy <iframe> embed code"
             className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200 disabled:opacity-60"
           >
             <Code2 className="h-3.5 w-3.5" /> Embed
           </button>
           <button
             onClick={() => void handleShare()}
             disabled={isSharing}
             className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs disabled:opacity-60"
           >
             Publish
           </button>
           {presenceOthers.length > 0 && (
             <div className="flex items-center" style={{ marginLeft: 4 }}>
               {presenceOthers.slice(0, 4).map((u) => (
                 <div
                   key={u.email}
                   title={u.name || u.email}
                   className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white -ml-2 first:ml-0 cursor-default shadow-xs"
                   style={{ background: presenceColor(u.email) }}
                 >
                   {(u.name || u.email).charAt(0).toUpperCase()}
                 </div>
               ))}
               {presenceOthers.length > 4 && (
                 <div className="h-7 w-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold border-2 border-white -ml-2 shadow-xs">
                   +{presenceOthers.length - 4}
                 </div>
               )}
             </div>
           )}
           <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold ml-2 cursor-pointer border border-indigo-200" title={userName}>
             {(userName || userEmail || "U").charAt(0).toUpperCase()}
           </div>
        </div>
      </header>

      <div className="relative flex min-h-0 w-full flex-1 flex-row overflow-hidden bg-[#fafafa] dark:bg-slate-950">
        <AnimatePresence mode="wait">
          {leftPanelOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 380, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="relative z-40 flex flex-col overflow-hidden pl-4 py-3"
            >
              <div className="h-full w-[360px] flex flex-col rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl overflow-hidden">

          {/* AI Task List (Plan Mode) */}
          {aiLoading && agentTasks.length > 0 && (
            <div className="shrink-0 border-b border-white/5 bg-indigo-500/5 dark:bg-indigo-500/10 px-5 py-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">Agent Plan</span>
              </div>
              <div className="space-y-2">
                {agentTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3">
                    {task.status === "completed" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : task.status === "loading" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-slate-700 dark:text-slate-200" />
                    )}
                    <span className={`text-xs ${task.status === "loading" ? "text-white font-medium" : "text-slate-500"}`}>
                      {task.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chat History */}
          <div ref={chatListRef} className="min-h-0 flex-1 space-y-8 overflow-y-auto px-5 py-6 no-scrollbar">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center px-4">
                <div className="mb-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950 p-4">
                  <Sparkles className="h-8 w-8 text-indigo-500" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">How can I help you build?</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Describe the diagram or process you want to create. I can handle Mermaid, Charts, Whiteboards and more.
                </p>
              </div>
            )}
            
            {messages.map((msg, i) => (
              <div key={msg.id} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div className={`relative max-w-[92%] rounded-[20px] px-5 py-4 text-[14px] leading-relaxed shadow-xs ${
                  msg.role === "user"
                    ? "bg-[#f1f0ee] dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700"
                }`}>
                  {getMessageText(msg)}
                  {msg.role === "assistant" && i === messages.length - 1 && aiLoading && (
                    <span className="inline-block h-4 w-1 animate-pulse bg-indigo-400 ml-1 translate-y-0.5" />
                  )}
                </div>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(Array.isArray((msg as { parts?: unknown[] }).parts) ? ((msg as { parts: any[] }).parts as any[]) : [])
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  .filter((p: any) => typeof p?.type === "string" && p.type.startsWith("tool-"))
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  .map((tool: any) => {
                    const toolName: string = tool.toolName ?? String(tool.type).slice(5);
                    const isDone = tool.state === "output-available";
                    const effect = toolEffects[tool.toolCallId];
                    const verbs: Record<string, string> = {
                      update_diagram: "Updating diagram…",
                      apply_patch: "Patching…",
                      update_node: "Updating node…",
                      fetch_external_data: "Fetching data…",
                      set_title: "Renaming…",
                      set_theme: "Setting theme…",
                      set_palette: "Setting palette…",
                      apply_brand_kit: "Applying brand kit…",
                      set_use_case: "Setting use-case…",
                    };
                    const explanation: string | undefined = tool.output?.explanation;
                    const failed = effect?.status === "noop" || effect?.status === "error";
                    return (
                      <div key={tool.toolCallId} className="mt-2 w-full max-w-[92%] rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5 text-xs text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700 flex flex-col gap-1.5 shadow-xs">
                        <div className="flex items-center gap-2">
                          {!isDone ? <Settings2 className="h-3.5 w-3.5 text-indigo-400 animate-spin" /> : failed ? <AlertCircle className="h-3.5 w-3.5 text-amber-500" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                          <span className="font-semibold">{isDone && effect ? effect.label : (verbs[toolName] ?? "Using tool…")}</span>
                        </div>
                        {explanation && <span className="pl-5 text-slate-400 dark:text-slate-500">{explanation}</span>}
                        {effect?.detail && <span className="pl-5 font-mono text-slate-400 dark:text-slate-500">{effect.detail}</span>}
                      </div>
                    );
                  })}
                {msg.role === "assistant" && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 flex items-center gap-4 px-2 text-slate-400 dark:text-slate-500"
                  >
                    <button
                      onClick={handleUndo}
                      disabled={undoStack.length === 0}
                      title="Undo (⌘Z)"
                      className="hover:text-slate-600 transition-colors disabled:opacity-30"
                    >
                      <Undo className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => void handleShare()}
                      title="Share diagram"
                      className="hover:text-slate-600 transition-colors"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                )}
              </div>
            ))}
          </div>

          {/* Prompt Area with Quick Prompts */}
          <div className="shrink-0 space-y-4 border-t border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-5">
            {messages.length > 0 && QUICK_PROMPTS[diagramType]?.length && (
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS[diagramType]?.map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:border-indigo-200 dark:hover:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600 transition-all shadow-xs"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            
            {suggestedTemplate && (
              <div className="mx-3 mb-3 rounded-xl border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950 p-3">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-sm">📌</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">{suggestedTemplate.title}</p>
                    <p className="mt-0.5 text-xs text-indigo-700 dark:text-indigo-300">{suggestedTemplate.description}</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => {
                          recordUndo(source);
                          setSource(suggestedTemplate.source);
                          setDiagramType(suggestedTemplate.diagramType);
                          setThemeId(suggestedTemplate.themeId);
                          setTitle(suggestedTemplate.title);
                          setSuggestedTemplate(null);
                          setPendingSuggestInput("");
                        }}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
                      >
                        Use template
                      </button>
                      <button
                        onClick={() => {
                          sendChatMessage(pendingSuggestInput);
                          setSuggestedTemplate(null);
                          setPendingSuggestInput("");
                        }}
                        className="rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 transition-colors dark:bg-slate-800 dark:border-indigo-600 dark:text-indigo-300 dark:hover:bg-indigo-900"
                      >
                        Generate anyway
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => { setSuggestedTemplate(null); setPendingSuggestInput(""); }}
                    className="text-indigo-400 hover:text-indigo-600 text-xs"
                    aria-label="Dismiss suggestion"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleChatSubmit(e);
              }}
              className="group relative flex flex-col gap-2 rounded-[24px] border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 p-2 shadow-lg shadow-slate-200/30 focus-within:border-indigo-500/50 transition-all"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="How should I change the diagram?"
                className="w-full resize-none bg-transparent px-4 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleChatSubmit(e);
                  }
                }}
              />
              <div className="flex items-center justify-between px-2 pb-1">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsAgentMode(!isAgentMode)}
                    title="Agent takes multiple steps — edit, theme, fetch data — to build your diagram"
                    className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12px] font-semibold shadow-xs transition-all ${isAgentMode ? 'border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    <Bot className={`h-3.5 w-3.5 ${isAgentMode ? 'text-indigo-600' : 'text-slate-500'}`} />
                    Agent Mode
                  </button>
                  {source.trim() && (
                    <button
                      type="button"
                      onClick={() => setForceCreateNext((v) => !v)}
                      title="Next message will regenerate the diagram from scratch instead of patching the existing one"
                      className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12px] font-semibold shadow-xs transition-all ${forceCreateNext ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                      <Sparkles className={`h-3.5 w-3.5 ${forceCreateNext ? 'text-amber-600' : 'text-slate-500'}`} />
                      {forceCreateNext ? "Will regenerate" : "Regenerate"}
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!input?.trim() || aiLoading}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-30 transition-all shadow-md"
                >
                  {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" strokeWidth={2.5} />}
                </button>
              </div>
              {isAgentMode && (
                <p className="px-2 pb-1 text-[11px] text-slate-400 dark:text-slate-500">
                  Agent mode: the AI takes multiple steps — editing, theming, and fetching data — to build your diagram.
                </p>
              )}
            </form>
          </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>

    {/* Center/Right: Diagram Canvas */}
    <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
      {/* AI generation progress bar */}
      {aiLoading && (
        <div className="relative h-0.5 w-full shrink-0 overflow-hidden bg-indigo-100">
          <div className="ai-progress-bar" />
        </div>
      )}
      {/* AI notice banner — type switch or assumption info */}
      {aiNotice && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs text-indigo-700">
          <span>{aiNotice}</span>
          <button type="button" onClick={() => setAiNotice(null)} className="rounded-sm p-0.5 hover:bg-indigo-100" aria-label="Dismiss notice">×</button>
        </div>
      )}
      {/* AI-05: assumption disclosure banner — "Generated as: type · preset · detail" */}
      {assumptionBanner && (
        <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 px-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
          <span className="truncate">{assumptionBanner}</span>
          <button
            type="button"
            onClick={() => setAssumptionBanner(null)}
            className="rounded-sm p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            aria-label="Dismiss generation notice"
          >×</button>
        </div>
      )}
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
            className={`flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 transition-all ${leftPanelOpen ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800 shadow-inner' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            title="Toggle AI Panel (⌘B)"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="text-xs font-semibold pr-1">AI Chat</span>
          </button>
          <button
            type="button"
            onClick={() => setSourcePanelOpen(!sourcePanelOpen)}
            className={`flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 transition-all ${sourcePanelOpen ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800 shadow-inner' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            title="Toggle Source editor"
          >
            <Code2 className="h-4 w-4" />
            <span className="text-xs font-semibold pr-1 hidden md:inline">Source</span>
          </button>
            
            {/* Zoom */}
            <div className="hidden lg:flex shrink-0 items-center gap-0.5">
              <button type="button" onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))} className="rounded-sm px-1.5 py-1 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">−</button>
              <span className="w-11 text-center text-xs tabular-nums text-slate-600 dark:text-slate-300">{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => setZoom((z) => Math.min(3, z + 0.1))} className="rounded-sm px-1.5 py-1 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">+</button>
              <button
                type="button"
                onClick={handleResetView}
                className="rounded-sm px-1.5 py-1 text-xs text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                title="Reset zoom & pan (⌘0)"
              >
                ↺
              </button>
            </div>
            
            <div className="hidden lg:block h-4 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />
            <span className="hidden lg:flex shrink-0 items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <DiagramTypeIcon type={diagramType} size={13} />
              <span className="font-medium">
                {diagramType === "mermaid" ? getMermaidSubtypeMeta(mermaidSubtype).label : typeMeta.label}
              </span>
            </span>

            {(["mermaid", "reactflow", "nivo", "bpmn"] as DiagramType[]).includes(diagramType) && (
              <>
                <div className="hidden xl:block h-4 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />
                <div className="hidden xl:flex shrink-0 items-center gap-1.5">
                  <select
                    value={presetId}
                    onChange={(e) => setPresetId(e.target.value as SocialPresetId)}
                    className="rounded-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
                    aria-label="Canvas size preset"
                  >
                    {SOCIAL_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                    <option value="custom">Custom</option>
                  </select>
                  <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500" aria-label="Export dimensions">
                    {frameW}×{frameH}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            {showWatermark && (
              <span className="hidden sm:inline-block rounded-sm border border-amber-200/80 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 text-[11px] text-amber-700 dark:text-amber-400">Free plan</span>
            )}
            
            <div className="hidden lg:flex items-center gap-1 border-r border-slate-200 dark:border-slate-700 pr-2 mr-1">
              <button
                type="button"
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                title="Undo (⌘Z)"
                className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Undo className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                title="Redo (⌘⇧Z)"
                className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Redo className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleApplyBrandKit}
                disabled={applyingBrand}
                title="Apply your brand kit colors (manage in Settings)"
                className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Palette className="h-4 w-4" />
              </button>
              {diagramType === "mermaid" && (
                <div className="relative" data-theme-menu-root>
                  <button
                    type="button"
                    onClick={() => setThemeMenuOpen((v) => !v)}
                    title={`Theme: ${theme.name}`}
                    className="flex items-center gap-1 px-2 py-2 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    aria-expanded={themeMenuOpen}
                  >
                    <Paintbrush className="h-4 w-4" />
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {themeMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 z-50 w-56 max-h-96 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl">
                      <div className="sticky top-0 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Mermaid theme
                      </div>
                      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                        {THEMES.map((t) => {
                          const active = t.id === themeId;
                          const swatch =
                            t.themeVariables.primaryColor ?? "#6366f1";
                          const bg = t.themeVariables.background ?? "#f8fafc";
                          return (
                            <li key={t.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (t.id !== themeId) {
                                    recordUndo(source);
                                    setThemeId(t.id);
                                    showToast(`Theme: ${t.name} · ⌘Z to undo`);
                                  }
                                  setThemeMenuOpen(false);
                                }}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 ${active ? "bg-indigo-50 dark:bg-indigo-950" : ""}`}
                              >
                                <span
                                  className="h-5 w-5 shrink-0 rounded-sm border border-slate-200 dark:border-slate-700"
                                  style={{ background: bg }}
                                >
                                  <span
                                    className="block h-full w-full rounded-sm"
                                    style={{
                                      background: `linear-gradient(135deg, ${swatch} 0 50%, transparent 50% 100%)`,
                                    }}
                                  />
                                </span>
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                                  {t.name}
                                </span>
                                {active && (
                                  <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-indigo-600" />
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              {(diagramType === "reactflow" || diagramType === "cloud" || diagramType === "erd" || diagramType === "orgchart" || diagramType === "bpmn") && (
                <button
                  type="button"
                  onClick={() => void handleAutoLayout()}
                  title={diagramType === "cloud" ? "Auto-layout the architecture" : diagramType === "erd" ? "Auto-layout the schema" : diagramType === "orgchart" ? "Auto-layout the org chart" : diagramType === "bpmn" ? "Auto-layout the process" : "Auto-layout the node graph"}
                  className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Wand2 className="h-4 w-4" />
                </button>
              )}
              <div className="relative" data-history-menu-root>
                <button
                  type="button"
                  onClick={() => setHistoryOpen((v) => !v)}
                  disabled={!currentProjectId}
                  title={currentProjectId ? "Version history" : "Save first to see history"}
                  className="flex items-center gap-1 px-2 py-2 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-expanded={historyOpen}
                >
                  <Clock className="h-4 w-4" />
                  <ChevronDown className="h-3 w-3" />
                </button>
                {historyOpen && currentProjectId && (
                  <div className="absolute right-0 top-full mt-1 z-50 w-80 max-h-96 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl">
                    <div className="sticky top-0 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Version history
                    </div>
                    {revisions.length === 0 ? (
                      <div className="px-3 py-4 text-xs text-slate-400 dark:text-slate-500">Loading…</div>
                    ) : (
                      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                        {revisions.map((r) => (
                          <li key={r.id}>
                            <button
                              type="button"
                              onClick={() => handleRestore(r.id)}
                              disabled={restoringId === r.id}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                            >
                              <div className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                                {r.label ?? "Manual edit"}
                              </div>
                              <div className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                                {r.createdAt.toLocaleString()}
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setDarkMode((d) => !d)}
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <div className="relative" data-export-menu-root>
              <button
                type="button"
                onClick={() => setExportOpen((p) => !p)}
                disabled={isExporting}
                className="hidden sm:block px-4 py-1.5 bg-slate-900 text-white rounded-lg text-[13px] font-semibold hover:bg-slate-800 disabled:opacity-60 transition-colors shadow-xs"
                aria-expanded={exportOpen}
              >
                {isExporting ? "…" : "Export ▾"}
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full z-30 mt-1 w-72 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-lg">
                  <div className="mb-1.5">
                    <button type="button" onClick={() => void handleCopyImage()} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">Copy image</button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => void handleExport("png")} className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">PNG</button>
                    <button type="button" onClick={() => void handleExport("svg")} className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">SVG</button>
                    {diagramType === "mermaid" && (
                      <button type="button" onClick={() => void handleExport("zip")} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800" title="All social presets">ZIP</button>
                    )}
                  </div>
                  {["mermaid", "reactflow", "nivo", "bpmn"].includes(diagramType) && (
                    <div className="mt-3 grid gap-2">
                      <div>
                        <label htmlFor="editor-export-preset" className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">Canvas size</label>
                        <select id="editor-export-preset" value={presetId} onChange={(e) => setPresetId(e.target.value as SocialPresetId)} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2 py-1.5 text-xs">
                          {SOCIAL_PRESETS.map((p) => (<option key={p.id} value={p.id}>{p.label} ({p.width}×{p.height})</option>))}
                          <option value="custom">Custom…</option>
                        </select>
                      </div>
                      {presetId === "custom" && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label htmlFor="editor-export-custom-w" className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">Width</label>
                            <input id="editor-export-custom-w" type="number" inputMode="numeric" min={200} max={8192} value={customExportWidth} onChange={(e) => setCustomExportWidth(Math.max(200, Math.min(8192, Math.round(Number(e.target.value) || 0))))} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2 py-1.5 text-xs" />
                          </div>
                          <div>
                            <label htmlFor="editor-export-custom-h" className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">Height</label>
                            <input id="editor-export-custom-h" type="number" inputMode="numeric" min={200} max={8192} value={customExportHeight} onChange={(e) => setCustomExportHeight(Math.max(200, Math.min(8192, Math.round(Number(e.target.value) || 0))))} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2 py-1.5 text-xs" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1">
                      <label htmlFor="editor-export-scale" className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">PNG scale</label>
                      <select id="editor-export-scale" value={pngScale} onChange={(e) => setPngScale(Number(e.target.value) as 1 | 2 | 3)} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2 py-1.5 text-xs">
                        <option value={1}>1×</option><option value={2}>2×</option><option value={3}>3×</option>
                      </select>
                    </div>
                    {diagramType === "mermaid" && (
                      <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <input type="checkbox" checked={zipIncludeCustom} onChange={(e) => setZipIncludeCustom(e.target.checked)} className="rounded-sm" />
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
              className={`h-full w-full overflow-auto rounded-xl flex flex-col items-center ${isMermaidPanning ? "cursor-grabbing" : "cursor-grab"}`}
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
              <div style={{ transform: `scale(${previewScale})`, transformOrigin: "top center", width: "max-content", height: "max-content", padding: "12px" }}>
                <div
                  ref={frameRef}
                  style={{
                    width: `${frameW}px`,
                    aspectRatio: `${frameW} / ${frameH}`,
                    backgroundColor: bgColor,
                    backgroundImage: showGrid
                      ? "radial-gradient(circle, #c8c8c8 1px, transparent 1px)"
                      : backgroundPattern === "dots" ? "radial-gradient(circle, #c8c8c8 1px, transparent 1px)"
                      : backgroundPattern === "grid" ? "linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)"
                      : backgroundPattern === "lines" ? "repeating-linear-gradient(-45deg, #e2e8f0, #e2e8f0 1px, transparent 1px, transparent 8px)"
                      : undefined,
                    backgroundSize: (showGrid || backgroundPattern !== "none") ? "20px 20px" : undefined,
                    fontFamily: selectedFont.cssValue,
                  }}
                  className="relative overflow-hidden rounded-xl shadow-xl"
                >
                  <div ref={innerRef} className="flex min-h-full w-full items-center justify-center p-8 overflow-hidden" />
                  {!source.trim() && !aiLoading && (
                    <div
                      data-no-export
                      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-center"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-slate-700">
                          Describe your diagram in the AI chat
                        </div>
                        <div className="text-xs text-slate-500">
                          or open <span className="font-medium text-slate-700">Source</span> to type Mermaid yourself
                        </div>
                      </div>
                    </div>
                  )}
                  {aiLoading && (
                    <div
                      data-no-export
                      className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-indigo-300/60 animate-pulse"
                    />
                  )}
                  {aiLoading && (
                    <div
                      data-no-export
                      className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-indigo-50/95 border border-indigo-200 px-2.5 py-1 text-[10px] font-medium text-indigo-700 shadow-xs backdrop-blur-xs"
                    >
                      <Sparkles className="h-3 w-3 animate-pulse" /> Streaming
                    </div>
                  )}
                  {!aiLoading && mermaidRenderError && (
                    <div
                      data-no-export
                      className="absolute bottom-3 left-3 right-3 mx-auto max-w-md rounded-lg border border-amber-200 bg-amber-50/95 px-3 py-2 text-[11px] text-amber-800 shadow-xs backdrop-blur-xs"
                    >
                      <span className="font-medium">Mermaid syntax: </span>
                      <span className="font-mono">{mermaidRenderError}</span>
                    </div>
                  )}
                  {showWatermark && <div data-no-export className="absolute bottom-3 right-4 text-[10px] opacity-30 text-slate-600 font-medium select-none">Made with Flowchart Studio</div>}
                </div>
              </div>
            </div>
          )}
          {diagramType === "excalidraw" && <div className="w-full h-full rounded-xl overflow-hidden shadow-xl bg-white dark:bg-slate-900" style={{ minHeight: "600px" }}><ExcalidrawRenderer source={source} onChange={setSource} /></div>}
          {diagramType === "reactflow" && (
            <div
              ref={frameRef}
              className="rounded-xl overflow-hidden shadow-xl bg-white dark:bg-slate-900"
              style={{ width: `${frameW}px`, height: `${frameH}px`, transform: `scale(${previewScale})`, transformOrigin: "top center" }}
            >
              <ReactFlowRenderer source={source} onChange={setSource} onNodeClick={handleNodeClick} />
            </div>
          )}
          {diagramType === "cloud" && (
            <div
              ref={frameRef}
              className="w-full rounded-xl overflow-hidden shadow-xl bg-white dark:bg-slate-900"
              style={{ minHeight: "600px", height: "100%" }}
            >
              <CloudRenderer source={source} onChange={setSource} readOnly={false} />
            </div>
          )}
          {diagramType === "erd" && (
            <div
              ref={frameRef}
              className="w-full rounded-xl overflow-hidden shadow-xl bg-white dark:bg-slate-900"
              style={{ minHeight: "600px", height: "100%" }}
            >
              <ErdRenderer source={source} onChange={setSource} readOnly={false} />
            </div>
          )}
          {diagramType === "orgchart" && (
            <div
              ref={frameRef}
              className="w-full rounded-xl overflow-hidden shadow-xl bg-white dark:bg-slate-900"
              style={{ minHeight: "600px", height: "100%" }}
            >
              <OrgChartRenderer source={source} onChange={setSource} readOnly={false} />
            </div>
          )}
          {(diagramType === "timeline" || diagramType === "versus" || diagramType === "matrix2x2" || diagramType === "funnel" ||
            diagramType === "venn" || diagramType === "tierlist" || diagramType === "iceberg" || diagramType === "alignment"
            || diagramType === "budget" || diagramType === "habits" || diagramType === "bingo" || diagramType === "bracket") && (
            <div
              ref={frameRef}
              className="w-full rounded-xl overflow-hidden shadow-xl bg-white dark:bg-slate-900 [container-type:size]"
              style={{ minHeight: "600px", height: "100%" }}
            >
              <SocialCardRenderer source={source} onChange={setSource} readOnly={false} />
            </div>
          )}
          {diagramType === "echarts" && (
            <div
              ref={frameRef}
              className="rounded-xl overflow-hidden shadow-xl bg-white dark:bg-slate-900"
              style={{ width: "900px", height: "600px", transform: `scale(${previewScale})`, transformOrigin: "top center" }}
            >
              <EChartsRenderer ref={echartsRef} source={source} onChange={setSource} uiTheme={echartsUiTheme} />
            </div>
          )}
          {diagramType === "nivo" && (
            <div
              ref={frameRef}
              className="rounded-xl overflow-hidden shadow-xl bg-white dark:bg-slate-900"
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
                className="flex h-full min-h-[520px] flex-1 flex-col overflow-hidden rounded-xl bg-white dark:bg-slate-900 shadow-xl"
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

      <AnimatePresence mode="wait">
        {sourcePanelOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 380, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="relative z-30 flex flex-col overflow-hidden pr-4 py-3"
          >
            <div className="h-full w-[360px] flex flex-col rounded-2xl border border-slate-200/60 bg-white/95 backdrop-blur-xl shadow-2xl overflow-hidden dark:border-slate-700/60 dark:bg-slate-900/95">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Code2 className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Source</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide">{diagramType}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={openSearch}
                    className="rounded-sm p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    aria-label="Find in source (⌘F)"
                    title="Find (⌘F)"
                  >
                    <Search className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourcePanelOpen(false)}
                    className="rounded-sm p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    aria-label="Close source editor"
                  >
                    ×
                  </button>
                </div>
              </div>
              {searchOpen && (
                <div className="border-b border-slate-100 bg-slate-50/50 px-3 py-2 space-y-1.5 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="flex items-center gap-1.5">
                    <Search className="h-3 w-3 shrink-0 text-slate-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setSearchOpen(false);
                          sourceTextareaRef.current?.focus();
                          return;
                        }
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (searchMatches.length === 0) return;
                          focusMatch(searchActiveIdx + (e.shiftKey ? -1 : 1));
                        }
                      }}
                      placeholder="Find"
                      className="min-w-0 flex-1 rounded-sm border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] text-slate-800 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    />
                    <span className="shrink-0 text-[10px] tabular-nums text-slate-400 w-12 text-right">
                      {searchQuery
                        ? searchMatches.length === 0
                          ? "0/0"
                          : `${searchActiveIdx + 1}/${searchMatches.length}`
                        : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSearchCaseSensitive((v) => !v)}
                      title="Match case"
                      className={`shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-bold ${searchCaseSensitive ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"}`}
                    >
                      Aa
                    </button>
                    <button
                      type="button"
                      onClick={() => focusMatch(searchActiveIdx - 1)}
                      disabled={searchMatches.length === 0}
                      title="Previous match (⇧⏎)"
                      className="shrink-0 rounded-sm p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-700"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => focusMatch(searchActiveIdx + 1)}
                      disabled={searchMatches.length === 0}
                      title="Next match (⏎)"
                      className="shrink-0 rounded-sm p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-700"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplaceOpen((v) => !v)}
                      title="Toggle replace"
                      className={`shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-semibold ${replaceOpen ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"}`}
                    >
                      ⇄
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchOpen(false);
                        sourceTextareaRef.current?.focus();
                      }}
                      title="Close (Esc)"
                      className="shrink-0 rounded-sm p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  {replaceOpen && (
                    <div className="flex items-center gap-1.5">
                      <span className="shrink-0 text-[10px] text-slate-400 w-3 text-center">↳</span>
                      <input
                        type="text"
                        value={replaceQuery}
                        onChange={(e) => setReplaceQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            replaceCurrent();
                          }
                          if (e.key === "Escape") {
                            e.preventDefault();
                            setSearchOpen(false);
                            sourceTextareaRef.current?.focus();
                          }
                        }}
                        placeholder="Replace"
                        className="min-w-0 flex-1 rounded-sm border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] text-slate-800 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      />
                      <button
                        type="button"
                        onClick={replaceCurrent}
                        disabled={searchMatches.length === 0}
                        title="Replace current"
                        className="shrink-0 rounded-sm border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={replaceAll}
                        disabled={searchMatches.length === 0}
                        title="Replace all matches"
                        className="shrink-0 rounded-sm border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        All
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div
                ref={sourceScrollRef}
                className="relative flex-1 overflow-auto"
                onScroll={(e) => {
                  const target = e.currentTarget;
                  const pre = target.querySelector("pre.hl-pre") as HTMLPreElement | null;
                  const gutter = target.querySelector("pre.hl-gutter") as HTMLPreElement | null;
                  if (pre) {
                    pre.style.transform = `translateX(${-target.scrollLeft}px)`;
                  }
                  if (gutter) {
                    gutter.style.transform = `translateX(${target.scrollLeft}px)`;
                  }
                }}
              >
                <pre
                  aria-hidden
                  className="hl-gutter pointer-events-none absolute left-0 top-0 z-10 m-0 w-10 select-none border-r border-slate-100 bg-slate-50/80 py-3 pr-2 text-right font-mono text-[11px] leading-relaxed text-slate-400 dark:border-slate-700 dark:bg-slate-800/80"
                >
                  {Array.from({ length: Math.max(1, source.split("\n").length) }, (_, i) => i + 1).join("\n")}
                </pre>
                <pre
                  aria-hidden
                  className="hl-pre pointer-events-none absolute left-10 top-0 m-0 w-[calc(100%-2.5rem)] whitespace-pre px-4 py-3 font-mono text-[12px] leading-relaxed text-slate-800 dark:text-slate-200"
                  dangerouslySetInnerHTML={{
                    __html: source ? highlightSource(source, diagramType) : "",
                  }}
                />
                <textarea
                  ref={sourceTextareaRef}
                  value={source}
                  onChange={(e) => {
                    recordUndo(source);
                    setSource(e.target.value);
                    setSourceCaret(caretFromOffset(e.target.value, e.target.selectionStart));
                  }}
                  onSelect={(e) => {
                    const ta = e.currentTarget;
                    setSourceCaret(caretFromOffset(ta.value, ta.selectionStart));
                  }}
                  onKeyDown={(e) => {
                    const ta = e.currentTarget;
                    const { selectionStart: start, selectionEnd: end, value } = ta;

                    if (e.key === "Tab") {
                      e.preventDefault();
                      if (!e.shiftKey && start === end) {
                        recordUndo(source);
                        const next = value.slice(0, start) + "  " + value.slice(end);
                        setSource(next);
                        requestAnimationFrame(() => {
                          ta.selectionStart = ta.selectionEnd = start + 2;
                          setSourceCaret(caretFromOffset(next, start + 2));
                        });
                        return;
                      }
                      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
                      const lineEnd = end < value.length && value[end] === "\n"
                        ? end
                        : value.indexOf("\n", end) === -1
                          ? value.length
                          : value.indexOf("\n", end);
                      const block = value.slice(lineStart, lineEnd);
                      const updated = e.shiftKey
                        ? block.replace(/^ {1,2}/gm, "")
                        : block.replace(/^/gm, "  ");
                      recordUndo(source);
                      const next = value.slice(0, lineStart) + updated + value.slice(lineEnd);
                      setSource(next);
                      const delta = updated.length - block.length;
                      requestAnimationFrame(() => {
                        ta.selectionStart = lineStart;
                        ta.selectionEnd = lineEnd + delta;
                        setSourceCaret(caretFromOffset(next, lineEnd + delta));
                      });
                      return;
                    }

                    if (e.key === "Backspace" && start === end && start > 0) {
                      const prev = value[start - 1];
                      const next = value[start];
                      if (prev && BRACKET_PAIRS[prev] === next) {
                        e.preventDefault();
                        recordUndo(source);
                        const updated = value.slice(0, start - 1) + value.slice(start + 1);
                        setSource(updated);
                        requestAnimationFrame(() => {
                          ta.selectionStart = ta.selectionEnd = start - 1;
                          setSourceCaret(caretFromOffset(updated, start - 1));
                        });
                        return;
                      }
                    }

                    if (BRACKET_CLOSERS.has(e.key) && start === end && value[start] === e.key) {
                      const prev = value[start - 1];
                      if (!(prev && BRACKET_OPENERS.has(prev) && BRACKET_PAIRS[prev] === e.key && (e.key === '"' || e.key === "'" || e.key === "`"))) {
                        e.preventDefault();
                        requestAnimationFrame(() => {
                          ta.selectionStart = ta.selectionEnd = start + 1;
                          setSourceCaret(caretFromOffset(value, start + 1));
                        });
                        return;
                      }
                    }

                    if (BRACKET_OPENERS.has(e.key)) {
                      const close = BRACKET_PAIRS[e.key];
                      if (start !== end) {
                        e.preventDefault();
                        recordUndo(source);
                        const selected = value.slice(start, end);
                        const updated = value.slice(0, start) + e.key + selected + close + value.slice(end);
                        setSource(updated);
                        requestAnimationFrame(() => {
                          ta.selectionStart = start + 1;
                          ta.selectionEnd = end + 1;
                          setSourceCaret(caretFromOffset(updated, end + 1));
                        });
                        return;
                      }
                      const nextChar = value[start] ?? "";
                      const canPair = nextChar === "" || /[\s)\]}>,;:]/.test(nextChar);
                      if (canPair) {
                        e.preventDefault();
                        recordUndo(source);
                        const updated = value.slice(0, start) + e.key + close + value.slice(end);
                        setSource(updated);
                        requestAnimationFrame(() => {
                          ta.selectionStart = ta.selectionEnd = start + 1;
                          setSourceCaret(caretFromOffset(updated, start + 1));
                        });
                        return;
                      }
                    }
                  }}
                  spellCheck={false}
                  wrap="off"
                  className="relative h-full w-full resize-none bg-transparent py-3 pr-4 pl-14 font-mono text-[12px] leading-relaxed text-transparent caret-slate-900 focus:outline-hidden dark:caret-slate-100"
                  style={{ minHeight: "100%" }}
                  placeholder={diagramType === "mermaid" ? "flowchart LR\n  A --> B" : "{}"}
                />
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400 dark:border-slate-800">
                <span>⌘Z to undo · Changes apply live</span>
                <span className="tabular-nums">
                  Ln {sourceCaret.line}, Col {sourceCaret.col}
                </span>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-5 py-3 text-sm text-white shadow-xl animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
