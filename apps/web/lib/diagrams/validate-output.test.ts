import { test } from "node:test";
import assert from "node:assert/strict";
import { validateAndRepairOutput } from "./validate-output.ts";

test("mermaid: valid flowchart is ok", async () => {
  const r = await validateAndRepairOutput("mermaid", "flowchart LR\n A-->B");
  assert.equal(r.ok, true);
});

test("mermaid: empty string is not ok", async () => {
  const r = await validateAndRepairOutput("mermaid", "");
  assert.equal(r.ok, false);
});

test("reactflow: valid node graph is ok", async () => {
  const r = await validateAndRepairOutput(
    "reactflow",
    JSON.stringify({ nodes: [{ id: "a", position: { x: 0, y: 0 }, data: {} }], edges: [] })
  );
  assert.equal(r.ok, true);
});

test("reactflow: edge referencing missing node is not ok", async () => {
  const r = await validateAndRepairOutput(
    "reactflow",
    JSON.stringify({
      nodes: [{ id: "a", position: { x: 0, y: 0 }, data: {} }],
      edges: [{ id: "e", source: "a", target: "ghost" }],
    })
  );
  assert.equal(r.ok, false);
});

test("echarts: valid option is ok", async () => {
  const r = await validateAndRepairOutput(
    "echarts",
    JSON.stringify({ series: [{ type: "bar", data: [1] }] })
  );
  assert.equal(r.ok, true);
});

test("social card funnel: valid stages is ok", async () => {
  const r = await validateAndRepairOutput(
    "funnel",
    JSON.stringify({ type: "funnel", title: "T", stages: [{ label: "A", value: "1" }] })
  );
  assert.equal(r.ok, true);
});

test("social card funnel: missing stages is not ok", async () => {
  const r = await validateAndRepairOutput("funnel", JSON.stringify({ type: "funnel" }));
  assert.equal(r.ok, false);
});

test("cloud graph: valid nodes is ok", async () => {
  const r = await validateAndRepairOutput(
    "cloud",
    JSON.stringify({ nodes: [{ id: "a" }], edges: [] })
  );
  assert.equal(r.ok, true);
});

test("cloud graph: empty nodes is not ok", async () => {
  const r = await validateAndRepairOutput("cloud", JSON.stringify({ nodes: [] }));
  assert.equal(r.ok, false);
});
