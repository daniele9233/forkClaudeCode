import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { detectDevServerUrl } from "@/features/terminal/detectDevServer";
import { useDevServerStore } from "@/stores/devserver.store";
import { usePreviewStore } from "@/stores/preview.store";

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
      if (url) {
        const st = usePreviewStore.getState();
        st.setDetectedUrl(url);
        // The server is up — mark running and show it in the preview.
        useDevServerStore.getState().setRunning(true);
        useDevServerStore.getState().setStarting(false);
        if (st.previewUrl !== url || !st.previewOpen) {
          st.openPreview(url);
        } else {
          st.bumpReload();
        }
      }
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
