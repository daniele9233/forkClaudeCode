import { useSessionStats, fmtNum } from "./useSessionStats";
import { cn } from "@/lib/utils";

function Cell({
  label,
  value,
  accent,
  last,
}: {
  label: string;
  value: string;
  accent?: boolean;
  last?: boolean;
}) {
  return (
    <div className={cn("flex-1 px-3.5 py-2", !last && "border-r border-[var(--border)]")}>
      <div className="hud-label">{label}</div>
      <div
        className={cn(
          "mt-0.5 text-lg font-medium tabular-nums",
          accent ? "text-[var(--primary)]" : "text-[var(--foreground)]",
        )}
      >
        {value}
      </div>
    </div>
  );
}

/** Horizontal token/cost dashboard shown above the conversation (style D). */
export function StatStrip() {
  const { activeSessionId, tokensIn, tokensOut, stepCount, cacheHitPct, totalCost } =
    useSessionStats();

  if (!activeSessionId) return null;

  return (
    <div className="flex shrink-0 border-b border-[var(--border)]">
      <Cell label="Tokens In" value={fmtNum(tokensIn)} />
      <Cell label="Out" value={fmtNum(tokensOut)} />
      <Cell label="Steps" value={String(stepCount).padStart(2, "0")} />
      <Cell label="Cache Hit" value={`${cacheHitPct.toFixed(0)}%`} accent />
      <Cell label="Cost" value={`$${totalCost.toFixed(3)}`} last />
    </div>
  );
}
