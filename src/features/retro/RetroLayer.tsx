import { lazy, Suspense, useEffect, useState } from "react";
import { X } from "lucide-react";
import { useThemeStore } from "@/stores/theme.store";
import { useChatStore } from "@/stores/chat.store";
import { useSessionStore } from "@/stores/session.store";

const Tetris = lazy(() => import("./Tetris"));

/**
 * Extras of the Retro OS skin, mounted once in App: a CRT scanline overlay and
 * an auto-playing Tetris that pops up while the agent is working ("Player 1 is
 * thinking — Player 2 plays"). Renders nothing in the classic UI. The Tetris
 * panel can be dismissed for the current run; it comes back on the next one.
 */
export function RetroLayer() {
  const ui = useThemeStore((s) => s.ui);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const running = useChatStore((s) =>
    activeSessionId ? s.runningSessions.has(activeSessionId) : false,
  );
  const [dismissed, setDismissed] = useState(false);

  // A new run un-dismisses the widget.
  useEffect(() => {
    if (running) setDismissed(false);
  }, [running]);

  if (ui !== "retro") return null;

  const showTetris = running && !dismissed;

  return (
    <>
      <div className="retro-scanlines" aria-hidden />
      {showTetris && (
        <div className="fixed bottom-12 right-4 z-[70] flex h-80 w-48 flex-col border border-[var(--primary)]/40 bg-black shadow-[0_0_30px_rgba(255,0,255,0.25)]">
          <div className="flex items-center justify-between border-b border-[var(--primary)]/20 px-2 py-1">
            <span className="hud-label text-[10px] uppercase text-[var(--primary)]">
              Player 2 — Tetris
            </span>
            <button
              onClick={() => setDismissed(true)}
              aria-label="Hide Tetris"
              className="p-0.5 text-[var(--muted-foreground)] transition-colors hover:text-[var(--primary)]"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <Suspense fallback={null}>
              <Tetris isActive={showTetris} />
            </Suspense>
          </div>
        </div>
      )}
    </>
  );
}
