import { Square, Loader2, Terminal, Brain, PenLine, Bot, Hourglass } from "lucide-react";
import { useLiveActivity, type ActivityKind } from "./useLiveActivity";
import { cn } from "@/lib/utils";

/** Live elapsed seconds for the current tool, ticked by the parent re-render. */
function elapsed(startedAt?: number): string {
  if (!startedAt) return "";
  const s = Math.max(0, (Date.now() - startedAt) / 1000);
  if (s < 60) return `${s.toFixed(0)}s`;
  const m = Math.floor(s / 60);
  return `${m}m${Math.round(s - m * 60)}s`;
}

function iconFor(kind: ActivityKind) {
  switch (kind) {
    case "tool":
      return <Terminal className="h-3.5 w-3.5" />;
    case "reasoning":
      return <Brain className="h-3.5 w-3.5" />;
    case "text":
      return <PenLine className="h-3.5 w-3.5" />;
    case "subagents":
      return <Bot className="h-3.5 w-3.5" />;
    default:
      return <Hourglass className="h-3.5 w-3.5" />;
  }
}

/**
 * Always-on "what is the agent doing right now" line — kikkoCode's answer to
 * OpenCode's status bar. While a run is live it shows the current step
 * (thinking / running <tool> · <preview> · <elapsed> / N subagents), so the
 * user always SEES movement instead of a silent "pensa pensa" and a dump at
 * the end. It only escalates to the amber loop-warning on TRUE silence — a
 * running tool or an active subagent counts as work, not a stall.
 */
export function LiveActivityBar({
  sessionId,
  onStop,
}: {
  sessionId: string | null;
  onStop: () => void;
}) {
  const act = useLiveActivity(sessionId);
  if (!act.running) return null;

  const clock = act.kind === "tool" ? elapsed(act.startedAt) : "";

  if (act.stalled) {
    return (
      <div className="mx-3 mb-2 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300/90">
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
        <span className="min-w-0 flex-1">
          L'agente è silenzioso da <b>{act.silentFor}s</b>. Se sembra bloccato in un loop,
          fermalo e riprova (o cambia modello — i modelli di reasoning possono restare a
          lungo in “pensiero”).
        </span>
        <button
          onClick={onStop}
          className="flex shrink-0 items-center gap-1 rounded bg-[var(--color-alert)]/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-[var(--color-alert)]"
        >
          <Square className="h-3 w-3 fill-current" />
          Stop
        </button>
      </div>
    );
  }

  return (
    <div className="mx-3 mb-2 flex items-center gap-2 rounded-md border border-[var(--primary)]/25 bg-[var(--primary)]/5 px-3 py-1.5 text-[11px] text-[var(--foreground)]">
      <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[var(--primary)]">
        {iconFor(act.kind)}
      </span>
      <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--primary)]">
        {act.label}
      </span>
      {act.detail && (
        <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-[var(--muted-foreground)]">
          <span className="opacity-50">$ </span>
          {act.detail}
        </span>
      )}
      {!act.detail && <span className="min-w-0 flex-1" />}
      {clock && (
        <span className="shrink-0 font-mono text-[10px] tabular-nums text-[var(--primary)]/80">
          {clock}
        </span>
      )}
      <span
        className={cn(
          "shrink-0",
          act.kind === "waiting"
            ? "text-[var(--muted-foreground)]"
            : "text-[var(--primary)]",
        )}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      </span>
      <button
        onClick={onStop}
        title="Ferma l'agente"
        className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] transition-colors hover:bg-[var(--color-alert)]/20 hover:text-[var(--color-alert)]"
      >
        <Square className="h-2.5 w-2.5 fill-current" />
        Stop
      </button>
    </div>
  );
}
