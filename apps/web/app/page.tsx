import Link from "next/link";
import { auth } from "@/auth";
import { Logo } from "@/components/logo";

const focusRing =
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2";

export default async function HomePage() {
  const session = await auth();
  const isLoggedIn = Boolean(session?.user?.email);

  const primaryHref = isLoggedIn
    ? "/app/editor"
    : "/login?callbackUrl=" + encodeURIComponent("/app/editor");
  const primaryLabel = isLoggedIn ? "Open the editor" : "Get started free";

  return (
    <div className="min-h-screen dot-grid-bg">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Link
          href="/"
          className={`flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900 ${focusRing} rounded-xs`}
        >
          <Logo className="h-7 w-7 shadow-xs rounded-sm shadow-orange-500/20" />
          <span>Flowchart Studio</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
          <Link href="/pricing" className={`rounded-xs hover:text-slate-900 ${focusRing}`}>Pricing</Link>
          <Link href="/docs" className={`rounded-xs hover:text-slate-900 ${focusRing}`}>Docs</Link>
          <Link href="/legal/privacy" className={`rounded-xs hover:text-slate-900 ${focusRing}`}>Privacy</Link>
          {isLoggedIn ? (
            <Link href="/app" className={`rounded-xs font-medium text-indigo-600 hover:text-indigo-800 ${focusRing}`}>
              My projects →
            </Link>
          ) : (
            <Link href="/login" className={`rounded-xs font-medium text-indigo-600 hover:text-indigo-800 ${focusRing}`}>
              Sign in
            </Link>
          )}
        </nav>
      </header>
      <main id="main-content" className="mx-auto max-w-5xl px-6 pb-24 pt-16" tabIndex={-1}>
        <p className="text-sm font-medium uppercase tracking-widest text-indigo-600">
          AI diagram generator
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
          Describe it. Get a diagram. Export anywhere.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
          Type what you want in plain English — AI picks the right diagram type
          and draws it instantly. Export as PNG or SVG perfectly sized for
          LinkedIn, pitch decks, docs, or presentations. No design skills needed.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href={primaryHref}
            className={`rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 ${focusRing} ring-offset-slate-50`}
          >
            {primaryLabel}
          </Link>
          <Link
            href="/docs"
            className={`rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 ${focusRing} ring-offset-slate-50`}
          >
            Read the docs
          </Link>
        </div>
        <p className="mt-4 max-w-xl text-sm text-slate-500">
          {isLoggedIn
            ? "You're signed in. Jump straight to the editor."
            : "Free to start. After sign-in we open the editor so you can paste diagram text, theme it, and export in one sitting."}
        </p>
      </main>
    </div>
  );
}
