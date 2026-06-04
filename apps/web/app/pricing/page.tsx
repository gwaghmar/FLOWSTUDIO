"use client";

import Link from "next/link";
import { useState } from "react";

// Pricing config — update here to change displayed prices site-wide
const PRICING = {
  pro: {
    monthly: "$15",
    annual: "$144",
    annualMonthly: "$12", // annual / 12, shown as "per month billed annually"
    currency: "USD",
  },
} as const;

const editorSignInHref =
  "/login?callbackUrl=" + encodeURIComponent("/app/editor");

const focusRing =
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2";

export default function PricingPage() {
  const [annual, setAnnual] = useState(true);
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
          className={`text-lg font-semibold tracking-tight text-slate-900 ${focusRing} rounded-xs`}
        >
          Flowchart Studio
        </Link>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
          <Link
            href="/pricing"
            className={`rounded-xs font-medium text-slate-900 ${focusRing}`}
            aria-current="page"
          >
            Pricing
          </Link>
          <Link
            href="/docs"
            className={`rounded-xs hover:text-slate-900 ${focusRing}`}
          >
            Docs
          </Link>
          <Link
            href="/legal/privacy"
            className={`rounded-xs hover:text-slate-900 ${focusRing}`}
          >
            Privacy
          </Link>
          <Link
            href="/login"
            className={`rounded-xs font-medium text-indigo-600 hover:text-indigo-800 ${focusRing}`}
          >
            Sign in
          </Link>
        </nav>
      </header>

      <main
        id="main-content"
        className="mx-auto max-w-5xl px-6 pb-24 pt-4"
        tabIndex={-1}
      >
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
          Pricing
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
          Free to start. Upgrade to Pro when you need to export without
          watermarks, download as PDF, or batch-export diagrams for client work.
        </p>

        {/* Billing toggle */}
        <div className="mt-8 flex items-center gap-3">
          <span className={`text-sm font-medium ${!annual ? "text-slate-900" : "text-slate-400"}`}>Monthly</span>
          <button
            type="button"
            role="switch"
            aria-checked={annual}
            onClick={() => setAnnual((a) => !a)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${annual ? "bg-indigo-600" : "bg-slate-300"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${annual ? "translate-x-6" : "translate-x-1"}`} />
          </button>
          <span className={`text-sm font-medium ${annual ? "text-slate-900" : "text-slate-400"}`}>
            Annual
            <span className="ml-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Save 20%</span>
          </span>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2 lg:gap-10">
          <section
            aria-labelledby="plan-free"
            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-xs"
          >
            <h2 id="plan-free" className="text-lg font-semibold text-slate-900">
              Free
            </h2>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">
              $0
            </p>
            <p className="mt-1 text-sm text-slate-500">Free forever</p>

            <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm leading-relaxed text-slate-600">
              <li>5 free AI diagram generations to start</li>
              <li>12+ themes, social presets for every network</li>
              <li>PNG and SVG export in your browser</li>
              <li>REST API and MCP with free-tier rate limits</li>
            </ul>
            <Link
              href={editorSignInHref}
              className={`mt-8 inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 hover:bg-slate-50 ${focusRing} ring-offset-white`}
            >
              Open the editor
            </Link>
          </section>

          <section
            aria-labelledby="plan-pro"
            className="flex flex-col rounded-2xl border-2 border-indigo-500 bg-white p-8 shadow-md ring-1 ring-indigo-500/10"
          >
            <h2 id="plan-pro" className="text-lg font-semibold text-indigo-950">
              Pro
            </h2>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-indigo-950">
              {annual ? PRICING.pro.annualMonthly : PRICING.pro.monthly}<span className="text-lg font-normal text-indigo-800/90">/mo</span>
            </p>
            <p className="mt-1 text-sm text-indigo-900/80">
              {annual
                ? <>Billed annually — {PRICING.pro.annual}/yr · <span className="font-medium text-emerald-700">saves 20%</span></>
                : "Billed monthly — switch to annual to save 20%"}
            </p>
            <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm leading-relaxed text-indigo-950/85">
              <li>No watermark on exports</li>
              <li>Download as PDF · Batch export multiple diagrams</li>
              <li>Unlimited AI diagram generations</li>
              <li>Priority API access</li>
              <li>Brand kit and logo frame</li>
            </ul>
            <Link
              href="/app/billing"
              className={`mt-8 inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 ${focusRing} ring-offset-white`}
            >
              Upgrade to Pro — {annual ? "Annual" : "Monthly"}
            </Link>
            <p className="mt-3 text-center text-xs text-slate-500">
              Signed-out? You&apos;ll be asked to sign in, then complete checkout.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
