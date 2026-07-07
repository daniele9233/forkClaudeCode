import { describe, it, expect } from "vitest";
import { engineIsOutdated, MIN_ENGINE_VERSION } from "./version";

describe("engineIsOutdated", () => {
  it("does NOT warn on the exact bundled engine version", () => {
    // We bundle exactly MIN_ENGINE_VERSION, so it must never warn.
    expect(engineIsOutdated(MIN_ENGINE_VERSION)).toBe(false);
    expect(engineIsOutdated("1.17.13")).toBe(false);
    expect(engineIsOutdated("opencode 1.17.13")).toBe(false);
  });

  it("does NOT warn on a newer engine", () => {
    expect(engineIsOutdated("1.17.14")).toBe(false);
    expect(engineIsOutdated("1.18.0")).toBe(false);
    expect(engineIsOutdated("2.0.0")).toBe(false);
  });

  it("warns only on a strictly older engine", () => {
    expect(engineIsOutdated("1.17.12")).toBe(true);
    expect(engineIsOutdated("1.0.0")).toBe(true);
    expect(engineIsOutdated("0.15.31")).toBe(true);
  });

  it("never warns on an unparseable / unknown version", () => {
    expect(engineIsOutdated("unknown")).toBe(false);
    expect(engineIsOutdated("")).toBe(false);
  });
});
