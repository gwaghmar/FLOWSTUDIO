"use client";

import { useState, useTransition } from "react";
import { saveBrandKit, type BrandPalette, type BrandKitRow } from "@/app/actions/brand-kit";

const DEFAULT_PALETTE: BrandPalette = {
  primary: "#6366f1",
  secondary: "#8b5cf6",
  accent: "#f59e0b",
  background: "#f8fafc",
};

export function BrandKitPanel({ initialKit }: { initialKit: BrandKitRow | null }) {
  const startPalette = initialKit?.palette ?? DEFAULT_PALETTE;
  const [name, setName] = useState(initialKit?.name ?? "Brand kit");
  const [primary, setPrimary] = useState(startPalette.primary);
  const [secondary, setSecondary] = useState(startPalette.secondary);
  const [accent, setAccent] = useState(startPalette.accent);
  const [background, setBackground] = useState(startPalette.background ?? "#f8fafc");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      try {
        await saveBrandKit({
          name,
          palette: { primary, secondary, accent, background },
        });
        setSavedAt(new Date().toLocaleTimeString());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save brand kit");
      }
    });
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-medium">Brand kit</h2>
      <p className="mt-2 text-sm text-slate-600">
        Define your brand colors once and apply them to any diagram with one click. Used by the editor and your shared/embedded diagrams.
      </p>

      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="text-xs font-medium text-slate-700">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
            placeholder="My brand"
          />
        </label>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <ColorField label="Primary" value={primary} onChange={setPrimary} />
          <ColorField label="Secondary" value={secondary} onChange={setSecondary} />
          <ColorField label="Accent" value={accent} onChange={setAccent} />
          <ColorField label="Background" value={background} onChange={setBackground} />
        </div>

        <div className="rounded-lg border border-slate-200 p-3">
          <div className="text-xs font-medium text-slate-700">Preview</div>
          <div
            className="mt-2 flex h-20 items-center justify-center rounded-sm"
            style={{ background }}
          >
            <div className="flex items-center gap-2">
              <span style={{ background: primary }} className="h-8 w-8 rounded-sm shadow-sm" />
              <span style={{ background: secondary }} className="h-8 w-8 rounded-sm shadow-sm" />
              <span style={{ background: accent }} className="h-8 w-8 rounded-sm shadow-sm" />
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60 transition-colors"
          >
            {isPending ? "Saving…" : initialKit ? "Update brand kit" : "Save brand kit"}
          </button>
          {savedAt && <span className="text-xs text-slate-500">Saved at {savedAt}</span>}
        </div>
      </div>
    </section>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-700">{label}</span>
      <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-6 cursor-pointer rounded-sm border-0 bg-transparent p-0"
          aria-label={`${label} color picker`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-xs tabular-nums text-slate-700 focus:outline-hidden"
          aria-label={`${label} hex value`}
        />
      </div>
    </label>
  );
}
