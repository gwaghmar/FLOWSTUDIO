import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatBrandDirective } from "./brand-directive.ts";

describe("formatBrandDirective", () => {
  it("includes primary/secondary/accent when all present", () => {
    const out = formatBrandDirective("Acme", { primary: "#111", secondary: "#222", accent: "#333" });
    assert.match(out, /BRAND PALETTE/);
    assert.match(out, /Acme/);
    assert.match(out, /#111/);
    assert.match(out, /#222/);
    assert.match(out, /#333/);
  });

  it("includes background only when provided", () => {
    const withBg = formatBrandDirective("Acme", { primary: "#111", secondary: "#222", accent: "#333", background: "#fff" });
    assert.match(withBg, /#fff/);
    const noBg = formatBrandDirective("Acme", { primary: "#111", secondary: "#222", accent: "#333" });
    assert.doesNotMatch(noBg, /background:/);
  });

  it("returns empty string when required colors are missing", () => {
    assert.equal(formatBrandDirective("Acme", { primary: "#111" }), "");
    assert.equal(formatBrandDirective("Acme", {}), "");
  });
});
