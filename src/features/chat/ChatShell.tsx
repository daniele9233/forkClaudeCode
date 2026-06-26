import { useCallback } from "react";
import { TerminalSquare } from "lucide-react";
import { useChatEvents } from "@/opencode/useChatEvents";
import { useSessionStore } from "@/stores/session.store";
import { useSendPrompt, useCreateSession, useAbortSession } from "@/opencode/session";
import { useTerminalEvents } from "@/features/terminal/useTerminalEvents";
import { useUIStore } from "@/stores/ui.store";
import { cn } from "@/lib/utils";
import { DevServerBanner } from "@/features/preview/DevServerBanner";
import { MessageList } from "./MessageList";
import { ChatInput, type AgentMode } from "./ChatInput";
import { PermissionBanner } from "./PermissionBanner";

export function ChatShell() {
  const { isRunning } = useChatEvents();
  useTerminalEvents();
  const { activeSessionId, sidecarStatus, setActiveSession } = useSessionStore();
  const { bottomOpen, bottomTab, toggleTerminal } = useUIStore();
  const sendPrompt = useSendPrompt();
  const createSession = useCreateSession();
  const abortSession = useAbortSession();
  const terminalActive = bottomOpen && bottomTab === "terminal";

  const handleSend = useCallback(
    async (text: string, mode: AgentMode) => {
      let sessionId = activeSessionId;

      // Auto-create session if none active
      if (!sessionId) {
        const session = await createSession.mutateAsync({});
        sessionId = session.id;
        setActiveSession(sessionId);
      }

      sendPrompt.mutate({ sessionId, text, agent: mode });
    },
    [activeSessionId, createSession, sendPrompt, setActiveSession],
  );

  const handleAbort = useCallback(() => {
    if (activeSessionId) {
      abortSession.mutate(activeSessionId);
    }
  }, [activeSessionId, abortSession]);

  const isReady = sidecarStatus === "ready";
  const isDisabled = !isReady || sendPrompt.isPending || createSession.isPending;

  return (
    <div className="flex h-full flex-col bg-[var(--background)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--foreground)]">Forgia</span>
          {isRunning && (
            <span className="flex items-center gap-1 text-xs text-[var(--primary)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
              Working…
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {sidecarStatus !== "ready" && (
            <span className="text-xs text-[var(--muted-foreground)] capitalize">
              {sidecarStatus === "starting" ? "Connecting…" : sidecarStatus}
            </span>
          )}
          <button
            onClick={toggleTerminal}
            title="Toggle terminal"
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
              terminalActive
                ? "bg-[var(--primary)]/15 text-[var(--primary)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            <TerminalSquare className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Dev-server detection banner */}
      <DevServerBanner />

      {/* Message area */}
      {activeSessionId ? (
        <MessageList sessionId={activeSessionId} isRunning={isRunning} />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-6">
          <div className="text-5xl select-none">⚒️</div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Welcome to Forgia
          </h2>
          <p className="text-sm text-[var(--muted-foreground)] max-w-sm">
            Send your first message to start an agent session.
          </p>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-[var(--border)] pt-2">
        <PermissionBanner />
        <div className="px-3 pb-3">
          <ChatInput
            onSend={handleSend}
            onAbort={handleAbort}
            disabled={isDisabled}
            isRunning={isRunning}
          />
          {sidecarStatus === "error" && (
            <p className="mt-1.5 text-center text-xs text-red-400">
              OpenCode engine unavailable. Restart the app.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
