import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { detectDevServerUrl } from "@/features/terminal/detectDevServer";
import { useDevServerStore } from "@/stores/devserver.store";
import { onDevUrlDetected } from "@/opencode/preview";

/**
 * Wire the kikkoCode-managed dev server's output stream into the UI. Each log
 * line is captured; the first one that contains a URL (Vite/Next/etc. print
 * "Local: http://localhost:xxxx") opens the preview at that real URL — no
 * guessing. Mount once.
 */
export function useDevServerEvents() {
  useEffect(() => {
    const dev = useDevServerStore.getState();

    const unlistenLog = listen<string>("dev-server-log", (e) => {
      const line = e.payload ?? "";
      dev.appendLog(line);
      const url = detectDevServerUrl(line);
      // The URL our managed server printed is authoritative → show it.
      if (url) onDevUrlDetected(url);
    });

    const unlistenExit = listen("dev-server-exit", () => {
      const d = useDevServerStore.getState();
      d.setRunning(false);
      d.setStarting(false);
      d.setCommand(null);
      d.appendLog("[dev server stopped]");
    });

    return () => {
      unlistenLog.then((fn) => fn());
      unlistenExit.then((fn) => fn());
    };
  }, []);
}
