import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useWorkspaceStore } from "./workspace.store";

export type SidecarStatus = "starting" | "ready" | "error" | "stopped";

interface SessionState {
  /** Currently active session ID. */
  activeSessionId: string | null;
  /** URL of the opencode sidecar (set after Tauri emits "opencode-ready"). */
  opencodeUrl: string | null;
  /** Lifecycle status of the sidecar. */
  sidecarStatus: SidecarStatus;
  /** Error message if sidecarStatus === "error". */
  sidecarError: string | null;

  setActiveSession: (id: string | null) => void;
  setOpencodeUrl: (url: string) => void;
  setSidecarStatus: (status: SidecarStatus, error?: string) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      activeSessionId: null,
      opencodeUrl: null,
      sidecarStatus: "starting",
      sidecarError: null,

      setActiveSession: (id) => {
        set({ activeSessionId: id });
        // Remember which session is active per project, so reopening a project
        // restores it. Only record real selections (never the null during a
        // project switch), keyed by the current project folder.
        if (id) {
          const dir = useWorkspaceStore.getState().currentDir;
          if (dir) useWorkspaceStore.getState().setLastSession(dir, id);
        }
      },
      setOpencodeUrl: (url) => set({ opencodeUrl: url }),
      setSidecarStatus: (status, error = undefined) =>
        set({ sidecarStatus: status, sidecarError: error ?? null }),
    }),
    {
      name: "kikkocode-session",
      // Don't persist transient sidecar state across restarts.
      partialize: (state) => ({ activeSessionId: state.activeSessionId }),
    },
  ),
);
