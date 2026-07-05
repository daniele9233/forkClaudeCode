import { invoke } from "@tauri-apps/api/core";
import { getClient } from "./client";
import { rowInfo } from "./messageShape";
import { runHiddenPlan } from "./hiddenSession";
import { useMemoryStore } from "@/stores/memory.store";

/**
 * Persistent project memory — the "best possible" design for this architecture:
 *
 * 1. STORAGE: a machine-managed block inside the project's `AGENTS.md`, fenced
 *    by markers. opencode injects AGENTS.md natively into every session, so
 *    injection costs nothing and needs no plumbing; human-written rules outside
 *    the markers are never touched; the memory is versioned with the repo (it
 *    even shows up in the review panel like any other change).
 * 2. DISTILLATION: after each meaningful run, a hidden throwaway session (plan
 *    mode → read-only, no side effects) receives the current memory + a digest
 *    of the conversation and returns the UPDATED memory (merge + dedupe +
 *    eviction, hard-capped). kikkoCode writes it into the markers
 *    deterministically — the model never touches the file itself.
 * 3. HYGIENE: hidden sessions are title-tagged `[kikko]`, filtered out of the
 *    sidebar, silenced (no notifications/preview/autopilot reactions) and
 *    deleted right after use.
 */

const HIDDEN_TITLE = "[kikko] memory distiller";

// The silent-session registry lives in its own module (shared with the hidden
// plan-session helper); re-export it here for existing importers.
import { isSilentSession, markSilent, unmarkSilent } from "./silentSessions";
export { isSilentSession, markSilent, unmarkSilent };

/** Throttle bookkeeping: last distilled message-count per session. */
const distilledUpTo = new Map<string, number>();
let lastDistillAt = 0;

const MIN_NEW_MESSAGES = 4;
const MIN_INTERVAL_MS = 3 * 60_000;
const MAX_MEMORY_CHARS = 4_000;
const MAX_DIGEST_CHARS = 9_000;

function distillPrompt(currentMemory: string, digest: string): string {
  return `You maintain the long-term PROJECT MEMORY for a coding agent. It is injected into every future session, so it must be short, dense and only contain durable facts.

CURRENT MEMORY (may be empty):
---
${currentMemory || "(empty)"}
---

LATEST CONVERSATION (digest):
---
${digest}
---

Rewrite the memory, merging in anything durable from the conversation. Rules:
- Keep ONLY durable knowledge: project conventions (package manager, formatting, naming), architecture decisions and their reasons, user preferences (language, style, what they rejected), known gotchas/pitfalls, key commands.
- NO session narration, no one-off task details, no code, no file diffs.
- Merge and dedupe with the current memory; drop entries that the conversation made obsolete.
- Format: markdown, these exact sections (omit empty ones): "### Conventions", "### Decisions", "### Preferences", "### Gotchas", "### Commands". Bullet points, each ≤ 140 chars.
- HARD LIMIT: ${MAX_MEMORY_CHARS} characters total. Fewer, denser bullets beat many vague ones.
- Reply with ONLY the memory content. No preamble, no code fences, no markers.`;
}

/** User/assistant text digest of a session, newest-last, size-capped. */
async function buildDigest(
  sessionId: string,
): Promise<{ digest: string; count: number }> {
  const res = await getClient().session.messages({
    path: { id: sessionId },
    throwOnError: true,
  });
  const rows = res.data ?? [];
  const lines: string[] = [];
  for (const row of rows) {
    const info = rowInfo(row);
    if (!info) continue;
    const role = info.role === "assistant" ? "AGENT" : "USER";
    const parts = ((row as { parts?: Array<{ type: string; text?: string }> }).parts ??
      []) as Array<{ type: string; text?: string }>;
    const text = parts
      .filter((p) => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) lines.push(`${role}: ${text.slice(0, 400)}`);
  }
  // Keep the tail (most recent) within the cap.
  let digest = "";
  for (let i = lines.length - 1; i >= 0; i--) {
    const candidate = lines[i] + "\n" + digest;
    if (candidate.length > MAX_DIGEST_CHARS) break;
    digest = candidate;
  }
  return { digest: digest.trim(), count: rows.length };
}

/** Strip fences/markers the model might add despite instructions. */
function sanitize(reply: string): string {
  let out = reply.trim();
  out = out.replace(/^```(?:markdown|md)?\s*/i, "").replace(/```\s*$/, "");
  out = out
    .split("\n")
    .filter((l) => !l.includes("kikko:memory:"))
    .join("\n")
    .trim();
  return out.slice(0, MAX_MEMORY_CHARS + 500);
}

/** Current memory block content from AGENTS.md (between markers), if any. */
async function currentMemory(): Promise<string> {
  const text = (await invoke<string | null>("read_agents_file")) ?? "";
  const m = text.match(/<!-- kikko:memory:start -->([\s\S]*?)<!-- kikko:memory:end -->/);
  return m ? m[1].trim() : "";
}

/** One distillation pass for `sessionId`. Returns true if memory was updated. */
async function distill(sessionId: string): Promise<boolean> {
  const store = useMemoryStore.getState();
  if (store.distilling) return false;
  store.setDistilling(true);

  try {
    const [{ digest, count }, memory] = await Promise.all([
      buildDigest(sessionId),
      currentMemory(),
    ]);
    if (!digest) {
      useMemoryStore.getState().setResult(true);
      return false;
    }

    // Hidden throwaway session, plan mode: read-only, no side effects.
    const reply = await runHiddenPlan(HIDDEN_TITLE, [
      { type: "text", text: distillPrompt(memory, digest) },
    ]);
    const next = sanitize(reply);
    if (!next) throw new Error("empty distillation reply");

    const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    await invoke("update_agents_memory", {
      memory: `_Project memory — auto-maintained by kikkoCode. Last update: ${stamp}. Do not edit inside the markers._\n\n${next}`,
    });

    distilledUpTo.set(sessionId, count);
    lastDistillAt = Date.now();
    useMemoryStore.getState().setResult(true);
    return true;
  } catch (e) {
    useMemoryStore
      .getState()
      .setResult(false, e instanceof Error ? e.message : String(e));
    return false;
  }
}

/** Manual "Memorize now" — no throttle. */
export async function memorizeNow(sessionId: string): Promise<boolean> {
  return distill(sessionId);
}

/**
 * Auto-distill hook, called on session.idle. Throttled: skips tiny runs
 * (< ${MIN_NEW_MESSAGES} new messages since the last distill of this session)
 * and enforces a minimum interval between distillations.
 */
export async function memoryOnIdle(sessionId: string): Promise<void> {
  const store = useMemoryStore.getState();
  if (!store.autoMemorize || store.distilling) return;
  if (isSilentSession(sessionId)) return;
  if (Date.now() - lastDistillAt < MIN_INTERVAL_MS) return;

  try {
    const res = await getClient().session.messages({
      path: { id: sessionId },
      throwOnError: true,
    });
    const count = (res.data ?? []).length;
    const seen = distilledUpTo.get(sessionId) ?? 0;
    if (count - seen < MIN_NEW_MESSAGES) return;
  } catch {
    return;
  }
  await distill(sessionId);
}
