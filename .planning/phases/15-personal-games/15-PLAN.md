# Phase 15 — Personal & Games (budget, habits, bingo, bracket)

> Milestone 1.4 — Phase 3. Adds 4 more social card subtypes using the
> same architecture as Phases 13 and 14. All infrastructure in place.

---

## Context

Phases 13 and 14 shipped 8 social card types. Phase 15 adds 4 more:
- **budget** — income split into spending categories (pie-like breakdown)
- **habits** — monthly streak grid (GitHub contribution chart style)
- **bingo** — 5×5 bingo card with labeled squares
- **bracket** — single-elimination tournament bracket

Same file set as Phases 13/14 — purely additive changes.

---

## Data Schemas

### budget
```json
{
  "type": "budget",
  "title": "Monthly Budget",
  "total": "$5,000",
  "categories": [
    { "label": "Rent", "amount": "$1,800", "percent": 36, "color": "#4f46e5" },
    { "label": "Food", "amount": "$600", "percent": 12 },
    { "label": "Transport", "amount": "$300", "percent": 6 },
    { "label": "Savings", "amount": "$1,000", "percent": 20 },
    { "label": "Other", "amount": "$1,300", "percent": 26 }
  ]
}
```
- `total`: optional display string for the whole budget
- `categories[].percent`: 0-100; AI should ensure they sum to ~100
- `categories[].color`: optional hex; renderer has a default palette
- `categories[].amount`: optional display string

### habits
```json
{
  "type": "habits",
  "title": "Reading streak — June 2025",
  "habit": "Read 30 min",
  "days": [
    { "day": 1, "done": true },
    { "day": 2, "done": true },
    { "day": 3, "done": false },
    { "day": 4, "done": true }
  ],
  "month": "June 2025"
}
```
- `days`: array of `{day: number, done: boolean}`; day is 1-31
- `month`: display string for the header
- `habit`: short label for what's being tracked
- Renderer fills a grid of up to 31 squares (7 cols × 5 rows)

### bingo
```json
{
  "type": "bingo",
  "title": "Startup Bingo",
  "squares": [
    "Pivoted twice", "MVP in a week", "YC rejection", "Side project", "10x engineer",
    "Move fast", "Disrupting", "Synergy", "FREE center", "Blockchain",
    "Hockey stick", "Unicorn", "Series A", "Burn rate", "Runway",
    "Product-market fit", "TAM SAM SOM", "Cold email", "Demo day", "ARR",
    "Exit strategy", "Iterate", "Scale", "Founder mode", "Zero to one"
  ]
}
```
- `squares`: exactly 25 strings for a 5×5 grid
- If fewer than 25 provided, renderer fills remaining with "?"
- Center square (index 12) is traditionally "FREE" but not required

### bracket
```json
{
  "type": "bracket",
  "title": "Best Programming Language",
  "rounds": [
    {
      "name": "Quarterfinals",
      "matches": [
        { "a": "Python", "b": "JavaScript", "winner": "Python" },
        { "a": "Rust", "b": "Go", "winner": "Rust" },
        { "a": "TypeScript", "b": "Java", "winner": "TypeScript" },
        { "a": "C++", "b": "Swift", "winner": "C++" }
      ]
    },
    {
      "name": "Semifinals",
      "matches": [
        { "a": "Python", "b": "Rust", "winner": "Rust" },
        { "a": "TypeScript", "b": "C++", "winner": "TypeScript" }
      ]
    },
    {
      "name": "Final",
      "matches": [
        { "a": "Rust", "b": "TypeScript" }
      ]
    }
  ]
}
```
- `rounds`: ordered from earliest to final
- `matches[].winner`: optional — omit for undecided matches
- Renderer shows brackets left-to-right, rounds as columns

---

## Tasks

### Task 1 — Parse module: add 4 types + tests

**File:** `apps/web/lib/diagrams/social-cards.ts`
**File:** `apps/web/lib/diagrams/social-cards.test.ts`

#### Types to add (after AlignmentCard):

