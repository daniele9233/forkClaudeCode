import { describe, it, expect } from "vitest";
import { blenderPolicyNote } from "./blenderPolicy";

describe("blenderPolicyNote", () => {
  it("fires on Blender/3D prompts when the MCP server is on", () => {
    for (const text of [
      "usa Blender per creare un cubo rosso",
      "voglio un sito con hero 3D",
      "esporta il modello in .glb",
    ]) {
      const note = blenderPolicyNote(text, true);
      expect(note, text).toBeTruthy();
      expect(note).toContain("Blender MCP tools");
      expect(note).toContain("--background");
    }
  });

  it("stays silent when the MCP server is not configured", () => {
    // Without the server, the directive would forbid the only working path.
    expect(blenderPolicyNote("usa Blender per creare un cubo", false)).toBeNull();
  });

  it("stays silent on non-3D prompts", () => {
    expect(blenderPolicyNote("sistemami il form di login", true)).toBeNull();
  });
});
