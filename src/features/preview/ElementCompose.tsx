import { useRef } from "react";
import { X, ExternalLink, Wand2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSelectionStore } from "@/stores/selection.store";
import { useFileStore } from "@/stores/file.store";
import { useSessionStore } from "@/stores/session.store";
import { useSendPrompt } from "@/opencode/session";

function basename(p: string) {
  return p.split("/").pop()?.split("\\").pop() ?? p;
}

function truncateHTML(html: string, maxLen = 80) {
  return html.length > maxLen ? html.slice(0, maxLen) + "…" : html;
}

function buildPrompt(
  file: string,
  line: number,
  tagName: string,
  outerHTML: string,
  userText: string,
) {
  const rel = basename(file);
  return `In \`${rel}\` (full path: \`${file}\`), line ${line} — modify the \`<${tagName}>\` element:

\`\`\`html
${outerHTML}
\`\`\`

${userText}`;
}

export function ElementCompose() {
  const { selectedElement, composeText, setComposeText, clearSelection } =
    useSelectionStore();
  const openFile = useFileStore((s) => s.openFile);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const sendPrompt = useSendPrompt();
  const inputRef = useRef<HTMLInputElement>(null);

  if (!selectedElement) return null;

  const { file, line, tagName, outerHTML } = selectedElement;
  const shortFile = basename(file);

  const handleOpenEditor = () => openFile(file, line);

  const handleSend = () => {
    if (!activeSessionId || !composeText.trim()) return;
    const prompt = buildPrompt(file, line, tagName, outerHTML, composeText.trim());
    sendPrompt.mutate({ sessionId: activeSessionId, text: prompt });
    clearSelection();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") clearSelection();
  };

  return (
    <div className="shrink-0 border-b border-[var(--border)] bg-[var(--card)] px-2 py-1.5">
      {/* Element info row */}
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="shrink-0 rounded bg-[var(--primary)]/15 px-1.5 py-0.5 font-mono text-[10px] text-[var(--primary)]">
          {`<${tagName}>`}
        </span>
        <span className="min-w-0 truncate font-mono text-[11px] text-[var(--muted-foreground)]">
          {shortFile}:{line}
        </span>
        <span
          className="min-w-0 flex-1 truncate font-mono text-[10px] text-[var(--muted-foreground)]/60"
          title={outerHTML}
        >
          {truncateHTML(outerHTML)}
        </span>
        <button
          onClick={handleOpenEditor}
          className="shrink-0 rounded p-0.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          title="Open in editor"
        >
          <ExternalLink className="h-3 w-3" />
        </button>
        <button
          onClick={clearSelection}
          className="shrink-0 rounded p-0.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          title="Dismiss"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Compose row */}
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          autoFocus
          value={composeText}
          onChange={(e) => setComposeText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What should change? (Enter to send)"
          className={cn(
            "min-w-0 flex-1 rounded border border-[var(--border)] bg-[var(--background)]",
            "px-2 py-1 text-xs text-[var(--foreground)] outline-none",
            "placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)]",
          )}
          disabled={sendPrompt.isPending}
        />
        <button
          onClick={handleSend}
          disabled={!composeText.trim() || !activeSessionId || sendPrompt.isPending}
          className={cn(
            "flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors",
            "bg-[var(--primary)] text-[var(--primary-foreground)]",
            "hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40",
          )}
          title={!activeSessionId ? "No active session" : "Send to agent"}
        >
          {sendPrompt.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Wand2 className="h-3 w-3" />
          )}
          Edit
        </button>
      </div>
    </div>
  );
}
