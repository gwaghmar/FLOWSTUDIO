import { NextResponse } from "next/server";
import { generateText, streamText, createUIMessageStream, createUIMessageStreamResponse, type UIMessageStreamWriter } from "ai";
import { and, eq, gt, sql } from "drizzle-orm";
import { jsonrepair } from "jsonrepair";
import { z } from "zod";
import { MermaidSourceSchema, DIAGRAM_SYSTEM_PROMPTS, USE_CASE_STYLE_INSTRUCTIONS, getDiagramTypeMeta } from "@flowchart/core";
import type { DiagramType, SocialPresetId, UseCaseId } from "@flowchart/core";
import type { ApiError } from "@flowchart/core";
import { BpmnModdle } from "bpmn-moddle";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ensureUserAndWorkspace } from "@/lib/user-sync";
import { decryptAiApiKey, isAiKeyEncryptionConfigured } from "@/lib/ai-key-crypto";
import { buildLanguageModel, getProviderMeta, type AiProvider } from "@/lib/ai-providers";
import { rateLimit } from "@/lib/rate-limit";
import { lastUserText, toChatTurns, type ChatTurn } from "@/lib/ai-messages";
import { buildBrandDirective } from "@/lib/brand-directive";
import { recordAiEvent } from "@/lib/ai-events";
type DetailLevel = "low" | "medium" | "high";
type IntentPlan = {
  intentSummary: string;
  primaryGoal: string;
  entities: string[];
  steps: string[];
  relationships: string[];
  requestedStyle: string[];
  assumptions: string[];
  missingInfo: string[];
  ambiguityScore: number;
  detailLevel: DetailLevel;
  shouldAskClarification: boolean;
  clarificationQuestion?: string;
  suggestedPresetId?: SocialPresetId | null;
  suggestedDiagramType?: DiagramType | null;
};

function extractFirstJsonValue(text: string): string | null {
  const s = text.trim();
  const firstObj = s.indexOf("{");
  const firstArr = s.indexOf("[");
  const start =
    firstObj === -1 ? firstArr : firstArr === -1 ? firstObj : Math.min(firstObj, firstArr);
  if (start === -1) return null;

  const open = s[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return s.slice(start, i + 1).trim();
    }
  }

  return null;
}

function normalizeJsonLikeText(text: string): string {
  return text
    .replace(/\u201c|\u201d/g, '"')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/^\uFEFF/, "")
    .trim();
}

function parsePossiblyBrokenJson(raw: string): string | null {
  const candidates: string[] = [];
  const cleaned = normalizeJsonLikeText(raw);
  if (cleaned) candidates.push(cleaned);
  const extracted = extractFirstJsonValue(cleaned);
  if (extracted && extracted !== cleaned) candidates.push(extracted);

  for (const candidate of candidates) {
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      try {
        const repaired = jsonrepair(candidate);
        JSON.parse(repaired);
        return repaired;
      } catch {
        // Continue trying fallbacks
      }
    }
  }

  return null;
}

async function tryDecrementCredit(userId: string): Promise<boolean> {
  const out = await db
    .update(users)
    .set({ creditsBalance: sql`${users.creditsBalance} - 1` })
    .where(and(eq(users.id, userId), gt(users.creditsBalance, 0)))
    .returning({ id: users.id });
  return out.length > 0;
}

async function validateBpmnXml(xml: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = xml.trim();
  if (!trimmed.startsWith("<?xml")) {
    return { ok: false, error: 'BPMN XML must start with `<?xml version="1.0" encoding="UTF-8"?>`.' };
  }
  if (!trimmed.includes("<bpmn2:definitions") && !trimmed.includes("<definitions")) {
    return { ok: false, error: "BPMN XML must include a <bpmn2:definitions> root element." };
  }
  try {
    const moddle = new BpmnModdle();
    await moddle.fromXML(trimmed);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid BPMN XML" };
  }
}

