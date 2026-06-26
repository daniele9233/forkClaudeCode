/**
 * Detect a local dev-server URL inside arbitrary command output.
 * Handles the common shapes printed by Vite, Next, CRA, etc:
 *   "Local:   http://localhost:5173/"
 *   "running at http://127.0.0.1:3000"
 *   "On Your Network: http://0.0.0.0:8080/"
 *   bare "localhost:4321"
 * Returns a normalized http URL (0.0.0.0 → localhost) or null.
 */
const URL_RE =
  /\bhttps?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(?::(\d{2,5}))?(\/[^\s'"`]*)?/i;
const BARE_RE = /\b(localhost|127\.0\.0\.1):(\d{2,5})\b/i;

export function detectDevServerUrl(text: string): string | null {
  if (!text) return null;

  const m = text.match(URL_RE);
  if (m) {
    const host = m[1].toLowerCase() === "0.0.0.0" ? "localhost" : m[1];
    const port = m[2] ? `:${m[2]}` : "";
    return `http://${host}${port}/`;
  }

  const b = text.match(BARE_RE);
  if (b) {
    const host = b[1].toLowerCase();
    return `http://${host}:${b[2]}/`;
  }

  return null;
}
