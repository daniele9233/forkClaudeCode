import { invoke } from "@tauri-apps/api/core";

/**
 * The `@opencode-ai/sdk` version this app is built against. We bundle the
 * matching `opencode` engine build as a sidecar (see `OPENCODE_VERSION` in
 * `.github/workflows/release.yml`), so the engine and SDK share this version
 * stream — they are NOT independently versioned here.
 */
export const PINNED_SDK_VERSION = "1.17.13";

/**
 * Oldest engine version this build is known to talk to. We ship exactly this
 * engine, so normally the running version equals it; we only warn when a user
 * points us at an *older* external engine (via `OPENCODE_BASE_URL` or an
 * `opencode` on PATH) that predates the API this SDK expects. Keep in sync with
 * `OPENCODE_VERSION` in the release workflow.
 */
export const MIN_ENGINE_VERSION = "1.17.13";

type Semver = [number, number, number];

export interface EngineVersionInfo {
  /** Raw string from `opencode --version`. */
  engine: string;
  /** True when the engine looks compatible (or we couldn't determine it). */
  ok: boolean;
}

/** Parse the first `major.minor.patch` found in a version string. */
function parseSemver(v: string): Semver | null {
  const m = v.match(/(\d+)\.(\d+)\.(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** True when `a` is strictly older than `b`. */
function isOlder(a: Semver, b: Semver): boolean {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] < b[i];
  }
  return false;
}

/**
 * Should we warn about this engine version string against a floor? Pure and
 * exported for testing. We only warn when BOTH parse and the engine is strictly
 * older — never on an equal, newer, or unparseable version (so a bundled
 * 0.15.31 engine against a 0.15.31 floor never false-warns).
 */
export function engineIsOutdated(engine: string, floor = MIN_ENGINE_VERSION): boolean {
  const cur = parseSemver(engine);
  const min = parseSemver(floor);
  if (cur === null || min === null) return false;
  return isOlder(cur, min);
}

/**
 * Ask the backend for the engine version. Never throws — on any failure (or an
 * unparseable version) it returns `ok: true` so we don't nag the user about
 * something we couldn't actually determine. We only flag an engine that is
 * genuinely *older* than the one we bundle / were built against.
 */
export async function checkEngineVersion(): Promise<EngineVersionInfo> {
  let engine = "";
  try {
    engine = (await invoke<string>("opencode_version")) ?? "";
  } catch {
    return { engine: "unknown", ok: true };
  }
  return {
    engine,
    // Only warn when the running engine is strictly older than the floor.
    ok: !engineIsOutdated(engine),
  };
}
