import { create } from "zustand";

export interface TermEntry {
  /** Tool part id — used to dedupe repeated SSE updates. */
  id: string;
  command: string;
  output?: string;
  error?: string;
}

interface TerminalState {
  entries: TermEntry[];
  /** Part ids already pushed, to avoid writing the same command twice. */
  writtenIds: Set<string>;

  addEntry: (e: TermEntry) => void;
  clear: () => void;
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  entries: [],
  writtenIds: new Set(),

  addEntry: (e) => {
    if (get().writtenIds.has(e.id)) return;
    set((s) => {
      const writtenIds = new Set(s.writtenIds);
      writtenIds.add(e.id);
      return { entries: [...s.entries, e], writtenIds };
    });
  },

  clear: () => set({ entries: [], writtenIds: new Set() }),
}));
