import { NextResponse } from "next/server";
import { streamText, tool } from "ai";
import { z } from "zod";
import { auth } from "@/auth";
import { ensureUserAndWorkspace } from "@/lib/user-sync";
import { decryptAiApiKey, isAiKeyEncryptionConfigured } from "@/lib/ai-key-crypto";
import { buildLanguageModel, getProviderMeta, type AiProvider } from "@/lib/ai-providers";
import { rateLimit } from "@/lib/rate-limit";
import type { ApiError } from "@flowchart/core";

export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    const body: ApiError = { error: "Sign in required", code: "UNAUTHORIZED" };
    return NextResponse.json(body, { status: 401 });
  }

  const { user } = await ensureUserAndWorkspace(email);

  const rl = rateLimit(`ai-agent:${user.id}`, 60, 60_000);
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
  const { messages, currentSource, diagramType } = reqBody;

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

  try {
    const result = streamText({
      model: languageModel,
      messages,
      maxSteps: 5, // Allow the agent to take multiple steps (use tools)
      system: `You are an autonomous Lovable-style AI agent building diagrams for the user.
You can use tools to inspect and update the diagram source code.
The current diagram type is: ${diagramType}.

Current source code:
\`\`\`
${currentSource || "No source provided"}
\`\`\`

STRATEGY:
1. For small changes (color, text, adding 1-2 nodes), use 'apply_patch' or 'update_node' (React Flow only) for surgical edits.
2. For large changes or new diagrams, use 'update_diagram' with the full code.
3. If the user asks for chart data, use 'fetch_external_data' to load sample rows, then incorporate them.
4. Always explain what you are doing before calling a tool.`,
      tools: {
        update_diagram: tool({
          description: "Update or create the diagram source code (Full rewrite).",
          parameters: z.object({
            sourceCode: z.string().describe("The new diagram syntax/JSON to apply"),
            explanation: z.string().describe("Brief explanation of the changes"),
          }),
          execute: async ({ sourceCode, explanation }) => {
            return { success: true, explanation, sourceCode };
          },
        }),
        apply_patch: tool({
          description: "Apply a targeted text replacement to the diagram source (Surgical edit).",
          parameters: z.object({
            find: z.string().describe("The exact text or line to find"),
            replace: z.string().describe("The replacement text"),
            explanation: z.string().describe("Why this change is being made"),
          }),
          execute: async ({ find, replace, explanation }) => {
            return { success: true, find, replace, explanation };
          },
        }),
        update_node: tool({
          description: "Specifically for React Flow: Update a node's properties.",
          parameters: z.object({
            id: z.string().describe("Node ID"),
            data: z.any().optional().describe("New data (label, etc)"),
            style: z.any().optional().describe("New styles (color, border, etc)"),
          }),
          execute: async (args) => {
            return { success: true, ...args };
          },
        }),
        fetch_external_data: tool({
          description: "Fetch data from an external source (Excel, JSON, Database mock).",
          parameters: z.object({
            sourceName: z.string().describe("Name of the source (e.g., 'sales_data.csv')"),
          }),
          execute: async ({ sourceName }) => {
             return { 
               success: true, 
               data: [
                 { category: "A", value: 100 },
                 { category: "B", value: 250 },
                 { category: "C", value: 180 }
               ],
               summary: "Retrieved 3 rows of data from " + sourceName 
             };
          },
        }),
      },
    });

    return result.toDataStreamResponse();
  } catch (e) {
    console.error("[Agent error]", e);
    const errBody: ApiError = { error: e instanceof Error ? e.message : "Agent failed", code: "INTERNAL_ERROR" };
    return NextResponse.json(errBody, { status: 502 });
  }
}
