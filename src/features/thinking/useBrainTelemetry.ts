import { useEffect, useRef } from "react";
import type { EventFileEdited, EventFileWatcherUpdated } from "@opencode-ai/sdk/client";
import { onEventType } from "@/opencode/events";
import { useBrainStore } from "@/stores/brain.store";
import { useChatStore } from "@/stores/chat.store";
import { useSessionStore } from "@/stores/session.store";

/**
 * The brain's MEMORY, decoupled from its VISUAL. Mount once (App): it keeps
 * accumulating the project's real telemetry — files written/read, replies,
 * runs, prompts — whether or not the 3D brain panel is shown. That's what lets
 * the brain stay "always active" as the mental schema while being hidden by
 * default. The NeuralBrain component only reads these counters to draw.
 */
export function useBrainTelemetry() {
  const bump = useBrainStore((s) => s.bump);
  const liveMessages = useChatStore((s) => s.liveMessages);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const running = useChatStore((s) =>
    activeSessionId ? s.runningSessions.has(activeSessionId) : false,
  );

  // Streamed replies → LANGUAGE.
  useEffect(() => {
    bump("replies");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMessages]);

  // A run STARTING forms a memory (HIPPOCAMPUS) + a prompt (CONCEPT).
  const wasRunning = useRef(false);
  useEffect(() => {
    if (running && !wasRunning.current) {
      bump("runs");
      bump("prompts");
    }
    wasRunning.current = running;
  }, [running, bump]);

  // Real file activity: agent writes → MOTOR, project churn → SENSORY.
  useEffect(() => {
    const unsubs = [
      onEventType<EventFileEdited>("file.edited", () => bump("edits")),
      onEventType<EventFileWatcherUpdated>("file.watcher.updated", () => bump("reads")),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, [bump]);
}