```ts
export type BudgetCard = {
  type: "budget";
  title: string;
  total?: string;
  categories: Array<{ label: string; percent: number; amount?: string; color?: string }>;
};
export type HabitsCard = {
  type: "habits";
  title: string;
  habit: string;
  month: string;
  days: Array<{ day: number; done: boolean }>;
};
export type BingoCard = {
  type: "bingo";
  title: string;
  squares: string[];
};
export type BracketCard = {
  type: "bracket";
  title: string;
  rounds: Array<{
    name: string;
    matches: Array<{ a: string; b: string; winner?: string }>;
  }>;
};
```

#### SocialCardType: append `"budget" | "habits" | "bingo" | "bracket"`
#### SocialCard union: append all 4 new types
#### SOCIAL_CARD_TYPES: append all 4

#### parseSocialCard() cases:

```ts
case "budget": {
  const categories = Array.isArray(raw.categories)
    ? raw.categories
        .map((c: Record<string, unknown>) => ({
          label: str(c?.label),
          percent: clampTo(c?.percent, 100),
          ...(typeof c?.amount === "string" ? { amount: c.amount } : {}),
          ...(typeof c?.color === "string" ? { color: c.color } : {}),
        }))
        .filter((c) => c.label)
    : [];
  if (!categories.length) return { ok: false, error: "budget needs categories[]" };
  return {
    ok: true,
    card: {
      type: "budget", title,
      categories,
      ...(typeof raw.total === "string" ? { total: raw.total } : {}),
    },
  };
}
case "habits": {
  const days = Array.isArray(raw.days)
    ? raw.days
        .map((d: Record<string, unknown>) => ({
          day: Math.min(31, Math.max(1, Number(d?.day) || 1)),
          done: Boolean(d?.done),
        }))
    : [];
  return {
    ok: true,
    card: {
      type: "habits",
      title,
      habit: str(raw.habit, "Habit"),
      month: str(raw.month, ""),
      days,
    },
  };
}
case "bingo": {
  const squares = Array.isArray(raw.squares)
    ? raw.squares.map((s) => str(s))
    : [];
  return { ok: true, card: { type: "bingo", title, squares } };
}
case "bracket": {
  const rounds = Array.isArray(raw.rounds)
    ? raw.rounds
        .map((r: Record<string, unknown>) => ({
          name: str(r?.name, "Round"),
          matches: Array.isArray(r?.matches)
            ? r.matches.map((m: Record<string, unknown>) => ({
                a: str(m?.a, "?"),
                b: str(m?.b, "?"),
                ...(typeof m?.winner === "string" ? { winner: m.winner } : {}),
              }))
            : [],
        }))
        .filter((r) => r.matches.length)
    : [];
  if (!rounds.length) return { ok: false, error: "bracket needs rounds[]" };
  return { ok: true, card: { type: "bracket", title, rounds } };
}
```

#### Tests (add 5 new tests):

```ts
it("parses a budget card and filters categories without labels", () => {
  const r = parseSocialCard(JSON.stringify({
    type: "budget", title: "Monthly",
    categories: [{ label: "Rent", percent: 40, amount: "$2k" }, { percent: 20 }, { label: "Food", percent: 30 }],
  }));
  assert.equal(r.ok, true);
  if (r.ok && r.card.type === "budget") {
    assert.equal(r.card.categories.length, 2);
    assert.equal(r.card.categories[0].amount, "$2k");
  }
});
it("parses a habits card", () => {
  const r = parseSocialCard(JSON.stringify({
    type: "habits", title: "June reading",
    habit: "Read", month: "June 2025",
    days: [{ day: 1, done: true }, { day: 2, done: false }],
  }));
  assert.equal(r.ok, true);
  if (r.ok && r.card.type === "habits") {
    assert.equal(r.card.days.length, 2);
    assert.equal(r.card.days[0].done, true);
  }
});
it("parses a bingo card with fewer than 25 squares", () => {
  const r = parseSocialCard(JSON.stringify({
    type: "bingo", title: "Office Bingo",
    squares: ["Status update", "Circle back", "Synergy"],
  }));
  assert.equal(r.ok, true);
  if (r.ok && r.card.type === "bingo") {
    assert.equal(r.card.squares.length, 3);
  }
});
it("parses a bracket card and filters rounds with no matches", () => {
  const r = parseSocialCard(JSON.stringify({
    type: "bracket", title: "Tournament",
    rounds: [
      { name: "Semis", matches: [{ a: "A", b: "B", winner: "A" }] },
      { name: "Empty", matches: [] },
    ],
  }));
  assert.equal(r.ok, true);
  if (r.ok && r.card.type === "bracket") {
    assert.equal(r.card.rounds.length, 1);
    assert.equal(r.card.rounds[0].matches[0].winner, "A");
  }
});
it("rejects budget with no valid categories", () => {
  assert.equal(parseSocialCard(JSON.stringify({ type: "budget", categories: [] })).ok, false);
  assert.equal(parseSocialCard(JSON.stringify({ type: "budget" })).ok, false);
});
```

