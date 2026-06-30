import { useMemo } from "react";
import type { AssistantMessage } from "@opencode-ai/sdk/client";
import { useSessionStore } from "@/stores/session.store";
import { useSessionMessages } from "@/opencode/session";
import { useProviders } from "@/opencode/context";
import { useChatStore } from "@/stores/chat.store";
import { rowInfo, isAssistant, createdAt } from "@/opencode/messageShape";

export interface SessionStats {
  activeSessionId: string | null;
  steps: AssistantMessage[];
  lastMsg?: AssistantMessage;
  tokensIn: number; // current context window usage (last step input)
  tokensOut: number; // cumulative output
  stepCount: number;
  cacheHitPct: number;
  totalCost: number;
  contextLimit: number;
  pct: number; // context window fill %
}

/** Aggregate per-session token / cost / cache stats from historic + live messages. */
export function useSessionStats(): SessionStats {
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const { data: rows = [] } = useSessionMessages(activeSessionId);
  const liveMessages = useChatStore((s) => s.liveMessages);
  const { data: providers = [] } = useProviders();

  const steps = useMemo((): AssistantMessage[] => {
    const byId = new Map<string, AssistantMessage>();
    for (const row of rows) {
      const info = rowInfo(row);
      if (isAssistant(info)) byId.set(info.id, info);
    }
    for (const [id, msg] of liveMessages) {
      if (isAssistant(msg)) byId.set(id, msg);
    }
    return Array.from(byId.values()).sort((a, b) => createdAt(a) - createdAt(b));
  }, [rows, liveMessages]);

  const lastMsg = steps[steps.length - 1];

  return useMemo(() => {
    const tokensIn = lastMsg?.tokens?.input ?? 0;
    const tokensOut = steps.reduce((a, m) => a + (m.tokens?.output ?? 0), 0);
    const cacheRead = steps.reduce((a, m) => a + (m.tokens?.cache?.read ?? 0), 0);
    const inputSum = steps.reduce((a, m) => a + (m.tokens?.input ?? 0), 0);
    const cacheBase = cacheRead + inputSum;
    const cacheHitPct = cacheBase > 0 ? (cacheRead / cacheBase) * 100 : 0;
    const totalCost = steps.reduce((a, m) => a + (m.cost ?? 0), 0);

    const provider = providers.find((p) => p.id === lastMsg?.providerID);
    const model = lastMsg ? provider?.models?.[lastMsg.modelID] : undefined;
    const contextLimit = model?.limit?.context ?? 0;
    const pct = contextLimit > 0 ? Math.min(100, (tokensIn / contextLimit) * 100) : 0;

    return {
      activeSessionId,
      steps,
      lastMsg,
      tokensIn,
      tokensOut,
      stepCount: steps.length,
      cacheHitPct,
      totalCost,
      contextLimit,
      pct,
    };
  }, [activeSessionId, steps, lastMsg, providers]);
}

export function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(Math.round(n));
}
