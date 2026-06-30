import type { AssistantMessage, Message } from "@opencode-ai/sdk/client";

/**
 * A row from `session.messages` may be `{ info, parts }` (SDK 0.15 shape) or a
 * flatter object depending on the engine version. Extract the message "info"
 * defensively so a shape mismatch can't crash the UI with `reading 'role'`.
 */
export function rowInfo(row: unknown): Message | undefined {
  if (!row || typeof row !== "object") return undefined;
  const withInfo = (row as { info?: unknown }).info;
  const candidate = (withInfo ?? row) as Message;
  return candidate && typeof candidate === "object" && "role" in candidate
    ? candidate
    : undefined;
}

/** Type guard: the message is an assistant step (has token/cost stats). */
export function isAssistant(m: unknown): m is AssistantMessage {
  return !!m && typeof m === "object" && (m as { role?: string }).role === "assistant";
}

/** Creation timestamp, tolerant of a missing `time` field. */
export function createdAt(m: { time?: { created?: number } } | undefined): number {
  return m?.time?.created ?? 0;
}
