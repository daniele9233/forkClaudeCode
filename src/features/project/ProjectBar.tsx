import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { FolderGit2, ChevronsUpDown } from "lucide-react";
import { useUIStore } from "@/stores/ui.store";
import { useSessionStore } from "@/stores/session.store";
import { useWorkspaceStore, baseName } from "@/stores/workspace.store";

/**
 * Project switcher shown at the very top of the sidebar. Displays the folder the
 * engine is working in and opens the ProjectPicker on click (open a folder,
 * clone a GitHub repo, or create a new project).
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

  const name = currentDir ? baseName(currentDir) : "No project";

  return (
    <button
      onClick={openProjectPicker}
      title={currentDir ?? "Open a project"}
      className="flex w-full items-center gap-2 border-b border-[var(--border)] px-3 py-2 text-left transition-colors hover:bg-white/[0.04]"
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
  );
}
