import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ensureUserAndWorkspace } from "@/lib/user-sync";
import { decryptAiApiKey, isAiKeyEncryptionConfigured } from "@/lib/ai-key-crypto";
import { listModelsForProvider } from "@/lib/ai-list-models";
import type { AiProvider } from "@/lib/ai-providers";
import { rateLimit } from "@/lib/rate-limit";

function decryptUserKeyIfPresent(cipher: string | null): string | null {
  if (!cipher) return null;
  if (!isAiKeyEncryptionConfigured()) return null;
  try {
    return decryptAiApiKey(cipher);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json(
      { error: "Sign in required", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const { user } = await ensureUserAndWorkspace(email);
  const rl = rateLimit(`ai-models:${user.id}`, 40, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: "Too many model list requests",
        code: "RATE_LIMITED",
        details: { retryAfter: rl.retryAfter },
      },
      { status: 429 }
    );
  }

  let body: {
    provider?: string;
    apiKey?: string;
    baseUrl?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const provider = (body.provider?.trim() || "openai") as AiProvider;
  let apiKey = body.apiKey?.trim() || "";
  let baseUrl = body.baseUrl?.trim() || "";

  if (!apiKey) {
    const fromDb = decryptUserKeyIfPresent(user.aiApiKeyCipher ?? null);
    if (fromDb) apiKey = fromDb;
  }
  if (!baseUrl && user.aiBaseUrl) {
    baseUrl = user.aiBaseUrl;
  }

  const result = await listModelsForProvider(
    provider,
    apiKey,
    baseUrl || null
  );

  return NextResponse.json({
    models: result.models,
    source: result.source,
    ok: result.ok,
    ...(result.ok ? {} : { warning: result.error }),
  });
}
