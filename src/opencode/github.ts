/** Minimal GitHub REST helpers for the repo picker. */

export interface GithubRepo {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  description: string | null;
  cloneUrl: string;
  updatedAt: string;
}

interface RawRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  clone_url: string;
  updated_at: string;
}

/**
 * List the authenticated user's repositories (owner + collaborator + org),
 * newest first. Throws a helpful error on a bad/expired token.
 */
export async function listGithubRepos(token: string): Promise<GithubRepo[]> {
  const res = await fetch(
    "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member",
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
  if (res.status === 401) {
    throw new Error("GitHub rejected this token (401). Check it has the `repo` scope.");
  }
  if (!res.ok) {
    throw new Error(`GitHub API error ${res.status}`);
  }
  const data = (await res.json()) as RawRepo[];
  return data.map((r) => ({
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    private: r.private,
    description: r.description,
    cloneUrl: r.clone_url,
    updatedAt: r.updated_at,
  }));
}

/**
 * Build an authenticated clone URL so private repos clone without a separate
 * git credential prompt. Public repos work with the plain URL too.
 */
export function authedCloneUrl(cloneUrl: string, token: string): string {
  return cloneUrl.replace(/^https:\/\//, `https://${token}@`);
}
