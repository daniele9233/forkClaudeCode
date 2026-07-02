import { Globe, X } from "lucide-react";
import { usePreviewStore } from "@/stores/preview.store";
import { showPreview } from "@/opencode/preview";

/**
 * Slim banner shown when a dev-server URL is detected in command output and is
 * not already being previewed. Offers to open it in the preview webview (4.3).
 */
export function DevServerBanner() {
  const { detectedUrl, previewUrl, dismissed, dismissDetected } = usePreviewStore();

  const visible = !!detectedUrl && !dismissed && detectedUrl !== previewUrl;
  if (!visible) return null;

  return (
    <div className="flex items-center gap-2 border-b border-[var(--primary)]/30 bg-[var(--primary)]/10 px-4 py-1.5 text-xs">
      <Globe className="h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />
      <span className="hud-label text-[var(--foreground)]">
        DEV SERVER{" "}
        <span className="font-mono normal-case tracking-normal text-[var(--primary)]">
          {detectedUrl}
        </span>
      </span>
      <div className="ml-auto flex items-center gap-1.5">
        <button
          onClick={() => void showPreview(detectedUrl!)}
          className="rounded-sm bg-[var(--primary)] px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
        >
          Open preview
        </button>
        <button
          onClick={dismissDetected}
          className="rounded p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          title="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
