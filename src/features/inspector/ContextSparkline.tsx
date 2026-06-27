import { useSessionStats, fmtNum } from "./useSessionStats";
import { cn } from "@/lib/utils";

/** Sidebar CONTEXT panel — a bar sparkline of recent steps + window usage (style D). */
export function ContextSparkline() {
  const { activeSessionId, steps, tokensIn, contextLimit, pct } = useSessionStats();

  if (!activeSessionId) return null;

  // Bar heights from the per-step input tokens of the last ~14 steps.
  const recent = steps.slice(-14);
  const max = Math.max(1, ...recent.map((m) => m.tokens?.input ?? 0));
  const bars =
    recent.length > 0
      ? recent.map((m) => Math.max(8, Math.round(((m.tokens?.input ?? 0) / max) * 100)))
      : [];

  return (
    <div className="border-t border-[var(--border)]">
      <div className="flex items-center border-b border-[var(--border)]">
        <span className="bp-tab">context</span>
      </div>
      <div className="px-3 py-2.5">
        <div className="flex h-9 items-end gap-[3px]">
          {bars.length > 0 ? (
            bars.map((h, i) => (
              <span
                key={i}
                className="bp-bar w-[7px] shrink-0"
                style={{ height: `${h}%` }}
              />
            ))
          ) : (
            <span className="hud-label opacity-40">awaiting activity</span>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="hud-label normal-case tracking-normal">
            {fmtNum(tokensIn)} / {contextLimit > 0 ? fmtNum(contextLimit) : "—"} tok
          </span>
          <span
            className={cn(
              "hud-mono text-[10px]",
              pct > 85
                ? "text-red-400"
                : pct > 65
                  ? "text-amber-400"
                  : "text-[var(--primary)]",
            )}
          >
            {pct.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
