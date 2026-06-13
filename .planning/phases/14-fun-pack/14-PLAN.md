# Phase 14 — Fun Pack (venn, tierlist, iceberg, alignment)

> Milestone 1.4 — Phase 2. Adds 4 more social card subtypes using the same
> architecture shipped in Phase 13. Infrastructure is fully in place; this is
> a purely additive pass.

---

## Context

Phase 13 shipped:
- `apps/web/lib/diagrams/social-cards.ts` — parse module with discriminated union ParseResult
- `apps/web/components/diagrams/social-card-renderer.tsx` — renderer with 4 layout components
- All wiring in editor, share, embed, og, templates, AI routing

Phase 14 extends ALL of those files with 4 new types. The pattern for each file
is identical to what was done in Phase 13 — just add entries.

---

## Data Schemas (source of truth for all tasks)

### venn
```json
{
  "type": "venn",
  "title": "Design vs Engineering",
  "sets": [
    { "label": "Design", "items": ["UX research", "Prototyping", "Visual craft"] },
    { "label": "Engineering", "items": ["Systems thinking", "Code", "Performance"] }
  ],
  "intersection": ["Communication", "Problem solving", "Empathy"]
}
```
- `sets`: exactly 2 entries (AI must produce exactly 2)
- `intersection`: string[] — items in the overlapping region
- `sets[].items`: items exclusively in that set
- No required `accent` (renderer can pick colors per set)

### tierlist
```json
{
  "type": "tierlist",
  "title": "Frontend Frameworks 2025",
  "tiers": [
    { "label": "S", "color": "#ef4444", "items": ["React", "Vue"] },
    { "label": "A", "color": "#f97316", "items": ["Svelte", "Solid"] },
    { "label": "B", "color": "#eab308", "items": ["Angular"] },
    { "label": "C", "color": "#22c55e", "items": ["jQuery", "Backbone"] },
    { "label": "D", "color": "#94a3b8", "items": ["Prototype.js"] }
  ]
}
```
- `tiers[].label`: short tier name (S/A/B/C/D or custom)
- `tiers[].color`: optional hex; renderer has defaults if omitted
- `tiers[].items`: string[] of items in that tier

### iceberg
```json
{
  "type": "iceberg",
  "title": "What users see vs what we built",
  "layers": [
    { "label": "Visible", "items": ["UI", "Speed", "Features"] },
    { "label": "Just below", "items": ["Auth", "API design", "Caching"] },
    { "label": "Deep", "items": ["Infrastructure", "Security", "Data model", "Observability"] }
  ]
}
```
- `layers`: 2–5 entries, ordered top-to-bottom (surface to deep)
- `layers[0]` = above water; subsequent layers sink deeper
- Each layer gets wider and darker in the visual

### alignment
```json
{
  "type": "alignment",
  "title": "Developer Alignment Chart",
  "xAxis": ["Lawful", "Neutral", "Chaotic"],
  "yAxis": ["Good", "Neutral", "Evil"],
  "cells": [
    { "x": 0, "y": 0, "label": "DevOps", "description": "Documents everything" },
    { "x": 1, "y": 0, "label": "Full Stack" },
    { "x": 2, "y": 0, "label": "10x Hacker", "description": "Ships at 3am" },
    { "x": 0, "y": 1, "label": "Tech Lead" },
    { "x": 1, "y": 1, "label": "Backend Dev" },
    { "x": 2, "y": 1, "label": "Cowboy Coder" },
    { "x": 0, "y": 2, "label": "Enterprise Arch" },
    { "x": 1, "y": 2, "label": "DBA" },
    { "x": 2, "y": 2, "label": "Sneaky PM" }
  ]
}
```
- `xAxis`: exactly 3 column labels (left→right)
- `yAxis`: exactly 3 row labels (top→bottom)
- `cells`: up to 9 entries; x/y are 0-indexed grid coords; `description` optional

---

## Tasks

### Task 1 — Parse module: add 4 types + tests

