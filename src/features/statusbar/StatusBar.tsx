import { useMemo } from "react";
import { Zap, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/stores/session.store";
import { useSessionMessages } from "@/opencode/session";
import { useContextMessages, useProviders } from "@/opencode/context";
import { useChatStore } from "@/stores/chat.store";
import type { AssistantMessage } from "@opencode-ai/sdk/client";

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(Math.round(n));
}

function fmtCost(c: number): string {
  if (c === 0) return "$0.00";
  if (c < 0.0001) return `$${c.toFixed(5)}`;
  if (c < 0.01) return `$${c.toFixed(4)}`;
  return `$${c.toFixed(3)}`;
}

export function StatusBar() {
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const { data: sessionMsgsData = [] } = useSessionMessages(activeSessionId);
  const liveMessages = useChatStore((s) => s.liveMessages);
  const { data: contextEntries = [] } = useContextMessages(activeSessionId);
  const { data: providers = [] } = useProviders();

  const assistantMsgs = useMemo((): AssistantMessage[] => {
    const byId = new Map<string, AssistantMessage>();
    for (const { info } of sessionMsgsData) {
      if (info.role === "assistant") byId.set(info.id, info as AssistantMessage);
    }
    for (const [id, msg] of liveMessages) {
      if (msg.role === "assistant") byId.set(id, msg as AssistantMessage);
    }
    return Array.from(byId.values()).sort((a, b) => a.time.created - b.time.created);
  }, [sessionMsgsData, liveMessages]);

  const totalCost = useMemo(
    () => assistantMsgs.reduce((acc, m) => acc + m.cost, 0),
    [assistantMsgs],
  );

  const lastMsg = assistantMsgs[assistantMsgs.length - 1];
  const currentContextTokens = lastMsg?.tokens.input ?? 0;

  const provider = providers.find((p) => p.id === lastMsg?.providerID);
  const model = lastMsg ? provider?.models[lastMsg.modelID] : undefined;
  const contextLimit = model?.limit.context ?? 0;
  const pct =
    contextLimit > 0 ? Math.min(100, (currentContextTokens / contextLimit) * 100) : 0;

  const meterColor =
    pct > 85 ? "bg-red-500" : pct > 65 ? "bg-amber-500" : "bg-[var(--primary)]";

  const textColor =
    pct > 85
      ? "text-red-400"
      : pct > 65
        ? "text-amber-400"
        : "text-[var(--muted-foreground)]";

  if (!activeSessionId) {
    return (
      <div className="flex h-6 shrink-0 items-center border-t border-[var(--border)] px-3">
        <span className="text-[10px] text-[var(--muted-foreground)]/40">
          No active session
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-6 shrink-0 items-center gap-3 border-t border-[var(--border)] bg-[var(--background)] px-3">
      {/* Context meter */}
      {contextLimit > 0 && (
        <div className="flex items-center gap-1.5">
          <div className="relative h-1.5 w-20 overflow-hidden rounded-full bg-[var(--muted)]">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                meterColor,
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={cn("font-mono text-[9px]", textColor)}>{pct.toFixed(0)}%</span>
          <span className="text-[9px] text-[var(--muted-foreground)]">
            {fmtNum(currentContextTokens)}/{fmtNum(contextLimit)}
          </span>
        </div>
      )}

      {contextLimit > 0 && (
        <span className="text-[var(--muted-foreground)]/30 text-[9px]">|</span>
      )}

      {/* Token count for this session */}
      <div className="flex items-center gap-1">
        <Zap className="h-2.5 w-2.5 text-[var(--muted-foreground)]/60" />
        <span className="font-mono text-[9px] text-[var(--muted-foreground)]">
          {contextEntries.length > 0
            ? `${contextEntries.length} msgs in ctx`
            : assistantMsgs.length > 0
              ? `${assistantMsgs.length} step${assistantMsgs.length !== 1 ? "s" : ""}`
              : "—"}
        </span>
      </div>

      {/* Separator */}
      <span className="text-[var(--muted-foreground)]/30 text-[9px]">|</span>

      {/* Cost meter */}
      <div className="flex items-center gap-1">
        <DollarSign className="h-2.5 w-2.5 text-[var(--muted-foreground)]/60" />
        <span
          className={cn(
            "font-mono text-[9px]",
            totalCost > 0.5
              ? "text-amber-400"
              : totalCost > 0.1
                ? "text-[var(--foreground)]"
                : "text-[var(--muted-foreground)]",
          )}
        >
          {fmtCost(totalCost)}
        </span>
      </div>

      {/* Model pill at the right */}
      {lastMsg && (
        <>
          <span className="ml-auto text-[9px] text-[var(--muted-foreground)]/50">
            {lastMsg.providerID}/{lastMsg.modelID}
          </span>
        </>
      )}
    </div>
  );
}
