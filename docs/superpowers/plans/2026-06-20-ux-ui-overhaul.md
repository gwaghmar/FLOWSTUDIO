# UX/UI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign all three user-facing surfaces (Home, Editor, Templates) to a warm-cream, monospace-forward design system inspired by MotherDuck, with a full CSS motion system for AI states, loading, micro-interactions, and status feedback.

**Architecture:** Shared design tokens + keyframes land in `globals.css` and `layout.tsx` first. Each page is then an independent rewrite. The editor gets targeted styling changes to its existing structure (toolbar, panels, canvas) — no logic changes.

**Tech Stack:** Next.js 15 App Router, Tailwind CSS v4, Framer Motion (already installed), DM Mono + Inter via `next/font/google`, pure CSS `@keyframes` for all motion.

---

## File map

| File | What changes |
|---|---|
| `apps/web/app/layout.tsx` | Add DM Mono font variable |
| `apps/web/app/globals.css` | CSS tokens, all keyframes, utility classes |
| `apps/web/app/page.tsx` | Full home page rewrite |
| `apps/web/components/editor-client.tsx` | Topbar + toolbar styling, canvas bg, streaming pill, save status, toast |
| `apps/web/app/app/templates/page.tsx` | Filter bar, search, card redesign |
| `apps/web/lib/templates.ts` | Add `category` field to Template type + data |

---

## Task 1: Design tokens + DM Mono font

**Files:**
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/app/globals.css`

- [ ] **Step 1: Add DM Mono to layout**

Replace the font imports in `apps/web/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { DM_Mono, Inter } from "next/font/google";
import "./globals.css";

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "FlowStudio — AI Diagram Generator",
  description:
    "Describe it. Get a diagram. Export anywhere. AI picks from 22 diagram types instantly.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${dmMono.variable} ${inter.variable} min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Add CSS tokens to globals.css**

Append to the end of `apps/web/app/globals.css` (keep all existing content):

```css
/* ── Design tokens ── */
:root {
  --cream:          #F5F0EA;
  --cream-dark:     #EDE8E1;
  --charcoal:       #1E1E1E;
  --charcoal-mid:   #383838;
  --charcoal-light: #666666;
  --fs-indigo:      #4F46E5;
  --fs-indigo-bg:   #EEF2FF;
  --fs-indigo-border: #C7D2FE;
  --fs-border:      rgba(30,30,30,0.13);
  --fs-white:       #FFFFFF;
  --font-mono: var(--font-dm-mono), 'DM Mono', ui-monospace, monospace;
  --font-sans: var(--font-inter), 'Inter', ui-sans-serif, system-ui, sans-serif;
}

/* ── Utility classes ── */
.fs-cream    { background-color: var(--cream); }
.fs-charcoal { background-color: var(--charcoal); }
.font-mono-fs { font-family: var(--font-mono); }
.font-sans-fs { font-family: var(--font-sans); }
```

- [ ] **Step 3: Type-check**

```bash
pnpm --filter @flowchart/web exec tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/layout.tsx apps/web/app/globals.css
git commit -m "feat(design): add DM Mono font + CSS design tokens"
```

---

## Task 2: Motion keyframes + utility classes

**Files:**
- Modify: `apps/web/app/globals.css`

- [ ] **Step 1: Append all keyframes + motion utilities**

Append to `apps/web/app/globals.css`:

```css
/* ── Motion keyframes ── */
@keyframes fs-shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
}
@keyframes fs-pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.3; transform: scale(0.7); }
}
@keyframes fs-bounce-dot {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
  40%           { transform: translateY(-6px); opacity: 1; }
}
@keyframes fs-spin {
  to { transform: rotate(360deg); }
}
@keyframes fs-fade-in-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fs-highlight-flash {
  0%, 100% { background: transparent; }
  25%       { background: rgba(79,70,229,0.15); }
}
@keyframes fs-progress {
  from { width: 0%; }
  to   { width: 100%; }
}
@keyframes fs-cursor-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
@keyframes fs-toast-in {
  from { opacity: 0; transform: translateY(10px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes fs-saved-pop {
  0%   { opacity: 0; transform: scale(0.6); }
  60%  { transform: scale(1.15); }
  100% { opacity: 1; transform: scale(1); }
}

/* ── Motion utility classes ── */
.fs-shimmer {
  background: linear-gradient(90deg, #ede8e1 25%, #e4dfd8 50%, #ede8e1 75%);
  background-size: 600px 100%;
  animation: fs-shimmer 1.6s ease-in-out infinite;
}
.fs-shimmer-dark {
  background: linear-gradient(90deg, #252525 25%, #2e2e2e 50%, #252525 75%);
  background-size: 600px 100%;
  animation: fs-shimmer 1.6s ease-in-out infinite;
}
.fs-fade-in-up  { animation: fs-fade-in-up 0.35s ease both; }
.fs-toast-in    { animation: fs-toast-in 0.3s cubic-bezier(0.34,1.56,0.64,1) both; }
.fs-saved-pop   { animation: fs-saved-pop 0.35s cubic-bezier(0.34,1.56,0.64,1) both; }
.fs-spin        { animation: fs-spin 0.75s linear infinite; }
.fs-cursor      { animation: fs-cursor-blink 0.75s step-end infinite; }
.fs-pulse-dot   { animation: fs-pulse-dot 1.5s ease-in-out infinite; }

/* ── Dot grid canvas background ── */
.fs-dot-grid {
  background-color: #FFFFFF;
  background-image: radial-gradient(circle, #D1D5DB 1px, transparent 1px);
  background-size: 24px 24px;
}

/* ── Button micro-interaction ── */
.fs-btn-press:active { transform: scale(0.97); }
.fs-btn-press { transition: transform 0.1s ease, background-color 0.12s ease; }
```

