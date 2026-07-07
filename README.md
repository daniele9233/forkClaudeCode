# kikkoCode

> A calm, elegant desktop shell over the [OpenCode](https://opencode.ai) engine —
> Windows-first.

kikkoCode doesn't reinvent the agentic engine: OpenCode is the "kitchen", kikkoCode is
the "dining room". It runs `opencode serve` as a local sidecar and puts a new,
disciplined GUI on top — with two differentiators a plain CLI doesn't have:

- **Context Inspector** ⭐ — see exactly what the agent sees: token count, % of
  the model's budget, context breakdown, and cumulative cost. This is the
  signature panel; the rest of the UI stays quiet and dense.
- **Web preview + visual element selection** (Onlook-style) — pick an element in
  the live preview and turn it into a precise edit prompt.

## Highlights

- **Chat** with streaming markdown, reviewable tool-call cards, inline diffs.
- **Plan / Build** modes (from OpenCode) with a clean UI.
- **Checkpoint timeline** with visual rewind/restore.
- **Command palette** (`Ctrl/Cmd + K`) — everything from the keyboard.
- **Always-on status bar** — provider/model, context meter, session cost.
- **Settings** for agents/skills and MCP servers; guided provider/key setup.
- **Light & dark** themes; `prefers-reduced-motion` respected throughout.
- **Resilient sidecar** — health-monitored, with one-click reconnect.

## Architecture

```
Tauri shell ──► React/TS UI ──@opencode-ai/sdk (HTTP+stream)──► opencode serve (sidecar)
   └── Rust backend: sidecar lifecycle, preview webview, native ops
```

The only real boundary is **React UI ↔ `opencode serve`** via `@opencode-ai/sdk`.
The Rust backend manages the sidecar (free port, health check, restart), the
preview webview, and a few native operations. Everything engine-side (providers,
agent loop, tools, MCP, skills, checkpoints, compaction) comes from OpenCode.

See `PROGETTO.md` for the full spec and `docs/` for architecture decisions
(ADRs).

## Tech stack

Tauri 2 · React 19 + TypeScript + Vite · Zustand + TanStack Query · Tailwind
CSS v4 · shadcn/ui · Motion · Monaco · xterm.js · Lucide.

## Install (Windows) — no developer tools needed

If you just want to **use** kikkoCode, you don't need Rust, Node, or pnpm. Open
**Windows PowerShell** and run this one line:

```powershell
irm "https://raw.githubusercontent.com/daniele9233/forkClaudeCode/claude/opencode-project-setup-1i59cg/scripts/install.ps1" | iex
```

It downloads the latest published release and runs the installer for you. The
OpenCode engine is bundled inside — nothing else to set up. Launch kikkoCode
from the Start menu; a short wizard helps you connect an AI provider on first
run (your API keys stay on your machine).

After that, kikkoCode **updates itself**: on launch (and every few hours) it
checks GitHub for a newer release and shows a one-click "Download & install"
banner — no need to re-run the command.

To remove it later:

```powershell
irm "https://raw.githubusercontent.com/daniele9233/forkClaudeCode/claude/opencode-project-setup-1i59cg/scripts/uninstall.ps1" | iex
```

> **Maintainer note:** the one-liner installs the latest _published_ GitHub
> release. To produce one, push a version tag (`git tag vX.Y.Z && git push origin vX.Y.Z`)
> — this triggers `.github/workflows/release.yml`, which builds the Windows
> installer and **publishes** the release automatically (no manual "Publish"
> step). Keep `version` in `package.json` + `src-tauri/tauri.conf.json` and the
> workflow's default tag in sync when cutting a release.

## Getting started (development)

**Prerequisites:** Node 22 + [pnpm](https://pnpm.io) 10, the Rust toolchain, the
Tauri 2 system dependencies, and `opencode` installed and on your `PATH`.

```bash
pnpm install
pnpm tauri dev      # launches the app; Rust spawns `opencode serve` for you
```

Other useful scripts:

```bash
pnpm dev            # Vite only (no Tauri shell)
pnpm test           # Vitest unit tests
pnpm lint           # tsc --noEmit
pnpm build          # type-check + production frontend build
pnpm tauri build    # bundle the desktop app + installer
```

On first launch a short onboarding wizard helps you connect a provider. API
keys stay on your machine — they go to the local OpenCode engine only.

## Packaging

The `opencode` engine is bundled as a Tauri sidecar (`externalBin`). The binary
itself is not committed; at build time the release workflow fetches it **from
npm** (the `opencode-windows-x64` platform package, pinned to `OPENCODE_VERSION`
— kept in sync with `@opencode-ai/sdk` in `package.json`). See
`src-tauri/binaries/README.md` and `docs/06-adr-sidecar-bundling.md`.

A tagged push (`v*`) — or a branch push whose commit message contains
`[release]` — triggers `.github/workflows/release.yml`, which builds the Windows
installer via `tauri-action` and publishes it as a GitHub release. macOS/Linux
packaging is planned (see `CHECKLIST.md` Fase 11.4).

## Project status

kikkoCode is in active development. Progress and the next step live in
`CHECKLIST.md`; a surgical change history is in `DEVLOG.md`. Release notes are in
[`CHANGELOG.md`](./CHANGELOG.md).

## License

See repository for license details.
