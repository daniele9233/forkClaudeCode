import { describe, it, expect } from "vitest";
import { classifyPrompt } from "./modelRouter";

describe("model auto-routing classifier", () => {
  it("routes website/front-end prompts to design", () => {
    expect(classifyPrompt("crea un sito portfolio con hero 3d")).toBe("design");
    expect(classifyPrompt("make a landing page with gsap animations")).toBe("design");
    expect(classifyPrompt("migliora la palette e la tipografia della pagina")).toBe(
      "design",
    );
  });

  it("routes logic/fix/backend prompts to coding", () => {
    expect(classifyPrompt("fix the bug in the auth api endpoint")).toBe("coding");
    expect(classifyPrompt("scrivi uno script python che parsa i log")).toBe("coding");
    expect(classifyPrompt("aggiungi i test per la funzione di retry")).toBe("coding");
  });

  it("defaults to coding when there is no signal", () => {
    expect(classifyPrompt("ciao, come va?")).toBe("coding");
  });

  it("a Studio recipe (forced skills) is always design", () => {
    expect(classifyPrompt("qualsiasi testo", ["taste", "web3d"])).toBe("design");
  });
});
