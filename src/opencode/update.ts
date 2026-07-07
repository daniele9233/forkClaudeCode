import { getVersion } from "@tauri-apps/api/app";

/**
 * Lightweight, key-free auto-update check. kikkoCode asks GitHub for the latest
 * published release, compares it to the running app version, and (if newer)
 * surfaces a banner that opens the installer. No Tauri updater signing key is
 * required, and any failure is swallowed — the check can never crash the app.
 */
const REPO = "daniele9233/forkClaudeCode";

export interface UpdateInfo {
  /** Latest published version, e.g. "0.2.0". */
  version: string;
  /** The version currently running. */
  currentVersion: string;
  /** Release page (fallback target / changelog). */
  notesUrl: string;
  /** Direct installer download (.exe preferred, else .msi), if present. */
  installerUrl?: string;
}

type Semver = [number, number, number];

function parseSemver(v: string): Semver | null {
  const m = v.match(/(\d+)\.(\d+)\.(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** True when `candidate` is a strictly higher version than `current`. */
export function isNewerVersion(candidate: string, current: string): boolean {
  const a = parseSemver(candidate);
  const b = parseSemver(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}

interface GithubAsset {
  name?: string;
  browser_download_url?: string;
}

/** Pick the Windows installer asset (.exe setup first, then .msi). */
export function pickInstaller(assets: GithubAsset[]): string | undefined {
  const exe = assets.find((a) => /\.exe$/i.test(a?.name ?? ""));
  const msi = assets.find((a) => /\.msi$/i.test(a?.name ?? ""));
  return exe?.browser_download_url ?? msi?.browser_download_url;
}

/**
 * Check GitHub for a newer release. Returns `null` when up to date or on any
 * error (offline, rate-limited, malformed) — never throws.
 */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  let currentVersion = "";
  try {
    currentVersion = await getVersion();
  } catch {
    return null; // not running under Tauri (e.g. plain Vite dev) — skip.
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      tag_name?: string;
      html_url?: string;
      assets?: GithubAsset[];
    };
    const version = String(data.tag_name ?? "").replace(/^v/, "");
    if (!version || !isNewerVersion(version, currentVersion)) return null;
    return {
      version,
      currentVersion,
      notesUrl: data.html_url ?? `https://github.com/${REPO}/releases/latest`,
      installerUrl: pickInstaller(data.assets ?? []),
    };
  } catch {
    return null;
  }
}
