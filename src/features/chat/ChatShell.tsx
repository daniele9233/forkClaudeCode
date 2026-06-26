import { useCallback } from "react";
import { TerminalSquare, Settings } from "lucide-react";
import { useChatEvents } from "@/opencode/useChatEvents";
import { useSessionStore } from "@/stores/session.store";
import { useSendPrompt, useCreateSession, useAbortSession } from "@/opencode/session";
import { useTerminalEvents } from "@/features/terminal/useTerminalEvents";
import { useUIStore } from "@/stores/ui.store";
import { cn } from "@/lib/utils";
import { DevServerBanner } from "@/features/preview/DevServerBanner";
import { ModelSwitcher } from "@/features/settings/ModelSwitcher";
import { ThemeToggle } from "@/features/settings/ThemeToggle";
import { WelcomeScreen } from "@/features/onboarding/WelcomeScreen";
import { MessageList } from "./MessageList";
import { ChatInput, type AgentMode } from "./ChatInput";
import { PermissionBanner } from "./PermissionBanner";

export function ChatShell({ onOpenSettings }: { onOpenSettings?: () => void } = {}) {
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
        <div className="flex items-center gap-1.5">
          {sidecarStatus !== "ready" && (
            <span className="text-xs text-[var(--muted-foreground)] capitalize">
              {sidecarStatus === "starting" ? "Connecting…" : sidecarStatus}
            </span>
          )}
          <ModelSwitcher />
          <ThemeToggle />
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
          <button
            onClick={onOpenSettings}
            title="Settings (Agents & MCP)"
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Dev-server detection banner */}
      <DevServerBanner />

      {/* Message area */}
      {activeSessionId ? (
        <MessageList sessionId={activeSessionId} isRunning={isRunning} />
      ) : (
        <WelcomeScreen onPrompt={isReady ? handleSend : undefined} />
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
            <p className="mt-1.5 text-center text-xs text-[var(--muted-foreground)]">
              Engine offline — use <span className="text-red-400">Reconnect</span> in the
              banner above to retry.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
