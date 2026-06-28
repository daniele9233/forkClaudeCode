import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Permission } from "@opencode-ai/sdk/client";

interface PermissionState {
  /** Permissions waiting for a user response, keyed by permission id. */
  pending: Map<string, Permission>;
  /** Permission types/patterns the user has said "always allow" to. */
  allowList: Set<string>;

  addPending: (p: Permission) => void;
  removePending: (id: string) => void;
  addToAllowList: (key: string) => void;
  removeFromAllowList: (key: string) => void;
  isAutoAllowed: (p: Permission) => boolean;
}

export const usePermissionStore = create<PermissionState>()(
  persist(
    (set, get) => ({
      pending: new Map(),
      allowList: new Set(),

      addPending: (p) =>
        set((s) => {
          const next = new Map(s.pending);
          next.set(p.id, p);
          return { pending: next };
        }),

      removePending: (id) =>
        set((s) => {
          const next = new Map(s.pending);
          next.delete(id);
          return { pending: next };
        }),

      addToAllowList: (key) =>
        set((s) => {
          const next = new Set(s.allowList);
          next.add(key);
          return { allowList: next };
        }),

      removeFromAllowList: (key) =>
        set((s) => {
          const next = new Set(s.allowList);
          next.delete(key);
          return { allowList: next };
        }),

      isAutoAllowed: (p: Permission) => {
        const { allowList } = get();
        // Check by type
        if (allowList.has(p.type)) return true;
        // Check by pattern (string or array)
        if (p.pattern) {
          const patterns = Array.isArray(p.pattern) ? p.pattern : [p.pattern];
          return patterns.some((pat) => allowList.has(pat));
        }
        return false;
      },
    }),
    {
      name: "kikkocode-permissions",
      // Only persist the allow-list — pending permissions are session-lived
      partialize: (s) => ({ allowList: s.allowList }),
      // Zustand persist doesn't handle Set natively — convert to/from array
      storage: {
        getItem: (name) => {
          const raw = localStorage.getItem(name);
          if (!raw) return null;
          const parsed = JSON.parse(raw);
          return {
            ...parsed,
            state: {
              ...parsed.state,
              allowList: new Set(parsed.state?.allowList ?? []),
            },
          };
        },
        setItem: (name, value) => {
          const serialized = {
            ...value,
            state: {
              ...value.state,
              allowList: Array.from((value.state.allowList as Set<string>) ?? []),
            },
          };
          localStorage.setItem(name, JSON.stringify(serialized));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    },
  ),
);