- [ ] **Step 2: Type-check**

```bash
pnpm --filter @flowchart/web exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/globals.css
git commit -m "feat(motion): add CSS keyframes and motion utility classes"
```

---

## Task 3: Home page redesign

**Files:**
- Modify: `apps/web/app/page.tsx`

- [ ] **Step 1: Rewrite page.tsx**

Replace the entire content of `apps/web/app/page.tsx`:

```tsx
import Link from "next/link";
import { auth } from "@/auth";
import { Logo } from "@/components/logo";

const DIAGRAM_TYPES = [
  "Flowchart", "Sequence", "ERD", "Gantt", "Mindmap",
  "Class diagram", "BPMN", "Cloud arch", "Org chart", "Timeline",
  "Vs. comparison", "2×2 matrix", "Funnel", "Tier list", "Iceberg",
  "Venn", "Excalidraw", "ECharts", "Nivo charts", "tldraw", "Budget", "Bracket",
];

const FEATURED_TYPES = ["Flowchart", "Sequence", "ERD"];

export default async function HomePage() {
  const session = await auth();
  const isLoggedIn = Boolean(session?.user?.email);

  const editorHref = isLoggedIn
    ? "/app/editor"
    : "/login?callbackUrl=" + encodeURIComponent("/app/editor");

  return (
    <div style={{ background: "var(--cream)", minHeight: "100vh" }}>
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      {/* NAV */}
      <header
        style={{
          background: "var(--cream)",
          borderBottom: "1.5px solid var(--fs-border)",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 40px",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}
        >
          <Logo className="h-7 w-7 rounded-sm shadow-xs shadow-orange-500/20" />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, color: "var(--charcoal)", fontWeight: 500 }}>
            FlowStudio
          </span>
        </Link>
        <nav style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {["Pricing", "Docs", "Templates"].map((label) => (
            <Link
              key={label}
              href={`/${label.toLowerCase()}`}
              style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--charcoal-light)", textDecoration: "none", letterSpacing: "0.01em" }}
            >
              {label}
            </Link>
          ))}
          {isLoggedIn ? (
            <Link href="/app" style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--charcoal-light)", textDecoration: "none" }}>
              My projects
            </Link>
          ) : (
            <Link href="/login" style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--charcoal-light)", textDecoration: "none" }}>
              Sign in
            </Link>
          )}
          <Link
            href={editorHref}
            className="fs-btn-press"
            style={{
              fontFamily: "var(--font-mono)", fontSize: 13, letterSpacing: "0.04em",
              background: "var(--charcoal)", color: "#fff",
              padding: "8px 18px", borderRadius: 2, textDecoration: "none",
              display: "inline-block",
            }}
          >
            Open editor →
          </Link>
        </nav>
      </header>

      <main id="main-content" tabIndex={-1}>

        {/* HERO */}
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "100px 40px 60px", textAlign: "center" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fs-indigo)", marginBottom: 24 }}>
            AI Diagram Generator
          </p>
          <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(40px,6vw,64px)", fontWeight: 400, textTransform: "uppercase", letterSpacing: "-0.01em", lineHeight: 1.05, color: "var(--charcoal)", marginBottom: 24 }}>
            Describe it. Get a{" "}
            <span style={{ color: "var(--fs-indigo)" }}>diagram.</span>
            <br />Export anywhere.
          </h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 20, fontWeight: 300, lineHeight: 1.6, color: "var(--charcoal-light)", maxWidth: 540, margin: "0 auto 40px" }}>
            Type what you want in plain English — AI picks the right diagram type and draws it instantly. 22 types. No design skills needed.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 16 }}>
            <Link
              href={editorHref}
              className="fs-btn-press"
              style={{ fontFamily: "var(--font-mono)", fontSize: 13, letterSpacing: "0.05em", textTransform: "uppercase", background: "var(--charcoal)", color: "#fff", border: "1.5px solid var(--charcoal)", padding: "13px 28px", borderRadius: 2, textDecoration: "none" }}
            >
              Open editor →
            </Link>
            <Link
              href="/app/templates"
              className="fs-btn-press"
              style={{ fontFamily: "var(--font-mono)", fontSize: 13, letterSpacing: "0.05em", textTransform: "uppercase", background: "transparent", color: "var(--charcoal)", border: "1.5px solid var(--fs-border)", padding: "13px 28px", borderRadius: 2, textDecoration: "none" }}
            >
              Browse templates
            </Link>
          </div>
          {isLoggedIn && (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#999" }}>
              Signed in — <Link href="/app/editor" style={{ color: "var(--fs-indigo)" }}>jump to editor</Link>
            </p>
          )}
        </div>

        {/* HERO PREVIEW CARD */}
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 40px 60px" }}>
          <div className="fs-fade-in-up" style={{ background: "white", border: "1.5px solid var(--fs-border)", borderRadius: 6, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.05)" }}>
            {/* Browser chrome */}
            <div style={{ background: "#F8F8F8", borderBottom: "1px solid var(--fs-border)", height: 40, display: "flex", alignItems: "center", padding: "0 16px", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FFBD2E" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28C840" }} />
              <span style={{ marginLeft: 12, fontFamily: "var(--font-mono)", fontSize: 11, color: "#999" }}>OAuth Login Flow — FlowStudio</span>
            </div>
            {/* Two-column body */}
            <div style={{ display: "flex", height: 280 }}>
              <div style={{ width: 240, borderRight: "1px solid var(--fs-border)", background: "#FAFAFA", padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#999", letterSpacing: "0.08em", textTransform: "uppercase" }}>Prompt</p>
                <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 4, padding: "10px 12px", fontFamily: "var(--font-sans)", fontSize: 12, color: "#374151", lineHeight: 1.5 }}>
                  "Show the OAuth 2.0 login flow between browser, app server and auth provider"
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--fs-indigo-bg)", color: "var(--fs-indigo)", padding: "4px 10px", borderRadius: 2, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.03em" }}>
                  ✦ AI generated · Mermaid
                </div>
              </div>
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "white" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  {["Browser", "App Server", "Auth Server"].map((node, i) => (
                    <div key={node} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div style={{ border: "1.5px solid var(--fs-indigo-border)", borderRadius: 4, padding: "6px 16px", fontFamily: "var(--font-mono)", fontSize: 11, color: "#4338CA", background: "var(--fs-indigo-bg)" }}>
                        {node}
                      </div>
                      {i < 2 && <div style={{ fontSize: 14, color: "#C7D2FE" }}>↓</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TRUST STRIP */}
        <div style={{ background: "var(--charcoal)", padding: "20px 40px", display: "flex", alignItems: "center", justifyContent: "center", gap: 40, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase" }}>Supports</span>
          {["Mermaid", "Excalidraw", "ReactFlow", "ECharts", "BPMN", "tldraw", "+ 16 more"].map((t) => (
            <span key={t} style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#aaa", letterSpacing: "0.04em" }}>{t}</span>
          ))}
        </div>

        {/* FEATURES */}
        <div style={{ background: "var(--cream)", padding: "80px 40px" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fs-indigo)", textAlign: "center", marginBottom: 16 }}>How it works</p>
          <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(28px,4vw,40px)", fontWeight: 400, textTransform: "uppercase", color: "var(--charcoal)", textAlign: "center", marginBottom: 56, lineHeight: 1.1 }}>
            Three steps to a finished diagram
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, maxWidth: 860, margin: "0 auto" }}>
            {[
              { icon: "✦", title: "AI picks the type", desc: "Describe what you need — AI selects from 22 diagram types and generates clean source instantly." },
              { icon: "⌨", title: "Edit with source or canvas", desc: "Tweak the AI output in the source editor or drag nodes directly. Every change is live-previewed." },
              { icon: "↗", title: "Export anywhere", desc: "PNG, SVG, PDF, or ZIP at any size. Sized for LinkedIn posts, pitch decks, docs, or presentations." },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ background: "white", border: "1.5px solid var(--fs-border)", borderRadius: 4, padding: "28px 24px" }}>
                <div style={{ width: 36, height: 36, background: "var(--fs-indigo-bg)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, fontSize: 18 }}>{icon}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 500, color: "var(--charcoal)", marginBottom: 8 }}>{title}</div>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--charcoal-light)", lineHeight: 1.6, fontWeight: 300 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 22 TYPES CHIP CLOUD */}
        <div style={{ background: "var(--cream-dark)", padding: "72px 40px" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fs-indigo)", textAlign: "center", marginBottom: 16 }}>22 diagram types</p>
          <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(28px,4vw,40px)", fontWeight: 400, textTransform: "uppercase", color: "var(--charcoal)", textAlign: "center", marginBottom: 32, lineHeight: 1.1 }}>
            One tool. Every diagram.
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxWidth: 760, margin: "0 auto", justifyContent: "center" }}>
            {DIAGRAM_TYPES.map((t) => (
              <span
                key={t}
                style={{
                  border: "1.5px solid var(--fs-border)", borderRadius: 2, padding: "7px 15px",
                  fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.03em",
                  background: FEATURED_TYPES.includes(t) ? "var(--charcoal)" : "var(--cream)",
                  color: FEATURED_TYPES.includes(t) ? "white" : "var(--charcoal-mid)",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* DARK CTA */}
        <div style={{ background: "var(--charcoal)", padding: "80px 40px", textAlign: "center" }}>
          <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(28px,4vw,40px)", fontWeight: 400, textTransform: "uppercase", color: "white", marginBottom: 16, lineHeight: 1.1 }}>
            Start diagramming in 30 seconds.
          </h2>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 16, color: "#aaa", fontWeight: 300, marginBottom: 36 }}>
            No signup required to try. Open the editor and describe your first diagram.
          </p>
          <Link
            href={editorHref}
            className="fs-btn-press"
            style={{ fontFamily: "var(--font-mono)", fontSize: 13, letterSpacing: "0.05em", textTransform: "uppercase", background: "white", color: "var(--charcoal)", border: "1.5px solid white", padding: "13px 28px", borderRadius: 2, textDecoration: "none", display: "inline-block" }}
          >
            Open editor →
          </Link>
        </div>

        {/* FOOTER */}
        <footer style={{ background: "#111", padding: "36px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Logo className="h-6 w-6 rounded-sm shadow-xs shadow-orange-500/20" />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#555" }}>FlowStudio</span>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {["Pricing", "Docs", "Privacy", "Terms"].map((l) => (
              <Link key={l} href={`/${l.toLowerCase()}`} style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#555", textDecoration: "none", letterSpacing: "0.04em" }}>{l}</Link>
            ))}
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#444" }}>© 2026 FlowStudio</span>
        </footer>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Type-check + build**

```bash
pnpm --filter @flowchart/web exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Visual check**

