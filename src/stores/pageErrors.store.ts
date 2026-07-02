import { create } from "zustand";

export interface PageError {
  /** js | promise | resource | console */
  kind: string;
  message: string;
  /** e.g. "main.tsx:42" or the failing resource tag. */
  source?: string;
  ts: number;
}

interface PageErrorsState {
  /** Runtime errors reported by the previewed page (via the injected radar). */
  errors: PageError[];
  /** The error drawer under the preview toolbar is open. */
  drawerOpen: boolean;

  addError: (e: PageError) => void;
  clear: () => void;
  toggleDrawer: () => void;
  closeDrawer: () => void;
}

const MAX = 50;

export const usePageErrorsStore = create<PageErrorsState>((set) => ({
  errors: [],
  drawerOpen: false,

  addError: (e) =>
    set((s) => {
      if (s.errors.length >= MAX) return s;
      // Collapse exact duplicates (React error loops repeat the same line).
      const last = s.errors[s.errors.length - 1];
      if (last && last.kind === e.kind && last.message === e.message) return s;
      return { errors: [...s.errors, e] };
    }),

  clear: () => set({ errors: [], drawerOpen: false }),
  toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),
  closeDrawer: () => set({ drawerOpen: false }),
}));
