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

  updatePart: (messageId: string, part: Part) => void;
  removePart: (messageId: string, partId: string) => void;
  setMessage: (msg: Message) => void;
  setSessionRunning: (sessionId: string, running: boolean) => void;
  clearSession: (sessionId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  liveParts: new Map(),
  liveMessages: new Map(),
  runningSessions: new Set(),

  updatePart: (messageId, part) =>
    set((s) => {
      const next = new Map(s.liveParts);
      const parts = new Map(next.get(messageId) ?? []);
      parts.set(part.id, part);
      next.set(messageId, parts);
      return { liveParts: next };
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
      return { liveMessages: next };
    }),

  setSessionRunning: (sessionId, running) =>
    set((s) => {
      const next = new Set(s.runningSessions);
      if (running) next.add(sessionId);
      else next.delete(sessionId);
      return { runningSessions: next };
    }),

  clearSession: (sessionId) =>
    set((s) => {
      // Remove all live parts/messages belonging to this session.
      // (Parts carry sessionID, but we clear conservatively by session.)
      const nextParts = new Map(s.liveParts);
      const nextMsgs = new Map(s.liveMessages);
      for (const [msgId, _] of nextParts) {
        const msg = nextMsgs.get(msgId);
        if (msg && msg.sessionID === sessionId) {
          nextParts.delete(msgId);
          nextMsgs.delete(msgId);
        }
      }
      const nextRunning = new Set(s.runningSessions);
      nextRunning.delete(sessionId);
      return { liveParts: nextParts, liveMessages: nextMsgs, runningSessions: nextRunning };
    }),
}));
