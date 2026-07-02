import { describe, it, expect } from "vitest";
import { matchSkills, injectSkills, parseSkills } from "./match";
import { SKILLS } from "./catalog";

const allIds = SKILLS.map((s) => s.id);

describe("matchSkills", () => {
  it("matches a skill from its keywords without naming it", () => {
    const hits = matchSkills("voglio una hero page con animazioni gsap", allIds);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((s) => s.id === "hero-page" || s.id === "gsap-motion")).toBe(true);
  });

  it("returns nothing for unrelated prompts", () => {
    expect(matchSkills("fix the sql migration for the users table", allIds)).toEqual([]);
  });

  it("returns at most `max` skills, best first", () => {
    const hits = matchSkills(
      "hero landing page with gsap scroll animations and bento grid design",
      allIds,
      2,
    );
    expect(hits.length).toBeLessThanOrEqual(2);
  });

  it("only considers enabled skills", () => {
    const hits = matchSkills("hero page con gsap", ["a11y-guardian"]);
    expect(hits.every((s) => s.id === "a11y-guardian")).toBe(true);
  });

  it("ignores empty prompts", () => {
    expect(matchSkills("   ", allIds)).toEqual([]);
  });
});

describe("injectSkills / parseSkills round-trip", () => {
  it("wraps the prompt and strips it back to clean text + ids", () => {
    const skills = matchSkills("hero page con animazioni gsap", allIds);
    expect(skills.length).toBeGreaterThan(0);
    const injected = injectSkills("fai una hero page", skills);
    const { clean, skillIds } = parseSkills(injected);
    expect(clean).toBe("fai una hero page");
    expect(skillIds).toEqual(skills.map((s) => s.id));
  });

  it("leaves plain text untouched", () => {
    const { clean, skillIds } = parseSkills("solo testo normale");
    expect(clean).toBe("solo testo normale");
    expect(skillIds).toEqual([]);
  });

  it("strips hidden kikko-note blocks too", () => {
    const text = "[[kikko-note]]\npolicy segreta\n[[/kikko-note]]\n\nciao mondo";
    const { clean, skillIds } = parseSkills(text);
    expect(clean).toBe("ciao mondo");
    expect(skillIds).toEqual([]);
  });
});
