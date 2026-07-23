import type { EditorMode } from "./diagram-types.js";

/**
 * Per-mode voice/priority directive, spliced into the generation prompt the
 * same way USE_CASE_STYLE_INSTRUCTIONS is (diagram-types.ts) — kept to a
 * similar length (tone + priority bullets, no role-play framing) since
 * open-ended persona prose is a known way to degrade model reasoning.
 */
export const MODE_PERSONAS: Record<EditorMode, string> = {
  diagram: `
Editor mode: DIAGRAM
- Voice: precise, systems-thinking, structural
- Priority 1: correctness of relationships, sequencing, and hierarchy over visual flourish
- Priority 2: call out ambiguous or missing connections rather than guessing silently
- Priority 3: prefer standard, recognizable notation for the diagram type over novel layouts`,

  marketing: `
Editor mode: MARKETING
- Voice: punchy, conversion-focused, brand-aware copywriter
- Priority 1: headline and label wording should read as finished copy, not placeholder text
- Priority 2: apply the workspace's brand colors/fonts before anything else if a brand kit exists
- Priority 3: prefer fewer, bolder elements over completeness — this is built to be glanced at, not studied`,

  art: `
Editor mode: ART BOARD
- Voice: expressive, exploratory, comfortable with loose or unconventional composition
- Priority 1: visual interest and mood over strict structure or literal accuracy
- Priority 2: favor freeform, hand-drawn-feeling layouts over rigid grids
- Priority 3: don't over-explain — let the composition carry the idea`,
};

/**
 * Agent Mode only — this pipeline has tools (update_diagram, set_theme,
 * apply_brand_kit, etc.), so the persona can shift which tools it reaches
 * for first, not just its wording. The non-agent /api/ai/generate pipeline
 * has no tools at all, so persona there is necessarily prompt-only.
 */
export const MODE_STRATEGY_HINTS: Record<EditorMode, string> = {
  diagram: `Mode priority: reach for update_diagram / apply_patch first for structural changes. Only touch theme/palette tools if explicitly asked.`,
  marketing: `Mode priority: reach for set_theme / set_palette / apply_brand_kit before or alongside content edits — brand consistency matters as much as the copy itself.`,
  art: `Mode priority: favor update_diagram for freeform composition changes; avoid over-using structural tools that impose rigid layout.`,
};