Run `pnpm test:unit` — must be 55 tests, 0 failures.

---

### Task 2 — Core package: DiagramType + system prompts

**File:** `packages/core/src/diagram-types.ts`

1. DiagramType union: append `"budget" | "habits" | "bingo" | "bracket"`

2. DIAGRAM_TYPE_META (append 4 entries):
```ts
budget: { label: "Budget Breakdown", category: "social", icon: "pie-chart", color: "#10b981", aiOutputFormat: "social-json" },
habits: { label: "Habit Tracker", category: "social", icon: "check-square", color: "#6366f1", aiOutputFormat: "social-json" },
bingo: { label: "Bingo Card", category: "social", icon: "grid", color: "#f59e0b", aiOutputFormat: "social-json" },
bracket: { label: "Bracket", category: "social", icon: "trophy", color: "#ef4444", aiOutputFormat: "social-json" },
```

3. DIAGRAM_SYSTEM_PROMPTS (append 4 entries):

**budget:**
```
You output ONLY valid JSON for a Budget Breakdown card (no markdown fences, no commentary).
Schema:
{ "type": "budget", "title": string, "total"?: string, "categories": [{ "label": string, "percent": number, "amount"?: string, "color"?: string }] }
RULES:
- 3-7 categories; percents should sum to 100
- "amount" is a display string ("$1,200", "20%") — omit if the user gives no numbers
- Omit "color" unless the user requests custom colors
- "total" is a display string for the whole budget (optional)
Example: {"type":"budget","title":"Monthly Budget","total":"$5,000","categories":[{"label":"Rent","percent":36,"amount":"$1,800"},{"label":"Food","percent":12,"amount":"$600"},{"label":"Savings","percent":20,"amount":"$1,000"},{"label":"Other","percent":32,"amount":"$1,600"}]}
```

**habits:**
```
You output ONLY valid JSON for a Habit Tracker card (no markdown fences, no commentary).
Schema:
{ "type": "habits", "title": string, "habit": string, "month": string, "days": [{ "day": number, "done": boolean }] }
RULES:
- "days" covers every day of the month (1 to 28/30/31); include ALL days, not just done ones
- "done": true for completed days, false for missed or future days
- "month" is a display string ("June 2025")
- "habit" is a short label for what is tracked ("Read 30 min", "Exercise", "No sugar")
- For future days in the month, use done: false
Example: {"type":"habits","title":"Reading streak — June 2025","habit":"Read 30 min","month":"June 2025","days":[{"day":1,"done":true},{"day":2,"done":true},{"day":3,"done":false},{"day":4,"done":true},{"day":5,"done":true},{"day":6,"done":false},{"day":7,"done":true}]}
```

**bingo:**
```
You output ONLY valid JSON for a Bingo Card (no markdown fences, no commentary).
Schema:
{ "type": "bingo", "title": string, "squares": string[] }
RULES:
- "squares": EXACTLY 25 strings for a 5×5 grid, in reading order (row by row, left to right)
- Each square: short phrase, 1-4 words
- Traditional center square (index 12) is "FREE" unless the theme makes another choice obvious
- Make the squares thematic and fun — they should all relate to the title topic
Example: {"type":"bingo","title":"Startup Bingo","squares":["Pivoted twice","MVP in a week","YC rejection","Side project","10x engineer","Move fast","Disrupting","Synergy","AI wrapper","Blockchain","Hockey stick","Unicorn","FREE","Series A","Burn rate","Runway","Product-market fit","TAM SAM SOM","Cold email","Demo day","ARR","Exit strategy","Iterate","Founder mode","Zero to one"]}
```

