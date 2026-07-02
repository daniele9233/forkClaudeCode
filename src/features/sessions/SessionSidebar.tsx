import { useState } from "react";
import { Plus, Trash2, MessageSquare, Bot, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useSessions,
  useCreateSession,
  useDeleteSession,
  useSessionChildren,
} from "@/opencode/session";
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
        "group relative flex w-full flex-col gap-0.5 border-l-2 px-2.5 py-2 text-left transition-colors",
        isActive
          ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--foreground)]"
          : "border-transparent text-[var(--muted-foreground)] hover:bg-white/[0.04] hover:text-[var(--foreground)]",
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
      <span className="hud-label pl-4 normal-case tracking-normal text-[var(--muted-foreground)]">
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

/** Subagent children shown indented below a parent session */
function SubagentList({
  parentId,
  activeSessionId,
  runningSessions,
  onSelect,
}: {
  parentId: string;
  activeSessionId: string | null;
  runningSessions: Set<string>;
  onSelect: (id: string) => void;
}) {
  const { data: children = [] } = useSessionChildren(parentId);
  if (children.length === 0) return null;

  return (
    <div className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-[var(--border)]/50 pl-2">
      {children.map((child) => {
        const isActive = child.id === activeSessionId;
        const isRunning = runningSessions.has(child.id);
        const title = child.title?.trim() || "Subagent";
        return (
          <button
            key={child.id}
            onClick={() => onSelect(child.id)}
            className={cn(
              "flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left transition-colors",
              isActive
                ? "bg-[var(--primary)]/10 text-[var(--foreground)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]/40 hover:text-[var(--foreground)]",
            )}
          >
            <ChevronRight className="h-2.5 w-2.5 shrink-0 opacity-40" />
            {isRunning ? (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400 animate-pulse" />
            ) : (
              <Bot className="h-2.5 w-2.5 shrink-0 opacity-50" />
            )}
            <span className="truncate text-[10px]">{title}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SessionSidebar() {
  const { data: sessions, isLoading } = useSessions();
  const { activeSessionId, setActiveSession } = useSessionStore();
  const runningSessions = useChatStore((s) => s.runningSessions);
  const createSession = useCreateSession();
  const deleteSession = useDeleteSession();

  // Only top-level sessions (no parentID) shown in the main list; kikkoCode's
  // internal sessions (memory distiller) are title-tagged and hidden.
  const sorted = sessions
    ? [...sessions]
        .filter((s) => !s.parentID && !(s.title ?? "").startsWith("[kikko]"))
        .sort((a, b) => b.time.updated - a.time.updated)
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
    <aside className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pr-2">
        <span className="bp-tab">
          sessions{sorted.length > 0 && ` · ${String(sorted.length).padStart(2, "0")}`}
        </span>
        <button
          onClick={handleNew}
          disabled={createSession.isPending}
          title="New session"
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-sm transition-colors",
            "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
          )}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Session list */}
      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-1.5 pb-3">
        {isLoading && <p className="hud-label px-2 py-2">Loading…</p>}
        {!isLoading && sorted.length === 0 && (
          <p className="hud-label px-2 py-2 opacity-50">No sessions yet</p>
        )}
        {sorted.map((s) => (
          <div key={s.id}>
            <SessionRow
              session={s}
              isActive={s.id === activeSessionId}
              isRunning={runningSessions.has(s.id)}
              onSelect={handleSelect}
              onDelete={handleDelete}
            />
            {/* Show subagent children when this session is active */}
            {s.id === activeSessionId && (
              <SubagentList
                parentId={s.id}
                activeSessionId={activeSessionId}
                runningSessions={runningSessions}
                onSelect={handleSelect}
              />
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
