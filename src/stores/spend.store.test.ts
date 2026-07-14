import { describe, it, expect, beforeEach } from "vitest";
import { useSpendStore } from "./spend.store";

describe("spend store", () => {
  beforeEach(() => useSpendStore.getState().reset());

  it("accumulates cost and tokens per model key", () => {
    const { add } = useSpendStore.getState();
    add("anthropic/claude-sonnet-5", 0.01, 100, 50);
    add("anthropic/claude-sonnet-5", 0.02, 200, 80);
    const s = useSpendStore.getState().spend["anthropic/claude-sonnet-5"];
    expect(s.cost).toBeCloseTo(0.03);
    expect(s.tokensIn).toBe(300);
    expect(s.tokensOut).toBe(130);
  });

  it("keeps models separate and ignores non-positive deltas", () => {
    const { add } = useSpendStore.getState();
    add("zai/glm-5.2", 0.005, 10, 5);
    add("zai/glm-5.2", 0, 0, 0);
    add("deepseek/deepseek-chat", 0.001, 3, 1);
    expect(useSpendStore.getState().spend["zai/glm-5.2"].cost).toBeCloseTo(0.005);
    expect(useSpendStore.getState().spend["deepseek/deepseek-chat"].cost).toBeCloseTo(
      0.001,
    );
  });

  it("reset(key) clears one model, reset() clears all", () => {
    const { add, reset } = useSpendStore.getState();
    add("a/b", 1, 1, 1);
    add("c/d", 2, 2, 2);
    reset("a/b");
    expect(useSpendStore.getState().spend["a/b"]).toBeUndefined();
    expect(useSpendStore.getState().spend["c/d"]).toBeDefined();
    reset();
    expect(Object.keys(useSpendStore.getState().spend).length).toBe(0);
  });
});
