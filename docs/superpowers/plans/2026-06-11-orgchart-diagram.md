# Org Chart Diagram — Phase 3 Implementation

**Goal:** Add an `orgchart` diagram type — an interactive xyflow tree of **person nodes**
(avatar initials + name + title) in a top-down reporting hierarchy — wired through the full
vertical (AI generate, editor, share, embed, OG). Reuses `xyflow-base`; no icon registry.

**Spec:** `docs/superpowers/specs/2026-06-11-orgchart-diagram-design.md`
**Roadmap:** `docs/superpowers/specs/2026-06-10-new-diagram-types-ROADMAP.md` (Phase 3 of 8)
**Pattern source:** erd (P2), cloud (P1).

## Source format `orgchart-json`
`{nodes, edges}`; node `data` = `{ label: name, title?: role, color?: accent }`; edges =
reporting lines (manager → report), top-down. Default ships **with explicit tree positions**
(unlike erd/cloud) so the starter renders as a tree on first load — auto-layout only fires
after AI generation, and a position-less default would render as a staircase.

## Tasks (all complete)
1. **Core** — union `| "orgchart"`; `aiOutputFormat` `| "orgchart-json"`; META (Org Chart,
   `users` icon, violet `#7c3aed`, business); `DIAGRAM_SYSTEM_PROMPTS.orgchart` (schema +
   top-down rule + exec-team few-shot); `DIAGRAM_TYPE_DEFAULTS.orgchart` (CEO → CTO/CFO/VP →
   2 directors, with positions).
2. **Renderer** — `orgchart-renderer.tsx`: `PersonNode` (accent avatar w/ initials, name,
   title), handles top(target)/bottom(source); `OrgChartRenderer`; `autoLayoutOrgChart` =
   `autoLayoutGraph(src, { rankdir:"TB", nodeWidth:180, nodeHeight:90, nodesep:40, ranksep:90 })`.
   Edges default sourceHandle "b" / targetHandle "t".
3. **Editor** — dynamic import; `onFinish` auto-layout via `cloudNeedsLayout`; `handleAutoLayout`
   branch; auto-layout button condition + title; `QUICK_PROMPTS.orgchart`; canvas render branch
   **with `w-full`** (the shared 0-width fix).
4. **AI + surfaces** — `VALID_DIAGRAM_TYPES` += orgchart; `typeHints.orgchart`;
   `suggestedDiagramType` enum + routing (moved "org chart / reporting structure / hierarchy"
   from reactflow → orgchart); share-viewer + embed-viewer branches; share-page + og-route
   `TYPE_LABELS`; `diagram-icon` (`orgchart → Users`); editor-page `VALID_TYPES`.
5. **Verify** — `tsc --noEmit` clean; `pnpm --filter @flowchart/web build` green;
   `pnpm test:unit` 32 pass. **Live headless Playwright:** canvas 996px (w-full holds),
   6 person nodes, 5 reporting edges, CEO above all reports (tree confirmed), drag-to-edit moves
   a node. Screenshot visually confirmed (avatars, names, titles, top-down lines).

## Notes
- The position-less default initially rendered as a staircase (CEO level with execs); caught
  in the live check and fixed by adding tree positions to the default.
- `w-full` was added to the orgchart wrapper from the start (the cloud/erd fix from P2).

## Next
Phase 4 (Mind map) — xyflow branch nodes, radial/tree layout — reuses `xyflow-base`.
