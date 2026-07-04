import { create } from "zustand";
import { persist } from "zustand/middleware";

/** A saved visual style — a reusable DESIGN.md distilled from a site you liked. */
export interface SavedStyle {
  id: string;
  name: string;
  /** The DESIGN.md-style spec (the actual reusable content). */
  spec: string;
  /** Accent hex pulled from the spec, for the card swatch. */
  accent: string;
  createdAt: number;
}

interface StylesState {
  styles: SavedStyle[];
  /** The style currently injected into every send (null = none). */
  activeId: string | null;
  addStyle: (name: string, spec: string) => string;
  renameStyle: (id: string, name: string) => void;
  removeStyle: (id: string) => void;
  setActive: (id: string | null) => void;
}

/** First hex color in the spec → card accent; fallback to a neutral violet. */
function pickAccent(spec: string): string {
  const m = spec.match(/#[0-9a-fA-F]{6}\b/);
  return m ? m[0] : "#8b5cf6";
}

export const useStylesStore = create<StylesState>()(
  persist(
    (set) => ({
      styles: [],
      activeId: null,
      addStyle: (name, spec) => {
        const id = `style-${Date.now().toString(36)}`;
        const style: SavedStyle = {
          id,
          name: name.trim() || "Stile senza nome",
          spec: spec.trim(),
          accent: pickAccent(spec),
          createdAt: Date.now(),
        };
        set((s) => ({ styles: [style, ...s.styles] }));
        return id;
      },
      renameStyle: (id, name) =>
        set((s) => ({
          styles: s.styles.map((x) => (x.id === id ? { ...x, name: name.trim() } : x)),
        })),
      removeStyle: (id) =>
        set((s) => ({
          styles: s.styles.filter((x) => x.id !== id),
          activeId: s.activeId === id ? null : s.activeId,
        })),
      setActive: (id) => set({ activeId: id }),
    }),
    { name: "kikkocode-styles" },
  ),
);

/** The active style, if any. */
export function getActiveStyle(): SavedStyle | undefined {
  const { styles, activeId } = useStylesStore.getState();
  return activeId ? styles.find((s) => s.id === activeId) : undefined;
}

/** SYSTEM-role directive for the active style, or null. */
export function activeStyleDirective(): string | null {
  const style = getActiveStyle();
  if (!style) return null;
  return `Build strictly to this SAVED DESIGN SYSTEM (reuse its exact visual language — palette, typography, spacing, components, motion). Do not drift from it:\n\n${style.spec}`;
}
