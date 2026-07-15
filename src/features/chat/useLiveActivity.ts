import { useEffect, useState } from "react";
import type { Part, ToolPart, TextPart, ReasoningPart } from "@opencode-ai/sdk/client";
import { useChatStore } from "@/stores/chat.store";
import { useSessionChildren } from "@/opencode/session";

/** After this many seconds of TRUE silence (no running tool, no active child,
 *  no token tick) we treat the run as possibly stuck and warn. */
const STALL_AT = 30;

export type ActivityKind = "tool" | "reasoning" | "text" | "subagents" | "waiting";

export interface LiveActivity {
  /** The session is running (waiting for session.idle). */
  running: boolean;
  /** What the agent is doing right now. */
  kind: ActivityKind;
  /** One-line human label, e.g. "bash · pnpm install" or "thinking…". */
  label: string;
  /** Optional secondary detail (command / path preview). */
  detail?: string;
  /** epoch-ms the current tool started (for a live elapsed clock). */
  startedAt?: number;
  /** Number of subagents (child sessions) working in parallel. */
  subagents: number;
  /** Seconds since the last real activity — used only for the stall warning. */
  silentFor: number;
  /** True when genuinely stuck: running, no live work, silent past the threshold. */
  stalled: boolean;
}

function preview(input: unknown): string | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) return undefined;
  const o = input as Record<string, unknown>;
  for (const k of ["command", "cmd", "pattern", "query", "path", "filePath", "file_path", "url"]) {
    const v = o[k];
    if (typeof v === "string" && v) return v;
  }
  return undefined;
}

/**
 * Computes what the MAIN agent is doing right now, from the live SSE parts of
 * its most-recent assistant message plus the state of its subagent children.
 *
 * The point: while a tool runs (a long `bash`, or a `task` that delegates to a
 * subagent) NO new parts arrive for the main session, so a naive "silence"
 * watchdog false-fires "stuck 50s" on perfectly healthy work. Here a running
 * tool or an active child counts as live activity — so the UI can show a
 * ticking, honest "what's happening now" line (like OpenCode) and only raise
 * the loop warning on REAL silence.
 */
export function useLiveActivity(sessionId: string | null): LiveActivity {
  const running = useChatStore((s) =>
    sessionId ? s.runningSessions.has(sessionId) : false,
  );
  const liveParts = useChatStore((s) => s.liveParts);
  const liveMessages = useChatStore((s) => s.liveMessages);
  const runningSessions = useChatStore((s) => s.runningSessions);
  const { data: children = [] } = useSessionChildren(sessionId);

  // Re-evaluate the elapsed clock ~4x/s while running (tool timers, silence).
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [running]);

  if (!sessionId || !running) {
    return { running: false, kind: "waiting", label: "", subagents: 0, silentFor: 0, stalled: false };
  }

  // Latest assistant message belonging to THIS session (live copy).
  let latestId: string | null = null;
  let latestT = -Infinity;
  for (const [id, m] of liveMessages) {
    if (m.sessionID !== sessionId || m.role !== "assistant") continue;
    const t = m.time?.created ?? 0;
    if (t >= latestT) {
      latestT = t;
      latestId = id;
    }
  }
  const parts: Part[] = latestId
    ? Array.from(liveParts.get(latestId)?.values() ?? [])
    : [];

  // Scan its parts for the current action (last running tool wins; else the
  // last streaming text/reasoning).
  let runningTool: ToolPart | undefined;
  let lastText: TextPart | undefined;
  let lastReasoning: ReasoningPart | undefined;
  for (const p of parts) {
    if (p.type === "tool") {
      const st = (p as ToolPart).state?.status;
      if (st === "pending" || st === "running") runningTool = p as ToolPart;
    } else if (p.type === "text") {
      if (((p as TextPart).text ?? "").trim()) lastText = p as TextPart;
    } else if (p.type === "reasoning") {
      lastReasoning = p as ReasoningPart;
    }
  }

  const subagents = children.filter((c) => runningSessions.has(c.id)).length;
  const hasLiveWork = !!runningTool || subagents > 0;

  const last = useChatStore.getState().lastActivityAt.get(sessionId) ?? Date.now();
  const silentFor = Math.max(0, Math.floor((Date.now() - last) / 1000));

  let kind: ActivityKind;
  let label: string;
  let detail: string | undefined;
  let startedAt: number | undefined;

  if (runningTool) {
    kind = "tool";
    const st = runningTool.state as { input?: unknown; time?: { start?: number } };
    label = runningTool.tool || "tool";
    detail = preview(st?.input);
    startedAt = st?.time?.start;
  } else if (subagents > 0) {
    kind = "subagents";
    label = subagents === 1 ? "1 subagent al lavoro" : `${subagents} subagent al lavoro`;
  } else if (lastText && (lastText.text ?? "").trim()) {
    kind = "text";
    label = "scrivendo la risposta…";
  } else if (lastReasoning) {
    kind = "reasoning";
    label = "thinking…";
  } else {
    kind = "waiting";
    label = "in attesa del modello…";
  }

  // Stalled only when there is NO live work AND we've been silent past the bar.
  const stalled = !hasLiveWork && silentFor >= STALL_AT;

  return { running: true, kind, label, detail, startedAt, subagents, silentFor, stalled };
}
