import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * GitHub connection — a Personal Access Token used to list your repositories
 * and clone private ones. Stored locally (this is a local-first desktop app);
 * it never leaves your machine except in requests to api.github.com / the git
 * clone. Create one at https://github.com/settings/tokens with `repo` scope.
 */
interface GithubState {
  token: string | null;
  setToken: (token: string | null) => void;
}

export const useGithubStore = create<GithubState>()(
  persist(
    (set) => ({
      token: null,
      setToken: (token) => set({ token: token && token.trim() ? token.trim() : null }),
    }),
    { name: "kikkocode-github" },
  ),
);
