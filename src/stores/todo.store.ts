import { create } from "zustand";
import type { Todo } from "@opencode-ai/sdk/client";

export type { Todo };

interface TodoState {
  /** sessionId → the agent's current plan (todo list). */
  bySession: Map<string, Todo[]>;
  setTodos: (sessionId: string, todos: Todo[]) => void;
}

export const useTodoStore = create<TodoState>((set) => ({
  bySession: new Map(),
  setTodos: (sessionId, todos) =>
    set((s) => {
      const next = new Map(s.bySession);
      next.set(sessionId, todos);
      return { bySession: next };
    }),
}));
