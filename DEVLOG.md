# FORGIA — DevLog

> **Regola:** questo file va aggiornato **ogni volta** che si fa una modifica,
> anche piccola. È la memoria chirurgica del progetto — più preciso di
> `CHECKLIST.md`, meno astratto di `PROGETTO.md`.
>
> Formato di ogni voce:
> ```
> ## YYYY-MM-DD · <titolo breve>
> **Fase:** X.Y  |  **Branch:** <nome>  |  **Commit:** <sha breve>
> ### Cosa è cambiato
> ### Perché / decisione
> ### Gotcha / attenzione
> ```

---

## 2026-06-27 · Blueprint — match esatto del mockup (dashboard + sparkline + blocchi)

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (prossimo)

L'utente ha rimandato lo screenshot del mockup v3 chiedendo "l'app esattamente così".
Aggiunti gli elementi-dati mancanti, collegati ai dati reali:

- **`features/inspector/useSessionStats.ts`** (nuovo): hook che aggrega tokens in/out,
  step, cache-hit %, costo, % finestra di contesto da messaggi storici + live.
- **`features/inspector/StatStrip.tsx`** (nuovo): riga dashboard sopra la conversazione —
  TOKENS IN / OUT / STEPS / CACHE HIT / COST (celle divise, mono). In `ChatShell`.
- **`features/inspector/ContextSparkline.tsx`** (nuovo): pannello CONTEXT in fondo alla
  sidebar con barre sparkline (input/step) + "X / Y TOK · Z%". In `App.tsx`.
- **MessageBubble**: blocco USER con tab incassata "USER · HH:MM:SS".
- **ToolCallCard**: header come tab incassata "EDIT · file" + chip open + chevron.
- **StatusBar**: riformattata a celle divise — SESSION / MODEL / CTX% / COST / FORGIA v0.1.0.

Verificato con anteprima a dati simulati (fetch del motore mockato): combacia col mockup D.
Build verde, 22 test ok, prettier pulito.

---

## 2026-06-27 · Restyle DEFINITIVO → Brutalist Blueprint (variante D scelta)

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (prossimo)

Dopo aver mostrato 4 mockup statici, l'utente ha scelto lo stile **"Brutalist blueprint /
variante D"**: monocromo + accento ambra, griglia hairline, pannelli frosted con
**linguetta header incassata (notched tab)**, dati densi, tutto monospace. Adattata
**tutta l'app**.

- **`index.css`**: font UI → **monospace** ovunque; sfondo near-black con **griglia
  hairline** + glow ambra (dark e light); radii netti (2–3px); accento `#e7a93c`;
  `.hud-label` = mono uppercase tracking; `.glass`/`.glass-strong` tarati; nuove utility
  **`.bp-tab`** (linguetta con angolo tagliato), `.bp-cell`, `.bp-bar`.
- **`src/components/Panel.tsx`** (nuovo): `Panel` (glass + bordo) + `PanelTab` (linguetta
  incassata) — mattone riusabile dello stile D.
- **Chat**: ChatShell header (quadrato ambra + FORGIA + ●ONLINE), WelcomeScreen (Panel con
  tab "FORGIA // AGENT SHELL", wordmark, "START VECTORS", righe numerate 01/02/03), ChatInput
  (Panel, toggle BUILD/PLAN mono + READY, send netto), MessageBubble (bolla utente bordata ambra).
- **Sidebar/panels**: SessionSidebar + FileTree con header `bp-tab`, righe attive con barra
  ambra a sinistra; bottom-panel tab mono uppercase; Inspector/Timeline ereditano `hud-label`.
- **Overlay**: CommandPalette / SettingsModal / OnboardingWizard portati su `Panel`
  (`glass-strong`), label mono uppercase, highlight con barra ambra.
- Rimossi `ChamferPanel` e `CornerBrackets` (non più usati).

Build verde, 22 test ok, prettier pulito. Screenshot verificati (welcome, palette — dark+light).

---

## 2026-06-27 · Restyle → dark OpenCode + glass trasparente + chamfer (pivot 2)

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (prossimo)

L'utente ha rifiutato il gradiente pastello → vuole **tutto dark stile OpenCode**, pannelli
**trasparenti/frosted neutri**, e gli **angoli smussati verso l'interno** (chamfer top-right)
come motivo-firma. (Nessuna "skill" UI/UX dedicata disponibile in env → applicati criteri
di design a mano.)

- **`index.css`**: sfondo near-black neutro (#0a0a0b) con un soffio di luce in alto + vignette,
  **niente colore**; light theme neutro (no orb). `.glass` ora frosted neutro su white/3.5%,
  `.glass-strong` dark; `--notch` default 18px.
- **`src/components/ChamferPanel.tsx`** (nuovo): pannello glass con un angolo smussato e
  **bordo che segue anche la diagonale** (tecnica a due strati: outer = colore bordo clippato,
  inner = glass a +1px). Props: notch, corner (tr/tl), strong, className/innerClassName, spread
  di props DOM (role/aria per i dialog).
- **Applicato il chamfer** a: WelcomeScreen (card + righe suggerimento), ChatInput (composer),
  CommandPalette, SettingsModal, OnboardingWizard — motivo coerente top-right.
- Header/sidebar/status restano full-bleed (no chamfer, toccano i bordi).

Build verde, 22 test ok, prettier pulito. Screenshot verificati (dark welcome, composer, palette).

---

## 2026-06-27 · Restyle → Codex-clean + glassmorphism (pivot)

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (prossimo)

L'utente ha rifiutato il look HUD/brutalista → nuova direzione: **pulito stile Codex
con sfondo glassmorphism** (pannelli frosted translucidi su gradiente colorato morbido).

- **`index.css`**: radii morbidi (8–20px); sfondo a orb-gradient colorato (ambra/indaco/
  teal/rosa) fisso, dark e light; bordi translucidi (`--border` = white/10 dark, slate/10
  light); `.hud-label` ridefinita **pulita** (sans, niente mono/maiuscolo); utility nuove
  `.glass`, `.glass-strong`, `.glass-border` (backdrop-blur + bg translucido, adattive al tema).
- **App/ChatShell/Sidebar/StatusBar/bottom panel**: superfici rese trasparenti o `.glass`
  così traspare il gradiente; header pulito (quadrato ambra arrotondato + "Forgia" + stato
  Online/Working pulito).
- **WelcomeScreen**: riscritto pulito — card glass arrotondata, badge gradiente, 3 suggerimenti
  come righe morbide con hint e freccia; niente più "vectors/crop-mark".
- **ChatInput**: composer glass arrotondato (rounded-3xl), toggle Build/Plan a pill, send
  circolare; **rimosso il chamfer** (incoerente col nuovo stile).
- **CommandPalette / SettingsModal / ModelSwitcher dropdown / OnboardingWizard**: `.glass-strong`,
  label pulite sentence-case, highlight arrotondato.
- **MessageBubble**: bolla utente arrotondata (niente chamfer).

Build verde, 22 test ok, prettier pulito. Screenshot verificati (welcome dark+light, palette).
Da rifinire ancora (eventuale pass): tool-call card / inspector / timeline / banner / diff /
preview toolbar — sono già morbidi (radii) ma non ancora "glass" pieni.

---

## 2026-06-27 · Restyle HUD / mission-control (pass 2 — uniformazione)

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (prossimo)

Estensione dello stile HUD a tutto il resto della UI (l'utente ha confermato:
chamfer top-right ok, glow ambra ok, uniformare tutto).

- **SessionSidebar**: header `hud-label`, righe con accento `border-l-2` ambra
  sull'attiva, timestamp mono uppercase, empty/loading come hud-label.
- **FileTree**: header hud-label + border-b, empty/loading hud-label.
- **App** (bottom tabs): tab mono uppercase tracking.
- **CommandPalette**: group header `hud-label`, label azioni mono uppercase,
  accento `border-l-2` sull'item attivo.
- **SettingsModal**: header con quadrato ambra + `SETTINGS` mono, tab mono uppercase.
- **OnboardingWizard**: CornerBrackets, heading mono uppercase, card/bottoni sharp.
- **MessageBubble**: user bubble con chamfer `notch-tl`; reasoning/error con accento
  `border-l-2` invece del box pieno.
- **ToolCallCard**: accento `border-l-2` per stato (running ambra / error rosso /
  completed verde), titolo uppercase.
- **ContextInspectorPanel**: SectionLabel → `hud-label`.
- **CheckpointTimeline**: STEP N hud-label, badge "reverted", tempi mono.
- **ModelSwitcher**: pill + dropdown mono uppercase, sharp.
- **SidecarStatusBanner / DevServerBanner / PermissionBanner**: testi mono uppercase,
  bottoni sharp, accenti coerenti.

Build verde, 22 test ok, prettier pulito. Screenshot verificati (welcome, palette,
settings, onboarding). Resta marginale: toolbar PreviewPanel e FileDiffPanel header
(meno visibili) — eventuale pass 3.

---

## 2026-06-27 · Restyle HUD / mission-control (pass 1)

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (prossimo)

### Contesto
L'utente ha rifiutato il look "soft shadcn" e ha fornito 2 reference (OBSIDIAN hero +
AGENT DATA OVERVIEW dashboard): estetica tecnico-brutalista — monospace, bordi a filo,
angoli netti, crop-mark, micro-label maiuscole, accenti misurati (ambra/verde/rosso).
Richiesta specifica: il **prompt con un solo angolo smussato** (chamfer) verso l'interno.

### Cosa è cambiato
- **`src/index.css`**: radius ridotti (1–3px, look netto); sfondo atmosferico (radial
  gradient ambra + vignette, solo dark); accenti `--color-online` (verde) / `--color-alert`
  (rosso); utility HUD: `.hud-label` (mono uppercase tracking), `.hud-mono` (tabular-nums),
  `.notch-tr`/`.notch-tl` (clip-path chamfer), `.hud-frame` (crop-mark via ::before/::after),
  `.hud-scan` (scanline leggera).
- **`src/components/CornerBrackets.tsx`** (nuovo): 4 crop-mark ad L riusabili.
- **`src/features/chat/ChatInput.tsx`**: **chamfer top-right** con tecnica a due strati
  (outer=border color clippato, inner=fill, +1px → bordo anche sulla diagonale); focus-within
  ambra; mode toggle BUILD/PLAN mono uppercase; indicatore READY/RUNNING.
- **`src/features/chat/ChatShell.tsx`**: header HUD — quadrato ambra + wordmark `FORGIA`
  mono uppercase tracking, stato ONLINE (verde) / RUNNING / CONNECTING come hud-label.
