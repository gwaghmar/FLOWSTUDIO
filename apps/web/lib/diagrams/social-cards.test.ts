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
  it("parses a venn card and defaults missing sets to empty arrays", () => {
    const r = parseSocialCard(JSON.stringify({
      type: "venn", title: "A vs B",
      sets: [{ label: "A", items: ["x", "y"] }, { label: "B" }],
      intersection: ["z"],
    }));
    assert.equal(r.ok, true);
    if (r.ok && r.card.type === "venn") {
      assert.equal(r.card.sets.length, 2);
      assert.deepEqual(r.card.sets[1].items, []);
      assert.deepEqual(r.card.intersection, ["z"]);
    }
  });
  it("parses a tierlist card", () => {
    const r = parseSocialCard(JSON.stringify({
      type: "tierlist", title: "Frameworks",
      tiers: [{ label: "S", items: ["React"] }, { label: "A", color: "#f00", items: [] }],
    }));
    assert.equal(r.ok, true);
    if (r.ok && r.card.type === "tierlist") {
      assert.equal(r.card.tiers.length, 2);
      assert.equal(r.card.tiers[1].color, "#f00");
      assert.deepEqual(r.card.tiers[1].items, []);
    }
  });
  it("parses an iceberg card and filters layers without labels", () => {
    const r = parseSocialCard(JSON.stringify({
      type: "iceberg", title: "The iceberg",
      layers: [{ label: "Visible", items: ["UI"] }, { items: ["hidden"] }, { label: "Deep", items: ["infra"] }],
    }));
    assert.equal(r.ok, true);
    if (r.ok && r.card.type === "iceberg") {
      assert.equal(r.card.layers.length, 2);
      assert.equal(r.card.layers[1].label, "Deep");
    }
  });
  it("parses an alignment card and clamps x/y to 0-2", () => {
    const r = parseSocialCard(JSON.stringify({
      type: "alignment", title: "Dev chart",
      xAxis: ["Lawful", "Neutral", "Chaotic"],
      yAxis: ["Good", "Neutral", "Evil"],
      cells: [{ x: -1, y: 5, label: "Hacker" }, { x: 1, y: 1, label: "Dev" }],
    }));
    assert.equal(r.ok, true);
    if (r.ok && r.card.type === "alignment") {
      assert.equal(r.card.cells[0].x, 0);
      assert.equal(r.card.cells[0].y, 2);
      assert.equal(r.card.cells.length, 2);
    }
  });
  it("rejects tierlist with no valid tiers", () => {
    assert.equal(parseSocialCard(JSON.stringify({ type: "tierlist", tiers: [] })).ok, false);
    assert.equal(parseSocialCard(JSON.stringify({ type: "tierlist" })).ok, false);
  });
  it("rejects iceberg with no valid layers", () => {
    assert.equal(parseSocialCard(JSON.stringify({ type: "iceberg", layers: [] })).ok, false);
    assert.equal(parseSocialCard(JSON.stringify({ type: "iceberg" })).ok, false);
  });
});
