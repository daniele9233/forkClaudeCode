import { describe, it, expect, beforeEach } from "vitest";
import type { Message, Part } from "@opencode-ai/sdk/client";
import { useChatStore } from "./chat.store";

// Minimal fixtures — only the fields the store actually reads.
function part(id: string, overrides: Partial<Part> = {}): Part {
  return { id, type: "text", text: "", ...overrides } as Part;
}
function message(id: string, sessionID: string): Message {
  return { id, sessionID, role: "assistant" } as Message;
}

function reset() {
  useChatStore.setState({
    liveParts: new Map(),
    liveMessages: new Map(),
    runningSessions: new Set(),
  });
}

describe("chat.store (streaming reducer)", () => {
  beforeEach(reset);

  it("accumulates parts per message immutably", () => {
    const { updatePart } = useChatStore.getState();
    const before = useChatStore.getState().liveParts;

    updatePart("msg1", part("p1", { text: "hel" }));
    updatePart("msg1", part("p2", { text: "lo" }));

    const after = useChatStore.getState().liveParts;
    expect(after).not.toBe(before); // new Map reference each update
    const parts = after.get("msg1")!;
    expect(parts.size).toBe(2);
    expect((parts.get("p1") as { text: string }).text).toBe("hel");
  });

  it("overwrites a part with the same id (streaming token growth)", () => {
    const { updatePart } = useChatStore.getState();
    updatePart("msg1", part("p1", { text: "he" }));
    updatePart("msg1", part("p1", { text: "hello" }));

    const parts = useChatStore.getState().liveParts.get("msg1")!;
    expect(parts.size).toBe(1);
    expect((parts.get("p1") as { text: string }).text).toBe("hello");
  });

  it("removePart drops only the targeted part", () => {
    const { updatePart, removePart } = useChatStore.getState();
    updatePart("msg1", part("p1"));
    updatePart("msg1", part("p2"));
    removePart("msg1", "p1");

    const parts = useChatStore.getState().liveParts.get("msg1")!;
    expect(parts.has("p1")).toBe(false);
    expect(parts.has("p2")).toBe(true);
  });

  it("tracks running sessions as a set", () => {
    const { setSessionRunning } = useChatStore.getState();
    setSessionRunning("s1", true);
    setSessionRunning("s2", true);
    expect(useChatStore.getState().runningSessions.has("s1")).toBe(true);

    setSessionRunning("s1", false);
    expect(useChatStore.getState().runningSessions.has("s1")).toBe(false);
    expect(useChatStore.getState().runningSessions.has("s2")).toBe(true);
  });

  it("clearSession removes only that session's live data", () => {
    const { updatePart, setMessage, setSessionRunning, clearSession } =
      useChatStore.getState();

    setMessage(message("msgA", "s1"));
    updatePart("msgA", part("pA"));
    setMessage(message("msgB", "s2"));
    updatePart("msgB", part("pB"));
    setSessionRunning("s1", true);

    clearSession("s1");

    const { liveParts, liveMessages, runningSessions } = useChatStore.getState();
    expect(liveMessages.has("msgA")).toBe(false);
    expect(liveParts.has("msgA")).toBe(false);
    expect(liveMessages.has("msgB")).toBe(true);
    expect(liveParts.has("msgB")).toBe(true);
    expect(runningSessions.has("s1")).toBe(false);
  });
});
