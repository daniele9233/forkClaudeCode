import { cn } from "@/lib/utils";
import { useSessionStats } from "@/features/inspector/useSessionStats";

function Cell({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 border-r border-[var(--border)] px-3 py-[3px]",
        className,
      )}
    >
      <span className="hud-label">{label}</span>
      <span className="hud-mono text-[10px] text-[var(--foreground)]">{children}</span>
    </div>
  );
}

/** Slim divided status bar (style D). */
export function StatusBar() {
  const { activeSessionId, lastMsg, pct, totalCost } = useSessionStats();

  if (!activeSessionId) {
    return (
      <div className="glass flex h-6 shrink-0 items-center border-t border-[var(--border)] px-3">
        <span className="hud-label opacity-40">no active session</span>
        <span className="hud-label ml-auto opacity-40">kikkocode v0.1.0</span>
      </div>
    );
  }

  return (
    <div className="glass flex h-6 shrink-0 items-center border-t border-[var(--border)] text-[var(--muted-foreground)]">
      <Cell label="session">{activeSessionId.slice(-6)}</Cell>
      {lastMsg && (
        <Cell label="model">
          {lastMsg.providerID}/{lastMsg.modelID}
        </Cell>
      )}
      <Cell label="ctx">
        <span
          className={pct > 85 ? "text-red-400" : pct > 65 ? "text-amber-400" : undefined}
        >
          {pct.toFixed(0)}%
        </span>
      </Cell>
      <Cell label="cost">${totalCost.toFixed(3)}</Cell>
      <span className="hud-label ml-auto px-3 opacity-60">kikkocode v0.1.0</span>
    </div>
  );
}
