import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <p className="text-5xl font-bold text-slate-200">404</p>
      <p className="mt-4 text-lg font-medium text-slate-700">Profile not found</p>
      <p className="mt-2 text-sm text-slate-500">That handle doesn&#39;t exist yet.</p>
      <Link href="/" className="mt-6 text-sm font-medium text-indigo-600 hover:text-indigo-800">
        ← Back to home
      </Link>
    </main>
  );
}
