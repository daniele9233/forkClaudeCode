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
 *
 * ROLES + AUTO-ROUTING: the user can assign one model to the DESIGN role
 * (Claude / a multimodal model for front-end & visual work) and one to the
 * CODING role (e.g. zai/glm-5.2, deepseek). With `autoRoute` on, every prompt
 * is classified and sent to the right model automatically; the manual
 * selection stays as the fallback for unassigned roles.
 */
export type ModelRole = "design" | "coding";

interface ModelState {
  /** "provider/model" chosen by the user, or null (engine default). */
  selected: string | null;
  /** Per-role assignments ("provider/model"), used when autoRoute is on. */
  roles: Record<ModelRole, string | null>;
  /** Route design prompts to roles.design and the rest to roles.coding. */
  autoRoute: boolean;
  setSelected: (m: string | null) => void;
  setRole: (role: ModelRole, m: string | null) => void;
  setAutoRoute: (on: boolean) => void;
}

export const useModelStore = create<ModelState>()(
  persist(
    (set) => ({
      selected: null,
      roles: { design: null, coding: null },
      autoRoute: false,
      setSelected: (m) => set({ selected: m }),
      setRole: (role, m) => set((s) => ({ roles: { ...s.roles, [role]: m } })),
      setAutoRoute: (on) => set({ autoRoute: on }),
    }),
    { name: "kikkocode-model" },
  ),
);

/**
 * The model to use for a task of the given kind: the role's model when
 * auto-routing is on and assigned, else the manual selection (null = engine
 * default). For use outside React render (send paths, audits).
 */
export function modelForRole(kind: ModelRole): string | null {
  const { autoRoute, roles, selected } = useModelStore.getState();
  if (autoRoute && roles[kind]) return roles[kind];
  return selected;
}

/** Split "provider/model" (model ids may contain slashes) into prompt params. */
export function splitModel(sel: string): {
  providerID?: string;
  modelID?: string;
} {
  const slash = sel.indexOf("/");
  if (slash <= 0) return {};
  return { providerID: sel.slice(0, slash), modelID: sel.slice(slash + 1) };
}
