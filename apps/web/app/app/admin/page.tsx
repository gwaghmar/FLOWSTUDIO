import {
  adminListUsers,
  adminSetCredits,
  adminSetPlan,
} from "@/app/actions/admin";
import { getDeploymentReadiness } from "@/lib/deployment-readiness";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const rows = await adminListUsers();
  const readiness = getDeploymentReadiness();

  return (
    <main className="mx-auto min-h-0 w-full max-w-5xl flex-1 overflow-y-auto px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
          <p className="mt-2 text-sm text-slate-600">
            Adjust credits and plans for support. AI keys are never shown here.
          </p>
        </div>
        <Link
          href="/app/admin/ai-events"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
        >
          AI events →
        </Link>
      </div>
      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Production readiness
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Safe status only; secret values are never shown.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              readiness.ready
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {readiness.ready ? "Ready" : "Needs config"}
          </span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {readiness.items.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-800">
                  {item.label}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    item.status === "ready"
                      ? "text-emerald-700"
                      : item.status === "blocked"
                        ? "text-red-700"
                        : "text-amber-700"
                  }`}
                >
                  {item.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>
      <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Credits</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-b border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {u.email}
                </td>
                <td className="px-4 py-3 text-slate-600">{u.role}</td>
                <td className="px-4 py-3 text-slate-600">{u.plan}</td>
                <td className="px-4 py-3 text-slate-600">{u.creditsBalance}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-3">
                    <form
                      action={async (fd) => {
                        "use server";
                        const raw = fd.get("credits") as string;
                        await adminSetCredits(u.id, Number(raw));
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        name="credits"
                        type="number"
                        min={0}
                        defaultValue={u.creditsBalance}
                        className="w-20 rounded border border-slate-300 px-2 py-1"
                      />
                      <button
                        type="submit"
                        className="rounded bg-slate-900 px-2 py-1 text-xs text-white"
                      >
                        Set credits
                      </button>
                    </form>
                    <form
                      action={async () => {
                        "use server";
                        await adminSetPlan(u.id, "free");
                      }}
                    >
                      <button
                        type="submit"
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                      >
                        Free
                      </button>
                    </form>
                    <form
                      action={async () => {
                        "use server";
                        await adminSetPlan(u.id, "pro");
                      }}
                    >
                      <button
                        type="submit"
                        className="rounded border border-indigo-300 bg-indigo-50 px-2 py-1 text-xs text-indigo-900"
                      >
                        Pro
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
