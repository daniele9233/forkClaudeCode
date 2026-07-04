import { describe, it, expect } from "vitest";
import { RECIPES } from "./recipes";
import { SKILLS } from "./catalog";

const skillIds = new Set(SKILLS.map((s) => s.id));

describe("studio recipes", () => {
  it("ships a rich catalog (style starters + enterprise verticals)", () => {
    expect(RECIPES.length).toBeGreaterThanOrEqual(20);
    expect(RECIPES.some((r) => r.category === "enterprise")).toBe(true);
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
