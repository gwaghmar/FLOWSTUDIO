export const TEMPLATE_KEYWORDS: { id: string; keywords: string[] }[] = [
  { id: "onboarding-funnel",        keywords: ["onboarding", "signup", "sign up", "activation", "user flow", "new user", "first run"] },
  { id: "oauth-sequence",           keywords: ["oauth", "auth", "login", "sign in", "authentication", "identity", "sso", "saml", "token exchange"] },
  { id: "system-architecture",      keywords: ["architecture", "system design", "tech stack", "infrastructure", "backend", "microservice", "deployment diagram"] },
  { id: "quarterly-revenue",        keywords: ["revenue", "quarterly", "bar chart", "kpi", "financial", "sales chart", "earnings"] },
  { id: "blog-erd",                 keywords: ["schema", "database", "erd", "entity relationship", "data model", "tables", "relational"] },
  { id: "release-roadmap",          keywords: ["roadmap", "gantt", "sprint", "release plan", "project plan", "schedule"] },
  { id: "timeline_startup_journey", keywords: ["timeline", "journey", "history", "chronology", "company story", "over time"] },
  { id: "versus_remote_office",     keywords: ["versus", "comparison", "compare", "side by side", "pros and cons", "head to head"] },
  { id: "matrix_effort_impact",     keywords: ["matrix", "2x2", "quadrant", "prioritization", "effort impact", "swot"] },
  { id: "funnel_saas_signup",       keywords: ["funnel", "conversion funnel", "drop-off", "signup funnel", "sales funnel", "pipeline stages"] },
  { id: "venn_design_engineering",  keywords: ["venn", "overlap", "shared", "intersection", "common ground", "two circles"] },
  { id: "tierlist_saas_tools",      keywords: ["tier list", "tierlist", "ranking", "s-tier", "rank", "best to worst"] },
  { id: "iceberg_startup_work",     keywords: ["iceberg", "hidden", "beneath the surface", "what people see", "under the surface"] },
  { id: "alignment_developer",      keywords: ["alignment chart", "lawful", "chaotic", "3x3 grid", "archetypes", "good evil"] },
  { id: "budget_monthly",           keywords: ["budget", "spending", "expenses", "money breakdown", "finances", "where my money"] },
  { id: "habits_reading",           keywords: ["habit tracker", "streak", "daily habit", "habit", "consistency", "calendar grid"] },
  { id: "bingo_startup",            keywords: ["bingo", "buzzword", "bingo card", "5x5 grid", "squares"] },
  { id: "bracket_frameworks",       keywords: ["bracket", "tournament", "knockout", "playoff", "single elimination", "march madness"] },
  { id: "cloud-aws-webapp",         keywords: ["aws", "cloud architecture", "cloud diagram", "serverless architecture", "vpc", "cloud infrastructure", "gcp", "azure"] },
  { id: "startup-orgchart",         keywords: ["org chart", "orgchart", "reporting structure", "reporting hierarchy", "who reports to", "team structure", "org structure"] },
];

/**
 * Pick the template whose keywords best match the prompt. Each matched keyword
 * scores by its word count, so specific multi-word phrases ("sign in") outweigh
 * generic single words ("auth"). Ties resolve to the earlier template in the list.
 */
export function matchTemplateId(prompt: string): string | null {
  const lower = prompt.toLowerCase();
  let bestId: string | null = null;
  let bestScore = 0;
  for (const { id, keywords } of TEMPLATE_KEYWORDS) {
    let score = 0;
    for (const k of keywords) {
      if (lower.includes(k)) score += k.split(" ").length;
    }
    if (score > bestScore) {
      bestScore = score;
      bestId = id;
    }
  }
  return bestId;
}
