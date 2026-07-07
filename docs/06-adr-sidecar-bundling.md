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
- **Rischio noto (superato dall'aggiornamento sotto):** in origine il binario si
  scaricava dagli **asset di release GitHub** di opencode, il cui nome andava
  verificato a ogni bump. Vedi l'aggiornamento del 2026-07-07.

## Aggiornamento — 2026-07-07 (fetch da npm + auto-publish)

Con l'upgrade del motore a **opencode 1.17.13** (SDK `@opencode-ai/sdk` di pari
versione) sono cambiati due dettagli operativi di questa ADR; la decisione di
fondo (sidecar `externalBin`, risoluzione a runtime con fallback su PATH,
binario non committato) resta invariata.

1. **Fetch del sidecar da npm, non dagli asset GitHub.** Il workflow ora fa
   `npm pack opencode-windows-x64@$OPENCODE_VERSION` ed estrae
   `package/bin/opencode.exe`. npm pinna la versione esatta corrispondente
   all'SDK ed elimina il "rischio noto" del naming degli asset GitHub. Punto 3
   aggiornato di conseguenza.
2. **Release pubblicata automaticamente**, non più in draft (Punto 4):
   `releaseDraft: false` in `tauri-action`, così l'installer è subito reperibile
   da `/releases/latest` (usato dall'installer one-liner e dall'auto-update
   in-app). Il trigger include anche i push su branch con `[release]` nel
   messaggio di commit, oltre ai tag `v*`.

`OPENCODE_VERSION` nel workflow va tenuto in sync con `@opencode-ai/sdk` in
`package.json`.
