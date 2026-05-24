---
phase: 09-real-og-previews
status: complete
milestone: 1.3
---

# Summary: Phase 9 — Real OG Previews

## What Was Built

When a user clicks Share or Embed in the editor, the browser captures a PNG of the current diagram and ships it with the share-link create request. The OG image route then serves that real diagram preview instead of the generic branded card. Every link share now shows the actual diagram in social previews, Slack unfurls, etc.

## Architecture

Client-side capture (not server-side rendering) — avoids needing a headless browser on the backend. The PNG is stored as a data URL on the `share_link` row, capped at 400 KB on the server (380 KB warning on the client). If capture fails or is dropped, the OG route gracefully falls back to the existing branded `next/og` card.

## Key Changes

### `apps/web/lib/db/schema.ts` + `apps/web/lib/db/migrations/0001_share_preview.sql`
- New `preview_data_url` text column on `share_link`
- Idempotent migration: `ALTER TABLE … ADD COLUMN IF NOT EXISTS …`

### `apps/web/app/actions/share.ts`
- `createShareLink(projectId, previewDataUrl?)` — new optional second arg
- `sanitizePreview()` — rejects non-image data URLs and anything over 400 KB
- New `updateSharePreview(projectId, previewDataUrl)` — refresh the preview on an existing token without minting a new one (groundwork for later "regenerate preview" UX)

### `apps/web/app/s/[token]/og/route.tsx`
- New `decodeDataUrl()` helper
- If the row has a stored preview, returns `new NextResponse(bytes, { Content-Type, Cache-Control })` directly with the real PNG
- Otherwise falls through to the existing `ImageResponse` branded card (legacy share links still work)

### `apps/web/components/editor-client.tsx`
- New `captureSharePreview()` — uses the existing `frameRef` + `html-to-image`, targets 1200px width (≈ OG aspect), pixel ratio capped at 2, respects `data-no-export` filter, drops if > 380 KB
- `handleShare` and `handleCopyEmbed` now capture the preview before calling `createShareLink`
- Toast updated to "Share link copied · preview attached" on success

## Success Criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Sharing a Mermaid diagram and unfurling the link on Slack/Twitter shows the real diagram | ✓ (PNG served as og:image) |
| 2 | Capture failure does not break sharing | ✓ (try/catch + undefined → branded card fallback) |
| 3 | Storage cost stays bounded | ✓ (400 KB server cap, 380 KB client cap) |
| 4 | Legacy share links (no preview stored) still work | ✓ (fallback to ImageResponse) |
| 5 | No new infra (headless browser / object storage) required | ✓ (client capture + DB column) |

## key-files

### created
- `apps/web/lib/db/migrations/0001_share_preview.sql`
- `.planning/phases/09-real-og-previews/09-SUMMARY.md`

### modified
- `apps/web/lib/db/schema.ts`
- `apps/web/app/actions/share.ts`
- `apps/web/app/s/[token]/og/route.tsx`
- `apps/web/components/editor-client.tsx`
