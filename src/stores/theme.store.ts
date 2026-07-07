import { create } from "zustand";

export type Theme = "dark" | "light";
/**
 * Which interface skin the app renders. "classic" is the default blueprint
 * look; "retro" is the synthwave Retro OS skin (neon palette, scanline, Tetris
 * while the agent works). Both run the SAME components/logic — retro is a
 * token override + an effects layer, not a second codebase.
 */
export type UiMode = "classic" | "retro";

const STORAGE_KEY = "kikkocode.theme";
const UI_STORAGE_KEY = "kikkocode.ui";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  // Always default to dark; the OS preference is ignored (user can still toggle).
  return "dark";
}

function getInitialUi(): UiMode {
  if (typeof window === "undefined") return "classic";
  const stored = window.localStorage.getItem(UI_STORAGE_KEY);
  return stored === "retro" ? "retro" : "classic";
}

/** Apply the theme to <html> by toggling the `.light` class (see index.css). */
function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("light", theme === "light");
  document.documentElement.style.colorScheme = theme;
}

/** Apply the UI skin to <html> via `data-ui` (see the retro block in index.css). */
function applyUi(ui: UiMode) {
  if (typeof document === "undefined") return;
  if (ui === "retro") document.documentElement.setAttribute("data-ui", "retro");
  else document.documentElement.removeAttribute("data-ui");
}

interface ThemeState {
  theme: Theme;
  ui: UiMode;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setUi: (ui: UiMode) => void;
  toggleUi: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitialTheme(),
  ui: getInitialUi(),
  setTheme: (theme) => {
    applyTheme(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
    set({ theme });
  },
  toggleTheme: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),
  setUi: (ui) => {
    applyUi(ui);
    window.localStorage.setItem(UI_STORAGE_KEY, ui);
    // Retro is a dark skin: force dark so the light overrides don't fight it.
    if (ui === "retro" && get().theme !== "dark") get().setTheme("dark");
    set({ ui });
  },
  toggleUi: () => get().setUi(get().ui === "retro" ? "classic" : "retro"),
}));

// Apply the initial theme/skin synchronously at module load so there is no flash.
applyTheme(useThemeStore.getState().theme);
applyUi(useThemeStore.getState().ui);
