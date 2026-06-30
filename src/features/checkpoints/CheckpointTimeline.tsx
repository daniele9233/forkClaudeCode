import { useMemo, useState } from "react";
import { RotateCcw, RotateCw, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/stores/session.store";
import {
  useSessionMessages,
  useSession,
  useRevertSession,
  useUnrevertSession,
} from "@/opencode/session";
import { useChatStore } from "@/stores/chat.store";
import { rowInfo, isAssistant, createdAt } from "@/opencode/messageShape";
import type { AssistantMessage } from "@opencode-ai/sdk/client";

function fmtCost(c: number): string {
  if (c === 0) return "$0.00";
  if (c < 0.001) return `$${c.toFixed(5)}`;
  if (c < 0.01) return `$${c.toFixed(4)}`;
  return `$${c.toFixed(3)}`;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

function relTime(ts: number): string {
  const diff = Date.now() - ts * 1000;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export function CheckpointTimeline() {
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const { data: session } = useSession(activeSessionId);
  const { data: sessionMsgsData = [] } = useSessionMessages(activeSessionId);
  const liveMessages = useChatStore((s) => s.liveMessages);
  const revert = useRevertSession();
  const unrevert = useUnrevertSession();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const revertedMessageId = session?.revert?.messageID ?? null;

  const checkpoints = useMemo((): AssistantMessage[] => {
    const byId = new Map<string, AssistantMessage>();
    for (const row of sessionMsgsData) {
      const info = rowInfo(row);
      if (isAssistant(info)) byId.set(info.id, info);
    }
    for (const [id, msg] of liveMessages) {
      if (isAssistant(msg)) byId.set(id, msg);
    }
    return Array.from(byId.values()).sort((a, b) => createdAt(a) - createdAt(b));
  }, [sessionMsgsData, liveMessages]);

  if (!activeSessionId) {
    return (
      <div className="flex h-full items-center justify-center text-[11px] text-[var(--muted-foreground)]">
        No active session
      </div>
    );
  }

  const handleRevert = async (messageId: string) => {
    if (!activeSessionId) return;
    setPendingId(messageId);
    try {
      await revert.mutateAsync({ sessionId: activeSessionId, messageId });
    } finally {
      setPendingId(null);
    }
  };

  const handleUnrevert = async () => {
    if (!activeSessionId) return;
    setPendingId("unrevert");
    try {
      await unrevert.mutateAsync(activeSessionId);
    } finally {
      setPendingId(null);
    }
  };

  const isReverted = !!revertedMessageId;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Reverted state banner */}
      {isReverted && (
        <div className="flex shrink-0 items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          <span className="flex-1 text-[11px] text-amber-300">
            Session reverted — history truncated at checkpoint
          </span>
          <button
            onClick={handleUnrevert}
            disabled={pendingId === "unrevert"}
            className="flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-300 hover:bg-amber-500/30 disabled:opacity-50 transition-colors"
          >
            <RotateCw className="h-3 w-3" />
            Restore
          </button>
        </div>
      )}

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-3">
        {checkpoints.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <Clock className="h-8 w-8 text-[var(--muted-foreground)]/30" />
            <p className="hud-label">No checkpoints yet</p>
            <p className="text-[10px] text-[var(--muted-foreground)]/60">
              Each agent step creates a checkpoint you can rewind to
            </p>
          </div>
        ) : (
          <ol className="relative space-y-0 border-l border-[var(--border)]/50 pl-4">
            {checkpoints.map((msg, idx) => {
              const isCurrentRevert = msg.id === revertedMessageId;
              const isTruncated =
                isReverted &&
                idx >= checkpoints.findIndex((m) => m.id === revertedMessageId);
              const stepNum = idx + 1;
              const totalTokens = msg.tokens.input + msg.tokens.output;

              return (
                <li
                  key={msg.id}
                  className={cn(
                    "relative pb-4 last:pb-0",
                    isTruncated && !isCurrentRevert && "opacity-40",
                  )}
                >
                  {/* Timeline dot */}
                  <div
                    className={cn(
                      "absolute -left-[1.1rem] mt-0.5 h-3 w-3 rounded-full border-2",
                      isCurrentRevert
                        ? "border-amber-400 bg-amber-400/30"
                        : "border-[var(--border)] bg-[var(--background)]",
                    )}
                  />

                  <div className="rounded-sm border border-[var(--border)]/50 bg-[var(--muted)]/10 p-2.5 transition-colors hover:border-[var(--border)]">
                    {/* Header row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="hud-label">STEP {stepNum}</span>
                        {isCurrentRevert && (
                          <span className="rounded-sm bg-amber-500/20 px-1 font-mono text-[9px] uppercase text-amber-400">
                            reverted
                          </span>
                        )}
                      </div>
                      <span className="hud-mono shrink-0 text-[9px] uppercase text-[var(--muted-foreground)]">
                        {relTime(msg.time.created)}
                      </span>
                    </div>

                    {/* Stats row */}
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="font-mono text-[9px] text-[var(--muted-foreground)]">
                        {fmtTokens(totalTokens)} tok
                      </span>
                      <span className="text-[var(--muted-foreground)]/40">·</span>
                      <span className="font-mono text-[9px] text-[var(--muted-foreground)]">
                        {fmtCost(msg.cost)}
                      </span>
                      <span className="text-[var(--muted-foreground)]/40">·</span>
                      <span className="text-[9px] text-[var(--muted-foreground)]">
                        {msg.providerID}/{msg.modelID}
                      </span>
                    </div>

                    {/* Rewind button */}
                    {!isCurrentRevert && (
                      <button
                        onClick={() => handleRevert(msg.id)}
                        disabled={pendingId === msg.id}
                        className={cn(
                          "mt-2 flex items-center gap-1 rounded px-2 py-0.5 text-[10px] transition-colors",
                          "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
                          "disabled:opacity-50",
                        )}
                      >
                        <RotateCcw className="h-2.5 w-2.5" />
                        Rewind to here
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