**File:** `apps/web/lib/diagrams/social-cards.ts`
**File:** `apps/web/lib/diagrams/social-cards.test.ts`

1. Add types:
   ```ts
   export type VennCard = {
     type: "venn";
     title: string;
     sets: Array<{ label: string; items: string[] }>;
     intersection: string[];
   };
   export type TierListCard = {
     type: "tierlist";
     title: string;
     tiers: Array<{ label: string; color?: string; items: string[] }>;
   };
   export type IcebergCard = {
     type: "iceberg";
     title: string;
     layers: Array<{ label: string; items: string[] }>;
   };
   export type AlignmentCard = {
     type: "alignment";
     title: string;
     xAxis: [string, string, string];
     yAxis: [string, string, string];
     cells: Array<{ x: number; y: number; label: string; description?: string }>;
   };
   ```

2. Update `SocialCardType` union: append `"venn" | "tierlist" | "iceberg" | "alignment"`

3. Update `SocialCard` union: append all 4 new card types

4. Add 4 cases to `parseSocialCard()` switch:
   - `venn`: parse `sets` as array (default []), parse `intersection` as strArr; sets items default to [] if missing
   - `tierlist`: parse `tiers` as array; `items` default to [], `color` if present; filter tiers without label; error if no tiers
   - `iceberg`: parse `layers` as array; `items` default to []; filter layers without label; error if no layers
   - `alignment`: parse `xAxis`/`yAxis` as string[3] (default ["","",""]); parse `cells` as array; clamp x to 0-2, y to 0-2; filter cells without label

5. Update `SOCIAL_CARD_TYPES` array to include 4 new types

6. Add tests in `social-cards.test.ts`:
   - venn: valid 2-set venn with intersection → parses correctly
   - tierlist: valid tier list → parses correctly; empty `items` array defaults to []
   - iceberg: valid layers → parses correctly; layer without label is filtered
   - alignment: valid 3×3 → parses; x/y clamped to 0-2
   - venn with missing `sets` → sets defaults to []
   - tierlist with no valid tiers → error

Run: `pnpm test:unit` must stay green.

---

### Task 2 — Core package: DiagramType + system prompts

**File:** `packages/core/src/diagram-types.ts`

1. DiagramType union — append: `"venn" | "tierlist" | "iceberg" | "alignment"`

2. DIAGRAM_TYPE_META — add 4 entries following the same shape as Phase 13 types:
   ```ts
   venn: { label: "Venn Diagram", category: "social", icon: "circle-intersection", aiOutputFormat: "social-json" },
   tierlist: { label: "Tier List", category: "social", icon: "list-ordered", aiOutputFormat: "social-json" },
   iceberg: { label: "Iceberg", category: "social", icon: "layers", aiOutputFormat: "social-json" },
   alignment: { label: "Alignment Chart", category: "social", icon: "grid-3x3", aiOutputFormat: "social-json" },
   ```

