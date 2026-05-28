import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { resolveProfile, getPublicDiagrams } from "@/app/actions/profile";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const user = await resolveProfile(handle);
  if (!user) return { title: "Not found — Flowchart Studio" };
  const name = user.name ?? user.email.split("@")[0];
  return {
    title: `${name} (@${handle}) — Flowchart Studio`,
    description: `Diagrams published by ${name} on Flowchart Studio.`,
  };
}

export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const user = await resolveProfile(handle);
  if (!user) notFound();

  const diagrams = await getPublicDiagrams(user.id);
  const displayName = user.name ?? user.email.split("@")[0];

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <div className="flex items-center gap-4 mb-10">
        <div className="h-14 w-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-2xl font-bold select-none">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{displayName}</h1>
          <p className="text-sm text-slate-500">
            @{handle} · {diagrams.length} diagram{diagrams.length !== 1 ? "s" : ""} published
          </p>
        </div>
      </div>

      {diagrams.length === 0 ? (
        <p className="text-sm text-slate-400">No published diagrams yet.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {diagrams.map((d) => (
            <li
              key={d.rawToken ?? d.createdAt.toISOString()}
              className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              {d.previewDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={d.previewDataUrl}
                  alt={d.title}
                  className="w-full h-36 object-cover border-b border-slate-100"
                />
              ) : (
                <div className="w-full h-36 bg-gradient-to-br from-slate-100 to-slate-200 border-b border-slate-100 flex items-center justify-center">
                  <span className="text-slate-300 text-sm capitalize">{d.diagramType}</span>
                </div>
              )}
              <div className="p-4">
                <p className="text-sm font-medium text-slate-900 truncate">{d.title}</p>
                <p className="text-xs text-slate-400 mt-0.5 capitalize">{d.diagramType}</p>
                {d.rawToken ? (
                  <Link
                    href={`/s/${encodeURIComponent(d.rawToken)}`}
                    className="mt-3 inline-block text-xs font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    View →
                  </Link>
                ) : (
                  <span className="mt-3 inline-block text-xs text-slate-300">Link unavailable</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
