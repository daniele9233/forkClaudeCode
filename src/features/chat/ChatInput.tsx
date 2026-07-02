import { useRef, useState, useCallback } from "react";
import { SendHorizontal, Square, Hammer, Map, ListPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel } from "@/components/Panel";
import { usePromptCost } from "@/features/inspector/usePromptCost";
import { fmtNum } from "@/features/inspector/useSessionStats";
import { useSkillsStore } from "@/stores/skills.store";
import { matchSkills } from "@/skills/match";

export type AgentMode = "build" | "plan";

interface Props {
  onSend: (text: string, mode: AgentMode) => void;
  onAbort?: () => void;
  disabled?: boolean;
  isRunning?: boolean;
}

const MODES: { value: AgentMode; label: string; icon: React.ReactNode; title: string }[] =
  [
    {
      value: "build",
      label: "Build",
      icon: <Hammer className="h-3 w-3" />,
      title: "Build mode — agent reads, writes files and runs commands",
    },
    {
      value: "plan",
      label: "Plan",
      icon: <Map className="h-3 w-3" />,
      title: "Plan mode — agent thinks and proposes without executing",
    },
  ];

export function ChatInput({ onSend, onAbort, disabled, isRunning }: Props) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<AgentMode>("build");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cost = usePromptCost(text);
  const skillsEnabled = useSkillsStore((s) => s.enabled);
  const autoApplySkills = useSkillsStore((s) => s.autoApply);
  const matched = autoApplySkills ? matchSkills(text, skillsEnabled) : [];

  const submit = useCallback(() => {
    const trimmed = text.trim();
    // While the agent runs, sending is still allowed — the shell queues it
    // (NEXT queue) and fires it automatically when the agent goes idle.
    if (!trimmed || disabled) return;
    onSend(trimmed, mode);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [text, disabled, mode, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = e.target;
    // Auto-grow up to half the viewport; the user can also drag the handle
    // (resize-y) to make it larger for long prompts.
    const cap = Math.round(window.innerHeight * 0.5);
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, cap)}px`;
  };

  return (
    <Panel className={cn("shadow-lg transition-opacity", disabled && "opacity-50")}>
      {/* Mode toggle row */}
      <div className="flex items-center gap-1 border-b border-[var(--border)] px-2.5 py-1.5">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            disabled={disabled || isRunning}
            title={m.title}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest transition-colors",
              mode === m.value
                ? "bg-[var(--primary)]/15 text-[var(--primary)]"
                : "text-[var(--muted-foreground)] hover:bg-white/5 hover:text-[var(--foreground)]",
              (disabled || isRunning) && "cursor-not-allowed",
            )}
          >
            {m.icon}
            {m.label}
          </button>
        ))}
        {isRunning ? (
          <span className="hud-label ml-auto pr-1 text-[var(--primary)]">● running</span>
        ) : (
          <span className="ml-auto flex items-center gap-2 pr-1 font-mono text-[10px] text-[var(--muted-foreground)] tabular-nums">
            <span title="Estimated tokens for this prompt draft">
              ≈{fmtNum(cost.draftTokens)} tok
            </span>
            {cost.contextLimit > 0 && (
              <span
                title="Context window used after sending this prompt"
                className={cn(
                  cost.contextPct > 85
                    ? "text-red-400"
                    : cost.contextPct > 65
                      ? "text-amber-400"
                      : "text-[var(--muted-foreground)]",
                )}
              >
                ctx {cost.contextPct.toFixed(0)}%
              </span>
            )}
            {cost.hasPricing && (
              <span title="Estimated input cost to process this send">
                ~$
                {cost.estSendCost < 0.01
                  ? cost.estSendCost.toFixed(4)
                  : cost.estSendCost.toFixed(2)}
              </span>
            )}
          </span>
        )}
      </div>

      {/* Live "skills that will auto-apply" chips */}
      {!isRunning && matched.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--border)] px-3 py-1.5">
          <span className="hud-label text-[var(--muted-foreground)]/60">will apply</span>
          {matched.map((s) => (
            <span
              key={s.id}
              title={s.description}
              className="flex items-center gap-1 rounded-sm bg-[var(--primary)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--primary)]"
            >
              {s.emoji} {s.name}
            </span>
          ))}
        </div>
      )}

      {/* Textarea + send button row */}
      <div className="flex items-end gap-2 px-3 py-2.5">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          placeholder={
            isRunning
              ? "Agent is working — Enter queues the next task"
              : `Message the agent in ${mode} mode (Enter to send)`
          }
          className={cn(
            "flex-1 resize-y bg-transparent text-sm text-[var(--foreground)]",
            "placeholder:text-[var(--muted-foreground)] focus:outline-none",
            "max-h-[50vh] min-h-[2.5rem] overflow-y-auto",
          )}
        />
        {isRunning ? (
          <div className="flex shrink-0 items-end gap-1.5">
            {text.trim() && (
              <button
                onClick={submit}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-sm transition-colors",
                  "bg-[var(--primary)]/20 text-[var(--primary)] hover:bg-[var(--primary)]/30",
                )}
                title="Queue this task (runs when the agent is idle)"
                aria-label="Queue task"
              >
                <ListPlus className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onAbort}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-sm transition-colors",
                "bg-[var(--color-alert)]/80 text-white hover:bg-[var(--color-alert)]",
              )}
              title="Stop"
              aria-label="Stop generation"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          </div>
        ) : (
          <button
            onClick={submit}
            disabled={!text.trim() || disabled}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-sm transition-all",
              text.trim() && !disabled
                ? "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
                : "cursor-not-allowed bg-white/5 text-[var(--muted-foreground)]",
            )}
            title="Send (Enter)"
            aria-label="Send message"
          >
            <SendHorizontal className="h-4 w-4" />
          </button>
        )}
      </div>
    </Panel>
  );
}
