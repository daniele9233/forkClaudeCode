import { Square, Loader2 } from "lucide-react";
import { useStallSeconds } from "./useStallWatch";

/** After this many seconds of silence during a run, warn about a possible loop. */
const STALL_AT = 25;

/**
 * Non-blocking watchdog banner. While a run streams normally it stays hidden;
 * if the agent goes silent for a while (model call hung, or a reasoning loop
 * producing nothing) it appears with the elapsed time and a Stop button, so the
 * user is never stuck watching a frozen "thinking" with no way out.
 */
export function StallBanner({
  sessionId,
  onStop,
}: {
  sessionId: string | null;
  onStop: () => void;
}) {
  const seconds = useStallSeconds(sessionId);
  if (seconds < STALL_AT) return null;

  return (
    <div className="mx-3 mb-2 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300/90">
      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
      <span className="min-w-0 flex-1">
        L'agente elabora da <b>{seconds}s</b> senza nuovo output. Se sembra bloccato in un
        loop, fermalo e riprova (o cambia modello — i modelli di reasoning possono restare
        a lungo in “pensiero”).
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
