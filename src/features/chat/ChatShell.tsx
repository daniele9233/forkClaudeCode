import { useCallback, useEffect, useRef } from "react";
import { TerminalSquare, Settings, MonitorPlay, ListPlus, X } from "lucide-react";
import { useChatEvents } from "@/opencode/useChatEvents";
import { useSessionStore } from "@/stores/session.store";
import { useSendPrompt, useCreateSession, useAbortSession } from "@/opencode/session";
import { useConfig } from "@/opencode/config";
import { useSkillsStore } from "@/stores/skills.store";
import { planInjection, buildSkillSystem, tagSkills } from "@/skills/match";
import { previewPolicyNote } from "@/skills/previewPolicy";
import { webDesignerDirective } from "@/skills/webDesigner";
import { activeStyleDirective } from "@/stores/styles.store";
import { useTerminalEvents } from "@/features/terminal/useTerminalEvents";
import { useDevServerEvents } from "@/features/preview/useDevServerEvents";
import { useUIStore } from "@/stores/ui.store";
import { usePreviewStore } from "@/stores/preview.store";
import { useQueueStore } from "@/stores/queue.store";
import { useModelStore, splitModel } from "@/stores/model.store";
import { openBestPreview } from "@/opencode/preview";
import { cn } from "@/lib/utils";
import { DevServerBanner } from "@/features/preview/DevServerBanner";
import { ModelSwitcher } from "@/features/settings/ModelSwitcher";
import { ThemeToggle } from "@/features/settings/ThemeToggle";
import { WelcomeScreen } from "@/features/onboarding/WelcomeScreen";
import { StatStrip } from "@/features/inspector/StatStrip";
import { MessageList } from "./MessageList";
import { StallBanner } from "./StallBanner";
import { ChatInput, type AgentMode, type SendOpts } from "./ChatInput";
import { AutopilotBar } from "./AutopilotBar";
import { useAutopilotStore } from "@/stores/autopilot.store";
import { startAutopilot } from "@/opencode/autopilot";
import { PermissionBanner } from "./PermissionBanner";
import { PlanTree } from "./PlanTree";
import { ReviewPanel } from "@/features/review/ReviewPanel";

