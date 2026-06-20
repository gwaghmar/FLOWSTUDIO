# FlowStudio UX/UI Overhaul — Design Spec
Date: 2026-06-20
Status: Approved (user confirmed mockups)

---

## Objective

Elevate all three user-facing surfaces (Home page, Editor, Templates) to a professional, distinctive design language. Inspired by MotherDuck.com — warm cream backgrounds, monospace headings, sharp corners, minimal color palette, high confidence typography.

---

## Design Language

### Color Tokens

```css
--cream:        #F5F0EA;   /* page background, primary */
--cream-dark:   #EDE8E1;   /* hover states, alternate sections */
--charcoal:     #1E1E1E;   /* primary text, dark CTA, footer */
--charcoal-mid: #383838;   /* secondary text */
--charcoal-light: #666666; /* muted text, nav links */
--indigo:       #4F46E5;   /* brand accent, links, badges */
--indigo-light: #818CF8;   /* indigo muted */
--border:       rgba(30,30,30,0.15); /* all borders */
--white:        #FFFFFF;   /* card backgrounds, canvas */
```

### Typography

Two fonts only:

| Token | Font | Use |
|---|---|---|
| `--mono` | DM Mono, monospace | Headings, nav, labels, badges, monospace UI |
| `--sans` | Inter | Body copy, descriptions, AI chat text |

**Type scale:**

| Element | Font | Size | Weight | Transform | Letter-spacing |
|---|---|---|---|---|---|
| H1 hero | DM Mono | 64px | 400 | uppercase | -0.01em |
| H2 section | DM Mono | 40px | 400 | uppercase | 0.01em |
| Eyebrow | DM Mono | 11px | 400 | uppercase | 0.14em |
| Body | Inter | 16–20px | 300 | none | normal |
| Label/badge | DM Mono | 10–12px | 400 | uppercase | 0.04–0.08em |
| Nav links | DM Mono | 13px | 400 | none | 0.01em |
| Code/source | DM Mono | 12px | 400 | none | normal |

### Borders & Shape

- **Border radius**: 2–4px across all interactive elements. No rounded pills except small status dots.
- **Border weight**: 1.5px solid `var(--border)` for containers; 1px for internal dividers.
- **No shadows** on flat backgrounds. Only `box-shadow` on floating elements (canvas diagram cards, dropdowns): `0 4px 24px rgba(0,0,0,0.08)`.

### Motion

- Hover transitions: `0.15s ease` on background, color, transform.
- Panel collapse/expand: `0.2s ease` on width.
- Card hover: `transform: translateY(-2px)` + box-shadow increase.

---

## Page 1 — Home Page

### Current problems
- Bare hero with no diagram showcase below the fold.
- No social proof, no feature explanation, no type showcase.
- Cold gray background feels generic.
- CTA copy is vague.

### New design

**Nav** (`<nav class="home-nav">`)
- Background: `var(--cream)`, border-bottom `1.5px solid var(--border)`, height 64px.
- Logo: red icon square (existing brand) + "FlowStudio" in DM Mono 15px.
- Links: Pricing / Docs / Templates / Sign in — DM Mono 13px, `var(--charcoal-light)`.
- CTA: `Open editor →` — `background: var(--charcoal)`, `color: white`, `border-radius: 2px`, `padding: 8px 18px`.

**Hero section**
- Background: `var(--cream)`. Centered, max-width 960px.
- Eyebrow: "AI DIAGRAM GENERATOR" in indigo, DM Mono 11px, letter-spacing 0.14em.
- H1: `DESCRIBE IT. GET A <em>DIAGRAM.</em> EXPORT ANYWHERE.` — 64px DM Mono, em = indigo.
- Subheading: Inter 20px weight 300, `var(--charcoal-light)`, max-width 560px.
- CTAs: `Open editor →` (filled charcoal) + `Browse templates` (outlined charcoal). 2px radius.
- Signed-in note: DM Mono 12px, muted, indigo link.

