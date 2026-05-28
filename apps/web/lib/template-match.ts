export const TEMPLATE_KEYWORDS: { id: string; keywords: string[] }[] = [
  { id: "oauth-sequence",      keywords: ["oauth", "auth", "login", "sign in", "identity", "sso", "saml"] },
  { id: "onboarding-funnel",   keywords: ["funnel", "onboarding", "signup", "sign up", "activation", "user flow"] },
  { id: "system-architecture", keywords: ["architecture", "system design", "stack", "infra", "infrastructure", "backend"] },
  { id: "quarterly-revenue",   keywords: ["revenue", "quarterly", "bar chart", "kpi", "financial", "sales chart"] },
  { id: "blog-erd",            keywords: ["schema", "database", "erd", "entity", "relations", "table", "data model"] },
  { id: "release-roadmap",     keywords: ["roadmap", "gantt", "timeline", "sprint", "milestone", "release plan"] },
];

export function matchTemplateId(prompt: string): string | null {
  const lower = prompt.toLowerCase();
  for (const { id, keywords } of TEMPLATE_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return id;
  }
  return null;
}
