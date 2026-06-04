import Link from "next/link";

export default function PrivacyPage() {
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
          Privacy
        </h1>
        <p className="mt-4 text-slate-600 leading-relaxed">
          We collect what we need to run the product: identity from your OAuth
          provider (typically email and name), diagrams and settings you save,
          files you export, and—if you pay for Pro—billing details handled by
          Stripe. We don’t sell personal data.
        </p>
        <p className="mt-4 text-slate-600 leading-relaxed">
          If you use AI features that call hosted models, your prompts and
          outputs may be processed by those vendors under their terms. Before
          general availability we’ll publish a subprocessors list and tighten
          this page with counsel.
        </p>
        <p className="mt-6 text-sm text-slate-500 leading-relaxed">
          This is a plain-English summary for early customers, not a binding
          legal document. Have your lawyer review before you rely on it for
          compliance or a fundraise data room.
        </p>
      </div>
    </div>
  );
}
