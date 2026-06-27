import { AlertTriangle, X } from "lucide-react";
import { useUIStore } from "@/stores/ui.store";

/**
 * Non-blocking notice shown when the running opencode engine version does not
 * match the SDK this build was compiled against (see version.ts). Dismissible.
 */
export function EngineVersionBanner() {
  const engineWarning = useUIStore((s) => s.engineWarning);
  const dismissed = useUIStore((s) => s.engineWarningDismissed);
  const dismiss = useUIStore((s) => s.dismissEngineWarning);

  if (!engineWarning || dismissed) return null;

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-1.5">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
      <span className="flex-1 truncate text-xs text-amber-200">
        <span className="hud-label text-amber-400">version mismatch</span>{" "}
        <span className="text-[var(--muted-foreground)]">{engineWarning}</span>
      </span>
      <button
        onClick={dismiss}
        aria-label="Dismiss version warning"
        className="rounded-sm p-0.5 text-amber-300/70 transition-colors hover:bg-amber-500/20 hover:text-amber-200"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
