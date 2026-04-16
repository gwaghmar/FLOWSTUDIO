"use client";

import { useState } from "react";

export function ManageSubscriptionClient() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const j = (await res.json()) as { url?: string; error?: string };
      if (j.url) {
        window.location.href = j.url;
      } else {
        setError(j.error ?? "Could not open billing portal");
        setLoading(false);
      }
    } catch {
      setError("Request failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={openPortal}
        disabled={loading}
        className="inline-flex w-fit rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition-colors"
      >
        {loading ? "Opening…" : "Manage subscription"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
