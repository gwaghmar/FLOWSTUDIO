import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { listProjects } from "@/app/actions/project";
import { deleteProject } from "@/app/actions/project";
import { DIAGRAM_TYPE_META, TEMPLATES, getDiagramTypeMeta } from "@flowchart/core";
import type { DiagramType } from "@flowchart/core";
import { DiagramTypeIcon } from "@/components/diagram-icon";

export default async function DashboardPage() {
  const session = await auth();
  const email = session?.user?.email;

  const projects = await listProjects();

  async function handleDelete(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await deleteProject(id);
    redirect("/app");
  }

  return (
    <main className="mx-auto min-h-0 w-full max-w-6xl flex-1 overflow-y-auto px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My Diagrams</h1>
          <p className="mt-1 text-sm text-slate-500">Create, edit, and export all your diagrams in one place.</p>
        </div>
        <Link
          href="/app/editor"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          + New Diagram
        </Link>
      </div>

      {/* Diagram type quick-create */}
      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">Create new</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {DIAGRAM_TYPE_META.map((dt) => (
            <Link
              key={dt.id}
              href={`/app/editor?type=${dt.id}`}
              className="group flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-center hover:border-indigo-400 hover:shadow-md transition-all"
            >
              <DiagramTypeIcon type={dt.id} size={24} className="text-slate-600 group-hover:text-indigo-600 transition-colors" />
              <span className="text-xs font-medium text-slate-700 group-hover:text-indigo-600 leading-tight">{dt.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Text flowchart starter templates */}
      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">Templates</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {TEMPLATES.slice(0, 5).map((t) => (
            <Link
              key={t.id}
              href={`/app/editor?template=${t.id}`}
              className="group rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-400 hover:shadow-md transition-all"
            >
              <p className="text-sm font-medium text-slate-800 group-hover:text-indigo-600">{t.title}</p>
              <p className="mt-1 text-xs text-slate-500 line-clamp-2">{t.description ?? "Flowchart template"}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Projects list */}
      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">
          Recent projects ({projects.length})
        </h2>
        {projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-200">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
            </div>
            <p className="mt-3 text-sm font-medium text-slate-700">No diagrams yet</p>
            <p className="mt-1 text-sm text-slate-500">Pick a type above to create your first diagram</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
              const meta = getDiagramTypeMeta((p.diagramType as DiagramType) ?? "mermaid");
              return (
                <div
                  key={p.id}
                  className="group relative flex flex-col rounded-xl border border-slate-200 bg-white p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                  <Link href={`/app/editor?id=${p.id}`} className="absolute inset-0 rounded-xl" aria-label={p.title} />
                  <div className="flex items-start justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                      <DiagramTypeIcon type={p.diagramType as DiagramType} size={16} className="text-slate-600" />
                    </div>
                    <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{meta.label}</span>
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-900 line-clamp-1">{p.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(p.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                  <form action={handleDelete} className="relative z-10 mt-3 self-end">
                    <input type="hidden" name="id" value={p.id} />
                    <button
                      type="submit"
                      className="text-xs text-red-500 opacity-0 group-hover:opacity-100 hover:text-red-700 transition-opacity"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
