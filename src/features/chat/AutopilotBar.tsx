import { Rocket, Square, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAutopilotStore } from "@/stores/autopilot.store";
import { stopAutopilot } from "@/opencode/autopilot";
import { useAbortSession } from "@/opencode/session";

const STATUS_LABEL: Record<string, string> = {
  running: "running",
  done: "goal achieved ✔",
  budget: "budget reached — stopped",
  "max-iters": "iteration cap — stopped",
  stopped: "stopped",
};

/** Live status of the autopilot run: goal, iterations, fuel gauge, stop. */
export function AutopilotBar() {
  const { active, status, goal, iter, maxIters, spent, budgetUsd, sessionId } =
    useAutopilotStore();
  const dismiss = useAutopilotStore((s) => s.dismiss);
  const abortSession = useAbortSession();

  if (!active && !status) return null;
  if (!active && status === null) return null;

  const pct = budgetUsd > 0 ? Math.min(100, (spent / budgetUsd) * 100) : 0;

  const handleStop = () => {
    stopAutopilot();
    if (sessionId) abortSession.mutate(sessionId);
  };

  return (
    <div
      className={cn(
        "mx-3 mb-2 flex items-center gap-2.5 rounded-md border px-3 py-1.5 text-[11px]",
        active
          ? "border-[var(--primary)]/40 bg-[var(--primary)]/10"
          : status === "done"
            ? "border-emerald-500/40 bg-emerald-500/10"
            : "border-amber-500/40 bg-amber-500/10",
      )}
    >
      <Rocket
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          active ? "animate-pulse text-[var(--primary)]" : "text-[var(--foreground)]",
        )}
      />
      <span className="hud-label shrink-0">autopilot</span>
      <span
        className="min-w-0 flex-1 truncate text-[var(--muted-foreground)]"
        title={goal}
      >
        {goal}
      </span>
      <span className="shrink-0 font-mono text-[10px] text-[var(--muted-foreground)]">
        iter {iter}/{maxIters}
      </span>
      {/* fuel gauge */}
      <span className="flex shrink-0 items-center gap-1.5 font-mono text-[10px]">
        <span
          className={cn(
            pct > 85
              ? "text-red-400"
              : pct > 65
                ? "text-amber-400"
                : "text-[var(--muted-foreground)]",
          )}
        >
          ${spent.toFixed(2)}/${budgetUsd.toFixed(2)}
        </span>
        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--muted)]">
          <span
            className={cn(
              "block h-full transition-all",
              pct > 85 ? "bg-red-400" : pct > 65 ? "bg-amber-400" : "bg-[var(--primary)]",
            )}
            style={{ width: `${pct}%` }}
          />
        </span>
      </span>
      {active ? (
        <button
          onClick={handleStop}
          className="flex shrink-0 items-center gap-1 rounded bg-[var(--color-alert)]/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white hover:bg-[var(--color-alert)]"
          title="Stop the autopilot (also aborts the current step)"
        >
          <Square className="h-2.5 w-2.5 fill-current" />
          stop
        </button>
      ) : (
        <span className="flex shrink-0 items-center gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wider">
            {STATUS_LABEL[status ?? ""] ?? status}
          </span>
          <button
            onClick={dismiss}
            className="rounded p-0.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            title="Dismiss"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      )}
    </div>
  );
}
