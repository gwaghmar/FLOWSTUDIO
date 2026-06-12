import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseSocialCard } from "./social-cards.ts";

describe("parseSocialCard", () => {
  it("parses a timeline card", () => {
    const r = parseSocialCard(JSON.stringify({
      type: "timeline", title: "Our journey",
      items: [{ date: "2024", label: "Founded" }, { date: "2025", label: "Launch", description: "v1 ships" }],
    }));
    assert.equal(r.ok, true);
    if (r.ok && r.card.type === "timeline") {
      assert.equal(r.card.items.length, 2);
      assert.equal(r.card.items[1].description, "v1 ships");
    }
  });
  it("parses a versus card and defaults missing points to empty arrays", () => {
    const r = parseSocialCard(JSON.stringify({
      type: "versus", title: "X vs Y",
      left: { name: "X" }, right: { name: "Y", points: ["fast"] },
    }));
    assert.equal(r.ok, true);
    if (r.ok && r.card.type === "versus") {
      assert.deepEqual(r.card.left.points, []);
      assert.deepEqual(r.card.right.points, ["fast"]);
    }
  });
  it("parses a matrix2x2 card and clamps coordinates to 0-100", () => {
    const r = parseSocialCard(JSON.stringify({
      type: "matrix2x2", title: "Effort vs impact",
      xAxis: { low: "Low effort", high: "High effort" },
      yAxis: { low: "Low impact", high: "High impact" },
      items: [{ label: "A", x: -5, y: 130 }],
    }));
    assert.equal(r.ok, true);
    if (r.ok && r.card.type === "matrix2x2") {
      assert.equal(r.card.items[0].x, 0);
      assert.equal(r.card.items[0].y, 100);
    }
  });
  it("parses a funnel card", () => {
    const r = parseSocialCard(JSON.stringify({
      type: "funnel", title: "Signup funnel",
      stages: [{ label: "Visitors", value: "10,000" }, { label: "Signups", value: "1,200" }],
    }));
    assert.equal(r.ok, true);
    if (r.ok && r.card.type === "funnel") assert.equal(r.card.stages.length, 2);
  });
  it("rejects invalid JSON and unknown types with ok:false", () => {
    assert.equal(parseSocialCard("not json").ok, false);
    assert.equal(parseSocialCard(JSON.stringify({ type: "bogus" })).ok, false);
    assert.equal(parseSocialCard(JSON.stringify({ type: "timeline" })).ok, false);
  });
});
