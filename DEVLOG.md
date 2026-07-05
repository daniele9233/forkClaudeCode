# FORGIA — DevLog

> **Regola:** questo file va aggiornato **ogni volta** che si fa una modifica,
> anche piccola. È la memoria chirurgica del progetto — più preciso di
> `CHECKLIST.md`, meno astratto di `PROGETTO.md`.
>
> Formato di ogni voce:
>
> ```
> ## YYYY-MM-DD · <titolo breve>
> **Fase:** X.Y  |  **Branch:** <nome>  |  **Commit:** <sha breve>
> ### Cosa è cambiato
> ### Perché / decisione
> ### Gotcha / attenzione
> ```

---

## 2026-07-05 · v0.1.3 — provider Anthropic (Claude)

**Fase:** 12.48 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

### Cosa è cambiato

- `AddProviderKey.tsx`: nuovo template **Anthropic (Claude)** in cima all'elenco
  (`ANTHROPIC_API_KEY`, baseURL `https://api.anthropic.com/v1`). Prima Claude non
  era selezionabile e "Other" non funziona (Anthropic non è OpenAI-compatible).
- `lib.rs` `test_provider_key`: se l'host è `anthropic.com` usa gli header
  `x-api-key` + `anthropic-version: 2023-06-01` invece di `Authorization:
Bearer` (che Anthropic rifiuta). Altri provider invariati (Bearer).
- `config.ts`: default primo collegamento preferisce un modello **Sonnet** (dopo
  deepseek-chat) → per Claude parte su `claude-sonnet-5`.
- Guida provider aggiornata con la sezione Anthropic/Claude. Bump 0.1.3.

### Perché / decisione

- Feedback utente: "non mi fa inserire la chiave di Claude" → mancava il
  template e la verifica Bearer avrebbe comunque fallito.

### Gotcha / attenzione

- **Verificato dal vivo** con una chiave reale fornita dall'utente (usata solo
  per il test, mai scritta su file/commit; da rigenerare): `GET /v1/models` →
  200 (lista modelli), `POST /v1/messages` (haiku) → 200 ("Blu."). Conferma che
  header e flusso sono corretti.
- `api.anthropic.com` è nella noProxy del proxy agent → test diretto possibile.

## 2026-07-05 · v0.1.2 — la scelta del modello DeepSeek non si perde più

**Fase:** 12.47 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

### Cosa è cambiato

- `config.ts` `useConnectProvider`: alla (ri)connessione di un provider, se esiste
  già una scelta manuale dell'utente **per quello stesso provider** (es.
  `deepseek/deepseek-reasoner`), viene **mantenuta** invece di forzare di nuovo
  il default `deepseek-chat`. Solo la _primissima_ connessione di un provider mai
  usato applica il default veloce. Catturati i `providerModelIds` per validare
  che il modello scelto esista ancora.
- `docs/02-provider-setup.md`: nuova sezione "Scelta del modello" — DeepSeek
  espone `deepseek-chat` (veloce) e `deepseek-reasoner` (ragionamento, il "pro");
  non esiste un id "pro v4". Spiegato come sceglierlo dal selettore e che resta.
- Bump 0.1.1 → 0.1.2 + tag workflow v0.1.2.

### Perché / decisione

- Feedback utente: mettendo la chiave DeepSeek l'app selezionava sempre
  `deepseek-chat` anche dopo aver scelto il modello "pro". Causa: il codice
  riforzava `deepseek-chat` a ogni connect, sovrascrivendo la scelta.
- Default veloce mantenuto (l'app itera molto sulla UI; i reasoning model sono
  lenti/costosi) MA la scelta manuale ora è rispettata e persistita.

### Gotcha / attenzione

- La conferma interattiva del modello esatto non è stata possibile (ambiente non
  interattivo) → fix sicuro che non indovina id inesistenti: rispetta la scelta
  dell'utente. Se si vuole `deepseek-reasoner` come default forzato, è una
  modifica di una riga nell'euristica `firstModel`.

## 2026-07-05 · v0.1.1 — fix console Windows + falso version-mismatch

**Fase:** 12.46 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

### Cosa è cambiato

- **Niente più finestra terminale** all'avvio (e non solo): helper
  `process::hide_console` / `hide_console_std` che applicano `CREATE_NO_WINDOW`
  a ogni processo figlio su Windows. Applicato a: sidecar `opencode serve`
  (`engine_command`), `opencode --version`, dev server anteprima
  (`build_command`), `git clone/init/ls-files/checkout`, `netstat`, screenshot
  headless del browser. Un'app GUI (`windows_subsystem="windows"`) non ha
  console propria → senza il flag Windows ne alloca una visibile.
- **Fix falso "version mismatch"**: il check pretendeva engine major ≥ 1, ma
  bundliamo opencode **0.15.31** (major 0) → falso allarme a ogni avvio.
  `version.ts` ora confronta la **semver completa** contro `MIN_ENGINE_VERSION`
  (= la versione che distribuiamo) e avvisa solo se l'engine è _più vecchio_.
  Nuovo helper puro `engineIsOutdated` + 4 test di regressione (66 totali).
- **Bump 0.1.0 → 0.1.1** (`tauri.conf.json`, `package.json`) e default tag del
  workflow → `v0.1.1`, così la release con i fix è pulita e separata dalla
  v0.1.0 buggata.

### Perché / decisione

- Entrambi i problemi erano visibili al primo avvio dell'installer reale su
  Windows (feedback utente): terminale spurio + banner giallo fuorviante.

### Gotcha / attenzione

- `tokio::process::Command::creation_flags` è un metodo inerente su Windows
  (no import di `CommandExt`, che serve invece per `std::process::Command`).
- Rust non compila in questo ambiente (registry bloccato) → verificato per
  struttura; la CI Windows compila e produce l'installer v0.1.1.

## 2026-07-05 · Prima release v0.1.0 costruita in CI (auto-publish)

**Fase:** 12.45 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

### Cosa è cambiato

- `release.yml`: aggiunto trigger su **push al branch** con `[release]` nel
  messaggio (guardato da un `if:` sul job) + input `tag` per `workflow_dispatch`
  → in ambienti dove non posso pushare tag né usare `workflow_dispatch` via API
  posso comunque far partire la build. `tagName`/`releaseName` usano
  `ref_type=='tag' ? ref_name : (input.tag || 'v0.1.0')`.
- Lanciata la build (commit `[release]`): **run #1 success** in ~10 min →
  installer Windows generato e allegato alla release **kikkoCode v0.1.0**.
- `releaseDraft: true → false`: le release ora si **pubblicano da sole** così il
  one-liner (`/releases/latest`, che esclude le draft) le trova senza click.

### Perché / decisione

