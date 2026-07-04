import { describe, it, expect } from "vitest";
import { injectWebDesigner } from "./webDesigner";

describe("injectWebDesigner", () => {
  it("is a no-op when disabled", () => {
    const t = "build me a landing page";
    expect(injectWebDesigner(t, false)).toBe(t);
  });

  it("is a no-op on non-web prompts even when enabled", () => {
    const t = "refactor this python parser";
    expect(injectWebDesigner(t, true)).toBe(t);
  });

  it("prepends a hidden directive on web prompts when enabled", () => {
    const out = injectWebDesigner("crea un sito con hero e layout", true);
    expect(out).toContain("[[kikko-note]]");
    expect(out).toContain("[[/kikko-note]]");
    expect(out).toContain("senior front-end");
    expect(out.endsWith("crea un sito con hero e layout")).toBe(true);
  });
});
