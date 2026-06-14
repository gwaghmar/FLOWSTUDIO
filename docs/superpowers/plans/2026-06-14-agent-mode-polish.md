# Agent Mode Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make FlowStudio's opt-in Agent Mode more capable, transparent, correct, and measurable — without changing the default AI flow.

**Architecture:** Approach A (client-applies). New agent tools echo structured `{ success, ...args, explanation }` from the route; the editor applies effects to React state and records per-tool outcomes in a `toolEffects` map keyed by `toolCallId`. Pure logic (patch application, brand-directive formatting) is extracted to testable helpers. The agent route reaches analytics + brand parity with the generate route via shared helpers.

**Tech Stack:** Next.js 15, TypeScript, Vercel AI SDK (`streamText`/`tool`), Zod, Drizzle ORM (Postgres), `node:test` (`--experimental-strip-types`).

**Conventions (from CLAUDE.md):** Work on `master`. Use the Bash tool. No emojis. After code changes run `pnpm --filter @flowchart/web exec tsc --noEmit 2>&1 | grep -v "\.test\.ts" | grep "error TS"` (no output = clean). After UI changes run `pnpm --filter @flowchart/web build`. After core changes run `pnpm --filter @flowchart/core build`. `pnpm test:unit` must stay green.

---

## File Structure

**New files:**
- `apps/web/lib/agent-tools.ts` — pure `applyPatch(source, find, replace)` helper.
- `apps/web/lib/agent-tools.test.ts` — unit tests for `applyPatch`.
- `apps/web/lib/brand-directive.ts` — `formatBrandDirective` (pure) + `buildBrandDirective(workspaceId)` (db fetch).
- `apps/web/lib/brand-directive.test.ts` — unit tests for `formatBrandDirective`.
- `apps/web/lib/ai-events.ts` — shared `recordAiEvent` (extracted from generate route).
- `apps/web/lib/db/migrations/0004_agent_analytics.sql` — `tool_calls` column + relaxed `mode` check.

**Modified files:**
- `packages/core/src/themes.ts` — export `THEME_IDS` tuple.
- `apps/web/lib/db/schema.ts` — `toolCalls` column + `mode` check includes `'agent'`.
- `apps/web/lib/db/migrations/meta/_journal.json` — journal entry for 0004.
- `apps/web/app/api/ai/agent/route.ts` — 5 new tools, request context, brand directive, `onFinish` analytics.
- `apps/web/app/api/ai/generate/route.ts` — use `buildBrandDirective` + shared `recordAiEvent`.
- `apps/web/components/editor-client.tsx` — dispatch refactor, `toolEffects`, new-tool application, `themeId` in body, transparency UI, discoverability, remove stale comment, `handleApplyBrandKit` returns boolean.
- `package.json` — add new test files to `test:unit`.

---

## Task 1: `applyPatch` pure helper

**Files:**
- Create: `apps/web/lib/agent-tools.ts`
- Test: `apps/web/lib/agent-tools.test.ts`
- Modify: `package.json` (test:unit script)

- [ ] **Step 1: Write the failing test**

Create `apps/web/lib/agent-tools.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyPatch } from "./agent-tools.ts";

describe("applyPatch", () => {
  it("replaces a single occurrence and reports count", () => {
    const r = applyPatch("color: red", "red", "blue");
    assert.equal(r.source, "color: blue");
    assert.equal(r.replaced, 1);
  });

  it("replaces ALL occurrences (not just the first)", () => {
    const r = applyPatch("a x a x a", "a", "Z");
    assert.equal(r.source, "Z x Z x Z");
    assert.equal(r.replaced, 3);
  });

  it("returns replaced:0 and unchanged source when find is absent", () => {
    const r = applyPatch("hello world", "missing", "x");
    assert.equal(r.source, "hello world");
    assert.equal(r.replaced, 0);
  });

  it("treats empty find as a no-op", () => {
    const r = applyPatch("hello", "", "x");
    assert.equal(r.source, "hello");
    assert.equal(r.replaced, 0);
  });

  it("does not interpret regex metacharacters in find", () => {
    const r = applyPatch("price is $5 (USD)", "$5 (USD)", "$9 (EUR)");
    assert.equal(r.source, "price is $9 (EUR)");
    assert.equal(r.replaced, 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:/Users/govin/AI_PROJECTS/FLOWSTUDIO && node --test --experimental-strip-types apps/web/lib/agent-tools.test.ts`
Expected: FAIL — cannot find module `./agent-tools.ts`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/lib/agent-tools.ts`:

```ts
/** Replace every occurrence of `find` in `source`. split/join avoids regex escaping. replaced:0 means not found. */
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

