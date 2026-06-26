import { useState } from "react";
import { Plus, Trash2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessions, useCreateSession, useDeleteSession } from "@/opencode/session";
import { useSessionStore } from "@/stores/session.store";
import { useChatStore } from "@/stores/chat.store";
import type { Session } from "@opencode-ai/sdk/client";

function relativeTime(ts: number): string {
  const diff = Date.now() - ts * 1000;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

interface SessionRowProps {
  session: Session;
  isActive: boolean;
  isRunning: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

function SessionRow({
  session,
  isActive,
  isRunning,
  onSelect,
  onDelete,
}: SessionRowProps) {
  const [hovered, setHovered] = useState(false);
  const title = session.title?.trim() || "New session";

  return (
    <button
      className={cn(
        "group relative flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors",
        isActive
          ? "bg-[var(--primary)]/10 text-[var(--foreground)]"
          : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]/40 hover:text-[var(--foreground)]",
      )}
      onClick={() => onSelect(session.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center gap-1.5 pr-5">
        {isRunning ? (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)] animate-pulse" />
        ) : (
          <MessageSquare className="h-3 w-3 shrink-0 opacity-50" />
        )}
        <span className="truncate text-xs font-medium">{title}</span>
      </div>
      <span className="pl-4 text-[10px] text-[var(--muted-foreground)]">
        {relativeTime(session.time.updated)}
      </span>

      {/* Delete button — visible on hover when not active running */}
      {hovered && !isRunning && (
        <button
          className={cn(
            "absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 transition-colors",
            "text-[var(--muted-foreground)] hover:bg-red-950/40 hover:text-red-400",
          )}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(session.id);
          }}
          title="Delete session"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </button>
  );
}

export function SessionSidebar() {
  const { data: sessions, isLoading } = useSessions();
  const { activeSessionId, setActiveSession } = useSessionStore();
  const runningSessions = useChatStore((s) => s.runningSessions);
  const createSession = useCreateSession();
  const deleteSession = useDeleteSession();

  const sorted = sessions
    ? [...sessions].sort((a, b) => b.time.updated - a.time.updated)
    : [];

  const handleNew = async () => {
    const s = await createSession.mutateAsync({});
    setActiveSession(s.id);
  };

  const handleSelect = (id: string) => {
    setActiveSession(id);
  };

  const handleDelete = (id: string) => {
    deleteSession.mutate(id);
    if (activeSessionId === id) {
      // Switch to the next available session
      const next = sorted.find((s) => s.id !== id);
      setActiveSession(next?.id ?? null);
    }
  };

  return (
    <aside className="flex h-full flex-col bg-[var(--background)]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Sessions
        </span>
        <button
          onClick={handleNew}
          disabled={createSession.isPending}
          title="New session"
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
            "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
          )}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Session list */}
      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-1.5 pb-3">
        {isLoading && (
          <p className="px-2 text-xs text-[var(--muted-foreground)]">Loading…</p>
        )}
        {!isLoading && sorted.length === 0 && (
          <p className="px-2 text-xs text-[var(--muted-foreground)]">No sessions yet.</p>
        )}
        {sorted.map((s) => (
          <SessionRow
            key={s.id}
            session={s}
            isActive={s.id === activeSessionId}
            isRunning={runningSessions.has(s.id)}
            onSelect={handleSelect}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </aside>
  );
}