**Hero preview** (diagram screenshot card)
- White card with fake browser chrome (3 traffic-light dots + title).
- Two-column body: left = prompt text + "AI generated · Mermaid" chip; right = diagram mini-render.
- `box-shadow: 0 24px 80px rgba(0,0,0,0.12)`.

**Trust strip**
- Full-width, `background: var(--charcoal)`. "Supports" label + Mermaid / Excalidraw / ReactFlow / ECharts / BPMN / tldraw / + 16 more — DM Mono 12px, `#aaa`.

**Features section**
- Background: `var(--cream)`. Eyebrow + H2 + 3-column card grid.
- Cards: white, `1.5px solid var(--border)`, 4px radius, 28px padding.
- 3 cards: "AI picks the type" / "Edit with source or canvas" / "Export anywhere".

**22 types section**
- Background: `var(--cream-dark)`. Eyebrow + H2 + flex-wrap chip cloud.
- Each chip: DM Mono 12px, `1.5px solid var(--border)`, 2px radius. Highlighted chips (3–4 featured types) use `background: var(--charcoal); color: white`.

**Dark CTA section**
- Background: `var(--charcoal)`. White H2 + muted subtext + white-filled button.

**Footer**
- Background: `#111`. Logo left, nav links center, copyright right.
- Links: DM Mono 11px, `#555`.

---

## Page 2 — Editor

### Current problems
- Two stacked toolbars create confusion (top bar + secondary toolbar duplicating labels).
- AI panel always-visible at full width even when idle.
- "Free plan" badge buried between canvas controls.
- No way to collapse/expand panels — cramped when Source is open.
- Canvas background is plain white with no visual texture.

### New design

**Top bar** (single bar, height 52px, `background: var(--cream)`, `border-bottom: 1.5px solid var(--border)`)
- Left: Logo icon → project name (with dropdown chevron) → save status ("· Saved" in muted mono).
- Center: `Preview | Code` mode toggle — tab-style, active = white background + shadow.
- Right: `Share` + `Embed` (outlined, 2px radius) + `Publish ↗` (filled charcoal) + avatar circle.

**Single toolbar** (height 40px, `background: white`, `border-bottom: 1px solid var(--border)`)
Group layout left → right:
1. **Panel toggles**: `✦ AI Chat` | `</> Source` — text buttons, active = indigo.
2. Separator.
3. **Zoom**: `−` `100%` `+` `⊙ reset` — compact, mono 11px.
4. Separator.
5. **Type badge**: `⬡ Mermaid ▾` — indigo pill, `background: #EEF2FF`, `border: 1px solid #C7D2FE`.
6. Separator.
7. **Canvas tools**: theme picker `◑` / brand kit `⬡` / history `⟳`.
8. **Right-aligned**: `Free plan` amber badge → undo/redo → dark mode → settings.

Moving "Free plan" to the far right keeps it visible but out of the canvas-control flow.

**Editor body** (flex row, fills remaining height)

| Panel | Width | Collapsible | Background |
|---|---|---|---|
| AI Chat | 280px | Yes (← button) | `var(--cream)` |
| Canvas | flex: 1 | No | white + dot grid |
| Source | 340px | Yes (✕ button) | `#1E1E2E` (dark) |

**AI panel**
- Header: "AI CHAT" label + green status dot + collapse arrow.
- Empty state: indigo icon + title + subtitle (same as current, cleaned up).
- Input: white card with textarea + footer row (Agent chip / Regen chip / send button).
- Collapse: panel width animates to 0, toolbar `✦ AI Chat` button shows active state.

**Canvas**
- Background: `white` with `radial-gradient(circle, #D1D5DB 1px, transparent 1px)` dot grid, `background-size: 24px 24px`.
- Type label: top-left floating chip — DM Mono 10px, white bg, `1px solid var(--border)`, `border-radius: 2px`.
- Zoom controls: bottom-right floating card — `background: white`, `border: 1px solid var(--border)`, `border-radius: 4px`, `box-shadow: 0 2px 8px rgba(0,0,0,0.06)`.

