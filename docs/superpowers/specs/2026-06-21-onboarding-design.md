# Onboarding & Landing Page Design

**Date:** 2026-06-21
**Scope:** Conversion (landing page) + Activation (first-run experience)

---

## Problem

Two gaps in the new-user funnel:

1. **Conversion** — visitors land on `/` but don't sign up. The page has a hero and feature list but no live proof of the product.
2. **Activation** — users who sign up get dropped into a blank editor with no guidance and no first diagram.

---

## Goals

- Landing page visitors can try the product before signing up
- New users create their first diagram within 30 seconds of signing up
- No new infrastructure required (no DB changes, no new services)

---

## What We're Building

### 1. Landing Page — Hero Copy

Replace the current headline with outcome-first messaging:

- **Headline:** "Go from idea to diagram in seconds."
- **Subhead:** "Describe what you need. FlowStudio picks the right diagram type and generates it instantly — flowcharts, timelines, org charts, and 19 more."
- **Primary CTA:** "Try it free →" (scrolls to demo section)
- **Secondary CTA:** "Sign in" (for returning users)

### 2. Landing Page — Live Demo Section

A new section directly below the hero containing:

- A prompt textarea with 3 rotating placeholder examples cycling every 4 seconds:
  - "Map the OAuth login flow"
  - "90-day startup launch plan"
  - "Compare React vs Vue"
- A "Generate" button
- A diagram output panel that shows a static hardcoded mermaid flowchart on load (no API call), then replaces it with the live AI result on generation

After 3 uses (rate limit hit), the Generate button is replaced with "Sign up to keep going →" linking to `/login?callbackUrl=/app/editor`.

The diagram types grid moves below the demo section (demoted, not removed).

### 3. Demo API Endpoint

**Route:** `POST /api/ai/demo`

**Request:** `{ prompt: string }`

**Behavior:**
- Single-pass AI generation using existing `DIAGRAM_SYSTEM_PROMPTS` logic
- No brand kit injection, no two-pass intent step
- Output validated/repaired via `validateAndRepairOutput` from `lib/diagrams/validate-output.ts`
- No auth required

**Response:** `{ diagramType: string, source: string }` on success, `{ error: "limit" }` on 429

**Rate limiting:** Cookie-based soft limit (`demo_uses` cookie, HMAC-signed).
- Reads cookie on request, rejects after 3 uses with 429
- Sets updated cookie on each response
- Soft limit — a user clearing cookies resets the count. Intentional: friction-low for real visitors.

### 4. First-Run Onboarding

After **new** signup (not returning login), the auth callback at `/api/auth/callback` redirects to:

```
/app/editor?prompt=Map+the+user+signup+flow+for+a+SaaS+app&welcome=1
```

Returning users who sign in continue to redirect to `/app/editor` with no extra params. "New user" is determined by whether `ensureUserAndWorkspace` created a new DB row on this request — it already does this, so we add a `created: boolean` return value and check it in the callback.

**Editor changes:**
- On mount, read `?prompt=` from URL params, pre-fill the textarea, and auto-submit
- Immediately after auto-submitting, remove `?prompt=` and `?welcome=1` from the URL via `router.replace` so a page refresh doesn't re-trigger generation
- If `?welcome=1` was present, show a one-line toast (auto-dismiss after 4 seconds): "Welcome! Here's a sample diagram to get you started."

---

## What We're Not Building

- Hard rate limiting (IP-based, Redis/KV) — cookie soft limit is sufficient for a demo
- Onboarding wizard or modal — the pre-filled editor IS the onboarding
- Separate gallery section for diagram examples — the live demo output carries that story
- Usage tracking / analytics events (can be added later)

---

## Files Affected

| File | Change |
|------|--------|
| `apps/web/app/page.tsx` | Hero copy, demo section, demote type grid |
| `apps/web/app/api/ai/demo/route.ts` | New route — unauthenticated AI generation |
| `apps/web/app/api/auth/callback/route.ts` | Change post-signup redirect to include `?prompt=&welcome=1` |
| `apps/web/components/editor-client.tsx` | Read `?prompt=` on mount, auto-submit, welcome toast |

---

## Success Criteria

- A visitor on `/` can type a prompt and see a real diagram without signing up
- After 3 demo generations, they see a signup CTA
- A new user who signs up lands in the editor with a diagram already generating
- No regression on existing auth flows (existing users unaffected)
