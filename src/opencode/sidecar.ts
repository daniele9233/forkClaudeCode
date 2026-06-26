import { invoke } from "@tauri-apps/api/core";
import { useSessionStore } from "@/stores/session.store";
import { stopEventStream } from "./events";

/**
 * Ask the Tauri backend to restart the `opencode serve` sidecar.
 *
 * The backend re-emits `opencode-ready` / `opencode-error`, which the
 * `SidecarBootstrap` listener already handles (re-init client + event stream).
 * Here we just flip the UI into a "starting" state and tear down the old
 * stream so we don't keep a dead EventSource around.
 */
export async function restartSidecar(): Promise<void> {
  const { setSidecarStatus } = useSessionStore.getState();
  stopEventStream();
  setSidecarStatus("starting");
  try {
    await invoke<string>("restart_opencode");
    // Success path emits `opencode-ready`; the listener sets status to "ready".
  } catch (e) {
    setSidecarStatus("error", String(e));
  }
}
