import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lastUserText, messageText, toChatTurns } from "./ai-messages.ts";

const uiMsg = (role: string, text: string) => ({
  id: "x",
  role,
  parts: [{ type: "step-start" }, { type: "text", text }],
});

describe("messageText", () => {
  it("extracts text from AI SDK v6 UIMessage parts", () => {
    assert.equal(messageText(uiMsg("user", "draw a funnel")), "draw a funnel");
  });
  it("joins multiple text parts and skips non-text parts", () => {
    assert.equal(
      messageText({ role: "assistant", parts: [{ type: "text", text: "a" }, { type: "tool-call" }, { type: "text", text: "b" }] }),
      "ab"
    );
  });
  it("falls back to string content for legacy ChatTurn shape", () => {
    assert.equal(messageText({ role: "user", content: "hello" }), "hello");
  });
  it("returns empty for undefined or non-string content", () => {
    assert.equal(messageText(undefined), "");
    assert.equal(messageText({ role: "user", content: { nested: true } }), "");
  });
});

describe("lastUserText", () => {
  it("returns the last user message text, ignoring trailing assistant turns", () => {
    const msgs = [uiMsg("user", "first"), uiMsg("assistant", "ok"), uiMsg("user", " second "), uiMsg("assistant", "done")];
    assert.equal(lastUserText(msgs), "second");
  });
  it("returns empty for no messages", () => {
    assert.equal(lastUserText(undefined), "");
    assert.equal(lastUserText([]), "");
  });
});

describe("toChatTurns", () => {
  it("converts UIMessages to role/content turns, dropping empty and system turns", () => {
    const msgs = [
      { role: "system", parts: [{ type: "text", text: "sys" }] },
      uiMsg("user", "make a chart"),
      { role: "assistant", parts: [{ type: "tool-call" }] },
      uiMsg("assistant", "here it is"),
    ];
    assert.deepEqual(toChatTurns(msgs), [
      { role: "user", content: "make a chart" },
      { role: "assistant", content: "here it is" },
    ]);
  });
});
