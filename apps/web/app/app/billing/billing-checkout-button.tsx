"use client";

import { useState } from "react";

type Interval = "month" | "year";

export function BillingCheckoutButton({
  interval,
  className,
}: {
  interval: Interval;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval }),
      });
      const j = (await res.json()) as { url?: string; error?: string };
      if (j.url) {
        window.location.href = j.url;
      } else {
        setError(j.error ?? "Billing not configured");
        setLoading(false);
      }
    } catch {
      setError("Checkout request failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={go}
        disabled={loading}
        className={
          className ??
          "mt-6 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        }
      >
        {loading ? "Redirecting…" : "Go to Stripe Checkout"}
      </button>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

export function BillingIntervalToggle({
  value,
  onChange,
}: {
  value: Interval;
  onChange: (v: Interval) => void;
}) {
  return (
    <div className="mt-4 flex gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1 text-sm">
      <button
        type="button"
        onClick={() => onChange("month")}
        className={`flex-1 rounded-md px-3 py-2 font-medium ${
          value === "month"
            ? "bg-white text-slate-900 shadow-xs"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onChange("year")}
        className={`flex-1 rounded-md px-3 py-2 font-medium ${
          value === "year"
            ? "bg-white text-slate-900 shadow-xs"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        Annual
      </button>
    </div>
  );
}
