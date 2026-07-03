import { useConfig } from "@/opencode/config";
import { useProviders } from "@/opencode/context";
import { useModelStore } from "@/stores/model.store";
import { useSessionStats } from "./useSessionStats";

export interface PromptCost {
  /** Rough token estimate of the current draft (chars / 4). */
  draftTokens: number;
  /** Approx tokens already in the context window. */
  contextTokens: number;
  contextLimit: number;
  /** Projected context fill % after this send. */
  contextPct: number;
  /** Estimated $ to process (context + draft) as input on this send. */
  estSendCost: number;
  /** Cumulative session cost so far. */
  sessionCost: number;
  /** Whether we have pricing for the selected model. */
  hasPricing: boolean;
}

/**
 * Estimate the cost/size of the *next* send before it happens, for the
 * currently selected model. Token counts are a heuristic (chars/4); pricing
 * comes from the provider's model catalog (cost is per 1M tokens).
 */
export function usePromptCost(draft: string): PromptCost {
  const { data: config } = useConfig();
  const { data: providers = [] } = useProviders();
  const stats = useSessionStats();

  const localSelected = useModelStore((s) => s.selected);
  const model = localSelected ?? config?.model ?? "";
  const slash = model.indexOf("/");
  const providerId = slash > 0 ? model.slice(0, slash) : "";
  const modelId = slash > 0 ? model.slice(slash + 1) : model;
  const m = providers.find((p) => p.id === providerId)?.models?.[modelId];

  const inputPerToken = m?.cost?.input ? m.cost.input / 1_000_000 : 0;
  const limit = m?.limit?.context ?? stats.contextLimit ?? 0;

  const draftTokens = Math.ceil(draft.trim().length / 4);
  const contextTokens = stats.tokensIn;
  const projected = contextTokens + draftTokens;
  const contextPct = limit > 0 ? Math.min(100, (projected / limit) * 100) : 0;

  return {
    draftTokens,
    contextTokens,
    contextLimit: limit,
    contextPct,
    estSendCost: projected * inputPerToken,
    sessionCost: stats.totalCost,
    hasPricing: inputPerToken > 0,
  };
}
