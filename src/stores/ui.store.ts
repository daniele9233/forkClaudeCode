import { create } from "zustand";

export type BottomTab = "terminal" | "files" | "diff" | "inspector" | "timeline";

interface UIState {
  bottomOpen: boolean;
  bottomTab: BottomTab;
  /** Height (px) of the bottom panel — user-resizable via the drag handle. */
  bottomHeight: number;
  /** Width (px) of the left sidebar — user-resizable (bigger = bigger brain). */
  sidebarWidth: number;
  /** Show the 3D neural brain panel. Off at launch (memory keeps running
   *  regardless via the always-mounted telemetry hook); toggled from the
   *  bottom-left button. Not persisted → always starts hidden. */
  brainVisible: boolean;
  commandPaletteOpen: boolean;
  settingsOpen: boolean;
  projectPickerOpen: boolean;
  /** Set when the running engine version doesn't match the pinned SDK. */
  engineWarning: string | null;
  engineWarningDismissed: boolean;

  openBottom: (tab: BottomTab) => void;
  closeBottom: () => void;
  setBottomTab: (tab: BottomTab) => void;
  setBottomHeight: (h: number) => void;
  setSidebarWidth: (w: number) => void;
  toggleBrain: () => void;
  toggleTerminal: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  openProjectPicker: () => void;
  closeProjectPicker: () => void;
  setEngineWarning: (msg: string | null) => void;
  dismissEngineWarning: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  bottomOpen: false,
  bottomTab: "terminal",
  bottomHeight: 340,
  sidebarWidth: 256,
  brainVisible: false,
  commandPaletteOpen: false,
  settingsOpen: false,
  projectPickerOpen: false,
  engineWarning: null,
  engineWarningDismissed: false,

  openBottom: (tab) => set({ bottomOpen: true, bottomTab: tab }),
  closeBottom: () => set({ bottomOpen: false }),
  setBottomTab: (tab) => set({ bottomTab: tab }),
  setBottomHeight: (h) => set({ bottomHeight: h }),
  setSidebarWidth: (w) => set({ sidebarWidth: w }),
  toggleBrain: () => set((s) => ({ brainVisible: !s.brainVisible })),
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
  openProjectPicker: () => set({ projectPickerOpen: true }),
  closeProjectPicker: () => set({ projectPickerOpen: false }),
  setEngineWarning: (msg) => set({ engineWarning: msg }),
  dismissEngineWarning: () => set({ engineWarningDismissed: true }),
}));
