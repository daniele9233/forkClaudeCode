import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type {
  Config,
  Agent,
  McpLocalConfig,
  McpRemoteConfig,
} from "@opencode-ai/sdk/client";
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
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ providerId, key }: { providerId: string; key: string }) => {
      await getClient().auth.set({
        path: { id: providerId },
        body: { type: "api", key },
        throwOnError: true,
      });
    },
    onSuccess: () => {
      // Re-read providers/config so the UI reflects the now-authenticated state.
      qc.invalidateQueries({ queryKey: ["config", "providers"] });
      qc.invalidateQueries({ queryKey: configKeys.config() });
    },
  });
}

export interface AddProviderInput {
  id: string;
  name: string;
  /** ai-sdk package the engine loads for this provider. */
  npm: string;
  baseURL: string;
  apiKey: string;
  /** modelId → display name. */
  models: Record<string, string>;
  /** Per-model context window (tokens), used for display. */
  contextLimit?: number;
}

/**
 * Register a provider with the engine by writing a full definition (including
 * the API key) into the config, then storing the credential in the auth store
 * too. Setting auth alone does NOT make a provider appear in `/config/providers`
 * on this engine version — a config entry is what surfaces it with its models.
 */
export function useAddProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddProviderInput) => {
      const ctx = input.contextLimit ?? 128_000;
      const models: Record<
        string,
        { name: string; limit: { context: number; output: number } }
      > = {};
      for (const [modelId, name] of Object.entries(input.models)) {
        models[modelId] = { name, limit: { context: ctx, output: 8192 } };
      }

      const entry = {
        name: input.name,
        npm: input.npm,
        options: { baseURL: input.baseURL, apiKey: input.apiKey },
        models,
      };

      const cur = (await getClient().config.get({ throwOnError: true })).data as Config;
      const provider = { ...(cur.provider ?? {}), [input.id]: entry };
      // Auto-select this provider's first model as the active default, so the
      // very next message uses it (instead of the engine's keyless default).
      const firstModelId = Object.keys(input.models)[0];
      const model = firstModelId ? `${input.id}/${firstModelId}` : cur.model;
      await getClient().config.update({
        body: { ...cur, provider, model },
        throwOnError: true,
      });

      // Persist to the global opencode.json on disk so the provider survives an
      // engine/app restart (the runtime config.update may not write to disk).
      // Best-effort — non-fatal if the path can't be resolved.
      try {
        await invoke<string>("persist_opencode_provider", {
          id: input.id,
          entryJson: JSON.stringify(entry),
        });
      } catch {
        /* ignore — runtime update already applied for this session */
      }

      // Best-effort: also store the credential in the auth store so native
      // resolution and a future `opencode` run pick it up. Non-fatal on error.
      try {
        await getClient().auth.set({
          path: { id: input.id },
          body: { type: "api", key: input.apiKey },
          throwOnError: true,
        });
      } catch {
        /* ignore — the config-embedded apiKey is sufficient */
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["config", "providers"] });
      qc.invalidateQueries({ queryKey: configKeys.config() });
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
      return (res.data ?? {}) as Record<
        string,
        { connected: boolean; tools?: string[]; error?: string }
      >;
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
