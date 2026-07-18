import { describe, it, expect } from "vitest";
import { RECIPES } from "./recipes";
import { SKILLS } from "./catalog";

const skillIds = new Set(SKILLS.map((s) => s.id));

describe("studio recipes", () => {
  it("ships a small, curated set of perfect recipes", () => {
    // Deliberately curated (6 core + 5 Blender-first) rather than a noisy list.
    expect(RECIPES.length).toBe(11);
    expect(RECIPES.some((r) => r.category === "enterprise")).toBe(true);
  });

  it("ships 5 Blender-first recipes that mandate the live MCP pipeline", () => {
    const blender = RECIPES.filter((r) => r.category === "blender");
    expect(blender.length).toBe(5);
    for (const r of blender) {
      // Each brief must carry the hard pipeline: live scene via MCP, export
      // .glb, and the explicit ban on `blender --background` fallbacks.
      expect(r.prompt, `${r.id} must mandate MCP tools`).toContain(
        "strumenti MCP di Blender",
      );
      expect(r.prompt, `${r.id} must ban background scripts`).toContain("--background");
      expect(r.prompt, `${r.id} must export .glb`).toContain(".glb");
      expect(r.skillIds, `${r.id} must use web3d`).toContain("web3d");
    }
  });

  it("every recipe forces the anti-slop `taste` skill", () => {
    for (const r of RECIPES) {
      expect(r.skillIds, `recipe ${r.id} must use taste`).toContain("taste");
    }
  });

  it("has unique ids", () => {
    const ids = RECIPES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every referenced skill id exists in the catalog", () => {
    for (const r of RECIPES) {
      for (const id of r.skillIds) {
        expect(skillIds, `recipe ${r.id} → unknown skill ${id}`).toContain(id);
      }
    }
  });

  it("every recipe has a substantial, self-contained prompt", () => {
    for (const r of RECIPES) {
      expect(r.prompt.length, `recipe ${r.id} prompt too short`).toBeGreaterThan(200);
      expect(r.style).toBeTruthy();
      expect(r.layout).toBeTruthy();
      expect(r.accent).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
