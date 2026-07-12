import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useChatStore } from "@/stores/chat.store";
import { useSessionStore } from "@/stores/session.store";
import { useUIStore } from "@/stores/ui.store";
import { NeuralBrain } from "./NeuralBrain";

/**
 * The "digital brain" panel at the bottom of the left sidebar (video-style):
 * always alive, firing harder while the agent works. Widening the sidebar
 * (drag its right edge) makes the brain bigger. Collapsible via the header.
 */
export function SidebarBrain() {
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const running = useChatStore((s) =>
    activeSessionId ? s.runningSessions.has(activeSessionId) : false,
  );
  const sidebarWidth = useUIStore((s) => s.sidebarWidth);
  const [collapsed, setCollapsed] = useState(false);

  // Bigger sidebar → bigger brain (the whole point of the resizable sidebar).
  const height = Math.round(Math.min(Math.max(sidebarWidth * 0.95, 240), 480));

  return (
    <div className="shrink-0 border-t border-[var(--border)] bg-black">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left"
        title={collapsed ? "Mostra il cervello" : "Comprimi"}
      >
        <span className="relative flex h-2 w-2">
          {running && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--chat-agent-accent)] opacity-60" />
          )}
          <span
            className="relative inline-flex h-2 w-2 rounded-full"
            style={{
              background: running
                ? "var(--chat-agent-accent)"
                : "var(--muted-foreground)",
            }}
          />
        </span>
        <span className="hud-label flex-1 text-[var(--muted-foreground)]">
          neurolink · cortex
        </span>
        <span
          className="hud-label font-semibold"
          style={{
            color: running ? "var(--chat-agent-accent)" : "var(--muted-foreground)",
          }}
        >
          {running ? "live" : "idle"}
        </span>
        {collapsed ? (
          <ChevronUp className="h-3 w-3 text-[var(--muted-foreground)]" />
        ) : (
          <ChevronDown className="h-3 w-3 text-[var(--muted-foreground)]" />
        )}
      </button>
      {!collapsed && (
        <div style={{ height }}>
          <NeuralBrain running={running} />
        </div>
      )}
    </div>
  );
}