```bash
pnpm --filter @flowchart/web dev
```

Open http://localhost:3040 — verify: cream background, DM Mono uppercase heading, hero preview card, trust strip, features, chip cloud, dark CTA, dark footer.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/page.tsx
git commit -m "feat(home): redesign home page — cream bg, DM Mono hero, feature sections, chip cloud"
```

---

## Task 4: Editor top bar + toolbar styling

**Files:**
- Modify: `apps/web/components/editor-client.tsx`

The editor already has two bars (top `<header>` + secondary toolbar at line ~1779). This task reskins both to match the design system without changing any logic.

- [ ] **Step 1: Restyle the top header (line ~1411)**

Find this className on the `<header>` tag:

```
className="shrink-0 flex items-center justify-between border-b border-slate-200 px-4 py-1.5 bg-white z-50"
```

Replace with:

```
className="shrink-0 flex items-center justify-between px-4 py-1.5 z-50"
style={{ background: "var(--cream)", borderBottom: "1.5px solid var(--fs-border)", height: 52 }}
```

- [ ] **Step 2: Restyle project name button (line ~1415)**

Find:
```
className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors p-1 rounded-md hover:bg-slate-50"
```

Replace with:
```
className="flex items-center gap-1.5 p-1 rounded transition-colors fs-btn-press"
style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--charcoal)" }}
```

- [ ] **Step 3: Restyle Preview/Code toggle center (line ~1441)**

Find the wrapper `<div className="absolute left-1/2 -translate-x-1/2 hidden sm:flex items-center bg-slate-100 p-1 rounded-xl">` and its two buttons. Replace the entire block:

```tsx
<div className="absolute left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-1" style={{ background: "#F3F4F6", padding: 4, borderRadius: 4 }}>
  <button
    onClick={() => setSourceExpanded(false)}
    className="flex items-center gap-1.5 transition-colors fs-btn-press"
    style={{
      fontFamily: "var(--font-mono)", fontSize: 12, padding: "5px 14px", borderRadius: 3,
      background: !sourceExpanded ? "white" : "transparent",
      color: !sourceExpanded ? "var(--charcoal)" : "var(--charcoal-light)",
      boxShadow: !sourceExpanded ? "0 1px 3px rgba(0,0,0,0.07)" : "none",
      border: "none", cursor: "pointer",
    }}
  >
    <Play className="h-3 w-3" /> Preview
  </button>
  <button
    onClick={() => setSourceExpanded(true)}
    className="flex items-center gap-1.5 transition-colors fs-btn-press"
    style={{
      fontFamily: "var(--font-mono)", fontSize: 12, padding: "5px 14px", borderRadius: 3,
      background: sourceExpanded ? "white" : "transparent",
      color: sourceExpanded ? "var(--charcoal)" : "var(--charcoal-light)",
      boxShadow: sourceExpanded ? "0 1px 3px rgba(0,0,0,0.07)" : "none",
      border: "none", cursor: "pointer",
    }}
  >
    <Code2 className="h-3 w-3" /> Code
  </button>
