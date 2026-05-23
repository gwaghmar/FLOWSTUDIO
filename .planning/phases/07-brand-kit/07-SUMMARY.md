---
phase: 07-brand-kit
status: complete
---

# Summary: Phase 7 — Brand Kit

## What Was Built

Surfaced the existing `brand_kit` table with workspace-scoped CRUD, a settings UI for managing primary/secondary/accent/background colors, and a one-click "Apply" button in the editor that writes the brand palette into the active diagram's custom-color state.

## Key Changes

### `apps/web/app/actions/brand-kit.ts` (new)
- `BrandPalette` type: { primary, secondary, accent, background? } (all hex)
- `getBrandKit()` — returns latest workspace kit (parses palette JSON, returns null if missing)
- `saveBrandKit({ name, palette })` — upsert by workspace; validates hex colors; updates if a row exists, otherwise inserts
- `getDefaultBrandPalette()` — returns the indigo/violet default

### `apps/web/components/settings/brand-kit-panel.tsx` (new)
- Client component with name field + 4 hex color pickers (color input + text input synced)
- Live preview swatch
- Submit via server action through `useTransition`; shows saved-at timestamp + error messages
- "Save brand kit" / "Update brand kit" depending on whether one exists

### `apps/web/app/app/settings/page.tsx`
- Imports `getBrandKit` and `BrandKitPanel`
- Loads the kit server-side; renders the panel between Billing and REST API keys

### `apps/web/components/editor-client.tsx`
- Imports `getBrandKit`
- New state: `applyingBrand`
- New `handleApplyBrandKit` callback — fetches the kit, records undo, sets `customAccent` (primary), `customBackground`, and `paletteId = "brand"`; toasts the kit name; "No brand kit yet" toast when none exists
- New Palette-icon button in the toolbar (left of History) wired to the handler

## Success Criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | "Brand kit" section in /app/settings with 4 color pickers + Save | ✓ |
| 2 | Brand kit is workspace-scoped (one active per workspace) | ✓ (upsert by workspace) |
| 3 | "Apply brand kit" button in the editor swaps the active palette | ✓ (Palette icon in toolbar) |
| 4 | Palette persists with the project | ✓ (existing UiState persistence covers this) |
| 5 | Empty-state CTA when no kit | ✓ (toast: "No brand kit yet — set one in Settings"); panel itself defaults to indigo/violet |

## key-files

### created
- `apps/web/app/actions/brand-kit.ts`
- `apps/web/components/settings/brand-kit-panel.tsx`

### modified
- `apps/web/app/app/settings/page.tsx`
- `apps/web/components/editor-client.tsx`
