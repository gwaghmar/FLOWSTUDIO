/* eslint-disable @typescript-eslint/no-explicit-any */
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createMistral } from "@ai-sdk/mistral";
import { createGroq } from "@ai-sdk/groq";
import type { LanguageModel } from "ai";

export type AiProvider = "openai" | "anthropic" | "google" | "mistral" | "groq" | "ollama" | "custom";

export type ProviderMeta = {
  id: AiProvider;
  label: string;
  defaultModel: string;
  models: string[];
  defaultBaseUrl?: string;
  needsBaseUrl?: boolean;
};

export const PROVIDER_META: ProviderMeta[] = [
  {
    id: "openai",
    label: "OpenAI",
    defaultModel: "gpt-4o-mini",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  },
  {
    id: "anthropic",
    label: "Anthropic (Claude)",
    defaultModel: "claude-3-5-haiku-20241022",
    models: ["claude-opus-4-5", "claude-sonnet-4-5", "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"],
  },
  {
    id: "google",
    label: "Google Gemini",
    defaultModel: "gemini-1.5-flash",
    models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-pro"],
  },
  {
    id: "mistral",
    label: "Mistral AI",
    defaultModel: "mistral-small-latest",
    models: ["mistral-large-latest", "mistral-medium-latest", "mistral-small-latest", "codestral-latest"],
  },
  {
    id: "groq",
    label: "Groq (Fast)",
    defaultModel: "llama-3.3-70b-versatile",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"],
  },
  {
    id: "ollama",
    label: "Ollama (Local)",
    defaultModel: "llama3.2",
    models: ["llama3.2", "llama3.1", "mistral", "codellama", "gemma2", "phi3"],
    defaultBaseUrl: "http://localhost:11434/v1",
    needsBaseUrl: true,
  },
  {
    id: "custom",
    label: "Custom / Self-hosted",
    defaultModel: "gpt-4o-mini",
    models: [],
    needsBaseUrl: true,
  },
];

export function getProviderMeta(id: AiProvider): ProviderMeta {
  return PROVIDER_META.find((p) => p.id === id) ?? PROVIDER_META[0];
}

const ALLOWED_AI_HOSTNAMES = new Set([
  "api.openai.com",
  "api.anthropic.com",
  "generativelanguage.googleapis.com",
  "api.groq.com",
  "api.mistral.ai",
  "openrouter.ai",
  "api.together.xyz",
  "api.perplexity.ai",
  // Common OpenAI-compatible proxy hosts
  "api.deepseek.com",
  "api.moonshot.cn",
]);

export function validateAiBaseUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    const hostname = parsed.hostname.toLowerCase();
    if (ALLOWED_AI_HOSTNAMES.has(hostname)) return url;
    // Allow subdomains of allowed hosts (e.g. custom.openai.azure.com)
    const isAllowedSubdomain = [...ALLOWED_AI_HOSTNAMES].some(
      (h) => hostname.endsWith(`.${h}`)
    );
    return isAllowedSubdomain ? url : null;
  } catch {
    return null;
  }
}

export function buildLanguageModel(
  provider: AiProvider,
  model: string,
  apiKey: string,
  baseUrl?: string | null
): any {
  // Ollama is localhost-only; all other providers must pass the allowlist.
  const safeBaseUrl = provider === "ollama" ? baseUrl : validateAiBaseUrl(baseUrl);
  switch (provider) {
    case "anthropic": {
      const client = createAnthropic({ apiKey });
      return client(model) as any;
    }
    case "google": {
      const client = createGoogleGenerativeAI({ apiKey });
      return client(model) as any;
    }
    case "mistral": {
      const client = createMistral({ apiKey });
      return client(model) as any;
    }
    case "groq": {
      const client = createGroq({ apiKey });
      return client(model) as any;
    }
    case "ollama":
    case "custom": {
      const base = safeBaseUrl ?? (provider === "ollama" ? "http://localhost:11434/v1" : undefined);
      const client = createOpenAI({ apiKey: apiKey || "ollama", baseURL: base });
      return client(model) as any;
    }
    case "openai":
    default: {
      const opts: Parameters<typeof createOpenAI>[0] = { apiKey };
      if (safeBaseUrl) opts.baseURL = safeBaseUrl;
      const client = createOpenAI(opts);
      return client(model) as any;
    }
  }
}
