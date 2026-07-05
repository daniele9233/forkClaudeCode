import { describe, it, expect, beforeEach } from "vitest";
import { useQueueStore } from "./queue.store";

describe("queue.store", () => {
  beforeEach(() => useQueueStore.setState({ items: [] }));

  it("enqueues and takes FIFO per session, preserving forced recipe skills", () => {
    useQueueStore
      .getState()
      .enqueue({ sessionId: "s1", text: "a", mode: "build", forcedSkillIds: ["x", "y"] });
    useQueueStore.getState().enqueue({ sessionId: "s1", text: "b", mode: "plan" });
    useQueueStore.getState().enqueue({ sessionId: "s2", text: "c", mode: "build" });

    const first = useQueueStore.getState().takeNext("s1");
    expect(first?.text).toBe("a");
    expect(first?.forcedSkillIds).toEqual(["x", "y"]);

    const second = useQueueStore.getState().takeNext("s1");
    expect(second?.text).toBe("b");
    // s2's task is untouched.
    expect(useQueueStore.getState().items).toHaveLength(1);
  });

  it("takeNext returns null when the session has no queued tasks", () => {
    expect(useQueueStore.getState().takeNext("nope")).toBeNull();
  });
});
