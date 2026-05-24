import type { DiagramType } from "@flowchart/core";

/**
 * Tiny syntax highlighter for the editor's Source panel.
 *
 * Returns HTML where tokens are wrapped in <span class="hl-…">…</span>.
 * The textarea sits transparently on top of a <pre> rendering this HTML;
 * keystrokes feel native, colors apply visually. No dependencies.
 */

const MERMAID_KEYWORDS = new Set([
  "flowchart", "graph", "sequenceDiagram", "classDiagram", "stateDiagram",
  "stateDiagram-v2", "erDiagram", "journey", "gantt", "pie", "quadrantChart",
  "requirementDiagram", "gitGraph", "mindmap", "timeline", "sankey-beta",
  "block-beta", "xychart-beta",
  "subgraph", "end", "direction", "section", "title", "participant", "actor",
  "Note", "note", "loop", "alt", "else", "opt", "par", "rect", "activate",
  "deactivate", "dateFormat", "axisFormat", "class", "click", "callback",
  "link", "linkStyle", "style", "classDef",
]);

const MERMAID_DIRECTIONS = new Set(["TB", "TD", "BT", "RL", "LR"]);

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlightMermaid(source: string): string {
  // Line-comments first (// or %%)
  const lines = source.split("\n").map((line) => {
    if (/^\s*(%%|\/\/)/.test(line)) {
      return `<span class="hl-comment">${escapeHtml(line)}</span>`;
    }
    let s = escapeHtml(line);
    // Strings in quotes / brackets — keep simple
    s = s.replace(/"([^"]*)"/g, '<span class="hl-string">"$1"</span>');
    s = s.replace(/\[([^\]]+)\]/g, '<span class="hl-string">[$1]</span>');
    s = s.replace(/\{([^}]+)\}/g, '<span class="hl-string">{$1}</span>');
    // Arrows: -->, ->, ==>, -.->, etc.
    s = s.replace(/(--&gt;|-&gt;&gt;|-&gt;|==&gt;|-\.-&gt;|-\.-|--|==)/g, '<span class="hl-arrow">$1</span>');
    // Keywords + directions at word boundaries
    s = s.replace(/\b([A-Za-z][\w-]*)\b/g, (_, w: string) => {
      if (MERMAID_KEYWORDS.has(w)) return `<span class="hl-keyword">${w}</span>`;
      if (MERMAID_DIRECTIONS.has(w)) return `<span class="hl-direction">${w}</span>`;
      return w;
    });
    return s;
  });
  return lines.join("\n");
}

function highlightJson(source: string): string {
  // Use a single tokenizer pass on the escaped string for keys/strings/numbers/literals.
  const escaped = escapeHtml(source);
  return escaped.replace(
    /("(?:\\.|[^"\\])*")(\s*:)?|(\b-?\d+\.?\d*(?:[eE][+-]?\d+)?\b)|\b(true|false|null)\b/g,
    (m, str, colon, num, lit) => {
      if (str) {
        const cls = colon ? "hl-key" : "hl-string";
        return `<span class="${cls}">${str}</span>${colon ?? ""}`;
      }
      if (num) return `<span class="hl-number">${num}</span>`;
      if (lit) return `<span class="hl-literal">${lit}</span>`;
      return m;
    },
  );
}

export function highlightSource(source: string, diagramType: DiagramType): string {
  if (diagramType === "mermaid") return highlightMermaid(source);
  if (diagramType === "bpmn") return escapeHtml(source); // XML — keep plain
  return highlightJson(source);
}
