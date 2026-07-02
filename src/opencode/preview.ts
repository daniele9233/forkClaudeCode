import { invoke } from "@tauri-apps/api/core";
import { usePreviewStore } from "@/stores/preview.store";
import { useDevServerStore } from "@/stores/devserver.store";
import { useSessionStore } from "@/stores/session.store";

/**
 * URL of the built-in static server for the current project — but only if the
 * project has a servable `index.html`. Returns null otherwise. This is what
 * lets "ask for a page → see it" work with no dev server: the agent writes
 * index.html and the backend serves it (with the inspector injected).
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

function portOf(url: string | null): number | null {
  if (!url) return null;
  const m = url.match(/:(\d{2,5})\b/);
  return m ? Number(m[1]) : null;
}

/** Ports kikkoCode itself uses, so we never mistake them for the user's site. */
function ownPorts(): number[] {
  const ports: number[] = [1420]; // our own UI dev server (tauri dev)
  const push = (p: number | null) => {
    if (p) ports.push(p);
  };
  push(portOf(useSessionStore.getState().opencodeUrl));
  push(portOf(usePreviewStore.getState().previewUrl));
  push(portOf(usePreviewStore.getState().frameUrl));
  return ports;
}

/**
 * Show a target URL in the preview panel. Dev-server targets are routed through
 * the built-in injecting proxy (`set_preview_proxy`) so the visual inspector is
 * available on any site with zero project changes; the static server injects it
 * by itself, so static URLs load directly. The address bar always shows the
 * real target — the proxy is invisible plumbing.
 */
export async function showPreview(
  url: string,
  opts?: { isStatic?: boolean },
): Promise<void> {
  let frame = url;
  try {
    if (opts?.isStatic) {
      await invoke("set_preview_proxy", { target: null });
    } else {
      const proxied = await invoke<string | null>("set_preview_proxy", { target: url });
      if (proxied) frame = proxied;
    }
  } catch {
    /* preview server unavailable — load the target directly (no inspector) */
  }
  const st = usePreviewStore.getState();
  if (st.previewUrl === url && st.frameUrl === frame && st.previewOpen) {
    st.bumpReload();
  } else {
    st.openPreview(url, frame);
  }
}

/**
 * Resolve the best thing to preview, in priority order:
 * 1. a dev server whose URL we captured from output (authoritative)
 * 2. a live dev server found by probing the machine's listening ports
 * 3. the built-in static server (project has an index.html)
 */
async function resolvePreview(): Promise<{ url: string; isStatic: boolean } | null> {
  const st = usePreviewStore.getState();
  const dev = st.detectedUrl ?? (await probeDevServer());
  if (dev) return { url: dev, isStatic: false };
  const stat = await getStaticPreviewUrl();
  if (stat) return { url: stat, isStatic: true };
  return null;
}

/**
 * A real dev-server URL was seen in output (the agent's command output, or our
 * managed server's log). The URL a server prints is authoritative — it beats any
 * port-scan guess or the static fallback — so record it and navigate the preview
 * to it. Respects a user who explicitly closed the panel, and ignores kikkoCode's
 * own servers (engine health checks in agent output must never hijack the view).
 */
export function onDevUrlDetected(url: string): void {
  const port = portOf(url);
  if (port && ownPorts().includes(port)) return;

  const st = usePreviewStore.getState();
  st.setDetectedUrl(url);
  useDevServerStore.getState().setStarting(false);
  useDevServerStore.getState().setRunning(true);
  // Don't pop the panel back up if the user deliberately closed it.
  if (!st.previewOpen && st.closedByUser) return;
  void showPreview(url);
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
 * Keep looking for something to preview and open it the moment it appears. Dev
 * servers can take many seconds to boot (or the agent starts one later), so a
 * single probe isn't enough. Runs as long as the panel is open and empty (with
 * a generous cap), stops when a page loads or the user closes the panel. Safe
 * to call repeatedly: only one watcher runs at a time.
 */
export async function watchForDevServer(maxMs = 10 * 60_000): Promise<void> {
  if (watching) return;
  watching = true;
  const start = Date.now();
  try {
    while (Date.now() - start < maxMs) {
      const st = usePreviewStore.getState();
      // A real page is already loaded, or the user closed the panel — stop.
      if (st.previewUrl) return;
      if (!st.previewOpen) return;
      const found = await resolvePreview();
      if (found) {
        await showPreview(found.url, { isStatic: found.isStatic });
        return;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  } finally {
    watching = false;
  }
}

export async function openBestPreview(): Promise<void> {
  const st = usePreviewStore.getState();
  const found = await resolvePreview();
  if (found) {
    await showPreview(found.url, { isStatic: found.isStatic });
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

  const found = await resolvePreview();
  if (found) {
    await showPreview(found.url, { isStatic: found.isStatic });
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