</div>
```

- [ ] **Step 4: Restyle right-side Share/Embed/Publish buttons**

Find the Share button (line ~1458). Replace the three action buttons' classNames:

Share:
```
className="hidden sm:flex items-center gap-1.5 fs-btn-press disabled:opacity-60"
style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.02em", color: "var(--charcoal)", background: "transparent", border: "1.5px solid var(--fs-border)", padding: "6px 12px", borderRadius: 2, cursor: "pointer" }}
```

Embed:
```
className="hidden sm:flex items-center gap-1.5 fs-btn-press disabled:opacity-60"
style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.02em", color: "var(--charcoal)", background: "transparent", border: "1.5px solid var(--fs-border)", padding: "6px 12px", borderRadius: 2, cursor: "pointer" }}
```

Publish:
```
className="flex items-center gap-1.5 fs-btn-press disabled:opacity-60"
style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.02em", color: "white", background: "var(--charcoal)", border: "1.5px solid var(--charcoal)", padding: "6px 12px", borderRadius: 2, cursor: "pointer" }}
```

- [ ] **Step 5: Restyle secondary toolbar (line ~1779)**

Find:
```
className="flex shrink-0 items-center gap-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 justify-between"
```

Replace with:
```
className="flex shrink-0 items-center gap-2 px-3 py-1 justify-between"
style={{ background: "white", borderBottom: "1px solid var(--fs-border)", height: 40 }}
```

- [ ] **Step 6: Move Free plan badge to the right group**

Find the `Free plan` badge in the toolbar (search for `"Free plan"` in editor-client.tsx). It currently sits in the middle of toolbar controls. Cut it from its current location and paste it just before the undo/redo buttons in the right-aligned group. Wrap it as:

```tsx
<span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.04em", background: "#FEF3C7", color: "#92400E", padding: "2px 7px", borderRadius: 2 }}>
  Free plan
