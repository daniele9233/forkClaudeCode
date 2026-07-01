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
 * Open the best available preview: a detected dev server if there is one, else
 * the built-in static server, else an empty panel with guidance.
 */
export async function openBestPreview(): Promise<void> {
  const st = usePreviewStore.getState();
  const url = st.detectedUrl ?? (await getStaticPreviewUrl()) ?? undefined;
  st.openPreview(url);
}

/**
 * Called when a run finishes (session.idle): if the project now has a web page,
 * auto-open it — or refresh it if it's already shown. A real dev server takes
 * priority. Respects a user who explicitly closed the preview.
 */
export async function syncStaticPreviewOnIdle(): Promise<void> {
  const st = usePreviewStore.getState();

  // A real dev server wins — just refresh it if we're showing it.
  if (st.detectedUrl) {
    if (st.previewOpen && st.previewUrl === st.detectedUrl) st.bumpReload();
    return;
  }

  const url = await getStaticPreviewUrl();
  if (!url) return;

  if (!st.previewOpen) {
    if (!st.closedByUser) st.openPreview(url); // auto-open the new page
  } else if (st.previewUrl === url) {
    st.bumpReload(); // already showing it → reflect the latest edits
  } else {
    st.openPreview(url); // panel open on empty/other → load the page
  }
}
