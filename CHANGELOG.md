# Changelog

All notable changes to kikkoCode are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/), and this project aims to follow
[Semantic Versioning](https://semver.org/).

## [0.4.12] — 2026-07-13

### Changed

- **Auto-routing is now zero-config.** Flip the toggle and the roles assign
  themselves: the best **vision** model you have connected becomes the Design
  model (Claude preferred), and the best fast coder (glm-5.2 / DeepSeek
  preferred) becomes the Coding model. From then on you just type — every
  prompt goes to the right model automatically. Manual override stays: hover a
  model and click 🎨/⌨ to reassign anytime, or turn the toggle off to go back
  to fully manual selection.

## [0.4.11] — 2026-07-12

### Added

- **Model auto-routing (design / coding)** 🎨⌨ — assign one model to the
  **Design** role (Claude / any multimodal model: front-end, UI, motion, 3D)
  and one to the **Coding** role (glm-5.2, DeepSeek: logic, fixes, scripts),
  then flip the **Auto-routing** toggle in the model dropdown: every prompt is
  classified and sent to the right model automatically. Studio recipes always
  route to Design; the visual **Audit** prefers the Design model too (it needs
  vision). Hover a model row and click 🎨 or ⌨ to assign; multiple provider
  keys already coexist, so Claude + GLM + DeepSeek can all stay connected.

## [0.4.10] — 2026-07-12

### Added

- **Figma MCP (design → code)** — connect Figma in one click (Settings → MCP →
  Consigliati, paste your Personal Access Token): the agent reads your Figma
  files (layout, text, styles, measurements) and implements them faithfully.
  The most reliable route to visual quality: design or buy a top template, the
  agent codes it.
- **"Hero 3D Awwwards" Studio recipe** 🏆 — an art-director-grade brief: a
  concept-driven WebGL hero (R3F + shader, mouse + scroll reactive), split-text
  reveals, Lenis + ScrollTrigger choreographed storytelling with a pinned
  scrub section, magnetic cursor details, 60fps and reduced-motion budgets.
- **Harder design audit** — the multi-viewport Audit now scores a 7th area,
  the **signature moment** (awwwards bar): a static hero = FAIL, and the agent
  is instructed to build a real signature hero (R3F/GSAP) first.

## [0.4.9] — 2026-07-12

### Added

- **The 3D Neural Brain** 🧠 — the sidebar now hosts a living "digital cortex"
  (video-inspired): neon neuron clusters laid out as real brain regions
  (PREFRONTAL, MOTOR CORTEX, ASSOCIATION, SENSORY CORTEX, CONCEPT LAYER,
  PREDICTIVE, FEATURE LAYER, LANGUAGE, HIPPOCAMPUS, BRAINSTEM), each with its
  HUD label ("N neurons · firing %"), wired by synapses, slowly rotating in 3D
  with firing pulses traveling along the connections. It's fed by **real
  activity**: the cortex lights up while the agent streams and idles down
  after. Collapsible header shows `neurolink · cortex — live/idle`.
  Replaces the sidebar Tetris. Honors `prefers-reduced-motion`.
- **Resizable sidebar** — drag the sidebar's right edge to widen it (220–560px):
  a wider sidebar means a bigger brain.

## [0.4.8] — 2026-07-12

### Added

- **Auto-Tetris in the sidebar** — while the agent works, an auto-playing
  Tetris appears in the left sidebar under Sessions (replaces the pulse visual;
  dismissible per run).
- **`web3d` — next-gen websites by default.** New always-on playbook that fires
  on any website/landing request: real 3D hero (three.js / React Three Fiber),
  GSAP ScrollTrigger storytelling (pinning, scrub, staggers), Lenis smooth
  scroll, magnetic/cursor micro-motion — no more "nice but forgettable
  templates". All 5 Studio recipes now force it too.
- **Blender MCP** — one-click connect in Settings → MCP (needs `uv` and the
  blender-mcp addon running in Blender): the agent can model 3D scenes.
- **21st.dev Magic MCP** — connect with your own API key (stored only in your
  local engine config): 21st.dev-grade UI components generated in chat.

### Changed

- **Sharper chat colors** — user = electric blue, agent = neon green (deeper
  variants in the light theme for readability).
- **File tree moved out of the sidebar** into a new **Files** tab in the bottom
  panel (next to Terminal/Diff/Inspector/Timeline); sessions now get the whole
  sidebar. Clicking a file still opens its diff.

## [0.4.7] — 2026-07-11

### Added

- **Chat role colors** — you can now tell your question and the model's answer
  apart at a glance: your messages sit in an **amber**-accented box, the agent's
  replies in a **cyan**-accented one (with an "agent" label). Works in both the
  light and dark theme.
- **ThinkingPulse** — while the agent works, an elegant floating visual appears:
  a living waveform of amber/cyan light with rising sparks that **pulses with
  real activity** (every streamed token feeds its energy). Dismissible per run;
  honors `prefers-reduced-motion` (static gradient instead).

## [0.4.6] — 2026-07-09

### Added

- **`/` command menu in the prompt** (like Claude Code) — type `/` to get a
  filterable list of **skills** (pin one), **recipes** (load a full brief) and
  **actions** (Install skills…, Plan/Build mode). Arrow keys + Enter to pick.
- **Install real engine skills.** A new Skill Marketplace (open from `/` →
  "Installa skill…" or Settings → Skills) installs proper OpenCode/Claude skills
  from a git repo into `~/.claude/skills`, so the engine exposes them as
  **invocable** skills — not just the built-in design playbooks. Curated packs:
  Taste (design), Impeccable, UI/UX Pro Max, GSAP (motion), Remotion (video),
  the official Anthropic pack, and Superpowers (workflow) — plus install from any
  GitHub URL. One click to restart the engine so it rescans.

### Note

- The built-in 33 design **playbooks** (auto-injected by keyword) and the
  **engine skills** (invocable, in `~/.claude/skills`) are now clearly separated
  in the Skills tab — they were easy to confuse.

## [0.4.5] — 2026-07-09

### Fixed

- **Adding a provider now actually switches to its model.** When you added a key
  (e.g. `zai/glm-5.2`), the engine's default was updated but the app's own
  selection wasn't — so a stale selection persisted from an earlier version
  (e.g. `glm/glm-4.6`, back when the GLM template used id `glm` with a 4.6
  default) kept winning, and every message quietly routed to the old model even
  though the picker showed the new one. Adding a provider now sets it as the
  active selection too. If you were stuck on GLM-4.6, GLM-5.2 is used now.
- The GLM picker trim (4.6/5.2 families) also applies to a legacy `glm`
  provider, not just `zai`.

## [0.4.4] — 2026-07-09

### Fixed

- **GLM / Z.ai "Invalid API key" — the real cause.** z.ai has two separate,
  non-interchangeable endpoints: the general per-token API (`/api/paas/v4`, for a
  normal API key from your z.ai _API Keys_ list) and the GLM Coding Plan
  subscription (`/api/coding/paas/v4`). A general key on the coding endpoint is
  rejected as "Invalid API key". The provider now defaults to the **general**
  endpoint (what most keys are), and the hint spells out which endpoint goes with
  which key — switch to the coding one only if you have a Coding Plan.
- **No more ~20 GLM models cluttering the picker.** The z.ai catalog advertises
  its whole lineup (GLM-4.5, 4.5V, 4.7-FlashX, 5.1, EV-Turbo, …); the picker now
  shows only the current families — the **4.6** line (incl. 4.6V vision) and
  **5.2** — so the list is legible. Your selected model always stays visible.

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
