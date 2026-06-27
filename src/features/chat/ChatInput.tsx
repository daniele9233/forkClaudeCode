import { useRef, useState, useCallback } from "react";
import { SendHorizontal, Square, Hammer, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel } from "@/components/Panel";

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

  const submit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled || isRunning) return;
    onSend(trimmed, mode);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [text, disabled, isRunning, mode, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
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
        <span className="hud-label ml-auto pr-1 opacity-50">
          {isRunning ? "● running" : "ready"}
        </span>
      </div>

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
              ? "Agent is working…"
              : `Message the agent in ${mode} mode (Enter to send)`
          }
          className={cn(
            "flex-1 resize-none bg-transparent text-sm text-[var(--foreground)]",
            "placeholder:text-[var(--muted-foreground)] focus:outline-none",
            "max-h-[200px] overflow-y-auto",
          )}
        />
        {isRunning ? (
          <button
            onClick={onAbort}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-sm transition-colors",
              "bg-[var(--color-alert)]/80 text-white hover:bg-[var(--color-alert)]",
            )}
            title="Stop"
            aria-label="Stop generation"
          >
            <Square className="h-4 w-4 fill-current" />
          </button>
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
