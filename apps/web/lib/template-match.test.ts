import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchTemplateId, TEMPLATE_KEYWORDS } from "./template-match.ts";
import { TEMPLATES } from "./templates.ts";

describe("matchTemplateId", () => {
  it("returns null when nothing matches", () => {
    assert.equal(matchTemplateId("draw me a cat playing piano"), null);
  });

  it("matches each template by a representative prompt", () => {
    const cases: Record<string, string> = {
      "onboarding-funnel": "map the new user onboarding flow",
      "oauth-sequence": "show the oauth login sequence",
      "system-architecture": "our backend system design and infrastructure",
      "quarterly-revenue": "quarterly revenue bar chart for the board",
      "blog-erd": "database schema for a blog with tables",
      "release-roadmap": "a gantt roadmap for next sprint",
      "timeline_startup_journey": "a timeline of our company journey",
      "versus_remote_office": "remote versus office comparison",
      "matrix_effort_impact": "an effort impact 2x2 quadrant",
      "funnel_saas_signup": "a conversion funnel with drop-off",
      "venn_design_engineering": "a venn diagram of the overlap",
      "tierlist_saas_tools": "a tier list ranking our tools",
      "iceberg_startup_work": "an iceberg of what people see vs hidden work",
      "alignment_developer": "a lawful good alignment chart of devs",
      "budget_monthly": "my monthly budget and spending breakdown",
      "habits_reading": "a habit tracker for my reading streak",
      "bingo_startup": "a startup buzzword bingo card",
      "bracket_frameworks": "a tournament bracket of frameworks",
      "cloud-aws-webapp": "an aws cloud architecture diagram",
      "startup-orgchart": "an org chart of our reporting structure",
    };
    for (const [id, prompt] of Object.entries(cases)) {
      assert.equal(matchTemplateId(prompt), id, `prompt "${prompt}" should match ${id}`);
    }
  });

  it("favors specific multi-word matches over generic single words", () => {
    assert.equal(matchTemplateId("let users sign in securely"), "oauth-sequence");
    assert.equal(matchTemplateId("a sales funnel with conversion funnel stages"), "funnel_saas_signup");
  });

  it("is case-insensitive", () => {
    assert.equal(matchTemplateId("OAuth LOGIN Flow"), "oauth-sequence");
  });

  it("every keyword entry points at a real template id", () => {
    const ids = new Set(TEMPLATES.map((t) => t.id));
    for (const { id } of TEMPLATE_KEYWORDS) {
      assert.ok(ids.has(id), `keyword entry "${id}" has no matching template`);
    }
  });

  it("covers all 20 templates", () => {
    assert.equal(TEMPLATE_KEYWORDS.length, 20);
    assert.equal(TEMPLATES.length, 20);
  });
});
