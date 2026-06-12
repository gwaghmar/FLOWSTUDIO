# Social Card Engine + Flagship 4 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One social-card rendering engine powering 4 new daily-use diagram types — timeline, versus, 2x2 matrix, funnel — plus copy-PNG-to-clipboard export.

**Architecture:** Each new type is a separate `DiagramType` (so every existing `Record<DiagramType, …>` map, picker card, and prompt slot works unchanged), but all four share ONE renderer: `social-card-renderer.tsx` parses the JSON source, reads its `type` field, and delegates to a per-subtype layout component. Cards are pure HTML/Tailwind, so the existing generic `frameRef` + `html-to-image` export path works with zero new export code. Copy-to-clipboard reuses the same `toPng` output via `ClipboardItem`.

**Tech Stack:** Next.js 15, TypeScript, Tailwind, html-to-image (already installed). No new dependencies.

**Conventions that apply (from CLAUDE.md):** work on master, commit per task, no emojis in code, no what-comments, after each task run `pnpm --filter @flowchart/web exec tsc --noEmit` (ignore `.test.ts` errors) and keep `pnpm test:unit` green. `pnpm --filter @flowchart/core build` after editing packages/core (web imports its dist).

---

### Task 1: Parse module (TDD)

**Files:**
- Create: `apps/web/lib/diagrams/social-cards.ts`
- Test: `apps/web/lib/diagrams/social-cards.test.ts`
- Modify: `package.json:13` (add test file to `test:unit` list)

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/lib/diagrams/social-cards.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseSocialCard } from "./social-cards.ts";

