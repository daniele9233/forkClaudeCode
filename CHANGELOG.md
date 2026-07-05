# Changelog

All notable changes to kikkoCode are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/), and this project aims to follow
[Semantic Versioning](https://semver.org/).

## [0.1.3] — 2026-07-05

### Added

- **Anthropic (Claude) provider.** Claude is now a first-class choice in the
  "Add provider API key" list. Key verification uses Anthropic's `x-api-key` +
  `anthropic-version` headers (Claude isn't OpenAI-compatible), and a fresh
  connect defaults to a Sonnet model. Verified end-to-end against the live API.

## [0.1.2] — 2026-07-05

### Fixed

- **Model choice is now sticky.** Re-verifying a provider key (or a reconnect)
  no longer resets the selected model back to the provider default. If you
  switched DeepSeek to `deepseek-reasoner`, it stays selected. Only the very
  first connect of a brand-new provider auto-picks the fast default.

### Docs

- Provider guide now explains DeepSeek's two models (`deepseek-chat` fast vs
  `deepseek-reasoner` reasoning/"pro") and how to switch.

## [0.1.1] — 2026-07-05

### Fixed

- **No more stray terminal window on Windows.** The GUI now spawns the
  `opencode` engine (and the dev server, `git`, screenshots, etc.) with
  `CREATE_NO_WINDOW`, so no console pops up alongside the app.
- **False "version mismatch" banner.** The engine/SDK compatibility check
  compared against the wrong major version and warned on every launch even with
  the correct bundled engine; it now only warns when the engine is genuinely
  older than the one shipped.

## [Unreleased]

### Added

- **Chat & engine integration** — sessions, streaming markdown, reviewable
  tool-call cards, permission approvals, abort; OpenCode sidecar lifecycle.
- **File tree + inline diffs** (Monaco) and an embedded **terminal** (xterm.js)
  with dev-server detection.
- **Web preview** with HMR and **visual element selection** (Onlook-style) that
  composes a precise edit prompt.
- **Context Inspector** ⭐ — token count, % of model budget, context breakdown,
  cumulative cost.
- **Engine controls in the GUI** — provider/model switcher with guided key
  setup, agents/skills view, MCP server management, subagent visualization.
- **UX differentiators** — checkpoint timeline with rewind/restore, command
  palette (`Ctrl/Cmd + K`), always-on cost & token status bar.
- **Aesthetic pass** — signature welcome screen, light/dark themes, opening and
  chat reveal animations (all respecting `prefers-reduced-motion`).
- **Hardening** — global engine status banner with one-click reconnect,
  health-monitored sidecar with crash detection and port-conflict retries,
  accessibility audit (dialog roles, focus-visible, reduced motion), and a
  Vitest integration-layer test suite (CI-gated).
- **Packaging** — `opencode` bundled as a Tauri sidecar, first-run onboarding
  wizard, Windows release workflow.

### Notes

- Windows-first; macOS/Linux packaging is planned.

<!--
When cutting a release, move the relevant entries under a new versioned heading:

## [0.1.0] - YYYY-MM-DD
-->
