import { useState } from "react";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { useSessionStore } from "@/stores/session.store";
import { restartSidecar } from "@/opencode/sidecar";

/**
 * Global, dismissable-by-recovery strip shown when the OpenCode engine is not
 * ready. On first boot it reads as a calm "connecting"; on a crash it turns
 * into an actionable error with a Reconnect button (10.2 / 10.3).
 */
export function SidecarStatusBanner() {
  const sidecarStatus = useSessionStore((s) => s.sidecarStatus);
  const sidecarError = useSessionStore((s) => s.sidecarError);
  const [reconnecting, setReconnecting] = useState(false);

  if (sidecarStatus === "ready") return null;

  const handleReconnect = async () => {
    setReconnecting(true);
    try {
      await restartSidecar();
    } finally {
      setReconnecting(false);
    }
  };

  if (sidecarStatus === "starting") {
    return (
      <div className="flex shrink-0 items-center justify-center gap-2 border-b border-[var(--border)] bg-[var(--muted)]/40 px-4 py-1.5">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--muted-foreground)]" />
        <span className="hud-label">Connecting to engine…</span>
      </div>
    );
  }

  // error / stopped
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-red-500/30 bg-red-500/10 px-4 py-1.5">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
      <span className="flex-1 truncate text-xs text-red-300">
        <span className="font-mono text-[11px] font-bold uppercase tracking-wider">
          Engine disconnected
        </span>{" "}
        <span className="text-[var(--muted-foreground)]">
          {sidecarError ?? "The local server is not responding."}
        </span>
      </span>
      <button
        onClick={handleReconnect}
        disabled={reconnecting}
        className="flex shrink-0 items-center gap-1 rounded-sm bg-red-500/20 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-red-200 transition-colors hover:bg-red-500/30 disabled:opacity-50"
      >
        <RefreshCw className={reconnecting ? "h-3 w-3 animate-spin" : "h-3 w-3"} />
        {reconnecting ? "Reconnecting…" : "Reconnect"}
      </button>
    </div>
  );
}