**bracket:**
```
You output ONLY valid JSON for a Tournament Bracket (no markdown fences, no commentary).
Schema:
{ "type": "bracket", "title": string, "rounds": [{ "name": string, "matches": [{ "a": string, "b": string, "winner"?: string }] }] }
RULES:
- rounds are ordered from earliest to final (left to right)
- Standard power-of-2 sizes: 4 (2 rounds), 8 (3 rounds), 16 (4 rounds)
- "winner" is optional — omit for undecided matches
- Match count per round: halves each round (e.g. 4 matches → 2 matches → 1 final)
- Names: "Round of 16", "Quarterfinals", "Semifinals", "Final"
Example: {"type":"bracket","title":"Best JS Framework","rounds":[{"name":"Semifinals","matches":[{"a":"React","b":"Vue","winner":"React"},{"a":"Svelte","b":"Solid","winner":"Svelte"}]},{"name":"Final","matches":[{"a":"React","b":"Svelte"}]}]}
```

4. DIAGRAM_TYPE_DEFAULTS (append 4 entries with sensible starter JSON)

5. Build: `pnpm --filter @flowchart/core build` — must succeed.

---

### Task 3 — Renderer: add 4 layout components

**File:** `apps/web/components/diagrams/social-card-renderer.tsx`

Import the 4 new types. Add 4 cases to CardBody switch. Implement layouts:

#### BudgetLayout
Default palette (cycle through if no color on category):
`["#4f46e5","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316"]`

Visual: vertical list of category rows. Each row:
- Left: colored dot + label
- Center: horizontal bar proportional to percent (full width at 100%)
- Right: percent + optional amount