describe("parseSocialCard", () => {
  it("parses a timeline card", () => {
    const r = parseSocialCard(JSON.stringify({
      type: "timeline", title: "Our journey",
      items: [{ date: "2024", label: "Founded" }, { date: "2025", label: "Launch", description: "v1 ships" }],
    }));
    assert.equal(r.ok, true);
    if (r.ok && r.card.type === "timeline") {
      assert.equal(r.card.items.length, 2);
      assert.equal(r.card.items[1].description, "v1 ships");
    }
  });
  it("parses a versus card and defaults missing points to empty arrays", () => {
    const r = parseSocialCard(JSON.stringify({
      type: "versus", title: "X vs Y",
      left: { name: "X" }, right: { name: "Y", points: ["fast"] },
    }));
    assert.equal(r.ok, true);
    if (r.ok && r.card.type === "versus") {
      assert.deepEqual(r.card.left.points, []);
      assert.deepEqual(r.card.right.points, ["fast"]);
    }
  });
  it("parses a matrix2x2 card and clamps coordinates to 0-100", () => {
    const r = parseSocialCard(JSON.stringify({
      type: "matrix2x2", title: "Effort vs impact",
      xAxis: { low: "Low effort", high: "High effort" },
      yAxis: { low: "Low impact", high: "High impact" },
      items: [{ label: "A", x: -5, y: 130 }],
    }));
    assert.equal(r.ok, true);
    if (r.ok && r.card.type === "matrix2x2") {
      assert.equal(r.card.items[0].x, 0);
      assert.equal(r.card.items[0].y, 100);
    }
  });
  it("parses a funnel card", () => {
    const r = parseSocialCard(JSON.stringify({
      type: "funnel", title: "Signup funnel",
      stages: [{ label: "Visitors", value: "10,000" }, { label: "Signups", value: "1,200" }],
    }));
    assert.equal(r.ok, true);
    if (r.ok && r.card.type === "funnel") assert.equal(r.card.stages.length, 2);
  });
  it("rejects invalid JSON and unknown types with ok:false", () => {
    assert.equal(parseSocialCard("not json").ok, false);
    assert.equal(parseSocialCard(JSON.stringify({ type: "bogus" })).ok, false);
    assert.equal(parseSocialCard(JSON.stringify({ type: "timeline" })).ok, false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --experimental-strip-types apps/web/lib/diagrams/social-cards.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the implementation**

```typescript
// apps/web/lib/diagrams/social-cards.ts
export type SocialCardType = "timeline" | "versus" | "matrix2x2" | "funnel";

export type TimelineCard = {
  type: "timeline";
  title: string;
  items: Array<{ date: string; label: string; description?: string }>;
  accent?: string;
};
export type VersusCard = {
  type: "versus";
  title: string;
  left: { name: string; points: string[]; color?: string };
  right: { name: string; points: string[]; color?: string };
  verdict?: string;
};
export type MatrixCard = {
  type: "matrix2x2";
  title: string;
  xAxis: { low: string; high: string };
  yAxis: { low: string; high: string };
  items: Array<{ label: string; x: number; y: number }>;
  quadrantLabels?: [string, string, string, string];
  accent?: string;
};
export type FunnelCard = {
  type: "funnel";
  title: string;
  stages: Array<{ label: string; value?: string; note?: string }>;
  accent?: string;
};
export type SocialCard = TimelineCard | VersusCard | MatrixCard | FunnelCard;

export type ParseResult = { ok: true; card: SocialCard } | { ok: false; error: string };

const clamp = (n: unknown) => Math.min(100, Math.max(0, Number(n) || 0));
const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const strArr = (v: unknown) => (Array.isArray(v) ? v.filter((s) => typeof s === "string") : []);

export function parseSocialCard(source: string): ParseResult {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(source);
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }
  if (!raw || typeof raw !== "object") return { ok: false, error: "Expected a JSON object" };
  const title = str(raw.title, "Untitled");
  switch (raw.type) {
    case "timeline": {
      const items = Array.isArray(raw.items)
        ? raw.items.map((i: Record<string, unknown>) => ({
            date: str(i?.date), label: str(i?.label),
            ...(typeof i?.description === "string" ? { description: i.description } : {}),
          })).filter((i) => i.label)
        : [];
      if (!items.length) return { ok: false, error: "timeline needs items[]" };
      return { ok: true, card: { type: "timeline", title, items, ...(typeof raw.accent === "string" ? { accent: raw.accent } : {}) } };
    }
    case "versus": {
      const side = (v: unknown) => {
        const o = (v ?? {}) as Record<string, unknown>;
        return { name: str(o.name, "?"), points: strArr(o.points), ...(typeof o.color === "string" ? { color: o.color } : {}) };
      };
      return {
        ok: true,
        card: { type: "versus", title, left: side(raw.left), right: side(raw.right), ...(typeof raw.verdict === "string" ? { verdict: raw.verdict } : {}) },
      };
    }
    case "matrix2x2": {
      const axis = (v: unknown) => {
        const o = (v ?? {}) as Record<string, unknown>;
        return { low: str(o.low, "Low"), high: str(o.high, "High") };
      };
      const items = Array.isArray(raw.items)
        ? raw.items.map((i: Record<string, unknown>) => ({ label: str(i?.label), x: clamp(i?.x), y: clamp(i?.y) })).filter((i) => i.label)
        : [];
      const ql = Array.isArray(raw.quadrantLabels) && raw.quadrantLabels.length === 4
        ? (raw.quadrantLabels.map((q) => str(q)) as [string, string, string, string])
        : undefined;
      return {
        ok: true,
        card: { type: "matrix2x2", title, xAxis: axis(raw.xAxis), yAxis: axis(raw.yAxis), items, ...(ql ? { quadrantLabels: ql } : {}), ...(typeof raw.accent === "string" ? { accent: raw.accent } : {}) },
      };
    }
    case "funnel": {
      const stages = Array.isArray(raw.stages)
        ? raw.stages.map((s: Record<string, unknown>) => ({
            label: str(s?.label),
            ...(typeof s?.value === "string" ? { value: s.value } : {}),
            ...(typeof s?.note === "string" ? { note: s.note } : {}),
          })).filter((s) => s.label)
        : [];
      if (!stages.length) return { ok: false, error: "funnel needs stages[]" };
      return { ok: true, card: { type: "funnel", title, stages, ...(typeof raw.accent === "string" ? { accent: raw.accent } : {}) } };
    }
    default:
      return { ok: false, error: `Unknown card type: ${String(raw.type)}` };
  }
}

export const SOCIAL_CARD_TYPES: SocialCardType[] = ["timeline", "versus", "matrix2x2", "funnel"];
export function isSocialCardType(t: string): t is SocialCardType {
  return (SOCIAL_CARD_TYPES as string[]).includes(t);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test --experimental-strip-types apps/web/lib/diagrams/social-cards.test.ts`
Expected: PASS (all 5).

- [ ] **Step 5: Register in test:unit and commit**

In root `package.json` add `apps/web/lib/diagrams/social-cards.test.ts` to the `test:unit` file list. Run `pnpm test:unit` (all green), then:

```bash
git add apps/web/lib/diagrams/social-cards.ts apps/web/lib/diagrams/social-cards.test.ts package.json
git commit -m "feat(social): social-card parse module with normalizing parser"
```

---

### Task 2: Register the 4 types in packages/core

**Files:**
- Modify: `packages/core/src/diagram-types.ts` (union ~line 3-13, DIAGRAM_TYPE_META ~33-131, DIAGRAM_SYSTEM_PROMPTS ~138-640, DIAGRAM_TYPE_DEFAULTS ~942-1128)

- [ ] **Step 1: Extend the DiagramType union**

```typescript
export type DiagramType =
  | "mermaid" | "excalidraw" | "reactflow" | "echarts" | "nivo"
  | "tldraw" | "bpmn" | "cloud" | "erd" | "orgchart"
  | "timeline" | "versus" | "matrix2x2" | "funnel";
```

- [ ] **Step 2: Add DIAGRAM_TYPE_META entries** (append to the array; category `"social"` — if `DiagramCategory` is a closed union, add `"social"` to it)

```typescript
{
  id: "timeline",
  label: "Timeline",
  description: "Milestone timelines — product roadmaps, company journeys, career paths",
  category: "social",
  icon: "milestone",
  color: "#0ea5e9",
  subtypes: ["roadmap", "journey", "history"],
  aiOutputFormat: "social-json",
},
{
  id: "versus",
  label: "Versus",
  description: "Side-by-side comparison — X vs Y with pros, cons, and a verdict",
  category: "social",
  icon: "split",
  color: "#f59e0b",
  subtypes: ["comparison", "pros-cons"],
  aiOutputFormat: "social-json",
},
{
  id: "matrix2x2",
  label: "2x2 Matrix",
  description: "Quadrant charts — SWOT, effort vs impact, competitor positioning",
  category: "social",
  icon: "grid",
  color: "#8b5cf6",
  subtypes: ["swot", "eisenhower", "positioning"],
  aiOutputFormat: "social-json",
},
{
  id: "funnel",
  label: "Funnel",
  description: "Conversion funnels — marketing, sales, and signup stages with numbers",
  category: "social",
  icon: "filter",
  color: "#ec4899",
  subtypes: ["marketing", "sales", "conversion"],
  aiOutputFormat: "social-json",
},
```

- [ ] **Step 3: Add DIAGRAM_SYSTEM_PROMPTS entries** (match existing per-type prompt style: ONLY-JSON contract + schema + rules + one example)

```typescript
timeline: `You output ONLY valid JSON for a timeline card (no markdown fences, no commentary).
Schema:
{ "type": "timeline", "title": string, "items": [{ "date": string, "label": string, "description"?: string }], "accent"?: string }
RULES:
- 3-8 items, chronological order. "date" is short ("2024", "Q3 2025", "Day 1").
- "label" max 6 words; "description" max 12 words, only when it adds real information.
- Title is punchy and social-ready (max 8 words).
- When a BRAND PALETTE directive is present, set "accent" to its primary color.
Example: {"type":"timeline","title":"From idea to 10k users","items":[{"date":"Jan 2025","label":"First prototype"},{"date":"Mar 2025","label":"Public beta","description":"500 signups in week one"},{"date":"Jun 2025","label":"Product Hunt #1"},{"date":"Dec 2025","label":"10,000 users"}]}`,
versus: `You output ONLY valid JSON for a side-by-side comparison card (no markdown fences, no commentary).
Schema:
{ "type": "versus", "title": string, "left": { "name": string, "points": string[], "color"?: string }, "right": { "name": string, "points": string[], "color"?: string }, "verdict"?: string }
RULES:
- 3-6 points per side, parallel in topic (point N left vs point N right covers the same dimension).
- Points max 8 words each. Title format "X vs Y" unless the user asks otherwise.
- Include "verdict" (max 15 words) only when the user asks for a recommendation.
Example: {"type":"versus","title":"Remote vs Office","left":{"name":"Remote","points":["No commute","Deep focus time","Hire anywhere"]},"right":{"name":"Office","points":["Faster onboarding","Spontaneous collaboration","Clear work-life boundary"]}}`,
matrix2x2: `You output ONLY valid JSON for a 2x2 matrix / quadrant card (no markdown fences, no commentary).
Schema:
{ "type": "matrix2x2", "title": string, "xAxis": { "low": string, "high": string }, "yAxis": { "low": string, "high": string }, "items": [{ "label": string, "x": number, "y": number }], "quadrantLabels"?: [string, string, string, string] }
RULES:
- x and y are 0-100 positions (x: 0 = left/low, 100 = right/high; y: 0 = bottom/low, 100 = top/high).
- 4-10 items, labels max 4 words. Spread items so they do not overlap (vary both axes).
- quadrantLabels order: [top-left, top-right, bottom-left, bottom-right]. Include them for SWOT/Eisenhower-style requests.
Example: {"type":"matrix2x2","title":"Feature priorities","xAxis":{"low":"Low effort","high":"High effort"},"yAxis":{"low":"Low impact","high":"High impact"},"items":[{"label":"Dark mode","x":20,"y":75},{"label":"SSO","x":80,"y":85},{"label":"Emoji reactions","x":15,"y":25},{"label":"Plugin API","x":90,"y":40}],"quadrantLabels":["Quick wins","Big bets","Fill-ins","Money pits"]}`,
funnel: `You output ONLY valid JSON for a conversion funnel card (no markdown fences, no commentary).
Schema:
{ "type": "funnel", "title": string, "stages": [{ "label": string, "value"?: string, "note"?: string }], "accent"?: string }
RULES:
- 3-6 stages, widest first. "value" is a display string ("10,000", "12%", "$50k") when the user gives numbers.
- "note" max 8 words, only for a stage with a notable insight (e.g. biggest drop-off).
- Invent NO numbers: omit "value" when the user gives none.
Example: {"type":"funnel","title":"SaaS signup funnel","stages":[{"label":"Site visitors","value":"40,000"},{"label":"Started trial","value":"2,400","note":"6% conversion"},{"label":"Activated","value":"1,100"},{"label":"Paid plan","value":"310"}]}`,
```

- [ ] **Step 4: Add DIAGRAM_TYPE_DEFAULTS entries** (starter sources — use the four prompt Example payloads verbatim as `JSON.stringify`'d objects, pretty-printed with `null, 2`)

```typescript
timeline: JSON.stringify({
  type: "timeline", title: "From idea to 10k users",
  items: [
    { date: "Jan 2025", label: "First prototype" },
    { date: "Mar 2025", label: "Public beta", description: "500 signups in week one" },
    { date: "Jun 2025", label: "Product Hunt #1" },
    { date: "Dec 2025", label: "10,000 users" },
  ],
}, null, 2),
versus: JSON.stringify({
  type: "versus", title: "Remote vs Office",
  left: { name: "Remote", points: ["No commute", "Deep focus time", "Hire anywhere"] },
  right: { name: "Office", points: ["Faster onboarding", "Spontaneous collaboration", "Clear work-life boundary"] },
}, null, 2),
matrix2x2: JSON.stringify({
  type: "matrix2x2", title: "Feature priorities",
  xAxis: { low: "Low effort", high: "High effort" },
  yAxis: { low: "Low impact", high: "High impact" },
  items: [
    { label: "Dark mode", x: 20, y: 75 }, { label: "SSO", x: 80, y: 85 },
    { label: "Emoji reactions", x: 15, y: 25 }, { label: "Plugin API", x: 90, y: 40 },
  ],
  quadrantLabels: ["Quick wins", "Big bets", "Fill-ins", "Money pits"],
}, null, 2),
funnel: JSON.stringify({
  type: "funnel", title: "SaaS signup funnel",
  stages: [
    { label: "Site visitors", value: "40,000" },
    { label: "Started trial", value: "2,400", note: "6% conversion" },
    { label: "Activated", value: "1,100" },
    { label: "Paid plan", value: "310" },
  ],
}, null, 2),
```

- [ ] **Step 5: Build core + typecheck web, fix any `Record<DiagramType, …>` exhaustiveness errors the compiler reports**

Run: `pnpm --filter @flowchart/core build && pnpm --filter @flowchart/web exec tsc --noEmit`
Expected: tsc errors ONLY in files that hold `Record<DiagramType, …>` maps not yet updated (diagram-icon.tsx, share-viewer.tsx, generate/route.ts typeHints…). Those are Tasks 4-6; if the build surfaces one not covered there, fix it with a sensible entry now. `.test.ts` TS5097 errors are pre-existing — ignore.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/diagram-types.ts
git commit -m "feat(core): register timeline/versus/matrix2x2/funnel social card types"
```

---

### Task 3: The renderer

**Files:**
- Create: `apps/web/components/diagrams/social-card-renderer.tsx`

One file, default-styled with Tailwind. Contract identical to every other renderer: `{ source, onChange?, readOnly? }` (`onChange` unused — editing happens via Source panel and AI; accept the prop for contract parity).

- [ ] **Step 1: Write the renderer**

```tsx
// apps/web/components/diagrams/social-card-renderer.tsx
"use client";

import { parseSocialCard, type SocialCard, type TimelineCard, type VersusCard, type MatrixCard, type FunnelCard } from "@/lib/diagrams/social-cards";

const DEFAULT_ACCENT = "#4f46e5";

export function SocialCardRenderer({ source }: { source: string; onChange?: (s: string) => void; readOnly?: boolean }) {
  const result = parseSocialCard(source);
  if (!result.ok) {
    return (
      <div className="flex h-full min-h-[300px] w-full items-center justify-center p-8 text-center">
        <div>
          <p className="text-sm font-medium text-slate-700">Could not render card</p>
          <p className="mt-1 text-xs text-slate-500">{result.error}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-full w-full flex-col bg-white p-[5%]">
      <CardBody card={result.card} />
    </div>
  );
}

function CardBody({ card }: { card: SocialCard }) {
  switch (card.type) {
    case "timeline": return <TimelineLayout card={card} />;
    case "versus": return <VersusLayout card={card} />;
    case "matrix2x2": return <MatrixLayout card={card} />;
    case "funnel": return <FunnelLayout card={card} />;
  }
}

function CardTitle({ children }: { children: string }) {
  return <h2 className="mb-[4%] text-center text-[clamp(18px,4cqw,42px)] font-bold tracking-tight text-slate-900">{children}</h2>;
}

function TimelineLayout({ card }: { card: TimelineCard }) {
  const accent = card.accent ?? DEFAULT_ACCENT;
  return (
    <div className="flex h-full flex-col">
      <CardTitle>{card.title}</CardTitle>
      <div className="relative flex flex-1 flex-col justify-center">
        <div className="absolute left-[clamp(8px,2cqw,16px)] top-0 bottom-0 w-[3px] rounded" style={{ backgroundColor: `${accent}33` }} />
        <ul className="flex h-full flex-col justify-around">
          {card.items.map((item, i) => (
            <li key={i} className="relative flex items-start gap-[3%] pl-[clamp(24px,5cqw,48px)]">
              <span className="absolute left-[clamp(2px,1cqw,8px)] top-1 h-[clamp(12px,2.5cqw,20px)] w-[clamp(12px,2.5cqw,20px)] rounded-full border-[3px] border-white shadow" style={{ backgroundColor: accent }} />
              <span className="shrink-0 rounded-full px-3 py-1 text-[clamp(10px,1.8cqw,16px)] font-semibold text-white" style={{ backgroundColor: accent }}>{item.date}</span>
              <span>
                <span className="block text-[clamp(13px,2.4cqw,24px)] font-semibold text-slate-900">{item.label}</span>
                {item.description && <span className="block text-[clamp(10px,1.8cqw,16px)] text-slate-500">{item.description}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function VersusLayout({ card }: { card: VersusCard }) {
  const leftColor = card.left.color ?? "#4f46e5";
  const rightColor = card.right.color ?? "#f59e0b";
  const rows = Math.max(card.left.points.length, card.right.points.length);
  return (
    <div className="flex h-full flex-col">
      <CardTitle>{card.title}</CardTitle>
      <div className="grid flex-1 grid-cols-2 gap-[3%]">
        {([{ side: card.left, color: leftColor }, { side: card.right, color: rightColor }] as const).map(({ side, color }, i) => (
          <div key={i} className="flex flex-col rounded-2xl border-2 p-[5%]" style={{ borderColor: color, backgroundColor: `${color}0d` }}>
            <h3 className="mb-[4%] text-center text-[clamp(14px,3cqw,30px)] font-bold" style={{ color }}>{side.name}</h3>
            <ul className="flex flex-1 flex-col justify-start gap-[3%]">
              {Array.from({ length: rows }, (_, r) => (
                <li key={r} className="flex items-start gap-2 text-[clamp(11px,2cqw,19px)] text-slate-700">
                  {side.points[r] && <><span className="mt-[0.3em] h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />{side.points[r]}</>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {card.verdict && (
        <p className="mt-[3%] rounded-xl bg-slate-100 px-4 py-2 text-center text-[clamp(11px,2cqw,18px)] font-medium text-slate-700">{card.verdict}</p>
      )}
    </div>
  );
}

function MatrixLayout({ card }: { card: MatrixCard }) {
  const accent = card.accent ?? DEFAULT_ACCENT;
  const [tl, tr, bl, br] = card.quadrantLabels ?? ["", "", "", ""];
  return (
    <div className="flex h-full flex-col">
      <CardTitle>{card.title}</CardTitle>
      <div className="relative mx-[6%] mb-[6%] flex-1">
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 rounded-xl border border-slate-200">
          {[tl, tr, bl, br].map((q, i) => (
            <div key={i} className={`flex items-${i < 2 ? "start" : "end"} ${i % 2 === 0 ? "justify-start" : "justify-end"} p-2 ${i === 0 ? "rounded-tl-xl" : i === 1 ? "rounded-tr-xl" : i === 2 ? "rounded-bl-xl" : "rounded-br-xl"} ${i % 3 === 0 ? "bg-slate-50" : "bg-white"} border-slate-200 ${i < 2 ? "border-b" : ""} ${i % 2 === 0 ? "border-r" : ""}`}>
              {q && <span className="text-[clamp(9px,1.6cqw,14px)] font-semibold uppercase tracking-wide text-slate-400">{q}</span>}
            </div>
          ))}
        </div>
        {card.items.map((item, i) => (
          <span key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[clamp(10px,1.8cqw,16px)] font-semibold text-white shadow"
            style={{ left: `${item.x}%`, top: `${100 - item.y}%`, backgroundColor: accent }}>
            {item.label}
          </span>
        ))}
        <span className="absolute -bottom-[clamp(18px,3cqw,28px)] left-0 text-[clamp(9px,1.6cqw,14px)] text-slate-500">{card.xAxis.low}</span>
        <span className="absolute -bottom-[clamp(18px,3cqw,28px)] right-0 text-[clamp(9px,1.6cqw,14px)] text-slate-500">{card.xAxis.high}</span>
        <span className="absolute -left-[2%] bottom-0 origin-bottom-left -rotate-90 text-[clamp(9px,1.6cqw,14px)] text-slate-500">{card.yAxis.low}</span>
        <span className="absolute -left-[2%] top-0 origin-top-left -rotate-90 translate-y-full text-[clamp(9px,1.6cqw,14px)] text-slate-500">{card.yAxis.high}</span>
      </div>
    </div>
  );
}

function FunnelLayout({ card }: { card: FunnelCard }) {
  const accent = card.accent ?? DEFAULT_ACCENT;
  const n = card.stages.length;
  return (
    <div className="flex h-full flex-col">
      <CardTitle>{card.title}</CardTitle>
      <div className="flex flex-1 flex-col items-center justify-around gap-[2%]">
        {card.stages.map((stage, i) => {
          const width = 100 - (i * 55) / Math.max(n - 1, 1);
          return (
            <div key={i} className="flex flex-col items-center" style={{ width: `${width}%` }}>
              <div className="flex w-full items-center justify-between gap-3 rounded-xl px-[4%] py-[2%] text-white shadow"
                style={{ backgroundColor: accent, opacity: 1 - i * (0.5 / Math.max(n - 1, 1)) }}>
                <span className="text-[clamp(11px,2.2cqw,20px)] font-semibold">{stage.label}</span>
                {stage.value && <span className="text-[clamp(12px,2.4cqw,22px)] font-bold tabular-nums">{stage.value}</span>}
              </div>
              {stage.note && <span className="mt-1 text-[clamp(9px,1.6cqw,14px)] text-slate-500">{stage.note}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

Note: `cqw` units require the parent to be a size container. The editor's preset frame has a fixed pixel size, so add `containerType: "size"` via the wrapper in Task 4 (`[container-type:size]` Tailwind arbitrary property on the frame div). If container queries prove unreliable inside `html-to-image` export, replace `clamp(...cqw...)` with fixed `text-*` sizes — verify in Step 2.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @flowchart/web exec tsc --noEmit` — expect remaining errors only in not-yet-wired map files (next tasks) and pre-existing `.test.ts` ones.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/diagrams/social-card-renderer.tsx
git commit -m "feat(diagrams): social card renderer — timeline, versus, matrix2x2, funnel layouts"
```

---

### Task 4: Editor wiring

**Files:**
- Modify: `apps/web/components/editor-client.tsx` (dynamic imports ~75-110, canvas branches ~1906-2066)
- Modify: `apps/web/app/app/editor/page.tsx:17` (VALID_TYPES)
- Modify: `apps/web/components/diagram-icon.tsx:20-31` (icon map)

- [ ] **Step 1: Dynamic import** (next to the OrgChartRenderer import)

```tsx
const SocialCardRenderer = dynamic(
  () => import("./diagrams/social-card-renderer").then((m) => ({ default: m.SocialCardRenderer })),
  { ssr: false, loading: () => <CanvasLoader label="Card" /> }
);
```

- [ ] **Step 2: Canvas render branch** (after the orgchart branch; one branch covers all four types; `w-full` is REQUIRED — see CLAUDE.md Group A note)

```tsx
{(diagramType === "timeline" || diagramType === "versus" || diagramType === "matrix2x2" || diagramType === "funnel") && (
  <div
    ref={frameRef}
    className="w-full rounded-xl overflow-hidden shadow-xl bg-white [container-type:size]"
    style={{ minHeight: "600px", height: "100%" }}
  >
    <SocialCardRenderer source={source} onChange={setSource} readOnly={false} />
  </div>
)}
```

- [ ] **Step 3: VALID_TYPES + icon map**

`apps/web/app/app/editor/page.tsx:17` — append `"timeline", "versus", "matrix2x2", "funnel"`.

`apps/web/components/diagram-icon.tsx` — extend `iconMap` (import from `lucide-react`):

```tsx
timeline: Milestone,
versus: Columns2,
matrix2x2: Grid2x2,
funnel: Filter,
```

- [ ] **Step 4: Typecheck + visual check**

Run: `pnpm --filter @flowchart/web exec tsc --noEmit`, then open `http://localhost:3040/app/editor?type=timeline` (and `versus`, `matrix2x2`, `funnel`) — each should render its DIAGRAM_TYPE_DEFAULTS starter card. Screenshot each.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/editor-client.tsx apps/web/app/app/editor/page.tsx apps/web/components/diagram-icon.tsx
git commit -m "feat(editor): wire social card types into canvas, picker, and icons"
```

---

### Task 5: Share / embed / OG wiring

**Files:**
- Modify: `apps/web/components/share-viewer.tsx` (import ~12-47, DIAGRAM_TYPE_LABELS ~112-123, branch ~219-223)
- Modify: `apps/web/components/embed-viewer.tsx` (import ~41-48, branch ~147-149)
- Modify: `apps/web/app/s/[token]/page.tsx:9-13` (TYPE_LABELS)
- Modify: `apps/web/app/s/[token]/og/route.tsx:10-21` (TYPE_LABELS)

- [ ] **Step 1: share-viewer.tsx** — dynamic import (same pattern as OrgChartRenderer, `ssr: false`); labels `timeline: "Timeline"`, `versus: "Versus"`, `matrix2x2: "2x2 Matrix"`, `funnel: "Funnel"`; render branch:

```tsx
{(diagramType === "timeline" || diagramType === "versus" || diagramType === "matrix2x2" || diagramType === "funnel") && (
  <div className="h-[600px] [container-type:size]">
    <SocialCardRenderer source={data.source} readOnly onChange={() => {}} />
  </div>
)}
```

- [ ] **Step 2: embed-viewer.tsx** — same import; branch (match the orgchart pattern there, wrapped in a `[container-type:size]` div).

- [ ] **Step 3: TYPE_LABELS in `s/[token]/page.tsx` and `og/route.tsx`** — add the same four label entries.

- [ ] **Step 4: Typecheck, build, commit**

```bash
pnpm --filter @flowchart/web exec tsc --noEmit
pnpm --filter @flowchart/web build
git add apps/web/components/share-viewer.tsx apps/web/components/embed-viewer.tsx "apps/web/app/s/[token]/page.tsx" "apps/web/app/s/[token]/og/route.tsx"
git commit -m "feat(share): social card types in share, embed, and OG surfaces"
```

---

### Task 6: AI route wiring

**Files:**
- Modify: `apps/web/app/api/ai/generate/route.ts` (VALID_DIAGRAM_TYPES line ~179, typeHints ~542-553)

- [ ] **Step 1: VALID_DIAGRAM_TYPES** — append the four types.

- [ ] **Step 2: typeHints entries**

```typescript
timeline:  "Extract: every dated milestone (date + what happened) in chronological order. Keep labels short; move detail to description.",
versus:    "Extract: the two things being compared and parallel comparison dimensions. Point N on each side must address the same dimension.",
matrix2x2: "Extract: the two axes (what low/high means on each) and every item with its approximate position. Spread items apart; add quadrant labels for SWOT/Eisenhower-style asks.",
funnel:    "Extract: ordered funnel stages (widest first) and any real numbers as display strings. Never invent numbers.",
```

- [ ] **Step 3: Check type-selection rules** — search `route.ts` and `packages/core/src/diagram-types.ts` for the `suggestedDiagramType` enum / type-picker rule list the intent pass uses (commit `bf790a3` added cloud to one). Add the four types with one-line descriptions there so the AI can route "make a timeline of…" prompts to the new types.

- [ ] **Step 4: Typecheck + commit**

```bash
pnpm --filter @flowchart/web exec tsc --noEmit
git add apps/web/app/api/ai/generate/route.ts packages/core/src/diagram-types.ts
git commit -m "feat(ai): generate social cards — typeHints + intent routing for 4 new types"
```

---

### Task 7: Copy PNG to clipboard

**Files:**
- Modify: `apps/web/components/editor-client.tsx` (next to `handleExport` ~1025, Export menu JSX ~1850s)

- [ ] **Step 1: Add `handleCopyImage` callback** (reuses the generic export path; mermaid/echarts special cases reuse their PNG sources)

```tsx
const handleCopyImage = useCallback(async () => {
  setIsExporting(true);
  try {
    let dataUrl: string | undefined;
    if (diagramType === "mermaid") {
      const svg = innerRef.current?.querySelector("svg");
      if (svg) dataUrl = await toPng(svg as unknown as HTMLElement, { pixelRatio: pngScale, backgroundColor: bgColor });
    } else if (diagramType === "echarts") {
      dataUrl = echartsRef.current?.getDataURL({ type: "png", pixelRatio: pngScale, backgroundColor: "#ffffff" });
    } else if (frameRef.current) {
      dataUrl = await toPng(frameRef.current, { pixelRatio: pngScale, filter: (n) => !(n as HTMLElement).hasAttribute?.("data-no-export") });
    }
    if (!dataUrl) return;
    const blob = await (await fetch(dataUrl)).blob();
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    showToast("Image copied — paste it anywhere");
  } catch {
    showToast("Copy failed — try Export PNG instead");
  } finally {
    setIsExporting(false);
  }
}, [diagramType, pngScale, bgColor, showToast]);
```

- [ ] **Step 2: Add the menu item** — in the Export ▾ dropdown, above "PNG": a "Copy image" button calling `handleCopyImage`, styled identically to sibling items.

- [ ] **Step 3: Verify in browser** — open a timeline card, Export ▾ → Copy image, confirm toast; paste into a contenteditable page or check `navigator.clipboard.read()` via console.

- [ ] **Step 4: Typecheck + commit**

```bash
pnpm --filter @flowchart/web exec tsc --noEmit
git add apps/web/components/editor-client.tsx
git commit -m "feat(export): copy diagram as PNG to clipboard"
```

---

### Task 8: Templates

**Files:**
- Modify: `packages/core/src/templates.ts` (NON_MERMAID_TEMPLATES, ~line 377+)

- [ ] **Step 1: Add one template per type** (sources = the DIAGRAM_TYPE_DEFAULTS payloads from Task 2, with distinct real-world titles)

```typescript
{
  id: "timeline_startup_journey",
  title: "Startup journey timeline",
  description: "Milestones from first prototype to 10k users",
  promptHint: "Timeline of a startup's first year",
  diagramType: "timeline",
  source: /* timeline JSON from Task 2 defaults */,
  mermaid: "",
},
{
  id: "versus_remote_office",
  title: "Remote vs Office",
  description: "Side-by-side comparison card",
  promptHint: "Compare remote work and office work",
  diagramType: "versus",
  source: /* versus JSON from Task 2 defaults */,
  mermaid: "",
},
{
  id: "matrix_effort_impact",
  title: "Effort vs impact matrix",
  description: "Prioritize features in a 2x2 quadrant",
  promptHint: "Effort vs impact matrix for feature planning",
  diagramType: "matrix2x2",
  source: /* matrix JSON from Task 2 defaults */,
  mermaid: "",
},
{
  id: "funnel_saas_signup",
  title: "SaaS signup funnel",
  description: "Visitors to paid conversions with drop-off notes",
  promptHint: "SaaS conversion funnel with numbers",
  diagramType: "funnel",
  source: /* funnel JSON from Task 2 defaults */,
  mermaid: "",
},
```

(Replace the `/* … */` placeholders with the literal `JSON.stringify(…, null, 2)` payloads defined in Task 2 Step 4 — same objects, do not retype them by hand.)

- [ ] **Step 2: Build, check gallery, commit**

```bash
pnpm --filter @flowchart/core build && pnpm --filter @flowchart/web exec tsc --noEmit
```
Open `http://localhost:3040/app/templates` — four new cards appear and fork into the editor.

```bash
git add packages/core/src/templates.ts
git commit -m "feat(templates): starter templates for the four social card types"
```

---

### Task 9: Full verification + phase summary

- [ ] **Step 1: Full gates**

```bash
pnpm test:unit
pnpm --filter @flowchart/web build
```
Expected: tests green; build succeeds.

- [ ] **Step 2: Browser pass (1280x800)** — for EACH of the four types: open `/app/editor?type=<t>`, confirm starter renders, switch canvas preset 1:1 → 4:5 → 16:9 (card reflows, no clipping), Export ▾ → PNG download works, Export ▾ → Copy image works, Source panel shows highlighted JSON and hand-edits re-render. AI generation + share/embed flows: only if the Gemini key and DB became available (Phase 0 deferrals); otherwise note as still-blocked.

- [ ] **Step 3: Write `.planning/phases/13-social-engine/13-SUMMARY.md`** — what shipped, what was verified, what stayed blocked. Update CLAUDE.md's diagram-type table (10 → 14 types) and `.planning/STATE.md`. Push master.

```bash
git add .planning CLAUDE.md
git commit -m "docs: phase 13 summary — social card engine + flagship 4"
git push origin master
```
