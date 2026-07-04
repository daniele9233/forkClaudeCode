import { useEffect, useState } from "react";
import { useChatStore } from "@/stores/chat.store";

/**
 * Watches a running session for silence. Returns the number of whole seconds
 * since the last streaming activity (part/message tick) — or 0 when the session
 * isn't running. Lets the UI distinguish "still working" from "stuck/looping"
 * so the user is never left staring at a frozen "thinking" with no recourse.
 *
 * Ticks once a second ONLY while the session is running (no idle timers).
 */
export function useStallSeconds(sessionId: string | null): number {
  const running = useChatStore((s) =>
    sessionId ? s.runningSessions.has(sessionId) : false,
  );
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!sessionId || !running) {
      setSeconds(0);
      return;
    }
    const compute = () => {
      const last = useChatStore.getState().lastActivityAt.get(sessionId) ?? Date.now();
      setSeconds(Math.max(0, Math.floor((Date.now() - last) / 1000)));
    };
    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [sessionId, running]);

  return running ? seconds : 0;
}
