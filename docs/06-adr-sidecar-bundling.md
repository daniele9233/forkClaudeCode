# ADR 06 — Bundling del binario `opencode` (decisione D4)

**Stato:** accettato · **Fase:** 11.1 · **Data:** 2026-06-26

## Contesto

Forgia è il "guscio": il motore è `opencode serve`, lanciato come **sidecar**.
Perché l'app sia installabile e usabile senza che l'utente installi nulla a
mano, il binario `opencode` va impacchettato dentro l'installer (decisione D4 in
`PROGETTO.md` §13).

## Decisione

1. **Tauri `externalBin` in un overlay di release.** `bundle.externalBin =
   ["binaries/opencode"]` vive in `src-tauri/tauri.release.conf.json` (overlay
   mergiato a build time con `tauri build --config …`), **non** nel
   `tauri.conf.json` base. Motivo: il build-script di Tauri (`generate_context!`)
   valida `externalBin` ed esige che il binario (con suffisso target-triple)
   esista già a check/build time — tenerlo nel config base romperebbe
   `cargo check` e `pnpm tauri dev` perché il binario non è committato. A runtime
   il bundler colloca il sidecar **accanto all'eseguibile** dell'app (senza il
   suffisso del target-triple).

2. **Risoluzione a runtime con fallback.** `sidecar::opencode_bin()` preferisce
   il binario bundlato accanto a `current_exe()`; se non c'è (sviluppo) ricade su
   `opencode` nel `PATH`. Così `pnpm tauri dev` funziona con un'installazione di
   sistema, mentre il pacchetto release è self-contained.

3. **Binario non versionato in git.** È grande e specifico per piattaforma →
   `src-tauri/binaries/.gitignore` lo esclude; si scarica per-target a build time
   (CI: `.github/workflows/release.yml`). Convenzione di nome richiesta da Tauri:
   `opencode-<target-triple>[.exe]`.

4. **Windows-first.** Il workflow di release builda `x86_64-pc-windows-msvc`
   con `tauri-action` (release in draft). macOS/Linux restano per dopo (11.4).

## Conseguenze

- **Pro:** installer self-contained; nessun setup manuale del motore; in dev si
  usa l'opencode di sistema senza copiare file.
- **Contro:** l'installer cresce della dimensione di `opencode`; serve
  aggiornare il binario bundlato quando esce una nuova versione del motore
  (gestito dal pin nel workflow / step di fetch).
- **Rischio noto:** il nome dell'asset di release di opencode va verificato
  rispetto al naming corrente del progetto upstream prima di affidarsi al fetch
  automatico in CI (annotato nel workflow).
