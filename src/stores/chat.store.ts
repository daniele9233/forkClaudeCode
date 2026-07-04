import { create } from "zustand";
import type { Message, Part } from "@opencode-ai/sdk/client";

/** Live parts for a message, keyed by partId. Updated by SSE events. */
type PartMap = Map<string, Part>;

interface ChatState {
  /** SSE-pushed parts per message. messageId → (partId → Part) */
  liveParts: Map<string, PartMap>;
  /** Full message metadata pushed by EventMessageUpdated. */
  liveMessages: Map<string, Message>;
  /** Sessions currently running (waiting for EventSessionIdle). */
  runningSessions: Set<string>;
  /** Last time (ms) any streaming activity arrived for a session — used by the
   *  stall watchdog to tell "still working" from "stuck / looping". */
  lastActivityAt: Map<string, number>;

  updatePart: (messageId: string, part: Part) => void;
  removePart: (messageId: string, partId: string) => void;
  setMessage: (msg: Message) => void;
  setSessionRunning: (sessionId: string, running: boolean) => void;
  clearSession: (sessionId: string) => void;
}

/** Record streaming activity for a session (helper — keeps the map fresh). */
function touch(
  map: Map<string, number>,
  sessionId: string | undefined,
): Map<string, number> {
  if (!sessionId) return map;
  const next = new Map(map);
  next.set(sessionId, Date.now());
  return next;
}

export const useChatStore = create<ChatState>((set) => ({
  liveParts: new Map(),
  liveMessages: new Map(),
  runningSessions: new Set(),
  lastActivityAt: new Map(),

  updatePart: (messageId, part) =>
    set((s) => {
      const next = new Map(s.liveParts);
      const parts = new Map(next.get(messageId) ?? []);
      parts.set(part.id, part);
      next.set(messageId, parts);
      const sid = (part as { sessionID?: string }).sessionID;
      return { liveParts: next, lastActivityAt: touch(s.lastActivityAt, sid) };
    }),

  removePart: (messageId, partId) =>
    set((s) => {
      const next = new Map(s.liveParts);
      const parts = new Map(next.get(messageId) ?? []);
      parts.delete(partId);
      next.set(messageId, parts);
      return { liveParts: next };
    }),

  setMessage: (msg) =>
    set((s) => {
      const next = new Map(s.liveMessages);
      next.set(msg.id, msg);
      return {
        liveMessages: next,
        lastActivityAt: touch(s.lastActivityAt, msg.sessionID),
      };
    }),

  setSessionRunning: (sessionId, running) =>
    set((s) => {
      const next = new Set(s.runningSessions);
      if (running) next.add(sessionId);
      else next.delete(sessionId);
      // Reset the activity clock when a run starts, so the watchdog measures
      // silence from the send, not from some stale earlier tick.
      return {
        runningSessions: next,
        lastActivityAt: running ? touch(s.lastActivityAt, sessionId) : s.lastActivityAt,
      };
    }),

  clearSession: (sessionId) =>
    set((s) => {
      // Remove all live parts/messages belonging to this session. Called after
      // the history refetch on session.idle, so the reconciled data replaces
      // the live copies — without this the maps grow for the app's lifetime.
      const nextParts = new Map(s.liveParts);
      const nextMsgs = new Map(s.liveMessages);
      for (const [msgId, parts] of nextParts) {
        const msg = nextMsgs.get(msgId);
        // Parts carry sessionID too — covers parts that never got a message.
        const first = parts.values().next().value as { sessionID?: string } | undefined;
        if (msg?.sessionID === sessionId || first?.sessionID === sessionId) {
          nextParts.delete(msgId);
        }
      }
      for (const [msgId, msg] of nextMsgs) {
        if (msg.sessionID === sessionId) nextMsgs.delete(msgId);
      }
      const nextRunning = new Set(s.runningSessions);
      nextRunning.delete(sessionId);
      return {
        liveParts: nextParts,
        liveMessages: nextMsgs,
        runningSessions: nextRunning,
      };
    }),
}));
