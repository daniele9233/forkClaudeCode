import { useRef, useState, useCallback } from "react";
import { SendHorizontal, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onSend: (text: string) => void;
  onAbort?: () => void;
  disabled?: boolean;
  isRunning?: boolean;
}

export function ChatInput({ onSend, onAbort, disabled, isRunning }: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled || isRunning) return;
    onSend(trimmed);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [text, disabled, isRunning, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  return (
    <div
      className={cn(
        "flex items-end gap-2 rounded-xl border bg-[var(--card)] px-3 py-2.5",
        "border-[var(--border)] focus-within:border-[var(--primary)] transition-colors",
        disabled && "opacity-50",
      )}
    >
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
            : "Message the agent (Enter to send, Shift+Enter for newline)"
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
            "shrink-0 flex h-8 w-8 items-center justify-center rounded-lg",
            "bg-red-600/80 text-white hover:bg-red-600 transition-colors",
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
            "shrink-0 flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
            text.trim() && !disabled
              ? "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
              : "bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed",
          )}
          title="Send (Enter)"
          aria-label="Send message"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
