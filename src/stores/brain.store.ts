import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * The neural brain's MEMORY — real, persisted telemetry of what the agent has
 * actually done on this machine (like Obsidian's graph growing with your
 * notes). Each counter maps to a cortex region: the region's neuron count
 * grows with lifetime activity and its HUD label shows the real number.
 *
 *   edits    → MOTOR CORTEX   (files written by the agent)
 *   reads    → SENSORY CORTEX (file-watcher activity, project reads)
 *   replies  → LANGUAGE       (assistant streaming updates)
 *   runs     → HIPPOCAMPUS    (tasks executed = memories formed)
 *   prompts  → CONCEPT LAYER  (your asks)
 */
export type BrainMetric = "edits" | "reads" | "replies" | "runs" | "prompts";

interface BrainState {
  counts: Record<BrainMetric, number>;
  bump: (k: BrainMetric, n?: number) => void;
}

export const useBrainStore = create<BrainState>()(
  persist(
    (set) => ({
      counts: { edits: 0, reads: 0, replies: 0, runs: 0, prompts: 0 },
      bump: (k, n = 1) => set((s) => ({ counts: { ...s.counts, [k]: s.counts[k] + n } })),
    }),
    { name: "kikkocode-brain" },
  ),
);
