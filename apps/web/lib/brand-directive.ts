export type BrandPalette = { primary?: string; secondary?: string; accent?: string; background?: string };

/** Pure: build the BRAND PALETTE system-prompt directive, or "" if the palette is incomplete. */
export function formatBrandDirective(name: string, p: BrandPalette): string {
  if (!p.primary || !p.secondary || !p.accent) return "";
  return `BRAND PALETTE — the user's workspace defines a brand kit "${name}". When the diagram type involves color choices (echarts color arrays, mermaid theme overrides, reactflow node fills), use these colors:
- primary:   ${p.primary}
- secondary: ${p.secondary}
- accent:    ${p.accent}${p.background ? `\n- background: ${p.background}` : ""}
Use the brand colors for the most prominent visual elements (main series, primary nodes). Do not introduce unrelated colors. If a diagram type is text-only (e.g. plain mermaid flowchart with default theme), ignore this directive.
`;
}

/** Fetch the workspace's latest brand kit and format its directive. Best-effort: returns "" on any error. */
export async function buildBrandDirective(workspaceId: string): Promise<string> {
  try {
    const { db } = await import("@/lib/db");
    const { brandKits } = await import("@/lib/db/schema");
    const { eq, desc } = await import("drizzle-orm");
    const [row] = await db
      .select({ name: brandKits.name, paletteJson: brandKits.paletteJson })
      .from(brandKits)
      .where(eq(brandKits.workspaceId, workspaceId))
      .orderBy(desc(brandKits.createdAt))
      .limit(1);
    if (!row?.paletteJson) return "";
    return formatBrandDirective(row.name, JSON.parse(row.paletteJson) as BrandPalette);
  } catch {
    return "";
  }
}
