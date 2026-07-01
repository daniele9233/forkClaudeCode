import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SKILLS } from "@/skills/catalog";

interface SkillsState {
  /** Enabled skill ids (candidates for auto-apply / manual use). */
  enabled: string[];
  /** When true, the best-matching enabled skill(s) are auto-applied on send. */
  autoApply: boolean;
  setEnabled: (id: string, on: boolean) => void;
  setAutoApply: (on: boolean) => void;
  isEnabled: (id: string) => boolean;
}

export const useSkillsStore = create<SkillsState>()(
  persist(
    (set, get) => ({
      // Everything on by default so the router just works out of the box.
      enabled: SKILLS.map((s) => s.id),
      autoApply: true,
      setEnabled: (id, on) =>
        set((s) => ({
          enabled: on
            ? Array.from(new Set([...s.enabled, id]))
            : s.enabled.filter((x) => x !== id),
        })),
      setAutoApply: (on) => set({ autoApply: on }),
      isEnabled: (id) => get().enabled.includes(id),
    }),
    { name: "kikkocode-skills" },
  ),
);
