import { NextResponse } from "next/server";
import { generateText } from "ai";
import { and, eq, gt, sql } from "drizzle-orm";
import { jsonrepair } from "jsonrepair";
import { z } from "zod";
import { MermaidSourceSchema, DIAGRAM_SYSTEM_PROMPTS } from "@flowchart/core";
import type { DiagramType, SocialPresetId } from "@flowchart/core";
import type { ApiError } from "@flowchart/core";
import { BpmnModdle } from "bpmn-moddle";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ensureUserAndWorkspace } from "@/lib/user-sync";
import { decryptAiApiKey, isAiKeyEncryptionConfigured } from "@/lib/ai-key-crypto";
import { buildLanguageModel, getProviderMeta, type AiProvider } from "@/lib/ai-providers";
import { rateLimit } from "@/lib/rate-limit";

type ChatTurn = { role: "user" | "assistant"; content: string };
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
      data: z.record(z.unknown()),
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
  z.object({ document: z.object({ store: z.record(z.unknown()) }) }),
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
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    const body: ApiError = { error: "Sign in required", code: "UNAUTHORIZED" };
    return NextResponse.json(body, { status: 401 });
  }

  const { user } = await ensureUserAndWorkspace(email);

  // Rate limiting — fixed per user
  const rl = rateLimit(`ai:${user.id}`, 60, 60_000);
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

  if (!apiKey) {
    apiKey = process.env.OPENAI_API_KEY || process.env.AI_GATEWAY_KEY || null;
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
    diagramSummary?: string;
    title?: string;
    compact?: boolean;
  };

  if (!reqBody.prompt?.trim()) {
    const errBody: ApiError = { error: "prompt required", code: "VALIDATION_ERROR" };
    return NextResponse.json(errBody, { status: 400 });
  }

  const diagramType: DiagramType = reqBody.diagramType ?? "mermaid";
  const systemPrompt = DIAGRAM_SYSTEM_PROMPTS[diagramType];
  const compact = Boolean(reqBody.compact);

  const userProvider = (user.aiProvider ?? "openai") as AiProvider;
  // Hosted OpenAI / gateway env vars are not valid for Google, Anthropic, etc. SDKs.
  const useEnvOpenAiCompatible = keySource === "env";
  const provider: AiProvider = useEnvOpenAiCompatible ? "openai" : userProvider;
  const openAiModelFromEnv = process.env.OPENAI_MODEL?.trim();
  const model = useEnvOpenAiCompatible
    ? (openAiModelFromEnv || "gpt-4o-mini")
    : user.aiModel?.trim() ||
      (provider === "openai" ? openAiModelFromEnv : undefined) ||
      getProviderMeta(provider).defaultModel;
  const baseUrl = useEnvOpenAiCompatible
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
  if (reqBody.conversationHistory?.length) {
    messages.push(...reqBody.conversationHistory.slice(-(compact ? 3 : 4)));
  }
  const sourceSnippet = reqBody.currentSource?.slice(0, compact ? 900 : 2200) ?? "";
  const summarySnippet = reqBody.diagramSummary?.slice(0, compact ? 280 : 560) ?? "";
  const titleSnippet = reqBody.title?.trim() ? reqBody.title.trim().slice(0, 120) : "";
  const promptText = reqBody.prompt.trim();

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
  "suggestedPresetId": "landscape|square_feed|story_reel|vertical_feed|link_preview|null"
}
Rules:
- Base ambiguity on missing critical nouns/actors/flow direction.
- If request is detailed, detailLevel should be high and shouldAskClarification false.
- Keep arrays compact and practical.
- suggestedPresetId rules (STRICT - default to null when unsure):
  - "pitch deck", "presentation", "slides", "keynote", "16:9", "widescreen" -> "landscape"
  - "LinkedIn", "LinkedIn post", "Twitter", "X post", "Facebook post", "square", "1:1" -> "square_feed"
  - "Instagram story", "TikTok", "reel", "story", "vertical video", "9:16" -> "story_reel"
  - "Instagram feed", "portrait", "4:5" -> "vertical_feed"
  - "OG image", "link preview", "Open Graph", "social card", "blog thumbnail" -> "link_preview"
  - "README", "docs", "documentation", "diagram", "chart", "flowchart", no platform signal -> null
  - Only return a non-null value when a STRONG, EXPLICIT platform keyword is present.
  - Do NOT infer from vague style cues like "make it nice" or "for my team".`;
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
    const intentPlan = parseIntentPlan(intentText, promptText);
    const shouldClarify = intentPlan.shouldAskClarification && intentPlan.ambiguityScore >= 68;
    if (shouldClarify) {
      return NextResponse.json({
        diagramType,
        source: null,
        needsClarification: true,
        assistantMessage: intentPlan.clarificationQuestion,
        assumptions: intentPlan.assumptions,
      });
    }

    const baseMaxOutputTokens =
      diagramType === "mermaid"
        ? 2500
        : diagramType === "bpmn"
          ? 2800
          : diagramType === "echarts" || diagramType === "nivo"
            ? 3200
            : 3500;
    const maxOutputTokens = compact ? Math.max(900, Math.round(baseMaxOutputTokens * 0.7)) : baseMaxOutputTokens;

    const generationInstruction = `Intent plan:
