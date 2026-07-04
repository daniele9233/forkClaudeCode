import { create } from "zustand";

/**
 * A one-shot channel to push text INTO the chat composer from elsewhere in the
 * app (e.g. clicking a Studio recipe in Settings). The composer subscribes to
 * `pending`, adopts it, and calls `consume()` to clear it. `nonce` bumps on
 * every fill so re-sending the *same* text still triggers the effect.
 */
interface ComposerState {
  pending: string | null;
  /** Where the pending text came from — "recipe" marks a ready-made Studio brief
   *  (already optimized, so the composer disables "Perfeziona" for it). */
  source: string | null;
  /** Skills a recipe wants force-injected in full (bypassing the 2-match cap). */
  skillIds: string[];
  nonce: number;
  /** Push text into the composer (replaces whatever is queued). */
  fill: (text: string, source?: string, skillIds?: string[]) => void;
  /** Composer calls this once it has adopted the pending text. */
  consume: () => void;
}

export const useComposerStore = create<ComposerState>((set) => ({
  pending: null,
  source: null,
  skillIds: [],
  nonce: 0,
  fill: (text, source, skillIds) =>
    set((s) => ({
      pending: text,
      source: source ?? null,
      skillIds: skillIds ?? [],
      nonce: s.nonce + 1,
    })),
  consume: () => set({ pending: null, source: null, skillIds: [] }),
}));
