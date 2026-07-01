import { create } from "zustand";

interface DevServerState {
  /** The managed dev server is running. */
  running: boolean;
  /** We asked it to start and are waiting for the URL / first output. */
  starting: boolean;
  /** Command line being run (e.g. "pnpm run dev"), or null. */
  command: string | null;
  /** Recent output lines (capped) — shown while starting / for diagnostics. */
  logs: string[];

  setRunning: (v: boolean) => void;
  setStarting: (v: boolean) => void;
  setCommand: (c: string | null) => void;
  appendLog: (line: string) => void;
  clearLogs: () => void;
}

const MAX_LOGS = 200;

export const useDevServerStore = create<DevServerState>((set) => ({
  running: false,
  starting: false,
  command: null,
  logs: [],

  setRunning: (v) => set({ running: v }),
  setStarting: (v) => set({ starting: v }),
  setCommand: (c) => set({ command: c }),
  appendLog: (line) =>
    set((s) => {
      const logs = [...s.logs, line];
      return { logs: logs.length > MAX_LOGS ? logs.slice(-MAX_LOGS) : logs };
    }),
  clearLogs: () => set({ logs: [] }),
}));
