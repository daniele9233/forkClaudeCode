import { create } from "zustand";
import { persist } from "zustand/middleware";

interface OnboardingState {
  /** True once the user has finished (or skipped) the first-run wizard. */
  completed: boolean;
  complete: () => void;
  /** Re-open the wizard on demand (e.g. from a "Show intro" action). */
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      completed: false,
      complete: () => set({ completed: true }),
      reset: () => set({ completed: false }),
    }),
    { name: "kikkocode-onboarding" },
  ),
);
