import { useEffect, useRef, useState } from "react";
import { RotateCw, ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePreviewStore } from "@/stores/preview.store";

/**
 * Web preview of the running dev server. Uses an <iframe> for now: local dev
 * servers don't set X-Frame-Options, and their own HMR client reloads the
 * iframe content automatically. A native WRY webview is the future evolution
 * (see docs/04-adr-web-preview.md) to bypass iframe limitations and enable
 * the visual element selection of Fase 5.
 */
export function PreviewPanel() {
  const { previewUrl, openPreview, closePreview } = usePreviewStore();
  const [urlInput, setUrlInput] = useState(previewUrl ?? "");
  const [reloadKey, setReloadKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Keep the address bar in sync when the store URL changes externally.
  useEffect(() => {
    setUrlInput(previewUrl ?? "");
  }, [previewUrl]);

  if (!previewUrl) return null;

  const navigate = () => {
    const url = urlInput.trim();
    if (!url) return;
    const normalized = /^https?:\/\//i.test(url) ? url : `http://${url}`;
    openPreview(normalized);
    setReloadKey((k) => k + 1);
  };

  const reload = () => setReloadKey((k) => k + 1);

  const openExternal = () => {
    window.open(previewUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex h-full w-1/2 shrink-0 flex-col border-l border-[var(--border)] bg-[var(--background)]">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-1.5 border-b border-[var(--border)] px-2 py-1.5">
        <button
          onClick={reload}
          className="shrink-0 rounded p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          title="Reload"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>

        <input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") navigate();
          }}
          spellCheck={false}
          className={cn(
            "min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1",
            "font-mono text-xs text-[var(--foreground)] outline-none",
            "focus:border-[var(--primary)]",
          )}
          placeholder="http://localhost:5173/"
        />

        <button
          onClick={openExternal}
          className="shrink-0 rounded p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          title="Open in browser"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={closePreview}
          className="shrink-0 rounded p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          title="Close preview"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Iframe */}
      <div className="min-h-0 flex-1 bg-white">
        <iframe
          ref={iframeRef}
          key={reloadKey}
          src={previewUrl}
          title="Web preview"
          className="h-full w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        />
      </div>
    </div>
  );
}
