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

/** Start the SSE event stream. Safe to call multiple times — idempotent. */
export async function startEventStream(): Promise<void> {
  if (_streaming) return;
  _streaming = true;
  _abortController = new AbortController();

  try {
    const result = await getClient().event.subscribe();
    for await (const event of result.stream) {
      if (_abortController.signal.aborted) break;
      for (const handler of _handlers) {
        try {
          handler(event);
        } catch {
          // individual handler errors must not crash the stream
        }
      }
    }
  } catch (err) {
    if (!_abortController?.signal.aborted) {
      console.error("[opencode] event stream error:", err);
    }
  } finally {
    _streaming = false;
  }
}

/** Stop the SSE event stream. */
export function stopEventStream(): void {
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
