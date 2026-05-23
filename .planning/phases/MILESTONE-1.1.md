# Milestone 1.1 — AI Iteration & Sharing

**Status:** Planning
**Started:** 2026-05-23

## Goal

Turn one-shot AI generation into an iterative loop and make diagrams shareable as public links with previews.

## Phases

### Phase 4 — Surgical AI Edits
Follow-up prompts should patch the existing diagram, not regenerate from scratch. "Make step 3 simpler", "add an error path after Validate", "rename Frontend to Web App" — the model receives the current source and produces a minimal targeted change.

**Success criteria:**
1. After a diagram exists, sending "rename X to Y" preserves all other nodes/structure and changes only X's label
2. "Add an error branch after Validate" inserts new nodes without disturbing the happy path
3. The editor sends a `mode: "patch"` flag for follow-up messages once `source` is non-empty
4. The patch prompt instructs the model to keep existing IDs/structure unless explicitly asked to change them
5. A full "regenerate" option is still available as a toolbar action

### Phase 5 — Persistent Version History
Use the existing `revisions` table to give users a history sidebar with restore.

**Success criteria:**
1. Editor has a "History" sidebar listing all revisions for the project, newest first
2. Each entry shows timestamp + auto-generated label ("AI: added error path", "Manual edit", "Initial")
3. Clicking a revision restores its source into the editor (creates a new revision on top, doesn't destroy history)
4. Revisions are auto-labeled based on context (AI generation, manual save, AI patch)
5. Revision list is paginated or capped at the last 50

### Phase 6 — Public Share with OG Previews
Build the public HTML viewer + OG image so share links work end-to-end as link previews.

**Success criteria:**
1. `/share/[token]` renders a read-only HTML page with the diagram (no editor chrome)
2. Page has correct `<title>` and `og:title` / `og:description` / `og:image` meta tags
3. `/share/[token]/og.png` serves a PNG preview rendered from the diagram source
4. Expired or invalid tokens render a 404 page (not raw JSON)
5. Public viewer is unauthenticated — share token alone grants read access

## Decisions

| ID | Decision | Context |
|----|----------|---------|
| M11-D-01 | Surgical edits via prompt change, not a new model architecture | The current 2-pass pipeline can carry the existing source as context — no new model wiring needed |
| M11-D-02 | Revisions already exist on save; this milestone just exposes them | No schema migration required |
| M11-D-03 | Public share is one URL serving HTML + OG image, not two separate routes | Both resolve from the same token; OG is a sub-path |
| M11-D-04 | Patch mode is the default once a diagram exists; full regen is an explicit button | Most follow-ups are tweaks, not restarts |
