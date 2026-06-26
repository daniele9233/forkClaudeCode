import { describe, it, expect } from "vitest";
import { detectDevServerUrl } from "./detectDevServer";

describe("detectDevServerUrl", () => {
  it("parses a Vite 'Local:' line", () => {
    expect(detectDevServerUrl("  Local:   http://localhost:5173/")).toBe(
      "http://localhost:5173/",
    );
  });

  it("parses a 'running at' 127.0.0.1 line", () => {
    expect(detectDevServerUrl("server running at http://127.0.0.1:3000")).toBe(
      "http://127.0.0.1:3000/",
    );
  });

  it("normalizes 0.0.0.0 to localhost", () => {
    expect(detectDevServerUrl("On Your Network: http://0.0.0.0:8080/")).toBe(
      "http://localhost:8080/",
    );
  });

  it("parses a bare host:port", () => {
    expect(detectDevServerUrl("listening on localhost:4321")).toBe(
      "http://localhost:4321/",
    );
  });

  it("returns null when no URL is present", () => {
    expect(detectDevServerUrl("compiling modules…")).toBeNull();
    expect(detectDevServerUrl("")).toBeNull();
  });

  it("ignores non-local hosts", () => {
    expect(detectDevServerUrl("deployed to https://example.com:443")).toBeNull();
  });

  it("picks the first match in multi-line output", () => {
    const out = [
      "VITE ready",
      "  Local:   http://localhost:5173/",
      "  Network: http://0.0.0.0:5173/",
    ].join("\n");
    expect(detectDevServerUrl(out)).toBe("http://localhost:5173/");
  });
});