3. DIAGRAM_SYSTEM_PROMPTS — add 4 entries. Each must follow the ONLY-JSON contract
   (no markdown, no prose before/after, respond with ONLY valid JSON):

   **venn:**
   ```
   You are a JSON diagram generator for Venn diagrams.
   Respond with ONLY valid JSON — no markdown, no prose.

   Schema:
   {
     "type": "venn",
     "title": string,
     "sets": [{ "label": string, "items": string[] }, { "label": string, "items": string[] }],
     "intersection": string[]
   }

   Rules:
   - sets must have EXACTLY 2 entries
   - items in sets[] are exclusive to that side; intersection items appear in BOTH
   - aim for 3–6 items per zone; more than 8 items per zone hurts readability
   - title names the comparison (e.g. "Design vs Engineering")

   Example:
   { "type": "venn", "title": "Design vs Engineering", "sets": [{"label":"Design","items":["Visual craft","Prototyping","UX research"]},{"label":"Engineering","items":["Systems thinking","Performance","Code review"]}], "intersection": ["Communication","Problem solving","Empathy"] }
   ```

   **tierlist:**
   ```
   You are a JSON diagram generator for Tier Lists.
   Respond with ONLY valid JSON — no markdown, no prose.

   Schema:
   {
     "type": "tierlist",
     "title": string,
     "tiers": [{ "label": string, "color"?: string, "items": string[] }]
   }

   Rules:
   - use conventional labels: S, A, B, C, D (or domain-specific like "Must have", "Nice to have", "Skip")
   - default tier colors (omit color to use defaults): S=#ef4444, A=#f97316, B=#eab308, C=#22c55e, D=#94a3b8
   - 2–8 items per tier; rank from best (top) to worst (bottom)
   - tiers array ordered best→worst

   Example:
   { "type": "tierlist", "title": "Frontend Frameworks 2025", "tiers": [{"label":"S","items":["React","Vue"]},{"label":"A","items":["Svelte","Solid"]},{"label":"B","items":["Angular"]},{"label":"C","items":["jQuery"]}] }
   ```

   **iceberg:**
   ```
   You are a JSON diagram generator for Iceberg diagrams.
   Respond with ONLY valid JSON — no markdown, no prose.

   Schema:
   {
     "type": "iceberg",
     "title": string,
     "layers": [{ "label": string, "items": string[] }]
   }

   Rules:
   - layers ordered top to bottom (surface → deep); 2–5 layers
   - first layer = visible/surface; last = deepest/hidden
   - items per layer: 2–6; deeper layers often have more items
   - label names the depth level (e.g. "What users see", "Under the hood", "Dark secrets")

   Example:
   { "type": "iceberg", "title": "What users see vs what we built", "layers": [{"label":"Visible","items":["UI","Speed","Features"]},{"label":"Just below","items":["Auth","API","Caching"]},{"label":"Deep","items":["Infrastructure","Security","Data model","Observability"]}] }
   ```

   **alignment:**
   ```
   You are a JSON diagram generator for Alignment Charts (3×3 grid).
   Respond with ONLY valid JSON — no markdown, no prose.

   Schema:
   {
     "type": "alignment",
     "title": string,
     "xAxis": [string, string, string],
     "yAxis": [string, string, string],
     "cells": [{ "x": 0|1|2, "y": 0|1|2, "label": string, "description"?: string }]
   }

   Rules:
   - xAxis: 3 column labels left→right (e.g. ["Lawful","Neutral","Chaotic"])
   - yAxis: 3 row labels top→bottom (e.g. ["Good","Neutral","Evil"])
   - aim for all 9 cells filled; cells may be omitted for sparse grids
   - label: short name for that cell (2–3 words); description: optional one-liner
   - x=0 is leftmost column; y=0 is top row

   Example:
   { "type": "alignment", "title": "Developer Alignment Chart", "xAxis": ["Lawful","Neutral","Chaotic"], "yAxis": ["Good","Neutral","Evil"], "cells": [{"x":0,"y":0,"label":"DevOps","description":"Documents everything"},{"x":1,"y":0,"label":"Full Stack"},{"x":2,"y":0,"label":"10x Hacker","description":"Ships at 3am"},{"x":0,"y":1,"label":"Tech Lead"},{"x":1,"y":1,"label":"Backend Dev"},{"x":2,"y":1,"label":"Cowboy Coder"},{"x":0,"y":2,"label":"Enterprise Arch"},{"x":1,"y":2,"label":"DBA"},{"x":2,"y":2,"label":"Sneaky PM"}] }
   ```

4. DIAGRAM_TYPE_DEFAULTS — add 4 entries with sensible starter JSON (same schema as examples above)

5. Build: `pnpm --filter @flowchart/core build`
6. TypeCheck: `pnpm --filter @flowchart/web exec tsc --noEmit` — no new errors

---

### Task 3 — Renderer: add 4 layout components

**File:** `apps/web/components/diagrams/social-card-renderer.tsx`