- **`src/features/onboarding/WelcomeScreen.tsx`**: riprogettato — pannello con CornerBrackets,
  meta-row (FORGIA // AGENT SHELL · v0.1.0), wordmark grande, divider "START VECTORS",
  3 card numerate (01/02/03), footer CTRL K + STANDBY; tutto mono, gated reduced-motion.
- **`src/features/statusbar/StatusBar.tsx`**: label CTX/MSGS/STEPS/model in mono uppercase.

### Note
- Chamfer scelto in alto a destra ("verso l'interno"); facilmente spostabile cambiando
  `.notch-tr` → `.notch-tl` e il lato.
- Pass 1: header, welcome, input, status bar. Da rifinire ancora (pass 2): command palette,
  message bubble/tool-call card, settings modal, inspector/timeline, sidebar — per coerenza piena.
- Build verde; screenshot verificati in Chromium (dark+light).

---

## 2026-06-27 · Fix CI — externalBin in overlay di release

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (prossimo)

### Cosa è cambiato
- `src-tauri/tauri.conf.json`: rimosso `bundle.externalBin`
- `src-tauri/tauri.release.conf.json` (nuovo): overlay con solo `bundle.externalBin`
- `.github/workflows/release.yml`: `args` ora include `--config src-tauri/tauri.release.conf.json`
- `docs/06-adr-sidecar-bundling.md` + `src-tauri/binaries/README.md`: aggiornati

### Perché
Il job `Rust (cargo check)` falliva con
`resource path binaries/opencode-x86_64-unknown-linux-gnu doesn't exist`.
Il build-script di Tauri (`generate_context!`) **valida `externalBin` a check/build
time** ed esige che il binario (con suffisso target-triple) esista. Il binario non è
committato → `cargo check` (e `pnpm tauri dev`) rompono. Tenendo `externalBin` solo in
un overlay applicato in release, il config base resta compilabile ovunque; in CI di
release l'overlay viene mergiato dopo che il binario è stato scaricato.

### Gotcha
- Il path di `--config` è risolto relativamente alla cwd del comando tauri (repo root in
  tauri-action) → `src-tauri/tauri.release.conf.json`. Da confermare al primo run reale di release.

---

## 2026-06-26 · Fase 11 — Packaging & release (11.1–11.3)

**Fase:** 11.1–11.3 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (vari)

### Cosa è cambiato

**11.1 — Bundling del sidecar (D4)**
- `src-tauri/tauri.conf.json`: `bundle.externalBin = ["binaries/opencode"]`
- `src-tauri/src/sidecar/mod.rs`: `opencode_bin()` → preferisce il binario accanto a
  `current_exe()` (dove Tauri colloca l'externalBin a runtime, senza suffisso triple),
  fallback su `opencode` nel PATH per lo sviluppo; usato in `Command::new(...)`
- `src-tauri/binaries/README.md` (convenzione naming target-triple) + `.gitignore`
  (binario non versionato — grande e per-piattaforma, fetch a build time)
- `.github/workflows/release.yml`: build Windows su tag `v*`/manuale; scarica opencode,
  lo rinomina `opencode-x86_64-pc-windows-msvc.exe`, poi `tauri-action` (release draft)
- `docs/06-adr-sidecar-bundling.md`: ADR della decisione D4

**11.2 — Onboarding primo avvio**
- `src/stores/onboarding.store.ts`: flag `completed` persistito (zustand/persist) + `reset()`
- `src/features/onboarding/OnboardingWizard.tsx`: modale 3 step con progress dots
  - **welcome**: intro firmata (anvil + forge-glow)
  - **provider**: lista provider che richiedono key; input password + save (`useSetAuth`);
    se `config.model` è vuoto adotta automaticamente il primo modello del provider salvato
  - **tour**: Plan mode / Build mode / Context Inspector ⭐
  - Skip sempre disponibile; Motion gated da `useReducedMotion`; `role="dialog"`
- `src/App.tsx`: `showOnboarding = !completed && sidecarStatus === "ready"` → monta il wizard
- `src/features/commandpalette/CommandPalette.tsx`: azione "Replay Intro" (`reset()`)

**11.3 — Docs**
- `README.md`: overview, differenziatori, architettura, stack, dev setup, packaging, status
- `CHANGELOG.md`: formato Keep a Changelog, sezione `Unreleased` con tutte le feature 1–11

### Perché / decisione

- **Fallback su PATH in dev**: così `pnpm tauri dev` funziona con un opencode di sistema
  senza dover copiare un binario in `binaries/`; il pacchetto release resta self-contained.
- **Binario non in git**: pesante e per-OS; versionarlo gonfierebbe il repo. Si scarica per
  target in CI (pin/asset-name nel workflow).
- **Onboarding gated su engine ready**: lo step provider deve poter parlare col server
  locale (lista provider, set key), quindi il wizard appare solo dopo `opencode-ready`.

### Gotcha / attenzione

- **Bundle non verificabile in web-env**: niente opencode binary, niente Windows, e cargo non
  può scaricare i crate (policy blocca `static.crates.io`). Config/Rust/workflow verificati per
  ispezione; il bundle reale va provato su Windows con un opencode scaricato.
- L'**asset-name** del download opencode in `release.yml` è best-effort
  (`opencode-windows-x64.zip` da `sst/opencode` releases) → da verificare contro il naming
  upstream corrente prima di affidarvisi.
- Tauri externalBin: file sorgente con suffisso target-triple, ma a runtime senza suffisso
  accanto all'eseguibile — `opencode_bin()` cerca proprio quel nome.

---

## 2026-06-26 · Fase 10 — Hardening (COMPLETA)

**Fase:** 10.1–10.4 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (vari)

### Cosa è cambiato

**10.3 — Resilienza sidecar**

**`src-tauri/src/sidecar/mod.rs`**
- `start`: ora prova fino a 3 volte su una porta fresca (gestisce TOCTOU porta libera→occupata
  e avvii lenti); messaggio d'errore chiaro se `opencode` non è installato/nel PATH
- Aggiunti `restart`, contatore `generation` (incrementato ad ogni start riuscito), `is_healthy`
  (probe `/health` con timeout 2s)

**`src-tauri/src/lib.rs`**
- `spawn_health_monitor(handle, sidecar)`: task che fa poll `/health` ogni 3s; dopo un re-check di
  conferma (per evitare blip transitori) emette `opencode-error` se l'engine smette di rispondere.
  Generation-guard: un monitor stale termina da solo dopo un restart.
- Nuovo comando `restart_opencode`: ferma+riavvia il sidecar e re-emette `opencode-ready`/`-error`
- Monitor avviato sia al boot (dopo il primo `opencode-ready`) sia dopo ogni restart

**`src/opencode/sidecar.ts`** (nuovo)
- `restartSidecar()`: `invoke("restart_opencode")`, ferma l'event stream morto, mette la UI in "starting";
  il listener `opencode-ready` esistente re-inizializza client + stream

**10.2 — Stati di errore/empty**

**`src/features/statusbar/SidecarStatusBanner.tsx`** (nuovo)
- Strip globale in cima all'app: al boot "Connecting to the OpenCode engine…" (calmo, spinner);
  su crash rosso "OpenCode engine disconnected" + ragione + pulsante **Reconnect** (`restartSidecar`)
- `App.tsx`: root convertito a `flex-col`; banner sopra il layout a 3 pannelli (wrappati in un nuovo div)
- `ChatShell`: copy d'errore aggiornato per rimandare al Reconnect del banner (non più "restart the app")

**10.1 — a11y audit**
- `role="dialog"` + `aria-modal="true"` + `aria-label` su `CommandPalette` e `SettingsModal`
- `aria-label` sul Close icon-only di SettingsModal
- Verificato: `:focus-visible` globale (`index.css`); `@media (prefers-reduced-motion)` copre tutte
  le classi `animate-*`; `useReducedMotion()` su tutte le animazioni Motion JS → nessuna non-gated

**10.4 — Test layer d'integrazione**
- Setup **Vitest** (jsdom): `vitest.config.ts` (alias `@`, env jsdom), script `test`/`test:watch`
- 22 test:
  - `src/stores/chat.store.test.ts` — reducer streaming (accumulo/overwrite/rimozione parti,
    set running, clear scoped per sessione)
  - `src/stores/permission.store.test.ts` — approvazioni (auto-allow per tipo/pattern stringa/array, revoca)
  - `src/features/terminal/detectDevServer.test.ts` — forme URL Vite/Next/CRA, 0.0.0.0→localhost, bare, no-match
  - `src/opencode/events.test.ts` — `isEventType` narrowing
  - `src/stores/theme.store.test.ts` — toggle classe `.light`, persistenza, colorScheme
- **`.github/workflows/ci.yml`**: step `pnpm test` aggiunto al job frontend (tra type-check e build)

### Perché / decisione

- **Health-poll invece di `wait()` sul Child**: monitorare l'uscita con `Child::wait()` richiede di
  possedere l'handle, in conflitto col path di restart/stop che deve poter uccidere il processo.
  Un poll su `/health` + generation-guard evita la contesa sull'ownership ed è robusto anche se il
  processo si "appende" senza morire (health fallisce comunque).
- **Retry su porta fresca**: tra il probe della porta libera e il bind di opencode c'è una finestra
  TOCTOU; ritentare su una nuova porta è più semplice e affidabile che lockare la porta.
- **Test sul layer logico, non sui componenti**: il valore d'integrazione vero è nei reducer (streaming,
  approvazioni) e nei parser — testabili in isolamento, veloci, senza un server reale.

### Gotcha / attenzione

- **Rust non compilabile in questo web-env**: la network policy del proxy permette `index.crates.io`
  ma blocca `static.crates.io` (download dei crate) → `cargo check` fallisce con 403. Il codice Rust
  è stato verificato per ispezione; la compilazione vera la fa il job `rust` della CI.
- `restartSidecar` dipende da `@tauri-apps/api/core` `invoke` → funziona solo dentro l'app Tauri,
  non nel browser dev puro (atteso).
- I file `*.test.ts` sono inclusi da `tsc` nel build: usano import espliciti da `vitest`, nessun tipo
  globale da configurare in tsconfig.

---

## 2026-06-26 · Fase 9 — Pass estetico (COMPLETA)

**Fase:** 9.1–9.3 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (prossimo)

### Cosa è cambiato

**`src/stores/theme.store.ts`** (nuovo)
- `Theme = "dark" | "light"`; stato Zustand `theme` + `setTheme` + `toggleTheme`
- `getInitialTheme()`: legge `localStorage["forgia.theme"]`; fallback a dark, ma rispetta
  `prefers-color-scheme: light` esplicito dell'OS
- `applyTheme()`: toggla la classe `.light` su `<html>` + setta `document.documentElement.style.colorScheme`
- Applica il tema in modo sincrono al load del modulo (no flash)

**`src/main.tsx`** — aggiornato
- `import "./stores/theme.store"` come side-effect PRIMA di `App` → tema applicato prima del primo paint

**`src/features/settings/ThemeToggle.tsx`** (nuovo)
- Pulsante Sun/Moon (lucide) nell'header di ChatShell; `aria-label` dinamico; chiama `toggleTheme`

**`src/index.css`** — aggiornato
- Blocco `.light` completato: aggiunti `--destructive(-foreground)`, `--ring`, tutte le var sidebar,
  ombre più morbide (rgb slate con alpha bassa)
- Scrollbar light-aware (`.light ::-webkit-scrollbar-thumb` → forge-300/400)
- Aggiunta var `--theme-transition` (riusabile per transizioni di colore)

**`src/features/onboarding/WelcomeScreen.tsx`** (nuovo) — momento-firma (9.1)
- Empty state mostrato quando non c'è sessione attiva (sostituisce l'empty state inline di ChatShell)
- Anvil (`Hammer`) dentro un riquadro con **forge-glow ambra** pulsante (scale+opacity loop, Motion)
- Stagger reveal (container/item variants) di icona → titolo → sottotitolo → chip → hint
- 3 **suggestion-chip** ("Plan a feature" plan, "Explain this codebase" plan, "Find a bug" build):
  click → `onPrompt(prompt, mode)` che inoltra a `handleSend` di ChatShell (auto-crea sessione)
