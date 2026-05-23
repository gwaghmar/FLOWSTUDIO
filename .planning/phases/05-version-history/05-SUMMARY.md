---
phase: 05-version-history
status: complete
---

# Summary: Phase 5 — Persistent Version History

## What Was Built

Surfaced the existing `revisions` table as a History sidebar in the editor with click-to-restore. Revisions are auto-labeled by source (Initial / Manual edit / AI patched / AI regenerated / Restored revision).

## Key Changes

### `apps/web/app/actions/project.ts`
- `saveProject` now accepts an optional `revisionLabel` arg and persists `createdBy` on every new revision
- `listRevisions(projectId, limit?)` — workspace-scoped, ordered by `createdAt desc`, returns id/label/createdAt
- `restoreRevision(projectId, revisionId)` — copies the revision's source onto the project, creates a new "Restored revision from …" revision on top, returns `{ source }`

### `apps/web/components/editor-client.tsx`
- New state: `pendingRevisionLabel`, `historyOpen`, `revisions`, `revisionsDirty`, `restoringId`
- `useChat.onFinish` sets `pendingRevisionLabel` to `AI patched: <prompt>` or `AI regenerated: <prompt>`
- `handleSave` passes the pending label and bumps `revisionsDirty`; resets the label after save
- New `useEffect` fetches revisions when the History menu opens or after a mutation
- New `handleRestore` action that records undo, loads the restored source, refreshes the list
- New "History" dropdown in the toolbar (Clock icon) — renders the revision list, click an entry to restore
- Disabled before first save (no project id yet)

## Success Criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | History sidebar listing all revisions newest-first | ✓ |
| 2 | Each entry shows timestamp + auto-generated label | ✓ |
| 3 | Click to restore creates a new revision on top (history preserved) | ✓ |
| 4 | Revisions auto-labeled by context (AI / manual / restored / initial) | ✓ |
| 5 | List capped at 50 | ✓ (`listRevisions` default limit) |

## key-files

### modified
- `apps/web/app/actions/project.ts`
- `apps/web/components/editor-client.tsx`
