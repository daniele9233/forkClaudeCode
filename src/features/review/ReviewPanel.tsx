import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ChevronDown, GitCompareArrows, Undo2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFileStatus, useInvalidateFiles } from "@/opencode/file";
import { useFileStore } from "@/stores/file.store";

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  added: { label: "A", cls: "text-emerald-400 border-emerald-500/40" },
  modified: { label: "M", cls: "text-amber-400 border-amber-500/40" },
  deleted: { label: "D", cls: "text-red-400 border-red-500/40" },
};

function basename(p: string) {
  return p.split("/").pop()?.split("\\").pop() ?? p;
}

/**
 * Review panel — the trust feature. Lists every file the agent touched (git
 * status), with per-file diff (click → Monaco diff in the bottom panel) and a
 * two-step ✗ Discard that reverts that single file (git checkout / delete for
 * new files). Shows only when there are changes; collapsible like PlanTree.
 */
export function ReviewPanel() {
  const { data: files = [] } = useFileStatus();
  const invalidateFiles = useInvalidateFiles();
  const openFile = useFileStore((s) => s.openFile);
  const [collapsed, setCollapsed] = useState(false);
  /** Path currently in "confirm discard?" state (two-step destructive action). */
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  if (files.length === 0) return null;

  const totalAdded = files.reduce((n, f) => n + (f.added ?? 0), 0);
  const totalRemoved = files.reduce((n, f) => n + (f.removed ?? 0), 0);

  const discard = async (path: string) => {
    setBusy(path);
    try {
      await invoke("discard_file_changes", { path });
    } catch (e) {
      console.error("[review] discard failed:", e);
    } finally {
      setBusy(null);
      setConfirming(null);
      invalidateFiles();
    }
  };

  return (
    <div className="glass mx-4 mt-3 border border-[var(--border)]">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center gap-2 border-b border-[var(--border)] px-3 py-1.5 text-left"
      >
        <GitCompareArrows className="h-3.5 w-3.5 text-[var(--primary)]" />
        <span className="hud-label">review</span>
        <span className="text-[10px] text-[var(--muted-foreground)]">
          {files.length} file{files.length > 1 ? "s" : ""}
        </span>
        <span className="font-mono text-[10px]">
          <span className="text-emerald-400">+{totalAdded}</span>{" "}
          <span className="text-red-400">−{totalRemoved}</span>
        </span>
        <span className="flex-1" />
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)] transition-transform",
            collapsed && "-rotate-90",
          )}
        />
      </button>

      {!collapsed && (
        <ul className="max-h-44 space-y-0.5 overflow-y-auto px-2 py-1.5">
          {files.map((f) => {
            const st = STATUS_STYLE[f.status] ?? STATUS_STYLE.modified;
            const isConfirming = confirming === f.path;
            const isBusy = busy === f.path;
            return (
              <li
                key={f.path}
                className="group flex items-center gap-2 rounded px-1 py-0.5 hover:bg-white/[0.04]"
              >
                <span
                  className={cn(
                    "w-4 shrink-0 border text-center font-mono text-[9px] leading-4",
                    st.cls,
                  )}
                >
                  {st.label}
                </span>
                {/* Click the path → per-file diff in the bottom panel */}
                <button
                  onClick={() => openFile(f.path)}
                  title={`${f.path} — open diff`}
                  className="min-w-0 flex-1 truncate text-left font-mono text-[11px] text-[var(--foreground)] hover:text-[var(--primary)]"
                >
                  <span className="text-[var(--muted-foreground)]/60">
                    {f.path.includes("/")
                      ? f.path.slice(0, f.path.lastIndexOf("/") + 1)
                      : ""}
                  </span>
                  {basename(f.path)}
                </button>
                <span className="shrink-0 font-mono text-[9px] text-[var(--muted-foreground)]">
                  <span className="text-emerald-400/80">+{f.added ?? 0}</span>{" "}
                  <span className="text-red-400/80">−{f.removed ?? 0}</span>
                </span>
                {/* Two-step discard */}
                {isBusy ? (
                  <Loader2 className="h-3 w-3 shrink-0 animate-spin text-[var(--muted-foreground)]" />
                ) : isConfirming ? (
                  <span className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => void discard(f.path)}
                      className="rounded bg-red-500/90 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white hover:opacity-90"
                      title={
                        f.status === "added"
                          ? "Confirm: DELETE this new file"
                          : "Confirm: revert this file to HEAD"
                      }
                    >
                      confirm
                    </button>
                    <button
                      onClick={() => setConfirming(null)}
                      className="rounded px-1 py-0.5 text-[9px] uppercase text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    >
                      no
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirming(f.path)}
                    className="shrink-0 rounded p-0.5 text-[var(--muted-foreground)] opacity-0 transition hover:bg-red-950/40 hover:text-red-400 group-hover:opacity-100"
                    title={
                      f.status === "added"
                        ? "Discard (deletes this new file)"
                        : "Discard changes (revert to HEAD)"
                    }
                  >
                    <Undo2 className="h-3 w-3" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
