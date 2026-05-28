"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ensureUserAndWorkspace } from "@/lib/user-sync";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  encryptAiApiKey,
  isAiKeyEncryptionConfigured,
} from "@/lib/ai-key-crypto";
import type { AiProvider } from "@/lib/ai-providers";
import { validateAiBaseUrl } from "@/lib/ai-providers";

export type AiSettingsState = {
  hasKey: boolean;
  keyLast4: string | null;
  baseUrl: string | null;
  model: string | null;
  provider: AiProvider;
  encryptionReady: boolean;
};

export async function getAiSettingsForUser(): Promise<AiSettingsState | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  const { user } = await ensureUserAndWorkspace(email);
  return {
    hasKey: Boolean(user.aiApiKeyCipher),
    keyLast4: user.aiKeyLast4 ?? null,
    baseUrl: user.aiBaseUrl ?? null,
    model: user.aiModel ?? null,
    provider: (user.aiProvider as AiProvider) ?? "openai",
    encryptionReady: isAiKeyEncryptionConfigured(),
  };
}

export async function saveAiSettings(formData: FormData) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) throw new Error("Unauthorized");
  if (!isAiKeyEncryptionConfigured()) {
    throw new Error("AI_KEY_ENCRYPTION_SECRET is not configured on the server");
  }

  const { user } = await ensureUserAndWorkspace(email);
  const apiKeyRaw = (formData.get("aiApiKey") as string)?.trim() ?? "";
  const baseUrl = (formData.get("aiBaseUrl") as string)?.trim() || null;
  const model = (formData.get("aiModel") as string)?.trim() || null;
  const provider = ((formData.get("aiProvider") as string)?.trim() || "openai") as AiProvider;

  // Reject non-HTTPS and unknown hosts to prevent SSRF. Ollama is localhost-only and bypasses this check.
  if (baseUrl && provider !== "ollama" && !validateAiBaseUrl(baseUrl)) {
    throw new Error("Invalid base URL. Must be https:// and a known AI provider host.");
  }

  const updates: {
    aiApiKeyCipher?: string | null;
    aiKeyLast4?: string | null;
    aiBaseUrl?: string | null;
    aiModel?: string | null;
    aiProvider?: string;
  } = {
    aiBaseUrl: baseUrl,
    aiModel: model,
    aiProvider: provider,
  };

  if (apiKeyRaw) {
    updates.aiApiKeyCipher = encryptAiApiKey(apiKeyRaw);
    updates.aiKeyLast4 = apiKeyRaw.slice(-4);
  }

  await db.update(users).set(updates).where(eq(users.id, user.id));
  revalidatePath("/app/settings");
  redirect("/app/settings?ai=saved");
}

export async function clearAiApiKey() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) throw new Error("Unauthorized");
  const { user } = await ensureUserAndWorkspace(email);
  await db
    .update(users)
    .set({ aiApiKeyCipher: null, aiKeyLast4: null })
    .where(eq(users.id, user.id));
  revalidatePath("/app/settings");
  redirect("/app/settings?ai=cleared");
}
