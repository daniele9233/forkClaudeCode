import { useEffect, useRef, useState } from "react";
import {
  X,
  FolderOpen,
  Github,
  FolderPlus,
  Loader2,
  Clock,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel } from "@/components/Panel";
import { useProjectActions } from "@/opencode/workspace";
import { useWorkspaceStore, baseName } from "@/stores/workspace.store";

type Tab = "open" | "clone" | "new";

interface Props {
  onClose: () => void;
}

export function ProjectPicker({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>("open");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const { pickDirectory, openProject, cloneRepo, createProject } = useProjectActions();
  const recents = useWorkspaceStore((s) => s.recents);
  const currentDir = useWorkspaceStore((s) => s.currentDir);
  const removeRecent = useWorkspaceStore((s) => s.removeRecent);

  // Clone tab state
  const [repoUrl, setRepoUrl] = useState("");
  const [cloneParent, setCloneParent] = useState<string | null>(null);
  // New-project tab state
  const [newParent, setNewParent] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [gitInit, setGitInit] = useState(true);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, busy]);

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
      onClose();
    } catch (e) {
      // User cancelled a native dialog — just stay open, no error.
      if (e instanceof AbortSilently) return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleOpenFolder = () =>
    run(async () => {
      const dir = await pickDirectory("Choose a project folder");
      if (!dir) throw new AbortSilently();
      await openProject(dir);
    });

  const handleClone = () =>
    run(async () => {
      if (!repoUrl.trim()) throw new Error("Enter a repository URL");
      let parent = cloneParent;
      if (!parent) {
        parent = await pickDirectory("Choose where to clone");
        if (!parent) throw new AbortSilently();
      }
      await cloneRepo(repoUrl.trim(), parent);
    });

  const handleCreate = () =>
    run(async () => {
      if (!newName.trim()) throw new Error("Enter a project name");
      let parent = newParent;
      if (!parent) {
        parent = await pickDirectory("Choose where to create the project");
        if (!parent) throw new AbortSilently();
      }
      await createProject(parent, newName.trim(), gitInit);
    });

  const TABS: { id: Tab; label: string; icon: typeof FolderOpen }[] = [
    { id: "open", label: "Open folder", icon: FolderOpen },
    { id: "clone", label: "Clone from GitHub", icon: Github },
    { id: "new", label: "New project", icon: FolderPlus },
  ];

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={(e) => e.target === overlayRef.current && !busy && onClose()}
    >
      <Panel
        strong
        role="dialog"
        aria-modal="true"
        aria-label="Open project"
        className="flex max-h-[80vh] w-[560px] flex-col overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pr-2">
          <span className="bp-tab">project</span>
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-40"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Current project */}
        {currentDir && (
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2 text-xs">
            <FolderOpen className="h-3.5 w-3.5 shrink-0 text-[var(--color-online)]" />
            <span className="text-[var(--muted-foreground)]">current:</span>
            <span className="truncate font-medium text-[var(--foreground)]">
              {baseName(currentDir)}
            </span>
            <span className="truncate text-[10px] text-[var(--muted-foreground)]/60">
              {currentDir}
            </span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-[var(--border)] px-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id);
                  setError(null);
                }}
                className={cn(
                  "flex items-center gap-1.5 border-b-2 px-3 py-2 text-[11px] font-medium transition-colors",
                  tab === t.id
                    ? "border-[var(--primary)] text-[var(--foreground)]"
                    : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {tab === "open" && (
            <div className="space-y-2">
              <p className="text-xs text-[var(--muted-foreground)]">
                Pick a folder on your computer to work on. The engine starts in that
                folder and all sessions belong to it.
              </p>
              <button
                onClick={handleOpenFolder}
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--primary)]/40 bg-[var(--primary)]/10 px-4 py-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--primary)]/20 disabled:opacity-50"
              >
                <FolderOpen className="h-4 w-4" />
                Choose folder…
              </button>
            </div>
          )}

          {tab === "clone" && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--muted-foreground)]">
                Clone an existing GitHub repository. Uses your system git, so private
                repos work if git is already authenticated on this PC.
              </p>
              <div className="space-y-1">
                <label className="hud-label">repository URL</label>
                <input
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/user/repo.git"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--muted)]/30 px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                />
              </div>
              <FolderField
                label="clone into"
                value={cloneParent}
                onPick={async () => {
                  const d = await pickDirectory("Choose where to clone");
                  if (d) setCloneParent(d);
                }}
              />
              <button
                onClick={handleClone}
                disabled={busy || !repoUrl.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--primary)]/40 bg-[var(--primary)]/10 px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--primary)]/20 disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Github className="h-4 w-4" />
                )}
                Clone & open
              </button>
            </div>
          )}

          {tab === "new" && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--muted-foreground)]">
                Create a fresh, empty project folder and start working in it.
              </p>
              <div className="space-y-1">
                <label className="hud-label">project name</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="my-app"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--muted)]/30 px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                />
              </div>
              <FolderField
                label="create in"
                value={newParent}
                onPick={async () => {
                  const d = await pickDirectory("Choose where to create the project");
                  if (d) setNewParent(d);
                }}
              />
              <label className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                <input
                  type="checkbox"
                  checked={gitInit}
                  onChange={(e) => setGitInit(e.target.checked)}
                  className="accent-[var(--primary)]"
                />
                Initialize a git repository (<code>git init</code>)
              </label>
              <button
                onClick={handleCreate}
                disabled={busy || !newName.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--primary)]/40 bg-[var(--primary)]/10 px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--primary)]/20 disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FolderPlus className="h-4 w-4" />
                )}
                Create & open
              </button>
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-md border border-red-500/30 bg-red-950/30 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          {/* Recents */}
          {recents.length > 0 && (
            <div className="mt-5 border-t border-[var(--border)] pt-3">
              <div className="mb-1.5 flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-[var(--muted-foreground)]" />
                <span className="hud-label">recent</span>
              </div>
              <div className="space-y-0.5">
                {recents.map((r) => (
                  <div
                    key={r.path}
                    className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/[0.04]"
                  >
                    <button
                      onClick={() => run(() => openProject(r.path))}
                      disabled={busy}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:opacity-50"
                    >
                      <FolderOpen className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" />
                      <span className="shrink-0 text-xs font-medium text-[var(--foreground)]">
                        {r.name}
                      </span>
                      <span className="truncate text-[10px] text-[var(--muted-foreground)]/60">
                        {r.path}
                      </span>
                      <ArrowRight className="ml-auto h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
                    </button>
                    <button
                      onClick={() => removeRecent(r.path)}
                      className="shrink-0 rounded p-1 text-[var(--muted-foreground)] opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                      title="Remove from recents"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

/** A read-only path field with a "Browse…" button. */
function FolderField({
  label,
  value,
  onPick,
}: {
  label: string;
  value: string | null;
  onPick: () => void;
}) {
  return (
    <div className="space-y-1">
      <label className="hud-label">{label}</label>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1 truncate rounded-md border border-[var(--border)] bg-[var(--muted)]/20 px-3 py-2 text-xs text-[var(--muted-foreground)]">
          {value ?? "(pick a folder…)"}
        </div>
        <button
          onClick={onPick}
          className="shrink-0 rounded-md border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
        >
          Browse…
        </button>
      </div>
    </div>
  );
}

/** Thrown to bail out of an action when the user cancels a native dialog. */
class AbortSilently extends Error {
  constructor() {
    super("");
    this.name = "AbortSilently";
  }
}