- [ ] **Step 4: Run test to verify it passes**

Run: `cd C:/Users/govin/AI_PROJECTS/FLOWSTUDIO && node --test --experimental-strip-types apps/web/lib/agent-tools.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Add the test to the unit suite**

In `package.json`, append ` apps/web/lib/agent-tools.test.ts` to the end of the `test:unit` command string (before the closing quote).

- [ ] **Step 6: Run the full suite**

Run: `cd C:/Users/govin/AI_PROJECTS/FLOWSTUDIO && pnpm test:unit 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: `tests 66`, `pass 66`, `fail 0` (61 existing + 5 new).

- [ ] **Step 7: Commit**

```bash
cd C:/Users/govin/AI_PROJECTS/FLOWSTUDIO && git add apps/web/lib/agent-tools.ts apps/web/lib/agent-tools.test.ts package.json && git commit -m "feat(agent): add applyPatch helper (replace-all + not-found detection)"
```

---

## Task 2: `buildBrandDirective` shared helper + refactor generate route

**Files:**
- Create: `apps/web/lib/brand-directive.ts`
- Test: `apps/web/lib/brand-directive.test.ts`
- Modify: `apps/web/app/api/ai/generate/route.ts:365-391`, `package.json`

- [ ] **Step 1: Write the failing test**

Create `apps/web/lib/brand-directive.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatBrandDirective } from "./brand-directive.ts";

describe("formatBrandDirective", () => {
  it("includes primary/secondary/accent when all present", () => {
    const out = formatBrandDirective("Acme", { primary: "#111", secondary: "#222", accent: "#333" });
    assert.match(out, /BRAND PALETTE/);
    assert.match(out, /Acme/);
    assert.match(out, /#111/);
    assert.match(out, /#222/);
    assert.match(out, /#333/);
  });

  it("includes background only when provided", () => {
    const withBg = formatBrandDirective("Acme", { primary: "#111", secondary: "#222", accent: "#333", background: "#fff" });
    assert.match(withBg, /#fff/);
    const noBg = formatBrandDirective("Acme", { primary: "#111", secondary: "#222", accent: "#333" });
    assert.doesNotMatch(noBg, /background:/);
  });

  it("returns empty string when required colors are missing", () => {
    assert.equal(formatBrandDirective("Acme", { primary: "#111" }), "");
    assert.equal(formatBrandDirective("Acme", {}), "");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:/Users/govin/AI_PROJECTS/FLOWSTUDIO && node --test --experimental-strip-types apps/web/lib/brand-directive.test.ts`
Expected: FAIL — cannot find module `./brand-directive.ts`.

- [ ] **Step 3: Write the implementation**

Create `apps/web/lib/brand-directive.ts`:

```ts
import { db } from "@/lib/db";
import { brandKits } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export type BrandPalette = { primary?: string; secondary?: string; accent?: string; background?: string };

/** Pure: build the BRAND PALETTE system-prompt directive, or "" if the palette is incomplete. */
export function formatBrandDirective(name: string, p: BrandPalette): string {
  if (!p.primary || !p.secondary || !p.accent) return "";
  return `BRAND PALETTE — the user's workspace defines a brand kit "${name}". When the diagram type involves color choices (echarts color arrays, mermaid theme overrides, reactflow node fills), use these colors:
- primary:   ${p.primary}
- secondary: ${p.secondary}
- accent:    ${p.accent}${p.background ? `\n- background: ${p.background}` : ""}
Use the brand colors for the most prominent visual elements (main series, primary nodes). Do not introduce unrelated colors. If a diagram type is text-only (e.g. plain mermaid flowchart with default theme), ignore this directive.
`;
}

/** Fetch the workspace's latest brand kit and format its directive. Best-effort: returns "" on any error. */
export async function buildBrandDirective(workspaceId: string): Promise<string> {
  try {
    const [row] = await db
      .select({ name: brandKits.name, paletteJson: brandKits.paletteJson })
      .from(brandKits)
      .where(eq(brandKits.workspaceId, workspaceId))
      .orderBy(desc(brandKits.createdAt))
      .limit(1);
    if (!row?.paletteJson) return "";
    return formatBrandDirective(row.name, JSON.parse(row.paletteJson) as BrandPalette);
  } catch {
    return "";
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd C:/Users/govin/AI_PROJECTS/FLOWSTUDIO && node --test --experimental-strip-types apps/web/lib/brand-directive.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Refactor the generate route to use the helper**

In `apps/web/app/api/ai/generate/route.ts`, replace the inline brand-kit block (lines ~365–391, the `let brandDirective = "";` through its closing `}`) with:

```ts
  const brandDirective = await buildBrandDirective(workspace.id);
