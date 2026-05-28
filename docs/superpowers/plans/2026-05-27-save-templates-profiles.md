# Save Flow Fixes + AI Template Suggestions + Public Profiles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 3 silent save bugs, add AI-matched template suggestions in the chat panel, and ship public profile pages at `/u/[handle]`.

**Architecture:** All three tasks are independent and commit separately. Tasks 1–2 touch only `editor-client.tsx`. Task 3 adds a DB migration, new server actions, new routes, and small updates to existing pages.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM + Postgres, Vercel AI SDK `useChat`, Node.js native test runner (`node:test`)

---

## File Map

### Task 1 — Save flow bugs
- Modify: `apps/web/components/editor-client.tsx` (handleSave + onFinish)

### Task 2 — AI template suggestions
- Modify: `apps/web/components/editor-client.tsx` (add matchTemplate, state, card UI, wrap form submit)

### Task 3 — Public profiles
- Modify: `apps/web/lib/db/schema.ts` (add `handle` to users, `rawToken` to shareLinks)
- Create: `apps/web/lib/db/migrations/0003_handle_and_share_token.sql`
- Create: `apps/web/app/actions/profile.ts`
- Modify: `apps/web/app/actions/share.ts` (store rawToken)
- Create: `apps/web/app/u/[handle]/page.tsx`
- Create: `apps/web/app/u/[handle]/not-found.tsx`
- Modify: `apps/web/app/app/settings/page.tsx` (add handle section)
- Modify: `apps/web/app/s/[token]/page.tsx` (add "by @handle" attribution)
- Create: `apps/web/lib/profile.test.ts` (unit tests for slugify + matchTemplate)

---

## Task 1: Fix Save Flow Bugs

**Files:**
- Modify: `apps/web/components/editor-client.tsx`

### Step 1.1 — Add concurrent-save guard

In `handleSave` (around line 799), the function currently starts with `setSaving(true)`. Add a guard as the very first line:

```typescript
const handleSave = useCallback(async () => {
  if (saving) return;          // ← ADD THIS LINE
  setSaving(true);
  try {
```

- [ ] Make this edit in `apps/web/components/editor-client.tsx`

### Step 1.2 — Add catch block to handleSave

The current `handleSave` ends with `} finally { setSaving(false); }`. Replace with:

```typescript
    } catch {
      showToast("Save failed — check your connection");
    } finally {
      setSaving(false);
    }
  }, [currentProjectId, source, uiState, themeId, title, diagramType, showToast, pendingRevisionLabel]);
```

- [ ] Make this edit (the `} finally { setSaving(false); }` at the end of handleSave becomes `} catch { showToast("Save failed — check your connection"); } finally { setSaving(false); }`)

### Step 1.3 — Auto-save after AI generation

In `onFinish` (around line 308), after `setPendingRevisionLabel(aiLabel)` and before `if (forceCreateNext)`, add:

```typescript
      setPendingRevisionLabel(aiLabel);
      void handleSave();          // ← ADD THIS LINE
      if (forceCreateNext) setForceCreateNext(false);
```

- [ ] Make this edit. Note: `handleSave` is defined after `useChat` in the file. The `useCallback` dependency array for `onFinish` will need `handleSave` added — but `onFinish` is inside the `useChat` options object, not a `useCallback` itself, so it closes over `handleSave` naturally once `handleSave` is stable (it is, via `useCallback`).

### Step 1.4 — TypeScript check

- [ ] Run: `cd apps/web && pnpm exec tsc --noEmit 2>&1 | grep "error TS"`
- [ ] Expected: no output (zero errors)

### Step 1.5 — Commit

- [ ] Run:
```bash
git add apps/web/components/editor-client.tsx
git commit -m "fix(editor): auto-save after AI generation, catch save errors, guard concurrent saves"
```

---

## Task 2: AI Template Suggestions

**Files:**
- Modify: `apps/web/components/editor-client.tsx`

### Step 2.1 — Add template import

At the top of `editor-client.tsx`, find the import from `@flowchart/core`:

```typescript
import {
  // ... existing imports ...
} from "@flowchart/core";
```

