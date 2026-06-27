import { invoke } from "@tauri-apps/api/core";

/**
 * Expected engine version — must track the pinned `@opencode-ai/sdk` in
 * package.json (compared at major.minor granularity). Bump both together.
 */
export const PINNED_SDK_VERSION = "0.15.31";
export const EXPECTED_ENGINE_MAJOR_MINOR = "0.15";

export interface EngineVersionInfo {
  /** Raw string from `opencode --version`. */
  engine: string;
  engineMajorMinor: string | null;
  expected: string;
  /** True when engine major.minor matches the pinned SDK. */
  ok: boolean;
}

function majorMinor(v: string): string | null {
  const m = v.match(/(\d+)\.(\d+)(?:\.\d+)?/);
  return m ? `${m[1]}.${m[2]}` : null;
}

/**
 * Ask the backend for the engine version and compare it to the SDK we built
 * against. Never throws — on any failure it returns `ok: true` so we don't nag
 * the user about something we couldn't actually determine.
 */
export async function checkEngineVersion(): Promise<EngineVersionInfo> {
  let engine = "";
  try {
    engine = (await invoke<string>("opencode_version")) ?? "";
  } catch {
    return {
      engine: "unknown",
      engineMajorMinor: null,
      expected: EXPECTED_ENGINE_MAJOR_MINOR,
      ok: true,
    };
  }
  const mm = majorMinor(engine);
  return {
    engine,
    engineMajorMinor: mm,
    expected: EXPECTED_ENGINE_MAJOR_MINOR,
    // If we can't parse a version, don't warn (avoid false positives).
    ok: mm === null || mm === EXPECTED_ENGINE_MAJOR_MINOR,
  };
}
