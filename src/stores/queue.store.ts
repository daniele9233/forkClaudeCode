import { create } from "zustand";
import type { AgentMode } from "@/features/chat/ChatInput";

export interface QueuedTask {
  id: string;
  /** The session this task was queued for — it only auto-sends there. */
  sessionId: string;
  text: string;
  mode: AgentMode;
  /** Recipe skills to force-inject when this task finally runs (bypass cap). */
  forcedSkillIds?: string[];
}

interface QueueState {
  /** Tasks waiting for the agent to go idle, FIFO. */
  items: QueuedTask[];

  enqueue: (t: Omit<QueuedTask, "id">) => void;
  remove: (id: string) => void;
  /** Pop the first task queued for this session (FIFO), if any. */
  takeNext: (sessionId: string) => QueuedTask | null;
  clearForSession: (sessionId: string) => void;
}

export const useQueueStore = create<QueueState>((set, get) => ({
  items: [],

  enqueue: (t) =>
    set((s) => ({
      items: [...s.items, { ...t, id: crypto.randomUUID() }],
    })),

  remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

  takeNext: (sessionId) => {
    const next = get().items.find((i) => i.sessionId === sessionId) ?? null;
    if (next) {
      set((s) => ({ items: s.items.filter((i) => i.id !== next.id) }));
    }
    return next;
  },

  clearForSession: (sessionId) =>
    set((s) => ({ items: s.items.filter((i) => i.sessionId !== sessionId) })),
}));