1. Import new types from social-cards:
   ```ts
   import { ..., type VennCard, type TierListCard, type IcebergCard, type AlignmentCard } from "@/lib/diagrams/social-cards";
   ```

2. Add 4 cases to `CardBody` switch:
   ```ts
   case "venn": return <VennLayout card={card} />;
   case "tierlist": return <TierListLayout card={card} />;
   case "iceberg": return <IcebergLayout card={card} />;
   case "alignment": return <AlignmentLayout card={card} />;
   ```

3. Implement `VennLayout`:
   - Two overlapping colored circles using absolute positioning + mix-blend-mode
   - Left set: indigo (#4f46e5), right set: amber (#f59e0b), overlap center
   - Items displayed as small text inside each zone
   - Use a 3-column layout: left-only items | intersection items | right-only items
   - Circle headers with set labels
   - Text sizes: `clamp(11px,2cqw,19px)` for items

   Visual approach (HTML — no SVG needed):
   ```
   [Set A label]   [∩ label]   [Set B label]
   item            item         item
   item            item         item
   ```
   Two colored header bars, center column with intersection color, items listed below.
   This is cleaner than trying to render true overlapping circles in HTML.

4. Implement `TierListLayout`:
   - Default tier colors: S=#ef4444, A=#f97316, B=#eab308, C=#22c55e, D=#94a3b8, fallback=#94a3b8
   - Each tier = horizontal row: colored label box (fixed width, ~15% of card) + items as chips
   - Items as pill chips with light background matching tier color
   - Font sizes fluid with cqw; rows distributed evenly via `justify-around`

5. Implement `IcebergLayout`:
   - Visual: stacked trapezoid shapes, each layer wider at bottom
   - Layer 0 (top): smallest, lightest color (#bfdbfe — sky-200)
   - Each subsequent layer: wider, darker shade of blue
   - 3 layers: #bfdbfe → #60a5fa → #1d4ed8; 4 layers: add #1e3a5f; 5: add #0f172a
   - Layer label in bold, items as comma-separated or small chips inside the shape
   - Use `clip-path: polygon(x% 0%, 100-x% 0%, 100% 100%, 0% 100%)` for trapezoid;
     each layer's top inset = (n_remaining / total_layers) * 10%

   Simpler alternative (use if clip-path causes issues): plain rectangles that grow
   wider via `mx-auto` + decreasing margin, with blue gradient background classes.
   Use the simpler approach.

6. Implement `AlignmentLayout`:
   - 3×3 CSS grid
   - Column/row headers above and to the left
   - Each cell: label (bold) + optional description (small, muted)
   - Alternate cell background: `bg-slate-50` / `bg-white` in checkerboard
   - Header cells: `bg-slate-100` with axis labels centered, `text-slate-600`
   - Cell text: label `text-[clamp(11px,2cqw,18px)] font-semibold`, description `text-[clamp(9px,1.5cqw,13px)] text-slate-500`

---

### Task 4 — Editor wiring

**File:** `apps/web/components/editor-client.tsx`
**File:** `apps/web/components/diagram-icon.tsx`

#### editor-client.tsx

Find the canvas branch condition for social cards (from Phase 13):
```tsx
{(diagramType === "timeline" || diagramType === "versus" || diagramType === "matrix2x2" || diagramType === "funnel") && (
```

Extend to include all 8 social card types:
```tsx
{(diagramType === "timeline" || diagramType === "versus" || diagramType === "matrix2x2" || diagramType === "funnel" ||
  diagramType === "venn" || diagramType === "tierlist" || diagramType === "iceberg" || diagramType === "alignment") && (
```

No other changes needed in editor-client.tsx — the same `SocialCardRenderer` handles all 8 types.

#### diagram-icon.tsx

Add 4 icon imports from lucide-react and 4 iconMap entries:
- `venn`: `CircleDot` (or `Layers2`)
- `tierlist`: `ListOrdered`
- `iceberg`: `Triangle` (or `MountainSnow`)
- `alignment`: `Grid3x3`

Use whatever lucide icons are available and look most appropriate. Check lucide-react's icon list if unsure.

---

### Task 5 — Viewer wiring

**Files:**
- `apps/web/components/share-viewer.tsx`
- `apps/web/components/embed-viewer.tsx`
- `apps/web/app/s/[token]/page.tsx`
- `apps/web/app/s/[token]/og/route.tsx`

#### share-viewer.tsx + embed-viewer.tsx

In each file, find the social card render branch condition (from Phase 13) and extend it:
```tsx
// Before:
(diagramType === "timeline" || diagramType === "versus" || ...)
// After: add venn, tierlist, iceberg, alignment
```

Also add 4 entries to DIAGRAM_TYPE_LABELS:
```ts
venn: "Venn Diagram",
tierlist: "Tier List",
iceberg: "Iceberg",
alignment: "Alignment Chart",
```

#### page.tsx + og/route.tsx

Find TYPE_LABELS and add 4 entries:
```ts
venn: "Venn Diagram",
tierlist: "Tier List",
iceberg: "Iceberg",
alignment: "Alignment Chart",
```

---

### Task 6 — AI routing

**File:** `apps/web/app/api/ai/generate/route.ts`
**File:** `apps/web/app/app/editor/page.tsx`

#### generate/route.ts

1. VALID_DIAGRAM_TYPES array: append `"venn", "tierlist", "iceberg", "alignment"`

2. typeHints object: add 4 entries:
   ```ts
   venn: "Extract: the two groups/sets being compared and the traits/items they share vs. own exclusively. The intersection must be meaningfully shared.",
   tierlist: "Extract: the thing being ranked, the tier labels (S/A/B/C/D or custom), and which items belong in each tier. Order tiers best→worst.",
   iceberg: "Extract: what's visible/public vs. hidden/deep. Layer labels name the depth level. Deeper layers contain less-known or more complex items.",
   alignment: "Extract: the two axes (3 labels each) and which item belongs in each cell. Map every subject to one x,y coordinate in the 3×3 grid.",
   ```

3. Routing rules — add before the `default:` fallback. Follow the same pattern as Phase 13 rules. Find the block that says things like `if (lp.includes("funnel")...)`:
   ```ts
   if (lp.includes("venn") || lp.includes("overlap") || lp.includes("intersection")) suggested = "venn";
   if (lp.includes("tier list") || lp.includes("tier ") || lp.includes("ranking") || lp.includes("s tier") || lp.includes("a tier")) suggested = "tierlist";
   if (lp.includes("iceberg") || lp.includes("hidden depth") || lp.includes("above the surface") || lp.includes("below the surface")) suggested = "iceberg";
   if (lp.includes("alignment chart") || lp.includes("alignment grid") || lp.includes("3x3 grid") || lp.includes("lawful") || lp.includes("chaotic")) suggested = "alignment";
   ```

4. suggestedDiagramType enum string: extend the pipe-separated string to include `venn|tierlist|iceberg|alignment`

#### editor/page.tsx

Find VALID_TYPES array and append: `"venn", "tierlist", "iceberg", "alignment"`

---

### Task 7 — Templates

**File:** `apps/web/lib/templates.ts`

Add 4 templates to the TEMPLATES array after the existing 10:

```ts
{
  id: "venn_design_engineering",
  title: "Design vs Engineering",
  description: "Map shared skills and unique strengths between two disciplines — works for any cross-functional comparison.",
  diagramType: "venn",
  themeId: "stage_pipeline",
  tag: "Team",
  gradient: "from-indigo-500 via-violet-500 to-purple-500",
  source: JSON.stringify({
    type: "venn", title: "Design vs Engineering",
    sets: [
      { label: "Design", items: ["Visual craft", "Prototyping", "UX research"] },
      { label: "Engineering", items: ["Systems thinking", "Code review", "Performance"] }
    ],
    intersection: ["Communication", "Problem solving", "Empathy"],
  }, null, 2),
},
{
  id: "tierlist_saas_tools",
  title: "SaaS Tools Tier List",
  description: "Rate your stack from S-tier essentials to D-tier regrets — great for team retros or gear posts.",
  diagramType: "tierlist",
  themeId: "stage_pipeline",
  tag: "Tools",
  gradient: "from-red-500 via-orange-400 to-yellow-400",
  source: JSON.stringify({
    type: "tierlist", title: "Our SaaS Stack",
    tiers: [
      { label: "S", items: ["Linear", "Vercel", "Supabase"] },
      { label: "A", items: ["GitHub", "Figma", "Notion"] },
      { label: "B", items: ["Slack", "Loom"] },
      { label: "C", items: ["Jira", "Confluence"] },
    ],
  }, null, 2),
},
{
  id: "iceberg_startup_work",
  title: "Startup work iceberg",
  description: "What investors see vs the real iceberg of unglamorous work under the surface.",
  diagramType: "iceberg",
  themeId: "stage_pipeline",
  tag: "Story",
  gradient: "from-sky-400 via-blue-500 to-blue-900",
  source: JSON.stringify({
    type: "iceberg", title: "Startup work iceberg",
    layers: [
      { label: "What investors see", items: ["Revenue growth", "Product demos", "Press mentions"] },
      { label: "Just below the surface", items: ["Customer interviews", "Hiring", "Fundraising prep"] },
      { label: "Deep water", items: ["Late-night debugging", "Churn analysis", "Rewriting the auth flow again"] },
    ],
  }, null, 2),
},
{
  id: "alignment_developer",
  title: "Developer alignment chart",
  description: "The classic 3×3 alignment chart applied to developer archetypes — swap in your own cast.",
  diagramType: "alignment",
  themeId: "stage_pipeline",
  tag: "Fun",
  gradient: "from-slate-700 via-slate-600 to-slate-500",
  source: JSON.stringify({
    type: "alignment", title: "Developer Alignment Chart",
    xAxis: ["Lawful", "Neutral", "Chaotic"],
    yAxis: ["Good", "Neutral", "Evil"],
    cells: [
      { x: 0, y: 0, label: "DevOps", description: "Writes runbooks for fun" },
      { x: 1, y: 0, label: "Open Source Maintainer", description: "Responds to every issue" },
      { x: 2, y: 0, label: "10x Hacker", description: "Ships at 3am, no PR" },
      { x: 0, y: 1, label: "Tech Lead", description: "RFC-first, always" },
      { x: 1, y: 1, label: "Backend Dev", description: "Just writes the SQL" },
      { x: 2, y: 1, label: "Cowboy Coder", description: "YOLO to production" },
      { x: 0, y: 2, label: "Enterprise Architect", description: "Diagrams without code" },
      { x: 1, y: 2, label: "DBA", description: "Deletes your index" },
      { x: 2, y: 2, label: "Sneaky PM", description: "Moves the deadline quietly" },
    ],
  }, null, 2),
},
```

---

### Task 8 — Build + typecheck verification

1. `pnpm --filter @flowchart/core build` — must succeed
2. `pnpm --filter @flowchart/web exec tsc --noEmit` — no new errors (pre-existing unused-var warnings are acceptable)
3. `pnpm test:unit` — all tests green
4. `pnpm --filter @flowchart/web build` — production build must succeed

Commit all changes: `feat(social): add venn, tierlist, iceberg, alignment card types (Phase 14)`

---

## Execution notes

- Tasks 1 and 2 can be done in either order; Task 3 depends on Task 1 (imports the new types)
- Tasks 4, 5, 6, 7 depend on Task 2 (DiagramType union must include the new types for tsc to pass)
- Task 8 runs last
- Each task should be a single commit or part of the final combined commit at Task 8

## Success criteria

- All 4 types render from a one-line prompt in the editor
- All 4 types appear in the templates gallery
- tsc, build, unit tests all green
- Pushed to master
