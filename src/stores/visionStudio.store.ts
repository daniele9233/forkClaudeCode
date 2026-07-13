import { create } from "zustand";

/** Open/close state for the Vision Studio modal (image → awwwards site). */
interface VisionStudioState {
  open: boolean;
  openStudio: () => void;
  close: () => void;
}

export const useVisionStudio = create<VisionStudioState>((set) => ({
  open: false,
  openStudio: () => set({ open: true }),
  close: () => set({ open: false }),
}));
