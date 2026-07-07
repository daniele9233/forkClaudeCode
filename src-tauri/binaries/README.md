# Sidecar binaries — `opencode`

This directory holds the **bundled `opencode` engine** that kikkoCode ships as a
Tauri _sidecar_. `externalBin` is declared in the release-only overlay
`src-tauri/tauri.release.conf.json` (merged at build time with
`tauri build --config …`), **not** in the base `tauri.conf.json` — otherwise
`cargo check` and `pnpm tauri dev` would fail because Tauri validates that the
(uncommitted) binary exists. At runtime the Rust backend prefers this binary
(placed next to the app executable by the bundler) and falls back to `opencode`
on `PATH` for development — see `src-tauri/src/sidecar/mod.rs` (`opencode_bin()`).

## Naming convention (required by Tauri)

Tauri's `externalBin` expects each binary suffixed with the **Rust target
triple** of the build host/target:

| Platform      | File name                             |
| ------------- | ------------------------------------- |
| Windows (x64) | `opencode-x86_64-pc-windows-msvc.exe` |
| macOS (Apple) | `opencode-aarch64-apple-darwin`       |
| macOS (Intel) | `opencode-x86_64-apple-darwin`        |
| Linux (x64)   | `opencode-x86_64-unknown-linux-gnu`   |

Find your triple with: `rustc -Vv | grep host`.

## How to populate it

The actual binary is **not committed** (it is large and platform-specific — see
`.gitignore`). Fetch it from npm for your target before a bundle build — the
`opencode-<platform>` package ships `package/bin/opencode(.exe)` at an exact
version:

```bash
# Windows x64 (run from the repo root):
npm pack opencode-windows-x64@1.17.13        # -> opencode-windows-x64-1.17.13.tgz
tar -xzf opencode-windows-x64-1.17.13.tgz    # -> package/bin/opencode.exe
cp package/bin/opencode.exe \
   src-tauri/binaries/opencode-x86_64-pc-windows-msvc.exe
# other targets: opencode-darwin-arm64, opencode-darwin-x64, opencode-linux-x64
```

In CI this is done automatically by `.github/workflows/release.yml` before
`tauri build` (same `npm pack` approach). The engine version is **pinned** there
via the `OPENCODE_VERSION` env var — keep it in sync with the pinned
`@opencode-ai/sdk` in `package.json` so the GUI and the engine speak the same
API. At runtime the app also compares
`opencode --version` against the SDK and shows a non-blocking warning on a
mismatch (see `src/opencode/version.ts`).

> Dev mode (`pnpm tauri dev`) does **not** need a file here as long as
> `opencode` is installed and on your `PATH`.
