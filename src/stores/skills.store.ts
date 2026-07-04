import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SKILLS, type Skill } from "@/skills/catalog";

/** How many further turns a matched skill stays "warm" (sticky) after firing. */
const STICKY_TURNS = 3;

interface SkillsState {
  /** Enabled skill ids (candidates for auto-apply / manual use). */
  enabled: string[];
  /** When true, the best-matching enabled skill(s) are auto-applied on send. */
  autoApply: boolean;
  /** When true, a senior front-end directive is prepended to every web prompt. */
  webDesigner: boolean;
  /** User-imported skills (from GitHub raw URLs) — merged with the catalog. */
  custom: Skill[];
  /** Skills the user locked ON for the whole session (survive keyword changes). */
  pinned: string[];
  /** Recently-fired skills → remaining warm turns. Persisted-out (runtime only). */
  sticky: Record<string, number>;
  setEnabled: (id: string, on: boolean) => void;
  setAutoApply: (on: boolean) => void;
  setWebDesigner: (on: boolean) => void;
  isEnabled: (id: string) => boolean;
  addCustom: (skill: Skill) => void;
  removeCustom: (id: string) => void;
  togglePin: (id: string) => void;
  isPinned: (id: string) => boolean;
  /** After a send: refresh the just-matched skills to full warmth, decay the rest. */
  noteActivated: (ids: string[]) => void;
  /** Forget all sticky (warm) skills — the "reset context" action. */
  clearSticky: () => void;
}

export const useSkillsStore = create<SkillsState>()(
  persist(
    (set, get) => ({
      // Everything on by default so the router just works out of the box.
      enabled: SKILLS.map((s) => s.id),
      autoApply: true,
      webDesigner: true,
      custom: [],
      pinned: [],
      sticky: {},
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
          pinned: s.pinned.filter((x) => x !== id),
        })),
      togglePin: (id) =>
        set((s) => ({
          pinned: s.pinned.includes(id)
            ? s.pinned.filter((x) => x !== id)
            : [...s.pinned, id],
        })),
      isPinned: (id) => get().pinned.includes(id),
      noteActivated: (ids) =>
        set((s) => {
          const next: Record<string, number> = {};
          // Decay everything currently warm by one turn.
          for (const [id, t] of Object.entries(s.sticky)) {
            if (t - 1 > 0) next[id] = t - 1;
          }
          // Refresh the skills that fired this turn to full warmth.
          for (const id of ids) next[id] = STICKY_TURNS;
          return { sticky: next };
        }),
      clearSticky: () => set({ sticky: {} }),
    }),
    {
      name: "kikkocode-skills",
      // Sticky warmth is runtime-only — don't persist it across restarts.
      partialize: (s) => ({
        enabled: s.enabled,
        autoApply: s.autoApply,
        webDesigner: s.webDesigner,
        custom: s.custom,
        pinned: s.pinned,
      }),
    },
  ),
);
