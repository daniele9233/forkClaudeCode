import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { FolderGit2, ChevronsUpDown, FolderSymlink } from "lucide-react";
import { useUIStore } from "@/stores/ui.store";
import { useSessionStore } from "@/stores/session.store";
import { useWorkspaceStore, baseName } from "@/stores/workspace.store";

/**
 * Project switcher shown at the very top of the sidebar. Displays the folder the
 * engine is working in and opens the ProjectPicker on click (open a folder,
 * clone a GitHub repo, or create a new project). A second button reveals the
 * current folder in the system file explorer.
 */
export function ProjectBar() {
  const openProjectPicker = useUIStore((s) => s.openProjectPicker);
  const currentDir = useWorkspaceStore((s) => s.currentDir);
  const setCurrent = useWorkspaceStore((s) => s.setCurrent);
  const opencodeUrl = useSessionStore((s) => s.opencodeUrl);

  // Sync the displayed project with the engine's actual cwd once it's up. This
  // covers the launch case where the backend reopened the last project itself.
  useEffect(() => {
    if (!opencodeUrl) return;
    invoke<string>("get_working_dir")
      .then((dir) => {
        if (dir) setCurrent(dir);
      })
      .catch(() => {
        /* backend not ready — the persisted value stays shown */
      });
  }, [opencodeUrl, setCurrent]);

  const name = currentDir ? baseName(currentDir) : "Choose a project";

  const revealInExplorer = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentDir) return;
    try {
      await revealItemInDir(currentDir);
    } catch {
      /* file manager unavailable — ignore */
    }
  };

  return (
    <div className="flex items-center gap-1 border-b border-[var(--border)] px-2 py-2">
      <button
        onClick={openProjectPicker}
        title={currentDir ? `${currentDir}\n(click to switch project)` : "Open a project"}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-white/[0.06]"
      >
        <FolderGit2 className="h-4 w-4 shrink-0 text-[var(--primary)]" />
        <div className="min-w-0 flex-1">
          <div className="hud-label leading-none">project</div>
          <div className="truncate text-xs font-semibold text-[var(--foreground)]">
            {name}
          </div>
        </div>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" />
      </button>

      {currentDir && (
        <button
          onClick={revealInExplorer}
          title="Open this folder in the file explorer"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <FolderSymlink className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