**Source panel**
- Dark theme: `background: #1E1E2E`.
- Header: `</> Source` + language badge (`MERMAID`) + close `✕`.
- Code area: DM Mono 12px, line numbers in `#374151`, syntax colors: keywords = `#C084FC`, strings = `#86EFAC`, literals = `#FCA5A5`, comments = `#6B7280`.
- Footer: line/col indicator + "⌘Z to undo · Changes apply live".

---

## Page 3 — Templates

### Current problems
- No diagram preview in cards — can't tell what you'll get.
- No search or filter bar.
- Cards feel generic (colored block + text only).
- "Use this template" repeated identically on every card — no visual hierarchy.

### New design

**Nav** — same as home nav (reuse component).

**Header**
- `padding: 48px 40px 40px`. H1 "TEMPLATES" in DM Mono 40px + subtitle in Inter 16px weight 300.
- Right side: search input — `⌕ Search templates...` — `border: 1.5px solid var(--border)`, `border-radius: 2px`, white bg.

**Filter bar**
- Below header, `border-bottom: 1px solid var(--border)`, scrollable row.
- Chips: All / Flowchart / Sequence / Architecture / ERD / Charts / Social cards / BPMN / Org chart.
- Active chip: `background: var(--charcoal); color: white`.
- Inactive: white bg, charcoal border, `color: var(--charcoal-light)`.

**Card grid**
- `display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; padding: 40px`.
- Card: white, `border: 1.5px solid var(--border)`, `border-radius: 4px`, hover lifts `translateY(-2px)` + shadow.

**Card anatomy**
1. **Preview area** (160px tall, colored dark background per category) — mini diagram wireframe rendered in HTML/CSS matching the diagram type.
2. **Meta area**: tags row (category tag + type tag) + title (DM Mono 14px) + description (Inter 12px weight 300) + footer row.
3. **Footer row**: type badge left (`MERMAID` / `ECHARTS` / etc. in DM Mono 10px muted) + `Fork →` CTA button right (filled charcoal, 2px radius).

**Category color mapping** (preview area backgrounds):
- Product: `#1E1B4B` (deep indigo)
- Engineering: `#0C1A3A` (deep navy)
- Architecture: `#0F1117` (near-black)
- Reporting/Data: `#2D1B00` (deep amber)
- Planning: `#0F172A` (slate)
- Social: `#0D3333` (deep teal)

---

## Motion & Dynamic Elements

The UI must feel alive — not a static page. All animations use CSS `@keyframes` + transitions. No animation library needed except for panel spring physics (optional Framer Motion).

### Core keyframes to define in `globals.css`

```css
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.4; transform: scale(0.85); }
}
@keyframes bounce-dot {
  0%, 80%, 100% { transform: translateY(0); }
  40%           { transform: translateY(-6px); }
}
@keyframes spin-ring {
  to { transform: rotate(360deg); }
}
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes highlight-flash {
  0%, 100% { background: transparent; }
  30%      { background: rgba(79,70,229,0.12); }
}
@keyframes progress-bar {
  from { width: 0%; }
  to   { width: 100%; }
}
@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
```

### AI thinking & streaming

| State | Treatment |
|---|---|
| AI loading (before first token) | 3-dot bounce indicator in the chat area: `●  ●  ●` with `animation: bounce-dot 1.2s infinite`, each dot staggered by 0.15s |
| Streaming in progress | "Streaming" pill in toolbar: indigo background, white text, `animation: pulse-dot 1.5s infinite` on a small dot beside the text |
| Streaming text | Blinking cursor `|` appended at end of in-progress message (CSS `animation: cursor-blink 0.7s step-end infinite`) |
| Generation complete | Pill fades out, diagram fades in with `animation: fade-in-up 0.3s ease` |

