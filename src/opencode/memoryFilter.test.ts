import { describe, it, expect } from "vitest";
import { stripToolStateLines } from "./memoryFilter";

describe("memory sanitize — tool/MCP availability lines", () => {
  it("drops stale MCP/tool availability claims (the poisoning bug)", () => {
    const input = [
      "### Conventions",
      "- Package manager is pnpm",
      "### Gotchas",
      "- Blender MCP server not configured in opencode; MCP tools unavailable until added to config and session restarted",
      "- Il server MCP di Blender non è disponibile finché non viene collegato",
      "- Figma MCP not connected",
    ].join("\n");
    const out = stripToolStateLines(input);
    expect(out).toContain("Package manager is pnpm");
    expect(out).not.toMatch(/blender/i);
    expect(out).not.toMatch(/figma/i);
    expect(out).not.toMatch(/unavailable|non è disponibile|not connected/i);
  });

  it("keeps legitimate durable knowledge untouched", () => {
    const input = [
      "- Use React 19 + TypeScript + Vite",
      "- User prefers Italian for chat replies",
      "- Run `pnpm lint` before committing",
    ].join("\n");
    expect(stripToolStateLines(input)).toBe(input);
  });
});
