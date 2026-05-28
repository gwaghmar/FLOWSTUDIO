import assert from "node:assert/strict";
import { describe, it } from "node:test";

const TEMPLATE_KEYWORDS: { id: string; keywords: string[] }[] = [
  { id: "oauth-sequence",      keywords: ["oauth", "auth", "login", "sign in", "identity", "sso", "saml"] },
  { id: "onboarding-funnel",   keywords: ["funnel", "onboarding", "signup", "sign up", "activation", "user flow"] },
  { id: "system-architecture", keywords: ["architecture", "system design", "stack", "infra", "infrastructure", "backend"] },
  { id: "quarterly-revenue",   keywords: ["revenue", "quarterly", "bar chart", "kpi", "financial", "sales chart"] },
  { id: "blog-erd",            keywords: ["schema", "database", "erd", "entity", "relations", "table", "data model"] },
  { id: "release-roadmap",     keywords: ["roadmap", "gantt", "timeline", "sprint", "milestone", "release plan"] },
];

function matchTemplateId(prompt: string): string | null {
  const lower = prompt.toLowerCase();
  for (const { id, keywords } of TEMPLATE_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return id;
  }
  return null;
}

describe("matchTemplateId", () => {
  it("matches oauth flow prompt", () => {
    assert.equal(matchTemplateId("make me an oauth flow"), "oauth-sequence");
  });
  it("matches auth keyword", () => {
    assert.equal(matchTemplateId("how do I draw an auth diagram"), "oauth-sequence");
  });
  it("matches roadmap with gantt keyword", () => {
    assert.equal(matchTemplateId("gantt chart for Q3"), "release-roadmap");
  });
  it("matches erd with schema keyword", () => {
    assert.equal(matchTemplateId("database schema for a blog"), "blog-erd");
  });
  it("matches revenue chart", () => {
    assert.equal(matchTemplateId("show quarterly revenue"), "quarterly-revenue");
  });
  it("returns null for unmatched prompt", () => {
    assert.equal(matchTemplateId("draw me a mind map"), null);
  });
  it("is case-insensitive", () => {
    assert.equal(matchTemplateId("OAuth Login FLOW"), "oauth-sequence");
  });
});
