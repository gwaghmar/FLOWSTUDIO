import type { DiagramCategory, DiagramType } from "./diagram-types.js";
import { getDiagramTypeMeta } from "./diagram-types.js";

export interface FollowUpCandidate {
  text: string;
  /** Lowercase keywords — skip this suggestion if any already appear in the generated source */
  excludeIfSourceContains?: string[];
}

/**
 * Deterministic, authored follow-up suggestions — not model-generated.
 * Modeled on VS Code Copilot Chat's ChatFollowup pattern: canned candidates,
 * filtered against the actual output, rather than an LLM guessing blind
 * before the diagram exists.
 */
const FOLLOWUP_BY_CATEGORY: Record<DiagramCategory, FollowUpCandidate[]> = {
  technical: [
    { text: "Add a legend", excludeIfSourceContains: ["legend"] },
    { text: "Try a dark theme", excludeIfSourceContains: ["dark"] },
    { text: "Simplify to fewer steps" },
    { text: "Group related nodes into subgraphs", excludeIfSourceContains: ["subgraph"] },
  ],
  flowchart: [
    { text: "Auto-layout the nodes" },
    { text: "Add a legend", excludeIfSourceContains: ["legend"] },
    { text: "Simplify to fewer steps" },
    { text: "Color-code by status" },
  ],
  data: [
    { text: "Switch to a dark theme", excludeIfSourceContains: ["dark"] },
    { text: "Add data labels" },
    { text: "Try a different chart type" },
    { text: "Highlight the key trend" },
  ],
  business: [
    { text: "Add swimlanes", excludeIfSourceContains: ["swimlane", "lane"] },
    { text: "Simplify to fewer steps" },
    { text: "Add a legend", excludeIfSourceContains: ["legend"] },
  ],
  whiteboard: [
    { text: "Add more detail" },
    { text: "Try a different color scheme" },
    { text: "Tidy up the layout" },
  ],
  social: [
    { text: "Generate a dark variant", excludeIfSourceContains: ["dark"] },
    { text: "Try a punchier headline" },
    { text: "Export 3 sizes (IG · LinkedIn · X)" },
    { text: "Match it to the brand kit" },
  ],
};

export function getFollowUpSuggestions(diagramType: DiagramType, finalSource: string, max = 3): string[] {
  const category = getDiagramTypeMeta(diagramType).category;
  const candidates = FOLLOWUP_BY_CATEGORY[category] ?? [];
  const lowerSource = finalSource.toLowerCase();
  return candidates
    .filter((c) => !c.excludeIfSourceContains?.some((kw) => lowerSource.includes(kw)))
    .map((c) => c.text)
    .slice(0, max);
}