```

Add the import near the other `@/lib` imports at the top of the file:

```ts
import { buildBrandDirective } from "@/lib/brand-directive";
```

If `brandKits`, `eq`, or `desc` become unused in `generate/route.ts` after this change, remove them from their import statements (tsc will flag them as errors only if `noUnusedLocals` is on; check the tsc output in Step 7 and remove if reported).

- [ ] **Step 6: Add the test to the unit suite**

In `package.json`, append ` apps/web/lib/brand-directive.test.ts` to the `test:unit` command string.

- [ ] **Step 7: Verify types and tests**

Run: `cd C:/Users/govin/AI_PROJECTS/FLOWSTUDIO && pnpm --filter @flowchart/web exec tsc --noEmit 2>&1 | grep -v "\.test\.ts" | grep "error TS" || echo CLEAN`
Expected: `CLEAN`.
Run: `cd C:/Users/govin/AI_PROJECTS/FLOWSTUDIO && pnpm test:unit 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: `tests 69`, `pass 69`, `fail 0`.

- [ ] **Step 8: Commit**

```bash
cd C:/Users/govin/AI_PROJECTS/FLOWSTUDIO && git add apps/web/lib/brand-directive.ts apps/web/lib/brand-directive.test.ts apps/web/app/api/ai/generate/route.ts package.json && git commit -m "refactor(ai): extract shared buildBrandDirective helper"
```

---

## Task 3: Shared `recordAiEvent` helper

**Files:**
- Create: `apps/web/lib/ai-events.ts`
- Modify: `apps/web/app/api/ai/generate/route.ts:346-352` (remove local def, import shared)

- [ ] **Step 1: Create the shared helper**

Create `apps/web/lib/ai-events.ts`:

```ts
import { db } from "@/lib/db";
import { aiEvents } from "@/lib/db/schema";

/** Best-effort analytics insert — never throws (analytics must not break a response). */
export async function recordAiEvent(row: typeof aiEvents.$inferInsert): Promise<void> {
  try {
    await db.insert(aiEvents).values(row);
  } catch (e) {
    console.warn("[ai-event] insert failed:", e instanceof Error ? e.message : e);
  }
}
```

- [ ] **Step 2: Use it in the generate route**

In `apps/web/app/api/ai/generate/route.ts`:
- Delete the local `recordAiEvent` function (lines ~346–352).
- Add the import near the other `@/lib` imports:

```ts
import { recordAiEvent } from "@/lib/ai-events";
```

- If `aiEvents` is now unused in `generate/route.ts`, remove it from its import (check tsc output).

- [ ] **Step 3: Verify types**

Run: `cd C:/Users/govin/AI_PROJECTS/FLOWSTUDIO && pnpm --filter @flowchart/web exec tsc --noEmit 2>&1 | grep -v "\.test\.ts" | grep "error TS" || echo CLEAN`
Expected: `CLEAN`.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/govin/AI_PROJECTS/FLOWSTUDIO && git add apps/web/lib/ai-events.ts apps/web/app/api/ai/generate/route.ts && git commit -m "refactor(ai): extract shared recordAiEvent helper"
```

---

## Task 4: Schema + migration (`tool_calls` column, relaxed `mode` check)

**Files:**
- Modify: `apps/web/lib/db/schema.ts:134-164`
- Create: `apps/web/lib/db/migrations/0004_agent_analytics.sql`
- Modify: `apps/web/lib/db/migrations/meta/_journal.json`

- [ ] **Step 1: Update the schema**

In `apps/web/lib/db/schema.ts`, in the `aiEvents` table add a `toolCalls` column after `outputTokens` (line ~154):

```ts
  toolCalls: integer("tool_calls"),
```

And change the mode check constraint (line ~162) from:

```ts
  check("ai_event_mode_chk", sql`mode IN ('patch', 'create')`),
```

to:

```ts
  check("ai_event_mode_chk", sql`mode IN ('patch', 'create', 'agent')`),
```

- [ ] **Step 2: Write the migration SQL**

Create `apps/web/lib/db/migrations/0004_agent_analytics.sql`:

```sql
-- Agent Mode analytics: tool-call count + allow mode='agent'.
ALTER TABLE "ai_event" ADD COLUMN IF NOT EXISTS "tool_calls" integer;

ALTER TABLE "ai_event" DROP CONSTRAINT IF EXISTS "ai_event_mode_chk";
ALTER TABLE "ai_event" ADD CONSTRAINT "ai_event_mode_chk" CHECK (mode IN ('patch', 'create', 'agent'));
```

- [ ] **Step 3: Add the journal entry**

In `apps/web/lib/db/migrations/meta/_journal.json`, add this object to the end of the `entries` array (after the `0003_handle_and_share_token` entry, with a leading comma):

```json
    {
      "idx": 4,
      "version": "7",
      "when": 1780000000000,
      "tag": "0004_agent_analytics",
      "breakpoints": true
    }
