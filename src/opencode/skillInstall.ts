import { invoke } from "@tauri-apps/api/core";

/**
 * Install real engine skills from a git repo into `~/.claude/skills` (the
 * directory the engine scans). Returns the names of the installed skills. The
 * caller should restart the engine afterwards so it rescans.
 */
export async function installSkillRepo(url: string): Promise<string[]> {
  return invoke<string[]>("install_skill_repo", { url });
}

/** Names of the skills currently installed in `~/.claude/skills`. */
export async function listInstalledSkills(): Promise<string[]> {
  return invoke<string[]>("list_installed_skills");
}

/** Remove an installed skill folder by name. */
export async function removeInstalledSkill(name: string): Promise<void> {
  await invoke("remove_installed_skill", { name });
}

/** Restart the engine so it rescans the skills directory (best-effort). */
export async function restartEngine(): Promise<void> {
  await invoke("restart_opencode");
}
