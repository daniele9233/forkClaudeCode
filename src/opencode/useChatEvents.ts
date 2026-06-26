import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type {
  EventMessagePartUpdated,
  EventMessagePartRemoved,
  EventMessageUpdated,
  EventSessionIdle,
  EventSessionError,
  EventSessionUpdated,
  EventPermissionUpdated,
  EventSessionCompacted,
} from "@opencode-ai/sdk/client";
import { onEventType } from "./events";
import { sessionKeys } from "./session";
import { contextKeys } from "./context";
import { useChatStore } from "@/stores/chat.store";
import { useSessionStore } from "@/stores/session.store";
import { usePermissionStore } from "@/stores/permission.store";
import { getClient } from "./client";

/**
 * Mount once (in OpencodeProvider or ChatShell) to wire SSE events into
 * the chat Zustand store and invalidate React Query caches as needed.
 */
export function useChatEvents() {
  const { updatePart, removePart, setMessage, setSessionRunning } = useChatStore();
  const { activeSessionId } = useSessionStore();
  const { addPending, isAutoAllowed } = usePermissionStore();
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

      // Compaction finished — context shrunk, re-fetch context messages
      onEventType<EventSessionCompacted>("session.compacted", (e) => {
        const sid = e.properties.sessionID;
        queryClient.invalidateQueries({
          queryKey: contextKeys.messages(sid),
        });
        queryClient.invalidateQueries({ queryKey: sessionKeys.messages(sid) });
      }),

      // HITL: permission request from the agent
      onEventType<EventPermissionUpdated>("permission.updated", (e) => {
        const p = e.properties;
        if (isAutoAllowed(p)) {
          // Auto-approve silently
          getClient()
            .postSessionIdPermissionsPermissionId({
              path: { id: p.sessionID, permissionID: p.id },
              body: { response: "always" },
            })
            .catch(() => {
              // If auto-approve fails, fall back to showing the banner
              addPending(p);
            });
        } else {
          addPending(p);
        }
      }),
    ];

    return () => unsubs.forEach((fn) => fn());
  }, [
    updatePart,
    removePart,
    setMessage,
    setSessionRunning,
    addPending,
    isAutoAllowed,
    queryClient,
  ]);

  const isRunning = activeSessionId
    ? useChatStore.getState().runningSessions.has(activeSessionId)
    : false;

  return { isRunning };
}