```

- [ ] **Step 4: Verify types**

Run: `cd C:/Users/govin/AI_PROJECTS/FLOWSTUDIO && pnpm --filter @flowchart/web exec tsc --noEmit 2>&1 | grep -v "\.test\.ts" | grep "error TS" || echo CLEAN`
Expected: `CLEAN`.

- [ ] **Step 5: Commit**

```bash
cd C:/Users/govin/AI_PROJECTS/FLOWSTUDIO && git add apps/web/lib/db/schema.ts apps/web/lib/db/migrations/0004_agent_analytics.sql apps/web/lib/db/migrations/meta/_journal.json && git commit -m "feat(db): aiEvents.tool_calls column + allow mode=agent"
```

---

## Task 5: Core — export `THEME_IDS`

**Files:**
- Modify: `packages/core/src/themes.ts`

- [ ] **Step 1: Add the export**

At the end of `packages/core/src/themes.ts` (after the `THEMES` array is defined), add:

```ts
/** Theme ids as a non-empty tuple, for z.enum() in the agent route. */
export const THEME_IDS = THEMES.map((t) => t.id) as [string, ...string[]];
```

- [ ] **Step 2: Rebuild core so the web app sees the new export**

Run: `cd C:/Users/govin/AI_PROJECTS/FLOWSTUDIO && pnpm --filter @flowchart/core build`
Expected: `Build success`.

- [ ] **Step 3: Verify the export resolves from the web app**

Run: `cd C:/Users/govin/AI_PROJECTS/FLOWSTUDIO && node -e "import('@flowchart/core').then(m => console.log('THEME_IDS:', m.THEME_IDS.length))"`
Expected: `THEME_IDS: 11`.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/govin/AI_PROJECTS/FLOWSTUDIO && git add packages/core/src/themes.ts && git commit -m "feat(core): export THEME_IDS tuple"
```

---

## Task 6: Agent route — new tools + request context + brand directive

**Files:**
- Modify: `apps/web/app/api/ai/agent/route.ts`

- [ ] **Step 1: Add imports**

At the top of `apps/web/app/api/ai/agent/route.ts`, add:

```ts
import { THEME_IDS } from "@flowchart/core";
import { buildBrandDirective } from "@/lib/brand-directive";
```

Change `ensureUserAndWorkspace` usage to capture the workspace: the existing line is `const { user } = await ensureUserAndWorkspace(email);` — change it to:

```ts
  const { user, workspace } = await ensureUserAndWorkspace(email);
```

- [ ] **Step 2: Read the new request-body fields**

Change the body destructure (currently `const { messages, currentSource, diagramType } = reqBody;`) to:

```ts
  const { messages, currentSource, diagramType, title, themeId, useCaseId } = reqBody;
```

- [ ] **Step 3: Build the brand directive and current-state context**

Immediately before the `const result = streamText({` call, add:

```ts
  const brandDirective = await buildBrandDirective(workspace.id);
  const hasBrandKit = brandDirective.length > 0;
  const stateContext = `CURRENT STATE:
- title: ${title || "(untitled)"}
- theme: ${themeId || "(default)"}
- use-case: ${useCaseId || "(none)"}
- brand kit configured: ${hasBrandKit ? "yes" : "no"}`;
```

- [ ] **Step 4: Expand the system prompt**

Replace the existing `system: \`...\`` value with this (keeps the existing tool strategy, adds the new tools, state, and brand directive):

```ts
      system: `You are an autonomous Lovable-style AI agent building diagrams for the user.
You can use tools to inspect and update the diagram, its title, theme, palette, and use-case.
The current diagram type is: ${diagramType}.

${stateContext}

${brandDirective}