- Vincoli reali dell'ambiente: push di tag **403** (credenziali git limitate al
  branch); `workflow_dispatch` via API **403** ("Resource not accessible by
  integration", manca `actions: write`). Il push sul branch è l'unica leva.
- Nessun tool MCP per pubblicare/editare/eliminare una release → la **prima**
  draft (creata prima del flip a `false`) va pubblicata a mano una volta.

### Gotcha / attenzione

- `get_release_by_tag`/`/releases/latest` **non vedono le draft** (404): il tag
  `v0.1.0` non esiste come ref finché la release non è pubblicata.
- La prima v0.1.0 è rimasta **draft** (build partita quando era ancora
  `releaseDraft:true`) → serve un click "Publish". Da qui in poi: auto-publish.
- Il commit del flip è stato fatto **senza** `[release]` per non far partire una
  build inutile.

## 2026-07-05 · Installazione Windows one-command (`irm | iex`)

**Fase:** 12.44 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

### Cosa è cambiato

- `scripts/install.ps1`: installer PowerShell one-liner per utenti non tecnici.
  Interroga l'API GitHub (`/releases/latest`), trova l'asset Windows
  (`.exe` NSIS setup, fallback `.msi`), lo scarica in `%TEMP%` e lo lancia.
  Nessun tool di sviluppo (Rust/Node/pnpm): il motore OpenCode è già bundlato
  nella release. Messaggio d'errore guidato se non c'è una release pubblicata.
- `scripts/uninstall.ps1`: trova la voce di disinstallazione nel registro
  (HKLM/HKCU + WOW6432Node) e lancia l'uninstaller.
- `README.md`: nuova sezione "Install (Windows) — no developer tools needed"
  con il comando `irm ".../scripts/install.ps1" | iex` + nota manutentore.

### Perché / decisione

- L'amico su Windows non deve compilare da sorgente (serve Rust/Node/WebView2):
  la via giusta per un non-esperto è **una release precompilata** scaricata e
  lanciata con un solo comando, come fanno gli altri repo (es. free-claude-code).
- Riusa la pipeline `release.yml` già esistente: il manutentore pusha un tag
  `v*`, la CI costruisce l'installer e lo allega a una release **draft**.

### Gotcha / attenzione

- `/releases/latest` **ignora le draft**: il manutentore deve pubblicare la
  release una volta (Publish) perché il one-liner la veda. Documentato nella
  nota manutentore del README e nel messaggio d'errore dello script.
- `.ps1` non è formattato da prettier (nessuna regola) → nessun impatto sul
  gate `pnpm prettier`.

## 2026-07-04 · Prompt: maniglia drag-to-resize come il pannello

**Fase:** 12.43 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

### Cosa è cambiato

- `ChatInput.tsx`: barra "grip" in cima al composer con la STESSA logica pointer
  del pannello inferiore (`startComposerResize`): trascini su/giù per alzare/
  abbassare il prompt (clamp 40px → 85vh, drag su = più alto). Segna
  `userResized` così l'auto-grow non litiga col drag.
- Tolto il `resize-y` nativo (grip d'angolo) → `resize-none`: la maniglia in
  alto è l'unica affordance, coerente col pannello.

## 2026-07-04 · Skill RKE2/Rancher + documenti di lavoro professionali

**Fase:** 12.42 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

### Cosa è cambiato

- **Verificato**: non esiste un MCP "Rancher" dedicato affidabile; RKE2 è K8s
  conforme → il **Kubernetes MCP** già presente lo gestisce (kubeconfig RKE2).
  Aggiornata la desc del preset MCP → "Kubernetes / RKE2".
- **Skill `rke2-rancher` (🐮)**: install/config RKE2 (config.yaml, tls-san, HA
  3 server), kube-vip/MetalLB, Longhorn, Rancher via Helm, Fleet GitOps, etcd
  snapshot+restore, Rancher Backup, CIS hardening (`profile: cis`), air-gap +
  system-upgrade-controller, sempre validate+dry-run.
- **Skill `work-docs` (📋)**: deliverable cliente (Technical Architecture Doc /
  Deployment Guide / Verbale di Consegna) con struttura completa (frontespizio,
  controllo documento+revisioni, indice/TOC, executive summary, scopo, architettura,
  prerequisiti, installazione, config, runbook/backup/DR, sicurezza, RACI,
  collaudo/firme, appendice, glossario) → genera .docx reale (python-docx o
  pandoc --toc --reference-doc) + export PDF, placeholder invece di inventare.
  Catalogo 30 → 32.
- **+2 test** → 62 totali.

### Gotcha / attenzione

- Onestà: nessun MCP Rancher "vero" installato (non ce n'è uno affidabile) — la
  copertura è via K8s MCP + skill dedicata, che è la strada corretta per RKE2.

## 2026-07-04 · MCP one-click (K8s, Playwright) + 3 skill verticali

**Fase:** 12.41 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

### Cosa è cambiato

Apertura oltre il solo web-design, sui task reali dell'utente (DevOps, documenti, job-search).

- **MCP "collega in un click"** (scheda Impostazioni → MCP): sezione "Consigliati"
  con **Kubernetes** (`npx -y mcp-server-kubernetes`) e **Playwright/Browser**
  (`npx -y @playwright/mcp@latest`). Un click aggiunge l'entry `local` a
  `config.mcp` (riuso `useUpdateConfig`); scompaiono quando già configurati.
- **3 skill verticali** (catalogo 27 → 30):
  - `devops` (⎈): Ansible idempotente + K8s/Helm (probe, limits, RBAC least-priv,
    security non-root, secrets), e VALIDAZIONE prima dell'apply (ansible-lint/
    yamllint/kubeconform/helm lint + dry-run --check/--diff).
  - `doc-engineering` (📄): OCR (ocrmypdf/tesseract), estrazione (pdfplumber/
    PyMuPDF) → JSON su schema, generazione (python-docx/openpyxl/WeasyPrint/pandoc).
  - `job-search` (💼): CV→struttura, scraping etico (robots/ToS, rate-limit,
    preferisci API) via Playwright, matching CV↔offerta, tailoring senza inventare.
- **+3 test** (trigger delle skill verticali) → 60 totali.

### Gotcha / attenzione

- Gli MCP consigliati richiedono Node/npx (+ kubeconfig per K8s, browser per
  Playwright); partono quando l'agente li usa.
- Le skill job-search insistono su scraping etico: robots.txt/ToS, API quando
  possibile — scritto nel playbook.

## 2026-07-04 · Hardening: DRY, post-autopilot audit, queue skills, code-split, sessione/progetto

**Fase:** 12.40 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

### Cosa è cambiato (i punti del report)

- **Fix bug**: niente notifiche "task finished" spurie a ogni giro di autopilot
  (guardia `useAutopilotStore` in `useChatEvents` — commit precedente `c4e94ac`).
- **DRY sessioni nascoste**: nuovo `silentSessions.ts` (registro condiviso) +
  `hiddenSession.ts` (`runHiddenPlan`) → `memory.ts`, `enhance.ts`, `style.ts`
  usano un solo helper (rimosso il triplo create/prompt/delete).
- **DRY file://**: `toFileUrl()` in `lib/utils` usato da `style.ts` e PreviewPanel.
- **Audit condiviso**: nuovo `audit.ts` (`runDesignAudit`) usato dal bottone
  Audit e dall'autopilot; PreviewPanel dimagrito.
- **Loop qualità automatico**: a fine autopilot (`done`), se una pagina è in
  anteprima, parte UN giro di design-audit → fix "gratis".
- **Coda preserva le skill di ricetta**: `QueuedTask.forcedSkillIds`; ChatShell
  le accoda e le ripassa al drain.
- **Code-splitting**: `App.tsx` lazy-load di Monaco/xterm/Preview/Settings/
  overlays → chunk principale **1125KB → 726KB** (gzip 331→231).
- **Sessione per progetto**: `workspace.store.lastSessionByPath`;
  `setActiveSession` la registra; `openProject` la ripristina se esiste ancora.
- **+4 test** (queue, toFileUrl) → 57 totali.

### Gotcha / attenzione

- `runDesignAudit` post-autopilot costa un giro extra: gira solo se c'è una
  preview aperta (segnale che stai lavorando a un sito).
- Rilevate ma NON toccate: parsing `provider/model` e liste keyword web
  duplicate (poche righe; cambiarle rischierebbe il comportamento) — lasciate.

## 2026-07-04 · Ricette: iniezione FULL delle skill (no cap 2) + base awwwards

**Fase:** 12.39 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

### Cosa è cambiato

Problema segnalato: le ricette dichiaravano 4 skill ma all'invio ne venivano
iniettate solo 2 (cap del matcher). Per siti awwwards-caliber non basta.

- **`planInjection(text, forcedIds)`** — le skill forzate (della ricetta) sono
  iniettate IN FULL, bypassando il cap di 2, con source "recipe"; non entrano
  nelle sticky (freshIds escluso).
- **`composer.store.fill(text, source, skillIds)`** — la ricetta porta i suoi
  skillIds; `ChatInput` li tiene in `recipeSkillIds` (finché non svuoti/invii) e
  li passa a `planInjection` (preview) e via `SendOpts.forcedSkillIds` all'invio.
- **`ChatShell.handleSend`** usa `opts.forcedSkillIds`.
- **Base awwwards**: ogni ricetta forza SEMPRE anche `impeccable` + `type-color`
  - `emil-motion` (gusto, tipografia, motion craft) oltre alle sue → stack di
    5–7 playbook reali per brief, non 2.

+1 test (53 totali).

### Perché / decisione

Risposta alla domanda dell'utente "2 skill bastano per awwwards?": no — ora le
ricette girano il loro intero stack esperto + la base di qualità universale.

### Gotcha / attenzione

- Le skill forzate non diventano sticky (sono legate alla ricetta, non
  "imparate"). Restano finché la ricetta è nel composer.
- Più playbook = più contesto: è voluto sui lanci di ricetta (qualità), non sui
  prompt liberi (che restano a max 2).

## 2026-07-04 · Fix composer: Perfeziona off sulle ricette + resize libero

**Fase:** 12.38 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

### Cosa è cambiato

Tre fix richiesti dall'utente sul composer:

1. **Perfeziona disabilitato sulle ricette** — `composer.store.fill(text, source)`;
   le ricette Studio passano `source:"recipe"`; `ChatInput` marca `fromRecipe` e
   disabilita il bottone Perfeziona (con tooltip "già ottimizzata"). Si riabilita
   quando svuoti il campo.
2. **Resize libero (su e giù)** — il vecchio `max-h-[50vh]` bloccava
   l'ingrandimento manuale. Ora: auto-grow che cresce E si accorcia col
   contenuto fino a 60vh, MA la maniglia manuale (`resize-y`) arriva fino a 85vh
   (più dell'auto) e giù al minimo. Un `ResizeObserver` rileva il drag manuale e
   da quel momento smette di auto-crescere (non litiga più col drag).
3. **Resize dopo una ricetta** — caricando una ricetta si azzera lo stato di
   resize manuale e si ridimensiona a contenuto; la maniglia funziona subito.

### Gotcha / attenzione

- Auto-grow e drag manuale coordinati via guard flag + ResizeObserver: quando
  l'utente trascina, `userResized` blocca l'auto-grow finché non svuoti il campo
  (o carichi una nuova ricetta).

## 2026-07-04 · Studio: 5 ricette scroll-media/video

**Fase:** 12.37 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

### Cosa è cambiato

La skill `scroll-media` non era richiamata da nessuna ricetta Studio → aggiunte
5 ricette che la usano (28 → 33): Product Reveal (AirPods, image-sequence
pinnata), Cinematic Scroll Video (scrubbing), Frame-by-frame Story
(scrollytelling multi-capitolo), Real Video Landing (hero video reale),
Fashion Lookbook Reel (reel + sequenze). Ognuna aggancia `scroll-media`
(+ `video-pipeline` dove serve).

### Gotcha / attenzione

- Nessuna: solo dati (recipes.ts). Test recipes verifica gli skillId validi.

## 2026-07-04 · Asset realistici (no link rotti) + skill video/scroll + pipeline frame

**Fase:** 12.36 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

### Cosa è cambiato (tutte e 3 in sequenza)

1. **Asset realistici + auto-heal:**
   - `asset-generation` (skill) potenziata: REGOLA DURA "mai box grigi, mai URL
     finti/404". Foto reali senza chiave via **Lorem Picsum**
     (`picsum.photos/seed/<kw>/<w>/<h>`), SVG inline per icone/illustrazioni,
     Unsplash/Pexels solo se c'è una key, gen tool se disponibile. + keyword
     picsum/unsplash/pexels/404.
   - `webDesigner` (direttiva sempre-attiva) aggiornata sulla stessa linea.
   - **Auto-heal nell'anteprima** (`preview_server.rs` INSPECTOR_JS): quando un
     `<img>` va in 404, lo script sostituisce al volo il src con un Picsum
     dimensionato all'elemento → preview subito realistica (guard anti-loop via
     `dataset.kikkoHealed`), e lo segnala nell'error radar.
2. **Skill `scroll-media` (🎞️):** image-sequence su canvas (stile AirPods,
   100–300 frame, GSAP ScrollTrigger pin+scrub), video scrubbing/scroll-controlled
   video, background video reale (Pexels/Coverr/Mixkit), reduced-motion fallback,
   performance.
3. **Skill `video-pipeline` (🎥):** produce i media — genera start/end frame →
   video se c'è un gen tool, altrimenti stock reale; estrae 100–300 frame con
   **ffmpeg** (comandi esatti) + conversione WebP; wiring al canvas; guardrail
   "niente URL frame inventati, se manca ffmpeg ripiega su video reale".

Catalogo skill 25 → 27. +2 test (52 totali).

### Perché / decisione

Richiesta utente (tutte in sequenza). Higgsfield è a crediti e legato alla mia
sessione, non all'app: le skill usano "un gen tool se presente", altrimenti
Picsum/stock/ffmpeg — così funziona SEMPRE senza chiavi.

### Gotcha / attenzione

- L'auto-heal agisce solo nella PREVIEW (non nel codice): l'agente deve
  comunque correggere il src; il radar lo segnala.
- `video-pipeline` richiede ffmpeg installato per l'estrazione frame; senza,
  ripiego su video reale scrubbato. Rust toccato (INSPECTOR_JS) → compila la CI.

## 2026-07-04 · Indicatore visione del modello (👁 vede / non vede)

**Fase:** 12.35 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

### Cosa è cambiato

Ora si vede subito se il modello selezionato "vede le immagini" (serve per Audit
visivo e stile da URL/screenshot).

- **`opencode/modelCaps.ts`** (nuovo) — `modelSupportsVision(model)` (usa
  `modalities.input.includes("image")`, fallback su `attachment`) + hook
  `useModelVision()` per il modello selezionato.
- **`ModelSwitcher`** — icona 👁/EyeOff accanto al nome nel chip header; ogni
  modello nel menu con 👁 se vede; **riga di testo in fondo al menu**: "Questo
  modello vede/NON vede le immagini: Audit e stile da URL/screenshot
  funzionano/non funzioneranno".
- **Scheda Stili** — riga sotto i bottoni di import che riflette il modello
  attuale (verde se vede, ambra se no → uso l'HTML come ripiego).

### Perché / decisione

Richiesta utente: sapere in base al modello se le feature con visione
funzioneranno, prima di usarle.

### Gotcha / attenzione

- `known:false` (modello non nel catalogo provider) → non mostro nulla invece di
  dire erroneamente "non vede".

## 2026-07-04 · Style Memory: importa stile da URL / screenshot esterno

**Fase:** 12.34 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

### Cosa è cambiato

Ora puoi "rubare" il look di un sito che ammiri (non tuo).

- **`opencode/style.ts`** — refactor in `runDistiller(parts)` condiviso; nuove
  `captureStyleFromUrl(url)` e `captureStyleFromImage(path)`. Per l'URL:
  screenshot via `capture_preview` (qualsiasi URL) **+** HTML via `fetch_text`,
  entrambi best-effort → un modello con visione usa lo screenshot, uno testuale
  ripiega sull'HTML. Se non percepisce nulla, il distiller risponde `NO_STYLE`
  → errore chiaro. Immagine: file part (dialog nativo → path assoluto).
- **`SettingsModal` → scheda Stili** — box "Importa uno stile": input URL +
  bottone **URL**, bottone **Immagine** (dialog `@tauri-apps/plugin-dialog`).
  Salva+attiva lo stile importato; spinner e riga d'errore.

### Perché / decisione

Scelta utente. Estende la Style Memory da "salva il tuo stile" a "clona il look
di qualsiasi sito". Zero nuovo Rust: riuso `capture_preview` (ora con width/
height) e `fetch_text`.

### Gotcha / attenzione

- URL/screenshot rendono al meglio con un modello con **visione**; l'HTML è il
  fallback per i modelli testuali (meno preciso sui siti molto JS).
- Alcuni siti bloccano lo screenshot headless o il fetch: se falliscono entrambi
  → errore esplicito, nessuno stile creato.

## 2026-07-04 · Style Memory 🎨 — salva uno stile e riusalo

**Fase:** 12.33 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

### Cosa è cambiato

Crei un sito che ti piace → salvi il suo stile → lo riusi su altri siti.

- **`src/opencode/style.ts`** (nuovo) — `captureStyle()`: sessione nascosta
  plan-mode (read-only, `[kikko]`, silenziata, cancellata) che con approccio
  IBRIDO restituisce il `DESIGN.md` del progetto se esiste, altrimenti lo
  distilla leggendo styling/token/componenti reali. Funziona con qualsiasi
  modello (legge codice, niente visione).
- **`src/stores/styles.store.ts`** (nuovo) — libreria persistente `SavedStyle`
  {id,name,spec,accent,createdAt}, `activeId`; `addStyle/rename/remove/setActive`;
  `activeStyleDirective()` per l'iniezione. Accent estratto dal primo hex.
- **`ChatShell`** — lo stile attivo è iniettato nel ruolo **system** a ogni
  invio (prima delle skill): "build strictly to this saved design system…".
- **`ChatInput`** — chip 🎨 dello stile attivo con ✕ per disattivarlo.
- **`PreviewPanel`** — bottone **🎨 Stile**: cattura + salva + attiva (nome dal
  nome cartella progetto); esito nel log dell'anteprima.
- **`SettingsModal`** — nuova scheda **Stili**: card con swatch accento, nome
  rinominabile inline, Usa/In uso (attiva/disattiva), elimina, DESIGN.md
  espandibile. Badge tab mostra "N·on" quando uno è attivo.
- **+3 test** (`styles.store.test.ts`), 50 totali.

### Perché / decisione

Richiesta utente (scelta: ibrido codice+DESIGN.md). Riusa i pattern esistenti
(sessioni nascoste + system-role injection). Uno stile = un DESIGN.md salvato,
riutilizzabile tra progetti diversi (persistito in localStorage, non nel repo).

### Gotcha / attenzione

- La cattura gira sul motore (sidecar): serve l'app avviata; è una chiamata LLM
  di qualche secondo (spinner sul bottone).
- Lo stile attivo si applica a OGNI invio finché non lo disattivi (chip ✕ o
  Impostazioni → Stili → In uso).

## 2026-07-04 · Skill engine v2: sticky, slash+pin, system-role, semantic, negative/exclusion

**Fase:** 12.32 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

### Cosa è cambiato (le 5 aree)

1. **Sticky Skills** — `skills.store`: `sticky: Record<id,turni>` + `noteActivated`
   (decadimento −1/turno, refresh a STICKY_TURNS=3 per le skill che scattano).
   Risolve il "secondo prompt": "ora fallo rosso" mantiene attiva la skill motion.
2. **Slash + Pinning** — `resolveSlash("/motion …")` forza una skill (bypassa lo
   score, taglia il comando); i chip "will apply" sono ora **cliccabili**:
   click = fissa/sfissa (`pinned` nello store), le pinnate valgono tutta la
   sessione; bottone **reset** per svuotare le sticky.
3. **System-role injection** — i playbook + direttive (webDesigner, preview
   policy) vanno nel ruolo **`system`** (SDK `session.prompt` supporta `system`),
   il messaggio utente resta pulito (solo id-tag nascosti per i chip). I modelli
   obbediscono molto più stabilmente. `session.ts` passa `system`.
4. **Matching ibrido** — mappa `SYNONYMS` (es. muovere/fade → motion) espande i
   token prima dello scoring; nuovo campo `phrases` (frasi d'esempio, +3). Così
   "fai muovere / effetto fade" aggancia motion senza la keyword esatta.
5. **Negative keywords + exclusion** — `negativeKeywords` (es. "senza animazioni"
   → sopprime motion) e `excludes` (neubrutalism ⟂ minimalism: mai insieme,
   vince il punteggio più alto). Greedy pick con controllo conflitti.

Nuove funzioni in `match.ts`: `resolveSlash`, `planInjection` (combina
slash+match+pinned+sticky, puro), `buildSkillSystem`, `tagSkills`. `injectSkills`
mantenuto per i test/round-trip. UI chip riscritti (pin/sticky/reset). +8 test
(`skillsEngine.test.ts`), 47 totali.

### Perché / decisione

Feedback tecnico dell'utente: con matching solo-keyword il sistema perde le
skill al secondo prompt, non ha override manuale, mescola system e user, fallisce
sui sinonimi e sui conflitti. Tutte e 5 le aree affrontate.

### Gotcha / attenzione

- `sticky` è runtime-only (persist `partialize` esclude sticky; pinned sì).
- `planInjection` legge lo store ma non muta; `noteActivated` chiamato solo nel
  send path (non nel preview dei chip).
- L'iniezione nel system NON rompe i chip: `tagSkills` mette id-marker vuoti nel
  testo utente, `parseSkills` li estrae e li toglie come prima.

## 2026-07-04 · Prompt Enhancer ✨ (il fix del problema "prompt")

**Fase:** 12.31 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

### Cosa è cambiato

Il problema più grande: skill ottime ma prompt scarso → sito brutto. Fix =
riscrivere l'intento grezzo in un brief esperto PRIMA di inviare.

- **`src/opencode/enhance.ts`** (nuovo) — `enhancePrompt(rough)`: sessione
  nascosta throwaway (plan mode = read-only, silenziata come il distillatore di
  memoria, titolo `[kikko]`, cancellata dopo) che riscrive la richiesta in un
  brief esperto (deduce tipo sito, sceglie stile+layout, sezioni con contenuti
  reali, direzione brand/palette/font, stack, animazioni con easing corretto,
  asset, barra qualità). Usa il modello selezionato (`model.store`). Non lancia
  mai: torna il testo migliorato (o l'originale se fallisce).
- **`src/opencode/memory.ts`** — esposti `markSilent`/`unmarkSilent` (registro
  sessioni silenziose condiviso, prima privato).
- **`src/features/chat/ChatInput.tsx`** — bottone **✨ Perfeziona** nella riga
  modalità: riscrive la bozza in place (editabile), spinner "Perfeziono…",
  riga d'errore se fallisce. L'utente resta nel loop (rivede e invia).

### Perché / decisione

Scelta dall'utente tra 3 proposte. È la leva universale: funziona su qualsiasi
input, riusa l'infrastruttura delle sessioni nascoste, e insegna all'utente a
scrivere meglio mostrando il brief. Human-in-the-loop: il risultato è
modificabile, non inviato in automatico.

### Gotcha / attenzione

- La sessione enhancer è `[kikko]` → già filtrata dal sidebar e silenziata
  (niente notifiche/preview/autopilot).
- È una chiamata LLM extra (qualche secondo): spinner sul bottone; in caso di
  errore la bozza originale resta intatta.

## 2026-07-04 · Skill Motion Craft (Emil Kowalski)

**Fase:** 12.30 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

### Cosa è cambiato

- **`catalog.ts`** — nuova skill `emil-motion` (🎞️), condensata dal playbook di
  Emil Kowalski (emilkowalski/skills · animations.dev): quando animare, easing
  (mai ease-in su UI, curve custom), durate < 300ms, mai scale(0), transizioni
  vs keyframes, timing asimmetrico, stagger, performance (solo transform/opacity,
  Framer x/y non HW-accelerati), a11y reduced-motion. Catalogo 24 → 25.
  Si attiva su keyword animation/easing/transition/spring/drawer/toast/motion.

### Perché / decisione

L'utente ha segnalato le skill di Emil (i comandi `npx skills add …`). È il
sapere dove i coding agent sbagliano di più (easing, scale(0), transition:all,
durate). L'ho reso skill nativa (iniezione prompt) invece di dipendere dalla CLI
`skills`, così funziona nel nostro sistema e si combina con le altre.

### Gotcha / attenzione

- Le altre due skill del repo (review-animations, animation-vocabulary) sono
  tooling per un altro harness; la sostanza è in emil-design-eng, che ho
  incorporato. La checklist "review" è già coperta dal bottone Audit.

## 2026-07-04 · Skill DESIGN.md + 4 ricette spec-driven

**Fase:** 12.29 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

### Cosa è cambiato

- **`catalog.ts`** — nuova skill `design-md` (📋), dal metodo di
  voltagent/awesome-design-md: prima scrivi un `DESIGN.md` (9 sezioni: tema,
  palette hex+ruoli, tipografia, componenti+stati, layout/spacing, profondità,
  do/don't, responsive, agent prompt guide), poi costruisci ogni pagina
  attenendoti ad esso. Catalogo 23 → 24.
- **`recipes.ts`** — +4 ricette enterprise che usano `design-md` (24 → 28):
  Design System First (📋), Living Style Guide (🎛️), Productivity SaaS (🗂️),
  Media / Consumer Tech (📺). Ognuna parte generando un DESIGN.md come fonte
  di verità e ci si attiene.

### Perché / decisione

Il repo richiesto è una collezione di file DESIGN.md (spec di design system che
l'agente legge). La resa migliore è una skill metodologica "documenta prima,
costruisci dopo" che blocca la coerenza visiva su un sito multi-pagina — il
punto debole tipico. Le 4 ricette la mettono in pratica.

### Gotcha / attenzione

- `design-md` è distinta da `design-system`: la prima è il DOCUMENTO-spec
  (metodo), la seconda l'implementazione tokenizzata. Si completano.

## 2026-07-04 · Asset reali + QA multi-viewport & a11y

**Fase:** 12.28 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

### Cosa è cambiato

**1) Generazione asset reali (skill):**

- `catalog.ts` — nuova skill `asset-generation` (🖼️): usa un tool/MCP di
  image-gen se disponibile, altrimenti asset procedurali (SVG, gradienti/mesh,
  grana feTurbulence, favicon SVG, OG image via @vercel/og), + pipeline di
  ottimizzazione (AVIF/WebP, srcset, lazy, no CLS, blur-up, vite-imagetools).
  Catalogo 22 → 23.
- `webDesigner.ts` — la direttiva sempre-attiva ora include "asset reali, mai
  placeholder grigi + favicon + OG image".

**2) QA visivo multi-viewport + a11y automatico (anteprima):**

- **Rust `capture_preview(url, width?, height?)`** — screenshot a viewport
  arbitrario (default 1440×900, clamp), nome file per larghezza.
- **Audit multi-viewport** (`PreviewPanel.auditResponsive`) — cattura la pagina
  a 390/768/1440 e manda le 3 immagini all'agente con una checklist Impeccable
  mobile-first, poi applica i fix. Il bottone "Audit" ora fa questo.
- **A11y radar automatico** — nuovo auditor iniettato in `INSPECTOR_JS`
  (preview_server.rs): su `forgia:audit` scansiona il DOM (lang, alt, nomi
  accessibili, label, CONTRASTO calcolato, ordine heading, tap target < 44px) e
  risponde `forgia:audit-result`. Bottone "A11y" + `qa.store` + drawer con i
  findings e "Fix with agent" (prompt costruito dai findings). +2 test (39).

### Perché / decisione

Le due leve scelte dall'utente. Gli asset sono il buco tipico dell'output AI
(box grigi) → skill che copre sia image-gen che procedurale (sempre funziona).
Il QA passa da "una schermata" a "3 breakpoint + check a11y deterministici
correggibili in un click" — un vero radar di qualità, non solo vision.

### Gotcha / attenzione

- L'auditor a11y è euristico (contrasto/alt/label/heading/tap): copre l'80%,
  non sostituisce test manuali tastiera/screen-reader (detto nel drawer).
- L'audit multi-viewport cattura 3 volte in sequenza (~10–15s) e serve un
  modello con VISIONE per leggere gli screenshot.
- Rust toccato (capture_preview + INSPECTOR_JS) → compila la CI; verificato per
  struttura (raw string bilanciata, nessun terminatore `"#` nel JS aggiunto).

## 2026-07-04 · Studio +14 ricette enterprise (siti full-stack vendibili)

**Fase:** 12.27 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

### Cosa è cambiato

- **`src/skills/recipes.ts`** — 10 → **24 ricette**. Aggiunte 14 verticali
  ENTERPRISE (siti completi, di livello vendibile): Fintech/Neobank, Cybersecurity,
  HealthTech, Luxury Real Estate, Law Firm, D2C E-commerce, Web3/Crypto, Enterprise
  AI, Developer Tool/API, Award Agency, Luxury Hospitality, Corporate B2B,
  Analytics/Data, Education/LMS. Nuovo campo opzionale `category`
  ("style" | "enterprise"). Nuovo preambolo `ENTERPRISE` + helper `enterprise()`
  che, sopra STACK+BAR, impone multi-pagina con routing, conversione (form reali,
  social proof, trust), SEO base, design-system, performance/a11y/deploy-ready.
- **`src/features/settings/SettingsModal.tsx`** — la scheda Studio ora raggruppa
  le card in due sezioni con intestazione+conteggio: "Enterprise · siti completi
  vendibili" (prima) e "Stili · starter di linguaggio visivo". Testo esplicativo
  aggiornato; il badge del tab usa `RECIPES.length` (auto).
- **`src/skills/recipes.test.ts`** — asserzione aggiornata: ≥20 ricette e almeno
  una `enterprise`.

### Perché / decisione

Richiesta esplicita: prompt corretti e pronti per siti enterprise rivendibili
($10k+), full-stack e professionali. Le ricette enterprise sono briefing già
scritti per attivare le skill giuste e alzano l'asticella a "prodotto per un
cliente reale" (routing multi-pagina, conversione, trust, SEO, produzione).

### Gotcha / attenzione

- `enterprise()` è dichiarata prima di `STACK`/`BAR` nel file ma li usa solo a
  call-time (costruzione dell'array RECIPES, dopo le const) → nessun TDZ.
- 24 card: la scheda Studio scrolla; il raggruppamento per categoria tiene
  l'elenco leggibile.

## 2026-07-04 · Agente web più esperto: audit design, taste packs, Web Designer mode, registry

**Fase:** 12.26 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

### Cosa è cambiato

Quattro leve per rendere l'agente più esperto di siti (scelte dall'utente):

1. **Design Review automatico** — `PreviewPanel.tsx`: refactor di `captureAndPrompt`
   (screenshot → prompt+immagine) e nuovo bottone **Audit** (icona ScanEye) che
   manda un audit strutturato "Impeccable" (7 aree con voto /10: tipografia,
   colore/contrasto, layout&spacing, composizione, profondità, stati&motion,
   responsive) e chiede di APPLICARE i fix. La 📷 resta come review veloce.
2. **Taste packs** — nuova skill `type-color` (🎨): abbinamenti font reali
   (Space Grotesk+Hanken, Fraunces+Manrope, Clash+General Sans, Playfair+Source
   Sans, Sora+IBM Plex, Bricolage+Public Sans; mai Inter/Arial) + 4 palette
   accessibili con hex (neutri tintati, un accento, AA).
3. **Registry componenti** — nuova skill `component-registry` (📦): shadcn/ui
   init+add, Aceternity/Magic UI/React Bits, lucide, cva, tailwind-merge.
4. **Web Designer mode sempre attivo** — `src/skills/webDesigner.ts`
   (`injectWebDesigner`), flag persistito `webDesigner` in `skills.store`
   (default on), iniettato in `ChatShell.handleSend` su prompt web (marker
   `[[kikko-note]]`, stripato dalla UI). Toggle nella scheda Studio. Catalogo
   skill 20 → 22. +3 test (37 totali).

### Perché / decisione

Il Design Review è il moltiplicatore più grande: l'agente _vede_ la pagina e
itera come un designer. Il Web Designer mode estende la qualità a OGNI richiesta
web, non solo alle ricette Studio. Le due skill di gusto/registry colmano i due
buchi tipici dell'output AI: font/colori anonimi e componenti riscritti a mano.

### Gotcha / attenzione

- Audit e 📷 richiedono un modello con VISIONE per guardare davvero lo
  screenshot (deepseek-chat non vede immagini): il prompt dice esplicitamente
  "se non vedi l'immagine dillo invece di indovinare".
- Web Designer mode inietta solo su prompt web-related (stessa euristica
  keyword del preview policy) per non sporcare i task non-web.

## 2026-07-04 · Studio full-stack front-end + watchdog anti-loop

**Fase:** 12.25 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

### Cosa è cambiato

**Punto 1 — le ricette Studio ora generano un PROGETTO reale, non un index.html:**

- `src/skills/recipes.ts` — preambolo `STACK` condiviso a ogni brief: scaffold
  Vite + React 19 + TS + Tailwind, animazioni (Framer Motion, GSAP+ScrollTrigger,
  Lenis, CSS scroll-driven), 3D dove ha senso (React Three Fiber + drei / Spline,
  .glb/.gltf ottimizzati Draco, dpr limitato, fallback statico), `npm run dev`
  funzionante. Helper `brief(core)` = STACK + core + BAR.
- `src/skills/catalog.ts` — nuova skill `creative-3d` (🧊: Three.js/R3F/drei/
  Spline/shader/GLB, performance 60fps). Catalogo 19 → 20. Ricette 3D
  (Glass Aurora, Skeuomorphic Product, Immersive Scroll) la referenziano.

**Punto 2 — il prompt "pensa pensa" ma non scrive nulla / sembra in loop:**

- `src/features/chat/MessageBubble.tsx` — `hasVisibleContent` conta solo parti
  con testo reale (o tool). Prima una parte reasoning/text VUOTA (i reasoning
  model e il free tier GLM/zai le emettono) faceva sparire i puntini "thinking"
  lasciando un bubble bianco → sembrava freezato. Ora i puntini + label
  "thinking…" restano finché non c'è contenuto visibile, e le parti vuote non
  vengono renderizzate come box vuoti.
- `src/stores/chat.store.ts` — `lastActivityAt: Map<sessionId, ms>` aggiornato
  su updatePart/setMessage, azzerato all'avvio del run (setSessionRunning true).
- `src/features/chat/useStallWatch.ts` — `useStallSeconds(sessionId)`: tick 1s
  solo mentre il run è attivo, secondi dall'ultima attività.
- `src/features/chat/StallBanner.tsx` + montato in `ChatShell` — dopo 25s di
  silenzio durante un run mostra un banner ambra "elabora da Ns senza output" +
  bottone Stop (suggerisce di cambiare modello se è un reasoning model).

### Perché / decisione

Il sintomo "loop che pensa senza scrivere" ha due cause coperte insieme: (a) UI
che sembrava bloccata su parti vuote → fix di rendering; (b) run realmente lento/
appeso → watchdog visibile con via d'uscita (Stop), senza timer in idle.

### Gotcha / attenzione

- Il watchdog NON killa da solo: mostra solo l'opzione. Volutamente non
  invasivo (un run lungo legittimo non va interrotto a sorpresa).
- `Part.sessionID` è la chiave per `lastActivityAt`; se un engine non lo
  popola, il touch viene saltato (nessun crash, solo niente watchdog).

## 2026-07-04 · Studio: 10 ricette di web design + skill top-market

**Fase:** 12.24 | **Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

### Cosa è cambiato

- **`src/skills/catalog.ts`** — catalogo skill da 12 → 19. Nuove:
  `impeccable` (💎, evita i tell-tale del design AI generico: no Inter/Arial,
  no grigio-su-colore, no nero puro, no card annidate, no easing elastico —
  da pbakaus/impeccable), `neubrutalism` (🟨), `neumorphism` (🔘, con fix
  a11y sul contrasto debole), `skeuomorphism` (🧴), `minimalism` editoriale
  (⬜), `web-layouts` (📐: F/Z-shape, split-screen, asimmetrico, masonry
  Pinterest), `web-architect` (🏛️: sito multi-sezione completo end-to-end).
- **`src/skills/recipes.ts`** (nuovo) — 10 `WebsiteRecipe` che combinano
  stile + layout in un brief pronto e self-contained (in italiano, con i
  termini di design in inglese per il matcher): Bento SaaS, Glass Aurora AI,
  Neubrutalist Agency, Soft Neumorphic, Editorial Minimal, Skeuomorphic
  Product, Pinterest Gallery, Split Duotone, Z-Pattern Startup, Immersive
  Scroll. Ogni ricetta cita le skill che sfrutta + un accento colore.
- **`src/stores/composer.store.ts`** (nuovo) — canale one-shot `fill`/`consume`
  (+ `nonce`) per spingere testo nel composer da fuori.
- **`src/features/chat/ChatInput.tsx`** — adotta il `pending` del composer,
  focus + auto-grow del textarea.
- **`src/features/settings/SettingsModal.tsx`** — nuova scheda **Studio**
  (default) con card cliccabili delle 10 ricette + spiegazione di cosa sono
  le skill in cima alla scheda Skills.
- **`src/skills/recipes.test.ts`** (nuovo) — 4 test (10 ricette, id unici,
  skillId validi, brief sostanziosi). Totale 34 test verdi.

### Perché / decisione

La richiesta era specializzare l'agente in siti web professionali e rendere
comprensibile la sezione skill. I brief sono **self-contained** così non
dipendono dal cap di 2 skill del matcher; i keyword che contengono attivano
comunque le skill giuste come guida extra. La scheda Studio è la porta
d'ingresso "clicca e vai" richiesta ("10 prompt diversi").

### Gotcha / attenzione

- `matchSkills` resta a max 2: la ricchezza viene dal brief, non da N skill.
- Le ricette sono in italiano ma i termini stilistici sono in inglese: serve
  per il matcher e per il modello. Non tradurli.

## 2026-07-03 · ModelSwitcher: stato "online" verde sul modello agganciato

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

Richiesta UX: con 4+ modelli DeepSeek in lista non si capiva quale fosse quello
attivo. Ora il modello agganciato è inconfondibile:

- **riga nel dropdown**: pallino verde con glow + nome in verde semibold +
  etichetta "ONLINE" + check verde (sfondo `--color-online`/10);
- **pill nell'header**: pallino verde + nome modello in verde quando una
  selezione è attiva.
  La persistenza c'era già (model.store persistito → la scelta sopravvive al
  riavvio dell'app). Frontend-only. Lint/build/30 test verdi.

---

## 2026-07-03 · Fix modello: la selezione di kikkoCode vince sul config del motore

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

Caso reale (PC nuovo, engine 1.17.13 auto-loggato al piano free zai/GLM):
DeepSeek connesso e visibile nel dropdown, ma **cliccare un modello non
cambiava nulla** e il default restava `provider-auth-zai/glm-5`: il motore
accetta `config.update({model})` ma il valore effettivo resta pinnato dal
plugin di auth. Ergo: mai più dipendere dal config del motore per la selezione.

- Nuovo `stores/model.store.ts` (persistito): `selected` ("provider/model") +
  `splitModel` (gestisce model id con slash). **Il parametro `model` per-prompt
  vince sempre in opencode** → la scelta è effettiva a prescindere dal config.
- `ModelSwitcher`: click → store (effetto immediato, spunta inclusa) +
  `config.update` best-effort per tenere il motore allineato quando possibile.
- Send path (`ChatShell`), **autopilot**, **distillatore memoria** e
  `usePromptCost`/indicatore online: tutti leggono store-first, fallback al
  config. `useConnectProvider` step 4: setta lo store e tratta il
  `config.update` come best-effort (try/catch).

Frontend-only, niente ricompilazione Rust. Lint/build/30 test verdi.

---

## 2026-07-02 · Memoria persistente di progetto 🧠 + Rules tab + import skill (12.21 + 12.22)

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

### 12.21 — Memoria persistente (il design "migliore possibile" per questa architettura)

Tre principi:

1. **Storage = blocco marcato dentro `AGENTS.md`** (`<!-- kikko:memory:start/end -->`):
   opencode inietta AGENTS.md nativamente in ogni sessione → iniezione a costo
   zero; le regole umane fuori dai marker non vengono MAI toccate (merge
   deterministico lato Rust, `update_agents_memory`); la memoria è versionata
   col repo (compare pure nel review panel).
2. **Distillazione via sessione nascosta usa-e-getta in plan mode** (read-only,
   zero side effects): riceve memoria attuale + digest della conversazione
   (solo testi user/agent, tail-capped 9K) e restituisce la memoria AGGIORNATA
   (merge+dedupe+eviction, sezioni fisse Conventions/Decisions/Preferences/
   Gotchas/Commands, cap 4K chars). kikkoCode scrive lui il file — il modello
   non tocca mai il filesystem. Reply sanificata (fence/marker strip).
3. **Igiene**: sessioni interne titolate `[kikko]`, filtrate dalla sidebar,
   silenziate negli handler (`isSilentSession` → niente notifiche/preview/
   autopilot/coda) e cancellate subito dopo l'uso.
   Trigger: auto su `session.idle` (throttle: ≥4 messaggi nuovi + ≥3 min
   dall'ultima distillazione) + **Memorize now** manuale; toggle auto in Settings.
   `memory.store` (autoMemorize persistito, distilling, lastAt/lastError).
   **Fix collaterale importante:** `MessageList` ora filtra i messaggi live per
   `sessionID` — prima lo streaming di ALTRE sessioni (subagenti/nascoste) poteva
   comparire nella chat aperta.

### 12.22 — Rules tab + import skill da URL

- Tab **Rules** in Settings: editor di `AGENTS.md` (load/save via comandi Rust
  `read/write_agents_file`) + controlli memoria (toggle auto, Memorize now,
  last update/errore).
- **Import skill da URL** nella tab Skills: `fetch_text` (Rust, https-only,
  cap 200KB, normalizza i link github blob→raw) + parser markdown
  (`importSkill.ts`: frontmatter o heading/blockquote/keywords:, fallback
  keywords derivate) → `skills.store.custom` (persistito, enabled subito,
  rimovibile 🗑). Catalogo ora dinamico: `activeCatalog()` = built-in + custom
  (gli import ombreggiano gli id uguali); matcher e badge usano quello.

Lint/build/30 test verdi. Rust toccato (4 comandi nuovi) → `pnpm tauri dev`.

---

## 2026-07-02 · Kill processi Windows + perf chat + Autopilot (12.18 + 12.19 + 12.20)

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

### 12.18 — Kill pulito dei processi (Windows)

Nuovo `src-tauri/src/process.rs`: `kill_child_tree` — su Windows
`taskkill /PID <pid> /T /F` (CREATE_NO_WINDOW) prima dello `start_kill`,
perché uccidere lo shim `cmd /C` lasciava orfano il vero node con la porta
occupata. Usato da `Sidecar::stop` e `DevRunner::stop`. Su unix invariato.

### 12.19 — Performance chat (memo + riferimenti stabili)

`MessageBubble` ora è `memo(...)`. In `MessageList` una `WeakMap<innerPartMap,
Part[]>` cache: lo store rimpiazza solo la inner-Map del messaggio toccato, così
i `parts` degli ALTRI messaggi restano referenzialmente identici → durante lo
streaming si ri-renderizza **solo il bubble attivo**, non tutta la lista.
(Windowing vero con react-virtuoso rimandato: con il memo il collo di bottiglia
per-token è eliminato.)

### 12.20 — Autopilot con budget 🚀

Toggle **Auto** nella riga modalità dell'input (+ input `$ budget` e `× iter`):
il testo diventa il GOAL. `opencode/autopilot.ts`: preambolo con regole e
marker `AUTOPILOT_DONE`; su ogni `session.idle` il controller (a) somma i
`cost` dei messaggi assistant dal motore (fuel gauge, baseline all'avvio),
(b) cerca il marker nell'ultimo messaggio → done, (c) controlla budget e cap
iterazioni → stop con notifica, (d) altrimenti manda il prompt "continue" e
incrementa. `autopilot.store` + `AutopilotBar` sopra l'input (goal, iter n/max,
speso/budget con barra colorata, Stop = finish+abort). La coda 12.14 aspetta
mentre l'autopilot possiede la sessione. Skills/policy injection saltate per il
goal (arriva testuale).

**Limiti onesti:** il "done" si fida del marker del modello (può dichiararlo
troppo presto — i cap fanno da rete); il costo arriva dal motore per messaggio,
quindi il controllo di budget avviene a fine iterazione, non a metà.
Lint/build/30 test verdi. Rust toccato → `pnpm tauri dev`.

---

## 2026-07-02 · Review-diff per file + coda di task + notifiche (12.13 + 12.14 + 12.15)

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

### 12.13 — Review panel (la feature-fiducia)

`features/review/ReviewPanel.tsx` (montato in ChatShell sotto il PlanTree,
pattern collassabile): lista dei file toccati dall'agente da `useFileStatus`
(git status del motore) con badge A/M/D, +righe/−righe totali e per file;
click sul path → diff Monaco nel bottom panel (`openFile`); **Discard a due
step** (↩ → "confirm") per file: comando Rust `discard_file_changes(path)` —
tracked → `git checkout HEAD -- <path>`, untracked (file nuovo) → delete.
Status file rinfrescato su `session.idle` (invalidate `["files"]`).

### 12.14 — Coda di task (NEXT queue)

`stores/queue.store.ts` (items con sessionId, FIFO, `takeNext`). ChatShell:
se `isRunning`, `handleSend` **accoda** invece di inviare; effetto con guardia
prev-running (StrictMode-safe) che a idle→ manda il prossimo della coda della
sessione attiva. UI: riga chip "queue · n" sopra l'input (testo troncato, ✗
per rimuovere); ChatInput ora invia anche durante il run (Enter accoda,
placeholder aggiornato) + bottone ListPlus accanto a Stop.

### 12.15 — Notifiche desktop

`tauri-plugin-notification` (Cargo+JS+capability). `lib/notify.ts`:
`notifyWhenUnfocused` (solo se la finestra NON è a fuoco; permesso richiesto
lazy). Su `session.idle`: "Task finished — the agent is done…".

Lint/build/30 test verdi. Rust toccato (comando discard + plugin notification)
→ ricompilare con `pnpm tauri dev`.

---

## 2026-07-02 · HMR attraverso il proxy + "l'agente vede la sua pagina" (12.17 + 12.16)

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

### 12.17 — HMR passthrough (live-edit senza reload)

tiny_http non fa upgrade websocket, ma non serve: i WebSocket **non sono
soggetti alla same-origin policy**. Il proxy ora inietta
`window.__kikko_ws_target__` (host:porta del dev server reale) e lo script
inspector **monkey-patcha `window.WebSocket`**: ogni socket puntato all'origin
del proxy viene ridirezionato dritto al dev server. Vite/Next HMR si aggancia →
selezioni un elemento, chiedi la modifica, **la vedi cambiare senza reload**
(i moduli aggiornati passano dal proxy via HTTP normale). Statico: nessun
target → nessun patch. Nota: script iniettato a fine body (classic) → esegue
prima dei module script (deferred), quindi il patch precede il client Vite.

### 12.16 — Screenshot → self-critique

Comando Rust `capture_preview(url)`: trova un browser Chromium di sistema
(**Edge** è preinstallato su Windows; Chrome/Chromium fallback, unix via PATH),
lo lancia `--headless=new --screenshot --window-size=1440,900
--virtual-time-budget=4000` (timeout 45s) → PNG in temp. Frontend:
`useSendPrompt` ora accetta `files?: FilePartInput[]` (parts extra nel prompt);
nuovo bottone **📷** nella toolbar anteprima → cattura l'URL reale, allega il
PNG (`file://…`) a un prompt di **critica visiva da senior designer**
(layout/spacing/gerarchia/contrasto) con istruzione di applicare i
miglioramenti al codice. Errori di cattura loggati nel pannello dev-server.

**Limiti onesti:** serve un **modello con visione** per "vedere" davvero
l'immagine (DeepSeek chat non ce l'ha — il prompt chiede esplicitamente di
dichiararlo invece di inventare); lo screenshot è della URL fresca in headless,
non dello stato esatto dell'iframe (per un dev server è equivalente). Il patch
WS presuppone che il dev server accetti connessioni cross-origin da localhost
(default Vite/Next; se un framework le rifiuta si torna al comportamento di
prima, reload a fine task). Lint/build/30 test verdi. Rust toccato → tauri dev.

---

## 2026-07-02 · Pacchetto affidabilità + Error Radar ⭐

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

Dall'analisi completa del codice: prima i 3 fix di affidabilità più critici, poi
la feature-firma nuova.

### Affidabilità

1. **SSE auto-reconnect** (`events.ts`): se lo stream eventi cadeva (hiccup del
   motore, non crash del processo) il `for await` finiva e nessuno lo riavviava
   → app "sorda" per sempre (niente streaming né permessi). Ora loop di
   riconnessione con backoff esponenziale (1s→15s, reset quando fluiscono
   eventi), guardato da `_generation` così stop/restart espliciti non lasciano
   loop zombie.
2. **Memoria chat** (`chat.store` + `useChatEvents`): `liveParts/liveMessages`
   crescevano per sempre. Su `session.idle`: invalidate dei messaggi →
   al termine del refetch `clearSession(sid)` (riconcilia senza flash);
   `clearSession` ora copre anche le parts orfane via `part.sessionID`.
3. **Auto-scroll intelligente** (`MessageList`): `scrollIntoView` scattava a
   ogni token anche se stavi rileggendo in alto. Ora ref `stickToBottom`
   aggiornato da `onScroll` (soglia 120px): segue il fondo solo se ci sei già;
   re-stick al cambio sessione.

### Error Radar ⭐ (nuova feature-firma)

Il proxy iniettante ora inietta anche un **radar errori** nella pagina:
`window error` (+ resource load in capture), `unhandledrejection`,
`console.error` (wrap non distruttivo), cap 50, dedup dei duplicati consecutivi
→ postMessage `forgia:pageerror`. Lato app: `pageErrors.store`, badge rosso
`⚠ n` nella toolbar dell'anteprima, drawer con la lista e **"Fix with agent"**:
un click impacchetta gli errori (max 8, con kind/message/source) in un prompt
e lo manda all'agente (crea la sessione se manca). Reset del radar a ogni
navigazione/reload.

Extra: **test del matcher skills** (`match.test.ts`, 8 test: keywords, soglia,
enabled-only, round-trip inject/parse, strip delle `[[kikko-note]]`) — era il
buco di copertura più grave. Totale test: 22 → 30.

Lint/build verdi. Rust toccato (INSPECTOR_JS) → **ricompilare con tauri dev**.

---

## 2026-07-02 · Selezione visuale automatica (proxy iniettante) + anteprima più tenace

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

Due richieste: (1) l'anteprima deve riconoscere tutto da sola, sempre; (2)
selezione degli elementi del sito **senza** dover aggiungere `forgiaInspector()`
al progetto.

### Selezione visuale — proxy con iniezione (universale)

Un iframe cross-origin non è scriptabile dall'app: lo script deve arrivare
dalla stessa origine della pagina. Quindi il **preview server integrato ora fa
anche da reverse-proxy iniettante**:

- `preview_server.rs`: `proxy_target` accanto a `root`; in proxy mode ogni
  richiesta è inoltrata al dev server (reqwest **blocking**, un thread per
  richiesta, Accept-Encoding rimosso per poter modificare l'HTML) e nelle
  risposte `text/html` viene iniettato `INSPECTOR_JS` prima di `</body>`.
  Anche lo statico inietta nelle pagine HTML servite da disco.
- `INSPECTOR_JS` (versione universale del bridge): file:riga da React fiber
  `_debugSource` quando c'è, e **sempre** selettore CSS + snippet testo +
  outerHTML → la selezione funziona su qualsiasi framework (anche React 19,
  che ha rimosso `_debugSource`, e HTML puro). Guard `__forgia_injected__`
  (il plugin Vite, se presente, ha precedenza).
- Comando `set_preview_proxy(target) -> Option<proxy_url>`; Cargo: feature
  `blocking` su reqwest.
- Frontend: `preview.store.frameUrl` (l'iframe carica il proxy, la barra URL
  mostra il target reale); `showPreview(url, {isStatic})` centralizza tutto
  (bottone, banner, palette, barra indirizzi, auto-open); `selection.store`
  con `file?/line?/selector/text`; `ElementCompose` compone il prompt anche
  senza source-mapping (descrive tag/selettore/testo/HTML e l'agente localizza);
  `PreviewPanel` accetta hover/select senza file:riga e il vecchio hint
  "Add forgiaInspector()" è sostituito.

### Anteprima più tenace

- `watchForDevServer`: non più 30s una tantum — continua finché il pannello è
  aperto e vuoto (cap 10 min, poll 2s).
- `onDevUrlDetected` ignora le porte di kikkoCode (engine/1420/preview): un
  health-check del motore nell'output dell'agente non può più dirottare l'iframe.

**Limite noto:** attraverso il proxy l'HMR websocket di Vite non si aggancia
(tiny_http non fa upgrade) → niente hot-reload live nel pannello; compensa il
refresh automatico a fine task (`bumpReload`). Lint/build/22 test verdi (Rust →
CI).

---

## 2026-07-01 · Anteprima universale: URL dall'output = fonte di verità

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

Caso reale: dev server su `localhost:3002` (Vite lo stampa), ma l'anteprima
apriva `localhost:17600` → **404**. Tre problemi che si sommavano, ora risolti:

1. **Il probe accettava qualsiasi risposta** (anche un 404) come "server". Ora
   `find_dev_server` accetta solo una **pagina vera** (HTTP < 400) → una porta
   con un servizio a caso che risponde 404 non viene più scelta.
2. **L'URL stampato dal server non vinceva.** Ogni dev server stampa il suo URL
   (`Local: http://localhost:3002/`): questa è la fonte autorevole, non lo scan.
   Nuovo `onDevUrlDetected(url)` (frontend): quando l'URL compare nell'output
   dell'agente (`useTerminalEvents`) o del nostro server gestito
   (`useDevServerEvents`), lo registra come `detectedUrl` **e naviga l'anteprima
   lì**, soppiantando qualsiasi tentativo di probe/statico.
3. **Una volta mostrato l'URL sbagliato, non cambiava più.** Ora l'arrivo
   dell'URL autorevole ri-naviga il pannello (rispettando l'utente che ha chiuso).

In più, robustezza layout: `detect_dev_command` cerca lo script `dev` nella
cartella aperta **e in un livello di sottocartelle** (salta node_modules/.git/
dist/target/nascoste), così un repo aperto alla radice trova comunque l'app web
in una subdir (es. `web/`, `frontend/`, `hero-demo/`); il runner parte in quella
dir.

Priorità finale: **URL dall'output** › probe (solo pagine <400, IPv4+IPv6) ›
server statico. Lint/build/22 test verdi.

---

## 2026-07-01 · Fix cruciale anteprima: probe IPv4 **e** IPv6 (localhost/::1)

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

Sintomo: anteprima mostrava il server statico (`127.0.0.1:64510`, vuoto) mentre
il dev server era vivo su `localhost:3000` (HTTP 200). Causa: `find_dev_server`
probava solo `http://127.0.0.1:{port}`, ma su Windows `localhost` risolve spesso
a **IPv6 `::1`** e Vite `dev`/`preview` bindano lì → il probe IPv4 falliva → si
ricadeva sullo statico.

Fix in `find_dev_server`:

- prova **sia `127.0.0.1` sia `[::1]`** per ogni porta;
- ritorna l'URL come `http://localhost:{port}/` (il webview lo risolve come il
  server si aspetta, passa eventuali check dell'Host header);
- ora prende anche lo `state`: **auto-esclude** le porte di kikkoCode (engine +
  static preview server + UI 1420), così il probe non scambia il proprio server
  statico per il sito dell'utente.

Frontend invariato. Lint verde (Rust → CI).

---

## 2026-07-01 · Auto-detect anteprima su QUALSIASI porta (enumerazione + retry)

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

L'utente ha dovuto scrivere `localhost:3000` a mano: il probe scansionava solo
una lista fissa di porte, una volta sola → mancava porte insolite / server
ancora in avvio.

Fix: `find_dev_server(exclude)` (Rust) ora **enumera le porte realmente in
ascolto** sulla macchina (`netstat -an -p TCP` su Windows, `ss -ltn`/`netstat`
su unix; parse: righe con LISTEN → porta del socket locale), le HTTP-proba in
parallelo (+ le porte dev note come rete di sicurezza), esclude le porte di
kikkoCode (UI 1420, engine, static server passate da `exclude`), e ritorna la
prima viva (preferendo le porte dev note, altrimenti la più bassa).

Frontend: `probeDevServer` ora chiama `find_dev_server` con gli `ownPorts`
(engine + static). Nuovo `watchForDevServer` (poll ~30s, apre l'anteprima appena
un server compare — copre i server che tardano a bootare o avviati dall'agente).
Chiamato da `openBestPreview`, `syncStaticPreviewOnIdle` e `startDevServer`.
Rinominato il comando `probe_dev_server` → `find_dev_server`.

**Nota selezione visuale:** l'errore "Add forgiaInspector()" è atteso — la
selezione visuale richiede uno script iniettato nel sito (plugin nel progetto o
un proxy che inietta). Da affrontare a parte. Lint/build/22 test verdi.

---

## 2026-07-01 · Dev server gestito da kikkoCode (modello Claude Code) + guida agente

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

Il port-scanning era un cerotto. Soluzione "alla Claude Code": kikkoCode
**avvia e gestisce lui** il dev server come processo tracciato, cattura l'output
in tempo reale e legge la porta **reale** da lì (niente indovinare, niente
finestre separate). Scelta utente: **entrambi** (runner + guida all'agente).

### Rust

- `dev_runner.rs`: `DevRunner` avvia `<pm> run <script>` (pm da lockfile:
  pnpm/yarn/bun/npm; script: dev›start›serve›preview da `package.json`) nel cwd
  del progetto, stdout/stderr in pipe → stream come eventi `dev-server-log`,
  watcher di uscita → `dev-server-exit`. `stop()` (kill), `status()`,
  `detect_dev_command()` pub. Su Windows i comandi npm passano da `cmd /C`.
- `lib.rs`: `AppState.dev`; comandi `start_dev_server`, `stop_dev_server`,
  `dev_server_status`, `dev_command_info`.

### Frontend

- `devserver.store` (running/starting/command/logs capped).
- `useDevServerEvents`: consuma `dev-server-log` → `detectDevServerUrl` (riuso)
  → apre l'anteprima all'URL **vero**; capta i log per la vista "starting".
- `opencode/preview.ts`: `startDevServer`/`stopDevServer`/`getDevCommand`;
  `openBestPreview` e `syncStaticPreviewOnIdle` ora, se non c'è URL vivo né
  pagina statica ma il progetto ha un dev script, **avviano il server** da soli.
- `PreviewPanel`: tasto Run/Stop in toolbar, stato "Starting…" con log live,
  empty-state con bottone "Run dev server (<cmd>)".

### Guida all'agente (Entrambi)

- `skills/previewPolicy.ts`: nota nascosta `[[kikko-note]]` iniettata sui prompt
  web (keyword) che dice all'agente di NON avviare dev server in finestre
  staccate né aprire il browser — ci pensa kikkoCode. `parseSkills` la strippa
  dalla vista come i blocchi skill.

Lint/build/22 test verdi.

---

## 2026-07-01 · Anteprima: rilevamento attivo dei dev server (porte comuni)

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

Problema: su un progetto Vite l'anteprima non funzionava. L'agente aveva
lanciato `pnpm run dev` (→ localhost:3000) in una **finestra PowerShell
separata** (`Start-Process`), quindi kikkoCode non ne vedeva l'output nel suo
terminale → `detectedUrl` restava null → ricaduta sul server statico che serve
la radice (senza `index.html`, l'app Vite è tutta in `/src`) → pagina vuota.

Fix: non dipendere più solo dall'output del terminale. Nuovo comando Rust
`probe_dev_server` che **sonda in parallelo** le porte dev più comuni
(3000, 5173, 5174, 4173, 4200, 4321, 8080, 3001, 8000, …) con timeout 500ms e
ritorna la prima viva. Priorità unica in `resolvePreviewUrl` (frontend):
`detectedUrl` (da terminale) › `probeDevServer` › server statico › vuoto.
Usata sia dal tasto anteprima (`openBestPreview`) sia dall'auto-open a fine run
(`syncStaticPreviewOnIdle`). Lint/build/22 test verdi.

**Nota:** l'agente a volte apre anche il browser di sistema
(`Start-Process http://localhost:3000`) — comportamento del modello, non della
GUI; l'anteprima in-app ora comunque trova e mostra il server.

---

## 2026-07-01 · Server statico integrato + anteprima automatica

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

Obiettivo utente: "chiedi una pagina → la vedi subito", senza lanciare comandi.

### Rust

- `preview_server.rs`: mini HTTP server statico (`tiny_http`) che serve la
  cartella del progetto. Bind di una porta fissa all'avvio; la root segue il
  progetto aperto (`set_root`). MIME per estensione, dir → `index.html`,
  anti-path-traversal (canonicalize + prefix check), percent-decode dei path
  (nomi cartella Windows con spazi/accenti).
- `lib.rs`: `AppState.preview: Option<Arc<PreviewServer>>`; root impostata
  all'avvio (ultimo progetto) e ad ogni `set_working_dir`. Comando `preview_url`
  → `Some(url)` **solo se** il progetto ha un `index.html` servibile, altrimenti
  `None` (così la UI mostra lo stato vuoto invece di una root vuota).

### Frontend

- `opencode/preview.ts`: `getStaticPreviewUrl` (invoke `preview_url`),
  `openBestPreview` (dev server rilevato › server statico › vuoto),
  `syncStaticPreviewOnIdle` (a fine run: se c'è una pagina la **apre in
  automatico**, o la ricarica se già mostrata; il dev server reale ha priorità;
  rispetta l'utente che ha chiuso l'anteprima).
- `useChatEvents` `session.idle` → chiama `syncStaticPreviewOnIdle()`.
- `preview.store`: `closedByUser` (no auto-open dopo chiusura manuale) +
  `reloadNonce`/`bumpReload` (rinfresca l'iframe quando l'agente modifica i file,
  il server statico non ha HMR). `PreviewPanel` usa il nonce nella `key`.
- `ChatShell`: il tasto anteprima ora usa `openBestPreview`.

Risultato: l'agente scrive `index.html` → a fine task l'anteprima si apre da
sola e mostra la pagina; alle modifiche successive si ricarica. Lint/build/22
test verdi.

---

## 2026-07-01 · Fix "stuck on Working" + preview onesto (no più localhost:5173 rotto)

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

Due bug segnalati dopo il primo giro funzionante.

### 1. La chat restava su "Working" a task finito

Causa: in `useChatEvents` l'handler `session.updated` faceva **sempre**
`setSessionRunning(id, true)`. Ma opencode emette `session.updated` per tanti
motivi — incluso la **generazione del titolo alla FINE del run** — quindi subito
dopo `session.idle` (running=false) arrivava un `session.updated` che rimetteva
running=true → bloccato per sempre.
Fix: il flag "running" ora è di proprietà della finestra **send→idle**:
`useSendPrompt` lo mette `true` in `onMutate` (e `false` in `onError`), `session.idle`/`session.error` lo mettono `false`, e `session.updated` **non lo tocca più** (fa solo invalidate della lista).

### 2. Anteprima "non funziona"

Apriva sempre `http://localhost:5173/` anche senza dev server → pagina rotta
(l'agente aveva creato un `index.html` statico, nessun server in ascolto).
Fix: `preview.store` ora ha `previewOpen` separato da `previewUrl`. Il tasto
anteprima apre il pannello; se non c'è un dev server rilevato mostra uno
**stato vuoto onesto** ("No dev server detected — avvia `npm run dev`, lo
rilevo da solo, oppure scrivi un URL") invece di un iframe rotto. La barra
indirizzi resta usabile. `App` monta il pannello su `previewOpen`.

**Nota:** per vedere un `index.html` **statico** serve comunque un server
(HMR/preview vivono su un dev server). Prossimo possibile: mini static-server
integrato che serve la cartella del progetto per l'anteprima 1-click dei siti
statici. Lint/build/22 test verdi.

---

## 2026-07-01 · Project/workspace picker — apri cartella / clona repo GitHub / crea progetto

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

Mancava il pezzo fondamentale: scegliere **su quale cartella** lavorare. In
opencode il "progetto" **è** la cwd di `opencode serve`, che finora non veniva
mai impostata (l'engine girava nella cartella di lancio dell'app). Quindi
aprire una cartella / clonare un repo / crearne uno si riducono a: **imposta la
cwd dell'engine e riavvialo** (stesso meccanismo del key-injection provider).

### Cosa è cambiato

**Rust (`src-tauri`)**

- `sidecar/mod.rs`: nuovo campo `working_dir: Arc<Mutex<Option<PathBuf>>>` +
  `set_working_dir()`/`working_dir()`; nello spawn `command.current_dir(dir)`.
- `lib.rs`: comandi `get_working_dir`, `set_working_dir` (imposta cwd, riavvia,
  ri-emette `opencode-ready`, salva last-project), `clone_repo` (git clone via
  git di sistema → riusa le credenziali per i private), `create_project`
  (mkdir + `git init` opzionale). Plugin `tauri-plugin-dialog` registrato.
  All'avvio ricarica l'ultimo progetto (`config_store::load_last_project`).
- `config_store.rs`: `save_last_project`/`load_last_project` in
  `<config>/opencode/kikkocode.json` (stato nostro, separato da opencode).
- `Cargo.toml` + `capabilities/default.json`: dialog plugin + `dialog:default`.

**Frontend**

- `stores/workspace.store.ts` (persistito): `currentDir` + `recents[]`.
- `opencode/workspace.ts` `useProjectActions()`: `pickDirectory` (dialog nativo),
  `openProject` (invoke set_working_dir → `initClient(newUrl)` + restart event
  stream + reset sessione attiva + `invalidateQueries`), `cloneRepo`,
  `createProject`. Ri-init client come `useConnectProvider` (nuova porta ad ogni
  restart).
- `features/project/ProjectPicker.tsx`: modale 3 tab (Open folder / Clone from
  GitHub / New project) + lista **recenti** (riapri/rimuovi).
- `features/project/ProjectBar.tsx`: barra in cima alla sidebar col nome del
  progetto corrente → apre il picker; sincronizza `currentDir` con la cwd reale
  dell'engine via `get_working_dir` quando pronto.
- `ui.store`: `projectPickerOpen` + open/close. `App.tsx`: `<ProjectBar/>` in
  cima alla sidebar + `<ProjectPicker/>` tra gli overlay globali.

### Gotcha

- Cambio progetto = riavvio engine su **nuova porta** → bisogna `initClient` col
  nuovo URL a mano (l'onReady dell'OpencodeProvider è guardato da `ready.current`
  e ignorerebbe il nuovo evento). Stesso pattern del provider-connect.
- Le sessioni sono **per-progetto**: allo switch resetto `activeSessionId` e
  invalido tutte le query così la lista sessioni si ricarica per la nuova cartella.
- Repo privati: si affida al `git` di sistema (credential manager/gh già
  configurati). Nessun token gestito in-app per ora.
- Rust non compila in web-env (proxy blocca crates.io) → verificato per
  ispezione, compila la CI. Frontend: lint/build/22 test verdi, prettier pulito.

---

## 2026-07-01 · Pannello inferiore ridimensionabile + tasto anteprima in-app

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

Due richieste utente:

1. **Prompt abbassabile/alzabile.** Quando si aprivano Terminal/Inspector/Timeline
   il pannello in basso aveva altezza fissa (`h-[42vh]`) e schiacciava la chat, senza
   modo di riportare in basso il prompt. Ora il divisore sopra il pannello è una
   **maniglia trascinabile** (`cursor-row-resize`): `ui.store` tiene `bottomHeight`
   (default 340px), `App.tsx` applica `style={{ height: bottomHeight }}` e un handler
   `startResize` (pointer events su `document`) calcola l'altezza da
   `innerHeight - clientY - 28` (28px = status bar), clampata `[140, innerHeight*0.82]`.
2. **Anteprima web dentro kikkoCode** (non Chrome). Il `PreviewPanel` già rendeva un
   `<iframe>` in-app in colonna destra quando `previewUrl` è settato — mancava solo un
   modo per aprirlo dall'header. Aggiunto tasto `MonitorPlay` in `ChatShell` che fa
   toggle: `openPreview(detectedUrl ?? "http://localhost:5173/")` / `closePreview()`,
   con stato attivo evidenziato come il tasto terminale.

### Gotcha

- La maniglia usa listener su `document` (non sul div) così il drag non "sfugge" se il
  puntatore esce dal bordo; ripristina `userSelect`/`cursor` del body a `pointerup`.
- Il tasto anteprima resta separato dall'`openExternal` (`window.open`) già presente nel
  PreviewPanel: quello apre il browser esterno, questo è l'in-app che l'utente voleva.

Lint verde, build verde (1050KB), 22 test ok, prettier pulito.

---

## 2026-07-01 · Sistema Skills (auto-routing) — manager + badge + 12 skill design

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

Sistema di "skills" alla ECC, ma lato guscio e deterministico: una skill è un
playbook (istruzioni) + un innesco in linguaggio naturale. Descrivi il fine, il
matcher sceglie la skill — senza saperne il nome.

- `skills/catalog.ts`: **12 skill** design/front-end curate dai progetti più
  stellati 2025-26: UI/UX Pro Max, Hero Section, GSAP Motion, Motion (Framer),
  Aceternity/Magic UI, Micro-interactions, Glass & Aurora, Bento Grid, Smooth
  Scroll, A11y Guardian, Design System, Responsive Master.
- `skills/match.ts`: matcher keyword+descrizione (top-2 sopra soglia) +
  `injectSkills` (playbook nel prompt con marker nascosti) + `parseSkills`
  (rimuove i marker, estrae gli id per il badge).
- `stores/skills.store.ts`: enabled + autoApply, persistiti (tutto ON di
  default → funziona subito).
- Iniezione in `ChatShell.handleSend`; **badge "skill applicata"** sulla bolla
  utente (`MessageBubble`); **chip live "will apply"** in `ChatInput` mentre
  scrivi.
- **Skills Manager**: nuovo tab in `SettingsModal` (Skills/Agents/MCP) con
  toggle auto-apply, on/off per skill, anteprima del playbook, ricerca.

Fonti idee/strumenti: Motion, GSAP, Aceternity UI, Magic UI, React Bits (~37k★),
shadcn/ui, Lenis, Tailwind. Frontend-only. Lint+prettier+build+test verdi.

---

## 2026-07-01 · Cost & Context Guard (pre-invio) + indicatore modello online

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

Due richieste utente.

- **Cost & Context Guard** (`usePromptCost` + strip in `ChatInput`): stima
  **prima dell'invio**, live mentre scrivi, per il modello selezionato — token
  della bozza (chars/4), **% contesto** proiettato dopo l'invio (color-coded
  65/85%), e **costo input stimato** (`model.cost.input` per 1M token). Amplifica
  il Context Inspector: non solo vedi il consumo, lo **anticipi**.
- **Indicatore modello online** (`ChatShell`): il pallino verde "online" ora
  mostra **il modello attivo** (es. `● online · deepseek-chat`), con glow.

Frontend-only. Lint+prettier+build+test verdi.

---

## 2026-07-01 · Command Center Agenti/Skill/MCP (idea da ECC)

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

Task #9, ultimo delle 4 integrazioni. Il `SettingsModal` diventa una plancia:

- **Ricerca** in cima che filtra il tab attivo (agenti per nome/descrizione/
  mode/tool; MCP per nome/tipo/url), con clear e autofocus.
- **Badge conteggio** sui tab: numero agenti, e MCP `connessi/totali`.
- Empty-state contestuale ("No agents match …").

Query React-Query deduplicate (i conteggi riusano le stesse cache). Tutte e 4
le integrazioni ispirate a jcode/ruflo/ECC completate: Mermaid, tool-card live,
plan tree, command center. Lint+prettier+build+test verdi.

---

## 2026-07-01 · Plan tree live (idea da ruflo/goal) — usa i todo di opencode

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

Task #8. Scoperto che opencode ha un **sistema di todo strutturato** (tipo
`Todo`, evento `todo.updated`, endpoint `GET /session/{id}/todo`). Lo
visualizziamo (è il ruolo del guscio) invece di reinventarlo.

- `stores/todo.store.ts`: todos per sessione.
- `useChatEvents`: handler `todo.updated` → aggiorna lo store in tempo reale.
- `features/chat/PlanTree.tsx`: checklist live con icone di stato (○ pending, ◐
  in_progress con spinner, ✓ completed, ✗ cancelled), barra di progresso
  done/total, badge priorità, collassabile. Seed iniziale via `session.todo` al
  mount (per reload/switch sessione). Non mostra nulla finché non c'è un piano.
- `ChatShell`: `<PlanTree>` sopra la MessageList quando c'è una sessione.

Le task si spuntano da sole mentre l'agente lavora. Lint+prettier+build+test
verdi. Prossimo: command center Agenti/Skill/MCP (task #9).

---

## 2026-07-01 · Tool-card "vive": timer, preview, spinner (idea da ruflo)

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

Task #7 delle integrazioni. `ToolCallCard` ora è viva:

- **Timer live** che ticka (200ms) mentre il tool gira, poi si ferma sulla
  durata finale a completamento/errore (da `ToolState.time.start/end`).
- **Spinner** accanto a "running".
- **Preview inline** di una riga (comando/path/query dall'input del tool) sotto
  l'header quando è chiusa → si vede a colpo d'occhio cosa fa ogni tool; i tool
  paralleli si impilano come card live separate.

Lint+prettier+build+test verdi. Prossimo: Plan tree (task #8).

---

## 2026-07-01 · Differenziatore: diagrammi Mermaid in chat (idea da jcode)

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

Prima delle 4 integrazioni scelte (ispirate a jcode/ruflo/ECC): rendering dei
blocchi ```mermaid nella chat.

- `MermaidDiagram.tsx`: mermaid **lazy-loaded** (chunk separato 621KB, caricato
  solo al primo diagramma → bundle main invariato), `securityLevel: strict`
  (contenuto dal modello), tema dark coi nostri colori. **Tollerante allo
  streaming**: `parse` fallisce su input incompleto → tiene l'ultimo SVG buono e
  mostra il sorgente come fallback finché non parsa.
- `MarkdownContent`: override del componente `pre` → i blocchi mermaid diventano
  diagrammi, gli altri restano `<pre>` normali (stile invariato).

Lint+prettier+build+test verdi. Prossimo: tool-card live (task #7).

---

## 2026-07-01 · Selettore modelli (chat ↔ reasoner) nel dropdown

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

Su richiesta: rimesso il **selettore di modello** nel dropdown, sotto "Add
provider API key". Mostra i modelli **solo dei provider connessi** (Zen gateway
nascosto), raggruppati per provider, con spunta sull'attivo e context-K.
Cliccare un modello fa `updateConfig.mutate({ model })`; `ChatShell` legge
`config.model` reattivamente, quindi il prossimo invio usa quello — così si
passa da `deepseek-chat` (veloce) a `deepseek-reasoner` a piacere.

Frontend-only. Lint+prettier+build verdi, 22 test.

---

## 2026-07-01 · UX: streaming real-time, velocità percepita, prompt allargabile

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

Il motore ora funziona; tre problemi UX segnalati: (1) prompt non allargabile,
(2) niente streaming real-time, (3) "estremamente lento". (2) e (3) avevano la
stessa radice.

- **Streaming + velocità** (`useChatEvents` + `MessageList`): `message.updated`
  faceva `invalidateQueries` **a ogni token** → refetch completo della lista
  messaggi in continuazione (jank + lentezza), e `MessageList` mostrava solo i
  messaggi già presenti nel fetch → i token non comparivano finché non
  arrivava un refetch. Fix: niente più invalidate per-token (reconcile solo su
  `session.idle`); `MessageList` ora **fonde** history + `liveMessages`/
  `liveParts` in `useMemo` e renderizza i token appena arrivano (incl. messaggi
  live non ancora nella history). `isRunning` reso reattivo (era
  `getState()` non sottoscritto).
- **Modello veloce di default** (`useConnectProvider`): auto-seleziona un modello
  **chat non-reasoning** (i reasoning tipo R1 sono molto più lenti) invece del
  primo qualsiasi.
- **Prompt allargabile** (`ChatInput`): auto-grow fino a 50vh + maniglia
  `resize-y` per trascinare; guardia su `message.time`.

Tutto frontend → nessuna ricompilazione Rust. Lint+prettier+build verdi, 22 test.

---

## 2026-06-30 · Chiavi via ENV + restart motore (meccanismo nativo opencode)

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

La chiave si verificava (✓) ma la chat dava ancora "Invalid API key": scrivere
la chiave nella config provider (sia id nativo sia `byok-`) non bastava — il
motore non la usava nella richiesta chat (config runtime non riapplicata /
provider già istanziato). Cambio di strategia: usare il meccanismo **primario**
di opencode → le **variabili d'ambiente** (lo screenshot mostrava
`DEEPSEEK_API_KEY` come var attesa).

- **Sidecar** (`extra_env: HashMap` + `set_env`): inietta env nel processo
  motore a ogni spawn; persiste tra i restart nella sessione.
- **Comando Rust `set_provider_key(env_var, key)`**: setta l'env e **riavvia** il
  sidecar; il provider nativo carica la chiave all'avvio. Riemette
  `opencode-ready` col nuovo URL.
- **Frontend `useConnectProvider`**: verifica chiave → `set_provider_key` →
  `initClient(newUrl)` + **riavvia lo stream SSE** (il vecchio muore col
  processo e il ready-guard non lo rilancia) → poll providers → auto-seleziona
  il primo modello nativo. `AddProviderKey`: provider noti = path ENV+restart;
  "Other" custom = path byok config (openai-compatible) come prima.

Include modifiche Rust → l'utente ricompila. Lint+prettier+build verdi, 22 test.

---

## 2026-06-30 · ROOT CAUSE "Invalid API key": collisione id provider col nativo

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

Sintomo decisivo: la verifica chiave diceva **"Key verified ✓"** (la chiave è
valida verso `GET /v1/models`), ma la chat dava ancora **"Invalid API key"**.
Quindi NON è la chiave: opencode mandava la richiesta chat con una chiave
sbagliata/vuota.

Causa: scrivevo il provider con id **`deepseek`**, che **collide con il provider
DeepSeek nativo** di opencode (per questo comparivano modelli "V4 Flash/Pro" mai
definiti da noi). opencode **fonde** la mia config con quella nativa e risolve la
chiave dalla sorgente sbagliata → chat 401.

Fix: id dei provider **prefissati `byok-`** (es. `byok-deepseek`) → provider
OpenAI-compatible **pulito e self-contained**, che usa esattamente
`options.apiKey` + `baseURL` (gli stessi che la verifica conferma funzionanti).
Niente merge col nativo. `ModelSwitcher` toglie il prefisso `byok-` nel display.
Anche i provider custom ("Other") vengono prefissati.

Frontend-only → nessuna ricompilazione Rust. Lint+prettier+build verdi, 22 test.

---

## 2026-06-30 · Dropdown minimale + verifica chiave + fix CI (prettier)

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

Richiesta utente: togliere la lista modelli, lasciare solo "Add provider API
key", e **assicurarsi che la chiave funzioni**. Più: la CI era rossa.

- **CI rossa**: lo step `prettier --check` falliva sui file nuovi. Formattati
  tutti → verde.
- **Dropdown minimale** (`ModelSwitcher` riscritto): il menu contiene **solo**
  `AddProviderKey`; il bottone mostra il modello attivo. Nessuna lista modelli.
- **Auto-select modello** (`useAddProvider`): aggiungendo un provider imposta
  anche `config.model = "<id>/<primoModello>"`, così l'invio successivo usa
  quello (non più il default Zen senza chiave).
- **Verifica chiave reale** (nuovo comando Rust `test_provider_key`): prima di
  salvare, l'app fa `GET {baseURL}/models` con Bearer (da Rust → niente CORS) e
  dice chiaramente se il provider **accetta o rifiuta** la chiave. Se rifiutata:
  messaggio esplicito "rigenera la chiave / controlla il saldo". Fine
  dell'ambiguità "è l'app o è la chiave?".
- `AddProviderKey` sempre espanso, stato "Checking…", messaggio "Key verified ✓".

NB: include un comando Rust nuovo → l'utente ricompila (una volta).
Lint+prettier+build verdi, 22 test ok.

---

## 2026-06-30 · L'app si riavviava a ogni config change + invio senza modello

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

DeepSeek ora compare coi modelli (provider fix ok), ma: (1) salvando la chiave o
selezionando un modello l'app si "riapriva" e non succedeva nulla; (2) "ciao" →
"Invalid API key".

Causa (1): in `tauri dev`, cargo gira con cwd = `src-tauri/`, quindi il sidecar
opencode eredita quella cwd e **scrive lì il suo `config.json`** a ogni
`config.update`. Il file-watcher di Tauri lo vede come modifica sorgente →
**ricompila e riavvia l'app a metà azione** (log: "File src-tauri\config.json
changed. Rebuilding"). Selezione modello/salvataggio chiave non si fissavano.

- Fix: `src-tauri/.taurignore` che ignora gli artefatti runtime di opencode
  (`config.json`, `opencode.json`, `auth.json`, `.opencode/`, `storage/`, log).
  Più `.gitignore` per non committarli (contengono la chiave). Config-only →
  niente ricompilazione Rust (basta riavviare `tauri dev`).

Causa (2): `handleSend` inviava **senza modello esplicito** → opencode usava il
default (il gateway Zen, senza chiave) → "Invalid API key". `ChatShell` ora
legge `config.model` selezionato e passa `providerID`/`modelID` alla prompt
(gestendo gli id con slash, es. `openrouter/openai/gpt-4o`).

NB: con la selezione modello che ora "tiene", l'utente deve **scegliere un
modello DeepSeek** e usare una **chiave valida** (quella vecchia è revocata).

Lint+build verdi, 22 test ok.

---

## 2026-06-30 · Fix crash "reading 'role'" — shape skew motore 1.17 vs SDK 0.15

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

Dopo aver aggiunto il provider, l'app mostrava "Something went wrong — Cannot
read properties of undefined (reading 'role')" (catturato dall'ErrorBoundary,
non più schermo nero). Causa: i componenti iteravano i messaggi di sessione
assumendo la forma `{ info, parts }` dell'SDK 0.15 e accedevano a `info.role`,
`msg.tokens.input`, `model.limit.context`, `time.created` senza guardie; il
motore 1.17 può restituire forme leggermente diverse → `info` undefined →
throw in render.

- Nuovo `src/opencode/messageShape.ts`: `rowInfo(row)` (estrae il Message sia
  da `{info,parts}` sia da forma piatta), `isAssistant(m)` (type-guard),
  `createdAt(m)` (tollerante a `time` mancante).
- Applicato a tutti i consumer di messaggi: `useSessionStats` (StatStrip +
  ContextSparkline, sempre montati), `MessageList`/`MessageBubble` (render
  chat), `ContextInspectorPanel`, `CheckpointTimeline`. Optional-chaining su
  `tokens`/`cache`/`cost`/`limit`/`models`.

Fix **solo frontend** → niente ricompilazione Rust. Lint+build verdi, 22 test ok.

---

## 2026-06-30 · Provider funzionante davvero: scrive la config + persiste su disco

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

Il solo `auth.set` non bastava: salvava la chiave ("Key saved") ma DeepSeek non
compariva in `/config/providers` e non si collegava. Su questa versione del
motore serve una **voce di provider nella config**, non solo la credenziale.

- `useAddProvider` (nuovo): scrive una **definizione completa** del provider
  (`name`, `npm: @ai-sdk/openai-compatible`, `options.baseURL+apiKey`, `models`)
  dentro `config.provider.<id>` via `config.update` → il motore lo espone subito
  coi suoi modelli (no restart). Poi `auth.set` come extra.
- **Persistenza su disco** (Rust): nuovo `src-tauri/src/config_store.rs` +
  comando `persist_opencode_provider` che fonde la voce nel `opencode.json`
  globale (`$XDG_CONFIG_HOME`/`~/.config/opencode/opencode.json`,
  `%USERPROFILE%` su Windows). Così sopravvive ai riavvii anche se
  `config.update` fosse solo runtime. Best-effort, non bloccante.
- `AddProviderKey` riscritto con template OpenAI-compatibili (DeepSeek, OpenAI,
  OpenRouter, Groq, xAI, Mistral) + "Other" (id/baseURL/model liberi).
- `ModelSwitcher`: nasconde **OpenCode Zen** (`id==="opencode"`, gateway a
  pagamento) — lista solo i provider connessi dall'utente; guardia su
  `model.limit?.context` per non crashare su modelli custom senza limit.

Lint+build verdi, 22 test ok. Rust → lo compila l'utente/CI.

---

## 2026-06-30 · "Add provider API key" nella GUI (no terminale, alla auth login)

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

L'utente vuole connettere la propria chiave (es. DeepSeek) **dalla GUI**, non
da `opencode auth login`. Problema: `/config/providers` ritorna solo i provider
**già configurati** (da qui si vedeva solo "OpenCode Zen", il gateway a
pagamento). Il catalogo completo (DeepSeek, OpenAI, …) che mostra `auth login`
è bundle locale di opencode, non esposto via HTTP/SDK.

Soluzione: `auth.set({id:"deepseek", body:{type:"api", key}})` registra la
credenziale; dopo, il motore include DeepSeek (coi suoi modelli) in
`/config/providers`. Quindi basta poter impostare la chiave per un id noto.

- Nuovo `features/settings/AddProviderKey.tsx`: sezione in cima al dropdown del
  ModelSwitcher con un `<select>` di provider noti (DeepSeek, OpenAI, Anthropic,
  Google, OpenRouter, Groq, xAI, Mistral) + "Other…" a testo libero, campo
  chiave, salva → `useSetAuth` (che invalida providers+config) → il provider e i
  suoi modelli compaiono sotto. Equivalente GUI di `auth login`.
- Dropdown reso `flex flex-col max-h-[70vh]` con la lista modelli scrollabile,
  così la nuova sezione non sfora.

Lint verde, 22 test ok.

---

## 2026-06-30 · Fix crash impostazioni (schermo nero) + mutazioni silenziose

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

App connessa e funzionante, ma: (1) aprendo le impostazioni l'app crashava a
schermo nero; (2) selezionare un modello o salvare la chiave API non dava
nessun feedback.

- **Schermo nero:** `SettingsModal > SkillsTab` faceva `Object.keys(agent.tools)`
  e leggeva campi dell'agente senza guardie. opencode **1.17** può restituire
  una shape diversa dai tipi dell'SDK **0.15** (es. `tools` assente) → throw in
  render, e **senza error boundary** l'intero albero React si smontava → nero.
  Fix: nuovo `components/ErrorBoundary.tsx` che avvolge l'app (in `main.tsx`) e
  il contenuto del modale; guardia `agent.tools ?? {}`.
- **Mutazioni silenziose:** `useUpdateConfig`/`useSetAuth` non mostravano errori.
  `ModelSwitcher` ora cattura e mostra l'errore (banner rosso nel dropdown) sia
  per la selezione modello sia per il salvataggio chiave, con spunta verde
  "salvato". `useSetAuth` ora invalida `providers`+`config` così la UI riflette
  lo stato autenticato.

Lint verde, 22 test ok.

---

## 2026-06-30 · ROOT CAUSE #2: StrictMode + guardia `started.current` → frontend sordo

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

Col motore ormai **healthy** lato Rust (log: `opencode server listening …`,
`health ok → HTTP 200`, `engine healthy`), l'app restava comunque su
"Connecting to engine…". Il banner si nasconde solo se
`sidecarStatus === "ready"`, quindi il frontend non riceveva mai il ready.

**Causa:** `OpencodeProvider` aveva `const started = useRef(false)` con
`if (started.current) return` in cima all'effect. Sotto `React.StrictMode`
(dev) l'effect gira **mount → cleanup → mount**: il primo mount registra
listener+poll, il cleanup li smonta, il secondo mount trova `started.current
=== true` e **non registra niente** → nessun listener `opencode-ready`, nessun
poll → l'app è sorda al motore (anche se è su).

**Fix** (`src/opencode/OpencodeProvider.tsx`): rimossa la guardia `started`.
Ora ogni mount fa setup/teardown completo e resetta `ready.current` in cima;
il guard `ready` (idempotenza entro il mount) evita doppia init. `startEventStream`
è già idempotente e `stopEventStream` è no-op se non attivo, quindi il ciclo
StrictMode è gestito. Poll esteso a 60×500ms (30s) come backstop, più log
`[kikkocode] engine ready at <url>` in console.

Lint verde, 22 test ok. Questo è il pezzo mancante: Rust connetteva, ma il
frontend buttava via i propri listener.

---

## 2026-06-30 · ROOT CAUSE: risolveva lo shell-script `opencode` (no estensione)

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

Finalmente il log ha rivelato la causa:
`[kikkocode] spawning engine: C:\Users\marce\AppData\Roaming\npm\opencode serve`
→ risolveva il file **`opencode` senza estensione**, cioè lo **shell-script
Unix** che npm installa accanto a `opencode.cmd`/`opencode.ps1`. Windows
`CreateProcess` non può eseguire uno script di shell → il motore non partiva
mai → "Connecting" infinito.

Il bug era in `which_on_path`: controllava il **nome nudo prima** delle
estensioni `PATHEXT`. Su Windows è esattamente al contrario: vanno provate
prima `.cmd`/`.exe`/… e il nome nudo **solo** se lo stem ha già un'estensione.
Fix: ordine invertito su Windows (Unix invariato). Ora risolve
`...\opencode.cmd` e `engine_command` lo instrada via `cmd /C`.

Log aggiunti (richiesti dall'utente):

- `engine_command`: "launching shim via cmd /C: …" oppure "launching directly: …".
- dopo lo spawn: "engine process started (pid …); polling health on … ".
- `wait_healthy`: logga il **primo** errore del probe (connection refused vs
  timeout vs proxy) e l'esito "health ok: … → HTTP <status>".

Lint verde, 22 test ok. (Rust compilato dall'utente / CI.)

---

## 2026-06-30 · Health check robusto (proxy, timeout per-richiesta, fallback)

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

L'app restava su "CONNECTING": il log si fermava a `attaching to external
engine` senza mai arrivare a `attached`, cioè `wait_healthy` non tornava mai.
Cause probabili e fix in `src-tauri/src/sidecar/mod.rs`:

- **Proxy di sistema** (`health_client` con `.no_proxy()`): reqwest di default
  onora `HTTP(S)_PROXY`/proxy di sistema e su macchine con VPN/proxy instrada
  **anche `127.0.0.1`** → ogni probe locale fallisce. Ora i probe bypassano il
  proxy.
- **Nessun timeout per-richiesta** (ora `.timeout(3s)`): il vecchio client non
  aveva timeout sulla singola GET; se il server accettava la connessione ma non
  rispondeva, `send().await` si bloccava **all'infinito** dentro il loop e il
  deadline non veniva mai ricontrollato. Ora ogni richiesta scade in 3s, il
  loop ritenta e alla fine restituisce un errore chiaro.
- **Accetta qualunque risposta HTTP** (non solo 2xx/4xx): un 3xx/5xx prova
  comunque che il processo è vivo; stiamo testando la liveness, non autorizzando.
- **`OPENCODE_BASE_URL` ora è un hint morbido**: se non risponde entro 5s,
  logghiamo e **ripieghiamo sull'auto-spawn** invece di fallire → una env var
  stantia non può più bloccare l'app.
- **Spawn più tollerante**: passiamo solo `--port` (opencode serve fa già bind
  su 127.0.0.1) per evitare mismatch sul nome flag tra versioni.
- Log `[kikkocode] health ok: …/config → HTTP <status>` per confermare il
  collegamento.

Lint verde, 22 test ok. (Rust → CI / build locale dell'utente.)

---

## 2026-06-30 · Fix race "opencode-ready" (resta su CONNECTING anche se il motore è su)

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

Anche con `OPENCODE_BASE_URL` impostata e l'aggancio al server riuscito lato
Rust (`[kikkocode] attaching to external engine…`), l'app restava su
"CONNECTING TO ENGINE…". **Causa: race condition.** Il setup hook in `lib.rs`
emette `opencode-ready` appena `start()` ritorna. Agganciandosi a un server
**già attivo**, `wait_healthy` ritorna in pochi ms → l'evento parte **prima**
che la webview/JS abbia registrato il listener `listen("opencode-ready")`.
L'evento è fire-and-forget → perso → frontend bloccato per sempre.

Fix in `src/opencode/OpencodeProvider.tsx`:

- Estratto `onReady(url)` con guardia `ready` (init una sola volta, da evento
  o da poll).
- Oltre al listener, **poll di `get_opencode_url`** al mount (fino a 20 tentativi
  × 500ms = 10s) così se il sidecar è già pronto recuperiamo l'URL comunque.
  Copre sia l'aggancio istantaneo (OPENCODE_BASE_URL) sia la finestra di
  auto-spawn. Il command `get_opencode_url` esisteva già in `lib.rs` ma il
  frontend non lo interrogava mai.

Lint verde, 22 test ok.

---

## 2026-06-30 · Fix connessione motore su Windows ("CONNECTING TO ENGINE…")

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (questo)

L'app su Windows restava bloccata su "CONNECTING TO ENGINE…" pur avendo un
`opencode serve` funzionante a mano (opencode **1.17.11** sulla porta 4096).
Diagnosi: lo spawn automatico del sidecar falliva e/o il check versione
nagava a vuoto. Interventi in `src-tauri/src/sidecar/mod.rs` + `version.ts`:

- **Risoluzione binario robusta su Windows** (`opencode_bin` + nuovo
  `which_on_path`): la CLI globale installata via npm è uno shim
  `.cmd`/`.ps1`/`.exe`, e `Command::new("opencode")` **non** applica `PATHEXT`
  come la shell → spawn fallito. Ora scandiamo `PATH` con le estensioni di
  `PATHEXT` e troviamo il file reale.
- **Esecuzione shim `.cmd`/`.bat`** (nuovo `engine_command`): un `.cmd` non si
  lancia con `CreateProcess` diretto → lo instradiamo via `cmd.exe /C`. Gli
  `.exe` (e Unix) restano invocati direttamente. Il bundle di release usa
  `opencode.exe` reale, quindi la produzione non passa mai dal wrapper `cmd`.
- **Escape hatch `OPENCODE_BASE_URL`**: se impostata, l'app **non** lancia un
  proprio motore ma si aggancia al server indicato (es. quello avviato a mano
  su :4096). Sblocco immediato finché lo spawn automatico non è verificato.
- **Stdio ereditato + log `[kikkocode] …`**: lo spawn ora eredita stdout/stderr
  e logga i tentativi/health, così il terminale `tauri dev` mostra la causa
  reale di un fallimento.
- **Check versione corretto** (`version.ts`): SDK npm (0.x) e server opencode
  (1.x) hanno **schemi di versione indipendenti** → il vecchio confronto
  `major.minor == 0.15` nagava su ogni install. Ora avvisiamo **solo** se il
  major del motore è sotto `MIN_ENGINE_MAJOR = 1` (motore troppo vecchio).

Frontend lint verde, 22 test ok. (Rust verificato per ispezione — lo compila
la CI; `static.crates.io` resta bloccato in web-env.)

---

## 2026-06-27 · Hardening versioni motore ↔ SDK

**Branch:** `claude/opencode-project-setup-1i59cg` | **Commit:** (vari)

Mitigazioni contro il "cosa succede se OpenCode aggiorna il codice":

- **`package.json`**: `@opencode-ai/sdk` pinnato da `^0` a **`0.15.31`** esatto (no più
  update 0.x silenziosi e potenzialmente rotti all'install).
- **`.github/workflows/release.yml`**: binario opencode **pinnato** via env
  `OPENCODE_VERSION: "0.15.31"` (prova `v<ver>` → `<ver>` → fallback `latest`), allineato
  all'SDK; commento per tenerli in sync.
- **Controllo versione all'avvio**:
  - Rust: `Sidecar::version()` (esegue `opencode --version`) + comando `opencode_version`.
  - `src/opencode/version.ts`: `checkEngineVersion()` confronta major.minor del motore con
    `EXPECTED_ENGINE_MAJOR_MINOR` (0.15, derivato dall'SDK pinnato); non-throwing.
  - `OpencodeProvider`: alla `opencode-ready` chiama il check e, se mismatch, setta
    `engineWarning` nello `ui.store`.
  - `features/statusbar/EngineVersionBanner.tsx`: avviso ambra **non bloccante e dismissibile**.

Frontend build verde, 22 test ok, prettier pulito. (Rust verificato per ispezione — lo
compila la CI; `static.crates.io` resta bloccato in web-env.)

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

_Fine log. Prossimo step: Fase 3.1 — File tree del progetto._
