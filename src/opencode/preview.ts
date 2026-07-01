import { invoke } from "@tauri-apps/api/core";
import { usePreviewStore } from "@/stores/preview.store";

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
export async function openBestPreview(): Promise<void> {
  const url = await resolvePreviewUrl();
  usePreviewStore.getState().openPreview(url);
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
  if (!url) return;

  if (!st.previewOpen) {
    st.openPreview(url); // auto-open the page the agent just produced
  } else if (st.previewUrl === url) {
    st.bumpReload(); // already showing it → reflect the latest edits
  } else {
    st.openPreview(url); // panel open on empty/other → load the right URL
  }
}
