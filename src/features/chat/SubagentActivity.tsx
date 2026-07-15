import { useMemo } from "react";
import { Bot, Loader2, Check } from "lucide-react";
import type { Part, TextPart, ToolPart } from "@opencode-ai/sdk/client";
import { useSessionChildren } from "@/opencode/session";
import { useChatStore } from "@/stores/chat.store";
import { isAssistant, createdAt } from "@/opencode/messageShape";
import { cn } from "@/lib/utils";

/** Human-readable "what this subagent is doing right now" from its live parts. */
function latestActivity(parts: Part[]): { text: string; tool: boolean } {
  let tool = "";
  let text = "";
  for (const p of parts) {
    if (p.type === "tool") {
      const tp = p as ToolPart;
      const state = (tp.state as { status?: string } | undefined)?.status;
      // Show the running tool; a completed one is superseded by later parts.
      tool = tp.tool ?? "tool";
      if (state === "completed") tool = "";
      else if (tool) tool = tp.tool;
    } else if (p.type === "text") {
      const t = (p as TextPart).text ?? "";
      if (t.trim()) text = t.trim();
    }
  }
  if (tool) return { text: `⚙ ${tool}`, tool: true };
  if (text) return { text: text.slice(-90), tool: false };
  return { text: "sta ragionando…", tool: false };
}

/**
 * Live subagent activity — "PARALLEL MINDS". OpenCode runs subagents in child
 * sessions; kikkoCode's main chat filters those out, so their work used to be
 * invisible until they reported back. This surfaces each running subagent with
 * its live current action, so you SEE the parallel work as it happens.
 */
export function SubagentActivity({ sessionId }: { sessionId: string }) {
  const { data: children = [] } = useSessionChildren(sessionId);
  const liveMessages = useChatStore((s) => s.liveMessages);
  const liveParts = useChatStore((s) => s.liveParts);
  const running = useChatStore((s) => s.runningSessions);

  const rows = useMemo(() => {
    return (
      children
        .map((c) => {
          const isRunning = running.has(c.id);
          // Latest assistant message for this child session (live).
          let latestId: string | null = null;
          let latestT = -Infinity;
          for (const [id, m] of liveMessages) {
            if (m.sessionID !== c.id || !isAssistant(m)) continue;
            const t = createdAt(m);
            if (t >= latestT) {
              latestT = t;
              latestId = id;
            }
          }
          const parts = latestId
            ? Array.from(liveParts.get(latestId)?.values() ?? [])
            : [];
          return {
            id: c.id,
            title: c.title || "subagent",
            isRunning,
            ...latestActivity(parts),
          };
        })
        // Show running subagents; keep just-finished ones only if still no history.
        .filter((r) => r.isRunning)
    );
  }, [children, liveMessages, liveParts, running]);

  if (rows.length === 0) return null;

  return (
    <div className="shrink-0 space-y-1 border-b border-[var(--border)] bg-[var(--muted)]/10 px-3 py-2">
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--chat-agent-accent)] opacity-70" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--chat-agent-accent)]" />
        </span>
        <span className="hud-label text-[var(--muted-foreground)]">
          agenti al lavoro · {rows.length}
        </span>
      </div>
      {rows.map((r, i) => (
        <div
          key={r.id}
          className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--background)]/40 px-2 py-1"
        >
          <Bot className="h-3 w-3 shrink-0 text-[var(--chat-agent-accent)]" />
          <span className="shrink-0 font-mono text-[9px] font-semibold uppercase tracking-wider text-[var(--chat-agent-accent)]">
            agent-{String(i + 1).padStart(2, "0")}
          </span>
          <span className="max-w-[30%] shrink-0 truncate text-[10px] font-medium text-[var(--foreground)]">
            {r.title}
          </span>
          <span
            className={cn(
              "flex-1 truncate text-[10px]",
              r.tool
                ? "font-mono text-[var(--primary)]"
                : "text-[var(--muted-foreground)]",
            )}
          >
            {r.text}
          </span>
          {r.isRunning ? (
            <Loader2 className="h-3 w-3 shrink-0 animate-spin text-[var(--muted-foreground)]" />
          ) : (
            <Check className="h-3 w-3 shrink-0 text-[var(--color-online)]" />
          )}
        </div>
      ))}
    </div>
  );
}
