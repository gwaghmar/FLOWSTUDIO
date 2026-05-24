---
phase: 11-ai-brand-templates
status: complete
milestone: 1.3
---

# Summary: Phase 11 — AI-aware Brand Kit + Templates Gallery

## What Was Built

Two distinct additions that ship together:

1. **AI honors the workspace brand kit.** The AI generation route now fetches the workspace's saved brand kit and injects a `BRAND PALETTE` directive into the generation prompt. Color-sensitive diagram types (echarts, mermaid theme overrides, reactflow node fills) get the user's colors automatically.

2. **Templates gallery.** New `/app/templates` route with six hand-crafted starter diagrams across mermaid (flowchart, sequence, ER, gantt, architecture) and echarts (bar chart). Each card has a gradient hero, type tag, description, and a "Use this template" form that forks the template into the user's workspace as a new project.

## Key Changes

### AI Brand-Awareness — `apps/web/app/api/ai/generate/route.ts`
- Import `brandKits` schema + `desc` from drizzle-orm
- After `ensureUserAndWorkspace`, query the workspace's most recent brand kit
- Parse `paletteJson`; if valid, build a `brandDirective` block listing primary/secondary/accent/background hex values with instructions for which elements to apply them to
- Prepend `brandDirective` to `generationInstruction` (the system-prompt addendum already shipped for patch mode)
- Best-effort: any DB or parse failure silently produces an empty directive — generation continues unaffected

### Templates Registry — `apps/web/lib/templates.ts` (new)
- `Template` type: id, title, description, diagramType, themeId, source, gradient (tailwind), tag
- `TEMPLATES` array with six curated entries:
  - User Onboarding Funnel (mermaid flowchart)
  - OAuth 2.0 Flow (mermaid sequence)
  - Web App Architecture (mermaid with subgraphs)
  - Quarterly Revenue (echarts bar)
  - Blog Schema (mermaid ER)
  - Quarterly Roadmap (mermaid gantt)
- `getTemplate(id)` helper

### Fork Action — `apps/web/app/actions/templates.ts` (new)
- `forkTemplate(templateId)` — mirrors `createProject` but reads from the registry. Inserts a `revision` labeled `Initial (forked from "X")` for clean history. Redirects to `/app/editor?id=<newProjectId>`.

### Gallery Page — `apps/web/app/app/templates/page.tsx` (new)
- Server-rendered, auth-gated (redirects to login if signed out)
- Three-column responsive grid of template cards
- Each card: gradient hero with type tag + title, description, "Use this template" button posting to `forkTemplate(id)`
- Back link to projects dashboard

### Dashboard Integration — `apps/web/app/app/page.tsx`
- Replaced the dormant "Search library soon" placeholder with a real "Browse all templates →" link pointing at `/app/templates`
- Removed unused `Search` icon import

## Success Criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | When workspace has a brand kit, AI-generated echarts uses those colors | ✓ (brandDirective in prompt) |
| 2 | When no brand kit, AI generation is unchanged | ✓ (directive is empty string fallback) |
| 3 | Templates gallery lists 6+ curated starters | ✓ |
| 4 | Clicking "Use this template" creates a new project pre-filled and opens the editor | ✓ |
| 5 | Forked projects show "Initial (forked from …)" as the first revision | ✓ |
| 6 | Dashboard exposes a way to reach the gallery | ✓ ("Browse all templates →") |

## Notes

The brand directive is bias, not a hard constraint — the model may still pick contrasting colors for accessibility (e.g., on bar charts with many series). That's intentional: brand colors as palette starting point, not a straitjacket.

Templates are static today. A future phase could let users publish their own diagrams as templates (would need moderation), but the curated approach gets the discovery surface to "good" without operational overhead.

## key-files

### created
- `apps/web/lib/templates.ts`
- `apps/web/app/actions/templates.ts`
- `apps/web/app/app/templates/page.tsx`
- `.planning/phases/11-ai-brand-templates/11-SUMMARY.md`

### modified
- `apps/web/app/api/ai/generate/route.ts`
- `apps/web/app/app/page.tsx`
