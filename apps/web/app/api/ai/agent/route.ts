import { NextResponse } from "next/server";
import { streamText, tool, stepCountIs, convertToModelMessages } from "ai";
import { z } from "zod";
import { auth } from "@/auth";
import { ensureUserAndWorkspace } from "@/lib/user-sync";
import { decryptAiApiKey, isAiKeyEncryptionConfigured } from "@/lib/ai-key-crypto";
import { buildLanguageModel, getProviderMeta, type AiProvider } from "@/lib/ai-providers";
import { rateLimit } from "@/lib/rate-limit";
import type { ApiError } from "@flowchart/core";
import { THEME_IDS } from "@flowchart/core";
import { buildBrandDirective } from "@/lib/brand-directive";
import { recordAiEvent } from "@/lib/ai-events";

export async function POST(req: Request) {
  const requestStart = Date.now();
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    const body: ApiError = { error: "Sign in required", code: "UNAUTHORIZED" };
    return NextResponse.json(body, { status: 401 });
  }

  const { user, workspace } = await ensureUserAndWorkspace(email);

  const rl = await rateLimit(`ai-agent:${user.id}`, 60, 60_000);
  if (!rl.ok) {
    const body: ApiError = { error: "Too many AI requests", code: "RATE_LIMITED", details: { retryAfter: rl.retryAfter } };
    return NextResponse.json(body, { status: 429 });
  }

  const headerKey = req.headers.get("x-openai-key");
  let apiKey: string | null = headerKey?.trim() || null;
  let keySource: "header" | "byok" | "env" = "header";

  if (!apiKey) {
    const cipher = user.aiApiKeyCipher ?? null;
    if (cipher) {
      if (!isAiKeyEncryptionConfigured()) {
         const body: ApiError = { error: "Server missing encryption secret.", code: "VALIDATION_ERROR" };
         return NextResponse.json(body, { status: 500 });
      }
      try {
        apiKey = decryptAiApiKey(cipher);
        keySource = "byok";
      } catch {
         const body: ApiError = { error: "Could not decrypt API key.", code: "VALIDATION_ERROR" };
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
    const body: ApiError = { error: "No API key configured.", code: "VALIDATION_ERROR" };
    return NextResponse.json(body, { status: 400 });
  }

  const reqBody = await req.json();
  const { messages, currentSource, diagramType, title, themeId, useCaseId } = reqBody;

  if (!messages || !Array.isArray(messages)) {
    const errBody: ApiError = { error: "messages array required", code: "VALIDATION_ERROR" };
    return NextResponse.json(errBody, { status: 400 });
  }

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

  const brandDirective = await buildBrandDirective(workspace.id);
  const hasBrandKit = brandDirective.length > 0;
  const stateContext = `CURRENT STATE:
- title: ${title || "(untitled)"}
- theme: ${themeId || "(default)"}
- use-case: ${useCaseId || "(none)"}
- brand kit configured: ${hasBrandKit ? "yes" : "no"}`;

  let toolCallCount = 0;
  const lastUserText = [...messages].reverse().find((m: { role?: string }) => m?.role === "user");
  const promptLength = JSON.stringify(lastUserText ?? "").length;
  const sourceLength = (currentSource || "").length;

  try {
    const result = streamText({
      model: languageModel,
      messages: await convertToModelMessages(messages),
      stopWhen: stepCountIs(5),
      onFinish: ({ usage }) => {
        void recordAiEvent({
          userId: user.id,
          diagramType,
          effectiveDiagramType: diagramType,
          typeSwitched: false,
          mode: "agent",
          provider,
          model,
          promptLength,
          sourceLength,
          intentLatencyMs: null,
          genLatencyMs: null,
          totalLatencyMs: Date.now() - requestStart,
          inputTokens: usage?.inputTokens ?? null,
          outputTokens: usage?.outputTokens ?? null,
          validationStatus: "ok",
          retryAttempted: false,
          intentFallback: false,
          toolCalls: toolCallCount,
          error: null,
        });
      },
      system: `You are an autonomous Lovable-style AI agent building diagrams for the user.
You can use tools to inspect and update the diagram, its title, theme, palette, and use-case.
The current diagram type is: ${diagramType}.

${stateContext}

${brandDirective}

Current source code:
\`\`\`
${currentSource || "No source provided"}
\`\`\`

TOOLS:
- update_diagram: full rewrite of diagram source
- apply_patch: surgical find-and-replace on existing source
- update_node: React Flow only — update a node's label/style by ID
- fetch_external_data: fetch JSON from a URL or generate contextual sample data by keyword
- set_title: rename the diagram
- set_theme: change the visual theme (only the listed theme ids)
- set_palette: change the color palette
- apply_brand_kit: apply the user's saved brand colors (only if a brand kit is configured)
- set_use_case: set the diagram's intended use-case

STRATEGY:
1. For small changes (color, text, 1-2 nodes), prefer 'apply_patch' or 'update_node'.
2. For large changes or new diagrams, use 'update_diagram' with the full code.
3. For chart/data diagrams, call 'fetch_external_data' first, then build the diagram from the returned rows.
4. To restyle, prefer 'set_theme'/'set_palette'/'apply_brand_kit' over editing colors by hand.
5. Do not call 'apply_brand_kit' unless a brand kit is configured (see CURRENT STATE).
6. Always briefly explain what you are doing before calling a tool.`,
      tools: {
        update_diagram: tool({
          description: "Update or create the diagram source code (Full rewrite).",
          inputSchema: z.object({
            sourceCode: z.string().describe("The new diagram syntax/JSON to apply"),
            explanation: z.string().describe("Brief explanation of the changes"),
          }),
          execute: async ({ sourceCode, explanation }) => {
            toolCallCount++;
            return { success: true, explanation, sourceCode };
          },
        }),
        apply_patch: tool({
          description: "Apply a targeted text replacement to the diagram source (Surgical edit).",
          inputSchema: z.object({
            find: z.string().describe("The exact text or line to find"),
            replace: z.string().describe("The replacement text"),
            explanation: z.string().describe("Why this change is being made"),
          }),
          execute: async ({ find, replace, explanation }) => {
            toolCallCount++;
            return { success: true, find, replace, explanation };
          },
        }),
        update_node: tool({
          description: "Specifically for React Flow: Update a node's properties.",
          inputSchema: z.object({
            id: z.string().describe("Node ID"),
            data: z.any().optional().describe("New data (label, etc)"),
            style: z.any().optional().describe("New styles (color, border, etc)"),
          }),
          execute: async (args) => {
            toolCallCount++;
            return { success: true, ...args };
          },
        }),
        fetch_external_data: tool({
          description: "Fetch data from an external URL (JSON) or generate contextual sample data by keyword.",
          inputSchema: z.object({
            sourceName: z.string().describe("A URL (https://...) or a descriptive name like 'sales_data.csv'"),
          }),
          execute: async ({ sourceName }) => {
            toolCallCount++;
            // Real URL → fetch with SSRF guard
            if (sourceName.startsWith("http://") || sourceName.startsWith("https://")) {
              try {
                const url = new URL(sourceName);
                if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(url.hostname)) {
                  return { success: false, error: "Private/internal URLs are not allowed." };
                }
                const res = await fetch(sourceName, { signal: AbortSignal.timeout(6_000) });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const ct = res.headers.get("content-type") ?? "";
                if (ct.includes("json")) {
                  const raw = await res.json() as unknown;
                  const rows = Array.isArray(raw) ? (raw as unknown[]).slice(0, 50) : [raw];
                  return { success: true, data: rows, summary: `Fetched ${rows.length} rows from ${sourceName}` };
                }
                const text = await res.text();
                return { success: true, data: [{ content: text.slice(0, 2000) }], summary: `Fetched text from ${sourceName}` };
              } catch (e) {
                return { success: false, error: e instanceof Error ? e.message : "Fetch failed" };
              }
            }

            // Keyword-based contextual sample data
            const n = sourceName.toLowerCase();
            let data: Record<string, unknown>[];

            if (/sales|revenue|financial/.test(n)) {
              data = [
                { quarter: "Q1", revenue: 420000, costs: 210000, profit: 210000 },
                { quarter: "Q2", revenue: 510000, costs: 245000, profit: 265000 },
                { quarter: "Q3", revenue: 480000, costs: 230000, profit: 250000 },
                { quarter: "Q4", revenue: 620000, costs: 290000, profit: 330000 },
              ];
            } else if (/user|customer|signup/.test(n)) {
              data = [
                { month: "Jan", users: 1200, churn: 80, net: 1120 },
                { month: "Feb", users: 1450, churn: 95, net: 1355 },
                { month: "Mar", users: 1700, churn: 110, net: 1590 },
                { month: "Apr", users: 1950, churn: 120, net: 1830 },
                { month: "May", users: 2100, churn: 100, net: 2000 },
              ];
            } else if (/traffic|visit|page/.test(n)) {
              data = [
                { page: "/home", visits: 12400, bounce: "48%", avg_time: "2:10" },
                { page: "/pricing", visits: 5200, bounce: "35%", avg_time: "3:45" },
                { page: "/docs", visits: 3800, bounce: "22%", avg_time: "5:20" },
                { page: "/blog", visits: 2900, bounce: "55%", avg_time: "1:50" },
              ];
            } else if (/product|inventory|stock/.test(n)) {
              data = [
                { product: "Plan A", units: 450, revenue: 22500, margin: "40%" },
                { product: "Plan B", units: 290, revenue: 43500, margin: "55%" },
                { product: "Plan C", units: 80, revenue: 32000, margin: "65%" },
              ];
            } else if (/task|project|sprint/.test(n)) {
              data = [
                { task: "Design", status: "done", estimate: 8, actual: 9 },
                { task: "Backend", status: "in_progress", estimate: 20, actual: 14 },
                { task: "Frontend", status: "in_progress", estimate: 15, actual: 8 },
                { task: "Testing", status: "todo", estimate: 10, actual: 0 },
                { task: "Deploy", status: "todo", estimate: 4, actual: 0 },
              ];
            } else {
              data = [
                { category: "A", value: 100 },
                { category: "B", value: 250 },
                { category: "C", value: 180 },
              ];
            }

            return { success: true, data, summary: `Generated ${data.length} rows for "${sourceName}"` };
          },
        }),
        set_title: tool({
          description: "Rename the diagram.",
          inputSchema: z.object({
            title: z.string().describe("The new diagram title"),
            explanation: z.string().describe("Why this title"),
          }),
          execute: async ({ title, explanation }) => {
            toolCallCount++;
            return { success: true, title, explanation };
          },
        }),
        set_theme: tool({
          description: "Change the diagram's visual theme.",
          inputSchema: z.object({
            themeId: z.enum(THEME_IDS).describe("One of the allowed theme ids"),
            explanation: z.string().describe("Why this theme"),
          }),
          execute: async ({ themeId, explanation }) => {
            toolCallCount++;
            return { success: true, themeId, explanation };
          },
        }),
        set_palette: tool({
          description: "Change the color palette.",
          inputSchema: z.object({
            paletteId: z.enum(["indigo", "sunset", "ocean", "forest", "default"]).describe("Palette id"),
            explanation: z.string().describe("Why this palette"),
          }),
          execute: async ({ paletteId, explanation }) => {
            toolCallCount++;
            return { success: true, paletteId, explanation };
          },
        }),
        apply_brand_kit: tool({
          description: "Apply the user's saved brand colors. Only call when a brand kit is configured.",
          inputSchema: z.object({
            explanation: z.string().describe("Why apply the brand kit"),
          }),
          execute: async ({ explanation }) => {
            toolCallCount++;
            return { success: true, explanation };
          },
        }),
        set_use_case: tool({
          description: "Set the diagram's intended use-case (affects preset and styling).",
          inputSchema: z.object({
            useCaseId: z.enum(["presentation", "social", "documentation", "custom"]).describe("Use-case id"),
            explanation: z.string().describe("Why this use-case"),
          }),
          execute: async ({ useCaseId, explanation }) => {
            toolCallCount++;
            return { success: true, useCaseId, explanation };
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (e) {
    console.error("[Agent error]", e);
    const errBody: ApiError = { error: e instanceof Error ? e.message : "Agent failed", code: "INTERNAL_ERROR" };
    return NextResponse.json(errBody, { status: 502 });
  }
}
