import { create } from "zustand";

/** Open/close state for the Skill Marketplace modal (install real engine skills). */
interface SkillMarketplaceState {
  open: boolean;
  openMarket: () => void;
  close: () => void;
}

export const useSkillMarketplace = create<SkillMarketplaceState>((set) => ({
  open: false,
  openMarket: () => set({ open: true }),
  close: () => set({ open: false }),
}));
