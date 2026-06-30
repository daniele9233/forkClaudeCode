import { useMemo } from "react";
import type { AssistantMessage } from "@opencode-ai/sdk/client";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/stores/session.store";
import { useSessionMessages } from "@/opencode/session";
import { useChatStore } from "@/stores/chat.store";
import { useContextMessages, useProviders } from "@/opencode/context";
import { rowInfo, isAssistant, createdAt } from "@/opencode/messageShape";

/* ── helpers ───────────────────────────────────────────────────── */

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(Math.round(n));
}

function fmtCost(c: number): string {
  if (c === 0) return "$0.00";
  if (c < 0.0001) return `$${c.toFixed(6)}`;
  if (c < 0.01) return `$${c.toFixed(4)}`;
  return `$${c.toFixed(4)}`;
}

const ROLE_META: Record<string, { label: string; color: string }> = {
  user: { label: "User", color: "bg-blue-500" },
  assistant: { label: "Assistant", color: "bg-[var(--primary)]" },
  system: { label: "System", color: "bg-purple-500" },
  tool: { label: "Tool results", color: "bg-green-500" },
  summary: { label: "Compaction", color: "bg-amber-500" },
};

function roleMeta(role: string) {
  return ROLE_META[role] ?? { label: role, color: "bg-slate-500" };
}

/* ── sub-components ─────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="hud-label mb-1.5">{children}</p>;
}

function StatCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-wide text-[var(--muted-foreground)]">
        {label}
      </span>
      <span
        className={cn("font-mono text-xs font-medium", accent && "text-[var(--primary)]")}
      >
        {value}
      </span>
    </div>
  );
}

/* ── main panel ─────────────────────────────────────────────────── */

export function ContextInspectorPanel() {
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const { data: sessionMsgsData = [] } = useSessionMessages(activeSessionId);
  const liveMessages = useChatStore((s) => s.liveMessages);
  const { data: contextEntries = [] } = useContextMessages(activeSessionId);
  const { data: providers = [] } = useProviders();

  /* Merge historical + live assistant messages */
  const assistantMsgs = useMemo((): AssistantMessage[] => {
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

  /* Aggregate session totals (tolerant of missing token fields) */
  const totals = useMemo(
    () =>
      assistantMsgs.reduce(
        (acc, msg) => ({
          input: acc.input + (msg.tokens?.input ?? 0),
          output: acc.output + (msg.tokens?.output ?? 0),
          reasoning: acc.reasoning + (msg.tokens?.reasoning ?? 0),
          cacheRead: acc.cacheRead + (msg.tokens?.cache?.read ?? 0),
          cacheWrite: acc.cacheWrite + (msg.tokens?.cache?.write ?? 0),
          cost: acc.cost + (msg.cost ?? 0),
        }),
        { input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0, cost: 0 },
      ),
    [assistantMsgs],
  );

  /* Last message → proxy for current context window usage */
  const lastMsg = assistantMsgs[assistantMsgs.length - 1];
  const currentContextTokens = lastMsg?.tokens?.input ?? 0;

  /* Model context limit */
  const provider = providers.find((p) => p.id === lastMsg?.providerID);
  const model = lastMsg ? provider?.models?.[lastMsg.modelID] : undefined;
  const contextLimit = model?.limit?.context ?? 0;
  const pct =
    contextLimit > 0 ? Math.min(100, (currentContextTokens / contextLimit) * 100) : 0;

  /* Context message breakdown */
  const breakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of contextEntries) {
      const role = entry?.info?.role ?? "unknown";
      counts.set(role, (counts.get(role) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [contextEntries]);

  if (!activeSessionId) {
    return (
      <div className="flex h-full items-center justify-center text-[11px] text-[var(--muted-foreground)]">
        No active session
      </div>
    );
  }

  /* colour the meter based on fill level */
  const meterColor =
    pct > 85 ? "bg-red-500" : pct > 65 ? "bg-amber-500" : "bg-[var(--primary)]";

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-3">
      {/* ── Context Window Meter ── */}
      <section>
        <SectionLabel>Context window</SectionLabel>

        {contextLimit === 0 ? (
          <p className="text-[11px] text-[var(--muted-foreground)]">
            {lastMsg
              ? "Model limit unknown — send a prompt to detect"
              : "Send a prompt to see context usage"}
          </p>
        ) : (
          <>
            <div className="relative h-2 overflow-hidden rounded-full bg-[var(--muted)]">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  meterColor,
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-baseline justify-between font-mono text-[10px]">
              <span
                className={cn(
                  "font-semibold",
                  pct > 85
                    ? "text-red-400"
                    : pct > 65
                      ? "text-amber-400"
                      : "text-[var(--foreground)]",
                )}
              >
                {pct.toFixed(0)}%
              </span>
              <span className="text-[var(--muted-foreground)]">
                {fmtNum(currentContextTokens)} / {fmtNum(contextLimit)} tokens
              </span>
            </div>
            {lastMsg && (
              <p className="mt-0.5 text-[9px] text-[var(--muted-foreground)]">
                Model: {lastMsg.providerID}/{lastMsg.modelID}
              </p>
            )}
          </>
        )}
      </section>

      {/* ── Session Token & Cost Totals ── */}
      <section>
        <SectionLabel>Session totals</SectionLabel>
        <div className="grid grid-cols-3 gap-x-3 gap-y-2">
          <StatCell label="Input" value={fmtNum(totals.input)} />
          <StatCell label="Output" value={fmtNum(totals.output)} />
          <StatCell label="Reasoning" value={fmtNum(totals.reasoning)} />
          <StatCell label="Cache read" value={fmtNum(totals.cacheRead)} />
          <StatCell label="Cache write" value={fmtNum(totals.cacheWrite)} />
          <StatCell label="Cost" value={fmtCost(totals.cost)} accent />
        </div>
        {assistantMsgs.length > 0 && (
          <p className="mt-2 text-[9px] text-[var(--muted-foreground)]">
            {assistantMsgs.length} agent step{assistantMsgs.length !== 1 ? "s" : ""}
          </p>
        )}
      </section>

      {/* ── Context Message Breakdown ── */}
      <section>
        <SectionLabel>
          In context
          {contextEntries.length > 0 && (
            <span className="ml-1 font-normal normal-case tracking-normal text-[var(--foreground)]">
              ({contextEntries.length})
            </span>
          )}
        </SectionLabel>

        {contextEntries.length === 0 ? (
          <p className="text-[11px] text-[var(--muted-foreground)]">
            {activeSessionId ? "No messages yet" : "—"}
          </p>
        ) : (
          <div className="space-y-1.5">
            {breakdown.map(([role, count]) => {
              const { label, color } = roleMeta(role);
              const share =
                contextEntries.length > 0 ? (count / contextEntries.length) * 100 : 0;
              return (
                <div key={role} className="flex items-center gap-2">
                  <div
                    className={cn("shrink-0 rounded-full", color)}
                    style={{ width: `${Math.max(share * 0.8, 4)}px`, height: "6px" }}
                  />
                  <span className="min-w-0 flex-1 text-[11px] text-[var(--foreground)]">
                    {label}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-[var(--muted-foreground)]">
                    ×{count}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
