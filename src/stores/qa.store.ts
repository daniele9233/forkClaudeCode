import { create } from "zustand";

/** One accessibility/QA finding reported by the in-page auditor. */
export interface QAFinding {
  rule: string;
  message: string;
  selector?: string;
}

interface QAState {
  findings: QAFinding[];
  /** True while a scan is in flight (waiting for the iframe to answer). */
  scanning: boolean;
  /** Whether the QA drawer is open. */
  open: boolean;
  /** True once a scan has completed at least once (to show "0 issues"). */
  ran: boolean;
  setScanning: (v: boolean) => void;
  setFindings: (f: QAFinding[]) => void;
  toggleOpen: () => void;
  clear: () => void;
}

export const useQAStore = create<QAState>((set) => ({
  findings: [],
  scanning: false,
  open: false,
  ran: false,
  setScanning: (v) => set({ scanning: v }),
  setFindings: (f) => set({ findings: f, scanning: false, ran: true, open: true }),
  toggleOpen: () => set((s) => ({ open: !s.open })),
  clear: () => set({ findings: [], ran: false, open: false }),
}));
