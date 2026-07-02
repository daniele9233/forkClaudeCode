import type {
  Event,
  EventMessageUpdated,
  EventMessagePartUpdated,
  EventSessionIdle,
  EventSessionError,
  EventPermissionUpdated,
  EventFileEdited,
} from "@opencode-ai/sdk/client";
import { getClient } from "./client";

export type {
  Event,
  EventMessageUpdated,
  EventMessagePartUpdated,
  EventSessionIdle,
  EventSessionError,
  EventPermissionUpdated,
  EventFileEdited,
};

/** Narrow an event by type string. */
export function isEventType<T extends Event>(event: Event, type: T["type"]): event is T {
  return event.type === type;
}

export type EventHandler = (event: Event) => void;

let _handlers: EventHandler[] = [];
let _streaming = false;
let _abortController: AbortController | null = null;

/** Register a handler for all events. Returns an unsubscribe function. */
export function onEvent(handler: EventHandler): () => void {
  _handlers.push(handler);
  return () => {
    _handlers = _handlers.filter((h) => h !== handler);
  };
}

/** Bumped on every start/stop so a superseded loop knows to exit. */
let _generation = 0;

/**
 * Start the SSE event stream. Safe to call multiple times — idempotent.
 *
 * The stream is the app's ears: if it dies silently (engine hiccup, transient
 * network error — NOT a process crash, which the health monitor covers), no
 * streaming tokens and no permission prompts would ever arrive again. So when
 * the stream ends without an explicit stop, we reconnect with exponential
 * backoff until stopped or superseded by a restart.
 */
export async function startEventStream(): Promise<void> {
  if (_streaming) return;
  _streaming = true;
  const gen = ++_generation;
  _abortController = new AbortController();
  const signal = _abortController.signal;

  let backoff = 1_000;
  try {
    while (!signal.aborted && gen === _generation) {
      try {
        const result = await getClient().event.subscribe();
        for await (const event of result.stream) {
          if (signal.aborted) break;
          backoff = 1_000; // events flowing — reset the backoff
          for (const handler of _handlers) {
            try {
              handler(event);
            } catch {
              // individual handler errors must not crash the stream
            }
          }
        }
      } catch (err) {
        if (signal.aborted || gen !== _generation) break;
        console.warn("[opencode] event stream dropped:", err);
      }
      if (signal.aborted || gen !== _generation) break;
      // Stream ended without an explicit stop — wait and reconnect.
      console.warn(`[opencode] event stream ended — reconnecting in ${backoff}ms`);
      await new Promise((r) => setTimeout(r, backoff));
      backoff = Math.min(backoff * 2, 15_000);
    }
  } finally {
    if (gen === _generation) _streaming = false;
  }
}

/** Stop the SSE event stream. */
export function stopEventStream(): void {
  _generation++;
  _abortController?.abort();
  _streaming = false;
}

/** Convenience: subscribe to a specific event type. */
export function onEventType<T extends Event>(
  type: T["type"],
  handler: (event: T) => void,
): () => void {
  return onEvent((event) => {
    if (isEventType<T>(event, type)) handler(event);
  });
}