${JSON.stringify(intentPlan, null, 2)}
${(intentPlan as { suggestedSubtype?: string }).suggestedSubtype ? `\nUse diagram subtype: ${(intentPlan as { suggestedSubtype?: string }).suggestedSubtype}` : ""}
Quality requirements:
- Build a coherent structure, never random nodes.
- Ensure clear start and end when applicable.
- Label edges with intent verbs for flow diagrams.
- Use balanced spacing and avoid overlapping/orphaned nodes.
- Detail scaling: low=compact but complete, medium=moderate branching, high=rich sub-steps and annotations.
- If assumptions are used, encode them conservatively in the diagram content.`;

    const { text } = await generateText({
      model: languageModel,
      system: `${systemPrompt}\n\n${generationInstruction}`,
      messages,
      temperature: 0.3,
      maxOutputTokens,
    });
    let validated = await validateAndRepairOutput(diagramType, text);
    if (!validated.ok) {
      const { text: retryText } = await generateText({
        model: languageModel,
        system: `${systemPrompt}\n\nReturn only valid ${diagramType} output.`,
        messages: [
          ...messages,
          {
            role: "user",
            content: `Your previous output failed validation: ${validated.reason}. Fix and regenerate from scratch. Respect this intent:\n${JSON.stringify(intentPlan)}`,
          },
        ],
        temperature: 0.15,
        maxOutputTokens,
      });
      validated = await validateAndRepairOutput(diagramType, retryText);
      if (!validated.ok) {
        const errBody: ApiError = {
          error: `Model returned invalid output for ${diagramType}`,
          code: diagramType === "mermaid" ? "MERMAID_PARSE_ERROR" : "VALIDATION_ERROR",
          details: { reason: validated.reason },
        };
        return NextResponse.json(errBody, { status: 422 });
      }
    }

    if (user.plan === "free" && !skipCredits) {
      const ok = await tryDecrementCredit(user.id);
      if (!ok) {
        const errBody: ApiError = { error: "Could not deduct credit; try again.", code: "INSUFFICIENT_CREDITS" };
        return NextResponse.json(errBody, { status: 402 });
      }
    }

    const assumptionNote =
      intentPlan.assumptions.length > 0
        ? `Assumptions used: ${intentPlan.assumptions.slice(0, 3).join("; ")}.`
        : "Updated with explicit structure from your request.";

    return NextResponse.json({
      source: validated.source,
      diagramType,
      needsClarification: false,
      assumptions: intentPlan.assumptions,
      assistantMessage: assumptionNote,
      ...(intentPlan.suggestedPresetId != null ? { suggestedPresetId: intentPlan.suggestedPresetId } : {}),
      ...(intentPlan._fallback ? { intentFallback: true } : {}),
    });
  } catch (e) {
    console.error("[AI generate error]", e);
    const errBody: ApiError = { error: e instanceof Error ? e.message : "AI generation failed", code: "INTERNAL_ERROR" };
    return NextResponse.json(errBody, { status: 502 });
  }
}
