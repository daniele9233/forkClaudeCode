import { create } from "zustand";

export type BottomTab = "terminal" | "diff" | "inspector";

interface UIState {
  /** Whether the bottom panel (terminal/diff) is open. */
  bottomOpen: boolean;
  /** Which tab the bottom panel is currently showing. */
  bottomTab: BottomTab;

  openBottom: (tab: BottomTab) => void;
  closeBottom: () => void;
  setBottomTab: (tab: BottomTab) => void;
  toggleTerminal: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  bottomOpen: false,
  bottomTab: "terminal",

  openBottom: (tab) => set({ bottomOpen: true, bottomTab: tab }),
  closeBottom: () => set({ bottomOpen: false }),
  setBottomTab: (tab) => set({ bottomTab: tab }),
  toggleTerminal: () => {
    const { bottomOpen, bottomTab } = get();
    // If terminal already showing, close it; otherwise open/switch to terminal.
    if (bottomOpen && bottomTab === "terminal") {
      set({ bottomOpen: false });
    } else {
      set({ bottomOpen: true, bottomTab: "terminal" });
    }
  },
}));