```tsx
function BudgetLayout({ card }: { card: BudgetCard }) {
  const PALETTE = ["#4f46e5","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316"];
  return (
    <div className="flex h-full flex-col">
      <CardTitle>{card.title}</CardTitle>
      {card.total && (
        <p className="mb-[3%] text-center text-[clamp(11px,2cqw,18px)] text-slate-500">
          Total: <span className="font-bold text-slate-800">{card.total}</span>
        </p>
      )}
      <div className="flex flex-1 flex-col justify-around gap-[2%]">
        {card.categories.map((cat, i) => {
          const color = cat.color ?? PALETTE[i % PALETTE.length];
          return (
            <div key={i} className="flex items-center gap-[3%]">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              <span className="w-[22%] shrink-0 text-[clamp(10px,1.8cqw,16px)] font-medium text-slate-700 truncate">{cat.label}</span>
              <div className="relative flex-1 rounded-full bg-slate-100" style={{ height: "clamp(8px,1.5cqw,14px)" }}>
                <div className="absolute left-0 top-0 h-full rounded-full transition-all" style={{ width: `${cat.percent}%`, backgroundColor: color }} />
              </div>
              <span className="w-[18%] shrink-0 text-right text-[clamp(10px,1.8cqw,15px)] font-semibold text-slate-700">
                {cat.amount ?? `${cat.percent}%`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

#### HabitsLayout
5-column × 7-row grid (7 cols for days of week feel, up to 35 slots for 31 days).
Actually use a 7-column wrapping grid. Slots 1-31 correspond to day numbers, the rest empty.

```tsx
function HabitsLayout({ card }: { card: HabitsCard }) {
  const doneSet = new Set(card.days.filter((d) => d.done).map((d) => d.day));
  const total = card.days.length > 0 ? Math.max(...card.days.map((d) => d.day), 1) : 31;
  const daysCount = Math.max(total, card.days.length > 0 ? Math.max(...card.days.map((d) => d.day)) : 1);
  const ACCENT = "#6366f1";
  return (
    <div className="flex h-full flex-col">
      <CardTitle>{card.title}</CardTitle>
      {card.month && (
        <p className="mb-[2%] text-center text-[clamp(10px,1.8cqw,16px)] text-slate-500">{card.month}</p>
      )}
      <div className="flex flex-1 flex-col justify-center gap-[1%]">
        <div className="grid grid-cols-7 gap-[1.5%]">
          {Array.from({ length: daysCount }, (_, i) => {
            const day = i + 1;
            const done = doneSet.has(day);
            return (
              <div key={day} title={`Day ${day}`}
                className={`flex aspect-square items-center justify-center rounded-md text-[clamp(7px,1.2cqw,11px)] font-semibold`}
                style={{ backgroundColor: done ? ACCENT : "#e2e8f0", color: done ? "#fff" : "#94a3b8" }}>
                {day}
              </div>
            );
          })}
        </div>
        <p className="mt-[2%] text-center text-[clamp(10px,1.8cqw,15px)] text-slate-600">
          <span className="font-bold" style={{ color: ACCENT }}>{card.days.filter((d) => d.done).length}</span>
          /{daysCount} days — {card.habit}
        </p>
      </div>
    </div>
  );
}
```

#### BingoLayout
5×5 grid. Pad to 25 with "?" if fewer squares provided.

```tsx
function BingoLayout({ card }: { card: BingoCard }) {
  const squares = [...card.squares];
  while (squares.length < 25) squares.push("?");
  const grid = squares.slice(0, 25);
  return (
    <div className="flex h-full flex-col">
      <CardTitle>{card.title}</CardTitle>
      <div className="flex-1 grid grid-cols-5 gap-[1.5%]">
        {grid.map((sq, i) => {
          const isCenter = i === 12;
          return (
            <div key={i}
              className={`flex items-center justify-center rounded-xl p-[3%] text-center text-[clamp(8px,1.4cqw,13px)] font-semibold leading-tight ${isCenter ? "text-white" : "bg-slate-50 text-slate-800"}`}
              style={isCenter ? { backgroundColor: "#4f46e5" } : { border: "2px solid #e2e8f0" }}>
              {sq}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

#### BracketLayout
Left-to-right columns, one column per round. Each match is a card with two entries.

```tsx
function BracketLayout({ card }: { card: BracketCard }) {
  return (
    <div className="flex h-full flex-col">
      <CardTitle>{card.title}</CardTitle>
      <div className="flex flex-1 items-center gap-[2%] overflow-hidden">
        {card.rounds.map((round, ri) => (
          <div key={ri} className="flex flex-1 flex-col justify-around gap-[3%]">
            <p className="text-center text-[clamp(9px,1.5cqw,13px)] font-bold uppercase tracking-wide text-slate-500">{round.name}</p>
            <div className="flex flex-col justify-around flex-1 gap-[4%]">
              {round.matches.map((match, mi) => (
                <div key={mi} className="rounded-xl border border-slate-200 overflow-hidden">
                  {[match.a, match.b].map((contestant, ci) => {
                    const isWinner = match.winner === contestant;
                    return (
                      <div key={ci}
                        className={`flex items-center px-[6%] py-[4%] text-[clamp(9px,1.6cqw,14px)] font-semibold ${ci === 0 ? "border-b border-slate-200" : ""}`}
                        style={isWinner ? { backgroundColor: "#4f46e5", color: "#fff" } : { color: "#475569" }}>
                        {contestant}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### Task 4 — Editor wiring

**File:** `apps/web/components/editor-client.tsx`
**File:** `apps/web/components/diagram-icon.tsx`

In editor-client.tsx: extend the social card canvas branch condition from 8 to 12 types.

In diagram-icon.tsx: add 4 icon entries:
- `budget`: `PieChart`
- `habits`: `CheckSquare`
- `bingo`: `Grid2X2` (or `LayoutGrid`)
- `bracket`: `Trophy`

---

### Task 5 — Viewer wiring

**Files:** share-viewer.tsx, embed-viewer.tsx, /s/[token]/page.tsx, /s/[token]/og/route.tsx

Add labels:
```ts
budget: "Budget Breakdown",
habits: "Habit Tracker",
bingo: "Bingo Card",
bracket: "Bracket",
```

Extend render branch conditions in share-viewer.tsx and embed-viewer.tsx to include all 12 social types.

---

### Task 6 — AI routing

**File:** `apps/web/app/api/ai/generate/route.ts`
**File:** `apps/web/app/app/editor/page.tsx`

- VALID_DIAGRAM_TYPES: append 4 types
- typeHints: add 4 entries
- Keyword routing rules (in the AI prompt routing block):
  ```
  budget → "budget", "spending", "expense breakdown", "income split", "where my money goes"
  habits → "habit tracker", "streak", "daily habit", "habit grid", "30 day challenge"
  bingo → "bingo", "bingo card"
  bracket → "bracket", "tournament", "single elimination", "who wins", "versus tournament"
  ```
- suggestedDiagramType enum: append 4 new values
- editor/page.tsx VALID_TYPES: append 4 types

---

### Task 7 — Templates

**File:** `apps/web/lib/templates.ts`

Add 4 templates (total will be 18):
```ts
{
  id: "budget_monthly",
  title: "Monthly budget breakdown",
  description: "Visualize where your money goes — income split across rent, food, savings, and more.",
  diagramType: "budget",
  themeId: "stage_pipeline",
  tag: "Finance",
  gradient: "from-emerald-500 via-teal-500 to-cyan-500",
  source: JSON.stringify({
    type: "budget", title: "Monthly Budget", total: "$5,000",
    categories: [
      { label: "Rent", percent: 36, amount: "$1,800" },
      { label: "Food", percent: 12, amount: "$600" },
      { label: "Transport", percent: 6, amount: "$300" },
      { label: "Savings", percent: 20, amount: "$1,000" },
      { label: "Other", percent: 26, amount: "$1,300" },
    ],
  }, null, 2),
},
{
  id: "habits_reading",
  title: "30-day reading streak",
  description: "A GitHub-style grid tracking your daily reading habit for the whole month.",
  diagramType: "habits",
  themeId: "stage_pipeline",
  tag: "Wellness",
  gradient: "from-indigo-500 via-blue-500 to-violet-500",
  source: JSON.stringify({
    type: "habits", title: "Reading streak — June 2025",
    habit: "Read 30 min", month: "June 2025",
    days: Array.from({ length: 30 }, (_, i) => ({ day: i + 1, done: Math.random() > 0.3 }))
      .map((d) => ({ day: d.day, done: [1,2,4,5,7,8,9,11,14,15,16,18,19,21,22,23,25,26,28,29].includes(d.day) })),
  }, null, 2),
},
{
  id: "bingo_startup",
  title: "Startup bingo card",
  description: "The classic startup buzzword bingo — print it out for your next pitch event.",
  diagramType: "bingo",
  themeId: "stage_pipeline",
  tag: "Fun",
  gradient: "from-amber-500 via-orange-500 to-yellow-400",
  source: JSON.stringify({
    type: "bingo", title: "Startup Bingo",
    squares: [
      "Pivoted twice","MVP in a week","YC rejection","Side project","10x engineer",
      "Move fast","Disrupting","Synergy","AI wrapper","Blockchain",
      "Hockey stick","Unicorn","FREE","Series A","Burn rate",
      "Runway","PMF","TAM SAM SOM","Cold email","Demo day",
      "ARR","Exit strategy","Iterate","Founder mode","Zero to one",
    ],
  }, null, 2),
},
{
  id: "bracket_frameworks",
  title: "JS framework bracket",
  description: "Who wins the ultimate JavaScript framework tournament? Fill in your own results.",
  diagramType: "bracket",
  themeId: "stage_pipeline",
  tag: "Engineering",
  gradient: "from-red-500 via-rose-500 to-pink-500",
  source: JSON.stringify({
    type: "bracket", title: "Best JS Framework",
    rounds: [
      { name: "Quarterfinals", matches: [
        { a: "React", b: "Angular", winner: "React" },
        { a: "Vue", b: "Ember", winner: "Vue" },
        { a: "Svelte", b: "Preact", winner: "Svelte" },
        { a: "Solid", b: "Qwik", winner: "Solid" },
      ]},
      { name: "Semifinals", matches: [
        { a: "React", b: "Vue", winner: "React" },
        { a: "Svelte", b: "Solid" },
      ]},
      { name: "Final", matches: [
        { a: "React", b: "Svelte" },
      ]},
    ],
  }, null, 2),
},
```

---

### Task 8 — Build + typecheck + commit

1. `pnpm --filter @flowchart/core build`
2. `pnpm test:unit` — 55 tests, 0 failures
3. `pnpm --filter @flowchart/web exec tsc --noEmit` — 0 errors
4. `pnpm --filter @flowchart/web build` — production build
5. Commit: `feat(social): add budget, habits, bingo, bracket card types (Phase 15)`

---

## Success criteria

- All 4 types render from a one-line prompt in the editor
- All 4 types appear in the templates gallery (18 total)
- tsc, build, unit tests green
- Pushed to master
