import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { initClient, getClient } from "./client";
import { startEventStream, stopEventStream } from "./events";
import { useSessionStore } from "@/stores/session.store";
import { useWorkspaceStore } from "@/stores/workspace.store";

/**
 * Project/workspace actions. A "project" in opencode is simply the directory the
 * engine runs in, so switching project = restart the engine in a new cwd and
 * re-point the SDK client at it (the engine gets a fresh port on restart).
 */
export function useProjectActions() {
  const qc = useQueryClient();

  /** Open the native folder picker; returns the chosen absolute path or null. */
  const pickDirectory = useCallback(async (title?: string): Promise<string | null> => {
    const picked = await open({ directory: true, multiple: false, title });
    return typeof picked === "string" ? picked : null;
  }, []);

  /**
   * Point the engine at `dir` and restart it there. Re-inits the client, restarts
   * the event stream, resets the active session (sessions are per-project) and
   * refetches everything for the new project.
   */
  const openProject = useCallback(
    async (dir: string) => {
      const newUrl = await invoke<string>("set_working_dir", { path: dir });
      initClient(newUrl);
      stopEventStream();
      void startEventStream();

      const session = useSessionStore.getState();
      session.setOpencodeUrl(newUrl);
      // The previous project's session no longer applies to the new folder.
      session.setActiveSession(null);
      useWorkspaceStore.getState().addRecent(dir);

      // Everything (sessions, config, files…) belongs to the new project now.
      await qc.invalidateQueries();

      // Restore the session you last used in THIS project (if it still exists),
      // so switching back and forth doesn't lose your place.
      const last = useWorkspaceStore.getState().lastSessionByPath[dir];
      if (last) {
        try {
          const list =
            (await getClient().session.list({ throwOnError: true })).data ?? [];
          if (list.some((s) => s.id === last)) session.setActiveSession(last);
        } catch {
          /* engine still warming up — stay on a fresh session */
        }
      }
      return newUrl;
    },
    [qc],
  );

  /** Clone a git repo into `parentDir`, then open the cloned folder. */
  const cloneRepo = useCallback(
    async (url: string, parentDir: string) => {
      const dest = await invoke<string>("clone_repo", { url, parentDir });
      await openProject(dest);
      return dest;
    },
    [openProject],
  );

  /** Create a new project folder under `parentDir`, then open it. */
  const createProject = useCallback(
    async (parentDir: string, name: string, gitInit: boolean) => {
      const dest = await invoke<string>("create_project", {
        parentDir,
        name,
        gitInit,
      });
      await openProject(dest);
      return dest;
    },
    [openProject],
  );

  return { pickDirectory, openProject, cloneRepo, createProject };
}
