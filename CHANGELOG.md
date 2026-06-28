# Changelog

All notable changes to kikkoCode are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/), and this project aims to follow
[Semantic Versioning](https://semver.org/).

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
