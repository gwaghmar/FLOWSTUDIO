import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseGraph, serializeGraph, autoLayoutGraph, validateGraphSource } from "./xyflow-base.ts";

describe("parseGraph", () => {
  it("returns an empty graph on malformed JSON", () => {
    const g = parseGraph("not json");
    assert.deepEqual(g, { nodes: [], edges: [] });
  });
  it("fills a fallback position for nodes missing one", () => {
    const g = parseGraph(JSON.stringify({ nodes: [{ id: "a", data: {} }], edges: [] }));
    assert.equal(typeof g.nodes[0].position.x, "number");
    assert.equal(typeof g.nodes[0].position.y, "number");
  });
  it("preserves an existing position", () => {
    const g = parseGraph(JSON.stringify({ nodes: [{ id: "a", position: { x: 5, y: 7 }, data: {} }], edges: [] }));
    assert.deepEqual(g.nodes[0].position, { x: 5, y: 7 });
  });
});

describe("serializeGraph", () => {
  it("round-trips nodes and edges", () => {
    const nodes = [{ id: "a", position: { x: 0, y: 0 }, data: { label: "A" } }];
    const edges = [{ id: "e", source: "a", target: "a" }];
    const json = serializeGraph(nodes as never, edges as never);
    assert.deepEqual(JSON.parse(json), { nodes, edges });
  });
});

describe("validateGraphSource", () => {
  it("accepts a valid graph with referencing edges", () => {
    const src = JSON.stringify({ nodes: [{ id: "a" }, { id: "b" }], edges: [{ source: "a", target: "b" }] });
    assert.deepEqual(validateGraphSource(src), { ok: true });
  });
  it("accepts a single node with no edges", () => {
    assert.deepEqual(validateGraphSource(JSON.stringify({ nodes: [{ id: "a" }] })), { ok: true });
  });
  it("rejects malformed JSON", () => {
    const r = validateGraphSource("not json");
    assert.equal(r.ok, false);
  });
  it("rejects an empty node list", () => {
    const r = validateGraphSource(JSON.stringify({ nodes: [], edges: [] }));
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.reason, /at least one node/i);
  });
  it("rejects a node without a string id", () => {
    const r = validateGraphSource(JSON.stringify({ nodes: [{ label: "x" }] }));
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.reason, /string id/i);
  });
  it("rejects an edge referencing an unknown node", () => {
    const r = validateGraphSource(JSON.stringify({ nodes: [{ id: "a" }], edges: [{ source: "a", target: "ghost" }] }));
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.reason, /unknown node/i);
  });
  it("rejects an edge missing source/target", () => {
    const r = validateGraphSource(JSON.stringify({ nodes: [{ id: "a" }], edges: [{ source: "a" }] }));
    assert.equal(r.ok, false);
  });
});

describe("autoLayoutGraph", () => {
  it("assigns numeric positions to every node", async () => {
    const src = JSON.stringify({
      nodes: [{ id: "a", data: {} }, { id: "b", data: {} }],
      edges: [{ id: "e", source: "a", target: "b" }],
    });
    const out = await autoLayoutGraph(src);
    const parsed = JSON.parse(out);
    for (const n of parsed.nodes) {
      assert.equal(typeof n.position.x, "number");
      assert.equal(typeof n.position.y, "number");
    }
  });
  it("returns the original source on malformed JSON", async () => {
    assert.equal(await autoLayoutGraph("nope"), "nope");
  });
});
