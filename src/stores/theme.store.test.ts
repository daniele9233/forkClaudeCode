import { describe, it, expect, beforeEach } from "vitest";
import { useThemeStore } from "./theme.store";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("light");
});

describe("theme.store", () => {
  it("setTheme toggles the .light class on <html> and persists", () => {
    useThemeStore.getState().setTheme("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(localStorage.getItem("kikkocode.theme")).toBe("light");

    useThemeStore.getState().setTheme("dark");
    expect(document.documentElement.classList.contains("light")).toBe(false);
    expect(localStorage.getItem("kikkocode.theme")).toBe("dark");
  });

  it("toggleTheme flips between dark and light", () => {
    useThemeStore.getState().setTheme("dark");
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe("light");
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe("dark");
  });

  it("reflects colorScheme on the document element", () => {
    useThemeStore.getState().setTheme("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
  });
});
