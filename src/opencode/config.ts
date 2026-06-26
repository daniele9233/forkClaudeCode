import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Config, Agent, McpLocalConfig, McpRemoteConfig } from "@opencode-ai/sdk/client";
import { getClient } from "./client";

export type { Config, Agent, McpLocalConfig, McpRemoteConfig };

export const configKeys = {
  config: () => ["config", "get"] as const,
  agents: () => ["config", "agents"] as const,
  mcp: () => ["config", "mcp"] as const,
  children: (sessionId: string) => ["session", "children", sessionId] as const,
};

export function useConfig() {
  return useQuery({
    queryKey: configKeys.config(),
    queryFn: async (): Promise<Config> => {
      const res = await getClient().config.get({ throwOnError: true });
      return res.data as Config;
    },
    staleTime: 30_000,
  });
}

export function useUpdateConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Config>) => {
      const cur = await getClient().config.get({ throwOnError: true });
      const merged = { ...(cur.data as Config), ...patch };
      const res = await getClient().config.update({ body: merged, throwOnError: true });
      return res.data as Config;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: configKeys.config() });
    },
  });
}

export function useSetAuth() {
  return useMutation({
    mutationFn: async ({ providerId, key }: { providerId: string; key: string }) => {
      await getClient().auth.set({
        path: { id: providerId },
        body: { type: "api", key },
        throwOnError: true,
      });
    },
  });
}

export function useAgents() {
  return useQuery({
    queryKey: configKeys.agents(),
    queryFn: async (): Promise<Agent[]> => {
      const res = await getClient().app.agents({ throwOnError: true });
      return res.data ?? [];
    },
    staleTime: 60_000,
  });
}

export function useMcpStatus() {
  return useQuery({
    queryKey: configKeys.mcp(),
    queryFn: async () => {
      const res = await getClient().mcp.status({ throwOnError: true });
      return (res.data ?? {}) as Record<string, { connected: boolean; tools?: string[]; error?: string }>;
    },
    staleTime: 10_000,
    retry: false,
  });
}

export function useSessionChildren(sessionId: string | null) {
  return useQuery({
    queryKey: configKeys.children(sessionId ?? ""),
    queryFn: async () => {
      const res = await getClient().session.children({
        path: { id: sessionId! },
        throwOnError: true,
      });
      return res.data ?? [];
    },
    enabled: !!sessionId,
    staleTime: 5_000,
  });
}
