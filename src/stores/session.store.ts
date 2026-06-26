import { create } from "zustand";
import { persist } from "zustand/middleware";

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

      setActiveSession: (id) => set({ activeSessionId: id }),
      setOpencodeUrl: (url) => set({ opencodeUrl: url }),
      setSidecarStatus: (status, error = undefined) =>
        set({ sidecarStatus: status, sidecarError: error ?? null }),
    }),
    {
      name: "forgia-session",
      // Don't persist transient sidecar state across restarts.
      partialize: (state) => ({ activeSessionId: state.activeSessionId }),
    },
  ),
);
