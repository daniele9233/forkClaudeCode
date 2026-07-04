import { create } from "zustand";

/**
 * A one-shot channel to push text INTO the chat composer from elsewhere in the
 * app (e.g. clicking a Studio recipe in Settings). The composer subscribes to
 * `pending`, adopts it, and calls `consume()` to clear it. `nonce` bumps on
 * every fill so re-sending the *same* text still triggers the effect.
 */
interface ComposerState {
  pending: string | null;
  nonce: number;
  /** Push text into the composer (replaces whatever is queued). */
  fill: (text: string) => void;
  /** Composer calls this once it has adopted the pending text. */
  consume: () => void;
}

export const useComposerStore = create<ComposerState>((set) => ({
  pending: null,
  nonce: 0,
  fill: (text) => set((s) => ({ pending: text, nonce: s.nonce + 1 })),
  consume: () => set({ pending: null }),
}));
