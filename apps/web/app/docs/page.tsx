import Link from "next/link";

export default function DocsPage() {
  return (
    <div className="min-h-screen dot-grid-bg">
      <div className="mx-auto max-w-2xl px-6 py-16 prose prose-slate">
        <Link
          href="/"
          className="not-prose text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Home
        </Link>
        <h1 className="not-prose mt-6 text-3xl font-semibold tracking-tight text-slate-900">
          Docs
        </h1>
        <p className="not-prose mt-3 text-base leading-relaxed text-slate-600">
          Wire FlowStudio into your IDE, agents, or backend. Below is the
          minimum to be productive; the product UI is the source of truth for
          anything that moves fast.
        </p>

        <h2 className="not-prose mt-10 text-xl font-semibold text-slate-900">
          MCP
        </h2>
        <p>
          Give Cursor, Claude Desktop, or any MCP client tools to read and write
          diagram source, list templates, swap themes, and export PNG. Run the
          server from this repo with <code>pnpm mcp:dev</code>, register it in
          your client, and you’re done.
        </p>

        <h2 className="not-prose mt-10 text-xl font-semibold text-slate-900">
          REST API
        </h2>
        <p>
          OpenAPI lives at <code>/api/openapi.json</code>. Authenticate with{" "}
          <code>Authorization: Bearer fc_…</code> API keys from Settings after
          you sign in. Same exports and automation paths the app uses—no
          special casing.
        </p>

        <h2 className="not-prose mt-10 text-xl font-semibold text-slate-900">
          Diagram text that survives export
        </h2>
        <p>
          Start from <code>flowchart LR</code>. Use subgraphs for numbered
          stages, <code>classDef</code> for phase color, and verbs on edges so
          the diagram reads left-to-right like a pipeline. That pattern maps
          cleanly to our stage-style themes and social crops.
        </p>
      </div>
    </div>
  );
}