export function ChatShell({ onOpenSettings }: { onOpenSettings?: () => void } = {}) {
  const { isRunning } = useChatEvents();
  useTerminalEvents();
  useDevServerEvents();
  const { activeSessionId, sidecarStatus, setActiveSession } = useSessionStore();
  const { bottomOpen, bottomTab, toggleTerminal } = useUIStore();
  const previewOpen = usePreviewStore((s) => s.previewOpen);
  const closePreview = usePreviewStore((s) => s.closePreview);
  const togglePreview = useCallback(() => {
    if (previewOpen) {
      closePreview();
    } else {
      // Prefer a detected dev server, else the built-in static server (serves
      // the project's index.html), else an empty panel with guidance.
      void openBestPreview();
    }
  }, [previewOpen, closePreview]);
  const sendPrompt = useSendPrompt();
  const createSession = useCreateSession();
  const abortSession = useAbortSession();
  const { data: config } = useConfig();
  const terminalActive = bottomOpen && bottomTab === "terminal";

  const queueItems = useQueueStore((s) => s.items);
  const enqueueTask = useQueueStore((s) => s.enqueue);
  const removeQueued = useQueueStore((s) => s.remove);

  const handleSend = useCallback(
    async (text: string, mode: AgentMode, opts?: SendOpts) => {
      let sessionId = activeSessionId;

      // Agent busy → queue the task instead; it auto-sends on idle (12.14).
      // Carry the recipe's forced skills so a queued recipe keeps its full stack.
      if (isRunning && sessionId) {
        enqueueTask({ sessionId, text, mode, forcedSkillIds: opts?.forcedSkillIds });
        return;
      }

      // Auto-create session if none active
      if (!sessionId) {
        const session = await createSession.mutateAsync({});
        sessionId = session.id;
        setActiveSession(sessionId);
      }

      // Autopilot launch: the text is the GOAL; the controller drives from here
      // (skills/policy injection skipped — the goal reaches the agent verbatim).
      if (opts?.autopilot) {
        await startAutopilot(
          sessionId,
          text,
          opts.autopilot.budgetUsd,
          opts.autopilot.maxIters,
        );
        return;
      }

      // Resolve which skills apply — slash command, keyword/phrase match, the
      // recipe's forced skills (all of them, no cap), plus pinned and still-warm
      // sticky skills from recent turns (fixes the "second prompt" problem too).
      const { planned, clean, freshIds } = planInjection(text, opts?.forcedSkillIds);
      const skills = planned.map((p) => p.skill);

      // Inject the playbooks + directives into the SYSTEM role (models obey the
      // system message far more reliably than instructions mixed into the user's
      // text). The user message stays clean; hidden id-tags only drive the chips.
      const webDesignerOn = useSkillsStore.getState().webDesigner;
      const systemParts = [
        activeStyleDirective(),
        buildSkillSystem(skills),
        webDesignerDirective(clean, webDesignerOn),
        previewPolicyNote(clean),
      ].filter((x): x is string => !!x);
      const system = systemParts.length ? systemParts.join("\n\n---\n\n") : undefined;
      const userText = tagSkills(clean, skills);

      // Send with the explicitly selected model so the request never falls back
      // to the engine's default provider. kikkoCode's own selection wins over
      // the engine config (which auth plugins like zai/GLM can pin).
      const selected = useModelStore.getState().selected ?? config?.model ?? "";
      const { providerID, modelID } = splitModel(selected);

      sendPrompt.mutate({
        sessionId,
        text: userText,
        system,
        agent: mode,
        providerID,
        modelID,
      });
      // Keep the just-matched skills warm for the next few turns.
      useSkillsStore.getState().noteActivated(freshIds);
    },
    [
      activeSessionId,
      isRunning,
      enqueueTask,
      createSession,
      sendPrompt,
      setActiveSession,
      config?.model,
    ],
  );

  // Drain the queue: when the agent goes from running → idle and there are
  // queued tasks for this session, fire the next one. The prev-running guard
  // means a fresh mount never auto-sends (StrictMode-safe). While an autopilot
  // run owns the session, the autopilot controller drives — the queue waits.
  const prevRunning = useRef(false);
  useEffect(() => {
    const wasRunning = prevRunning.current;
    prevRunning.current = isRunning;
    if (!wasRunning || isRunning || !activeSessionId) return;
    if (useAutopilotStore.getState().active) return;
    const next = useQueueStore.getState().takeNext(activeSessionId);
    if (next)
      void handleSend(next.text, next.mode, { forcedSkillIds: next.forcedSkillIds });
  }, [isRunning, activeSessionId, handleSend]);

  const sessionQueue = activeSessionId
    ? queueItems.filter((i) => i.sessionId === activeSessionId)
    : [];

  const handleAbort = useCallback(() => {
    if (activeSessionId) {
      abortSession.mutate(activeSessionId);
    }
  }, [activeSessionId, abortSession]);

  const isReady = sidecarStatus === "ready";
  const isDisabled = !isReady || sendPrompt.isPending || createSession.isPending;

  // The model you're currently connected to (for the online indicator).
  const localSelected = useModelStore((s) => s.selected);
  const activeModelId = (() => {
    const m = localSelected ?? config?.model ?? "";
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
            onClick={togglePreview}
            title="Toggle web preview (in-app)"
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
              previewOpen
                ? "bg-[var(--primary)]/15 text-[var(--primary)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            <MonitorPlay className="h-4 w-4" />
          </button>
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

      {/* Review — files the agent touched, with per-file diff & discard */}
      {isReady && <ReviewPanel />}

      {/* Message area */}
      {activeSessionId ? (
        <MessageList sessionId={activeSessionId} isRunning={isRunning} />
      ) : (
        <WelcomeScreen onPrompt={isReady ? handleSend : undefined} />
      )}

      {/* Input area */}
      <div className="border-t border-[var(--border)] pt-2">
        {/* Autopilot status: goal, iterations, fuel gauge, stop */}
        <AutopilotBar />
        {/* NEXT queue — tasks waiting for the agent to go idle */}
        {sessionQueue.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 px-3 pb-2">
            <span className="hud-label flex items-center gap-1 text-[var(--muted-foreground)]">
              <ListPlus className="h-3 w-3" />
              queue · {sessionQueue.length}
            </span>
            {sessionQueue.map((t, i) => (
              <span
                key={t.id}
                title={t.text}
                className="flex max-w-56 items-center gap-1 rounded-sm border border-[var(--border)] bg-[var(--muted)]/40 px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]"
              >
                <span className="font-mono text-[var(--primary)]">{i + 1}</span>
                <span className="truncate">{t.text}</span>
                <button
                  onClick={() => removeQueued(t.id)}
                  className="shrink-0 rounded p-0.5 transition-colors hover:bg-red-950/40 hover:text-red-400"
                  title="Remove from queue"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
        <PermissionBanner />
        {/* Stall watchdog: warns when a run goes silent (possible loop) + Stop */}
        <StallBanner sessionId={activeSessionId} onStop={handleAbort} />
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
