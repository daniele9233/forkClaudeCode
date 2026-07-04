import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session, AssistantMessage, FilePartInput } from "@opencode-ai/sdk/client";
import { getClient } from "./client";
import { useChatStore } from "@/stores/chat.store";

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

interface SendPromptInput {
  sessionId: string;
  text: string;
  modelID?: string;
  providerID?: string;
  agent?: string;
  /** System-role instructions (skill playbooks + directives) — kept out of the
   *  user message so the model follows them more reliably. */
  system?: string;
  /** Extra file parts (e.g. a preview screenshot for visual review). */
  files?: FilePartInput[];
}

/** Send a prompt to a session. */
export function useSendPrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    // Mark the session running the moment we send. The "running" flag is owned
    // by the send→idle window, NOT by session.updated (which also fires for
    // title/metadata changes and would otherwise get the UI stuck on "Working").
    onMutate: ({ sessionId }: SendPromptInput) => {
      useChatStore.getState().setSessionRunning(sessionId, true);
    },
    onError: (_err, variables) => {
      useChatStore.getState().setSessionRunning(variables.sessionId, false);
    },
    mutationFn: async ({
      sessionId,
      text,
      modelID,
      providerID,
      agent,
      system,
      files,
    }: SendPromptInput) => {
      const res = await getClient().session.prompt({
        path: { id: sessionId },
        body: {
          parts: [{ type: "text", text }, ...(files ?? [])],
          ...(modelID && providerID ? { model: { modelID, providerID } } : {}),
          ...(agent ? { agent } : {}),
          ...(system ? { system } : {}),
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

/** Get child (subagent) sessions for a parent session. */
export function useSessionChildren(sessionId: string | null) {
  return useQuery({
    queryKey: [...sessionKeys.detail(sessionId ?? ""), "children"] as const,
    queryFn: async () => {
      const res = await getClient().session.children({
        path: { id: sessionId! },
        throwOnError: true,
      });
      return res.data ?? [];
    },
    enabled: !!sessionId,
    staleTime: 10_000,
  });
}

/** Revert a session to a specific message (checkpoint). */
export function useRevertSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      messageId,
    }: {
      sessionId: string;
      messageId: string;
    }) => {
      const res = await getClient().session.revert({
        path: { id: sessionId },
        body: { messageID: messageId },
        throwOnError: true,
      });
      return res.data;
    },
    onSuccess: (_data, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
      queryClient.invalidateQueries({ queryKey: sessionKeys.messages(sessionId) });
    },
  });
}

/** Restore all reverted messages in a session. */
export function useUnrevertSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await getClient().session.unrevert({
        path: { id: sessionId },
        throwOnError: true,
      });
      return res.data;
    },
    onSuccess: (_data, sessionId) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
      queryClient.invalidateQueries({ queryKey: sessionKeys.messages(sessionId) });
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