- Hint "Press Ctrl K for the command palette"
- Tutti gli effetti disabilitati con `useReducedMotion()`

**`src/features/chat/ChatShell.tsx`** — aggiornato
- Import `ThemeToggle` + `WelcomeScreen`
- `ThemeToggle` nell'header (dopo `ModelSwitcher`)
- Empty state inline rimpiazzato da `<WelcomeScreen onPrompt={isReady ? handleSend : undefined} />`

**`src/features/chat/MessageList.tsx`** — aggiornato (9.3)
- Ogni bubble wrappato in `motion.div` con entrata fade-up (0.25s, ease custom)
- `key={info.id}` stabile → l'entrata gira solo al mount, non ad ogni update di streaming
- `useReducedMotion()` → `initial={false}` quando l'utente preferisce ridurre il motion

**`src/App.tsx`** — aggiornato (9.3)
- Root convertito in `motion.div` con fade-in d'apertura (0.5s, una-tantum al mount)
- `useReducedMotion()` → niente fade se reduced-motion

### Perché / decisione

- **D3 — niente Magic UI/Aceternity come dipendenze**: quelle librerie sono copy-paste pensate per
  landing page e NON gestiscono `prefers-reduced-motion` da sole (§10). Per un'app densa e per
  rispettare il quality floor, gli effetti-firma sono hand-rolled con **Motion** (già in stack),
  così ogni animazione è gated da `useReducedMotion()`. Audacia spesa solo sul WelcomeScreen +
  forge-glow, coerente con "boldness in un punto solo".
- **Tema: default dark, opt-in light**: l'identità è "officina digitale" dark-first; il light
  esiste ma non è il default a meno che l'OS lo chieda esplicitamente.
- **No-FOUC via import side-effect in main.tsx**: applicare la classe prima del render evita il
  flash di tema sbagliato.

### Gotcha / attenzione

- Il `@media (prefers-reduced-motion)` in CSS NON copre le animazioni JS di Motion (scale/opacity
  loop, varianti) → serve `useReducedMotion()` a livello di componente. Fatto su tutti e 3 i punti.
- L'entrata dei bubble usa `key` stabile: se in futuro si cambia la key (es. index) ri-animerebbe
  ad ogni token di streaming — da non fare.
- Il bundle è salito a ~1001KB (Motion + Monaco + xterm): warning chunk >500KB atteso, lazy-split
  rimandato a Fase 10.

---

## 2026-06-26 · Fase 8 — Differenziatori UX (COMPLETA)

**Fase:** 8.1–8.3 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (prossimo)

### Cosa è cambiato

**`src/opencode/session.ts`** — aggiornato
- `useRevertSession()`: `POST /session/{id}/revert` con `{ messageID }`; invalida `detail` + `messages` cache
- `useUnrevertSession()`: `POST /session/{id}/unrevert`; invalida `detail` + `messages` cache

**`src/stores/ui.store.ts`** — aggiornato
- Aggiunto `commandPaletteOpen: boolean` + `openCommandPalette()` + `closeCommandPalette()`
- Aggiunto `settingsOpen: boolean` + `openSettings()` + `closeSettings()`
- `BottomTab` esteso con `"timeline"`

**`src/features/checkpoints/CheckpointTimeline.tsx`** (nuovo)
- Legge `session?.revert?.messageID` come indicatore del punto di rewind corrente
- Merge storico (`sessionMsgsData`) + live (`liveMessages`) per avere tutti gli step in ordine
- Banner amber "Session reverted — history truncated at checkpoint" con pulsante `Restore` (`useUnrevertSession`)
- Timeline verticale `border-l` con dot per ogni step; dot amber sul checkpoint revert
- Ogni card: "Step N", tempo relativo, token totali, costo, `provider/model`
- Pulsante "Rewind to here" (invisibile sul checkpoint corrente) → `useRevertSession`
- Elementi precedenti al checkpoint revert: `opacity-40`
- Stato di caricamento `pendingId` per disabilitare i pulsanti durante la mutazione

**`src/features/commandpalette/CommandPalette.tsx`** (nuovo)
- Overlay full-screen con `bg-black/60`; click fuori → chiude
- Gruppo **Actions** (7 voci): New Session, Toggle Terminal, Open Inspector, Open Timeline,
  Open Web Preview (con URL rilevato come descrizione), Open Settings, Switch Model
- Gruppo **Sessions**: sessioni top-level (`!parentID`) ordinate per `updated` desc, max 12
- Ricerca fuzzy su `label + description + group` (lowercase)
- Navigazione tastiera: ↑↓ sposta indice, Enter seleziona, Escape chiude
- `data-idx` sugli elementi per `scrollIntoView({ block: 'nearest' })`
- Attivazione globale via listener `Ctrl+K`/`Cmd+K` in `App.tsx`

