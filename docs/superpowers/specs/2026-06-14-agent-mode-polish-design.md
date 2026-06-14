# Agent Mode Polish — Design

**Date:** 2026-06-14
**Milestone:** Agent Mode Polish (post-1.5)
**Status:** Approved design, pending plan

## Problem

FlowStudio has a working but under-polished "Agent Mode" — an opt-in toggle in the
prompt bar that routes to `/api/ai/agent`, a `streamText` loop (capped at 5 steps)
with four tools: `update_diagram`, `apply_patch`, `update_node` (ReactFlow only),
and `fetch_external_data`. It works, but has real gaps:

1. **Capability gap** — the agent can change the diagram *source* but cannot do
   things the UI can: set the title, change theme/palette, apply the brand kit, or
   switch the use-case. A request like "make it match my brand and call it 'Q3
   Roadmap'" can't be fulfilled.
2. **Transparency** — every tool except `update_diagram` renders a generic "Using
   tool…" card. The model writes an `explanation`/`summary` for each call that is
   never shown to the user.
3. **`apply_patch` bugs** — (a) it uses `String.prototype.replace` with a string
   argument, replacing only the **first** occurrence; (b) when `find` is absent
   from the source, the tool returns `success: true` and the chat shows a ✓ — a
   silent no-op the user believes worked.
4. **No analytics / brand parity** — agent runs are not logged to `aiEvents` (the
   generate route logs detailed analytics), and the agent route does not inject the
   workspace brand palette into its system prompt (the generate route does).
5. **Stale code** — a `{/* Visual edits — placeholder, not yet implemented */}`
   comment sits above the toggle.

## Goals

- Add five editor-control tools so the agent can drive the whole editor.
- Fix the two `apply_patch` correctness bugs.
- Make agent activity legible (show explanations + per-tool results).
- Make the toggle discoverable (explainer; remove stale placeholder).
- Bring the agent route to analytics + brand parity with the generate route.

## Non-goals

- No change to the default flow — Agent Mode stays an **opt-in toggle** (off by
  default).
- No Pro-gating, no credit accounting.
- No new `fetch_external_data` capabilities.
- No real-time collaboration.

## Positioning decision

Agent Mode remains opt-in. This milestone makes the existing toggle clearer and
more capable; it does not make the agent the default AI flow.

## Architecture — Approach A (client-applies, unified dispatch)

The new tools follow the pattern the existing tools already use: the route's
`execute` echoes a structured `{ success, ...args, explanation }`, and the **editor
applies the effect to React state**. Title/theme/palette/use-case are pure client
state, so the client is the correct place to apply them. The not-found detection
for `apply_patch` must also happen client-side, because the route only sees the
*initial* source while the client holds the live, evolving source.

### Section 1 — New agent tools (route side)

Added to `apps/web/app/api/ai/agent/route.ts`. Each input is constrained by a Zod
enum so the model cannot pass an invalid value. `execute` echoes args + explanation.

| Tool | Input schema | Applied by client |
|---|---|---|
| `set_title` | `{ title: string, explanation: string }` | `setTitle(title)` |
| `set_theme` | `{ themeId: enum(<11 theme ids>), explanation }` | `setThemeId(themeId)` |
| `set_palette` | `{ paletteId: enum("indigo","sunset","ocean","forest","default"), explanation }` | `setPaletteId(paletteId)` |
| `apply_brand_kit` | `{ explanation }` | `handleApplyBrandKit()`, or report "no brand kit set" |
| `set_use_case` | `{ useCaseId: enum("presentation","social","documentation","custom"), explanation }` | `handleUseCaseChange(useCaseId)` (also sets preset) |

Theme IDs come from `packages/core/src/themes.ts`: `stage_pipeline`, `minimal_light`,
`ocean`, `forest_calm`, `midnight`, `monochrome`, `sunset`, `lavender`, `slate_pro`,
`paper`, `neon_tech`. To avoid drift, the route imports the theme id list from core
rather than hard-coding a copy.

**Request body additions:** the editor now sends `title`, `themeId`, `useCaseId`,
and `hasBrandKit: boolean` alongside the existing `messages`, `currentSource`,
`diagramType`. The system prompt states the current title/theme/use-case and whether
a brand kit exists, so the agent makes informed tool calls (e.g. it won't call
`apply_brand_kit` when none exists).

### Section 2 — Client tool-effect dispatch + apply_patch fix

Refactor the existing tool-handling `useEffect` (currently `editor-client.tsx`
~443–508) into a clean per-tool dispatch.

**New pure helper** `apps/web/lib/agent-tools.ts`:

```ts
export function applyPatch(
  source: string,
  find: string,
  replace: string,
): { source: string; replaced: number } {
  if (!find || !source.includes(find)) return { source, replaced: 0 };
  const parts = source.split(find);
  return { source: parts.join(replace), replaced: parts.length - 1 };
}
```

