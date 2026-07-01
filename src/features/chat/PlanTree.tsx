import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  ChevronDown,
  ListTodo,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getClient } from "@/opencode/client";
import { useTodoStore, type Todo } from "@/stores/todo.store";
import { useSessionStore } from "@/stores/session.store";

function statusIcon(status: string) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-online)]" />;
    case "in_progress":
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--primary)]" />;
    case "cancelled":
      return <XCircle className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />;
    default:
      return <Circle className="h-3.5 w-3.5 text-[var(--muted-foreground)]/60" />;
  }
}

const PRIORITY_COLOR: Record<string, string> = {
  high: "text-red-400",
  medium: "text-amber-400",
  low: "text-[var(--muted-foreground)]",
};

/**
 * Live plan tree — renders the agent's todo list (opencode's structured plan)
 * as a checklist that ticks off in real time via `todo.updated` events. Shows
 * nothing until the agent actually produces a plan.
 */
export function PlanTree({ sessionId }: { sessionId: string }) {
  const todos = useTodoStore((s) => s.bySession.get(sessionId)) ?? [];
  const setTodos = useTodoStore((s) => s.setTodos);
  // Only touch the SDK client once the engine is ready (opencodeUrl is set right
  // after initClient) — otherwise a persisted session can mount this before the
  // client exists and getClient() throws.
  const opencodeUrl = useSessionStore((s) => s.opencodeUrl);
  const [collapsed, setCollapsed] = useState(false);

  // Seed from the server on mount (covers reloads / switching sessions).
  useEffect(() => {
    if (!opencodeUrl) return;
    let cancelled = false;
    getClient()
      .session.todo({ path: { id: sessionId }, throwOnError: true })
      .then((res) => {
        const list = (res.data ?? []) as Todo[];
        if (!cancelled && list.length) setTodos(sessionId, list);
      })
      .catch(() => {
        /* no todos / endpoint unavailable — fine */
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, setTodos, opencodeUrl]);

  if (todos.length === 0) return null;

  const done = todos.filter((t) => t.status === "completed").length;

  return (
    <div className="glass mx-4 mt-3 border border-[var(--border)]">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center gap-2 border-b border-[var(--border)] px-3 py-1.5 text-left"
      >
        <ListTodo className="h-3.5 w-3.5 text-[var(--primary)]" />
        <span className="hud-label">plan</span>
        <span className="text-[10px] text-[var(--muted-foreground)]">
          {done}/{todos.length}
        </span>
        {/* progress bar */}
        <span className="mx-1 h-1 flex-1 overflow-hidden rounded-full bg-[var(--muted)]">
          <span
            className="block h-full bg-[var(--primary)] transition-all"
            style={{ width: `${todos.length ? (done / todos.length) * 100 : 0}%` }}
          />
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)] transition-transform",
            collapsed && "-rotate-90",
          )}
        />
      </button>

      {!collapsed && (
        <ol className="space-y-0.5 px-3 py-2">
          {todos.map((t, i) => (
            <li key={t.id} className="flex items-start gap-2 py-0.5 text-xs">
              <span className="mt-0.5 shrink-0">{statusIcon(t.status)}</span>
              <span className="w-5 shrink-0 text-right font-mono text-[10px] text-[var(--muted-foreground)]/50">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 leading-relaxed",
                  t.status === "completed" &&
                    "text-[var(--muted-foreground)] line-through",
                  t.status === "cancelled" &&
                    "text-[var(--muted-foreground)]/50 line-through",
                  t.status === "in_progress" && "text-[var(--foreground)]",
                )}
              >
                {t.content}
              </span>
              {t.priority && t.priority !== "medium" && (
                <span
                  className={cn(
                    "shrink-0 text-[9px] uppercase tracking-wider",
                    PRIORITY_COLOR[t.priority] ?? "text-[var(--muted-foreground)]",
                  )}
                >
                  {t.priority}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