**`src/features/statusbar/StatusBar.tsx`** (nuovo)
- Strip 24px (`h-6 shrink-0`) sempre visibile sotto il bottom panel in `App.tsx`
- Progress bar context window: `(lastMsg.tokens.input / model.limit.context) * 100`
- Color coding barra + testo: verde < 65%, amber 65–85%, rosso > 85%
- Contatore passi: "N msgs in ctx" se ci sono context entries, altrimenti "N step(s)"
- Costo cumulato sessione: somma `assistantMsgs.reduce((acc, m) => acc + m.cost, 0)`
- Color coding costo: grigio < $0.10, foreground $0.10–$0.50, amber > $0.50
- Pill `provider/model` a destra (dall'ultimo `AssistantMessage`)
- Empty state se `!activeSessionId`

**`src/features/chat/ChatShell.tsx`** — aggiornato
- Rimosso `useState settingsOpen` e `SettingsModal` interno
- Prop `onOpenSettings?: () => void` — il gear icon chiama questa prop (o `openSettings` dallo store come fallback)
- `SettingsModal` spostato in `App.tsx` come overlay globale

**`src/App.tsx`** — riscritto
- Tab "Timeline" nel bottom panel → `<CheckpointTimeline />`
- `<StatusBar />` sempre renderizzato sotto il bottom panel (fuori dal conditional `bottomOpen`)
- Overlay globali in fondo: `{commandPaletteOpen && <CommandPalette />}`, `{settingsOpen && <SettingsModal />}`
- Listener globale `Ctrl+K`/`Cmd+K` via `useCallback(handleGlobalKey)` + `useEffect`

### Perché / decisione

- **settingsOpen nello store**: sposto l'apertura settings in `ui.store` perché sia `ChatShell`
  (gear icon) che `CommandPalette` ("Open Settings") devono aprire lo stesso modal. Altrimenti
  servivano prop-drilling o un secondo `useState` incoerente.
- **StatusBar sempre visibile**: la barra di stato non è parte del bottom panel collassabile —
  è un indicatore persistente come in VS Code/JetBrains. Posizionata fuori dal `bottomOpen` block.
- **Merge live+storico in CheckpointTimeline**: stesso pattern di ContextInspectorPanel e StatusBar
  per avere i dati più recenti anche durante uno step in corso.
- **CommandPalette: max 12 sessioni**: limita il risultato per non sovraccaricare la palette;
  sessioni figlie (`parentID`) escluse perché non navigabili direttamente dalla palette.

### Gotcha / attenzione

- `session?.revert?.messageID` è `undefined` quando non c'è revert attivo (non `null`)
- La CI gate prettier ha già colpito una volta (commit `cc2f3f0`): SEMPRE `pnpm prettier --write`
  prima del commit
- Il chunk `monaco-editor` supera 500KB — warning atteso, rimandato a Fase 10 (lazy split)

---

## 2026-06-26 · Fase 7 — Funzioni motore nella GUI (COMPLETA)

**Fase:** 7.1–7.4 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (prossimo)

### Cosa è cambiato

**`src/opencode/config.ts`** (nuovo)
- `configKeys`: `config()`, `agents()`, `mcp()`, `children(sessionId)` — key factory TQ
- `useConfig()`: `GET /config` → `Config`; `staleTime: 30_000`
- `useUpdateConfig()`: legge config corrente, merge+write via `PUT /config`; invalida cache
- `useSetAuth(providerId, key)`: `PUT /auth/{id}` con `{ type: "api", key }` → setta chiave provider
- `useAgents()`: `GET /agent` → `Array<Agent>`; `staleTime: 60_000`
- `useMcpStatus()`: `GET /mcp` → `Record<name, { connected, tools?, error? }>`; `staleTime: 10_000`; `retry: false`
- `useSessionChildren(sessionId)`: `GET /session/{id}/children` → `Array<Session>` (subagenti)

**`src/features/settings/ModelSwitcher.tsx`** (nuovo)
- Pill compatto nell'header di ChatShell: `providerName` grigio + `modelId` bold + chevron
- Click → panel a scomparsa (close-on-click-outside tramite `mousedown` listener)
- Provider raggruppati con header uppercase + indicatore env-var richieste
- Input inline chiave API (type=password) per provider con `env[]`; salva con `useSetAuth`
- Riga modello: nome + context limit in K + checkmark se attivo
- Selezione → `useUpdateConfig({ model: "providerId/modelId" })`

**`src/features/settings/SettingsModal.tsx`** (nuovo)
- Overlay con ESC + click-outside per chiudere
- Tab **Agents & Skills** (`SkillsTab`):
  - Lista da `useAgents()`: badge mode (subagent=amber / primary=blue / all=gray),
    badge `built-in`, modello assegnato se presente, tool abilitati come chip
  - Empty state, loading spinner
- Tab **MCP Servers** (`McpTab`):
  - Legge `config.mcp` per le definizioni + `useMcpStatus()` per lo stato run-time
  - Badge `local`/`remote` + badge `connected`/`disconnected`
  - Tool list (prime 8 + "+N more")
  - Toggle `enabled` via `config.update` + pulsante rimozione
  - Form "Add local server" (comando) / "Add remote" (URL) → `config.update`

**`src/features/chat/ChatShell.tsx`** — aggiornato
- Import: `ModelSwitcher`, `SettingsModal`, `Settings` (lucide)
- `useState settingsOpen` + `SettingsModal` montato come overlay quando aperto
- `ModelSwitcher` inserito nel gruppo pulsanti dell'header (prima di TerminalSquare)
- Gear `Settings` icon a destra → apre `SettingsModal`

**`src/opencode/session.ts`** — aggiornato
- Aggiunto `useSessionChildren(sessionId)`:
  `GET /session/{id}/children` → `Array<Session>`; `staleTime: 10_000`
  Query key: `[...sessionKeys.detail(id), "children"]`

**`src/features/sessions/SessionSidebar.tsx`** — aggiornato
- Import: `Bot`, `ChevronRight`, `useSessionChildren`
- Main list filtrata a sole sessioni top-level (`!s.parentID`)
- Nuovo componente `SubagentList({ parentId })`:
  - Usa `useSessionChildren` solo per la sessione attiva
  - Lista indentata con `border-l` + icone `ChevronRight` + `Bot`
  - Pulsante amber pulsante se il subagente è in running
  - Cliccabile → `setActiveSession(child.id)` (permette di ispezionare il contesto subagente)

**`src/opencode/useChatEvents.ts`** — aggiornato
- Import: `EventSessionCreated`
- Nuovo handler `"session.created"`: invalida `sessionKeys.list()` e children del parent
  (key: `[...sessionKeys.detail(parentId), "children"]`) se `parentID` presente

### Perché / decisione

- **Config merge-then-write**: l'endpoint `PUT /config` accetta una Config completa — si legge
  lo stato corrente prima di ogni update per non perdere campi non toccati.
- **SessionChildren solo per sessione attiva**: i subagenti appaiono solo durante l'esecuzione del
  parent; mostrare tutti gli alberi di tutte le sessioni storiche appesantirebbe la sidebar e
  richiederebbe troppi fetch. Si carica il subtree solo on-demand.
- **`retry: false` per useMcpStatus**: l'endpoint `/mcp` può non essere disponibile se OpenCode
  non ha MCP configurato; il retry automatico produrrebbe console noise inutile.
- **No enable/disable agente da GUI**: l'SDK non espone un endpoint per abilitare/disabilitare
  agenti singoli — sarebbe una modifica diretta al file `AGENTS.md` del progetto utente, fuori scope MVP.

### Gotcha / attenzione

- `McpStatusResponses[200]` è tipato `unknown` nell'SDK → cast a `Record<string, {...}>` lato GUI;
  il formato reale va verificato a run-time con un'istanza live di OpenCode
- L'input chiave API è `type="password"` → la chiave non viene mai mostrata in chiaro ma
  è comunque trasmessa via HTTP locale (localhost only — accettabile)
- `subagent` nella sidebar si vede solo durante la sessione attiva; sessioni figlie di sessioni
  inattive non vengono mostrate (scelta MVP)
- Il warning "chunks > 500KB" viene da Monaco + xterm.js; rimandato a Fase 10 (lazy split)

---

## 2026-06-26 · Fase 6 — Context Inspector (COMPLETA)

**Fase:** 6.1–6.5 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (prossimo)

### Cosa è cambiato

**`src/opencode/context.ts`** (nuovo)
- `contextKeys`: factory chiavi TanStack Query (`["context","messages",sid]`, `["config","providers"]`)
- `ContextEntry { info: { id, role, sessionID? }, parts? }`: shape minimale del contesto
- `useContextMessages(sessionId)`: raw `fetch` verso `/api/session/{id}/context`
  (endpoint non esposto nell'SDK) → `ContextEntry[]`; `staleTime: 15_000`
- `useProviders()`: `getClient().config.providers()` → `Provider[]` con `models[id].limit.context`;
  `staleTime: 60_000`
- `useContextInvalidate()`: helper per invalidare la cache context messages

**`src/opencode/useChatEvents.ts`** — aggiornato
- Import aggiunto: `EventSessionCompacted` da `@opencode-ai/sdk/client`
- Import aggiunto: `contextKeys` da `./context`
- Nuovo handler `"session.compacted"`: invalida `contextKeys.messages(sid)` E
  `sessionKeys.messages(sid)` — garantisce che Inspector e lista messaggi si aggiornino
  subito dopo una compaction

**`src/stores/ui.store.ts`** — aggiornato
- `BottomTab` esteso: `"terminal" | "diff" | "inspector"` (era `"terminal" | "diff"`)

**`src/features/inspector/ContextInspectorPanel.tsx`** (nuovo)
- Helper `fmtNum(n)`: K/M formatting (`45K`, `1.23M`)
- Helper `fmtCost(c)`: `$0.00` / `$0.0000` / `$0.000000` per diversi ordini di grandezza
- `ROLE_META`: badge colorati per `user/assistant/system/tool/summary`
- Sub-components `SectionLabel` e `StatCell` locali (nessun export)
- **Merge storico + live**: combina `useSessionMessages` (dati TQ cached) con
  `useChatStore().liveMessages` (SSE in-flight) in `Map<id, AssistantMessage>`;
  sort per `time.created` — l'ultimo messaggio è sempre il più recente
- **Sezione "Context window"**: `lastMsg.tokens.input` come proxy dei token correnti;
  `contextLimit` da `Provider.models[modelID].limit.context`; progress bar colorata
  (green/amber/red per 0–65% / 65–85% / >85%); label `%` + `fmtNum tokens / limit`;
  fallback se `contextLimit === 0` ("Send a prompt to see context usage")
- **Sezione "Session totals"**: reduce su tutti i messaggi assistant per
  `input/output/reasoning/cacheRead/cacheWrite/cost`; griglia 3×2; cost in accent color
- **Sezione "In context"**: breakdown per ruolo da `contextEntries` con barre proporzionali
  (larghezza = `share * 0.8`px, min 4px); contatore totale nel titolo

**`src/App.tsx`** — aggiornato
- Import `ContextInspectorPanel` aggiunto
- Nuovo `<BottomTabButton tab="inspector" label="Inspector" …/>` (sempre visibile,
  non condizionale su `selectedFilePath` come il tab "Diff")
- Pannello body per Inspector:
  `<div className={cn("h-full", bottomTab==="inspector" ? "block" : "hidden")}>`

### Perché / decisione

- **`Session` type SDK senza token/cost**: la struttura dati del contesto vive su
  `AssistantMessage.tokens.*` e `.cost` (per step). L'aggregazione va fatta lato GUI.
- **Raw fetch per `/context`**: l'endpoint non è esposto dall'SDK generato; si usa
  `getBaseUrl()` (già esportato da `client.ts`) per costruire l'URL manualmente.
- **Proxy "token correnti" = `lastMsg.tokens.input`**: l'input token count dell'ultimo
  step include già il contesto completo (history + context window) — è il dato più
  preciso disponibile senza un endpoint dedicato.
- **Nessun chart Recharts per ora**: la griglia + progress bar è più leggibile e meno
  costosa in bundle size per l'MVP. Recharts rimandato a Fase 9 (pass estetico).

### Gotcha / attenzione

- `Array.at(-1)` non disponibile nel target TS: sostituito con
  `arr[arr.length - 1]` per evitare l'errore `Property 'at' does not exist`
- `useContextMessages` usa `staleTime: 15_000` — potrebbe mostrare dati leggermente
  obsoleti; l'invalidation su `session.compacted` garantisce l'aggiornamento post-compaction
- Il breakdown "In context" mostra i ruoli così come arrivano dall'endpoint
  (es. `"tool"` potrebbe essere `"tool_result"` — dipende da OpenCode); `ROLE_META`
  ha un fallback `bg-slate-500` per ruoli sconosciuti
- La tab "Inspector" rimane visibile anche senza sessione attiva: mostra
  "No active session" come empty state (coerente con il resto dei panel)

---

## 2026-06-26 · Fase 5 — Selezione visuale degli elementi (COMPLETA)

**Fase:** 5.1–5.5 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (prossimo)

### Cosa è cambiato

**`src/stores/selection.store.ts`** (nuovo)
- `SelectedElement { file, line, col, tagName, outerHTML }`
- Stato: `selectionMode`, `hoveredElement`, `selectedElement`, `composeText`, `inspectorReady`
- Azioni: `toggleSelectionMode`, `setSelectionMode`, `setHoveredElement`, `setSelectedElement`,
  `setComposeText`, `setInspectorReady`, `clearSelection`

**`src/features/preview/ForgiaInspectorPlugin.ts`** (nuovo)
- Plugin Vite `forgiaInspector()`: apply `"serve"` only (dev mode)
- `transformIndexHtml` → inietta `INSPECTOR_SCRIPT` come `<script>` a fine `<body>`
- `INSPECTOR_SCRIPT` (JS vanilla, ~120 righe):
  - `getFiberSource(el)`: trova chiave `__reactFiber$*` o `__reactInternals$*` sull'elemento,
    naviga `fiber.return` fino a `fiber._debugSource` (file/line/col)
  - `getAttrSource(el)`: fallback a `data-forgia-loc="file:line:col"` attribute
  - Overlay highlight amber: `<div id="__forgia_hl__">` + tooltip con basename:riga
  - `onMove/onClick` in capture phase → postMessage `forgia:hover/select` al parent
  - `onClick` usa `e.stopImmediatePropagation()` per bloccare l'azione originale
  - Ascolta `forgia:enable/disable/ping` dal parent
  - Segnala `forgia:ready` al DOMContentLoaded, risponde `forgia:pong` ai ping

**`src/features/preview/ElementCompose.tsx`** (nuovo)
- Visibile solo quando `selectedElement != null` (ritorna `null` altrimenti)
- Row 1: badge `<tag>`, `file.tsx:line`, outerHTML troncata (80 chars), open-in-editor, dismiss
- Row 2: input testo autoFocus + pulsante "✦ Edit"
- `buildPrompt(file, line, tagName, outerHTML, userText)`: compone prompt strutturato
  per OpenCode con path assoluto, markdown code block HTML, e il testo utente
- `handleSend`: `useSendPrompt.mutate({ sessionId, text: prompt })` + `clearSelection()`
- `handleKeyDown`: Enter=send, Escape=dismiss
- `handleOpenEditor`: `openFile(file, line)` → Monaco diff panel

**`src/features/preview/PreviewPanel.tsx`** — aggiornato
- Import: `useSelectionStore`, `SelectedElement`, `ElementCompose`
- Nuovo pulsante `Crosshair` nel toolbar (tra reload e URL bar):
  glow amber + ring quando `selectionMode === true`
- Hint sotto toolbar: "Aggiungi forgiaInspector() al tuo vite.config.ts"
  visibile solo se `selectionMode && !inspectorReady`
- `sendToIframe(msg)`: `useCallback` stabile, try/catch per cross-origin silence
- `selectionModeRef`: ref aggiornata su ogni toggle — il listener messaggio legge
  questa ref senza dover ri-registrarsi
- `useEffect(message listener)`: gestisce `forgia:ready|pong|hover|select`
- `useEffect(sync mode)`: quando `selectionMode` cambia e inspector è pronto →
  invia `forgia:enable` o `forgia:disable`
- `handleIframeLoad`: reset `inspectorReady` + ping dopo 150ms (dà tempo allo script di registrarsi)
- `handleToggleSelection`: clearSelection se si disabilita, poi toggle
- Reset completo (clearSelection, setInspectorReady false, setSelectionMode false)
  quando `previewUrl` cambia

### Perché / decisione (D1)

React in dev mode abilita `@babel/plugin-transform-react-jsx-source` automaticamente
(via `@vitejs/plugin-react`), che popola `fiber._debugSource` su ogni componente.
Questo ci dà la mappatura DOM→file:riga **senza nessun Babel plugin extra**,
purché la pagina sia una React app in dev mode.

La comunicazione avviene via `postMessage('*')`: sicuro in un contesto desktop locale
(nessun altro origine riceve il messaggio perché non ci sono altre pagine).

### Gotcha / attenzione

- `_debugSource` non è disponibile nelle build di produzione — il fallback
  `data-forgia-loc` richiede un Babel transform separato (non implementato per ora)
- `Object.keys(el)` per trovare `__reactFiber$*` è O(n) sul numero di proprietà
  dell'elemento; accettabile (gli elementi DOM hanno poche proprietà)
- `e.stopImmediatePropagation()` nel capture phase blocca tutto — se altri listener
  capture sono registrati dopo il nostro script, non vengono chiamati
- Il tooltip posizionato `bottom: calc(100% + 5px)` può uscire dallo schermo per
  elementi vicino al bordo superiore; non critico per l'MVP
- `autoFocus` su `ElementCompose` input funziona correttamente perché il componente
  è montato/smontato (non semplicemente nascosto) al cambio di `selectedElement`

---

## 2026-06-26 · Fase 4.3 — Anteprima web (iframe)

**Fase:** 4.3 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (prossimo)

### Cosa è cambiato

**`src/features/preview/PreviewPanel.tsx`** (nuovo)
- `<iframe src={previewUrl}>` con `sandbox` permissivo (scripts/same-origin/forms/popups/modals)
- Toolbar: reload (incrementa `reloadKey` → rimonta iframe), barra URL editabile
  (Enter → `openPreview`, normalizza schema `http://`), open-external (`window.open`), close
- `useEffect` sincronizza l'address bar con `previewUrl` esterno
- Mostrato solo se `previewUrl != null`

**`src/App.tsx`** — aggiornato
- `<PreviewPanel />` come **terza colonna** a destra (sibling di `<main>`),
  `w-1/2 border-l`, montata se `previewUrl != null`
- Layout finale: `[sidebar 256] [main flex-1] [preview w-1/2?]`

**`docs/04-adr-web-preview.md`** (nuovo)
- ADR: iframe ora vs webview WRY nativa poi

### Perché / decisione

iframe scelto per la 4.3 perché testabile senza Rust (cargo bloccato in remoto) e
perché i dev server locali non bloccano l'embedding. L'HMR è gestito dal client
del dev server dentro l'iframe — zero logica lato GUI oltre al reload manuale.

### Gotcha / attenzione

- **Limite chiave per Fase 5:** l'iframe verso `localhost:PORT` è **cross-origin**
  rispetto all'app Tauri (`tauri://localhost`), quindi `iframe.contentWindow.document`
  NON è accessibile → niente injection diretta dello script di selezione visuale.
  Soluzioni: plugin nel progetto utente (postMessage) o webview WRY con
  `initialization_script`. Documentato nell'ADR 04.
- `reloadKey` come `key` dell'iframe forza un remount completo (reload pulito)
- `window.open` funziona in dev; in Tauri valutare il plugin opener per aprire nel browser di sistema

---

## 2026-06-26 · Fase 4.2 — Rilevamento dev server da output

**Fase:** 4.2 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (prossimo)

### Cosa è cambiato

**`src/features/terminal/detectDevServer.ts`** (nuovo)
- `detectDevServerUrl(text): string | null`
- `URL_RE`: `https?://(localhost|127.0.0.1|0.0.0.0)(:port)?(/path)?`
- `BARE_RE`: `(localhost|127.0.0.1):port` senza schema
- Normalizza `0.0.0.0` → `localhost`, ritorna URL `http://host:port/`
- Testato su output reali Vite (`➜ Local: http://localhost:5173/`), Next, CRA

**`src/stores/preview.store.ts`** (nuovo)
- `detectedUrl` (suggerimento), `previewUrl` (caricato in 4.3), `dismissed`
- `setDetectedUrl` (ignora se invariato o già in preview), `openPreview`,
  `closePreview`, `dismissDetected`

**`src/features/terminal/useTerminalEvents.ts`** — aggiornato
- `scanForDevServer(text)` su:
  - `state.output` (completed)
  - `state.error` (error)
  - `JSON.stringify(state.metadata)` (running) — i dev server NON si completano
- Estrazione `command` resa robusta con cast `Record<string,unknown>` (input
  è `unknown` in stato running)

**`src/features/preview/DevServerBanner.tsx`** (nuovo)
- Banner ambra visibile se `detectedUrl && !dismissed && detectedUrl !== previewUrl`
- Mostra l'URL, pulsante "Open preview" (→ `openPreview`), X per dismiss

**`src/features/chat/ChatShell.tsx`** — aggiornato
- `<DevServerBanner />` montato sotto l'header

### Perché / decisione

I processi long-running (dev server) restano in stato `running` e non emettono
mai `state.output` (riservato a `completed`). Per questo la detection scansiona
anche `state.metadata` durante il running. Il banner separa la "scoperta"
(4.2) dall'"apertura anteprima" (4.3): `openPreview` setta solo `previewUrl`.

### Gotcha / attenzione

- La regex `\d{2,5}` per la porta evita falsi positivi su numeri brevi
- `0.0.0.0` non è raggiungibile come URL nel browser → normalizzato a `localhost`
- In stato `running`, `state.input` è `unknown` (non l'oggetto): serve cast esplicito
- La detection da `metadata` dipende da cosa OpenCode espone lì; se il dev server
  scrive solo su un PTY non riflesso in metadata, l'URL va digitato a mano in 4.3

---

## 2026-06-26 · Fase 4.1 — Terminale xterm.js

**Fase:** 4.1 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (prossimo)

### Cosa è cambiato

**Dipendenze** — `@xterm/xterm@6`, `@xterm/addon-fit`, `@xterm/addon-web-links`

**`src/stores/terminal.store.ts`** (nuovo)
- `TermEntry { id, command, output?, error? }`
- `entries: TermEntry[]` + `writtenIds: Set<string>` (dedupe per part.id, dato che
  un ToolPart emette più update SSE)
- `addEntry` (no-op se id già presente), `clear`

**`src/stores/ui.store.ts`** (nuovo)
- `bottomOpen: boolean`, `bottomTab: 'terminal' | 'diff'`
- `openBottom(tab)`, `closeBottom()`, `setBottomTab(tab)`, `toggleTerminal()`
  (toggle: se terminale già aperto → chiude, altrimenti apre+switch a terminal)

**`src/features/terminal/useTerminalEvents.ts`** (nuovo)
- Hook montato in ChatShell (sempre attivo, anche con pannello chiuso)
- Sottoscrive `message.part.updated`, filtra `part.type === "tool"` con
  `tool` che include "bash", su `completed`/`error` aggiunge entry
- Command estratto da `state.input.command` (fallback al nome tool)

**`src/features/terminal/TerminalPanel.tsx`** (nuovo)
- Istanza xterm read-only (`disableStdin: true`, `cursorBlink: false`)
- Tema `FORGE_THEME`: bg `#0a0c0e`, fg slate, cursor amber `#f59e0b`
- ANSI: `$ command` in cyan, output normale, errori in rosso
- `nl()` converte `\n` → `\r\n` (xterm richiede CR+LF)
- FitAddon + ResizeObserver per adattare le dimensioni
- Scrive entry esistenti al mount + nuove incrementalmente (`writtenCountRef`)
- Se `entries.length < writtenCount` → store pulito → `term.clear()`
- WebLinksAddon per URL cliccabili (utile per la 4.2)
- Header con tasto "Clear"

**`src/App.tsx`** — ristrutturato bottom panel
- Tab-bar `Terminal | Diff` (Diff appare solo se `selectedFilePath != null`)
- `h-[42vh]` come prima; terminale resta montato con `display:hidden` quando
  non attivo (preserva lo scrollback xterm); diff montato solo se file aperto
- `useEffect`: se il file viene chiuso mentre il tab diff è attivo → torna a terminal
- Tasto X chiude tutto il pannello (`closeBottom`)

**`src/features/chat/ChatShell.tsx`** — aggiornato
- Monta `useTerminalEvents()`
- Pulsante toggle terminale (`TerminalSquare`) nell'header, evidenziato se attivo

**`src/stores/file.store.ts`** — aggiornato
- `openFile(path, line?)` ora chiama `useUIStore.getState().openBottom("diff")`
  (apertura file → mostra diff). Cross-store via `getState()` (no hook in store)

**`src/features/filetree/FileTree.tsx`** — aggiornato
- Selezione file usa `openFile` invece di `setSelectedFilePath` (così apre il pannello)

### Perché / decisione

Il "terminale" è read-only: OpenCode esegue già il PTY lato motore, noi mostriamo
l'output dei tool bash. Non serve un PTY interattivo nella GUI (coerente con
PROGETTO.md §3). La sottoscrizione SSE vive in un hook sempre montato (ChatShell),
non nel pannello, così non si perde output quando il terminale è nascosto.

### Gotcha / attenzione

- xterm richiede `\r\n`, non `\n` — la funzione `nl()` lo gestisce
- Il terminale nascosto via `display:hidden` ha dimensioni 0; il ResizeObserver
  ri-esegue `fit()` quando torna visibile (xterm ricalcola righe/colonne)
- `import "@xterm/xterm/css/xterm.css"` è obbligatorio o il layout è rotto
- Cross-store call: `file.store` importa `ui.store` (no ciclo: ui non importa file)
- Bundle salito a 826KB (xterm ~200KB gzip) — il warning Vite >500KB è atteso;
  code-splitting di xterm/Monaco con `lazy()` rinviato a Fase 10

---

## 2026-06-26 · Fase 3.3 — Apertura file alla riga esatta

**Fase:** 3.3 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (prossimo)

### Cosa è cambiato

**`src/stores/file.store.ts`** — aggiornato
- Aggiunto `selectedLine: number | null`
- Aggiunto `openFile(path, line?)`: azione atomica che aggiorna entrambi
- `setSelectedFilePath` ora resetta anche `selectedLine` a null

**`src/features/filetree/FileDiffPanel.tsx`** — aggiornato
- `revealLine(editor, monaco, line, decoRef)`: helper che:
  1. `editor.revealLineInCenter(line)` — scrolla alla riga
  2. `editor.setPosition({ lineNumber: line, column: 1 })` — posiziona cursore
  3. `editor.deltaDecorations(prev, [...])` — evidenzia la riga con classe `monaco-target-line`
- `editorRef`, `diffEditorRef`, `monacoRef`, `decoRef`: ref per mantenere l'istanza Monaco
- `handleEditorMount(editor, monaco)`: salva ref + rivela riga al mount
- `handleDiffMount(editor, monaco)`: salva ref diff + rivela su `getModifiedEditor()`
- `useEffect([selectedLine])`: se `selectedLine` cambia dopo il mount, ri-rivela
- `targetLine = selectedLine ?? patch?.hunks?.[0]?.newStart ?? null`: fallback automatico
  alla prima riga modificata dal diff se non specificata esplicitamente
- Header mostra `path:riga` quando `targetLine != null`
- Tipi: `import type { editor as MonacoEditorNS } from "monaco-editor"` per `ICodeEditor`
  e `IDiffEditor` (evita errore "ICodeEditor not assignable to IStandaloneCodeEditor")

**`src/features/chat/ToolCallCard.tsx`** — aggiornato
- `extractFileRef(input)`: ispeziona `input` (tipicamente `Record<string,unknown>`)
  cercando chiavi `path | filePath | file_path | file` per il path e
  `line | startLine | start_line | lineNumber` per il numero di riga
- Chip `ExternalLink + basename:N` nel header della card (dopo il titolo, prima del badge)
- Click sul chip: `e.stopPropagation()` + `openFile(path, line)` → apre pannello diff
- Il chip mostra solo il basename (non il path completo) truncato a `max-w-[120px]`

**`monaco-editor@0.55.1`** installato come `devDependency` per accedere ai tipi
`ICodeEditor`, `IDiffEditor`, `IStandaloneCodeEditor` senza far partire il bundle.

### Perché / decisione

`getModifiedEditor()` ritorna `ICodeEditor`, non `IStandaloneCodeEditor`. Usare il
tipo base corretto (`ICodeEditor`) evita errori TypeScript senza richiedere cast.
Il fallback a `hunks[0].newStart` è utile quando l'agente edita un file senza
specificare una riga — il pannello si posiziona automaticamente alla prima modifica.

### Gotcha / attenzione

- `editor.setPosition` funziona anche in modalità read-only (non lancia errori)
  ma non mostra un cursore visibile; `deltaDecorations` con `className` richiede
  CSS corrispondente (da aggiungere in Fase 9 — `index.css`: `.monaco-target-line`)
- `monaco-editor` e `@monaco-editor/react` devono essere alla stessa versione major
  per evitare conflitti di tipi; attualmente CDN carica Monaco 0.52, ma i tipi
  installati sono 0.55 — non causa problemi a runtime ma da allineare in Fase 10
- Il chip `ExternalLink` usa `e.stopPropagation()` per evitare che il click
  espanda/collassi la card contemporaneamente

---

## 2026-06-26 · Fase 3.2 — Diff inline Monaco

**Fase:** 3.2 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (prossimo)

### Cosa è cambiato

**`@monaco-editor/react@4.7.0`** — installato (usa CDN di default in Tauri, bundling locale in Fase 10)

**`src/stores/file.store.ts`** (nuovo)
- Zustand store minimo: `selectedFilePath: string | null` + `setSelectedFilePath`
- Senza persist (la selezione è session-lived)

**`src/features/filetree/FileDiffPanel.tsx`** (nuovo)
- `getLang(path)`: mappa estensione → Monaco language ID
- `reverseApplyPatch(modified, patch)`: ricostruisce il contenuto originale
  dai patch hunks. Algoritmo:
  - Scansiona `modified` con `modIdx`
  - Per ogni hunk: copia le righe invariate (`modIdx < newStart0`), poi
    processa le righe: `-` → push in origLines (solo in original); `+` →
    incrementa modIdx (solo in modified); ` ` → push + incrementa (in entrambi)
  - Dopo tutti gli hunks: copia le righe rimanenti
  - Salta le righe `\\ No newline at end of file`
- Header: `GitBranch` icon + path completo + badge git con contatori `+N/-N` + tasto X
- Body:
  - Loading / errore API
  - `hasDiff = !!fileContent.patch` → `<DiffEditor>` Monaco side-by-side (original vs modified)
  - `!hasDiff` → `<Editor>` Monaco read-only (vista file pulito)
  - `!enabled` → placeholder "Select a file..."
- `MONACO_OPTIONS`: minimap off, fontSize 12, readOnly, no scrollBeyondLastLine

**`src/features/filetree/FileTree.tsx`** — aggiornato
- Selection ora usa `useFileStore`: `setSelectedFilePath` invece di `useState` locale
- `selectedFilePath` passato come `selectedPath` ai `FileTreeNode`

**`src/App.tsx`** — aggiornato
- `const { selectedFilePath } = useFileStore()` per conditionally renderizzare `FileDiffPanel`
- Pannello diff: `h-[42vh] shrink-0` appeso in fondo a `<main>`, diviso da `h-px` divider
- Chat: `min-h-0 flex-1` per cedere spazio al diff panel

### Perché / decisione

Monaco DiffEditor side-by-side è la scelta più leggibile per code review.
La ricostruzione del "before" dai patch hunks evita una seconda chiamata API
(non esiste endpoint `/file/original` nell'SDK) ed è deterministica.
CDN loading di Monaco (`@monaco-editor/react` default) è accettabile in Tauri
(il processo webview ha accesso a internet); bundling locale sarà fatto in Fase 10.

### Gotcha / attenzione

- `FileContent.patch.hunks[i].newStart` è **1-based** → convertire a 0-based (`-1`) prima di confrontare con l'array di righe
- Il patch può contenere righe `\\ No newline at end of file` — filtrarle con `line.startsWith("\\ ")`
- Monaco DiffEditor richiede `height: 100%` sul container — usare `min-h-0 flex-1` sul wrapper
- `@monaco-editor/react` carica Monaco dal CDN `cdn.jsdelivr.net` di default; non
  serve config extra per dev/Tauri, ma la prima apertura del pannello ha un piccolo delay
- La variabile `filename` in `FileDiffPanel` era dichiarata ma inutilizzata — rimossa prima del commit

---

## 2026-06-26 · Fase 3.1 — File tree del progetto

**Fase:** 3.1 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (prossimo)

### Cosa è cambiato

**`src/opencode/file.ts`** (nuovo)
- `fileKeys` factory per cache keys coerenti
- `useProjectCurrent()`: `client.project.current()` → `Project` (campo `worktree` = path assoluto del progetto)
- `useFileList(path, enabled?)`: `client.file.list({ query: { path } })` → `Array<FileNode>`, `staleTime: 5s`
- `useFileRead(path, enabled?)`: `client.file.read({ query: { path } })` → `FileContent`
- `useFileStatus()`: `client.file.status()` → `Array<{ path, status, added, removed }>`, `staleTime: 3s`
- `useInvalidateFiles()`: invalida tutto `fileKeys.all`

**`src/features/filetree/FileTree.tsx`** (nuovo)
- `FileTreeNode`: componente ricorsivo
  - `isDir && expanded` → chiama `useFileList(node.path, true)` (lazy-load)
  - Sort: directory prima, poi file, poi alpha
  - Filtro: `!node.ignored` (nasconde file in .gitignore)
  - Icone per estensione (`EXT_MAP`): TS/JS=blu, RS/Go/Py=arancio, JSON=giallo,
    MD/TXT=grigio, TOML/YAML/ENV=viola, CSS=rosa, HTML/SVG=amber, default=muted
  - Badge git: `A` verde / `M` amber / `D` rosso (angolo destro del row)
  - Indentazione: `depth * 12 + 6`px left padding
  - Selezione: `bg-[var(--primary)]/15` + state `selectedPath`
- `FileTree`: componente radice
  - Header: icona Folder + nome progetto (basename di `project.worktree`)
  - Carica root con `useFileList(".")`
  - `statusMap: Map<string, GitStatus>` da `useFileStatus()`
  - `useEffect` → subscribe a `file.edited` e `file.watcher.updated` → `invalidateFiles()`

**`src/features/sessions/SessionSidebar.tsx`** — modificato
- Rimossi `w-56 shrink-0 border-r` dall'outer `<aside>` (ownership spostata al parent)

**`src/App.tsx`** — modificato
- Nuova struttura: wrapper `w-64 shrink-0 border-r` che contiene:
  - `div` con `maxHeight: "45%"` → `<SessionSidebar />`
  - `div h-px` → divider
  - `div flex-1 min-h-0` → `<FileTree />`

### Perché / decisione

File tree lazy: non caricare tutto l'albero all'avvio (potenzialmente migliaia di file).
Ogni directory espande solo i propri figli on-demand. `staleTime` breve (3-5s) per
sentire le modifiche dell'agente quasi in tempo reale senza flooding di richieste.

### Gotcha / attenzione

- `FileListData.query.path` è relativo alla root del progetto; `"."` = root
- `FileNode.ignored` riflette `.gitignore` — filtrarlo per default mantiene l'albero pulito
- `file.watcher.updated` e `file.edited` sono eventi distinti: il primo viene
  dal file system watcher, il secondo viene quando il tool agent scrive un file
- La percentuale `maxHeight: "45%"` su un container `flex-col` con `h-full`
  funziona correttamente perché il parent ha altezza definita
- `useInvalidateFiles` restituisce una funzione stabile — usarla come dipendenza
  nell'`useEffect` è corretto (non causa re-subscribe ripetuti)

---

## 2026-06-26 · Polish — angoli prompt input arrotondati

**Fase:** 2.x polish | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** `e06db57`

### Cosa è cambiato

- `src/features/chat/ChatInput.tsx` — outer container div:
  - `rounded-xl` → `rounded-2xl` (12px → 16px di raggio)
  - aggiunto `overflow-hidden` per clippare i figli al bordo arrotondato

### Perché / decisione

Senza `overflow-hidden` il bordo divisore interno (`border-b` della riga
mode-toggle) "sforava" visivamente agli angoli superiori. `overflow-hidden`
forza tutti i children a stare dentro la shape arrotondata.

### Gotcha / attenzione

Ogni volta che si aggiunge un child con `border-*` o background diverso a un
container `rounded-*`, verificare che il container abbia anche `overflow-hidden`.

---

## 2026-06-26 · Fase 2.5 — Session sidebar

**Fase:** 2.5 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** `4d5971d`

### Cosa è cambiato

**`src/opencode/session.ts`**
- Aggiunto `useDeleteSession()`: chiama `client.session.delete({ path: { id } })`
  e invalida `sessionKeys.list()` on success

**`src/features/sessions/SessionSidebar.tsx`** (nuovo)
- Sidebar 224px (`w-56`), `border-r`, scroll verticale overflow
- Lista sessioni ordinata per `time.updated` DESC
- `relativeTime(ts: number)`: converte timestamp Unix in stringa relativa
  ("just now" / "Xm ago" / "Xh ago" / "Xd ago")
- `SessionRow`: button selezionabile, indicatore running (pallino amber
  `animate-pulse`) o icona `MessageSquare`, titolo troncato, timestamp
- Delete on hover: `Trash2` in `absolute right-1.5` visibile solo su hover e
  non se la sessione è running. `e.stopPropagation()` per evitare la selezione.
- Auto-switch alla sessione adiacente dopo delete (`sorted.find(s => s.id !== id)`)
- Header: label "Sessions" + pulsante `+` (nuovo) che chiama `createSession.mutateAsync`

**`src/App.tsx`**
- Layout 2-colonne: `<SessionSidebar />` + `<main>` flex

### Perché / decisione

Fase 2.5 dal piano. Sidebar come componente separato per tenere `App.tsx` pulito.

### Gotcha / attenzione

- `useDeleteSession` è una mutation — non lancia errori visibili all'utente in
  caso di fallimento API (da gestire in Fase di polish avanzato)
- `relativeTime` usa `ts * 1000` perché il server restituisce secondi Unix,
  non millisecondi

---

## 2026-06-26 · Fase 2.4 — Plan/Build toggle + agent mode

**Fase:** 2.4 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (in 4d5971d)

### Cosa è cambiato

**`src/opencode/session.ts`** — `useSendPrompt`
- Aggiunto parametro `agent?: string` alla mutationFn
- Passato al body del prompt: `...(agent ? { agent } : {})`

**`src/features/chat/ChatInput.tsx`**
- Tipo `AgentMode = "build" | "plan"` esportato
- Array `MODES` con value/label/icon/title per Build (Hammer) e Plan (Map)
- `onSend` ora riceve `(text: string, mode: AgentMode)`
- Riga superiore: pill-toggle Build/Plan, bloccata durante `isRunning`
- Placeholder dinamico con mode attivo

**`src/features/chat/ChatShell.tsx`** — `handleSend`
- Firma aggiornata: `(text: string, mode: AgentMode)`
- Passa `agent: mode` alla mutation `useSendPrompt`

### Perché / decisione

`agent` nel body del prompt è una stringa libera: `"plan"` | `"build"` |
`"general"`. La pill sceglie tra build (scrive file) e plan (solo proposta).

### Gotcha / attenzione

- `AssistantMessage.mode` (campo risposta) rispecchia il mode usato —
  utile in futuro per mostrare badge "Plan" sulle risposte
- Il default è `"build"` — più comune nell'uso quotidiano

---

## 2026-06-26 · Fase 2.3 — HITL (Human-in-the-loop permissions)

**Fase:** 2.3 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (incluso in batch)

### Cosa è cambiato

**`src/opencode/permission.ts`** (nuovo)
- `useRespondPermission()`: mutation che chiama
  `client.postSessionIdPermissionsPermissionId({ path: { id, permissionID }, body: { response } })`
  dove `response: "once" | "always" | "reject"`

**`src/stores/permission.store.ts`** (nuovo)
- Zustand store con `persist` middleware
- `pending: Map<string, Permission>` — permessi in attesa di risposta
- `allowList: Set<string>` — tipi/pattern sempre approvati (persistiti in localStorage)
- `addPending`, `removePending`, `addToAllowList`, `removeFromAllowList`
- `isAutoAllowed(p)`: controlla `allowList.has(p.type)` o pattern match
- Custom `storage` adapter per serializzare `Set` come array in localStorage
  (Zustand persist non gestisce `Set` nativamente)

**`src/opencode/useChatEvents.ts`** — aggiornato
- Aggiunto handler `EventPermissionUpdated`:
  - se `isAutoAllowed(p)` → chiama API direttamente (silent approve)
  - se l'API fallisce → fallback a `addPending(p)` (mostra banner)
  - altrimenti → `addPending(p)` direttamente

**`src/features/chat/PermissionBanner.tsx`** (nuovo)
- Banner ambra fisso sopra l'input
- Mostra titolo permesso + pattern (stringhe o array)
- 3 pulsanti: **Once** (risponde una volta), **Always** (salva tipo in allowList +
  risponde always), **Reject** (risponde reject)
- Usa `useRespondPermission()` + `removePending()` on settle

**`src/features/chat/ChatShell.tsx`** — aggiornato
- `<PermissionBanner />` montato sopra `<ChatInput />`

### Perché / decisione

HITL è fondamentale: l'agente deve chiedere prima di scrivere file sensibili.
Auto-approve silenzioso per tipi già whitelistati migliora il flusso senza
togliere controllo.

### Gotcha / attenzione

- Il metodo SDK per rispondere ai permessi si chiama
  `postSessionIdPermissionsPermissionId` (non sotto `session.`) — nome generato
  dall'OpenAPI, non intuitivo
- `Set` non è serializzabile in JSON → custom storage con `Array.from` / `new Set(arr)`
- `pending` non viene persistito (corretto: i permessi sono session-lived)

---

## 2026-06-26 · Fase 2.2 — Tool-call card

**Fase:** 2.2 | **Branch:** `claude/opencode-project-setup-1i59cg`

### Cosa è cambiato

**`src/features/chat/ToolCallCard.tsx`** (nuovo)
- Prende `part: ToolPart` dall'SDK
- Collapsibile (`useState(false)` → `isOpen`)
- Header: icona tool-specifica (da `TOOL_ICONS: Array<[string, React.ReactNode]>`
  mappato per prefisso del nome tool) + nome tool + badge stato
- Stati: `pending` (grigio), `running` (pulsante), `completed` (verde),
  `error` (rosso)
- Body (se aperto): input JSON (`state.input`) + output/error (`state.output` o
  `state.error`) formattati in `<pre>`

### Perché / decisione

Card generica sufficiente per tutte le fasi iniziali. Monaco diff viene in Fase 3.

### Gotcha / attenzione

- `ToolPart` da SDK ha struttura:
  - `part.tool` = nome tool (stringa)
  - `part.state.status` = `"pending" | "running" | "completed" | "error"`
  - `part.state.input` / `part.state.output` / `part.state.error`
  - NON `{ type: "tool-invocation" }` né `inv.toolName` come in Vercel AI SDK

---

## 2026-06-26 · Fase 2.1 — Chat shell + streaming markdown

**Fase:** 2.1 | **Branch:** `claude/opencode-project-setup-1i59cg`

### Cosa è cambiato

**`src/stores/chat.store.ts`** (nuovo)
- `liveParts: Map<messageId, Map<partId, Part>>` — parti SSE in tempo reale
- `liveMessages: Map<string, Message>` — metadata messaggio (costo, errori, finish)
- `runningSessions: Set<string>` — sessioni attualmente in esecuzione
- Azioni: `updatePart`, `removePart`, `setMessage`, `setSessionRunning`, `clearSession`

**`src/opencode/useChatEvents.ts`** (nuovo)
- Hook React che si sottoscrive a 7 tipi di eventi SSE:
  - `message.part.updated` → `updatePart`
  - `message.part.removed` → `removePart`
  - `message.updated` → `setMessage` + invalidate query
  - `session.updated` → `setSessionRunning(true)`
  - `session.idle` → `setSessionRunning(false)` + invalidate
  - `session.error` → `setSessionRunning(false)` + invalidate
  - `permission.updated` → auto-approve o `addPending` (vedi 2.3)

**`src/features/chat/MarkdownContent.tsx`** (nuovo)
- `ReactMarkdown` + `remarkGfm`
- Stili Tailwind prose-like (heading, code, blockquote, list)
- Cursore animato `animate-pulse` (blinking bar) durante lo streaming

**`src/features/chat/MessageBubble.tsx`** (nuovo)
- `UserBubble`: allineato a destra, sfondo amber/10
- `AssistantBubble`: allineato a sinistra, rendering di:
  - `TextPart` → `<MarkdownContent />`
  - `ReasoningPart` → testo collassato in italic
  - `ToolPart` → `<ToolCallCard />`
- `getErrorMessage(error: AssistantMessage["error"])`: helper per evitare errori
  di tipo sulle union dell'SDK

**`src/features/chat/MessageList.tsx`** (nuovo)
- Merge di `liveParts` (SSE) sopra le parti storiche dalla query
- Auto-scroll via `useRef` + `scrollIntoView({ behavior: "smooth" })`
- Render di `UserBubble` / `AssistantBubble` per ogni messaggio

**`src/features/chat/ChatInput.tsx`** (nuovo → poi modificato)
- Textarea auto-resize (`scrollHeight` con max 200px)
- Enter = invio, Shift+Enter = a capo
- Pulsante Send (blu) o Stop (rosso, quadrato) se running

**`src/features/chat/ChatShell.tsx`** (nuovo)
- Monta `useChatEvents()`
- Auto-crea sessione se non ne esiste una attiva
- `handleSend(text, mode)` → `useSendPrompt.mutateAsync`
- `handleAbort()` → `useAbortSession.mutate`
- Layout verticale: `<MessageList>` + `<PermissionBanner>` + `<ChatInput>`

**`src/App.tsx`** — sostituito hello-world con `<ChatShell />`

### Perché / decisione

Core della UI. Streaming via SSE → Zustand → React render.
Separazione store/events/components per testabilità futura.

### Gotcha / attenzione

- `SessionMessages` dalla API restituisce `Array<{ info: Message; parts: Part[] }>`
  (parti incluse inline, non separate) — non `Message[]`
- `onEventType<T>` richiede explicit type param per il narrowing TypeScript:
  `onEventType<EventMessagePartUpdated>("message.part.updated", ...)` — senza
  `<T>` il compilatore non riesce a narroware `e.properties`
- `AssistantMessage["error"]` è una union complessa — usare helper
  `getErrorMessage` e castare `error.data` come `Record<string, unknown>`

---

## 2026-06-26 · Fix CI — Rust `Emitter` trait + Prettier

**Fase:** bugfix CI | **Branch:** `claude/opencode-project-setup-1i59cg`

### Cosa è cambiato

**`src-tauri/src/lib.rs`**
- Rimosso `use tauri::Manager;` (non usato → warning che rompeva cargo check)
- Rimosso `use tokio::sync::OnceCell;` (non usato)
- Aggiunto `use tauri::Emitter;` — obbligatorio in Tauri 2 per chiamare
  `handle.emit()` (API trait-based, non metodo diretto)

**Tutti i nuovi file `.ts` / `.tsx`** formattati con:
```
pnpm prettier --write "src/**/*.{ts,tsx}"
```

### Perché / decisione

CI aveva due job rossi:
1. **Rust (cargo check)**: `handle.emit()` non trovato → Tauri 2 richiede il
   trait `Emitter` importato esplicitamente
2. **Frontend (lint + build)**: Prettier check falliva su 6 file non formattati

### Gotcha / attenzione

- In Tauri 2 `AppHandle` implementa `Emitter` tramite trait — se il trait non è
  in scope, il metodo `.emit()` semplicemente non esiste a compile-time
- L'ambiente remoto blocca `cargo` direttamente (static.crates.io policy) —
  i check Rust si possono fare solo via CI, non in locale nel container

---

## 2026-06-26 · Fase 1.3–1.6 — Sidecar Rust + SDK layer + Events + ADR

**Fase:** 1.3–1.6 | **Branch:** `claude/opencode-project-setup-1i59cg`

### Cosa è cambiato

**`src-tauri/src/sidecar/mod.rs`** (nuovo)
- `Sidecar` struct con `child: Arc<Mutex<Option<Child>>>` e
  `state: Arc<Mutex<Option<SidecarState>>>`
- `start()`: trova porta libera (`TcpListener::bind("0.0.0.0:0")`), spawna
  `opencode serve --port N --hostname 127.0.0.1`, poll `/health` ogni 200ms
  fino a 10 secondi
- `stop()`: `child.start_kill()` non-blocking
- `Drop` impl: chiama `stop()` → kill-on-drop automatico

**`src-tauri/src/lib.rs`**
- `AppState { sidecar: Arc<Sidecar> }`
- Comandi Tauri: `get_opencode_url`, `stop_opencode`
- Setup: spawna sidecar in background, emette `"opencode-ready"` con `base_url`
  o `"opencode-error"` se fallisce

**`src/opencode/client.ts`** (nuovo)
- Singleton `OpencodeClient` creato con `createOpencodeClient({ baseUrl })`
- `initClient(baseUrl)` — chiamato da `OpencodeProvider` all'evento
  `"opencode-ready"`
- `getClient()` — usato ovunque, lancia errore se non inizializzato
- `getBaseUrl()`, `isClientReady()`

**`src/opencode/session.ts`** (nuovo)
- TanStack Query hooks: `useSessions`, `useSession`, `useSessionMessages`,
  `useCreateSession`, `useSendPrompt`, `useAbortSession`, `useDeleteSession`
- `sessionKeys` factory per cache invalidation coerente

**`src/opencode/events.ts`** (nuovo)
- SSE stream via `getClient().event.subscribe()` (AsyncGenerator)
- `onEvent(handler)` / `onEventType<T>(type, handler)` — pub/sub leggero
- `startEventStream()` / `stopEventStream()` — idempotente

**`src/opencode/OpencodeProvider.tsx`** (nuovo)
- `QueryClientProvider` wrapper
- Ascolta evento Tauri `"opencode-ready"` → chiama `initClient(url)` →
  avvia `startEventStream()`
- Mostra splash/errore durante il boot del sidecar

**`src/stores/session.store.ts`** (nuovo)
- Zustand + persist: `activeSessionId: string | null`
- `setActiveSession(id | null)`

**`docs/03-adr-integration-layer.md`** (nuovo)
- ADR che documenta la scelta: SDK HTTP vs. IPC diretto vs. RPC custom

### Perché / decisione

Fase 1.3–1.6 dal piano. L'SDK ufficiale copre tutti gli endpoint necessari;
non ha senso costruire un layer custom. Sidecar in Rust è più robusto di un
processo figlio JS per kill-on-drop e gestione errori.

### Gotcha / attenzione

- **Import SDK**: sempre da `@opencode-ai/sdk/client`, mai dal root del pacchetto.
  Il root ri-esporta `server.js` che usa `child_process` di Node.js →
  crash in Vite browser build con "module not found"
- `event.subscribe()` restituisce un AsyncGenerator, non un EventSource standard
- Il sidecar può impiegare ~2-3 secondi al primo avvio — il timeout di 10s è
  sufficiente ma da aumentare se `opencode serve` è lento su macchine deboli

---

## 2026-06-26 · Fase 1.1 — Analisi OpenCode OpenAPI

**Fase:** 1.1 | **Branch:** `claude/opencode-project-setup-1i59cg`

### Cosa è cambiato

**Analisi** (nessun codice produttivo, solo documentazione)
- Avviato `opencode serve` (porta 4096)
- Ispezionata l'OpenAPI 3.1: 181 operazioni, 444 schemi
- Validato il rischio §15.2 (Context Inspector): rientrato —
  `Session` e `AssistantMessage` espongono già token/costo nativi,
  `Model.limit.context` contiene la finestra, `GET /session/{id}/context`
  restituisce la ripartizione, eventi `compaction.*` / `context.updated`
  segnalano la compaction

**`docs/01-opencode-openapi-findings.md`** (nuovo) — findings dettagliati
**`CLAUDE.md`** (aggiornato) — protocollo di lavoro agenti

### Perché / decisione

Prima di costruire qualsiasi cosa, capire cosa il motore espone già.
Risultato: il Context Inspector è fattibile al 100% con i dati nativi.

### Gotcha / attenzione

- `GET /event` è un endpoint SSE, non REST standard — non usare fetch normale
- HITL via `POST /session/{id}/permissions/{permissionID}` con
  `body: { response: "once"|"always"|"reject" }`

---

## 2026-06-26 · Fasi 0.1–0.4 — Scaffold iniziale

**Fase:** 0.1–0.4 | **Branch:** `claude/opencode-project-setup-1i59cg`

### Cosa è cambiato

**Struttura repo**
- `LICENSE` (MIT)
- `.gitignore` (Node / Rust / Tauri / OS)
- `PROGETTO.md`, `CHECKLIST.md`, `CLAUDE.md`

**Scaffold Tauri 2 + React 19**
- `package.json`: Tauri 2 CLI (`@tauri-apps/cli`), React 19, TypeScript 5.8,
  Vite 7, pnpm workspace
- `src-tauri/Cargo.toml`: `tauri 2.x`, `tauri-plugin-opener`, `tokio`,
  `reqwest`
- `src-tauri/src/main.rs`, `lib.rs` — entry point base

**Frontend stack**
- `@tailwindcss/vite` (Tailwind v4, CSS-first, no `tailwind.config.js`)
- `motion` (animazioni)
- `lucide-react` (icone)
- `clsx` + `tailwind-merge` → `src/lib/utils.ts` con `cn()`
- `@tanstack/react-query` v5
- `zustand` v5

**`src/index.css`** — design token
- Palette `forge-*`: da `forge-950` `#0a0c0e` a `forge-50` `#f4f7fa` (steel darks)
- Accent: `accent-400` `#f59e0b` (amber), `accent-500` `#d97706`
- Mapping CSS vars shadcn/ui: `--background`, `--foreground`, `--card`,
  `--primary`, `--primary-foreground`, `--muted`, `--muted-foreground`,
  `--border`, `--ring`
- Font: `--font-display` (Inter/system), `--font-mono` (JetBrains Mono/fallback)

**`src/App.tsx`** — hello Forgia (poi sostituito in 2.1)

**CI** — `.github/workflows/ci.yml`
- Job `frontend`: `pnpm install` → `pnpm lint` → `pnpm build`
- Job `rust`: `cargo check` su `src-tauri/`

### Perché / decisione

Tailwind v4 CSS-first evita il file di config JS — tutto in `index.css`.
pnpm per velocità e disk efficiency.

### Gotcha / attenzione

- Cargo non è eseguibile nell'ambiente remoto (static.crates.io bloccato dalla
  proxy policy) — i check Rust vanno fatti solo via CI o in locale
- Tailwind v4 non ha `tailwind.config.js`: tutto in `@theme {}` dentro il CSS

---

*Fine log. Prossimo step: Fase 3.1 — File tree del progetto.*
