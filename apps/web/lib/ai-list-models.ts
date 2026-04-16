import type { AiProvider } from "@/lib/ai-providers";
import { getProviderMeta } from "@/lib/ai-providers";

function stripTrailingSlashes(s: string): string {
  return s.replace(/\/+$/, "");
}

/** OpenAI-compatible GET /v1/models */
async function fetchOpenAiCompatibleModelIds(
  baseUrl: string,
  apiKey: string
): Promise<string[]> {
  const root = stripTrailingSlashes(baseUrl);
  const modelsUrl = root.endsWith("/v1")
    ? `${root}/models`
    : `${root}/v1/models`;
  const res = await fetch(modelsUrl, {
    headers: { Authorization: `Bearer ${apiKey}` },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `HTTP ${res.status}`);
  }
  const json = (await res.json()) as { data?: { id?: string }[] };
  const ids =
    json.data?.map((d) => d.id).filter((id): id is string => Boolean(id)) ??
    [];
  return [...new Set(ids)].sort();
}

/** Ollama native tags (no /v1) */
async function fetchOllamaTags(baseUrl: string): Promise<string[]> {
  const root = stripTrailingSlashes(baseUrl).replace(/\/v1$/, "");
  const url = `${root}/api/tags`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `HTTP ${res.status}`);
  }
  const json = (await res.json()) as { models?: { name?: string }[] };
  const names =
    json.models?.map((m) => m.name).filter((n): n is string => Boolean(n)) ??
    [];
  return [...new Set(names)].sort();
}

async function fetchAnthropicModels(apiKey: string): Promise<string[]> {
  const res = await fetch("https://api.anthropic.com/v1/models", {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `HTTP ${res.status}`);
  }
  const json = (await res.json()) as { data?: { id?: string }[] };
  const ids =
    json.data?.map((d) => d.id).filter((id): id is string => Boolean(id)) ??
    [];
  return [...new Set(ids)].sort();
}

async function fetchGoogleModels(apiKey: string): Promise<string[]> {
  const url = new URL(
    "https://generativelanguage.googleapis.com/v1beta/models"
  );
  const res = await fetch(url.toString(), {
    headers: { "x-goog-api-key": apiKey },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `HTTP ${res.status}`);
  }
  const json = (await res.json()) as {
    models?: { name?: string; supportedGenerationMethods?: string[] }[];
  };
  const out: string[] = [];
  for (const m of json.models ?? []) {
    if (!m.name) continue;
    const methods = m.supportedGenerationMethods ?? [];
    if (
      methods.includes("generateContent") ||
      methods.includes("generateMessage")
    ) {
      const short = m.name.replace(/^models\//, "");
      out.push(short);
    }
  }
  return [...new Set(out)].sort();
}

export type ListModelsResult =
  | { ok: true; models: string[]; source: "remote" | "fallback" }
  | { ok: false; error: string; models: string[]; source: "fallback" };

/**
 * Resolve models from provider APIs where possible; on failure return static suggestions.
 */
export async function listModelsForProvider(
  provider: AiProvider,
  apiKey: string,
  baseUrlInput: string | null | undefined
): Promise<ListModelsResult> {
  const meta = getProviderMeta(provider);
  const fallback = meta.models.length ? meta.models : [meta.defaultModel];

  const baseUrl =
    (baseUrlInput?.trim() || meta.defaultBaseUrl || "").trim() || null;

  try {
    switch (provider) {
      case "openai": {
        const root = baseUrl || "https://api.openai.com/v1";
        if (!apiKey) {
          return {
            ok: false,
            error: "API key required",
            models: fallback,
            source: "fallback",
          };
        }
        const models = await fetchOpenAiCompatibleModelIds(root, apiKey);
        return {
          ok: true,
          models: models.length ? models : fallback,
          source: models.length ? "remote" : "fallback",
        };
      }
      case "groq": {
        const root = baseUrl || "https://api.groq.com/openai/v1";
        if (!apiKey) {
          return {
            ok: false,
            error: "API key required",
            models: fallback,
            source: "fallback",
          };
        }
        const models = await fetchOpenAiCompatibleModelIds(root, apiKey);
        return {
          ok: true,
          models: models.length ? models : fallback,
          source: models.length ? "remote" : "fallback",
        };
      }
      case "mistral": {
        const root = baseUrl || "https://api.mistral.ai/v1";
        if (!apiKey) {
          return {
            ok: false,
            error: "API key required",
            models: fallback,
            source: "fallback",
          };
        }
        const models = await fetchOpenAiCompatibleModelIds(root, apiKey);
        return {
          ok: true,
          models: models.length ? models : fallback,
          source: models.length ? "remote" : "fallback",
        };
      }
      case "custom": {
        if (!baseUrl) {
          return {
            ok: false,
            error: "Base URL required for custom provider",
            models: fallback,
            source: "fallback",
          };
        }
        if (!apiKey) {
          return {
            ok: false,
            error: "API key required (use placeholder if your server ignores it)",
            models: fallback,
            source: "fallback",
          };
        }
        const models = await fetchOpenAiCompatibleModelIds(baseUrl, apiKey);
        return {
          ok: true,
          models: models.length ? models : fallback,
          source: models.length ? "remote" : "fallback",
        };
      }
      case "ollama": {
        const root = baseUrl || "http://localhost:11434/v1";
        const key = apiKey || "ollama";
        try {
          const openAi = await fetchOpenAiCompatibleModelIds(root, key);
          if (openAi.length) {
            return { ok: true, models: openAi, source: "remote" };
          }
        } catch {
          /* try tags */
        }
        const tagsRoot = stripTrailingSlashes(root).replace(/\/v1$/, "");
        const tags = await fetchOllamaTags(tagsRoot);
        return {
          ok: true,
          models: tags.length ? tags : fallback,
          source: tags.length ? "remote" : "fallback",
        };
      }
      case "anthropic": {
        if (!apiKey) {
          return {
            ok: false,
            error: "API key required",
            models: fallback,
            source: "fallback",
          };
        }
        try {
          const models = await fetchAnthropicModels(apiKey);
          return {
            ok: true,
            models: models.length ? models : fallback,
            source: models.length ? "remote" : "fallback",
          };
        } catch {
          return {
            ok: false,
            error: "Could not list models; using built-in suggestions",
            models: fallback,
            source: "fallback",
          };
        }
      }
      case "google": {
        if (!apiKey) {
          return {
            ok: false,
            error: "API key required",
            models: fallback,
            source: "fallback",
          };
        }
        const models = await fetchGoogleModels(apiKey);
        return {
          ok: true,
          models: models.length ? models : fallback,
          source: models.length ? "remote" : "fallback",
        };
      }
      default:
        return {
          ok: false,
          error: "Unknown provider",
          models: fallback,
          source: "fallback",
        };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to list models";
    return {
      ok: false,
      error: msg,
      models: fallback,
      source: "fallback",
    };
  }
}
