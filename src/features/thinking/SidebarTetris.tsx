import { lazy, Suspense, useEffect, useState } from "react";
import { X } from "lucide-react";
import { useChatStore } from "@/stores/chat.store";
import { useSessionStore } from "@/stores/session.store";

const Tetris = lazy(() => import("./Tetris"));

/**
 * Auto-playing Tetris in the left sidebar, under Sessions — appears while the
 * agent is working on the active session ("Player 1 is thinking — Player 2
 * plays"). Dismissible for the current run; comes back on the next one.
 */
export function SidebarTetris() {
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const running = useChatStore((s) =>
    activeSessionId ? s.runningSessions.has(activeSessionId) : false,
  );
  const [dismissed, setDismissed] = useState(false);

  // A new run un-dismisses the widget.
  useEffect(() => {
    if (running) setDismissed(false);
  }, [running]);

  if (!running || dismissed) return null;

  return (
    <div className="relative h-64 shrink-0 border-t border-[var(--border)]">
      <button
        onClick={() => setDismissed(true)}
        title="Nascondi per questo run"
        className="absolute right-1.5 top-1.5 z-10 rounded p-0.5 text-[var(--muted-foreground)] hover:bg-white/10 hover:text-[var(--foreground)]"
      >
        <X className="h-3 w-3" />
      </button>
      <Suspense fallback={null}>
        <Tetris isActive />
      </Suspense>
    </div>
  );
}