</span>
```

- [ ] **Step 7: Type-check**

```bash
pnpm --filter @flowchart/web exec tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add apps/web/components/editor-client.tsx
git commit -m "feat(editor): restyle topbar + toolbar — cream bg, DM Mono, sharp corners, Free plan moved right"
```

---

## Task 5: Editor canvas dot-grid background

**Files:**
- Modify: `apps/web/components/editor-client.tsx`

- [ ] **Step 1: Apply dot-grid to canvas area**

Search for where the canvas renders (around line 1505, the `bg-[#fafafa]` wrapper div). Find the canvas area container — it's the div that wraps diagram renderers. Add `fs-dot-grid` class to that wrapper and remove the existing `bg-[#fafafa]` class.

Specifically find:
```
className="relative flex min-h-0 w-full flex-1 flex-row overflow-hidden bg-[#fafafa] dark:bg-slate-950"
```

Replace with:
```
className="relative flex min-h-0 w-full flex-1 flex-row overflow-hidden dark:bg-slate-950"
style={{ background: "var(--cream-dark)" }}
```

Then find the inner canvas wrapper (the flex-1 area that holds the actual rendered diagram — not the AI panel or source panel). Add `className="fs-dot-grid"` to it.

- [ ] **Step 2: Add type label chip to canvas**

Inside the canvas area, add a position-absolute chip in the top-left corner. Find where the diagram renders and insert before it:

```tsx
<div
  style={{
    position: "absolute", top: 12, left: 12, zIndex: 10,
    fontFamily: "var(--font-mono)", fontSize: 10, color: "#999",
    letterSpacing: "0.06em", textTransform: "uppercase",
    background: "white", border: "1px solid var(--fs-border)",
    padding: "3px 8px", borderRadius: 2,
  }}
>
  {diagramType === "mermaid" ? getMermaidSubtypeMeta(mermaidSubtype).label : typeMeta.label}
</div>
```

- [ ] **Step 3: Type-check**

```bash
pnpm --filter @flowchart/web exec tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/editor-client.tsx
git commit -m "feat(editor): dot-grid canvas background + type label chip"
```

---

## Task 6: Editor motion states — streaming pill, thinking dots, save status, toast

**Files:**
- Modify: `apps/web/components/editor-client.tsx`

The editor already has `aiLoading`, `saveState`, `toast`, and `showToast`. This task adds the visual treatments.

- [ ] **Step 1: Add streaming pill to the secondary toolbar**

In the secondary toolbar (around line 1779), find the right-side group. Add the streaming pill just before the Free plan badge:

```tsx
{aiLoading && (
  <span
    style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: "var(--fs-indigo)", color: "white",
      padding: "3px 10px", borderRadius: 2,
      fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.04em",
    }}
  >
    <span className="fs-pulse-dot" style={{ width: 6, height: 6, background: "rgba(255,255,255,0.8)", borderRadius: "50%", display: "inline-block" }} />
    Streaming
  </span>
)}
```

- [ ] **Step 2: Add 3-dot thinking indicator to chat area**

In the chat messages list (around line 1544), after the empty state and messages, add the thinking indicator that shows when AI is loading but no message is streaming yet:

```tsx
{aiLoading && messages.length > 0 && (
  <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "10px 14px", background: "white", borderRadius: 10, border: "1px solid var(--fs-border)", width: "fit-content" }}>
    {[0, 0.18, 0.36].map((delay, i) => (
      <span
        key={i}
        style={{ width: 7, height: 7, background: "var(--fs-indigo)", borderRadius: "50%", display: "inline-block", animation: `fs-bounce-dot 1.3s ease-in-out ${delay}s infinite` }}
      />
    ))}
  </div>
)}
```

- [ ] **Step 3: Upgrade streaming cursor**

Find the existing streaming cursor (line ~1566):
```tsx
<span className="inline-block h-4 w-1 animate-pulse bg-indigo-400 ml-1 translate-y-0.5" />
```

Replace with:
```tsx
<span className="fs-cursor" style={{ display: "inline-block", width: 2, height: 14, background: "var(--fs-indigo)", marginLeft: 2, verticalAlign: "middle" }} />
```

- [ ] **Step 4: Upgrade save status display**

Find where `saveState` is displayed in the topbar (search `saveState` in the JSX render). Replace with:

```tsx
<span style={{ fontFamily: "var(--font-mono)", fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}>
  {saveState === "saving" && (
    <>
      <span className="fs-spin" style={{ width: 12, height: 12, border: "2px solid rgba(79,70,229,0.2)", borderTopColor: "var(--fs-indigo)", borderRadius: "50%", display: "inline-block" }} />
      <span style={{ color: "#999" }}>Saving…</span>
    </>
  )}
  {saveState === "saved" && (
    <>
      <span className="fs-saved-pop" style={{ color: "#22C55E" }}>✓</span>
      <span style={{ color: "#22C55E" }}>Saved</span>
    </>
  )}
  {saveState === "unsaved" && (
    <>
      <span className="fs-pulse-dot" style={{ width: 7, height: 7, background: "var(--fs-indigo)", borderRadius: "50%", display: "inline-block" }} />
      <span style={{ color: "#999" }}>Unsaved</span>
    </>
  )}
</span>
```

- [ ] **Step 5: Upgrade toast notification**

Find the toast render (search for `{toast &&` in the JSX). Replace its wrapper styling:

```tsx
{toast && (
  <div
    className="fs-toast-in"
    style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      display: "flex", alignItems: "center", gap: 12,
      background: "white", border: "1px solid var(--fs-border)", borderRadius: 6,
      padding: "12px 16px", boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
      fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--charcoal)",
      minWidth: 240,
    }}
  >
    <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--fs-indigo-bg)", color: "var(--fs-indigo)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>✦</span>
    <span style={{ flex: 1 }}>{toast}</span>
    <button onClick={() => setToast(null)} style={{ color: "#9CA3AF", cursor: "pointer", background: "none", border: "none", fontSize: 14 }}>✕</button>
  </div>
)}
```

- [ ] **Step 6: Type-check**

```bash
pnpm --filter @flowchart/web exec tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/editor-client.tsx
git commit -m "feat(editor): streaming pill, thinking dots, save status states, toast redesign"
```

---

## Task 7: Templates — add category field

**Files:**
- Modify: `apps/web/lib/templates.ts`

- [ ] **Step 1: Add `category` to Template type and data**

```ts
export type Template = {
  id: string;
  title: string;
  description: string;
  diagramType: DiagramType;
  themeId: string;
  source: string;
  gradient: string;
  tag: string;
  /** Filter category for the templates page filter bar */
  category: "flowchart" | "sequence" | "architecture" | "erd" | "charts" | "social" | "bpmn" | "orgchart";
};
```

Add `category` to each template in `TEMPLATES`. Use these mappings:

- `onboarding-funnel` → `"flowchart"`
- `oauth-sequence` → `"sequence"`
- `web-arch` (architecture) → `"architecture"`
- `revenue-chart` (echarts) → `"charts"`
- `blog-er` (erd) → `"erd"`
- `roadmap-gantt` (mermaid gantt) → `"flowchart"`

Read the full `TEMPLATES` array from `apps/web/lib/templates.ts` first to see all template ids, then add `category` to each.

- [ ] **Step 2: Type-check**

```bash
pnpm --filter @flowchart/web exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/templates.ts
git commit -m "feat(templates): add category field to Template type"
```

---

## Task 8: Templates page redesign

**Files:**
- Modify: `apps/web/app/app/templates/page.tsx`

- [ ] **Step 1: Rewrite templates/page.tsx**

Replace the entire file:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { TEMPLATES } from "@/lib/templates";
import { forkTemplate } from "@/app/actions/templates";
import { DiagramTypeIcon } from "@/components/diagram-icon";
import { Logo } from "@/components/logo";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "flowchart", label: "Flowchart" },
  { id: "sequence", label: "Sequence" },
  { id: "architecture", label: "Architecture" },
  { id: "erd", label: "ERD" },
  { id: "charts", label: "Charts" },
  { id: "social", label: "Social cards" },
  { id: "bpmn", label: "BPMN" },
  { id: "orgchart", label: "Org chart" },
] as const;

