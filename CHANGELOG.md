# Changelog

All notable changes to kikkoCode are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/), and this project aims to follow
[Semantic Versioning](https://semver.org/).

## [0.4.3] — 2026-07-08

### Added

- **Filter the model list by provider** — the model dropdown now has provider
  chips (All · DeepSeek · Anthropic · …); pick one to see only that provider's
  models instead of every provider at once.

### Fixed

- **GLM / Z.ai works out of the box.** The provider now uses the correct GLM
  coding endpoint (`https://api.z.ai/api/coding/paas/v4`) and id `zai`, so
  `zai/glm-5.2` connects with your key (was "Invalid API key"). The endpoint is
  also editable (switch to Zhipu `open.bigmodel.cn` if your key is a China one).
- **No more "Invalid API key" from paid gateway models.** The OpenCode Zen/Go
  gateways now show only their FREE models; paid gateway models (which need an
  OpenCode subscription) are hidden.

## [0.4.2] — 2026-07-08

### Added

- **GLM (z.ai / Zhipu) provider** — pick "GLM (z.ai / Zhipu)" when adding a
  key, paste your `id.secret` token and the model id (e.g. `glm-4.6`).
- **Connect GitHub & pick a repo** — the GitHub tab now lets you paste a token
  and browse your repositories (private included), then clone & open one in a
  click to work on it directly. Cloning from a URL is still there as a fallback.

## [0.4.1] — 2026-07-08

### Added

- **FREE model tags** — every zero-cost model shows a green **FREE** badge (like
  OpenCode), and the built-in Zen gateway now surfaces its free models (mimo,
  nemotron, north-code, …) instead of being hidden.

### Changed

- **Overlays are opaque now.** The model dropdown and the Settings modal no
  longer let the prompt text behind them bleed through — much more readable.

### Removed

- **Retro OS interface** (and its Tetris) — removed per feedback; the classic
  interface is the only one again.

## [0.4.0] — 2026-07-08

### Added

- **`taste` — anti-slop skill** 🎯 (from the Anti-Slop Frontend Framework). It
  auto-applies to any front-end request and bans generic AI output: no default
  SaaS blue, one styling system, real typographic hierarchy, intentional
  whitespace, no card-syndrome, fluid layouts, semantic HTML, real a11y.
- **Open-source / local models** — Ollama and LM Studio presets (no API key,
  you name the local model). OpenRouter/Groq already cover open-weight models
  with a key.
- **Rewind to a previous task** — every user message has a “Rewind” button that
  reverts the session to that prompt (reversible from the Timeline tab).
- **Preview: resize + zoom** — drag the preview's left edge (or hit Expand) to
  widen it, and zoom the previewed page in/out (25–200%).

### Changed

- **Studio: 5 perfect recipes instead of 33.** A small, curated set — each
  force-injects the right skill stack (always incl. `taste`) and bakes the
  anti-slop bar into the prompt, for awwwards-caliber output.

## [0.3.0] — 2026-07-07

### Added

- **Second selectable interface: "Retro OS"** 🕹️ — a synthwave skin (neon
  magenta/cyan on black, CRT scanlines, terminal glow) over the same app and
  features. Switch anytime with the gamepad button in the top bar; the choice
  persists. The classic blueprint UI stays the default.
- **Tetris while the agent works** (Retro OS only): an auto-playing Tetris
  panel pops up while a task is running — dismissible per run.

## [0.2.2] — 2026-07-07

### Changed

- **Anthropic model list curated to the current lineup.** The picker now shows
  only Claude's current models (Opus 4.8 / 4.7 / 4.6, Sonnet 5 / 4.6, Haiku 4.5,
  Fable 5), hiding superseded point releases, "(latest)" aliases and "Fast"
  variants — matching Claude's own model menu. Your selected model always stays
  visible, and the search box still works.

## [0.2.1] — 2026-07-07

### Changed

- **Cleaner model picker.** The dropdown now hides models the catalog marks
  `deprecated` (your selected model always stays visible) and adds a **search
  box** — type e.g. "opus 4.8" to filter a long provider lineup instead of
  scrolling past every historical point release.

## [0.2.0] — 2026-07-05

### Changed

- **Upgraded the bundled opencode engine and `@opencode-ai/sdk` from 0.15.31 to
  1.17.13** (latest). The integration layer was migrated to the 1.x API (model
  capabilities, MCP status shape). The engine is now fetched from npm
  (`opencode-windows-x64`) for a reliable, exactly-pinned sidecar.

### Fixed

- **`[DecimalError] Invalid argument` when chatting with Anthropic/Claude.** The
  old engine crashed computing cost against the current model pricing schema;
  the 1.x engine handles it correctly.
- **Outdated model names.** The model list/names now come from the current
  catalog the 1.x engine serves.

### Added

- **In-app auto-update.** kikkoCode checks GitHub for a newer release on launch
  (and every 6h) and shows a one-click "Download & install" banner. No signing
  key required; the check never blocks or crashes the app.

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
