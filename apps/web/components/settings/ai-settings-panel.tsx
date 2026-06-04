"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { saveAiSettings, clearAiApiKey } from "@/app/actions/ai-settings";
import {
  PROVIDER_META,
  getProviderMeta,
  type AiProvider,
} from "@/lib/ai-providers";

type Props = {
  encryptionReady: boolean;
  hasKey: boolean;
  keyLast4: string | null;
  defaultProvider: AiProvider;
  defaultBaseUrl: string;
  defaultModel: string;
};

export function AiSettingsPanel({
  encryptionReady,
  hasKey,
  keyLast4,
  defaultProvider,
  defaultBaseUrl,
  defaultModel,
}: Props) {
  const [provider, setProvider] = useState<AiProvider>(defaultProvider);
  const [baseUrl, setBaseUrl] = useState(defaultBaseUrl);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [model, setModel] = useState(defaultModel);
  const [compactContext, setCompactContext] = useState(false);
  const [models, setModels] = useState<string[]>(() => {
    const m = getProviderMeta(defaultProvider);
    return m.models.length ? m.models : [m.defaultModel];
  });
  const [listSource, setListSource] = useState<"remote" | "fallback" | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [listMessage, setListMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const meta = useMemo(() => getProviderMeta(provider), [provider]);

  useEffect(() => {
    try {
      const v = localStorage.getItem("flowchart-ai:compact");
      if (v === "true") setCompactContext(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("flowchart-ai:compact", String(compactContext));
    } catch {
      /* ignore */
    }
  }, [compactContext]);

  const modelOptions = useMemo(() => {
    if (!model.trim()) return models;
    if (models.includes(model)) return models;
    return [model, ...models];
  }, [models, model]);

  const canAttemptList = useMemo(() => {
    // Refresh using saved key needs server-side decrypt → encryption secret
    if (hasKey && !apiKeyInput.trim()) return encryptionReady;
    if (provider === "ollama") return true;
    if (provider === "custom") {
      return Boolean(baseUrl.trim() && apiKeyInput.trim().length >= 1);
    }
    return apiKeyInput.trim().length >= 12;
  }, [encryptionReady, hasKey, apiKeyInput, provider, baseUrl]);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    setListMessage(null);
    try {
      const res = await fetch("/api/ai/list-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey: apiKeyInput.trim(),
          baseUrl: baseUrl.trim(),
        }),
      });
      const data = (await res.json()) as {
        models?: string[];
        source?: "remote" | "fallback";
        ok?: boolean;
        warning?: string;
        error?: string;
      };
      const next = Array.isArray(data.models) ? data.models : [];
      if (next.length) setModels(next);
      setListSource(data.source ?? null);
      if (!res.ok) {
        setListMessage(data.error ?? "Could not list models");
      } else if (data.warning) {
        setListMessage(data.warning);
      } else if (data.source === "remote") {
        setListMessage("Loaded models from your provider.");
      } else {
        setListMessage("Using built-in model suggestions.");
      }
    } catch {
      setListMessage("Network error while listing models.");
    } finally {
      setLoading(false);
    }
  }, [provider, apiKeyInput, baseUrl]);

  // When provider changes, reset suggestions until we fetch again
  useEffect(() => {
    const m = getProviderMeta(provider);
    setModels(m.models.length ? m.models : [m.defaultModel]);
    setListSource(null);
    setListMessage(null);
  }, [provider]);

  // Auto-fetch when credentials are sufficient (debounced)
  useEffect(() => {
    if (!canAttemptList) return;
    const t = window.setTimeout(() => {
      void fetchModels();
    }, 500);
    return () => window.clearTimeout(t);
  }, [canAttemptList, fetchModels, provider, baseUrl, apiKeyInput]);

  async function submitAiSettings(formData: FormData) {
    formData.set("aiProvider", provider);
    formData.set("aiBaseUrl", baseUrl.trim());
    formData.set("aiModel", model.trim());
    if (apiKeyInput.trim()) {
      formData.set("aiApiKey", apiKeyInput.trim());
    } else {
      formData.delete("aiApiKey");
    }
    setSaving(true);
    try {
      await saveAiSettings(formData);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-medium">AI Provider (BYOK)</h2>
      <p className="mt-2 text-sm text-slate-600">
        Bring your own API key. After you enter a key and base URL (if needed),
        we fetch available models from the provider when possible.
      </p>

      {!encryptionReady ? (
        <div className="mt-4 space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">Save AI settings is disabled until this is set</p>
          <p className="leading-relaxed text-amber-900/95">
            The app encrypts your API key in the database. Add to{" "}
            <code className="rounded-sm bg-white/80 px-1 py-0.5 text-xs">
              apps/web/.env.local
            </code>
            :
          </p>
          <pre className="overflow-x-auto rounded-md border border-amber-200/80 bg-white/90 p-2 text-xs text-slate-800">
            AI_KEY_ENCRYPTION_SECRET=your-secret-at-least-16-chars-long
          </pre>
          <p className="text-xs text-amber-900/90">
            Generate one:{" "}
            <code className="rounded-sm bg-white/80 px-1">openssl rand -hex 24</code>{" "}
            or{" "}
            <code className="rounded-sm bg-white/80 px-1">
              {`node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`}
            </code>
            . Then <strong>restart</strong> the dev server (
            <code className="text-xs">pnpm dev</code>).
          </p>
        </div>
      ) : null}

      {hasKey ? (
        <p className="mt-4 text-sm text-slate-600">
          Key on file: ••••{keyLast4 ?? "····"}{" "}
          <span className="text-xs text-slate-400">({meta.label})</span>
        </p>
      ) : (
        <p className="mt-4 text-sm text-slate-500">No saved AI key.</p>
      )}

      <form action={submitAiSettings} className="mt-6 grid gap-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={compactContext}
              onChange={(e) => setCompactContext(e.target.checked)}
              className="mt-0.5 rounded-sm"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-slate-900">
                Shorter AI context (lower cost)
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-600">
                Uses a smaller snippet of the current diagram and fewer prior chat turns when calling the AI.
              </span>
            </span>
          </label>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Provider
          </label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as AiProvider)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {PROVIDER_META.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Base URL{" "}
            <span className="font-normal text-slate-400">
              {meta.needsBaseUrl ? "(required)" : "(optional, for proxies)"}
            </span>
          </label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={
              meta.defaultBaseUrl ?? "https://api.openai.com/v1"
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            API key {hasKey ? "(leave blank to keep existing)" : ""}
          </label>
          <input
            type="password"
            autoComplete="off"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder={
              provider === "openai"
                ? "sk-…"
                : provider === "anthropic"
                  ? "sk-ant-…"
                  : provider === "google"
                    ? "AIza…"
                    : provider === "ollama"
                      ? "Optional — use ollama if required"
                      : "Your API key"
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void fetchModels()}
            disabled={!encryptionReady || loading || !canAttemptList}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Loading models…" : "Refresh models"}
          </button>
          {listSource ? (
            <span className="text-xs text-slate-500">
              Source:{" "}
              {listSource === "remote" ? "Provider API" : "Built-in list"}
            </span>
          ) : null}
        </div>

        {listMessage ? (
          <p className="text-xs text-slate-600">{listMessage}</p>
        ) : null}

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Model
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Default ({meta.defaultModel})</option>
            {modelOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">
            Pick a model from the list, or leave as default.
          </p>
        </div>

        <div className="space-y-2">
          <button
            type="submit"
            disabled={!encryptionReady || saving}
            title={
              !encryptionReady
                ? "Set AI_KEY_ENCRYPTION_SECRET in .env.local (16+ chars) and restart the server"
                : undefined
            }
            className="w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save AI settings"}
          </button>
          {!encryptionReady ? (
            <p className="max-w-lg text-xs text-slate-500">
              Greyed out: server needs{" "}
              <code className="text-[11px] text-slate-700">AI_KEY_ENCRYPTION_SECRET</code>{" "}
              — see the yellow box above.
            </p>
          ) : null}
        </div>
      </form>

      {hasKey ? (
        <form action={clearAiApiKey} className="mt-4">
          <button
            type="submit"
            className="text-sm text-red-600 underline disabled:opacity-50"
            disabled={!encryptionReady}
          >
            Remove saved AI key
          </button>
        </form>
      ) : null}

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="mb-3 text-xs font-semibold text-slate-600">
          Where to get API keys
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
          <div>
            <span className="font-medium">OpenAI:</span>{" "}
            platform.openai.com/api-keys
          </div>
          <div>
            <span className="font-medium">Anthropic:</span>{" "}
            console.anthropic.com/keys
          </div>
          <div>
            <span className="font-medium">Google:</span>{" "}
            aistudio.google.com/apikey
          </div>
          <div>
            <span className="font-medium">Mistral:</span>{" "}
            console.mistral.ai/api-keys
          </div>
          <div>
            <span className="font-medium">Groq:</span> console.groq.com/keys
          </div>
          <div>
            <span className="font-medium">Ollama:</span> No key needed (local)
          </div>
        </div>
      </div>
    </section>
  );
}
