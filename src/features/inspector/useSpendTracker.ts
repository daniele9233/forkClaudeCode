import { useEffect, useRef } from "react";
import { useChatStore } from "@/stores/chat.store";
import { useSpendStore } from "@/stores/spend.store";
import { isAssistant } from "@/opencode/messageShape";

/**
 * Accumulates REAL per-model spend from live streaming activity. Mount once.
 *
 * It watches the live (streaming) assistant messages and, per message id,
 * records the last-seen cost/token totals; on each increase it adds the DELTA
 * to that model's lifetime bucket. Keying by id + tracking only forward deltas
 * means: no double counting during streaming, and historical messages loaded
 * from disk (which never appear in `liveMessages`) are never re-counted.
 */
export function useSpendTracker() {
  const live = useChatStore((s) => s.liveMessages);
  // messageId → last-seen { cost, in, out }. In-memory only (never persisted),
  // so a reopened old session can't retroactively double-count.
  const seen = useRef<Map<string, { c: number; i: number; o: number }>>(new Map());

  useEffect(() => {
    const add = useSpendStore.getState().add;
    for (const [id, msg] of live) {
      if (!isAssistant(msg)) continue;
      const providerID = msg.providerID;
      const modelID = msg.modelID;
      if (!providerID || !modelID) continue;
      const cost = msg.cost ?? 0;
      const tin = msg.tokens?.input ?? 0;
      const tout = msg.tokens?.output ?? 0;
      const prev = seen.current.get(id) ?? { c: 0, i: 0, o: 0 };
      if (cost > prev.c || tin > prev.i || tout > prev.o) {
        seen.current.set(id, { c: cost, i: tin, o: tout });
        add(`${providerID}/${modelID}`, cost - prev.c, tin - prev.i, tout - prev.o);
      }
    }
  }, [live]);
}
