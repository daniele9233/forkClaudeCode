import { describe, it, expect, beforeEach } from "vitest";
import { useThemeStore } from "./theme.store";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("light");
  document.documentElement.removeAttribute("data-ui");
  useThemeStore.setState({ theme: "dark", ui: "classic" });
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

describe("ui mode (classic / retro)", () => {
  it("setUi('retro') stamps data-ui on <html> and persists", () => {
    useThemeStore.getState().setUi("retro");
    expect(document.documentElement.getAttribute("data-ui")).toBe("retro");
    expect(localStorage.getItem("kikkocode.ui")).toBe("retro");

    useThemeStore.getState().setUi("classic");
    expect(document.documentElement.hasAttribute("data-ui")).toBe(false);
    expect(localStorage.getItem("kikkocode.ui")).toBe("classic");
  });

  it("toggleUi flips between classic and retro", () => {
    useThemeStore.getState().toggleUi();
    expect(useThemeStore.getState().ui).toBe("retro");
    useThemeStore.getState().toggleUi();
    expect(useThemeStore.getState().ui).toBe("classic");
  });

  it("switching to retro forces the dark theme (retro is a dark skin)", () => {
    useThemeStore.getState().setTheme("light");
    useThemeStore.getState().setUi("retro");
    expect(useThemeStore.getState().theme).toBe("dark");
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });
});
