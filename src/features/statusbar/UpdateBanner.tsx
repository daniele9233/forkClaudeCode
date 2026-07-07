import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { checkForUpdate, type UpdateInfo } from "@/opencode/update";

const SIX_HOURS = 6 * 60 * 60 * 1000;

/**
 * Non-blocking "update available" banner. Polls GitHub for the latest release
 * on mount and every 6h; when a newer version exists it offers a one-click
 * download of the installer. Dismissible. Never blocks or crashes the app —
 * `checkForUpdate` swallows all errors.
 */
export function UpdateBanner() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let alive = true;
    const run = () =>
      checkForUpdate()
        .then((u) => {
          if (alive && u) setInfo(u);
        })
        .catch(() => {});
    run();
    const id = setInterval(run, SIX_HOURS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (!info || dismissed) return null;

  const open = () => {
    void openUrl(info.installerUrl ?? info.notesUrl).catch(() => {});
  };

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-[var(--primary)]/30 bg-[var(--primary)]/10 px-4 py-1.5">
      <Download className="h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />
      <span className="flex-1 truncate text-xs text-[var(--foreground)]">
        <span className="hud-label text-[var(--primary)]">update available</span>{" "}
        <span className="text-[var(--muted-foreground)]">
          kikkoCode {info.version} is out (you have {info.currentVersion}).
        </span>
      </span>
      <button
        onClick={open}
        className="rounded-sm bg-[var(--primary)]/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/30"
      >
        Download &amp; install
      </button>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss update notice"
        className="rounded-sm p-0.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)]/40 hover:text-[var(--foreground)]"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