Current source code:
\`\`\`
${currentSource || "No source provided"}
\`\`\`

TOOLS:
- update_diagram: full rewrite of diagram source
- apply_patch: surgical find-and-replace on existing source
- update_node: React Flow only — update a node's label/style by ID
- fetch_external_data: fetch JSON from a URL or generate contextual sample data by keyword
- set_title: rename the diagram
- set_theme: change the visual theme (only the listed theme ids)
- set_palette: change the color palette
- apply_brand_kit: apply the user's saved brand colors (only if a brand kit is configured)
- set_use_case: set the diagram's intended use-case

STRATEGY:
1. For small changes (color, text, 1-2 nodes), prefer 'apply_patch' or 'update_node'.
2. For large changes or new diagrams, use 'update_diagram' with the full code.
3. For chart/data diagrams, call 'fetch_external_data' first, then build the diagram from the returned rows.
4. To restyle, prefer 'set_theme'/'set_palette'/'apply_brand_kit' over editing colors by hand.
5. Do not call 'apply_brand_kit' unless a brand kit is configured (see CURRENT STATE).
6. Always briefly explain what you are doing before calling a tool.`,
```

- [ ] **Step 5: Add the five new tools**

Inside the `tools: { ... }` object (after the existing `fetch_external_data` tool), add:

```ts
        set_title: tool({
          description: "Rename the diagram.",
          inputSchema: z.object({
            title: z.string().describe("The new diagram title"),
            explanation: z.string().describe("Why this title"),
          }),
          execute: async ({ title, explanation }) => {
            return { success: true, title, explanation };
          },
        }),
        set_theme: tool({
          description: "Change the diagram's visual theme.",
          inputSchema: z.object({
            themeId: z.enum(THEME_IDS).describe("One of the allowed theme ids"),
            explanation: z.string().describe("Why this theme"),
          }),
          execute: async ({ themeId, explanation }) => {
            return { success: true, themeId, explanation };
          },
        }),
        set_palette: tool({
          description: "Change the color palette.",
          inputSchema: z.object({
            paletteId: z.enum(["indigo", "sunset", "ocean", "forest", "default"]).describe("Palette id"),
            explanation: z.string().describe("Why this palette"),
          }),
          execute: async ({ paletteId, explanation }) => {
            return { success: true, paletteId, explanation };
          },
        }),
        apply_brand_kit: tool({
          description: "Apply the user's saved brand colors. Only call when a brand kit is configured.",
          inputSchema: z.object({
            explanation: z.string().describe("Why apply the brand kit"),
          }),
          execute: async ({ explanation }) => {
            return { success: true, explanation };
          },
        }),
        set_use_case: tool({
          description: "Set the diagram's intended use-case (affects preset and styling).",
          inputSchema: z.object({
            useCaseId: z.enum(["presentation", "social", "documentation", "custom"]).describe("Use-case id"),
            explanation: z.string().describe("Why this use-case"),
          }),
          execute: async ({ useCaseId, explanation }) => {
            return { success: true, useCaseId, explanation };
          },
        }),