const PREVIEW_BG: Record<string, string> = {
  flowchart:    "#1E1B4B",
  sequence:     "#0C1A3A",
  architecture: "#0F1117",
  erd:          "#0F172A",
  charts:       "#2D1B00",
  social:       "#0D3333",
  bpmn:         "#1A0F2E",
  orgchart:     "#0A1F1A",
};

export default async function TemplatesPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/login?callbackUrl=" + encodeURIComponent("/app/templates"));

  return (
    <div style={{ background: "var(--cream)", minHeight: "100vh" }}>

      {/* NAV */}
      <header style={{ background: "var(--cream)", borderBottom: "1.5px solid var(--fs-border)", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px", position: "sticky", top: 0, zIndex: 50 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <Logo className="h-6 w-6 rounded-sm shadow-xs shadow-orange-500/20" />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, color: "var(--charcoal)", fontWeight: 500 }}>FlowStudio</span>
        </Link>
        <nav style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Link href="/app" style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--charcoal-light)", textDecoration: "none" }}>Projects</Link>
          <Link href="/app/editor" style={{ fontFamily: "var(--font-mono)", fontSize: 13, letterSpacing: "0.04em", background: "var(--charcoal)", color: "#fff", padding: "7px 16px", borderRadius: 2, textDecoration: "none" }}>Open editor →</Link>
        </nav>
      </header>

      {/* HEADER */}
      <div style={{ padding: "48px 40px 32px", borderBottom: "1.5px solid var(--fs-border)" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", maxWidth: 1060, margin: "0 auto" }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(28px,4vw,40px)", fontWeight: 400, textTransform: "uppercase", color: "var(--charcoal)", marginBottom: 8 }}>Templates</h1>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 16, color: "var(--charcoal-light)", fontWeight: 300, lineHeight: 1.5 }}>Curated starting points. Fork one and start editing — the original stays untouched.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, border: "1.5px solid var(--fs-border)", borderRadius: 2, padding: "7px 12px", background: "white" }}>
            <span style={{ color: "#999", fontSize: 14 }}>⌕</span>
            <input
              type="search"
              placeholder="Search templates..."
              style={{ border: "none", outline: "none", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--charcoal)", background: "transparent", width: 180 }}
            />
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div style={{ padding: "14px 40px", borderBottom: "1px solid var(--fs-border)", display: "flex", gap: 6, alignItems: "center", overflowX: "auto" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#999", letterSpacing: "0.08em", textTransform: "uppercase", marginRight: 8, flexShrink: 0 }}>Filter</span>
        {FILTERS.map((f) => (
          <TemplateFilterChip key={f.id} filterId={f.id} label={f.label} />
        ))}
      </div>

      {/* GRID */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
        {TEMPLATES.map((t) => (
          <div
            key={t.id}
            className="fs-card-hover"
            style={{ background: "white", border: "1.5px solid var(--fs-border)", borderRadius: 4, overflow: "hidden", cursor: "pointer", transition: "transform 0.15s ease, box-shadow 0.15s ease" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 10px 32px rgba(0,0,0,0.09)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = ""; }}
          >
            {/* Preview */}
            <div style={{ height: 160, background: PREVIEW_BG[t.category] ?? "#1E1E1E", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, position: "relative" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 3, padding: "4px 10px" }}>
                  <DiagramTypeIcon type={t.diagramType} className="h-3 w-3" style={{ color: "rgba(255,255,255,0.6)" }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{t.diagramType}</span>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "rgba(255,255,255,0.85)", textAlign: "center", lineHeight: 1.3 }}>{t.title}</span>
              </div>
            </div>
            {/* Meta */}
            <div style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 7px", borderRadius: 2, background: "var(--fs-indigo-bg)", color: "var(--fs-indigo)" }}>{t.tag}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 7px", borderRadius: 2, background: "#F3F4F6", color: "#6B7280" }}>{t.diagramType}</span>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 500, color: "var(--charcoal)", marginBottom: 6 }}>{t.title}</div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--charcoal-light)", lineHeight: 1.5, fontWeight: 300, marginBottom: 14 }}>{t.description}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#999", letterSpacing: "0.04em", textTransform: "uppercase" }}>{t.diagramType}</span>
                <form action={async () => { "use server"; await forkTemplate(t.id); }}>
                  <button
                    type="submit"
                    className="fs-btn-press"
                    style={{ background: "var(--charcoal)", color: "white", border: "none", padding: "6px 14px", borderRadius: 2, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}
                  >
                    Fork →
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TemplateFilterChip({ filterId, label }: { filterId: string; label: string }) {
  const [active, setActive] = useState(filterId === "all");
  return (
    <button
      onClick={() => setActive((a) => !a)}
      className="fs-btn-press"
      style={{
        padding: "6px 14px", border: "1.5px solid var(--fs-border)", borderRadius: 2,
        fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.02em",
        background: active ? "var(--charcoal)" : "white",
        color: active ? "white" : "var(--charcoal-light)",
        cursor: "pointer", flexShrink: 0, transition: "background 0.12s, color 0.12s",
      }}
    >
      {label}
    </button>
  );
}
```

> **Note:** The search input and filter chips are client-side UI only in this pass. Actual filtering logic (filtering `TEMPLATES` by category client-side) is in the next step.

- [ ] **Step 2: The page uses `"use server"` for the form action — but TemplateFilterChip is `"use client"`. Split file.**

The `"use server"` form action inside a `"use client"` component requires the action to be imported from a separate server file. The existing `forkTemplate` from `@/app/actions/templates` is already a server action. Move the client parts to a separate component file.

Create `apps/web/app/app/templates/templates-client.tsx`:

```tsx
"use client";

import { useState } from "react";
import { TEMPLATES } from "@/lib/templates";
import { DiagramTypeIcon } from "@/components/diagram-icon";
import { forkTemplate } from "@/app/actions/templates";

const FILTERS = [
  { id: "all",          label: "All" },
  { id: "flowchart",    label: "Flowchart" },
  { id: "sequence",     label: "Sequence" },
  { id: "architecture", label: "Architecture" },
  { id: "erd",          label: "ERD" },
  { id: "charts",       label: "Charts" },
  { id: "social",       label: "Social cards" },
  { id: "bpmn",         label: "BPMN" },
  { id: "orgchart",     label: "Org chart" },
] as const;

type FilterId = typeof FILTERS[number]["id"];

const PREVIEW_BG: Record<string, string> = {
  flowchart:    "#1E1B4B",
  sequence:     "#0C1A3A",
  architecture: "#0F1117",
  erd:          "#0F172A",
  charts:       "#2D1B00",
  social:       "#0D3333",
  bpmn:         "#1A0F2E",
  orgchart:     "#0A1F1A",
};

export function TemplatesClient() {
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const [search, setSearch] = useState("");

  const visible = TEMPLATES.filter((t) => {
    const matchesFilter = activeFilter === "all" || t.category === activeFilter;
    const q = search.toLowerCase();
    const matchesSearch = !q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tag.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  return (
    <>
      {/* HEADER ROW */}
      <div style={{ padding: "48px 40px 32px", borderBottom: "1.5px solid var(--fs-border)" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", maxWidth: 1060, margin: "0 auto", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(28px,4vw,40px)", fontWeight: 400, textTransform: "uppercase", color: "var(--charcoal)", marginBottom: 8 }}>Templates</h1>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 16, color: "var(--charcoal-light)", fontWeight: 300, lineHeight: 1.5 }}>Curated starting points. Fork one and start editing — the original stays untouched.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, border: "1.5px solid var(--fs-border)", borderRadius: 2, padding: "7px 12px", background: "white" }}>
            <span style={{ color: "#999", fontSize: 14 }}>⌕</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              style={{ border: "none", outline: "none", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--charcoal)", background: "transparent", width: 180 }}
            />
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div style={{ padding: "14px 40px", borderBottom: "1px solid var(--fs-border)", display: "flex", gap: 6, alignItems: "center", overflowX: "auto" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#999", letterSpacing: "0.08em", textTransform: "uppercase", marginRight: 8, flexShrink: 0 }}>Filter</span>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className="fs-btn-press"
            style={{
              padding: "6px 14px", border: "1.5px solid var(--fs-border)", borderRadius: 2,
              fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.02em",
              background: activeFilter === f.id ? "var(--charcoal)" : "white",
              color: activeFilter === f.id ? "white" : "var(--charcoal-light)",
              cursor: "pointer", flexShrink: 0, transition: "background 0.12s, color 0.12s",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* GRID */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
        {visible.length === 0 && (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#999", gridColumn: "1/-1", textAlign: "center", padding: "40px 0" }}>
            No templates match "{search}"
          </p>
        )}
        {visible.map((t) => (
          <div
            key={t.id}
            style={{ background: "white", border: "1.5px solid var(--fs-border)", borderRadius: 4, overflow: "hidden", transition: "transform 0.15s ease, box-shadow 0.15s ease" }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.transform = "translateY(-3px)"; el.style.boxShadow = "0 10px 32px rgba(0,0,0,0.09)"; }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.transform = ""; el.style.boxShadow = ""; }}
          >
            <div style={{ height: 160, background: PREVIEW_BG[t.category] ?? "#1E1E1E", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 3, padding: "4px 10px" }}>
                  <DiagramTypeIcon type={t.diagramType} className="h-3 w-3" />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{t.diagramType}</span>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "rgba(255,255,255,0.85)", textAlign: "center", lineHeight: 1.3 }}>{t.title}</span>
              </div>
            </div>
            <div style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 7px", borderRadius: 2, background: "var(--fs-indigo-bg)", color: "var(--fs-indigo)" }}>{t.tag}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 7px", borderRadius: 2, background: "#F3F4F6", color: "#6B7280" }}>{t.diagramType}</span>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 500, color: "var(--charcoal)", marginBottom: 6 }}>{t.title}</div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--charcoal-light)", lineHeight: 1.5, fontWeight: 300, marginBottom: 14 }}>{t.description}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#999", letterSpacing: "0.04em", textTransform: "uppercase" }}>{t.diagramType}</span>
                <form action={forkTemplate.bind(null, t.id)}>
                  <button
                    type="submit"
                    className="fs-btn-press"
                    style={{ background: "var(--charcoal)", color: "white", border: "none", padding: "6px 14px", borderRadius: 2, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}
                  >
                    Fork →
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
```

Update `apps/web/app/app/templates/page.tsx` to be a thin server component that renders the nav + `<TemplatesClient />`:

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { TemplatesClient } from "./templates-client";

export default async function TemplatesPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login?callbackUrl=" + encodeURIComponent("/app/templates"));

  return (
    <div style={{ background: "var(--cream)", minHeight: "100vh" }}>
      <header style={{ background: "var(--cream)", borderBottom: "1.5px solid var(--fs-border)", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px", position: "sticky", top: 0, zIndex: 50 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <Logo className="h-6 w-6 rounded-sm shadow-xs shadow-orange-500/20" />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, color: "var(--charcoal)", fontWeight: 500 }}>FlowStudio</span>
        </Link>
        <nav style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Link href="/app" style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--charcoal-light)", textDecoration: "none" }}>Projects</Link>
          <Link href="/app/editor" style={{ fontFamily: "var(--font-mono)", fontSize: 13, letterSpacing: "0.04em", background: "var(--charcoal)", color: "#fff", padding: "7px 16px", borderRadius: 2, textDecoration: "none" }}>Open editor →</Link>
        </nav>
      </header>
      <TemplatesClient />
    </div>
  );
}
```

- [ ] **Step 3: Type-check + build**

```bash
pnpm --filter @flowchart/web exec tsc --noEmit
pnpm --filter @flowchart/web build
```

Fix any type errors (likely `DiagramTypeIcon` props — check its signature if `style` prop is not accepted, remove it).

- [ ] **Step 4: Visual check**

```bash
pnpm --filter @flowchart/web dev
```

Open http://localhost:3040/app/templates — verify filter bar works, search filters cards, hover lifts cards, Fork button present.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/app/templates/page.tsx apps/web/app/app/templates/templates-client.tsx apps/web/lib/templates.ts
git commit -m "feat(templates): filter bar, search, card redesign with dark preview backgrounds"
```

---

## Final verification

- [ ] **Run all unit tests**

```bash
pnpm test:unit
```

Expected: all 12 suites pass (no changes to diagram logic).

- [ ] **Full type-check**

```bash
pnpm --filter @flowchart/web exec tsc --noEmit
```

- [ ] **Production build**

```bash
pnpm --filter @flowchart/web build
```

Expected: clean build, no type errors.

- [ ] **Smoke test checklist**

1. Home page: cream bg, DM Mono heading, hero card visible, features section, chip cloud, dark CTA, footer
2. Editor: single topbar (cream), secondary toolbar (white, 40px), streaming pill appears while AI generates, save status cycles unsaved → saving → saved, toast pops in with spring animation, canvas has dot-grid background
3. Templates: filter chips work, search filters live, cards have dark preview area + Fork button

- [ ] **Commit**

```bash
git add -A
git commit -m "chore(verify): UX/UI overhaul complete — all tests pass, clean build"
```
