import { invoke } from "@tauri-apps/api/core";

/**
 * The `@opencode-ai/sdk` version this app is built against. Note that the SDK
 * (npm, 0.x) and the opencode server/CLI (1.x) are versioned **independently**,
 * so we deliberately do NOT compare them for equality — that would false-warn
 * on every install. We only surface a warning if we ever detect a server whose
 * version scheme regresses *below* a known-good floor.
 */
export const PINNED_SDK_VERSION = "0.15.31";

/**
 * Lowest opencode server major version this build is known to talk to. The SDK
 * 0.15.x line targets the opencode 1.x HTTP API; anything older predates it.
 */
export const MIN_ENGINE_MAJOR = 1;

export interface EngineVersionInfo {
  /** Raw string from `opencode --version`. */
  engine: string;
  engineMajor: number | null;
  /** True when the engine looks compatible (or we couldn't determine it). */
  ok: boolean;
}

function majorOf(v: string): number | null {
  const m = v.match(/(\d+)\.(\d+)(?:\.\d+)?/);
  return m ? Number(m[1]) : null;
}

/**
 * Ask the backend for the engine version. Never throws — on any failure (or an
 * unparseable / clearly-compatible version) it returns `ok: true` so we don't
 * nag the user about something we couldn't actually determine. We only flag a
 * genuinely *older* engine that predates the API this SDK expects.
 */
export async function checkEngineVersion(): Promise<EngineVersionInfo> {
  let engine = "";
  try {
    engine = (await invoke<string>("opencode_version")) ?? "";
  } catch {
    return { engine: "unknown", engineMajor: null, ok: true };
  }
  const major = majorOf(engine);
  return {
    engine,
    engineMajor: major,
    // Only warn when we can read a major version AND it's below the floor.
    ok: major === null || major >= MIN_ENGINE_MAJOR,
  };
}
