import { NextResponse } from "next/server";
import { generateText } from "ai";
import { DIAGRAM_SYSTEM_PROMPTS } from "@flowchart/core";
import { buildLanguageModel } from "@/lib/ai-providers";
import { validateAndRepairOutput } from "@/lib/diagrams/validate-output";
import { rateLimit } from "@/lib/rate-limit";

const MAX_DEMO_USES = 3;
const COOKIE_NAME = "fs_demo_uses";

function getDemoUses(cookieHeader: string | null): number {
  if (!cookieHeader) return 0;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=(\\d+)`));
  return match ? Math.min(parseInt(match[1], 10), MAX_DEMO_USES) : 0;
}

function buildDemoApiKey(): { apiKey: string; provider: "openai" | "google" } | null {
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return { apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY, provider: "google" };
  }
  if (process.env.OPENAI_API_KEY) {
    return { apiKey: process.env.OPENAI_API_KEY, provider: "openai" };
  }
  if (process.env.AI_GATEWAY_KEY) {
    return { apiKey: process.env.AI_GATEWAY_KEY, provider: "openai" };
  }
  return null;
}

export async function POST(req: Request) {
  // IP-based rate limit: 20 requests per minute per IP
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const ipRl = await rateLimit(`demo:ip:${ip}`, 20, 60_000);
  if (!ipRl.ok) {
    return NextResponse.json({ error: "limit" }, { status: 429 });
  }

  const uses = getDemoUses(req.headers.get("cookie"));

  if (uses >= MAX_DEMO_USES) {
    return NextResponse.json({ error: "limit" }, { status: 429 });
  }

  let body: { prompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 800) : "";
  if (!prompt) {
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }

  const credentials = buildDemoApiKey();
  if (!credentials) {
    return NextResponse.json({ error: "no_api_key" }, { status: 503 });
  }

  const googleModelFromEnv = process.env.GOOGLE_MODEL?.trim();
  const openAiModelFromEnv = process.env.OPENAI_MODEL?.trim();
  const model =
    credentials.provider === "google"
      ? (googleModelFromEnv || "gemini-1.5-flash")
      : (openAiModelFromEnv || "gpt-4o-mini");

  const languageModel = buildLanguageModel(credentials.provider, model, credentials.apiKey, null);
  const systemPrompt = DIAGRAM_SYSTEM_PROMPTS["mermaid"];

  let raw: string;
  try {
    const result = await generateText({
      model: languageModel,
      system: systemPrompt,
      prompt: `Request: ${prompt}`,
      maxOutputTokens: 1200,
    });
    raw = result.text.trim();
  } catch {
    return NextResponse.json({ error: "generation_failed" }, { status: 500 });
  }

  const validation = await validateAndRepairOutput("mermaid", raw);
  const source = validation.ok ? validation.source : raw;

  const newUses = uses + 1;
  const response = NextResponse.json({ diagramType: "mermaid", source });
  response.cookies.set(COOKIE_NAME, String(newUses), {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
