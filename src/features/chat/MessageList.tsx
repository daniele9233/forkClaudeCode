import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { Part } from "@opencode-ai/sdk/client";
import { useChatStore } from "@/stores/chat.store";
import { useSessionMessages } from "@/opencode/session";
import { MessageBubble } from "./MessageBubble";

interface Props {
  sessionId: string;
  isRunning: boolean;
}

export function MessageList({ sessionId, isRunning }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { data: messageRows, isLoading } = useSessionMessages(sessionId);
  const liveParts = useChatStore((s) => s.liveParts);
  const liveMessages = useChatStore((s) => s.liveMessages);

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageRows, liveParts]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--muted-foreground)]">
        Loading…
      </div>
    );
  }

  if (!messageRows || messageRows.length === 0) {
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
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      {messageRows.map(({ info, parts: historicParts }) => {
        // Prefer live (streaming) parts when available for this message
        const liveMsgParts = liveParts.get(info.id);
        const parts: Part[] = liveMsgParts
          ? Array.from(liveMsgParts.values())
          : historicParts;

        const liveMsg = liveMessages.get(info.id);
        const message = liveMsg ?? info;

        const msgIsStreaming =
          isRunning && liveMsgParts !== undefined && message.role === "assistant";

        return (
          <motion.div
            key={info.id}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <MessageBubble message={message} parts={parts} isStreaming={msgIsStreaming} />
          </motion.div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
