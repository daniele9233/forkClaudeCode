import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type {
  EventMessagePartUpdated,
  EventMessagePartRemoved,
  EventMessageUpdated,
  EventSessionIdle,
  EventSessionError,
  EventSessionUpdated,
  EventSessionCreated,
  EventPermissionUpdated,
  EventSessionCompacted,
  EventTodoUpdated,
} from "@opencode-ai/sdk/client";
import { onEventType } from "./events";
import { sessionKeys } from "./session";
import { contextKeys } from "./context";
import { syncStaticPreviewOnIdle } from "./preview";
import { autopilotOnIdle } from "./autopilot";
import { memoryOnIdle, isSilentSession } from "./memory";
import { notifyWhenUnfocused } from "@/lib/notify";
import { useChatStore } from "@/stores/chat.store";
import { useSessionStore } from "@/stores/session.store";
import { usePermissionStore } from "@/stores/permission.store";
import { useTodoStore } from "@/stores/todo.store";
import { useAutopilotStore } from "@/stores/autopilot.store";
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

      // Full message metadata update (cost, tokens, error, finish).
      // Store it live only — do NOT invalidate the messages query here: during
      // streaming this fires on every token tick and a full refetch each time
      // causes jank and lag. The final reconcile happens on session.idle.
      onEventType<EventMessageUpdated>("message.updated", (e) => {
        setMessage(e.properties.info);
      }),

      // Session metadata changed (title, revert, etc.). Note: this fires for
      // many reasons — including title generation AFTER a run finishes — so it
      // must NOT set the running flag, or the UI gets stuck on "Working". The
      // running flag is set on send (useSendPrompt) and cleared on idle/error.
      onEventType<EventSessionUpdated>("session.updated", () => {
        queryClient.invalidateQueries({ queryKey: sessionKeys.list() });
      }),

      // Session finished — clear running flag and refresh session list
      onEventType<EventSessionIdle>("session.idle", (e) => {
        const sid = e.properties.sessionID;
        setSessionRunning(sid, false);
        // kikkoCode-internal sessions (memory distiller): no notifications,
        // no preview/autopilot/queue reactions — they are invisible plumbing.
        if (isSilentSession(sid)) return;
        queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sid) });
        queryClient.invalidateQueries({ queryKey: sessionKeys.list() });
        // Reconcile: refetch the authoritative history, THEN drop the live
        // copies for this session — frees memory without a visual gap (the
        // refetched rows replace the live entries in the same render).
        queryClient
          .invalidateQueries({ queryKey: sessionKeys.messages(sid) })
          .then(() => useChatStore.getState().clearSession(sid))
          .catch(() => {
            /* refetch failed — keep the live copies so nothing disappears */
          });
        // Refresh the review panel (files touched during the run).
        queryClient.invalidateQueries({ queryKey: ["files"] });
        // If the agent produced a web page, auto-open/refresh it in the preview.
        void syncStaticPreviewOnIdle();
        // Autopilot: decide continue / done / budget-hit for this session.
        void autopilotOnIdle(sid);

        // While an autopilot run owns this session, EACH round goes idle — but
        // the goal isn't finished, so skip the "task finished" notification and
        // the memory distiller (autopilot fires its own notifications on finish).
        const auto = useAutopilotStore.getState();
        if (auto.active && auto.sessionId === sid) return;

        // Project memory: distill durable knowledge into AGENTS.md (throttled).
        void memoryOnIdle(sid);
        // Desktop heads-up if the user is in another window.
        void notifyWhenUnfocused(
          "kikkoCode",
          "Task finished — the agent is done and waiting for you.",
        );
      }),

      onEventType<EventSessionError>("session.error", (e) => {
        const sid = e.properties.sessionID;
        if (sid) {
          setSessionRunning(sid, false);
          queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sid) });
        }
      }),

      // New session created (may be a subagent) — refresh list + parent children
      onEventType<EventSessionCreated>("session.created", (e) => {
        queryClient.invalidateQueries({ queryKey: sessionKeys.list() });
        const parentId = e.properties.info.parentID;
        if (parentId) {
          queryClient.invalidateQueries({
            queryKey: [...sessionKeys.detail(parentId), "children"],
          });
        }
      }),

      // The agent's plan (todo list) changed — update the live plan tree.
      onEventType<EventTodoUpdated>("todo.updated", (e) => {
        useTodoStore.getState().setTodos(e.properties.sessionID, e.properties.todos);
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

  // Subscribe reactively so the UI updates when the running state flips.
  const runningSessions = useChatStore((s) => s.runningSessions);
  const isRunning = activeSessionId ? runningSessions.has(activeSessionId) : false;

  return { isRunning };
}
