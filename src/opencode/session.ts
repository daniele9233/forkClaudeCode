import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session, AssistantMessage } from "@opencode-ai/sdk/client";
import { getClient } from "./client";

export type { Session, AssistantMessage };

export const sessionKeys = {
  all: ["sessions"] as const,
  list: () => [...sessionKeys.all, "list"] as const,
  detail: (id: string) => [...sessionKeys.all, "detail", id] as const,
  messages: (id: string) => [...sessionKeys.all, "messages", id] as const,
};

/** List all sessions. */
export function useSessions() {
  return useQuery({
    queryKey: sessionKeys.list(),
    queryFn: async () => {
      const res = await getClient().session.list({ throwOnError: true });
      return res.data ?? [];
    },
  });
}

/** Get a single session by ID. */
export function useSession(sessionId: string | null) {
  return useQuery({
    queryKey: sessionKeys.detail(sessionId ?? ""),
    queryFn: async () => {
      const res = await getClient().session.get({
        path: { id: sessionId! },
        throwOnError: true,
      });
      return res.data;
    },
    enabled: !!sessionId,
  });
}

/** Get messages for a session. */
export function useSessionMessages(sessionId: string | null) {
  return useQuery({
    queryKey: sessionKeys.messages(sessionId ?? ""),
    queryFn: async () => {
      const res = await getClient().session.messages({
        path: { id: sessionId! },
        throwOnError: true,
      });
      return res.data ?? [];
    },
    enabled: !!sessionId,
  });
}

/** Create a new session. */
export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (opts?: { title?: string; parentID?: string }) => {
      const res = await getClient().session.create({
        body: opts,
        throwOnError: true,
      });
      return res.data as Session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.list() });
    },
  });
}

/** Send a prompt to a session. */
export function useSendPrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      text,
      modelID,
      providerID,
      agent,
    }: {
      sessionId: string;
      text: string;
      modelID?: string;
      providerID?: string;
      agent?: string;
    }) => {
      const res = await getClient().session.prompt({
        path: { id: sessionId },
        body: {
          parts: [{ type: "text", text }],
          ...(modelID && providerID ? { model: { modelID, providerID } } : {}),
          ...(agent ? { agent } : {}),
        },
        throwOnError: true,
      });
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: sessionKeys.messages(variables.sessionId),
      });
      queryClient.invalidateQueries({
        queryKey: sessionKeys.detail(variables.sessionId),
      });
    },
  });
}

/** Abort a running session. */
export function useAbortSession() {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      await getClient().session.abort({
        path: { id: sessionId },
        throwOnError: true,
      });
    },
  });
}

/** Delete a session and all its data. */
export function useDeleteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      await getClient().session.delete({
        path: { id: sessionId },
        throwOnError: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.list() });
    },
  });
}