### Loading / skeleton states

| Context | Treatment |
|---|---|
| Canvas while diagram renders | Full-canvas shimmer overlay: `background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%); background-size: 800px; animation: shimmer 1.5s infinite linear` |
| Templates cards loading | Each card replaced with shimmer skeleton (preview area + 3 text lines) |
| Project name in editor loading | Single shimmer bar 140px wide |

### Micro-interactions

| Element | Interaction |
|---|---|
| All buttons | `transform: scale(0.97)` on `mousedown`, `transition: transform 0.1s` |
| Template card hover | `transform: translateY(-2px)`, `box-shadow` increases, `transition: 0.15s ease` |
| Filter chip click | Quick `scale(0.95)` → `scale(1)` spring (CSS transition suffices) |
| AI panel collapse | `width: 280px → 0`, `opacity: 1 → 0` on contents, `transition: 0.2s ease` |
| Source panel open/close | Same — `width: 340px → 0`, `transition: 0.2s ease` |
| Nav CTA hover | `background: #333` transition, subtle `translateY(-1px)` |
| Type badge dropdown | Dropdown card fades in with `opacity: 0 → 1`, `translateY(-4px → 0)` |

### Status indicators

| Element | Treatment |
|---|---|
| Green dot "AI Chat" header | `animation: pulse-dot 2s infinite` — pulses when AI is active, solid when idle |
| Save status | "Saving…" shows a 14px rotating ring (`animation: spin-ring 0.8s linear infinite`); transitions to "Saved ✓" with `fade-in-up 0.2s` |
| Export progress | Thin 2px indigo bar under Export button animates from 0→100% (`animation: progress-bar Xs linear`) where X matches estimated export time (~1.5s) |
| Streaming pill | Indigo background + pulsing dot, positioned in the toolbar second row |

### Canvas life

| Element | Treatment |
|---|---|
| New diagram render | Diagram card fades in: `animation: fade-in-up 0.35s ease` |
| AI patch applied | Affected source lines flash briefly: `animation: highlight-flash 0.6s ease` on those `<span>` rows |
| Dot grid background | Static — do NOT animate. The diagram content provides enough motion. |

### Implementation notes

- All micro-interaction classes defined once in `globals.css`, applied via `className` in components.
- Streaming state driven by `aiLoading` from `useChat` (already available in `editor-client.tsx`).
- Skeleton components are simple `<div>` elements with a `skeleton` utility class — no library.
- Export progress bar: synthetic animation (CSS keyframe timed to match jsPDF render time) — not a real progress event, since jsPDF is synchronous.

---

## Implementation Scope

### Files to change

| File | Change |
|---|---|
| `apps/web/app/page.tsx` | Full home page redesign |
| `apps/web/app/globals.css` | Add CSS tokens (cream, charcoal, DM Mono import) |
| `apps/web/components/editor-client.tsx` | Toolbar consolidation, panel collapse, dot-grid canvas bg |
| `apps/web/app/app/templates/page.tsx` | Filter bar, search, card redesign |
| `apps/web/components/diagrams/` | No changes needed |

### Font import

Add to `globals.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Inter:wght@300;400;500;600&display=swap');
```

Or use `next/font/google` in the root layout.

### Out of scope

- No changes to diagram renderers.
- No changes to AI routes or server actions.
- No new diagram types.
- No dark mode redesign (existing dark mode stays; polish pass only if time allows).

---

## Success criteria

1. Home page has diagram showcase and feature explanation below the fold.
2. Editor has a single toolbar row (not two).
3. AI panel collapses to icon-only or zero width.
4. Source panel has a visible close/open toggle.
5. Templates page has a working filter bar and diagram preview in each card.
6. All three pages use `var(--cream)` background, DM Mono headings, and the consolidated color palette.
7. `tsc --noEmit` passes. `pnpm build` passes.
