---
phase: 08-embeds
status: complete
---

# Summary: Phase 8 — Iframe Embeds

## What Was Built

Added a chromeless `/embed/[token]` route suitable for `<iframe>` embedding on blogs, Notion, Confluence, docs sites — same token system as `/s/[token]`. The editor's header gained a one-click "Embed" button that copies a ready-to-paste iframe snippet.

## Key Changes

### `apps/web/app/embed/[token]/page.tsx` (new)
- Server component; reuses the same `shareLinks` + `projects` token resolution as `/s/[token]`
- `notFound()` for missing tokens (renders `not-found.tsx`)
- Inline "embed link has expired" message for expired tokens (no chrome — fits inside the embed)
- `robots: noindex, nofollow` metadata to keep embed pages out of search

### `apps/web/app/embed/[token]/not-found.tsx` (new)
- Minimal "embed link is invalid" message, no app chrome

### `apps/web/components/embed-viewer.tsx` (new)
- Mirror of `share-viewer.tsx` but stripped down: no title bar, no PNG button, no "Made with FlowStudio" badge — just the diagram filling the viewport
- All 7 diagram types supported via the same dynamic-import renderers as the share viewer
- Mermaid diagrams centered with max-w/max-h to fit any iframe size
- Loading spinner + inline error fallback

### `apps/web/components/editor-client.tsx`
- New `handleCopyEmbed` callback — saves the project, mints a share token, copies a `<iframe src="…/embed/TOKEN" width=800 height=500 …></iframe>` snippet to the clipboard
- New Code2-icon "Embed" button in the header, next to "Share"

## Success Criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | `/embed/[token]` renders the diagram with no chrome | ✓ |
| 2 | Allows iframing (no X-Frame-Options:DENY) | ✓ (no global deny configured; Next 15 default permits) |
| 3 | "Copy embed code" outputs a paste-ready iframe snippet | ✓ |
| 4 | Embed uses the project's brand palette | ✓ (uses same `themeId` + embedded UI metadata as the editor; brand palette is part of the saved source) |
| 5 | Expired/invalid → inline error in iframe (not raw JSON) | ✓ |

## Notes

The embed route reuses the existing `shareLinks` table — a single token serves both the public viewer (`/s/[token]`) and the embed (`/embed/[token]`). Revoking a share link revokes both surfaces consistently.

## key-files

### created
- `apps/web/app/embed/[token]/page.tsx`
- `apps/web/app/embed/[token]/not-found.tsx`
- `apps/web/components/embed-viewer.tsx`

### modified
- `apps/web/components/editor-client.tsx`
