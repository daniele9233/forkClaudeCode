import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Per-model lifetime spend — the REAL consumption of each LLM (money + tokens),
 * persisted across sessions. Shown next to each model where you manage keys.
 *
 * Why not "remaining credit"? Most providers (Anthropic, OpenAI, Groq, Mistral,
 * GLM/z.ai) expose NO balance API — only DeepSeek and OpenRouter do. So the
 * universally-true number is what you've SPENT here, which we accumulate from
 * the cost the engine reports on each assistant step.
 */
export interface ModelSpend {
  cost: number;
  tokensIn: number;
  tokensOut: number;
  updatedAt: number;
}

interface SpendState {
  /** keyed by "provider/model". */
  spend: Record<string, ModelSpend>;
  /** Add a delta for a model (called with per-message cost deltas). */
  add: (key: string, dCost: number, dIn: number, dOut: number) => void;
  reset: (key?: string) => void;
}

export const useSpendStore = create<SpendState>()(
  persist(
    (set) => ({
      spend: {},
      add: (key, dCost, dIn, dOut) =>
        set((s) => {
          if (dCost <= 0 && dIn <= 0 && dOut <= 0) return s;
          const cur = s.spend[key] ?? {
            cost: 0,
            tokensIn: 0,
            tokensOut: 0,
            updatedAt: 0,
          };
          return {
            spend: {
              ...s.spend,
              [key]: {
                cost: cur.cost + Math.max(0, dCost),
                tokensIn: cur.tokensIn + Math.max(0, dIn),
                tokensOut: cur.tokensOut + Math.max(0, dOut),
                updatedAt: Date.now(),
              },
            },
          };
        }),
      reset: (key) =>
        set((s) => {
          if (!key) return { spend: {} };
          const next = { ...s.spend };
          delete next[key];
          return { spend: next };
        }),
    }),
    { name: "kikkocode-spend" },
  ),
);
