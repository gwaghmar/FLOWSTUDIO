import { db } from "@/lib/db";
import { aiEvents } from "@/lib/db/schema";
import { desc, gt } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Aggregate = {
  totalLatencyMs: number;
  intentLatencyMs: number | null;
  genLatencyMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  validationStatus: string;
  retryAttempted: boolean;
  typeSwitched: boolean;
  intentFallback: boolean;
  effectiveDiagramType: string;
};

function pct(n: number, total: number): string {
  if (total === 0) return "—";
  return `${((n / total) * 100).toFixed(1)}%`;
}

function p50(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function p95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
}

export default async function AiEventsPage() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  let rows: (Aggregate & { id: string; createdAt: Date; userId: string | null; provider: string; model: string; mode: string; promptLength: number; error: string | null })[] = [];
  let dbReachable = true;
  try {
    rows = (await db
      .select({
        id: aiEvents.id,
        createdAt: aiEvents.createdAt,
        userId: aiEvents.userId,
        effectiveDiagramType: aiEvents.effectiveDiagramType,
        provider: aiEvents.provider,
        model: aiEvents.model,
        mode: aiEvents.mode,
        promptLength: aiEvents.promptLength,
        totalLatencyMs: aiEvents.totalLatencyMs,
        intentLatencyMs: aiEvents.intentLatencyMs,
        genLatencyMs: aiEvents.genLatencyMs,
        inputTokens: aiEvents.inputTokens,
        outputTokens: aiEvents.outputTokens,
        validationStatus: aiEvents.validationStatus,
        retryAttempted: aiEvents.retryAttempted,
        typeSwitched: aiEvents.typeSwitched,
        intentFallback: aiEvents.intentFallback,
        error: aiEvents.error,
      })
      .from(aiEvents)
      .where(gt(aiEvents.createdAt, since))
      .orderBy(desc(aiEvents.createdAt))
      .limit(200)) as typeof rows;
  } catch (e) {
    dbReachable = false;
    console.error("ai-events query failed:", e);
  }

  const total = rows.length;
  const okCount = rows.filter((r) => r.validationStatus === "ok").length;
  const repairedCount = rows.filter((r) => r.validationStatus === "repaired").length;
  const failedCount = rows.filter((r) => r.validationStatus === "failed_after_retry").length;
  const errorCount = rows.filter((r) => r.validationStatus === "error").length;
  const retries = rows.filter((r) => r.retryAttempted).length;
  const switches = rows.filter((r) => r.typeSwitched).length;
  const intentFallbacks = rows.filter((r) => r.intentFallback).length;

  const totalLatencies = rows.map((r) => r.totalLatencyMs);
  const totalInputTokens = rows.reduce((s, r) => s + (r.inputTokens ?? 0), 0);
  const totalOutputTokens = rows.reduce((s, r) => s + (r.outputTokens ?? 0), 0);

  const byType = new Map<string, { total: number; ok: number; repaired: number; failed: number; error: number }>();
  for (const r of rows) {
    const bucket = byType.get(r.effectiveDiagramType) ?? { total: 0, ok: 0, repaired: 0, failed: 0, error: 0 };
    bucket.total += 1;
    if (r.validationStatus === "ok") bucket.ok += 1;
    if (r.validationStatus === "repaired") bucket.repaired += 1;
    if (r.validationStatus === "failed_after_retry") bucket.failed += 1;
    if (r.validationStatus === "error") bucket.error += 1;
    byType.set(r.effectiveDiagramType, bucket);
  }
  const byTypeRows = [...byType.entries()].sort((a, b) => b[1].total - a[1].total);

  return (
    <main className="mx-auto min-h-0 w-full max-w-6xl flex-1 overflow-y-auto px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">AI events</h1>
          <p className="mt-1 text-sm text-slate-600">
            Last 24h. Telemetry for every /api/ai/generate call.
          </p>
        </div>
        <Link href="/app/admin" className="text-sm text-indigo-600 hover:underline">
          ← Users
        </Link>
      </div>

      {!dbReachable && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Couldn&apos;t reach the database. Telemetry table may not be migrated yet — run <code className="rounded-sm bg-amber-100 px-1">db:push</code>.
        </div>
      )}

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Total requests" value={String(total)} />
        <Card label="Success rate (no retry)" value={pct(okCount, total)} hint={`${okCount} / ${total}`} />
        <Card label="Repaired by retry" value={pct(repairedCount, total)} hint={`${repairedCount} of ${retries} retries succeeded`} />
        <Card label="Failed after retry" value={pct(failedCount + errorCount, total)} hint={`${failedCount} validation · ${errorCount} error`} />
        <Card label="p50 latency" value={`${p50(totalLatencies)} ms`} />
        <Card label="p95 latency" value={`${p95(totalLatencies)} ms`} />
        <Card label="Input tokens" value={totalInputTokens.toLocaleString()} hint="24h sum" />
        <Card label="Output tokens" value={totalOutputTokens.toLocaleString()} hint="24h sum" />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          By diagram type
        </h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">OK</th>
                <th className="px-4 py-3 text-right">Repaired</th>
                <th className="px-4 py-3 text-right">Failed</th>
                <th className="px-4 py-3 text-right">Error</th>
                <th className="px-4 py-3 text-right">OK rate</th>
              </tr>
            </thead>
            <tbody>
              {byTypeRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    No events yet in the last 24h.
                  </td>
                </tr>
              ) : (
                byTypeRows.map(([type, b]) => (
                  <tr key={type} className="border-b border-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-900">{type}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-700">{b.total}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-emerald-700">{b.ok}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-amber-700">{b.repaired}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-red-700">{b.failed}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-red-700">{b.error}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-500">
                      {pct(b.ok + b.repaired, b.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Recent events
        </h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Mode</th>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2 text-right">Total ms</th>
                <th className="px-3 py-2 text-right">In</th>
                <th className="px-3 py-2 text-right">Out</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 50).map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="px-3 py-1.5 tabular-nums text-slate-500">
                    {r.createdAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </td>
                  <td className="px-3 py-1.5 font-medium text-slate-800">{r.effectiveDiagramType}</td>
                  <td className="px-3 py-1.5 text-slate-600">{r.mode}</td>
                  <td className="px-3 py-1.5 text-slate-500">
                    {r.provider}
                    <span className="text-slate-300"> · </span>
                    {r.model}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-slate-700">{r.totalLatencyMs}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-slate-500">{r.inputTokens ?? "—"}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-slate-500">{r.outputTokens ?? "—"}</td>
                  <td className="px-3 py-1.5">
                    <StatusBadge status={r.validationStatus} />
                  </td>
                  <td className="px-3 py-1.5 text-slate-500">
                    {[
                      r.typeSwitched ? "switched" : null,
                      r.retryAttempted ? "retried" : null,
                      r.intentFallback ? "intent-fb" : null,
                      r.error ? `err: ${r.error.slice(0, 40)}` : null,
                    ].filter(Boolean).join(" · ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          {total > 50 ? `Showing 50 of ${total} events from the last 24h.` : `${total} events from the last 24h.`}
          {" "}{switches > 0 ? `${switches} type switches · ` : ""}
          {intentFallbacks > 0 ? `${intentFallbacks} intent-parse fallbacks` : ""}
        </p>
      </section>
    </main>
  );
}

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
    repaired: "bg-amber-50 text-amber-700 border-amber-200",
    failed_after_retry: "bg-red-50 text-red-700 border-red-200",
    error: "bg-red-50 text-red-800 border-red-200",
  };
  return (
    <span className={`inline-block rounded-sm border px-1.5 py-0.5 text-[10px] font-medium ${styles[status] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
      {status}
    </span>
  );
}

