# Onboarding & Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a live AI demo to the landing page and a first-run onboarding flow that auto-generates a diagram when a new user signs up.

**Architecture:** A new unauthenticated `/api/ai/demo` route handles landing-page generation with cookie-based rate limiting. The auth callback detects new users (via an `isNewUser` flag from `ensureUserAndWorkspace`) and redirects them to the editor with a `?prompt=` pre-filled. The editor already reads `?prompt=` and auto-submits it — we add a `?welcome=` toast and URL cleanup.

**Tech Stack:** Next.js 15 App Router, Vercel AI SDK (`generateText`), Mermaid (client-side rendering via SVG data URL), cookie-based rate limiting

---

## File Map

| File | Action | What changes |
|------|--------|--------------|
| `apps/web/lib/user-sync.ts` | Modify | Return `isNewUser: boolean` from `ensureUserAndWorkspaceCore` and `ensureUserAndWorkspace` |
| `apps/web/lib/user-sync.test.ts` | Modify | Add assertions for `isNewUser` flag |
| `apps/web/app/api/auth/callback/route.ts` | Modify | Call `ensureUserAndWorkspace`, redirect new users with `?prompt=&welcome=1` |
| `apps/web/app/app/editor/page.tsx` | Modify | Read `?welcome=` param, pass `initialWelcome` prop to `EditorClient` |
| `apps/web/components/editor-client.tsx` | Modify | Accept `initialWelcome` prop, show toast, clean URL after auto-submit |
| `apps/web/app/api/ai/demo/route.ts` | Create | Unauthenticated single-pass mermaid generation with cookie rate limit |
| `apps/web/components/landing-demo-section.tsx` | Create | Client component: prompt input → fetch demo API → render mermaid output |
| `apps/web/app/page.tsx` | Modify | Update hero copy, add `<LandingDemoSection />`, demote type chips |

---

## Task 1: Return `isNewUser` from `ensureUserAndWorkspace`

**Files:**
- Modify: `apps/web/lib/user-sync.ts`
- Modify: `apps/web/lib/user-sync.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `apps/web/lib/user-sync.test.ts` after the existing two tests:

```ts
it("returns isNewUser=true when user is created", async () => {
  const result = await ensureUserAndWorkspaceCore("brand-new@example.com", {
    selectUserByEmail: async () => null,
    createUser: async (values) => ({
      id: "user-new",
      email: values.email,
      name: values.name ?? null,
      role: values.role ?? "user",
      plan: "free",
      creditsBalance: 5,
      aiProvider: "google",
      emailVerified: null,
      image: null,
      stripeCustomerId: null,
      aiApiKeyCipher: null,
      aiKeyLast4: null,
      aiBaseUrl: null,
      aiModel: null,
      handle: null,
    }),
    selectWorkspaceByOwnerId: async () => null,
    createWorkspace: async (values) => ({
      id: "ws-new",
      name: values.name,
      ownerId: values.ownerId,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    }),
    resolveRole: () => "user",
  });
  assert.equal(result.isNewUser, true);
});

