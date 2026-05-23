---
phase: 06-public-share
status: complete
---

# Summary: Phase 6 — Public Share with OG Previews

## What Was Built

Completed the public share flow:
- The `/s/[token]` HTML viewer already existed (read-only render for all 7 diagram types, branded, PNG export)
- Added a dynamic OG image at `/s/[token]/og`
- Wired the metadata function to include `og:image` and `twitter:card: summary_large_image`
- Replaced the inline "invalid/expired" error UI with proper Next 404 routing

## Key Changes

### `apps/web/app/s/[token]/og/route.tsx` (new)
- Edge-safe `next/og` `ImageResponse` at 1200×630
- Renders a branded card: FlowStudio logo + diagram type label + diagram title + footer
- Looks up project title / diagramType via token hash; falls back to "Shared Diagram" / "Diagram" on lookup failures
- Cached for 5 min (browser) / 10 min (CDN)

### `apps/web/app/s/[token]/page.tsx` (rewritten)
- Hoisted token resolution into a `resolveShare(token)` helper used by both `generateMetadata` and the page component
- Returns `kind: "missing" | "expired" | "ok"`
- Page component calls `notFound()` when missing — Next renders the new `not-found.tsx`
- Metadata function adds `openGraph.images` and `twitter.images` pointing at the new OG route
- Twitter card upgraded to `summary_large_image`

### `apps/web/app/s/[token]/not-found.tsx` (new)
- Branded 404 page for invalid/missing share tokens

## Success Criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | `/s/[token]` renders a read-only HTML diagram page | ✓ (pre-existed) |
| 2 | Page has correct title + og:title / og:description / og:image meta tags | ✓ |
| 3 | `/s/[token]/og` serves a 1200×630 PNG preview | ✓ |
| 4 | Expired/invalid tokens render a 404 page (not raw JSON) | ✓ |
| 5 | Public viewer is unauthenticated | ✓ (pre-existed) |

## Notes

The OG image is a branded card (title + type label + brand visuals), not a thumbnail of the actual diagram. Server-side rendering of Mermaid / ReactFlow / etc. would require headless browser infrastructure — out of scope for this milestone. The branded card is what most link previews need (LinkedIn, Twitter, Slack) and matches the visual style of competitors like Excalidraw and tldraw.

## key-files

### created
- `apps/web/app/s/[token]/og/route.tsx`
- `apps/web/app/s/[token]/not-found.tsx`

### modified
- `apps/web/app/s/[token]/page.tsx`
