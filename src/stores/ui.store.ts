import { create } from "zustand";

export type BottomTab = "terminal" | "diff" | "inspector" | "timeline";

interface UIState {
  bottomOpen: boolean;
  bottomTab: BottomTab;
  commandPaletteOpen: boolean;
  settingsOpen: boolean;

  openBottom: (tab: BottomTab) => void;
  closeBottom: () => void;
  setBottomTab: (tab: BottomTab) => void;
  toggleTerminal: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  openSettings: () => void;
  closeSettings: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  bottomOpen: false,
  bottomTab: "terminal",
  commandPaletteOpen: false,
  settingsOpen: false,

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
}));
