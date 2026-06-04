import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { TEMPLATES } from "@/lib/templates";
import { forkTemplate } from "@/app/actions/templates";
import { DiagramTypeIcon } from "@/components/diagram-icon";

export default async function TemplatesPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/login?callbackUrl=" + encodeURIComponent("/app/templates"));

  return (
    <main className="mx-auto min-h-0 w-full max-w-6xl flex-1 overflow-y-auto px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Templates</h1>
          <p className="mt-2 text-sm text-slate-600">
            Curated starting points. Fork one into your workspace and edit from there — the original stays untouched.
          </p>
        </div>
        <Link
          href="/app"
          className="text-xs font-medium text-slate-500 hover:text-slate-900"
        >
          ← Back to projects
        </Link>
      </div>

      <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((t) => (
          <li key={t.id}>
            <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition-shadow hover:shadow-lg">
              <div className={`relative aspect-16/10 bg-linear-to-br ${t.gradient} p-6`}>
                <div className="absolute top-3 right-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 backdrop-blur-xs">
                  {t.tag}
                </div>
                <div className="flex h-full flex-col justify-end">
                  <div className="flex items-center gap-2 text-white/90">
                    <DiagramTypeIcon type={t.diagramType} className="h-4 w-4" />
                    <span className="text-[11px] font-medium uppercase tracking-wider">{t.diagramType}</span>
                  </div>
                  <h3 className="mt-1 text-xl font-bold text-white drop-shadow-xs">
                    {t.title}
                  </h3>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-5">
                <p className="text-sm leading-relaxed text-slate-600">{t.description}</p>
                <form action={async () => { "use server"; await forkTemplate(t.id); }} className="mt-auto">
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
                  >
                    Use this template
                  </button>
                </form>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
