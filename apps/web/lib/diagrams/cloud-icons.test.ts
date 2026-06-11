import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveIconId, PROVIDER_COLORS } from "./cloud-icons.ts";

describe("resolveIconId", () => {
  it("maps a base token to itself", () => {
    assert.equal(resolveIconId("database"), "database");
  });
  it("maps a provider-specific alias to its base glyph", () => {
    assert.equal(resolveIconId("lambda"), "function");
    assert.equal(resolveIconId("s3"), "storage");
    assert.equal(resolveIconId("dynamodb"), "database");
  });
  it("is case-insensitive", () => {
    assert.equal(resolveIconId("Lambda"), "function");
  });
  it("falls back to box for unknown tokens", () => {
    assert.equal(resolveIconId("totally-unknown"), "box");
  });
  it("falls back to box for undefined service", () => {
    assert.equal(resolveIconId(undefined), "box");
  });
});

describe("PROVIDER_COLORS", () => {
  it("has a color for every provider", () => {
    for (const p of ["aws", "gcp", "azure", "generic"] as const) {
      assert.match(PROVIDER_COLORS[p], /^#[0-9a-fA-F]{6}$/);
    }
  });
});
