export type MermaidThemeVariables = Record<string, string | undefined>;

export type FlowchartTheme = {
  id: string;
  name: string;
  description?: string;
  mermaidTheme: "base" | "dark" | "forest" | "neutral" | "default";
  themeVariables: MermaidThemeVariables;
};

const rounded = {
  radius: "8px",
};

/** Shared typography */
const fontSans =
  'ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function vars(partial: MermaidThemeVariables): MermaidThemeVariables {
  return {
    fontFamily: fontSans,
    ...partial,
  };
}

export const THEMES: FlowchartTheme[] = [
  {
    id: "stage_pipeline",
    name: "Stage pipeline",
    description: "FigJam-inspired phased blues → teal → purple → gold outcome",
    mermaidTheme: "base",
    themeVariables: vars({
      primaryColor: "#5b8def",
      primaryTextColor: "#0f172a",
      primaryBorderColor: "#3d6fd4",
      lineColor: "#94a3b8",
      secondaryColor: "#e2e8f0",
      tertiaryColor: "#f8fafc",
      background: "#f1f5f9",
      mainBkg: "#ffffff",
      nodeBorder: "#cbd5e1",
      clusterBkg: "#eff6ff",
      clusterBorder: "#93c5fd",
      titleColor: "#0f172a",
      edgeLabelBackground: "#ffffff",
      nodeTextColor: "#0f172a",
    }),
  },
  {
    id: "minimal_light",
    name: "Minimal light",
    mermaidTheme: "neutral",
    themeVariables: vars({
      primaryColor: "#18181b",
      primaryTextColor: "#fafafa",
      primaryBorderColor: "#27272a",
      lineColor: "#a1a1aa",
      secondaryColor: "#f4f4f5",
      tertiaryColor: "#fafafa",
      background: "#ffffff",
      mainBkg: "#ffffff",
      nodeBorder: "#e4e4e7",
      clusterBkg: "#fafafa",
      clusterBorder: "#d4d4d8",
      titleColor: "#18181b",
      edgeLabelBackground: "#ffffff",
      nodeTextColor: "#18181b",
    }),
  },
  {
    id: "ocean",
    name: "Ocean",
    mermaidTheme: "base",
    themeVariables: vars({
      primaryColor: "#0ea5e9",
      primaryTextColor: "#f0f9ff",
      lineColor: "#0369a1",
      secondaryColor: "#bae6fd",
      tertiaryColor: "#e0f2fe",
      background: "#ecfeff",
      mainBkg: "#ffffff",
      nodeBorder: "#7dd3fc",
      clusterBkg: "#cffafe",
      clusterBorder: "#22d3ee",
      titleColor: "#0c4a6e",
      edgeLabelBackground: "#ffffff",
      nodeTextColor: "#0c4a6e",
    }),
  },
  {
    id: "forest_calm",
    name: "Forest",
    mermaidTheme: "forest",
    themeVariables: vars({
      /* forest theme has defaults; overlay key vars */
      background: "#f0fdf4",
      mainBkg: "#ffffff",
      titleColor: "#14532d",
      nodeTextColor: "#14532d",
    }),
  },
  {
    id: "midnight",
    name: "Midnight",
    mermaidTheme: "dark",
    themeVariables: vars({
      background: "#0b1020",
      mainBkg: "#151b2e",
      primaryColor: "#818cf8",
      primaryTextColor: "#e0e7ff",
      lineColor: "#64748b",
      secondaryColor: "#1e293b",
      tertiaryColor: "#0f172a",
      nodeBorder: "#475569",
      titleColor: "#f1f5f9",
      nodeTextColor: "#e2e8f0",
      edgeLabelBackground: "#1e293b",
    }),
  },
  {
    id: "monochrome",
    name: "Black & white",
    mermaidTheme: "neutral",
    themeVariables: vars({
      primaryColor: "#171717",
      primaryTextColor: "#fafafa",
      primaryBorderColor: "#404040",
      lineColor: "#525252",
      secondaryColor: "#f5f5f5",
      tertiaryColor: "#fafafa",
      background: "#ffffff",
      mainBkg: "#ffffff",
      nodeBorder: "#262626",
      clusterBkg: "#f5f5f5",
      clusterBorder: "#a3a3a3",
      titleColor: "#0a0a0a",
      edgeLabelBackground: "#ffffff",
      nodeTextColor: "#171717",
    }),
  },
  {
    id: "sunset",
    name: "Sunset",
    mermaidTheme: "base",
    themeVariables: vars({
      primaryColor: "#f97316",
      primaryTextColor: "#fff7ed",
      lineColor: "#c2410c",
      secondaryColor: "#ffedd5",
      tertiaryColor: "#fff7ed",
      background: "#fffbeb",
      mainBkg: "#ffffff",
      nodeBorder: "#fdba74",
      clusterBkg: "#ffedd5",
      clusterBorder: "#fb923c",
      titleColor: "#7c2d12",
      edgeLabelBackground: "#ffffff",
      nodeTextColor: "#431407",
    }),
  },
  {
    id: "lavender",
    name: "Lavender",
    mermaidTheme: "base",
    themeVariables: vars({
      primaryColor: "#a78bfa",
      primaryTextColor: "#1e1b4b",
      lineColor: "#6d28d9",
      secondaryColor: "#ede9fe",
      tertiaryColor: "#f5f3ff",
      background: "#faf5ff",
      mainBkg: "#ffffff",
      nodeBorder: "#c4b5fd",
      clusterBkg: "#ede9fe",
      clusterBorder: "#8b5cf6",
      titleColor: "#3730a3",
      edgeLabelBackground: "#ffffff",
      nodeTextColor: "#312e81",
    }),
  },
  {
    id: "slate_pro",
    name: "Slate pro",
    mermaidTheme: "neutral",
    themeVariables: vars({
      primaryColor: "#334155",
      primaryTextColor: "#f8fafc",
      lineColor: "#64748b",
      secondaryColor: "#e2e8f0",
      tertiaryColor: "#f1f5f9",
      background: "#f8fafc",
      mainBkg: "#ffffff",
      nodeBorder: "#94a3b8",
      clusterBkg: "#f1f5f9",
      clusterBorder: "#64748b",
      titleColor: "#0f172a",
      edgeLabelBackground: "#ffffff",
      nodeTextColor: "#1e293b",
    }),
  },
  {
    id: "paper",
    name: "Paper",
    mermaidTheme: "neutral",
    themeVariables: vars({
      background: "#faf8f5",
      mainBkg: "#fffefb",
      primaryColor: "#57534e",
      primaryTextColor: "#fafaf9",
      lineColor: "#78716c",
      nodeBorder: "#a8a29e",
      clusterBkg: "#f5f5f4",
      clusterBorder: "#d6d3d1",
      titleColor: "#292524",
      nodeTextColor: "#44403c",
      edgeLabelBackground: "#fffefb",
    }),
  },
  {
    id: "neon_tech",
    name: "Neon tech",
    description: "High-contrast technical diagrams with electric cyan accent",
    mermaidTheme: "dark",
    themeVariables: vars({
      background: "#090d1a",
      mainBkg: "#0f172a",
      primaryColor: "#22d3ee",
      primaryTextColor: "#ecfeff",
      primaryBorderColor: "#06b6d4",
      lineColor: "#38bdf8",
      secondaryColor: "#1e293b",
      tertiaryColor: "#0b1224",
      nodeBorder: "#0ea5e9",
      clusterBkg: "#0b1326",
      clusterBorder: "#38bdf8",
      titleColor: "#e0f2fe",
      edgeLabelBackground: "#0f172a",
      nodeTextColor: "#cffafe",
    }),
  },
];

export function getTheme(id: string): FlowchartTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES.find((t) => t.id === "stage_pipeline") ?? THEMES[0];
}

export function buildMermaidConfig(theme: FlowchartTheme) {
  return {
    theme: theme.mermaidTheme,
    themeVariables: { ...rounded, ...theme.themeVariables },
  };
}

/** Theme ids as a non-empty tuple, for z.enum() in the agent route. */
export const THEME_IDS = THEMES.map((t) => t.id) as [string, ...string[]];
