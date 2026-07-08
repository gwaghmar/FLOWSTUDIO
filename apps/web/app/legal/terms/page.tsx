import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen dot-grid-bg">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link
          href="/"
          className="text-sm text-indigo-600 hover:text-indigo-800 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 rounded-xs"
        >
          ← Home
        </Link>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900">
          Terms
        </h1>
        <p className="mt-4 text-slate-600 leading-relaxed">
          drawxyz is under active development. The service is provided
          as-is; don’t use it for safety-critical, medical, or regulated
          decisions without your own validation.
        </p>
        <p className="mt-4 text-slate-600 leading-relaxed">
          You’re responsible for content in diagrams, exports, and any public
          share links you create. Don’t use the product to break the law, harass
          people, or overload our infrastructure. We may rate-limit or suspend
          accounts that abuse the API or shared links.
        </p>
        <p className="mt-4 text-slate-600 leading-relaxed">
          Fees for Pro are set at checkout; taxes and refunds follow Stripe and
          the policy we show there. We can change or discontinue features with
          reasonable notice as we figure out product–market fit.
        </p>
        <p className="mt-6 text-sm text-slate-500 leading-relaxed">
          Replace this page with counsel-reviewed terms before a wide launch or
          enterprise contracts.
        </p>
      </div>
    </div>
  );
}
