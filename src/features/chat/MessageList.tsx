import { useEffect, useMemo, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { Message, Part } from "@opencode-ai/sdk/client";
import { useChatStore } from "@/stores/chat.store";
import { useSessionMessages } from "@/opencode/session";
import { rowInfo, createdAt } from "@/opencode/messageShape";
import { MessageBubble } from "./MessageBubble";

interface Props {
  sessionId: string;
  isRunning: boolean;
}

interface RenderItem {
  info: Message;
  parts: Part[];
  streaming: boolean;
}

export function MessageList({ sessionId, isRunning }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Stick to the bottom only while the user IS at the bottom: scrolling up to
  // re-read must not be hijacked by streaming updates.
  const stickToBottom = useRef(true);
  const reduce = useReducedMotion();
  const { data: messageRows, isLoading } = useSessionMessages(sessionId);
  const liveParts = useChatStore((s) => s.liveParts);
  const liveMessages = useChatStore((s) => s.liveMessages);

  // Stable Part[] per inner part-map: the store replaces only the touched
  // message's inner Map on update, so caching by that reference keeps every
  // OTHER bubble's `parts` prop identical → memoized bubbles skip re-render.
  const partsCache = useRef(new WeakMap<Map<string, Part>, Part[]>());

  // Merge fetched history with live (streaming) messages/parts so tokens render
  // the instant they arrive — without waiting for a network refetch.
  const items = useMemo((): RenderItem[] => {
    const cache = partsCache.current;
    const liveArr = (lp: Map<string, Part>): Part[] => {
      let arr = cache.get(lp);
      if (!arr) {
        arr = Array.from(lp.values());
        cache.set(lp, arr);
      }
      return arr;
    };

    const out: RenderItem[] = [];
    const seen = new Set<string>();

    for (const row of messageRows ?? []) {
      const info = rowInfo(row);
      if (!info) continue;
      seen.add(info.id);
      const lp = liveParts.get(info.id);
      const historic = ((row as { parts?: Part[] }).parts ?? []) as Part[];
      const live = liveMessages.get(info.id);
      out.push({
        info: live ?? info,
        parts: lp ? liveArr(lp) : historic,
        streaming: isRunning && lp !== undefined && (live ?? info).role === "assistant",
      });
    }

    // Live-only messages (a streaming reply not yet in the fetched history).
    // Filter by session: live traffic from OTHER sessions (subagents, hidden
    // kikkoCode sessions) must never leak into this chat.
    for (const [id, msg] of liveMessages) {
      if (!msg || seen.has(id)) continue;
      if (msg.sessionID !== sessionId) continue;
      const lp = liveParts.get(id);
      out.push({
        info: msg,
        parts: lp ? liveArr(lp) : [],
        streaming: isRunning && msg.role === "assistant",
      });
    }

    return out.sort((a, b) => createdAt(a.info) - createdAt(b.info));
  }, [messageRows, liveParts, liveMessages, isRunning, sessionId]);

  // Auto-scroll to bottom as content streams in — but only if the user was
  // already following the bottom (see stickToBottom).
  useEffect(() => {
    if (stickToBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [items]);

  // Re-stick when switching session (fresh conversation starts at the bottom).
  useEffect(() => {
    stickToBottom.current = true;
  }, [sessionId]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  if (isLoading && items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--muted-foreground)]">
        Loading…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <div className="text-4xl select-none">⚒️</div>
        <p className="text-sm text-[var(--muted-foreground)]">
          Type a message to start working with the agent.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex flex-1 flex-col gap-4 overflow-y-auto p-4"
    >
      {items.map(({ info, parts, streaming }) => (
        <motion.div
          key={info.id}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          <MessageBubble message={info} parts={parts} isStreaming={streaming} />
        </motion.div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