it("returns isNewUser=false when user already exists", async () => {
  const existingUser = {
    id: "user-old", email: "old@example.com", name: "Old", role: "user",
    plan: "free", creditsBalance: 5, aiProvider: "google",
    emailVerified: null, image: null, stripeCustomerId: null,
    aiApiKeyCipher: null, aiKeyLast4: null, aiBaseUrl: null, aiModel: null, handle: null,
  };
  const result = await ensureUserAndWorkspaceCore("old@example.com", {
    selectUserByEmail: async () => existingUser,
    createUser: async () => { throw new Error("should not be called"); },
    selectWorkspaceByOwnerId: async () => ({
      id: "ws-old", name: "Personal", ownerId: "user-old",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    }),
    createWorkspace: async () => { throw new Error("should not be called"); },
    resolveRole: () => "user",
  });
  assert.equal(result.isNewUser, false);
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
node --experimental-strip-types apps/web/lib/user-sync.test.ts
```

Expected: `TypeError: Cannot read properties of undefined (reading 'isNewUser')` — the property doesn't exist yet.

- [ ] **Step 3: Update `ensureUserAndWorkspaceCore` to track and return `isNewUser`**

In `apps/web/lib/user-sync.ts`, change `ensureUserAndWorkspaceCore`:

```ts
export async function ensureUserAndWorkspaceCore(
  email: string,
  deps: UserWorkspaceSyncDeps,
) {
  const normalizedEmail = email.trim().toLowerCase();
  let user = await deps.selectUserByEmail(normalizedEmail);
  const isNewUser = !user;

  if (!user) {
    user = await deps.createUser({
      email: normalizedEmail,
      name: displayNameFromEmail(normalizedEmail),
      role: deps.resolveRole(normalizedEmail),
    });
  }

  let workspace = await deps.selectWorkspaceByOwnerId(user.id);
  if (!workspace) {
    workspace = await deps.createWorkspace({
      name: "Personal",
      ownerId: user.id,
    });
  }

  return { user, workspace, isNewUser };
}
```

Also add `isNewUser: false` to the mock path in `getMockUserAndWorkspace`:

```ts
function getMockUserAndWorkspace(email: string) {
  const mockUser = {
    id: "dev-user-id",
    email,
    name: displayNameFromEmail(email),
    plan: "pro",
    role: "admin",
    creditsBalance: 100,
    aiApiKeyCipher: null,
    aiKeyLast4: null,
    aiBaseUrl: null,
    aiModel: null,
    aiProvider: "openai",
  };
  const mockWorkspace = {
    id: "dev-ws-id",
    name: "Personal",
    ownerId: "dev-user-id",
    createdAt: new Date(0),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { user: mockUser as any, workspace: mockWorkspace as any, isNewUser: false };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
node --experimental-strip-types apps/web/lib/user-sync.test.ts
```

Expected: all 4 tests pass.

- [ ] **Step 5: Type-check**

```bash
pnpm --filter @flowchart/web exec tsc --noEmit
```

Expected: no new errors (existing callers destructure `{ user, workspace }` — the extra `isNewUser` in the return type is backward-compatible).

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/user-sync.ts apps/web/lib/user-sync.test.ts
git commit -m "feat(user-sync): return isNewUser flag from ensureUserAndWorkspace"
```

---

## Task 2: Auth callback redirects new users with welcome params

**Files:**
- Modify: `apps/web/app/api/auth/callback/route.ts`

- [ ] **Step 1: Replace the callback with new-user detection**

Replace the entire content of `apps/web/app/api/auth/callback/route.ts`:

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureUserAndWorkspace } from "@/lib/user-sync";

const WELCOME_PROMPT = "Map the user signup flow for a SaaS app";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app/editor";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const email = data.session?.user?.email;
      let destination: string;

      if (email) {
        const { isNewUser } = await ensureUserAndWorkspace(email);
        if (isNewUser) {
          const welcomeParams = new URLSearchParams({
            prompt: WELCOME_PROMPT,
            welcome: "1",
          });
          destination = `${origin}/app/editor?${welcomeParams.toString()}`;
        } else {
          const forwardSlash = next.startsWith("/") && !next.startsWith("//");
          destination = forwardSlash ? `${origin}${next}` : `${origin}/app/editor`;
        }
      } else {
        const forwardSlash = next.startsWith("/") && !next.startsWith("//");
        destination = forwardSlash ? `${origin}${next}` : `${origin}/app/editor`;
      }

      return NextResponse.redirect(destination);
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=auth_callback_failed", origin)
  );
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm --filter @flowchart/web exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/auth/callback/route.ts
git commit -m "feat(auth): redirect new OAuth users to editor with welcome prompt"
```

---

## Task 3: Editor welcome toast and URL cleanup

**Files:**
- Modify: `apps/web/app/app/editor/page.tsx`
- Modify: `apps/web/components/editor-client.tsx`

- [ ] **Step 1: Read `?welcome=` in the editor page**

In `apps/web/app/app/editor/page.tsx`, update the `searchParams` type:

```ts
export default async function EditorPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; template?: string; type?: string; prompt?: string; welcome?: string }>;
}) {
```

Then below `const initialPrompt = sp.prompt ?? null;`, add:

```ts
const initialWelcome = sp.welcome === "1";
```

Then pass `initialWelcome={initialWelcome}` to all four `<EditorClient ...>` render paths in that file (projectId path, typeParam path, no-project path, templateId path). Each already has `initialPrompt={initialPrompt}` — add `initialWelcome={initialWelcome}` on the next line.

- [ ] **Step 2: Add `initialWelcome` to `EditorClientProps`**

In `apps/web/components/editor-client.tsx`, find `type EditorClientProps` (around line 248) and add the new prop:

```ts
type EditorClientProps = {
  initialSource: string;
  initialThemeId: string;
  initialTitle: string;
  initialDiagramType: DiagramType;
  projectId: string | null;
  showWatermark: boolean;
  aiAssistantHint?: AiAssistantHint;
  isExample?: boolean;
  creditsBalance?: number;
  initialPrompt?: string | null;
  initialWelcome?: boolean;
  userEmail?: string;
  userName?: string;
};
```

- [ ] **Step 3: Destructure `initialWelcome` in the function signature**

Find the `export function EditorClient({` destructuring (around line 282) and add `initialWelcome = false`:

```ts
export function EditorClient({
  initialSource,
  initialThemeId,
  initialTitle,
  initialDiagramType,
  projectId,
  showWatermark,
  aiAssistantHint = { kind: "none" },
  isExample = false,
  creditsBalance,
  initialPrompt,
  initialWelcome = false,
  userEmail,
  userName,
}: EditorClientProps) {
```

- [ ] **Step 4: Add `useRouter` import**

In `apps/web/components/editor-client.tsx`, add to the existing `next/navigation` import (or add a new import line near the top):

```ts
import { useRouter } from "next/navigation";
```

Inside the `EditorClient` function body, add the router instance near the other hook declarations:

```ts
const router = useRouter();
```

- [ ] **Step 5: Replace the `initialPrompt` effect with URL cleanup and welcome toast**

Find the existing `useEffect` for `initialPrompt` (around line 735):

```ts
useEffect(() => {
  if (initialPrompt && !promptAppendedRef.current) {
    promptAppendedRef.current = true;
    setTimeout(() => {
      setLeftPanelOpen(true);
      sendChatMessage(initialPrompt);
    }, 100);
  }
}, [initialPrompt, sendChatMessage]);
```

Replace it with:

```ts
useEffect(() => {
  if (initialPrompt && !promptAppendedRef.current) {
    promptAppendedRef.current = true;
    setTimeout(() => {
      setLeftPanelOpen(true);
      sendChatMessage(initialPrompt);
      // Strip ?prompt and ?welcome from URL so a refresh doesn't re-trigger
      const params = new URLSearchParams(window.location.search);
      params.delete("prompt");
      params.delete("welcome");
      const newQuery = params.toString();
      router.replace(
        newQuery ? `/app/editor?${newQuery}` : "/app/editor",
        // @ts-ignore — scroll option is valid at runtime
        { scroll: false }
      );
      if (initialWelcome) {
        showToast("Welcome! Here's a sample diagram to get you started.");
      }
    }, 100);
  }
}, [initialPrompt, initialWelcome, sendChatMessage, router, showToast]);
```

- [ ] **Step 6: Type-check**

```bash
pnpm --filter @flowchart/web exec tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/app/editor/page.tsx apps/web/components/editor-client.tsx
git commit -m "feat(editor): welcome toast and URL cleanup for first-run onboarding"
```

---

## Task 4: Demo API route (`/api/ai/demo`)

**Files:**
- Create: `apps/web/app/api/ai/demo/route.ts`

- [ ] **Step 1: Create the route file**

Create `apps/web/app/api/ai/demo/route.ts`:

```ts
import { NextResponse } from "next/server";
import { generateText } from "ai";
import { DIAGRAM_SYSTEM_PROMPTS } from "@flowchart/core";
import { buildLanguageModel } from "@/lib/ai-providers";
import { validateAndRepairOutput } from "@/lib/diagrams/validate-output";

const MAX_DEMO_USES = 3;
const COOKIE_NAME = "fs_demo_uses";

function getDemoUses(cookieHeader: string | null): number {
  if (!cookieHeader) return 0;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=(\\d+)`));
  return match ? Math.min(parseInt(match[1], 10), MAX_DEMO_USES) : 0;
}

function buildDemoApiKey(): { apiKey: string; provider: "openai" | "google" } | null {
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return { apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY, provider: "google" };
  }
  if (process.env.OPENAI_API_KEY) {
    return { apiKey: process.env.OPENAI_API_KEY, provider: "openai" };
  }
  if (process.env.AI_GATEWAY_KEY) {
    return { apiKey: process.env.AI_GATEWAY_KEY, provider: "openai" };
  }
  return null;
}

export async function POST(req: Request) {
  const uses = getDemoUses(req.headers.get("cookie"));

  if (uses >= MAX_DEMO_USES) {
    return NextResponse.json({ error: "limit" }, { status: 429 });
  }

  let body: { prompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 800) : "";
  if (!prompt) {
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }

  const credentials = buildDemoApiKey();
  if (!credentials) {
    return NextResponse.json({ error: "no_api_key" }, { status: 503 });
  }

  const googleModelFromEnv = process.env.GOOGLE_MODEL?.trim();
  const openAiModelFromEnv = process.env.OPENAI_MODEL?.trim();
  const model =
    credentials.provider === "google"
      ? (googleModelFromEnv || "gemini-1.5-flash")
      : (openAiModelFromEnv || "gpt-4o-mini");

  const languageModel = buildLanguageModel(credentials.provider, model, credentials.apiKey, null);
  const systemPrompt = DIAGRAM_SYSTEM_PROMPTS["mermaid"];

  let raw: string;
  try {
    const result = await generateText({
      model: languageModel,
      system: systemPrompt,
      prompt: `Request: ${prompt}`,
      maxTokens: 1200,
    });
    raw = result.text.trim();
  } catch {
    return NextResponse.json({ error: "generation_failed" }, { status: 500 });
  }

  const repaired = validateAndRepairOutput("mermaid", raw);
  const source = repaired ?? raw;

  const newUses = uses + 1;
  const response = NextResponse.json({ diagramType: "mermaid", source });
  response.cookies.set(COOKIE_NAME, String(newUses), {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: "lax",
  });
  return response;
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm --filter @flowchart/web exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Smoke-test the route**

Start the dev server if not running:
```bash
pnpm --filter @flowchart/web dev
```

In another terminal:
```bash
curl -s -X POST http://localhost:3040/api/ai/demo \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Show the OAuth login flow"}' | head -c 500
```

Expected: `{"diagramType":"mermaid","source":"sequenceDiagram\n..."}`.

- [ ] **Step 4: Verify rate limiting**

```bash
for i in 1 2 3 4; do
  curl -s -o /dev/null -w "Use $i: HTTP %{http_code}\n" \
    -X POST http://localhost:3040/api/ai/demo \
    -H "Content-Type: application/json" \
    -H "Cookie: fs_demo_uses=$((i-1))" \
    -d '{"prompt":"test"}'
done
```

Expected: uses 1–3 return `200`, use 4 returns `429`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/ai/demo/route.ts
git commit -m "feat(api): unauthenticated demo generation endpoint with cookie rate limit"
```

---

## Task 5: `LandingDemoSection` client component

**Files:**
- Create: `apps/web/components/landing-demo-section.tsx`

The SVG from mermaid is displayed via an `<img src="data:image/svg+xml,...">` data URL — safe, no script execution, no sanitization library needed.

- [ ] **Step 1: Create the component**

Create `apps/web/components/landing-demo-section.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import mermaid from "mermaid";

const PLACEHOLDERS = [
  "Map the OAuth login flow",
  "90-day startup launch plan",
  "Compare React vs Vue",
];

const INITIAL_SOURCE = `sequenceDiagram
  participant Browser as Browser
  participant App as App Server
  participant Auth as Auth Server
  Browser->>App: GET /login
  App-->>Browser: Redirect to Auth
  Browser->>Auth: Username + password
  Auth-->>Browser: Auth code
  Browser->>App: POST auth code
  App->>Auth: Exchange for tokens
  Auth-->>App: Access + refresh token
  App-->>Browser: Session cookie`;

export function LandingDemoSection() {
  const [prompt, setPrompt] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [limited, setLimited] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [svgDataUrl, setSvgDataUrl] = useState<string | null>(null);
  const mermaidInitialized = useRef(false);
  const idCounter = useRef(0);

  function nextId() {
    idCounter.current += 1;
    return `ldemo-${idCounter.current}`;
  }

  function svgToDataUrl(svg: string): string {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  useEffect(() => {
    const id = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (mermaidInitialized.current) return;
    mermaidInitialized.current = true;
    mermaid.initialize({ startOnLoad: false, theme: "default", suppressErrorRendering: true });
    mermaid.render(nextId(), INITIAL_SOURCE)
      .then(({ svg }) => setSvgDataUrl(svgToDataUrl(svg)))
      .catch(() => {/* ignore initial render failure */});
  }, []);

  async function handleGenerate() {
    const text = prompt.trim() || PLACEHOLDERS[placeholderIdx];
    if (!text || loading) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/ai/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });

      if (res.status === 429) {
        setLimited(true);
        return;
      }

      if (!res.ok) {
        setErrorMsg("Generation failed — please try again.");
        return;
      }

      const data = await res.json() as { diagramType: string; source: string };

      try {
        const { svg } = await mermaid.render(nextId(), data.source);
        setSvgDataUrl(svgToDataUrl(svg));
        setErrorMsg(null);
      } catch {
        setErrorMsg("Could not render — open in editor to see full output.");
      }
    } catch {
      setErrorMsg("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: "white", borderTop: "1.5px solid var(--fs-border)", borderBottom: "1.5px solid var(--fs-border)", padding: "72px 40px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <p style={{ fontFamily: "var(--font-mono-fs)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fs-indigo)", textAlign: "center", marginBottom: 16 }}>
          Try it now — no sign-up required
        </p>
        <h2 style={{ fontFamily: "var(--font-mono-fs)", fontSize: "clamp(22px,3.5vw,36px)", fontWeight: 400, textTransform: "uppercase", color: "var(--charcoal)", textAlign: "center", marginBottom: 32, lineHeight: 1.1 }}>
          Describe it. Get a diagram.
        </h2>

        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleGenerate(); } }}
            placeholder={PLACEHOLDERS[placeholderIdx]}
            rows={2}
            disabled={loading || limited}
            style={{
              flex: 1, resize: "none", fontFamily: "var(--font-sans-fs)", fontSize: 14,
              border: "1.5px solid var(--fs-border)", borderRadius: 4, padding: "12px 14px",
              color: "var(--charcoal)", background: limited ? "#fafafa" : "white", outline: "none",
            }}
          />
          {limited ? (
            <Link
              href="/login?callbackUrl=/app/editor"
              style={{
                fontFamily: "var(--font-mono-fs)", fontSize: 12, letterSpacing: "0.04em",
                textTransform: "uppercase", background: "var(--charcoal)", color: "white",
                border: "1.5px solid var(--charcoal)", padding: "12px 18px", borderRadius: 4,
                textDecoration: "none", display: "flex", alignItems: "center", whiteSpace: "nowrap",
              }}
            >
              Sign up to keep going →
            </Link>
          ) : (
            <button
              onClick={() => void handleGenerate()}
              disabled={loading}
              style={{
                fontFamily: "var(--font-mono-fs)", fontSize: 12, letterSpacing: "0.04em",
                textTransform: "uppercase", background: "var(--charcoal)", color: "white",
                border: "1.5px solid var(--charcoal)", padding: "12px 18px", borderRadius: 4,
                cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {loading ? "Generating…" : "Generate →"}
            </button>
          )}
        </div>

        <div style={{
          background: "#FAFAFA", border: "1.5px solid var(--fs-border)", borderRadius: 4,
          minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24, overflow: "auto",
        }}>
          {svgDataUrl && !errorMsg ? (
            <img
              src={svgDataUrl}
              alt="Generated diagram"
              style={{ maxWidth: "100%", height: "auto" }}
            />
          ) : errorMsg ? (
            <p style={{ fontFamily: "var(--font-mono-fs)", fontSize: 12, color: "#666", margin: 0 }}>
              {errorMsg}
            </p>
          ) : loading ? (
            <p style={{ fontFamily: "var(--font-mono-fs)", fontSize: 12, color: "#999", margin: 0 }}>Generating…</p>
          ) : (
            <p style={{ fontFamily: "var(--font-mono-fs)", fontSize: 12, color: "#999", margin: 0 }}>
              Your diagram will appear here.
            </p>
          )}
        </div>

        {limited && (
          <p style={{ fontFamily: "var(--font-sans-fs)", fontSize: 13, color: "#666", textAlign: "center", marginTop: 16 }}>
            You&apos;ve used your 3 free generations.{" "}
            <Link href="/login?callbackUrl=/app/editor" style={{ color: "var(--fs-indigo)", textDecoration: "none" }}>
              Sign up free
            </Link>{" "}
            for unlimited diagrams.
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm --filter @flowchart/web exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/landing-demo-section.tsx
git commit -m "feat(landing): LandingDemoSection client component with mermaid rendering"
```

---

## Task 6: Update the landing page

**Files:**
- Modify: `apps/web/app/page.tsx`

- [ ] **Step 1: Add the import**

At the top of `apps/web/app/page.tsx`, add after the existing imports:

```ts
import { LandingDemoSection } from "@/components/landing-demo-section";
```

- [ ] **Step 2: Replace the hero section**

Replace the `{/* HERO */}` block (lines 64–99) with:

```tsx
{/* HERO */}
<div style={{ maxWidth: 960, margin: "0 auto", padding: "96px 40px 56px", textAlign: "center" }}>
  <p style={{ fontFamily: "var(--font-mono-fs)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fs-indigo)", marginBottom: 24 }}>
    AI Diagram Generator
  </p>
  <h1 style={{ fontFamily: "var(--font-mono-fs)", fontSize: "clamp(36px,6vw,64px)", fontWeight: 400, textTransform: "uppercase", letterSpacing: "-0.01em", lineHeight: 1.05, color: "var(--charcoal)", marginBottom: 24 }}>
    Go from idea to{" "}
    <span style={{ color: "var(--fs-indigo)" }}>diagram</span>
    <br />in seconds.
  </h1>
  <p style={{ fontFamily: "var(--font-sans-fs)", fontSize: 20, fontWeight: 300, lineHeight: 1.6, color: "var(--charcoal-light)", maxWidth: 560, margin: "0 auto 40px" }}>
    Describe what you need. FlowStudio picks the right diagram type and generates it instantly — flowcharts, timelines, org charts, and 19 more.
  </p>
  <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 16 }}>
    <a
      href="#try-it"
      className="fs-btn-press"
      style={{ fontFamily: "var(--font-mono-fs)", fontSize: 13, letterSpacing: "0.05em", textTransform: "uppercase", background: "var(--charcoal)", color: "#fff", border: "1.5px solid var(--charcoal)", padding: "13px 28px", borderRadius: 2, textDecoration: "none" }}
    >
      Try it free →
    </a>
    <Link
      href="/app/templates"
      className="fs-btn-press"
      style={{ fontFamily: "var(--font-mono-fs)", fontSize: 13, letterSpacing: "0.05em", textTransform: "uppercase", background: "transparent", color: "var(--charcoal)", border: "1.5px solid var(--fs-border)", padding: "13px 28px", borderRadius: 2, textDecoration: "none" }}
    >
      Browse templates
    </Link>
  </div>
  {isLoggedIn && (
    <p style={{ fontFamily: "var(--font-mono-fs)", fontSize: 12, color: "#999" }}>
      Signed in —{" "}
      <Link href="/app/editor" style={{ color: "var(--fs-indigo)", textDecoration: "none" }}>jump to editor</Link>
    </p>
  )}
</div>
```

- [ ] **Step 3: Remove the HERO PREVIEW CARD**

Delete the entire `{/* HERO PREVIEW CARD */}` block (the static browser-chrome mock, lines 101–136). The live demo replaces it.

- [ ] **Step 4: Add the demo section after the TRUST STRIP**

After the closing `</div>` of the TRUST STRIP section, add:

```tsx
{/* LIVE DEMO */}
<div id="try-it">
  <LandingDemoSection />
</div>
```

- [ ] **Step 5: Type-check and build**

```bash
pnpm --filter @flowchart/web exec tsc --noEmit
pnpm --filter @flowchart/web build
```

Expected: no errors, clean build.

- [ ] **Step 6: Verify in the browser**

Open `http://localhost:3040`. Confirm:
- Hero headline reads "Go from idea to diagram in seconds."
- "Try it free →" button scrolls to the demo section
- Demo section shows rotating placeholders in the textarea
- Typing a prompt and clicking Generate produces a real mermaid diagram
- After 3 generations the button changes to "Sign up to keep going →"

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/page.tsx
git commit -m "feat(landing): live demo section and updated hero copy"
```

---

## Self-Review Notes

- **Spec coverage:** Hero copy (Task 6 step 2) ✓ · Live demo section (Tasks 4–6) ✓ · First-run redirect for new users (Task 2) ✓ · Welcome toast + URL cleanup (Task 3) ✓
- **No placeholders:** All steps contain actual code. ✓
- **Type consistency:** `isNewUser` defined in Task 1, consumed in Task 2. `initialWelcome` prop added in Task 3 throughout. `LandingDemoSection` created in Task 5, imported in Task 6. ✓
- **Security:** Mermaid SVG rendered via `<img src="data:image/svg+xml,...">` — no script execution, no `innerHTML`. ✓
