import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type {
  EventMessagePartUpdated,
  EventMessagePartRemoved,
  EventMessageUpdated,
  EventSessionIdle,
  EventSessionError,
  EventSessionUpdated,
} from "@opencode-ai/sdk/client";
import { onEventType } from "./events";
import { sessionKeys } from "./session";
import { useChatStore } from "@/stores/chat.store";
import { useSessionStore } from "@/stores/session.store";

/**
 * Mount once (in OpencodeProvider or ChatShell) to wire SSE events into
 * the chat Zustand store and invalidate React Query caches as needed.
 */
export function useChatEvents() {
  const { updatePart, removePart, setMessage, setSessionRunning } = useChatStore();
  const { activeSessionId } = useSessionStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubs = [
      // Text / reasoning / tool parts streaming in
      onEventType<EventMessagePartUpdated>("message.part.updated", (e) => {
        updatePart(e.properties.part.messageID, e.properties.part);
      }),

      onEventType<EventMessagePartRemoved>("message.part.removed", (e) => {
        removePart(e.properties.messageID, e.properties.partID);
      }),

      // Full message metadata update (cost, tokens, error, finish)
      onEventType<EventMessageUpdated>("message.updated", (e) => {
        setMessage(e.properties.info);
        // Invalidate React Query so useSessionMessages refreshes
        queryClient.invalidateQueries({
          queryKey: sessionKeys.messages(e.properties.info.sessionID),
        });
      }),

      // Session started running (prompt admitted)
      onEventType<EventSessionUpdated>("session.updated", (e) => {
        setSessionRunning(e.properties.info.id, true);
      }),

      // Session finished — clear running flag and refresh session list
      onEventType<EventSessionIdle>("session.idle", (e) => {
        const sid = e.properties.sessionID;
        setSessionRunning(sid, false);
        queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sid) });
        queryClient.invalidateQueries({ queryKey: sessionKeys.list() });
      }),

      onEventType<EventSessionError>("session.error", (e) => {
        const sid = e.properties.sessionID;
        if (sid) {
          setSessionRunning(sid, false);
          queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sid) });
        }
      }),
    ];

    return () => unsubs.forEach((fn) => fn());
  }, [updatePart, removePart, setMessage, setSessionRunning, queryClient]);

  const isRunning = activeSessionId
    ? useChatStore.getState().runningSessions.has(activeSessionId)
    : false;

  return { isRunning };
}
