import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchTemplateId } from "./template-match.ts";

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
