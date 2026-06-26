import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Provider } from "@opencode-ai/sdk/client";
import { getClient, getBaseUrl } from "./client";

export type { Provider };

export const contextKeys = {
  messages: (sessionId: string) => ["context", "messages", sessionId] as const,
  providers: () => ["config", "providers"] as const,
};

/** Minimal shape of a message returned by GET /api/session/{id}/context. */
export interface ContextEntry {
  info: {
    id: string;
    role: "user" | "assistant" | "system" | string;
    sessionID?: string;
  };
  parts?: unknown[];
}

/**
 * Fetch the messages currently inside the agent's context window.
 * Uses a raw fetch because this endpoint is not exposed in the SDK.
 */
export function useContextMessages(sessionId: string | null) {
  return useQuery({
    queryKey: contextKeys.messages(sessionId ?? ""),
    queryFn: async (): Promise<ContextEntry[]> => {
      const res = await fetch(`${getBaseUrl()}/api/session/${sessionId}/context`);
      if (!res.ok) return [];
      const json = (await res.json()) as { data?: ContextEntry[] };
      return json.data ?? [];
    },
    enabled: !!sessionId,
    staleTime: 15_000,
  });
}

/**
 * All configured providers (each carries its Model map with context limits).
 * Used to look up the active model's context window size.
 */
export function useProviders() {
  return useQuery({
    queryKey: contextKeys.providers(),
    queryFn: async (): Promise<Provider[]> => {
      const res = await getClient().config.providers({ throwOnError: true });
      return res.data?.providers ?? [];
    },
    staleTime: 60_000,
  });
}

/** Invalidate the context messages cache when compaction occurs. */
export function useContextInvalidate() {
  const qc = useQueryClient();
  return (sessionId: string) => {
    qc.invalidateQueries({ queryKey: contextKeys.messages(sessionId) });
  };
}