function clampAmbiguityScore(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 50;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function cleanModelOutput(text: string): string {
  return text
    .trim()
    .replace(/^```(?:mermaid|json|xml|bpmn)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

function inferDetailLevel(prompt: string): DetailLevel {
  const words = prompt.trim().split(/\s+/).filter(Boolean).length;
  if (words >= 45) return "high";
  if (words <= 12) return "low";
  return "medium";
}

function defaultIntentPlan(prompt: string): IntentPlan {
  const detailLevel = inferDetailLevel(prompt);
  return {
    intentSummary: prompt.slice(0, 220),
    primaryGoal: "Generate a coherent diagram from user intent",
    entities: [],
    steps: [],
    relationships: [],
    requestedStyle: [],
    assumptions: detailLevel === "low" ? ["User wants a sensible starter flow"] : [],
    missingInfo: detailLevel === "low" ? ["Domain specifics"] : [],
    ambiguityScore: detailLevel === "low" ? 65 : 35,
    detailLevel,
    shouldAskClarification: false,
    clarificationQuestion: undefined,
    suggestedPresetId: null,
  };
}

const VALID_PRESET_IDS: SocialPresetId[] = ["square_feed", "vertical_feed", "story_reel", "landscape", "link_preview"];
const VALID_DIAGRAM_TYPES: DiagramType[] = ["mermaid", "excalidraw", "reactflow", "echarts", "nivo", "tldraw", "bpmn", "cloud", "erd", "orgchart", "timeline", "versus", "matrix2x2", "funnel", "venn", "tierlist", "iceberg", "alignment", "budget", "habits", "bingo", "bracket"];

function parseIntentPlan(raw: string, prompt: string): IntentPlan & { _fallback?: boolean } {
  const repaired = parsePossiblyBrokenJson(raw);
  if (!repaired) return { ...defaultIntentPlan(prompt), _fallback: true };
  try {
    const parsed = JSON.parse(repaired) as Partial<IntentPlan>;
    const detailLevel: DetailLevel =
      parsed.detailLevel === "high" || parsed.detailLevel === "medium" || parsed.detailLevel === "low"
        ? parsed.detailLevel
        : inferDetailLevel(prompt);
    const ambiguityScore = clampAmbiguityScore(parsed.ambiguityScore);
    const clarificationQuestion =
      typeof parsed.clarificationQuestion === "string" && parsed.clarificationQuestion.trim()
        ? parsed.clarificationQuestion.trim()
        : "What is the main outcome and who are the key steps/actors I should include?";
    return {
      intentSummary: parsed.intentSummary?.trim() || prompt.slice(0, 220),
      primaryGoal: parsed.primaryGoal?.trim() || "Generate a coherent diagram from user intent",
      entities: Array.isArray(parsed.entities) ? parsed.entities.map(String).slice(0, 20) : [],
      steps: Array.isArray(parsed.steps) ? parsed.steps.map(String).slice(0, 30) : [],
      relationships: Array.isArray(parsed.relationships) ? parsed.relationships.map(String).slice(0, 30) : [],
      requestedStyle: Array.isArray(parsed.requestedStyle) ? parsed.requestedStyle.map(String).slice(0, 12) : [],
      assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions.map(String).slice(0, 12) : [],
      missingInfo: Array.isArray(parsed.missingInfo) ? parsed.missingInfo.map(String).slice(0, 10) : [],
      ambiguityScore,
      detailLevel,
      shouldAskClarification:
        typeof parsed.shouldAskClarification === "boolean" ? parsed.shouldAskClarification : ambiguityScore >= 75,
      clarificationQuestion,
      suggestedPresetId: typeof parsed.suggestedPresetId === "string" && VALID_PRESET_IDS.includes(parsed.suggestedPresetId as SocialPresetId)
        ? (parsed.suggestedPresetId as SocialPresetId)
        : null,
      suggestedDiagramType: typeof parsed.suggestedDiagramType === "string" && VALID_DIAGRAM_TYPES.includes(parsed.suggestedDiagramType as DiagramType)
        ? (parsed.suggestedDiagramType as DiagramType)
        : null,
    };
  } catch {
    return { ...defaultIntentPlan(prompt), _fallback: true };
  }
}

// ---------------------------------------------------------------------------
// Per-type structural validators — go beyond "is it valid JSON?" and catch
// structurally empty/broken outputs so the retry pass actually fires.
// ---------------------------------------------------------------------------

const MERMAID_VALID_KEYWORDS = [
  "flowchart", "graph", "sequenceDiagram", "erDiagram", "gantt",
  "mindmap", "classDiagram", "stateDiagram", "timeline", "C4Context",
  "pie", "quadrantChart", "sankey-beta", "gitGraph", "xychart-beta",
  "block-beta", "architecture-beta", "journey", "requirementDiagram",
  "zenuml",
];

function validateMermaidStructure(source: string): { ok: boolean; reason?: string } {
  const first = source.trimStart().split(/[\s\n(]/)[0].toLowerCase();
  const valid = MERMAID_VALID_KEYWORDS.some((kw) => source.trimStart().toLowerCase().startsWith(kw.toLowerCase()));
  if (!valid) {
    return { ok: false, reason: `Mermaid output does not start with a valid diagram type keyword (got: "${first}"). Must start with flowchart, sequenceDiagram, erDiagram, gantt, etc.` };
  }
  return { ok: true };
}

const ExcalidrawSchema = z.object({
  elements: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      x: z.number(),
      y: z.number(),
    })
  ).min(1, "Excalidraw elements array must have at least one element"),
});

const ReactFlowSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      position: z.object({ x: z.number(), y: z.number() }),
      data: z.record(z.string(), z.unknown()),
    })
  ).min(1, "ReactFlow nodes array must have at least one node"),
  edges: z.array(
    z.object({ id: z.string(), source: z.string(), target: z.string() })
  ),
});

const EChartsSchema = z.object({
  series: z.array(z.unknown()).min(1, "ECharts option must have at least one series entry"),
});

const NivoSchema = z.object({
  type: z.string().min(1, "Nivo JSON must have a 'type' field"),
  data: z.unknown().refine((v) => v !== undefined && v !== null, { message: "Nivo JSON must have a 'data' field" }),
});

const TldrawSchema = z.union([
  z.object({ elements: z.array(z.unknown()).min(1) }),
  z.object({ document: z.object({ store: z.record(z.string(), z.unknown()) }) }),
]);

function validateReactFlowEdgeRefs(parsed: { nodes: { id: string }[]; edges: { id: string; source: string; target: string }[] }): string | null {
  const nodeIds = new Set(parsed.nodes.map((n) => n.id));
  const dangling = parsed.edges.filter((e) => !nodeIds.has(e.source) || !nodeIds.has(e.target));
  if (dangling.length > 0) {
    return `ReactFlow edges reference non-existent node IDs: ${dangling.map((e) => e.id).join(", ")}`;
  }
  return null;
}

async function validateAndRepairOutput(diagramType: DiagramType, raw: string): Promise<{ ok: true; source: string } | { ok: false; reason: string }> {
  const cleaned = cleanModelOutput(raw);

  if (diagramType === "mermaid") {
    try {
      MermaidSourceSchema.parse(cleaned);
    } catch {
      return { ok: false, reason: "Mermaid source is empty or exceeds maximum length" };
    }
    const structural = validateMermaidStructure(cleaned);
    if (!structural.ok) return { ok: false, reason: structural.reason! };
    return { ok: true, source: cleaned };
  }

  if (["excalidraw", "reactflow", "echarts", "nivo", "tldraw"].includes(diagramType)) {
    const repaired = parsePossiblyBrokenJson(cleaned);
    if (!repaired) return { ok: false, reason: `Invalid JSON for ${diagramType}` };

    let parsed: unknown;
    try { parsed = JSON.parse(repaired); } catch { return { ok: false, reason: `Could not parse ${diagramType} JSON after repair` }; }

    if (diagramType === "excalidraw") {
      const result = ExcalidrawSchema.safeParse(parsed);
      if (!result.success) return { ok: false, reason: `Excalidraw structure invalid: ${result.error.issues[0]?.message}` };
    }
    if (diagramType === "reactflow") {
      const result = ReactFlowSchema.safeParse(parsed);
      if (!result.success) return { ok: false, reason: `ReactFlow structure invalid: ${result.error.issues[0]?.message}` };
      const refError = validateReactFlowEdgeRefs(result.data as { nodes: { id: string }[]; edges: { id: string; source: string; target: string }[] });
      if (refError) return { ok: false, reason: refError };
    }
    if (diagramType === "echarts") {
      const result = EChartsSchema.safeParse(parsed);
      if (!result.success) return { ok: false, reason: `ECharts structure invalid: ${result.error.issues[0]?.message}` };
    }
    if (diagramType === "nivo") {
      const result = NivoSchema.safeParse(parsed);
      if (!result.success) return { ok: false, reason: `Nivo structure invalid: ${result.error.issues[0]?.message}` };
    }
    if (diagramType === "tldraw") {
      const result = TldrawSchema.safeParse(parsed);
      if (!result.success) return { ok: false, reason: `tldraw structure invalid: must have elements[] or document.store` };
    }

    return { ok: true, source: repaired };
  }

  if (diagramType === "bpmn") {
    const v = await validateBpmnXml(cleaned);
    if (!v.ok) return { ok: false, reason: v.error };
    return { ok: true, source: cleaned };
  }

  return { ok: false, reason: "Unsupported diagram type" };
}

export async function POST(req: Request) {
  const requestStart = Date.now();
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    const body: ApiError = { error: "Sign in required", code: "UNAUTHORIZED" };
    return NextResponse.json(body, { status: 401 });
  }

  const { user, workspace } = await ensureUserAndWorkspace(email);

  // Workspace brand kit (optional) — when present, give the AI a palette to
  // honor for color-sensitive diagram types (echarts, mermaid theme overrides,
  // reactflow node colors).
  const brandDirective = await buildBrandDirective(workspace.id);

  // Rate limiting — fixed per user
  const rl = await rateLimit(`ai:${user.id}`, 60, 60_000);
  if (!rl.ok) {
    const body: ApiError = { error: "Too many AI requests", code: "RATE_LIMITED", details: { retryAfter: rl.retryAfter } };
    return NextResponse.json(body, { status: 429 });
  }

  const headerKey = req.headers.get("x-openai-key");
  let apiKey: string | null = headerKey?.trim() || null;
  let skipCredits = user.plan === "pro" || Boolean(headerKey?.trim());
  /** Where the key came from — env keys are always used with the OpenAI-compatible SDK path. */
  type KeySource = "header" | "byok" | "env";
  let keySource: KeySource = "header";

  if (!apiKey) {
    const cipher = user.aiApiKeyCipher ?? null;
    if (cipher) {
      if (!isAiKeyEncryptionConfigured()) {
        const body: ApiError = {
          error:
            "A key is saved but the server is missing AI_KEY_ENCRYPTION_SECRET (min 16 chars). Add it to .env, restart, then re-save your API key in Settings.",
          code: "VALIDATION_ERROR",
        };
        return NextResponse.json(body, { status: 500 });
      }
      try {
        apiKey = decryptAiApiKey(cipher);
        skipCredits = true;
        keySource = "byok";
      } catch {
        const body: ApiError = {
          error:
            "Could not decrypt your saved API key (encryption secret may have changed). Open Settings, paste your API key again, and click Save AI settings.",
          code: "VALIDATION_ERROR",
        };
        return NextResponse.json(body, { status: 400 });
      }
    }
  }

  let detectedProvider: AiProvider | null = null;
  if (!apiKey) {
    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      detectedProvider = "google";
    } else if (process.env.OPENAI_API_KEY) {
      apiKey = process.env.OPENAI_API_KEY;
      detectedProvider = "openai";
    } else if (process.env.AI_GATEWAY_KEY) {
      apiKey = process.env.AI_GATEWAY_KEY;
      detectedProvider = "openai";
    }
    if (apiKey) keySource = "env";
  }

  if (!apiKey) {
    const body: ApiError = {
      error: "No API key configured. Add one in Settings (BYOK — OpenAI, Gemini, Claude, Groq, etc.), or set OPENAI_API_KEY on the server.",
      code: "VALIDATION_ERROR",
    };
    return NextResponse.json(body, { status: 400 });
  }

  if (user.plan === "free" && !skipCredits && user.creditsBalance <= 0) {
    const body: ApiError = {
      error: "No credits left. Add an AI key in Settings, upgrade to Pro, or wait for an admin grant.",
      code: "INSUFFICIENT_CREDITS",
    };
    return NextResponse.json(body, { status: 402 });
  }

  const reqBody = (await req.json()) as {
    prompt?: string;
    diagramType?: DiagramType;
    currentSource?: string;
    conversationHistory?: ChatTurn[];
    messages?: Array<{ role?: string; content?: unknown; parts?: Array<{ type?: string; text?: string }> }>;
    diagramSummary?: string;
    title?: string;
    compact?: boolean;
    useCaseId?: UseCaseId;
    mode?: "patch" | "create";
  };

  const promptText = (reqBody.prompt?.trim() || lastUserText(reqBody.messages)) || undefined;

  if (!promptText) {
    const errBody: ApiError = { error: "prompt required", code: "VALIDATION_ERROR" };
    return NextResponse.json(errBody, { status: 400 });
  }

  const diagramType: DiagramType = reqBody.diagramType ?? "mermaid";
  const systemPrompt = DIAGRAM_SYSTEM_PROMPTS[diagramType];
  const compact = Boolean(reqBody.compact);
  const useCaseId: UseCaseId = reqBody.useCaseId ?? "custom";
  const useCaseStyleBlock = USE_CASE_STYLE_INSTRUCTIONS[useCaseId] ?? "";
  // Patch mode: user is iterating on an existing diagram. Honor an explicit
  // `mode` flag, otherwise infer from whether currentSource is non-empty.
  const hasExistingSource = Boolean(reqBody.currentSource?.trim());
  const generationMode: "patch" | "create" =
    reqBody.mode === "patch" && hasExistingSource ? "patch"
    : reqBody.mode === "create" ? "create"
    : hasExistingSource ? "patch" : "create";

  const userProvider = (user.aiProvider ?? "google") as AiProvider;
  const provider: AiProvider = (keySource === "env" && detectedProvider) ? detectedProvider : userProvider;
  
  const googleModelFromEnv = process.env.GOOGLE_MODEL?.trim();
  const openAiModelFromEnv = process.env.OPENAI_MODEL?.trim();
  
  const model = (keySource === "env" && detectedProvider === "google")
    ? (googleModelFromEnv || "gemini-1.5-flash")
    : (keySource === "env" && detectedProvider === "openai")
    ? (openAiModelFromEnv || "gpt-4o-mini")
    : user.aiModel?.trim() ||
      (provider === "google" ? googleModelFromEnv : undefined) ||
      (provider === "openai" ? openAiModelFromEnv : undefined) ||
      getProviderMeta(provider).defaultModel;
  const baseUrl = (keySource === "env" && detectedProvider === "openai")
    ? (process.env.OPENAI_BASE_URL?.replace(/\/$/, "") ?? null)
    : (user.aiBaseUrl?.replace(/\/$/, "") ?? null);

  let languageModel;
  try {
    languageModel = buildLanguageModel(provider, model, apiKey, baseUrl);
  } catch (e) {
    const errBody: ApiError = { error: "Failed to initialize AI provider", code: "INTERNAL_ERROR", details: String(e) };
    return NextResponse.json(errBody, { status: 500 });
  }

  // Build conversation with history
  const messages: ChatTurn[] = [];
  const history = reqBody.conversationHistory?.length
    ? reqBody.conversationHistory
    : toChatTurns(reqBody.messages).slice(0, -1);
  if (history.length) {
    messages.push(...history.slice(-(compact ? 3 : 4)));
  }
  const sourceSnippet = reqBody.currentSource?.slice(0, compact ? 900 : 2200) ?? "";
  const summarySnippet = reqBody.diagramSummary?.slice(0, compact ? 280 : 560) ?? "";
  const titleSnippet = reqBody.title?.trim() ? reqBody.title.trim().slice(0, 120) : "";

  let userMessage = `Request: ${promptText}`;
  if (titleSnippet) userMessage += `\nTitle: ${titleSnippet}`;
  if (summarySnippet) userMessage += `\nCurrent diagram summary:\n${summarySnippet}`;
  if (sourceSnippet) userMessage += `\nCurrent diagram source:\n\`\`\`\n${sourceSnippet}\n\`\`\``;
  messages.push({ role: "user", content: userMessage });

  try {
    const typeHints: Record<DiagramType, string> = {
      mermaid:    "Extract: flow direction (LR/TD), subgraph groupings, decision points, actor names. Suggest a mermaid subtype in suggestedSubtype (flowchart/sequenceDiagram/erDiagram/gantt/mindmap/classDiagram/stateDiagram-v2/timeline).",
      excalidraw: "Extract: spatial groupings, connection directions, layout preference (left-to-right or top-to-bottom), element categories for color coding.",
      reactflow:  "Extract: node types (start/process/decision/end), edge directions, swim-lane groupings, workflow stages.",
      echarts:    "Extract: series names, axis type (category/time/value), time granularity (daily/monthly/yearly), chart subtype recommendation. Set suggestedSubtype to bar/line/pie/scatter/radar/sankey/treemap/funnel/gauge.",
      nivo:       "Extract: data series names, comparison axes, chart subtype. Set suggestedSubtype to bar/line/pie/radar/treemap/sankey/network/chord/calendar/waffle.",
      tldraw:     "Extract: spatial groupings, hierarchy levels, connection patterns, shape categories.",
      bpmn:       "Extract: participants/lanes, gateway types (exclusive/parallel/inclusive), process stages, happy path vs exception paths, SLA constraints.",
      cloud:      "Extract: cloud provider (aws/gcp/azure/generic), the services/components involved, and the request/data flow direction (clients -> edge -> gateway -> compute -> data). Map each component to a service token from the cloud icon registry.",
      erd:        "Extract: every entity/table, its columns with SQL types, primary keys (PK), foreign keys (FK), unique keys (UK), and the relationships (1:1 / 1:N / N:M) between tables.",
      orgchart:   "Extract: every person (name) and their role/title, plus the reporting lines (who reports to whom). Build a single top-down tree from the most senior leader.",
      timeline:   "Extract: every dated milestone (date + what happened) in chronological order. Keep labels short; move detail to description.",
      versus:     "Extract: the two things being compared and parallel comparison dimensions. Point N on each side must address the same dimension.",
      matrix2x2:  "Extract: the two axes (each with a low/high label) and the items to be plotted in each of the four quadrants.",
      funnel:     "Extract: the funnel stage names in order from top to bottom, and any numeric values or percentages associated with each stage.",
      venn:       "Extract: the two or three sets being compared and the items in each region (exclusive to set A, exclusive to set B, intersection, etc.).",
      tierlist:   "Extract: the tier categories (S/A/B/C/D/F or custom) and the items ranked in each tier from best to worst.",
      iceberg:    "Extract: the layers from top to surface level to deepest/darkest level, with items and descriptions at each depth level.",
      alignment:  "Extract: the axis dimensions (each with opposing labels like left-right, good-evil) and plot the items on the alignment chart.",
      budget:     "Extract: each spending category, its percentage of total, and optional dollar amount. Percentages must sum to 100.",
      habits:     "Extract: the habit being tracked, the month, and which days were completed. Include ALL days of the month.",
      bingo:      "Extract: the theme and 25 bingo square phrases. All squares must relate to the theme.",
      bracket:    "Extract: the tournament subject, all competitors, which round they appear in, and any declared winners.",
    };
    const intentInstruction = `You are analyzing intent for a ${diagramType} diagram. ${typeHints[diagramType]}
Return ONLY JSON matching this shape:
{
  "intentSummary": "short summary",
  "primaryGoal": "what user wants",
  "entities": ["..."],
  "steps": ["..."],
  "relationships": ["A -> B"],
  "requestedStyle": ["layout or design cues"],
  "assumptions": ["safe assumptions"],
  "missingInfo": ["critical unknowns"],
  "suggestedSubtype": "specific subtype recommendation if applicable",
  "ambiguityScore": 0-100,
  "detailLevel": "low|medium|high",
  "shouldAskClarification": true|false,
  "clarificationQuestion": "one concise question",
  "suggestedPresetId": "landscape|square_feed|story_reel|vertical_feed|link_preview|null",
  "suggestedDiagramType": "mermaid|excalidraw|reactflow|echarts|nivo|tldraw|bpmn|cloud|erd|orgchart|timeline|versus|matrix2x2|funnel|venn|tierlist|iceberg|alignment|budget|habits|bingo|bracket|null"
}
Rules:
- Base ambiguity on missing critical nouns/actors/flow direction.
- If request is detailed, detailLevel should be high and shouldAskClarification false.
- Keep arrays compact and practical.
- Set \`shouldAskClarification: true\` ONLY when a critical actor, entity, or structure is completely absent from the prompt AND you cannot make a reasonable assumption. Most requests — even vague ones — should generate immediately with assumptions noted in \`assumptions\`. Do NOT ask for clarification if the user's intent is clear enough to produce a useful diagram. Prefer producing something and noting assumptions over blocking on questions.
- suggestedPresetId rules (STRICT - default to null when unsure):
  - "pitch deck", "presentation", "slides", "keynote", "16:9", "widescreen" -> "landscape"
  - "LinkedIn", "LinkedIn post", "Twitter", "X post", "Facebook post", "square", "1:1" -> "square_feed"
  - "Instagram story", "TikTok", "reel", "story", "vertical video", "9:16" -> "story_reel"
  - "Instagram feed", "portrait", "4:5" -> "vertical_feed"
  - "OG image", "link preview", "Open Graph", "social card", "blog thumbnail" -> "link_preview"
  - "README", "docs", "documentation", "diagram", "chart", "flowchart", no platform signal -> null
  - Only return a non-null value when a STRONG, EXPLICIT platform keyword is present.
  - Do NOT infer from vague style cues like "make it nice" or "for my team".
- suggestedDiagramType rules (ONLY set when prompt strongly fits a DIFFERENT type than current):
  - "chart", "bar chart", "pie chart", "line chart", "graph the data", "visualize numbers", "statistics", "metrics", "compare values" → "echarts"
  - "beautiful chart", "nivo chart", "publication chart" → "nivo"
  - "node graph", "network diagram", "pipeline stages", "dependency graph", "tree nodes" → "reactflow"
  - "org chart", "organizational chart", "reporting structure", "company hierarchy", "who reports to whom", "team structure", "leadership chart" → "orgchart"
  - "whiteboard", "sketch", "brainstorm", "freehand", "wireframe", "rough drawing" → "excalidraw"
  - "BPMN", "business process model", "enterprise workflow", "swim lanes process", "service task" → "bpmn"
  - "infinite canvas", "design mockup", "presentation canvas", "slide layout" → "tldraw"
  - "flowchart", "sequence diagram", "class diagram", "Gantt", "mindmap", "state machine", "C4", "journey map" → "mermaid"
  - "ERD", "database schema", "entity relationship", "data model", "tables and relationships", "DB design", "schema design" → "erd"
  - "architecture diagram", "system design", "infrastructure", "cloud diagram", "AWS", "GCP", "Azure", "how it's deployed", "deployment topology" → "cloud"
  - "timeline", "roadmap", "milestones", "history", "what happened when" → "timeline"
  - "versus", "compare X and Y", "pros cons", "side by side" → "versus"
  - "2x2", "quadrant", "matrix", "SWOT", "effort impact", "priority matrix" → "matrix2x2"
  - "funnel", "conversion", "signup funnel", "marketing funnel", "drop-off" → "funnel"
  - "venn diagram", "overlap", "intersection of", "sets", "what do X and Y share" → "venn"
  - "tier list", "tier ", "ranking", "S tier", "A tier", "rank these", "best to worst" → "tierlist"
  - "iceberg", "hidden depth", "above the surface", "below the surface", "what's below" → "iceberg"
  - "alignment chart", "alignment grid", "3x3 grid", "lawful good", "chaotic evil", "moral alignment" → "alignment"
  - "budget", "spending breakdown", "expense breakdown", "where my money goes", "income split" → "budget"
  - "habit tracker", "streak", "daily habit", "30 day challenge", "habit grid" → "habits"
  - "bingo" → "bingo"
  - "bracket", "tournament", "single elimination", "who wins" → "bracket"
  - DEFAULT to null — do not suggest switching when the current type can serve the request reasonably.`;
    const intentStart = Date.now();
    const { text: intentText } = await generateText({
      model: languageModel,
      system: "You are a diagram intent analyzer. Extract structure from user requests accurately.",
      messages: [
        ...messages.slice(-(compact ? 3 : 4)),
        { role: "user", content: `${intentInstruction}\n\nUser prompt:\n${promptText}\n\nHistory:\n${messages.map((m) => `${m.role}: ${m.content}`).join("\n").slice(-1800)}` },
      ],
      temperature: 0.1,
      maxOutputTokens: compact ? 500 : 800,
    });
    const intentLatencyMs = Date.now() - intentStart;
    const intentPlan = parseIntentPlan(intentText, promptText);
    const shouldClarify = intentPlan.shouldAskClarification && intentPlan.ambiguityScore >= 90;
    if (shouldClarify) {
      return NextResponse.json({
        diagramType,
        source: null,
        needsClarification: true,
        assistantMessage: intentPlan.clarificationQuestion,
        assumptions: intentPlan.assumptions,
      });
    }

    // AI-suggested type switch — use a different diagram type if the intent plan recommends it
    const effectiveDiagramType: DiagramType =
      intentPlan.suggestedDiagramType && intentPlan.suggestedDiagramType !== diagramType
        ? intentPlan.suggestedDiagramType
        : diagramType;
    const effectiveSystemPrompt =
      effectiveDiagramType === diagramType ? systemPrompt : DIAGRAM_SYSTEM_PROMPTS[effectiveDiagramType];

    const baseMaxOutputTokens =
      effectiveDiagramType === "mermaid"
        ? 2500
        : effectiveDiagramType === "bpmn"
          ? 2800
          : effectiveDiagramType === "echarts" || effectiveDiagramType === "nivo"
            ? 3200
            : 3500;
    const maxTokens = compact ? Math.max(900, Math.round(baseMaxOutputTokens * 0.7)) : baseMaxOutputTokens;

    const patchDirective = generationMode === "patch"
      ? `PATCH MODE — the user is iterating on an existing diagram. Apply ONLY the changes implied by the user's latest message. Strict rules:
- Preserve every node / actor / entity / series / shape that the user did NOT ask to remove or modify.
- Preserve all existing IDs, labels, and structural relationships unless the user explicitly asks to rename or restructure them.
- Do NOT regenerate the diagram from scratch. Do NOT switch diagram type unless the user explicitly asks.
- If the user asks to "add", insert new elements alongside the existing ones; if they ask to "remove", delete only the named element; if they ask to "rename", change only the label; if they ask to "simplify", remove only filler/leaf nodes the user wouldn't miss.
- Output the FULL new source (still emit a complete diagram), but the diff from the current source should be minimal and surgical.
`
      : "";
    const generationInstruction = `${brandDirective}${patchDirective}Intent plan:
${JSON.stringify(intentPlan, null, 2)}
${(intentPlan as { suggestedSubtype?: string }).suggestedSubtype ? `\nUse diagram subtype: ${(intentPlan as { suggestedSubtype?: string }).suggestedSubtype}` : ""}
Quality requirements:
- Build a coherent structure, never random nodes.
- Ensure clear start and end when applicable.
- Label edges with intent verbs for flow diagrams.
- Use balanced spacing and avoid overlapping/orphaned nodes.
- Detail scaling: low=compact but complete, medium=moderate branching, high=rich sub-steps and annotations.
- If assumptions are used, encode them conservatively in the diagram content.${useCaseStyleBlock ? `\n${useCaseStyleBlock}` : ""}`;

    const typeSwitched = effectiveDiagramType !== diagramType;
    const switchedTypeLabel = typeSwitched ? getDiagramTypeMeta(effectiveDiagramType).label : null;
    const assumptionNote = typeSwitched
      ? `Switched to ${switchedTypeLabel} — better fit for your prompt.${intentPlan.assumptions.length > 0 ? ` Assumptions: ${intentPlan.assumptions.slice(0, 2).join("; ")}.` : ""}`
      : generationMode === "patch"
        ? `Patched existing diagram${intentPlan.assumptions.length > 0 ? `. Assumptions: ${intentPlan.assumptions.slice(0, 2).join("; ")}.` : "."}`
        : intentPlan.assumptions.length > 0
          ? `Assumptions used: ${intentPlan.assumptions.slice(0, 3).join("; ")}.`
          : "Updated with explicit structure from your request.";

    return createUIMessageStreamResponse({
      stream: createUIMessageStream({
        execute: async ({ writer }: { writer: UIMessageStreamWriter }) => {
        writer.write({
          type: "data-meta",
          data: {
            diagramType: effectiveDiagramType,
            needsClarification: false,
            assumptions: intentPlan.assumptions,
            assistantMessage: assumptionNote,
            detailLevel: intentPlan.detailLevel,
            resolvedSubtype:
              (intentPlan as { suggestedSubtype?: string }).suggestedSubtype ?? effectiveDiagramType,
            typeSwitched,
            suggestedPresetId: intentPlan.suggestedPresetId ?? null,
            intentFallback: Boolean(intentPlan._fallback),
            generationMode,
          },
        });

        const genStart = Date.now();
        const result = streamText({
          model: languageModel,
          system: `${effectiveSystemPrompt}\n\n${generationInstruction}`,
          messages,
          temperature: 0.3,
          maxOutputTokens: maxTokens,
        });

        writer.merge(result.toUIMessageStream());

        let creditCharged = false;
        let validationStatus: "ok" | "repaired" | "failed_after_retry" | "error" = "ok";
        let retryAttempted = false;
        let inputTokens: number | undefined;
        let outputTokens: number | undefined;
        let genLatencyMs: number | undefined;
        let errorMessage: string | undefined;

        try {
          const finalText = await result.text;
          genLatencyMs = Date.now() - genStart;
          try {
            const usage = await result.usage;
            inputTokens = usage?.inputTokens;
            outputTokens = usage?.outputTokens;
          } catch {}

          const validation = await validateAndRepairOutput(effectiveDiagramType, finalText);

          if (!validation.ok) {
            retryAttempted = true;
            const correctiveInstruction = `Your previous ${effectiveDiagramType} output failed validation: ${validation.reason}

Return ONLY the corrected ${effectiveDiagramType} source. No prose, no explanation, no markdown fences. Preserve the intent and structure of your previous attempt; fix only what is broken.`;

            try {
              const corrective = await generateText({
                model: languageModel,
                system: effectiveSystemPrompt,
                messages: [
                  ...messages,
                  { role: "assistant", content: finalText },
                  { role: "user", content: correctiveInstruction },
                ],
                temperature: 0.1,
                maxOutputTokens: maxTokens,
              });
              const recheck = await validateAndRepairOutput(effectiveDiagramType, corrective.text);
              if (recheck.ok) {
                validationStatus = "repaired";
                writer.write({
                  type: "data-meta",
                  data: {
                    correctedSource: recheck.source,
                    validationRepaired: true,
                    validationReason: validation.reason,
                  },
                });
              } else {
                validationStatus = "failed_after_retry";
                console.warn("[AI generate] Corrective pass also failed:", recheck.reason);
                writer.write({
                  type: "data-meta",
                  data: {
                    validationFailed: true,
                    validationReason: validation.reason,
                  },
                });
              }
            } catch (e) {
              validationStatus = "failed_after_retry";
              console.warn("[AI generate] Corrective pass errored:", e);
              writer.write({
                type: "data-meta",
                data: {
                  validationFailed: true,
                  validationReason: validation.reason,
                },
              });
            }
          }

          if (user.plan === "free" && !skipCredits) {
            await tryDecrementCredit(user.id);
            creditCharged = true;
          }
        } catch (e) {
          validationStatus = "error";
          errorMessage = e instanceof Error ? e.message : String(e);
          console.error("[AI generate] post-stream error:", e);
          if (!creditCharged && user.plan === "free" && !skipCredits) {
            await tryDecrementCredit(user.id);
          }
        }

        void recordAiEvent({
          userId: user.id,
          diagramType,
          effectiveDiagramType,
          typeSwitched,
          mode: generationMode,
          provider,
          model,
          promptLength: promptText.length,
          sourceLength: sourceSnippet.length,
          intentLatencyMs,
          genLatencyMs,
          totalLatencyMs: Date.now() - requestStart,
          inputTokens,
          outputTokens,
          validationStatus,
          retryAttempted,
          intentFallback: Boolean(intentPlan._fallback),
          error: errorMessage ?? null,
        });
      },
      }),
    });
  } catch (e) {
    console.error("[AI generate error]", e);
    const errBody: ApiError = { error: e instanceof Error ? e.message : "AI generation failed", code: "INTERNAL_ERROR" };
    return NextResponse.json(errBody, { status: 502 });
  }
}
