import { useCallback } from "react";
import { TerminalSquare, Settings } from "lucide-react";
import { useChatEvents } from "@/opencode/useChatEvents";
import { useSessionStore } from "@/stores/session.store";
import { useSendPrompt, useCreateSession, useAbortSession } from "@/opencode/session";
import { useConfig } from "@/opencode/config";
import { useTerminalEvents } from "@/features/terminal/useTerminalEvents";
import { useUIStore } from "@/stores/ui.store";
import { cn } from "@/lib/utils";
import { DevServerBanner } from "@/features/preview/DevServerBanner";
import { ModelSwitcher } from "@/features/settings/ModelSwitcher";
import { ThemeToggle } from "@/features/settings/ThemeToggle";
import { WelcomeScreen } from "@/features/onboarding/WelcomeScreen";
import { StatStrip } from "@/features/inspector/StatStrip";
import { MessageList } from "./MessageList";
import { ChatInput, type AgentMode } from "./ChatInput";
import { PermissionBanner } from "./PermissionBanner";
import { PlanTree } from "./PlanTree";

export function ChatShell({ onOpenSettings }: { onOpenSettings?: () => void } = {}) {
  const { isRunning } = useChatEvents();
  useTerminalEvents();
  const { activeSessionId, sidecarStatus, setActiveSession } = useSessionStore();
  const { bottomOpen, bottomTab, toggleTerminal } = useUIStore();
  const sendPrompt = useSendPrompt();
  const createSession = useCreateSession();
  const abortSession = useAbortSession();
  const { data: config } = useConfig();
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

      // Send with the explicitly selected model so the request never falls back
      // to the engine's default provider (e.g. the Zen gateway, which would
      // return "Invalid API key" with no Zen key). Format is "provider/model";
      // the model id itself may contain slashes (e.g. openrouter/openai/gpt-4o).
      const selected = config?.model ?? "";
      const slash = selected.indexOf("/");
      const providerID = slash > 0 ? selected.slice(0, slash) : undefined;
      const modelID = slash > 0 ? selected.slice(slash + 1) : undefined;

      sendPrompt.mutate({ sessionId, text, agent: mode, providerID, modelID });
    },
    [activeSessionId, createSession, sendPrompt, setActiveSession, config?.model],
  );

  const handleAbort = useCallback(() => {
    if (activeSessionId) {
      abortSession.mutate(activeSessionId);
    }
  }, [activeSessionId, abortSession]);

  const isReady = sidecarStatus === "ready";
  const isDisabled = !isReady || sendPrompt.isPending || createSession.isPending;

  // The model you're currently connected to (for the online indicator).
  const activeModelId = (() => {
    const m = config?.model ?? "";
    const slash = m.indexOf("/");
    return slash > 0 ? m.slice(slash + 1) : m;
  })();

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="h-3 w-3 bg-[var(--primary)]" aria-hidden />
          <span className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--foreground)]">
            kikkoCode
          </span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <span className="text-[var(--muted-foreground)]/30">·</span>
            {isRunning ? (
              <span className="hud-label flex items-center gap-1.5 text-[var(--primary)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
                Working
              </span>
            ) : sidecarStatus === "ready" ? (
              <span className="hud-label flex items-center gap-1.5 text-[var(--color-online)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-online)] shadow-[0_0_6px_var(--color-online)]" />
                online
                {activeModelId && (
                  <span className="text-[var(--muted-foreground)]">
                    · {activeModelId}
                  </span>
                )}
              </span>
            ) : (
              <span className="hud-label">
                {sidecarStatus === "starting" ? "Connecting" : sidecarStatus}
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
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

      {/* Token / cost dashboard (style D) */}
      <StatStrip />

      {/* Live plan tree (agent's todo list) — shows only when a plan exists */}
      {activeSessionId && <PlanTree sessionId={activeSessionId} />}

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
