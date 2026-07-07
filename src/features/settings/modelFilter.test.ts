import { describe, it, expect } from "vitest";
import { isCurrentAnthropicModel } from "./modelFilter";

describe("isCurrentAnthropicModel", () => {
  it("keeps the current Claude lineup", () => {
    const keep: [string, string][] = [
      ["claude-opus-4-8", "Claude Opus 4.8"],
      ["claude-opus-4-7", "Claude Opus 4.7"],
      ["claude-opus-4-6", "Claude Opus 4.6"],
      ["claude-sonnet-5", "Claude Sonnet 5"],
      ["claude-sonnet-4-6", "Claude Sonnet 4.6"],
      ["claude-haiku-4-5-20251001", "Claude Haiku 4.5"],
      ["claude-fable-5", "Claude Fable 5"],
    ];
    for (const [id, name] of keep) {
      expect(isCurrentAnthropicModel(id, name), id).toBe(true);
    }
  });

  it("hides superseded versions", () => {
    expect(isCurrentAnthropicModel("claude-opus-4-5-20251101", "Claude Opus 4.5")).toBe(
      false,
    );
    expect(isCurrentAnthropicModel("claude-sonnet-4-5", "Claude Sonnet 4.5")).toBe(false);
  });

  it("hides Fast variants and (latest) aliases", () => {
    expect(isCurrentAnthropicModel("claude-opus-4-8-fast", "Claude Opus 4.8 Fast")).toBe(
      false,
    );
    expect(
      isCurrentAnthropicModel("claude-opus-4-5-latest", "Claude Opus 4.5 (latest)"),
    ).toBe(false);
    expect(
      isCurrentAnthropicModel("claude-haiku-4-5-latest", "Claude Haiku 4.5 (latest)"),
    ).toBe(false);
  });

  it("is robust to dot vs dash id formatting", () => {
    expect(isCurrentAnthropicModel("claude-opus-4.8", "Claude Opus 4.8")).toBe(true);
  });
});
