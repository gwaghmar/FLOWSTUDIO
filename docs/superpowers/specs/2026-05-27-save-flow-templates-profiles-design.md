# Design: Save Flow Fixes + AI Template Suggestions + Public Profiles

**Date:** 2026-05-27  
**Status:** Approved  
**Scope:** Three independent tasks shipped in sequence

---

## Task 1 — Fix Save Flow Bugs

### Problem
Three bugs in `apps/web/components/editor-client.tsx`:

1. **AI generation never auto-saves.** `onFinish` updates source and shows a toast but never persists to DB. Work is lost on tab close.
2. **Save errors are silent.** `handleSave` has `try/finally` but no `catch`. DB failures produce no user feedback.
3. **Concurrent save race.** Keyboard shortcut (Cmd+S) can trigger `handleSave` while a save is already in flight.

### Fix (all in `editor-client.tsx`)

1. End of `onFinish`: call `void handleSave()` after `setPendingRevisionLabel(aiLabel)`. The revision label is already staged at that point so the auto-save is tagged `"AI patched: …"`.
2. Wrap `handleSave` body in `try/catch/finally`: `catch` calls `showToast("Save failed — check your connection")`.
3. Add `if (saving) return;` as the first line of `handleSave`.

No schema changes. No new files.

---

## Task 2 — AI-Suggested Templates

### Goal
When a user's prompt clearly matches one of the 6 curated templates, show a non-blocking suggestion card in the chat panel so they can fork the template instead of waiting for AI generation.

### How It Works

**Client-side keyword matching** — runs synchronously on prompt submit, before the AI call goes out. No server round-trip.

**Keyword map:**

| Match keywords | Template ID |
|---|---|
| oauth, auth, login, sign in, identity | `oauth-sequence` |
| funnel, onboarding, signup, activation | `onboarding-funnel` |
| architecture, system design, stack, infra | `system-architecture` |
| revenue, quarterly, bar chart, kpi, financial | `quarterly-revenue` |
| schema, database, erd, entity, relations, table | `blog-erd` |
| roadmap, gantt, timeline, sprint, milestone | `release-roadmap` |

Match is case-insensitive. First match wins. No match → no card shown.

**Suggestion card** appears in the chat thread between the user message and the AI response. Two actions:
- **Use template** — loads the template source directly into the editor (client-side, no navigation), clears the chat, dismisses the card. Calls `forkTemplate(id)` server action to save it as a new project.
- **Generate anyway** — dismisses the card, AI generation proceeds normally.

**State:** `suggestedTemplate: Template | null` added to `editor-client.tsx`. Set on prompt submit when matched. Cleared on: dismiss, "Use template" click, or after `onFinish` fires.

### Files Changed
- `apps/web/components/editor-client.tsx` — add state, keyword matcher, suggestion card UI
- No server changes needed

---

## Task 3 — Public Profile Pages `/u/[handle]`

### Goal
Every user gets a public page at `/u/[handle]` showing their publicly shared diagrams. Handles are auto-generated from name/email and can be customized in settings.

### DB Migration

**File:** `apps/web/lib/db/migrations/0003_user_handle.sql`

```sql
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "handle" text;
CREATE UNIQUE INDEX IF NOT EXISTS "user_handle_idx" ON "user" ("handle");
```

**Schema change:** Add `handle: text("handle").unique()` (nullable) to `users` table in `schema.ts`.

### Handle Generation

Auto-generated lazily (on first profile page load or settings open):
1. Slugify `user.name` or `email.split('@')[0]` — lowercase, alphanumeric + hyphens, max 30 chars
2. Check uniqueness; if taken append `-2`, `-3`, etc.
3. Persist with `UPDATE "user" SET handle = ? WHERE id = ?`

Users can override in `/app/settings`.

### Data Query

No new columns on `share_link`. Uses the existing join chain:

```
share_link → project → workspace → user (via owner_id)
```

Returns all non-expired share links belonging to the handle owner, ordered by `created_at DESC`.

### New Files

| File | Purpose |
|---|---|
| `apps/web/app/u/[handle]/page.tsx` | Public profile page (server component, no auth) |
| `apps/web/app/u/[handle]/not-found.tsx` | Clean 404 for unknown handles |
| `apps/web/app/actions/profile.ts` | `resolveProfile(handle)`, `getPublicDiagrams(userId)`, `ensureHandle(userId, name, email)` |

### Settings Page

Add a handle field to `apps/web/app/app/settings/page.tsx`:
- Shows current handle (or auto-generates one if unset)
- Text input with `/u/` prefix shown as label
- Save button calls a new `updateHandle(handle)` server action

### Profile Page Layout

```
/u/govind

[G]  Govind               ← avatar initial, display name
     @govind · 12 diagrams published

┌──────────┐ ┌──────────┐ ┌──────────┐
│ [preview] │ │ [preview] │ │ [preview] │
│ OAuth 2.0 │ │ Q3 Roadmap│ │ Revenue  │
│ mermaid   │ │ mermaid   │ │ echarts  │
│ [View →]  │ │ [View →]  │ │ [View →]  │
└──────────┘ └──────────┘ └──────────┘

(empty state: "No published diagrams yet.")
```

Cards link to existing `/s/[token]` share pages. The profile page is read-only and requires no authentication to view.

### Attribution on Share Pages

`/s/[token]/page.tsx`: after resolving the link, fetch the owner's handle and show `"by @govind"` beneath the diagram title, linking to `/u/govind`.

---

## Build Sequence

1. **Task 1** — save flow fixes (`editor-client.tsx` only, ~20 lines)
2. **Task 2** — AI template suggestions (`editor-client.tsx` additions, no backend)
3. **Task 3** — public profiles (migration + 3 new files + settings update + share page attribution)

Each task is independently deployable. Task 3 requires `pnpm db:push` after migration is added.