`split/join` gives replace-all without regex-escaping the find string. `replaced === 0`
means not-found.

**New `toolEffects` state** keyed by `toolCallId`:

```ts
type ToolEffect = { status: "applied" | "noop" | "error"; label: string; detail?: string };
const [toolEffects, setToolEffects] = useState<Record<string, ToolEffect>>({});
```

Dispatch table (on `state === "output-available"` && `output.success`):

| Tool | Action | Effect recorded |
|---|---|---|
| `update_diagram` | `setSource(sourceCode)` | applied · "Diagram updated" |
| `apply_patch` | `applyPatch(...)`; if `replaced>0` setSource | applied "Replaced N" / **noop "Couldn't find that text"** |
| `update_node` | existing ReactFlow node merge | applied / error |
| `set_title` | `setTitle` | applied · "Renamed to '…'" |
| `set_theme` | `setThemeId` | applied · "Theme → <name>" |
| `set_palette` | `setPaletteId` | applied · "Palette → <name>" |
| `apply_brand_kit` | `await handleApplyBrandKit()`; if no kit → error | applied "Applied brand kit" / error "No brand kit set" |
| `set_use_case` | `handleUseCaseChange` | applied · "Use case → <label>" |

**Undo** stays source-only (matching today and manual theme/title edits — those do
not push the source undo stack). Only `update_diagram`/`apply_patch`/`update_node`
snapshot to the undo stack, exactly as now.

### Section 3 — Transparency UI (chat cards)

The tool card (`editor-client.tsx` ~1478–1497) renders:
- a per-tool in-progress verb via a `toolName → label` map ("Patching…",
  "Fetching data…", "Setting theme…", "Renaming…", "Applying brand kit…");
- the model's `explanation` text (from the tool output) under the tool name;
- the resolved result from `toolEffects[toolCallId]` — including the new visible
  failure state for a not-found `apply_patch`.

Remove the stale `{/* Visual edits — placeholder… */}` comment.

### Section 4 — Discoverability

The "Agent Mode" toggle gets a `title` tooltip, and when active a one-line caption
renders beneath the prompt controls: *"Agent takes multiple steps — edit, theme,
fetch data — to build your diagram."* No default change.

### Section 5 — Analytics + brand parity

- **Shared helper** `apps/web/lib/brand-directive.ts` — extract the BRAND PALETTE
  directive builder currently inline in `generate/route.ts` (~365–391) into
  `buildBrandDirective(workspaceId): Promise<string>`. Both routes import it. The
  agent route appends its result to the agent system prompt.
- **Logging** — the agent route logs to `aiEvents` from `streamText`'s `onFinish`
  callback: `provider`, `model`, `promptLength`, `sourceLength`, token usage,
  total latency, `mode: "agent"`, and `toolCalls` (count of tool invocations in the
  run). Inapplicable generate-only fields (`intentLatencyMs`, `typeSwitched`,
  `effectiveDiagramType`, etc.) are set to null/0/false.
- **Schema change (only one in this milestone):** add `toolCalls: integer` to the
  `aiEvents` table (`apps/web/lib/db/schema.ts`) + a migration. It is the meaningful
  agent metric and is nullable so existing generate-route inserts are unaffected.

### Section 6 — Testing

- `apps/web/lib/agent-tools.test.ts` (added to the `test:unit` script):
  - `applyPatch`: replace-all across multiple occurrences, single occurrence,
    not-found returns `replaced: 0` with source unchanged, empty `find` is a no-op.
  - brand-directive builder: given a palette, the directive text contains the
    primary/secondary/accent (and background when present); given no kit, returns "".
- Tool wiring is verified at the end in-browser: enable Agent Mode, issue prompts
  that exercise each tool, and confirm the cards show explanations and results
  (including a deliberately-missing `apply_patch` showing the not-found state).

## Files touched

**New:**
- `apps/web/lib/agent-tools.ts` (+ `.test.ts`)
- `apps/web/lib/brand-directive.ts`
- one migration under `apps/web/lib/db/migrations/`

**Modified:**
- `apps/web/app/api/ai/agent/route.ts` — 5 new tools, request-body context, brand
  directive, `onFinish` analytics logging.
- `apps/web/app/api/ai/generate/route.ts` — use the shared `buildBrandDirective`.
- `apps/web/components/editor-client.tsx` — dispatch refactor, `toolEffects`,
  send new body fields, tool-card UI, toggle explainer, remove stale comment.
- `apps/web/lib/db/schema.ts` — `toolCalls` column.
- `package.json` — add the new test file to `test:unit`.

## Risks

- `streamText.onFinish` token-usage shape varies by provider; logging must tolerate
  missing usage (write nulls, never throw — analytics must not break the stream).
- Applying theme/title/palette mid-stream must not race the source updates; effects
  are keyed by `toolCallId` and applied idempotently (re-running the effect for an
  already-applied tool call is a no-op).
