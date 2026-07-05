/**
 * The set of sessions kikkoCode drives internally (memory distiller, prompt
 * enhancer, style capture, …). SSE event handlers must ignore these so they
 * produce no notifications / preview / autopilot / queue reactions. Kept in its
 * own tiny module so both the event layer and the hidden-session helper can
 * share it without importing each other.
 */
const silent = new Set<string>();

export function isSilentSession(id: string): boolean {
  return silent.has(id);
}
export function markSilent(id: string): void {
  silent.add(id);
}
export function unmarkSilent(id: string): void {
  silent.delete(id);
}
