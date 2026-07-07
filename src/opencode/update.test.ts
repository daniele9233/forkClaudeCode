import { describe, it, expect } from "vitest";
import { isNewerVersion, pickInstaller } from "./update";

describe("isNewerVersion", () => {
  it("detects a newer release", () => {
    expect(isNewerVersion("0.2.0", "0.1.3")).toBe(true);
    expect(isNewerVersion("1.0.0", "0.9.9")).toBe(true);
    expect(isNewerVersion("0.1.4", "0.1.3")).toBe(true);
  });

  it("is false for same or older", () => {
    expect(isNewerVersion("0.1.3", "0.1.3")).toBe(false);
    expect(isNewerVersion("0.1.2", "0.1.3")).toBe(false);
    expect(isNewerVersion("0.9.9", "1.0.0")).toBe(false);
  });

  it("tolerates a leading v / prefix already stripped by caller", () => {
    expect(isNewerVersion("0.2.0", "0.1.9")).toBe(true);
  });

  it("is false on unparseable input (never nags wrongly)", () => {
    expect(isNewerVersion("", "0.1.0")).toBe(false);
    expect(isNewerVersion("nightly", "0.1.0")).toBe(false);
  });
});

describe("pickInstaller", () => {
  it("prefers the .exe setup over the .msi", () => {
    const url = pickInstaller([
      { name: "kikkoCode_0.2.0_x64_en-US.msi", browser_download_url: "msi" },
      { name: "kikkoCode_0.2.0_x64-setup.exe", browser_download_url: "exe" },
    ]);
    expect(url).toBe("exe");
  });

  it("falls back to the .msi when no exe", () => {
    expect(pickInstaller([{ name: "app.msi", browser_download_url: "msi" }])).toBe("msi");
  });

  it("returns undefined when no installer asset", () => {
    expect(pickInstaller([{ name: "notes.txt", browser_download_url: "x" }])).toBe(
      undefined,
    );
  });
});
