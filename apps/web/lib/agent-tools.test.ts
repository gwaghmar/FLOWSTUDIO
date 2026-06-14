import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyPatch, isValidJson } from "./agent-tools.ts";

describe("isValidJson", () => {
  it("accepts well-formed JSON", () => {
    assert.equal(isValidJson('{"nodes":[]}'), true);
    assert.equal(isValidJson("[1,2,3]"), true);
  });
  it("rejects malformed JSON", () => {
    assert.equal(isValidJson('{"nodes":[}'), false);
    assert.equal(isValidJson("not json"), false);
  });
});

describe("applyPatch", () => {
  it("replaces a single occurrence and reports count", () => {
    const r = applyPatch("color: red", "red", "blue");
    assert.equal(r.source, "color: blue");
    assert.equal(r.replaced, 1);
  });

  it("replaces ALL occurrences (not just the first)", () => {
    const r = applyPatch("a x a x a", "a", "Z");
    assert.equal(r.source, "Z x Z x Z");
    assert.equal(r.replaced, 3);
  });

  it("returns replaced:0 and unchanged source when find is absent", () => {
    const r = applyPatch("hello world", "missing", "x");
    assert.equal(r.source, "hello world");
    assert.equal(r.replaced, 0);
  });

  it("treats empty find as a no-op", () => {
    const r = applyPatch("hello", "", "x");
    assert.equal(r.source, "hello");
    assert.equal(r.replaced, 0);
  });

  it("does not interpret regex metacharacters in find", () => {
    const r = applyPatch("price is $5 (USD)", "$5 (USD)", "$9 (EUR)");
    assert.equal(r.source, "price is $9 (EUR)");
    assert.equal(r.replaced, 1);
  });
});
