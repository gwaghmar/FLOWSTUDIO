import Link from "next/link";

export default function ShareNotFound() {
  return (
    <div className="dot-grid-bg min-h-screen flex items-center justify-center px-6 py-10">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-2">404</div>
        <h1 className="text-2xl font-semibold text-slate-900">Share link not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          This link is invalid or no longer available. The owner may have deleted it.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
        >
          Go to drawxyz
        </Link>
      </div>
    </div>
  );
}
