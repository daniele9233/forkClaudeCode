import { describe, it, expect } from "vitest";
import { toFileUrl } from "./utils";

describe("toFileUrl", () => {
  it("builds a file:// URL from a POSIX path", () => {
    expect(toFileUrl("/tmp/shot.png")).toBe("file:///tmp/shot.png");
  });

  it("normalizes a Windows path (backslashes + drive letter)", () => {
    expect(toFileUrl("C:\\Users\\me\\shot.png")).toBe("file:///C:/Users/me/shot.png");
  });
});
