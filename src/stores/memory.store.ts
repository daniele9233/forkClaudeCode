import { create } from "zustand";
import { persist } from "zustand/middleware";

interface MemoryState {
  /** Distill automatically after each meaningful run. */
  autoMemorize: boolean;
  /** A distillation is in flight right now. */
  distilling: boolean;
  /** Epoch ms of the last successful distillation. */
  lastAt: number | null;
  /** Last error message, if the last distillation failed. */
  lastError: string | null;

  setAutoMemorize: (on: boolean) => void;
  setDistilling: (on: boolean) => void;
  setResult: (ok: boolean, error?: string) => void;
}

export const useMemoryStore = create<MemoryState>()(
  persist(
    (set) => ({
      autoMemorize: true,
      distilling: false,
      lastAt: null,
      lastError: null,

      setAutoMemorize: (on) => set({ autoMemorize: on }),
      setDistilling: (on) => set({ distilling: on }),
      setResult: (ok, error) =>
        set({
          distilling: false,
          lastAt: ok ? Date.now() : undefined,
          lastError: ok ? null : (error ?? "distillation failed"),
        }),
    }),
    {
      name: "kikkocode-memory",
      partialize: (s) => ({ autoMemorize: s.autoMemorize, lastAt: s.lastAt }),
    },
  ),
);