```

- [ ] **Step 6: Verify types**

Run: `cd C:/Users/govin/AI_PROJECTS/FLOWSTUDIO && pnpm --filter @flowchart/web exec tsc --noEmit 2>&1 | grep -v "\.test\.ts" | grep "error TS" || echo CLEAN`
Expected: `CLEAN`.

- [ ] **Step 7: Commit**

```bash
cd C:/Users/govin/AI_PROJECTS/FLOWSTUDIO && git add apps/web/app/api/ai/agent/route.ts && git commit -m "feat(agent): add title/theme/palette/brand-kit/use-case tools + state context"
```

---

## Task 7: Agent route — `onFinish` analytics

**Files:**
- Modify: `apps/web/app/api/ai/agent/route.ts`

- [ ] **Step 1: Add imports and request timing/counter**

At the top of `apps/web/app/api/ai/agent/route.ts` add:

```ts
import { recordAiEvent } from "@/lib/ai-events";
```

As the first line inside `export async function POST(req: Request) {`, add:

```ts
  const requestStart = Date.now();
```

Before the `const result = streamText({` call, add a tool-call counter:

```ts
  let toolCallCount = 0;
```

Then add `toolCallCount++;` as the first line of **every** tool's `execute` body (all 9 tools: update_diagram, apply_patch, update_node, fetch_external_data, set_title, set_theme, set_palette, apply_brand_kit, set_use_case).

- [ ] **Step 2: Compute prompt/source lengths for the event**

Before `streamText`, add:

```ts
  const lastUserText = [...messages].reverse().find((m: { role?: string }) => m?.role === "user");
  const promptLength = JSON.stringify(lastUserText ?? "").length;
  const sourceLength = (currentSource || "").length;
```

- [ ] **Step 3: Add the `onFinish` callback to `streamText`**

Add this `onFinish` property to the `streamText({ ... })` config object (e.g. right after `stopWhen: stepCountIs(5),`):

```ts
      onFinish: ({ usage }) => {
        void recordAiEvent({
          userId: user.id,
          diagramType,
          effectiveDiagramType: diagramType,
          typeSwitched: false,
          mode: "agent",
          provider,
          model,
          promptLength,
          sourceLength,
          intentLatencyMs: null,
          genLatencyMs: null,
          totalLatencyMs: Date.now() - requestStart,
          inputTokens: usage?.inputTokens ?? null,
          outputTokens: usage?.outputTokens ?? null,
          validationStatus: "ok",
          retryAttempted: false,
          intentFallback: false,
          toolCalls: toolCallCount,
          error: null,
        });
      },
```

- [ ] **Step 4: Verify types and build**

Run: `cd C:/Users/govin/AI_PROJECTS/FLOWSTUDIO && pnpm --filter @flowchart/web exec tsc --noEmit 2>&1 | grep -v "\.test\.ts" | grep "error TS" || echo CLEAN`
Expected: `CLEAN`.
Run: `cd C:/Users/govin/AI_PROJECTS/FLOWSTUDIO && pnpm --filter @flowchart/web build 2>&1 | tail -3`
Expected: build completes (no error).

- [ ] **Step 5: Commit**

```bash
cd C:/Users/govin/AI_PROJECTS/FLOWSTUDIO && git add apps/web/app/api/ai/agent/route.ts && git commit -m "feat(agent): log runs to aiEvents (mode=agent, toolCalls, tokens, latency)"
```

---

## Task 8: Editor — dispatch refactor, `toolEffects`, new-tool application, body field

**Files:**
- Modify: `apps/web/components/editor-client.tsx`

- [ ] **Step 1: Add imports and `toolEffects` state**

Add near the top imports of `editor-client.tsx`:

```ts
import { applyPatch } from "@/lib/agent-tools";
```

Add this state next to the other UI state (near `darkMode`, ~line 329):

```ts
  const [toolEffects, setToolEffects] = useState<Record<string, { status: "applied" | "noop" | "error"; label: string; detail?: string }>>({});
```

- [ ] **Step 2: Make `handleApplyBrandKit` report success**

Find `handleApplyBrandKit` (~line 886). Change its signature to return `Promise<boolean>`: return `false` on the "no brand kit" early path (where it currently shows the toast and returns) and `true` after it sets accent/background/palette. Leave the existing `setApplyingBrand`/toast logic intact; only add the boolean returns. Example shape:

```ts
  const handleApplyBrandKit = useCallback(async (): Promise<boolean> => {
    setApplyingBrand(true);
    try {
      const kit = await getBrandKit();
      if (!kit || !kit.palette) {
        showToast("No brand kit yet — set one in Settings");
        return false;
      }
      // ... existing setCustomAccent / setCustomBackground / setPaletteId("brand") ...
      return true;
    } finally {
      setApplyingBrand(false);
    }
  }, [showToast]);
```

- [ ] **Step 3: Add `themeId` to the request body**

Find `bodyRef.current = { ... }` (~line 337). Add `themeId,` to the object (alongside the existing `diagramType, title, ... useCaseId, mode`).

- [ ] **Step 4: Replace the tool-handling effect with a dispatch**

Replace the entire tool-handling `useEffect` (currently ~lines 443–508, the one that begins with the `// Handle Tool Results surgically` comment) with:

```ts
  // Apply agent tool results to editor state; record each outcome in toolEffects.
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "assistant") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = Array.isArray((lastMessage as { parts?: unknown[] }).parts) ? (lastMessage as { parts: unknown[] }).parts as any[] : [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolParts = parts.filter((p: any) => typeof p?.type === "string" && p.type.startsWith("tool-"));
    if (toolParts.length === 0) return;

    const snapshotBeforeTools = sourceRef.current;
    let mutated = false;
    const effects: Record<string, { status: "applied" | "noop" | "error"; label: string; detail?: string }> = {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toolParts.forEach((tp: any) => {
      if (tp.state !== "output-available") return;
      const id: string = tp.toolCallId;
      if (toolEffects[id]) return; // already applied (idempotent)
      const result = tp.output;
      if (!result || !result.success) return;
      const toolName: string = tp.toolName ?? String(tp.type).slice(5);

      if (toolName === "update_diagram" && result.sourceCode) {
        mutated = true;
        setSource(result.sourceCode);
        effects[id] = { status: "applied", label: "Diagram updated" };
      } else if (toolName === "apply_patch" && typeof result.find === "string") {
        const { source: next, replaced } = applyPatch(sourceRef.current, result.find, result.replace ?? "");
        if (replaced > 0) {
          mutated = true;
          setSource(next);
          effects[id] = { status: "applied", label: `Replaced ${replaced} occurrence${replaced === 1 ? "" : "s"}` };
        } else {
          effects[id] = { status: "noop", label: "Couldn't find that text", detail: result.find.slice(0, 60) };
        }
      } else if (toolName === "update_node" && diagramType === "reactflow") {
        try {
          const parsed = JSON.parse(sourceRef.current);
          const nodes: ReactFlowSourceNode[] = Array.isArray(parsed.nodes) ? parsed.nodes : [];
          const updatedNodes = nodes.map((n) => n.id === result.id ? { ...n, data: result.data ? { ...n.data, ...result.data } : n.data, style: result.style ? { ...n.style, ...result.style } : n.style } : n);
          mutated = true;
          setSource(JSON.stringify({ ...parsed, nodes: updatedNodes }, null, 2));
          effects[id] = { status: "applied", label: `Updated node ${result.id}` };
        } catch {
          effects[id] = { status: "error", label: "Couldn't update node" };
        }
      } else if (toolName === "set_title" && result.title) {
        setTitle(result.title);
        effects[id] = { status: "applied", label: `Renamed to "${result.title}"` };
      } else if (toolName === "set_theme" && result.themeId) {
        setThemeId(result.themeId);
        effects[id] = { status: "applied", label: `Theme → ${result.themeId}` };
      } else if (toolName === "set_palette" && result.paletteId) {
        setPaletteId(result.paletteId);
        effects[id] = { status: "applied", label: `Palette → ${result.paletteId}` };
      } else if (toolName === "set_use_case" && result.useCaseId) {
        handleUseCaseChange(result.useCaseId);
        effects[id] = { status: "applied", label: `Use case → ${result.useCaseId}` };
      } else if (toolName === "apply_brand_kit") {
        void handleApplyBrandKit().then((ok) => {
          setToolEffects((prev) => ({ ...prev, [id]: ok ? { status: "applied", label: "Applied brand kit" } : { status: "error", label: "No brand kit set" } }));
        });
      }
    });

    if (Object.keys(effects).length > 0) {
      setToolEffects((prev) => ({ ...prev, ...effects }));
    }
    if (mutated) {
      setUndoStack((prev) => {
        if (prev[prev.length - 1] === snapshotBeforeTools) return prev;
        return [...prev.slice(-(UNDO_LIMIT - 1)), snapshotBeforeTools];
      });
      setRedoStack([]);
    }
  }, [messages, diagramType, toolEffects, handleUseCaseChange, handleApplyBrandKit]);
```

- [ ] **Step 5: Verify types**

Run: `cd C:/Users/govin/AI_PROJECTS/FLOWSTUDIO && pnpm --filter @flowchart/web exec tsc --noEmit 2>&1 | grep -v "\.test\.ts" | grep "error TS" || echo CLEAN`
Expected: `CLEAN`. (If `handleUseCaseChange`/`handleApplyBrandKit` are declared after this effect and cause a use-before-declaration error, move the effect below their declarations — they are `useCallback`s defined earlier in the component, so this should be clean.)

- [ ] **Step 6: Commit**

```bash
cd C:/Users/govin/AI_PROJECTS/FLOWSTUDIO && git add apps/web/components/editor-client.tsx && git commit -m "feat(agent): apply new tool effects in editor + fix apply_patch (replace-all, not-found)"
```

---

## Task 9: Editor — transparency UI + discoverability + remove stale comment

**Files:**
- Modify: `apps/web/components/editor-client.tsx`

- [ ] **Step 1: Upgrade the tool card rendering**

Replace the tool-card `.map((tool: any) => { ... })` block (~lines 1483–1497) with one that shows a per-tool verb, the model's explanation, and the recorded effect:

```tsx
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  .map((tool: any) => {
                    const toolName: string = tool.toolName ?? String(tool.type).slice(5);
                    const isDone = tool.state === "output-available";
                    const effect = toolEffects[tool.toolCallId];
                    const verbs: Record<string, string> = {
                      update_diagram: "Updating diagram…",
                      apply_patch: "Patching…",
                      update_node: "Updating node…",
                      fetch_external_data: "Fetching data…",
                      set_title: "Renaming…",
                      set_theme: "Setting theme…",
                      set_palette: "Setting palette…",
                      apply_brand_kit: "Applying brand kit…",
                      set_use_case: "Setting use-case…",
                    };
                    const explanation: string | undefined = tool.output?.explanation;
                    const failed = effect?.status === "noop" || effect?.status === "error";
                    return (
                      <div key={tool.toolCallId} className="mt-2 w-full max-w-[92%] rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5 text-xs text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700 flex flex-col gap-1.5 shadow-xs">
                        <div className="flex items-center gap-2">
                          {!isDone ? <Settings2 className="h-3.5 w-3.5 text-indigo-400 animate-spin" /> : failed ? <AlertCircle className="h-3.5 w-3.5 text-amber-500" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                          <span className="font-semibold">{isDone && effect ? effect.label : (verbs[toolName] ?? "Using tool…")}</span>
                        </div>
                        {explanation && <span className="pl-5 text-slate-400 dark:text-slate-500">{explanation}</span>}
                        {effect?.detail && <span className="pl-5 font-mono text-slate-400 dark:text-slate-500">{effect.detail}</span>}
                      </div>
                    );
                  })}
```

- [ ] **Step 2: Add the `AlertCircle` icon import**

Add `AlertCircle` to the existing `lucide-react` import in `editor-client.tsx` (alongside `CheckCircle2`, `Settings2`).

- [ ] **Step 3: Remove the stale placeholder comment**

Delete the line `{/* Visual edits — placeholder, not yet implemented */}` (~line 1607).

- [ ] **Step 4: Make the Agent Mode toggle discoverable**

On the Agent Mode `<button>` (~line 1608), add a `title` attribute:

```tsx
                    title="Agent takes multiple steps — edit, theme, fetch data — to build your diagram"
```

Directly after the prompt-controls row that contains the Agent Mode button (after the closing `</div>` of the `flex items-center justify-between` row, ~line 1635), add a caption shown only when agent mode is on:

```tsx
              {isAgentMode && (
                <p className="px-2 pb-1 text-[11px] text-slate-400 dark:text-slate-500">
                  Agent mode: the AI takes multiple steps — editing, theming, and fetching data — to build your diagram.
                </p>
              )}
```

- [ ] **Step 5: Verify types and build**

Run: `cd C:/Users/govin/AI_PROJECTS/FLOWSTUDIO && pnpm --filter @flowchart/web exec tsc --noEmit 2>&1 | grep -v "\.test\.ts" | grep "error TS" || echo CLEAN`
Expected: `CLEAN`.
Run: `cd C:/Users/govin/AI_PROJECTS/FLOWSTUDIO && pnpm --filter @flowchart/web build 2>&1 | tail -3`
Expected: build completes.

- [ ] **Step 6: Commit**

```bash
cd C:/Users/govin/AI_PROJECTS/FLOWSTUDIO && git add apps/web/components/editor-client.tsx && git commit -m "feat(agent): transparent tool cards + discoverable Agent Mode toggle"
```

---

## Task 10: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full unit suite**

Run: `cd C:/Users/govin/AI_PROJECTS/FLOWSTUDIO && pnpm test:unit 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: `pass` equals `tests`, `fail 0` (69 expected).

- [ ] **Step 2: Type check**

Run: `cd C:/Users/govin/AI_PROJECTS/FLOWSTUDIO && pnpm --filter @flowchart/web exec tsc --noEmit 2>&1 | grep -v "\.test\.ts" | grep "error TS" || echo CLEAN`
Expected: `CLEAN`.

- [ ] **Step 3: Production build**

Run: `cd C:/Users/govin/AI_PROJECTS/FLOWSTUDIO && pnpm --filter @flowchart/web build 2>&1 | tail -4`
Expected: build completes, all routes compiled.

- [ ] **Step 4: In-browser verification (verify skill)**

Start the dev server (`pnpm --filter @flowchart/web dev`), open the editor, enable Agent Mode, and drive these prompts, capturing the chat cards and canvas after each:
1. "Rename this to 'Q3 Roadmap' and switch to the midnight theme" → expect `set_title` + `set_theme` cards with explanations and "Renamed to…" / "Theme → midnight"; title and theme actually change.
2. "Change the word 'Start' to 'Begin'" on a diagram containing 'Start' → `apply_patch` card shows "Replaced N occurrences"; source updates.
3. "Change the word 'Zzzzz' to 'X'" (text not present) → `apply_patch` card shows the amber "Couldn't find that text" state (the bug-fix; previously a false ✓).
Record screenshots/observations. If `SendUserFile` is available, send the screenshots.

- [ ] **Step 5: Push**

```bash
cd C:/Users/govin/AI_PROJECTS/FLOWSTUDIO && git push origin master
```

---

## Self-Review Notes

- **Spec coverage:** §1 new tools → Tasks 5–6; §2 dispatch + apply_patch fix → Tasks 1, 8; §3 transparency → Task 9; §4 discoverability → Task 9; §5 analytics+brand parity → Tasks 2, 3, 4, 7; §6 testing → Tasks 1, 2, 10. All covered.
- **Schema/constraint:** the `mode` CHECK constraint relax (Task 4) is required for `mode:"agent"` (Task 7) — without it the insert silently fails (caught by `recordAiEvent`'s try/catch, so the stream is safe, but no row is written).
- **Type consistency:** `toolEffects` shape, `applyPatch` return `{ source, replaced }`, and `formatBrandDirective(name, palette)` signatures are used identically across tasks.
