import { create } from "zustand";

export type BottomTab = "terminal" | "diff" | "inspector" | "timeline";

interface UIState {
  bottomOpen: boolean;
  bottomTab: BottomTab;
  commandPaletteOpen: boolean;
  settingsOpen: boolean;
  /** Set when the running engine version doesn't match the pinned SDK. */
  engineWarning: string | null;
  engineWarningDismissed: boolean;

  openBottom: (tab: BottomTab) => void;
  closeBottom: () => void;
  setBottomTab: (tab: BottomTab) => void;
  toggleTerminal: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  setEngineWarning: (msg: string | null) => void;
  dismissEngineWarning: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  bottomOpen: false,
  bottomTab: "terminal",
  commandPaletteOpen: false,
  settingsOpen: false,
  engineWarning: null,
  engineWarningDismissed: false,

  openBottom: (tab) => set({ bottomOpen: true, bottomTab: tab }),
  closeBottom: () => set({ bottomOpen: false }),
  setBottomTab: (tab) => set({ bottomTab: tab }),
  toggleTerminal: () => {
    const { bottomOpen, bottomTab } = get();
    if (bottomOpen && bottomTab === "terminal") {
      set({ bottomOpen: false });
    } else {
      set({ bottomOpen: true, bottomTab: "terminal" });
    }
  },
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  setEngineWarning: (msg) => set({ engineWarning: msg }),
  dismissEngineWarning: () => set({ engineWarningDismissed: true }),
}));
