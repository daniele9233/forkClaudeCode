import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type {
  Config,
  Agent,
  McpLocalConfig,
  McpRemoteConfig,
} from "@opencode-ai/sdk/client";
import { getClient, initClient } from "./client";
import { startEventStream, stopEventStream } from "./events";
import { useModelStore } from "@/stores/model.store";

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

export interface ConnectProviderInput {
  /** Native opencode provider id, e.g. "deepseek". */
  providerId: string;
  /** Env var the engine reads the key from, e.g. "DEEPSEEK_API_KEY". */
  envVar: string;
  apiKey: string;
}

/**
 * Connect a built-in provider — belt AND braces, because engine versions differ
 * in what they honor:
 * 1. write the key into the engine's NATIVE auth store (same effect as
 *    `opencode auth login`: persisted in auth.json, read on every startup);
 * 2. inject `<ENV_VAR>=<key>` into the engine's environment and restart it;
 * 3. wait (up to ~30s) for the provider to appear, prefer its plain chat model,
 *    and make it the active model — this also unseats any auto-configured
 *    default provider (e.g. a zai/GLM free-tier login);
 * 4. if the provider never appears, throw a DIAGNOSTIC error listing what the
 *    engine actually exposes, instead of failing silently.
 */
export function useConnectProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ providerId, envVar, apiKey }: ConnectProviderInput) => {
      // 1. Native auth store first (survives restarts; doesn't depend on env
      // propagation quirks across engine versions).
      try {
        await getClient().auth.set({
          path: { id: providerId },
          body: { type: "api", key: apiKey },
          throwOnError: true,
        });
      } catch {
        /* engine may be mid-restart — the env path below still covers us */
      }

      // 2. Env var + engine restart.
      const newUrl = await invoke<string>("set_provider_key", { envVar, key: apiKey });
      // Re-point the client at the restarted engine and restart the SSE stream
      // (the old stream died with the old process; the provider's ready-guard
      // won't restart it, so we do it here).
      initClient(newUrl);
      stopEventStream();
      void startEventStream();

      // 3. Wait for the restarted engine to expose the provider, then select a model.
      let firstModel: string | undefined;
      let providerModelIds: string[] = [];
      let exposed: string[] = [];
      for (let i = 0; i < 60 && !firstModel; i++) {
        try {
          const res = await getClient().config.providers({ throwOnError: true });
          const providers = res.data?.providers ?? [];
          exposed = providers.map((x) => x.id);
          const p = providers.find((x) => x.id === providerId);
          if (p) {
            const ids = Object.keys(p.models ?? {});
            providerModelIds = ids;
            // Default a FIRST-time connect to the plain chat model (reasoning
            // models are much slower and this app iterates on UI a lot); fall
            // back to the first available. An existing manual choice for this
            // provider is honored below and overrides this.
            firstModel =
              ids.find((m) => m === "deepseek-chat") ??
              ids.find((m) => /chat/i.test(m) && !/reason/i.test(m)) ??
              ids.find((m) => !/reason/i.test(m)) ??
              ids[0];
          }
        } catch {
          /* engine still restarting */
        }
        if (!firstModel) await new Promise((r) => setTimeout(r, 500));
      }

      if (!firstModel) {
        throw new Error(
          `Key saved, but the engine never exposed provider "${providerId}" ` +
            `(it exposes: ${exposed.length ? exposed.join(", ") : "none"}). ` +
            `Close and reopen the app, then pick the model from the switcher; ` +
            `if it still misses, run \`opencode auth list\` in a terminal.`,
        );
      }

      // 4. Make a model active. Respect an EXISTING manual choice for this same
      // provider so re-verifying the key (or a reconnect) never clobbers the
      // model the user picked — e.g. they switched to `deepseek-reasoner` and
      // re-entering the key must not snap them back to `deepseek-chat`. Only a
      // first-time connect (no prior choice for this provider) uses the default.
      const existing = useModelStore.getState().selected;
      const existingModelId =
        existing && existing.startsWith(`${providerId}/`)
          ? existing.slice(providerId.length + 1)
          : undefined;
      const keepExisting =
        existingModelId !== undefined &&
        (providerModelIds.length === 0 || providerModelIds.includes(existingModelId));
      const chosen = keepExisting ? existingModelId! : firstModel;

      // Our own store is what the send path uses (per-prompt model param —
      // effective even when an auth plugin pins the engine's config.model);
      // config.update is best-effort sync on top.
      useModelStore.getState().setSelected(`${providerId}/${chosen}`);
      try {
        const cur = (await getClient().config.get({ throwOnError: true })).data as Config;
        await getClient().config.update({
          body: { ...cur, model: `${providerId}/${chosen}` },
          throwOnError: true,
        });
      } catch {
        /* engine config pinned/rejected — the store selection still applies */
      }
      return { providerId, firstModel: chosen };
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
