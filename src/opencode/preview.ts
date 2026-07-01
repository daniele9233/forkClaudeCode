import { invoke } from "@tauri-apps/api/core";
import { usePreviewStore } from "@/stores/preview.store";
import { useDevServerStore } from "@/stores/devserver.store";
import { useSessionStore } from "@/stores/session.store";

/**
 * URL of the built-in static server for the current project — but only if the
 * project has a servable `index.html`. Returns null otherwise. This is what
 * lets "ask for a page → see it" work with no dev server: the agent writes
 * index.html and the backend serves it.
 */
export async function getStaticPreviewUrl(): Promise<string | null> {
  try {
    return (await invoke<string | null>("preview_url")) ?? null;
  } catch {
    return null;
  }
}

/**
 * Find a running dev server on ANY port by enumerating the machine's listening
 * ports and probing them. Catches servers on unusual ports and ones started
 * outside kikkoCode's terminal. Excludes kikkoCode's own ports (engine, static
 * preview server). Returns the first live URL, or null.
 */
export async function probeDevServer(): Promise<string | null> {
  const exclude = ownPorts();
  try {
    return (await invoke<string | null>("find_dev_server", { exclude })) ?? null;
  } catch {
    return null;
  }
}

/** Ports kikkoCode itself uses, so we never mistake them for the user's site. */
function ownPorts(): number[] {
  const ports: number[] = [];
  const push = (u: string | null) => {
    if (!u) return;
    const m = u.match(/:(\d{2,5})\b/);
    if (m) ports.push(Number(m[1]));
  };
  push(useSessionStore.getState().opencodeUrl);
  push(usePreviewStore.getState().previewUrl);
  return ports;
}

/**
 * Resolve the best URL to preview, in priority order:
 * 1. a dev server whose URL we captured from the terminal
 * 2. a live dev server found by probing common ports
 * 3. the built-in static server (project has an index.html)
 * Returns undefined when there's nothing to show yet.
 */
async function resolvePreviewUrl(): Promise<string | undefined> {
  const st = usePreviewStore.getState();
  return (
    st.detectedUrl ??
    (await probeDevServer()) ??
    (await getStaticPreviewUrl()) ??
    undefined
  );
}

/** The dev command kikkoCode would run for this project, or null. */
export async function getDevCommand(): Promise<string | null> {
  try {
    return (await invoke<string | null>("dev_command_info")) ?? null;
  } catch {
    return null;
  }
}

/**
 * Start the kikkoCode-managed dev server. The real URL arrives via the
 * `dev-server-log` stream (see useDevServerEvents), which opens the preview.
 */
export async function startDevServer(): Promise<void> {
  const dev = useDevServerStore.getState();
  dev.clearLogs();
  dev.setStarting(true);
  try {
    const cmd = await invoke<string>("start_dev_server");
    dev.setCommand(cmd);
    // Also watch the machine's ports: the URL usually arrives via the log
    // stream, but this is a safety net (e.g. output we didn't parse).
    void watchForDevServer();
  } catch (e) {
    dev.setStarting(false);
    dev.appendLog(`[error] ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function stopDevServer(): Promise<void> {
  try {
    await invoke("stop_dev_server");
  } catch {
    /* ignore */
  }
  const dev = useDevServerStore.getState();
  dev.setRunning(false);
  dev.setStarting(false);
  dev.setCommand(null);
}

let watching = false;

/**
 * Poll for a preview URL for a while and open it as soon as it appears. Dev
 * servers can take several seconds to boot (or the agent starts one after we
 * looked), so a single probe isn't enough — we keep looking. Safe to call
 * repeatedly: only one watcher runs at a time.
 */
export async function watchForDevServer(timeoutMs = 30_000): Promise<void> {
  if (watching) return;
  watching = true;
  const start = Date.now();
  try {
    while (Date.now() - start < timeoutMs) {
      const st = usePreviewStore.getState();
      // A real page is already loaded, or the user closed the panel — stop.
      if (st.previewUrl) return;
      if (!st.previewOpen && st.closedByUser) return;
      const url = await resolvePreviewUrl();
      if (url) {
        usePreviewStore.getState().openPreview(url);
        return;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
  } finally {
    watching = false;
  }
}

export async function openBestPreview(): Promise<void> {
  const st = usePreviewStore.getState();
  const url = await resolvePreviewUrl();
  if (url) {
    st.openPreview(url);
    return;
  }
  // Nothing live and no static page — open the panel, run the project's dev
  // server if it has one, and keep watching until a server (on any port) shows
  // up. This is what makes the preview appear automatically.
  const dev = useDevServerStore.getState();
  const cmd = await getDevCommand();
  st.openPreview(undefined);
  if (cmd && !dev.running && !dev.starting) {
    void startDevServer();
  }
  void watchForDevServer();
}

/**
 * Called when a run finishes (session.idle): if the project now has a web page,
 * auto-open it — or refresh it if it's already shown. A real dev server takes
 * priority. Respects a user who explicitly closed the preview.
 */
export async function syncStaticPreviewOnIdle(): Promise<void> {
  const st = usePreviewStore.getState();
  // Don't fight a user who closed the preview and never reopened it.
  if (!st.previewOpen && st.closedByUser) return;

  const url = await resolvePreviewUrl();
  if (url) {
    if (!st.previewOpen || st.previewUrl !== url) {
      st.openPreview(url); // auto-open / switch to the live page
    } else {
      st.bumpReload(); // already showing it → reflect the latest edits
    }
    return;
  }

  // No live URL and no static page. If it's a web project with a dev server,
  // start it ourselves so the preview appears automatically, and keep watching
  // for a server on any port (in case the agent started one itself).
  const dev = useDevServerStore.getState();
  if (dev.running || dev.starting) return;
  const cmd = await getDevCommand();
  if (cmd) {
    st.openPreview(undefined);
    void startDevServer();
    void watchForDevServer();
  }
}
