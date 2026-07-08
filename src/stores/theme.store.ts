import { create } from "zustand";

export type Theme = "dark" | "light";

const STORAGE_KEY = "kikkocode.theme";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  // Always default to dark; the OS preference is ignored (user can still toggle).
  return "dark";
}

/** Apply the theme to <html> by toggling the `.light` class (see index.css). */
function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("light", theme === "light");
  document.documentElement.style.colorScheme = theme;
}

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitialTheme(),
  setTheme: (theme) => {
    applyTheme(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
    set({ theme });
  },
  toggleTheme: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),
}));

// Apply the initial theme synchronously at module load so there is no flash.
applyTheme(useThemeStore.getState().theme);
