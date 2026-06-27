# Sidecar binaries — `opencode`

This directory holds the **bundled `opencode` engine** that Forgia ships as a
Tauri *sidecar* (`externalBin` in `tauri.conf.json`). At runtime the Rust
backend prefers this binary (placed next to the app executable by the bundler)
and falls back to `opencode` on `PATH` for development — see
`src-tauri/src/sidecar/mod.rs` (`opencode_bin()`).

## Naming convention (required by Tauri)

Tauri's `externalBin` expects each binary suffixed with the **Rust target
triple** of the build host/target:

| Platform           | File name                                   |
| ------------------ | ------------------------------------------- |
| Windows (x64)      | `opencode-x86_64-pc-windows-msvc.exe`       |
| macOS (Apple)      | `opencode-aarch64-apple-darwin`             |
| macOS (Intel)      | `opencode-x86_64-apple-darwin`              |
| Linux (x64)        | `opencode-x86_64-unknown-linux-gnu`         |

Find your triple with: `rustc -Vv | grep host`.

## How to populate it

The actual binary is **not committed** (it is large and platform-specific — see
`.gitignore`). Fetch it for your target before a bundle build:

```bash
# example: Windows x64 — download the matching opencode release, then:
#   place it here renamed to opencode-x86_64-pc-windows-msvc.exe
```

In CI this is done automatically by `.github/workflows/release.yml` before
`tauri build`.

> Dev mode (`pnpm tauri dev`) does **not** need a file here as long as
> `opencode` is installed and on your `PATH`.