Add `TEMPLATES` and `type Template` to that import (or add a separate import from `@/lib/templates` if TEMPLATES isn't exported from core):

```typescript
import { TEMPLATES } from "@/lib/templates";
import type { Template } from "@/lib/templates";
```

- [ ] Add these two import lines after the existing imports block (around line 54, after the `@/lib/source-highlight` import)

### Step 2.2 — Add matchTemplate function

Add this pure function just above the `EditorClient` component definition (around line 200, before `type Props`):

```typescript
const TEMPLATE_KEYWORDS: { id: string; keywords: string[] }[] = [
  { id: "oauth-sequence",      keywords: ["oauth", "auth", "login", "sign in", "identity", "sso", "saml"] },
  { id: "onboarding-funnel",   keywords: ["funnel", "onboarding", "signup", "sign up", "activation", "user flow"] },
  { id: "system-architecture", keywords: ["architecture", "system design", "stack", "infra", "infrastructure", "backend"] },
  { id: "quarterly-revenue",   keywords: ["revenue", "quarterly", "bar chart", "kpi", "financial", "q1", "q2", "q3", "q4", "sales chart"] },
  { id: "blog-erd",            keywords: ["schema", "database", "erd", "entity", "relations", "table", "data model"] },
  { id: "release-roadmap",     keywords: ["roadmap", "gantt", "timeline", "sprint", "milestone", "release plan"] },
];

function matchTemplate(prompt: string): Template | null {
  const lower = prompt.toLowerCase();
  for (const { id, keywords } of TEMPLATE_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) {
      return TEMPLATES.find((t) => t.id === id) ?? null;
    }
  }
  return null;
}
```

- [ ] Add this block to `editor-client.tsx` immediately before the `type Props = {` line

### Step 2.3 — Add suggestion state

Inside `EditorClient`, after the existing state declarations (around line 288, near `applyingBrand`), add:

```typescript
  const [suggestedTemplate, setSuggestedTemplate] = useState<Template | null>(null);
  const [pendingSuggestInput, setPendingSuggestInput] = useState<string>("");
```

- [ ] Add these two lines to the state block in `EditorClient`

### Step 2.4 — Clear suggestion after AI finishes

In `onFinish` (the block you edited in Task 1), add `setSuggestedTemplate(null);` before `setPendingRevisionLabel`:

```typescript
    onFinish: (message) => {
      // ... existing source update logic ...
      setSuggestedTemplate(null);          // ← ADD THIS LINE
      showToast("Diagram updated · ⌘Z to undo");
      // ... rest of onFinish ...
```

- [ ] Make this edit

### Step 2.5 — Wrap the chat form's onSubmit

Find the chat form's `onSubmit` (around line 1356):

```typescript
onSubmit={(e) => {
  e.preventDefault();
  handleSubmit(e);
}}
```

Replace with:

```typescript
onSubmit={(e) => {
  e.preventDefault();
  if (!input.trim() || aiLoading) return;
  const match = matchTemplate(input);
  if (match && !suggestedTemplate) {
    setPendingSuggestInput(input);
    setSuggestedTemplate(match);
    setInput("");
    return;
  }
  handleSubmit(e);
}}
```

- [ ] Make this replacement in `editor-client.tsx`

Also find the `onKeyDown` Enter handler on the textarea (a few lines below the onSubmit) and apply the same intercept. It currently calls `handleSubmit`. Find:

```typescript
if (e.key === "Enter" && !e.shiftKey) {
```

The block after this calls `handleSubmit`. Wrap the same way — instead of calling `handleSubmit` directly, check for a template match first using the same logic as above (extract to a shared `handleChatSubmit` function to avoid duplication):

```typescript
  const handleChatSubmit = useCallback((e: React.FormEvent<HTMLFormElement> | React.KeyboardEvent) => {
    if (!input.trim() || aiLoading) return;
    const match = matchTemplate(input);
    if (match && !suggestedTemplate) {
      setPendingSuggestInput(input);
      setSuggestedTemplate(match);
      setInput("");
      return;
    }
    if ("key" in e) {
      // keyboard event — call append directly
      void append({ role: "user", content: input });
      setInput("");
    } else {
      handleSubmit(e as React.FormEvent<HTMLFormElement>);
    }
  }, [input, aiLoading, suggestedTemplate, handleSubmit, append, setInput]);
```

Then update the form `onSubmit` to call `handleChatSubmit(e)` and the `onKeyDown` Enter path to call `handleChatSubmit(e)`.

- [ ] Add `handleChatSubmit` useCallback after `handleSave` (it needs `input`, `aiLoading`, `suggestedTemplate`, `handleSubmit`, `append`, `setInput` in its deps)
- [ ] Update form `onSubmit` to: `onSubmit={handleChatSubmit}`
- [ ] Update Enter `onKeyDown` to call `handleChatSubmit(e)` instead of `handleSubmit`

### Step 2.6 — Add the suggestion card UI

In the chat panel, find where messages are rendered. The suggestion card goes between the user's message and the AI response area. Find the messages list section (look for `messages.map`) and add the card after the messages list but before the form:

```tsx
{/* Template suggestion card */}
{suggestedTemplate && (
  <div className="mx-3 mb-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-sm">📌</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-indigo-900">{suggestedTemplate.title}</p>
        <p className="mt-0.5 text-xs text-indigo-700">{suggestedTemplate.description}</p>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => {
              recordUndo(source);
              setSource(suggestedTemplate.source);
              setDiagramType(suggestedTemplate.diagramType);
              setThemeId(suggestedTemplate.themeId);
              setTitle(suggestedTemplate.title);
              setSuggestedTemplate(null);
              setPendingSuggestInput("");
            }}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            Use template
          </button>
          <button
            onClick={() => {
              void append({ role: "user", content: pendingSuggestInput });
              setSuggestedTemplate(null);
              setPendingSuggestInput("");
            }}
            className="rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 transition-colors"
          >
            Generate anyway
          </button>
        </div>
      </div>
      <button
        onClick={() => { setSuggestedTemplate(null); setPendingSuggestInput(""); }}
        className="text-indigo-400 hover:text-indigo-600 text-xs"
        aria-label="Dismiss suggestion"
      >
        ✕
      </button>
    </div>
  </div>
)}
```

- [ ] Find the chat panel messages area (search for `messages.map` in the file) and add the suggestion card JSX just before the chat form `<form onSubmit=...>`

### Step 2.7 — TypeScript check

- [ ] Run: `cd apps/web && pnpm exec tsc --noEmit 2>&1 | grep "error TS"`
- [ ] Expected: no output

### Step 2.8 — Write unit tests for matchTemplate

Create `apps/web/lib/template-match.test.ts`:

```typescript
import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Inline the matcher so we can test without importing the full component
const TEMPLATE_KEYWORDS: { id: string; keywords: string[] }[] = [
  { id: "oauth-sequence",      keywords: ["oauth", "auth", "login", "sign in", "identity", "sso", "saml"] },
  { id: "onboarding-funnel",   keywords: ["funnel", "onboarding", "signup", "sign up", "activation", "user flow"] },
  { id: "system-architecture", keywords: ["architecture", "system design", "stack", "infra", "infrastructure", "backend"] },
  { id: "quarterly-revenue",   keywords: ["revenue", "quarterly", "bar chart", "kpi", "financial", "q1", "q2", "q3", "q4", "sales chart"] },
  { id: "blog-erd",            keywords: ["schema", "database", "erd", "entity", "relations", "table", "data model"] },
  { id: "release-roadmap",     keywords: ["roadmap", "gantt", "timeline", "sprint", "milestone", "release plan"] },
];

function matchTemplateId(prompt: string): string | null {
  const lower = prompt.toLowerCase();
  for (const { id, keywords } of TEMPLATE_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return id;
  }
  return null;
}

describe("matchTemplateId", () => {
  it("matches oauth flow prompt", () => {
    assert.equal(matchTemplateId("make me an oauth flow"), "oauth-sequence");
  });
  it("matches auth keyword", () => {
    assert.equal(matchTemplateId("how do I draw an auth diagram"), "oauth-sequence");
  });
  it("matches roadmap with gantt keyword", () => {
    assert.equal(matchTemplateId("gantt chart for Q3"), "release-roadmap");
  });
  it("matches erd with schema keyword", () => {
    assert.equal(matchTemplateId("database schema for a blog"), "blog-erd");
  });
  it("matches revenue chart", () => {
    assert.equal(matchTemplateId("show quarterly revenue"), "quarterly-revenue");
  });
  it("returns null for unmatched prompt", () => {
    assert.equal(matchTemplateId("draw me a mind map"), null);
  });
  it("is case-insensitive", () => {
    assert.equal(matchTemplateId("OAuth Login FLOW"), "oauth-sequence");
  });
});
```

- [ ] Create `apps/web/lib/template-match.test.ts` with the above content
- [ ] Run: `cd apps/web && node --test lib/template-match.test.ts`
- [ ] Expected: `✔ matchTemplateId` — 7 passing

### Step 2.9 — Commit

- [ ] Run:
```bash
git add apps/web/components/editor-client.tsx apps/web/lib/template-match.test.ts
git commit -m "feat(editor): AI template suggestions in chat panel — keyword match before generation"
```

---

## Task 3: Public Profile Pages

### Step 3.1 — DB migration: add handle + rawToken

Create `apps/web/lib/db/migrations/0003_handle_and_share_token.sql`:

```sql
-- Add handle to users for public profile URLs
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "handle" text;
CREATE UNIQUE INDEX IF NOT EXISTS "user_handle_idx" ON "user" ("handle");

-- Add raw_token to share_link so profile pages can construct /s/<token> URLs.
-- The hash stays for lookups; this column is for display-only linking.
ALTER TABLE "share_link" ADD COLUMN IF NOT EXISTS "raw_token" text;
```

- [ ] Create the file with the above content

### Step 3.2 — Update Drizzle schema

In `apps/web/lib/db/schema.ts`:

**In the `users` table**, add after `aiProvider`:
```typescript
  handle: text("handle").unique(),
```

**In the `shareLinks` table**, add after `previewDataUrl`:
```typescript
  rawToken: text("raw_token"),
```

- [ ] Make both edits to `apps/web/lib/db/schema.ts`

### Step 3.3 — Update migration journal

Open `apps/web/lib/db/migrations/meta/_journal.json` and add entry 3:

```json
{
  "idx": 3,
  "version": "7",
  "when": 1748390400000,
  "tag": "0003_handle_and_share_token",
  "breakpoints": true
}
```

Add this to the `"entries"` array after the existing entry with `idx: 2`.

- [ ] Edit `apps/web/lib/db/migrations/meta/_journal.json`

### Step 3.4 — Store rawToken in createShareLink

In `apps/web/app/actions/share.ts`, find the `db.insert(shareLinks).values(...)` call and add `rawToken: raw`:

```typescript
  await db.insert(shareLinks).values({
    id: crypto.randomUUID(),
    projectId,
    tokenHash,
    rawToken: raw,          // ← ADD THIS
    createdAt: now,
    previewDataUrl: preview,
  });
```

- [ ] Make this edit

### Step 3.5 — Create profile actions

Create `apps/web/app/actions/profile.ts`:

```typescript
"use server";

import { auth } from "@/auth";
import { ensureUserAndWorkspace } from "@/lib/user-sync";
import { db } from "@/lib/db";
import { users, workspaces, projects, shareLinks } from "@/lib/db/schema";
import { eq, and, isNull, or, gt, desc } from "drizzle-orm";

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    || "user";
}

export async function ensureHandle(userId: string, name: string | null, email: string): Promise<string> {
  const [u] = await db.select({ handle: users.handle }).from(users).where(eq(users.id, userId)).limit(1);
  if (u?.handle) return u.handle;

  const base = slugify(name ?? email.split("@")[0]);
  let candidate = base;
  let i = 2;
  while (true) {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.handle, candidate)).limit(1);
    if (!existing) break;
    candidate = `${base}-${i++}`;
  }
  await db.update(users).set({ handle: candidate }).where(eq(users.id, userId));
  return candidate;
}

export async function resolveProfile(handle: string) {
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, handle: users.handle })
    .from(users)
    .where(eq(users.handle, handle))
    .limit(1);
  return user ?? null;
}

export async function getPublicDiagrams(userId: string) {
  const now = new Date();
  return db
    .select({
      rawToken: shareLinks.rawToken,
      previewDataUrl: shareLinks.previewDataUrl,
      createdAt: shareLinks.createdAt,
      title: projects.title,
      diagramType: projects.diagramType,
    })
    .from(shareLinks)
    .innerJoin(projects, eq(shareLinks.projectId, projects.id))
    .innerJoin(workspaces, eq(projects.workspaceId, workspaces.id))
    .where(
      and(
        eq(workspaces.ownerId, userId),
        or(isNull(shareLinks.expiresAt), gt(shareLinks.expiresAt, now))
      )
    )
    .orderBy(desc(shareLinks.createdAt));
}

export async function updateHandle(newHandle: string) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) throw new Error("Unauthorized");

  const trimmed = newHandle.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(trimmed)) {
    throw new Error("Handle must be 3–30 chars: lowercase letters, numbers, hyphens (not at start/end)");
  }

  const { user } = await ensureUserAndWorkspace(email);
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.handle, trimmed)).limit(1);
  if (existing && existing.id !== user.id) throw new Error("Handle already taken");

  await db.update(users).set({ handle: trimmed }).where(eq(users.id, user.id));
}

export async function getMyHandle(): Promise<string | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  const { user } = await ensureUserAndWorkspace(email);
  const [u] = await db.select({ handle: users.handle }).from(users).where(eq(users.id, user.id)).limit(1);
  return u?.handle ?? null;
}
```

- [ ] Create `apps/web/app/actions/profile.ts` with the above content

### Step 3.6 — Write unit tests for profile helpers

Create `apps/web/lib/profile.test.ts`:

```typescript
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { slugify } from "../app/actions/profile.ts";

describe("slugify", () => {
  it("lowercases and replaces special chars with hyphens", () => {
    assert.equal(slugify("John Doe"), "john-doe");
  });
  it("collapses multiple separators", () => {
    assert.equal(slugify("hello___world"), "hello-world");
  });
  it("strips leading and trailing hyphens", () => {
    assert.equal(slugify("-foo-"), "foo");
  });
  it("truncates at 30 chars", () => {
    assert.equal(slugify("a".repeat(40)).length, 30);
  });
  it("handles email prefix", () => {
    assert.equal(slugify("govindw007@gmail.com".split("@")[0]), "govindw007");
  });
  it("returns 'user' for empty/symbol-only input", () => {
    assert.equal(slugify("---"), "user");
  });
});
```

- [ ] Create `apps/web/lib/profile.test.ts` with the above content
- [ ] Run: `cd apps/web && node --test lib/profile.test.ts`
- [ ] Expected: 6 passing

### Step 3.7 — Create profile page

Create `apps/web/app/u/[handle]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { resolveProfile, getPublicDiagrams } from "@/app/actions/profile";
import { DiagramTypeIcon } from "@/components/diagram-icon";
import type { DiagramType } from "@flowchart/core";

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
                  <DiagramTypeIcon type={d.diagramType as DiagramType} className="h-8 w-8 text-slate-300" />
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
```

- [ ] Create `apps/web/app/u/[handle]/page.tsx` with the above content

### Step 3.8 — Create not-found page

Create `apps/web/app/u/[handle]/not-found.tsx`:

```tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <p className="text-5xl font-bold text-slate-200">404</p>
      <p className="mt-4 text-lg font-medium text-slate-700">Profile not found</p>
      <p className="mt-2 text-sm text-slate-500">That handle doesn't exist yet.</p>
      <Link href="/" className="mt-6 text-sm font-medium text-indigo-600 hover:text-indigo-800">
        ← Back to home
      </Link>
    </main>
  );
}
```

- [ ] Create `apps/web/app/u/[handle]/not-found.tsx` with the above content

### Step 3.9 — Add handle section to Settings

In `apps/web/app/app/settings/page.tsx`, add the following imports at the top:

```typescript
import { updateHandle, getMyHandle } from "@/app/actions/profile";
```

After the existing `const brandKit = await getBrandKit();` line, add:

```typescript
  const currentHandle = await getMyHandle();
```

Then add a new `<section>` block inside the `<div className="mt-8 grid gap-8">`, just before the REST API Keys section:

```tsx
        {/* Public profile handle */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-medium">Public profile</h2>
          <p className="mt-2 text-sm text-slate-600">
            Your handle appears on your public profile page and on diagrams you publish.
            {currentHandle && (
              <> Your profile is live at{" "}
                <a href={`/u/${currentHandle}`} className="text-indigo-600 hover:underline">
                  /u/{currentHandle}
                </a>.
              </>
            )}
          </p>
          <form
            action={async (formData: FormData) => {
              "use server";
              const h = (formData.get("handle") as string ?? "").trim();
              try {
                await updateHandle(h);
              } catch (e) {
                redirect(`/app/settings?handleError=${encodeURIComponent(e instanceof Error ? e.message : "Failed")}`);
                return;
              }
              redirect("/app/settings?handleSaved=1");
            }}
            className="mt-4 flex gap-2 items-center"
          >
            <span className="text-sm text-slate-500">/u/</span>
            <input
              name="handle"
              defaultValue={currentHandle ?? ""}
              placeholder="your-handle"
              pattern="[a-z0-9][a-z0-9\-]{1,28}[a-z0-9]"
              minLength={3}
              maxLength={30}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Save
            </button>
          </form>
          {(sp as Record<string, string>).handleSaved && (
            <p className="mt-2 text-sm text-emerald-700">Handle saved.</p>
          )}
          {(sp as Record<string, string>).handleError && (
            <p className="mt-2 text-sm text-red-600">{decodeURIComponent((sp as Record<string, string>).handleError)}</p>
          )}
        </section>
```

- [ ] Add the import lines to `apps/web/app/app/settings/page.tsx`
- [ ] Add `const currentHandle = await getMyHandle();` after `getBrandKit()`
- [ ] Add the handle section JSX inside the grid

### Step 3.10 — Add attribution on share pages

In `apps/web/app/s/[token]/page.tsx`, update `resolveShare` to also fetch the author's handle:

Find the `resolveShare` function and update the return for the `ok` case to also fetch the owner:

```typescript
async function resolveShare(token: string) {
  try {
    const tokenHash = sha256Hex(token);
    const [link] = await db.select().from(shareLinks).where(eq(shareLinks.tokenHash, tokenHash)).limit(1);
    if (!link) return { kind: "missing" as const };
    if (link.expiresAt && link.expiresAt < new Date()) return { kind: "expired" as const };
    const [p] = await db
      .select({ title: projects.title, diagramType: projects.diagramType, workspaceId: projects.workspaceId })
      .from(projects)
      .where(eq(projects.id, link.projectId))
      .limit(1);
    if (!p) return { kind: "missing" as const };

    // Resolve author handle for attribution
    const [ws] = await db.select({ ownerId: workspaces.ownerId }).from(workspaces).where(eq(workspaces.id, p.workspaceId)).limit(1);
    const authorHandle = ws
      ? await db.select({ handle: users.handle }).from(users).where(eq(users.id, ws.ownerId)).limit(1).then(r => r[0]?.handle ?? null)
      : null;

    return { kind: "ok" as const, title: p.title, diagramType: p.diagramType, authorHandle };
  } catch {
    return { kind: "missing" as const };
  }
}
```

Add the missing imports to `apps/web/app/s/[token]/page.tsx`:

```typescript
import { workspaces, users } from "@/lib/db/schema";
```

Then in the page JSX where the title is displayed, add the attribution beneath it:

```tsx
{result.authorHandle && (
  <p className="text-xs text-slate-500 mt-1">
    by{" "}
    <a href={`/u/${result.authorHandle}`} className="text-indigo-600 hover:underline">
      @{result.authorHandle}
    </a>
  </p>
)}
```

- [ ] Update `resolveShare` in `apps/web/app/s/[token]/page.tsx`
- [ ] Add `workspaces, users` to the schema import in that file
- [ ] Add the attribution JSX in the share viewer page

### Step 3.11 — TypeScript check

- [ ] Run: `cd apps/web && pnpm exec tsc --noEmit 2>&1 | grep "error TS"`
- [ ] Expected: no output

### Step 3.12 — Run all unit tests

- [ ] Run: `cd apps/web && pnpm test:unit`
- [ ] Expected: all tests pass (including the 2 new test files)

### Step 3.13 — Apply migration (if DB is available)

- [ ] Run: `cd apps/web && pnpm db:push`
- [ ] If no DB configured locally, skip — migration runs on next deployment

### Step 3.14 — Commit

- [ ] Run:
```bash
git add \
  apps/web/lib/db/schema.ts \
  apps/web/lib/db/migrations/0003_handle_and_share_token.sql \
  apps/web/lib/db/migrations/meta/_journal.json \
  apps/web/app/actions/profile.ts \
  apps/web/app/actions/share.ts \
  apps/web/app/u/[handle]/page.tsx \
  "apps/web/app/u/[handle]/not-found.tsx" \
  apps/web/app/app/settings/page.tsx \
  apps/web/app/s/[token]/page.tsx \
  apps/web/lib/profile.test.ts
git commit -m "feat: public profile pages at /u/[handle] + handle settings + share attribution"
```

### Step 3.15 — Push

- [ ] Run: `git push origin master`
