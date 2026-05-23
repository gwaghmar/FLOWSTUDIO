# Milestone 1.2 — Brand & Distribution

**Status:** In progress
**Started:** 2026-05-23

## Goal

Give solo creators a single place to lock in their brand and one-click distribution paths beyond download.

## Phases

### Phase 7 — Brand Kit
The `brand_kit` table already exists (workspace-scoped: `paletteJson`, `logoObjectKey`). Surface it with CRUD actions and a settings UI; allow one-click apply to the active diagram so palette/accent become the diagram's theme overrides.

**Success criteria:**
1. New "Brand kit" section in `/app/settings` with color pickers for primary, secondary, accent + a Save button
2. Brand kit is workspace-scoped (one active kit per workspace for now)
3. "Apply brand kit" button in the editor swaps the active palette to the brand colors
4. Palette persists with the project (no reset on reload)
5. Empty state when no kit exists, with a single CTA to create one

### Phase 8 — Iframe Embeds
Same token system as `/s/[token]`, but serves a chromeless viewer suitable for `<iframe>` embedding.

**Success criteria:**
1. `/embed/[token]` route renders the diagram with no header, no badge — just the diagram filling the viewport
2. `X-Frame-Options` allows embedding (no `DENY`); CSP allows iframing
3. "Copy embed code" action in the editor's share dropdown outputs `<iframe src="…/embed/TOKEN" width=… height=… frameborder=0></iframe>`
4. Embed uses the project's brand kit palette (Phase 7 integration)
5. Expired or invalid tokens render a small inline error in the iframe

## Decisions

| ID | Decision | Context |
|----|----------|---------|
| M12-D-01 | One active brand kit per workspace (no list UI) | Solo creators have one brand; multi-kit UX is overkill |
| M12-D-02 | Brand kit applies via existing palette/theme override system, not a new theme | The palette state on a project is already persisted; brand kit just writes to it |
| M12-D-03 | Embed route reuses the same token table as `/s/[token]` | One share, two surfaces — no separate "embed tokens" needed |
| M12-D-04 | Embed allows `<iframe>` framing globally (no domain allowlist) | Solo creators embed on Notion, blogs, docs — restricting domains would block them |
