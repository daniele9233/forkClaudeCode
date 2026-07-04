import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SKILLS, type Skill } from "@/skills/catalog";

interface SkillsState {
  /** Enabled skill ids (candidates for auto-apply / manual use). */
  enabled: string[];
  /** When true, the best-matching enabled skill(s) are auto-applied on send. */
  autoApply: boolean;
  /** When true, a senior front-end directive is prepended to every web prompt. */
  webDesigner: boolean;
  /** User-imported skills (from GitHub raw URLs) — merged with the catalog. */
  custom: Skill[];
  setEnabled: (id: string, on: boolean) => void;
  setAutoApply: (on: boolean) => void;
  setWebDesigner: (on: boolean) => void;
  isEnabled: (id: string) => boolean;
  addCustom: (skill: Skill) => void;
  removeCustom: (id: string) => void;
}

export const useSkillsStore = create<SkillsState>()(
  persist(
    (set, get) => ({
      // Everything on by default so the router just works out of the box.
      enabled: SKILLS.map((s) => s.id),
      autoApply: true,
      webDesigner: true,
      custom: [],
      setEnabled: (id, on) =>
        set((s) => ({
          enabled: on
            ? Array.from(new Set([...s.enabled, id]))
            : s.enabled.filter((x) => x !== id),
        })),
      setAutoApply: (on) => set({ autoApply: on }),
      setWebDesigner: (on) => set({ webDesigner: on }),
      isEnabled: (id) => get().enabled.includes(id),
      addCustom: (skill) =>
        set((s) => ({
          // Replace any previous import with the same id, enable it right away.
          custom: [...s.custom.filter((c) => c.id !== skill.id), skill],
          enabled: Array.from(new Set([...s.enabled, skill.id])),
        })),
      removeCustom: (id) =>
        set((s) => ({
          custom: s.custom.filter((c) => c.id !== id),
          enabled: s.enabled.filter((x) => x !== id),
        })),
    }),
    { name: "kikkocode-skills" },
  ),
);
