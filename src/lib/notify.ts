import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

/**
 * Desktop notification for long-running work: fires only when the window is NOT
 * focused (if you're watching the app, the UI itself is the signal). Permission
 * is requested lazily on first use.
 */
export async function notifyWhenUnfocused(title: string, body: string): Promise<void> {
  try {
    if (document.hasFocus()) return;
    let granted = await isPermissionGranted();
    if (!granted) {
      granted = (await requestPermission()) === "granted";
    }
    if (granted) {
      sendNotification({ title, body });
    }
  } catch {
    // Notifications unavailable (permission denied / platform) — never fatal.
  }
}
