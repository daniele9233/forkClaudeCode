import { invoke } from "@tauri-apps/api/core";
import { usePreviewStore } from "@/stores/preview.store";
import { useDevServerStore } from "@/stores/devserver.store";

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
 * Actively scan common dev-server ports (3000, 5173, …) for a live server. This
 * catches dev servers started outside kikkoCode's terminal, whose output we
 * never captured. Returns the first live URL, or null.
 */
export async function probeDevServer(): Promise<string | null> {
  try {
    return (await invoke<string | null>("probe_dev_server")) ?? null;
  } catch {
    return null;
  }
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

/**
 * Open the best available preview: a detected dev server if there is one, else
 * the built-in static server, else an empty panel with guidance.
 */
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

export async function openBestPreview(): Promise<void> {
  const st = usePreviewStore.getState();
  const url = await resolvePreviewUrl();
  if (url) {
    st.openPreview(url);
    return;
  }
  // Nothing live and no static page — offer to run the dev server ourselves if
  // the project has one. Open the panel so the user sees the "starting" state.
  const dev = useDevServerStore.getState();
  const cmd = await getDevCommand();
  st.openPreview(undefined);
  if (cmd && !dev.running && !dev.starting) {
    void startDevServer();
  }
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
  // start it ourselves so the preview appears automatically.
  const dev = useDevServerStore.getState();
  if (dev.running || dev.starting) return;
  const cmd = await getDevCommand();
  if (cmd) {
    st.openPreview(undefined);
    void startDevServer();
  }
}
