import { create } from "zustand";

export type AutopilotStatus =
  | "running"
  | "done" // agent declared the goal achieved
  | "budget" // stopped: cost cap reached
  | "max-iters" // stopped: iteration cap reached
  | "stopped"; // stopped by the user

interface AutopilotState {
  active: boolean;
  sessionId: string | null;
  goal: string;
  budgetUsd: number;
  maxIters: number;
  /** Iterations sent so far (1 = the initial goal prompt). */
  iter: number;
  /** Session cost baseline when the run started (USD). */
  baselineCost: number;
  /** Cost spent by this autopilot run so far (USD). */
  spent: number;
  status: AutopilotStatus | null;

  start: (p: {
    sessionId: string;
    goal: string;
    budgetUsd: number;
    maxIters: number;
    baselineCost: number;
  }) => void;
  bumpIter: () => void;
  setSpent: (usd: number) => void;
  finish: (status: AutopilotStatus) => void;
  /** Clear the finished banner. */
  dismiss: () => void;
}

export const useAutopilotStore = create<AutopilotState>((set) => ({
  active: false,
  sessionId: null,
  goal: "",
  budgetUsd: 1,
  maxIters: 10,
  iter: 0,
  baselineCost: 0,
  spent: 0,
  status: null,

  start: (p) =>
    set({
      active: true,
      sessionId: p.sessionId,
      goal: p.goal,
      budgetUsd: p.budgetUsd,
      maxIters: p.maxIters,
      iter: 1,
      baselineCost: p.baselineCost,
      spent: 0,
      status: "running",
    }),
  bumpIter: () => set((s) => ({ iter: s.iter + 1 })),
  setSpent: (usd) => set({ spent: usd }),
  finish: (status) => set({ active: false, status }),
  dismiss: () => set({ status: null, sessionId: null, goal: "" }),
}));
