import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * kikkoCode's OWN model selection ("provider/model"), persisted locally.
 *
 * Why it exists: the engine's `config.model` can be pinned by auth plugins
 * (e.g. a zai/GLM free-tier login) — `config.update({model})` gets accepted
 * but the effective value doesn't change. The per-prompt `model` parameter
 * ALWAYS wins in opencode, so kikkoCode keeps the user's choice here and
 * passes it on every prompt; the engine config is only a fallback.
 */
interface ModelState {
  /** "provider/model" chosen by the user, or null (engine default). */
  selected: string | null;
  setSelected: (m: string | null) => void;
}

export const useModelStore = create<ModelState>()(
  persist(
    (set) => ({
      selected: null,
      setSelected: (m) => set({ selected: m }),
    }),
    { name: "kikkocode-model" },
  ),
);

/** Split "provider/model" (model ids may contain slashes) into prompt params. */
export function splitModel(sel: string): {
  providerID?: string;
  modelID?: string;
} {
  const slash = sel.indexOf("/");
  if (slash <= 0) return {};
  return { providerID: sel.slice(0, slash), modelID: sel.slice(slash + 1) };
}
