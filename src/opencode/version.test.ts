import { describe, it, expect } from "vitest";
import { engineIsOutdated, MIN_ENGINE_VERSION } from "./version";

describe("engineIsOutdated", () => {
  it("does NOT warn on the exact bundled engine version", () => {
    // Regression: the bundled engine is 0.15.x (major 0). An earlier check
    // assumed the engine was 1.x and false-warned on every install.
    expect(engineIsOutdated(MIN_ENGINE_VERSION)).toBe(false);
    expect(engineIsOutdated("0.15.31")).toBe(false);
    expect(engineIsOutdated("opencode 0.15.31")).toBe(false);
  });

  it("does NOT warn on a newer engine", () => {
    expect(engineIsOutdated("0.15.32")).toBe(false);
    expect(engineIsOutdated("0.16.0")).toBe(false);
    expect(engineIsOutdated("1.0.0")).toBe(false);
  });

  it("warns only on a strictly older engine", () => {
    expect(engineIsOutdated("0.15.30")).toBe(true);
    expect(engineIsOutdated("0.14.99")).toBe(true);
    expect(engineIsOutdated("0.0.1")).toBe(true);
  });

  it("never warns on an unparseable / unknown version", () => {
    expect(engineIsOutdated("unknown")).toBe(false);
    expect(engineIsOutdated("")).toBe(false);
  });
});
