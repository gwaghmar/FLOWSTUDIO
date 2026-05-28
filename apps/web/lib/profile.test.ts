import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { slugify } from "./slugify.ts";

describe("slugify", () => {
  it("lowercases and replaces special chars with hyphens", () => {
    assert.equal(slugify("John Doe"), "john-doe");
  });
  it("collapses multiple separators", () => {
    assert.equal(slugify("hello___world"), "hello-world");
  });
  it("strips leading and trailing hyphens", () => {
    assert.equal(slugify("-foo-"), "foo");
  });
  it("truncates at 30 chars", () => {
    assert.equal(slugify("a".repeat(40)).length, 30);
  });
  it("handles email prefix", () => {
    assert.equal(slugify("govindw007@gmail.com".split("@")[0]), "govindw007");
  });
  it("returns 'user' for empty/symbol-only input", () => {
    assert.equal(slugify("---"), "user");
  });
});
