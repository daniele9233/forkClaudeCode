import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RecentProject {
  /** Absolute path of the project folder. */
  path: string;
  /** Last segment of the path, shown as the project name. */
  name: string;
  /** Epoch ms of the last time it was opened. */
  lastOpened: number;
}

interface WorkspaceState {
  /** The project folder the engine is currently running in (its cwd). */
  currentDir: string | null;
  /** Recently opened projects, most-recent first. */
  recents: RecentProject[];
  /** Last active session id per project path — restored when you reopen it. */
  lastSessionByPath: Record<string, string>;

  setCurrent: (dir: string | null) => void;
  /** Record a project as opened (also sets it current) and bump it to the top. */
  addRecent: (dir: string) => void;
  removeRecent: (path: string) => void;
  /** Remember the active session for a project (to restore on reopen). */
  setLastSession: (path: string, sessionId: string) => void;
}

/** Folder name (last path segment) from an absolute path, Windows or POSIX. */
export function baseName(path: string): string {
  const cleaned = path.replace(/[\\/]+$/, "");
  const seg = cleaned.split(/[\\/]/).pop();
  return seg && seg.length > 0 ? seg : cleaned;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      currentDir: null,
      recents: [],
      lastSessionByPath: {},

      setCurrent: (dir) => set({ currentDir: dir }),

      setLastSession: (path, sessionId) =>
        set((s) => ({
          lastSessionByPath: { ...s.lastSessionByPath, [path]: sessionId },
        })),

      addRecent: (dir) =>
        set((s) => {
          const entry: RecentProject = {
            path: dir,
            name: baseName(dir),
            lastOpened: Date.now(),
          };
          const rest = s.recents.filter((r) => r.path !== dir);
          return { currentDir: dir, recents: [entry, ...rest].slice(0, 12) };
        }),

      removeRecent: (path) =>
        set((s) => ({ recents: s.recents.filter((r) => r.path !== path) })),
    }),
    { name: "kikko-workspace" },
  ),
);
