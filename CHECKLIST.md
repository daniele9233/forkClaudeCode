# FORGIA — Roadmap & Checklist

> Documento operativo, accanto a `PROGETTO.md`. Lo stato delle spunte **è** la nostra memoria tra le sessioni.
>
> **Protocollo:** a inizio sessione → leggi il Log + trova la prossima `[ ]`. A fine sessione → spunta il fatto + 2–3 righe nel Log.
>
> **Architettura (promemoria):** GUI Tauri (React/TS) **sopra** `opencode serve` (sidecar). Non costruiamo il motore. Vedi `PROGETTO.md` §4–§5.

---

## 📌 Log di sessione

> Voce più recente in cima. Formato: `data — fatto — scoperto — riprendere da`.

- _2026-06-26 — **Fatto:** Fase 4.3 — Anteprima web (Fase 4 COMPLETA). `features/preview/PreviewPanel.tsx`: `<iframe>` verso `previewUrl` con toolbar (reload via `reloadKey`, barra URL editabile con normalizzazione schema, open-external `window.open`, close); HMR gestito dal dev server stesso (ricarica l'iframe internamente). `App.tsx`: terza colonna a destra (`w-1/2 border-l`) montata se `previewUrl != null`. ADR `docs/04-adr-web-preview.md`: scelto iframe per ora (testabile senza Rust, dev server non bloccano embedding), webview WRY nativa rimandata a Fase 5 per la selezione visuale (l'iframe cross-origin verso localhost non permette injection diretta). Build verde. **Scoperto:** la selezione visuale (Fase 5) richiederà script iniettato nel progetto (plugin) o webview WRY con `initialization_script` per bypassare la same-origin. **Riprendere da:** Fase 5 — Selezione visuale degli elementi (5.1 studio Onlook)._
- _2026-06-26 — **Fatto:** Fase 4.2 — Rilevamento dev server. `features/terminal/detectDevServer.ts`: `detectDevServerUrl(text)` con regex per `http(s)://localhost|127.0.0.1|0.0.0.0[:port]` + bare `localhost:port`, normalizza 0.0.0.0→localhost (testato su output Vite/Next/CRA). `stores/preview.store.ts`: `detectedUrl`, `previewUrl`, `dismissed` + azioni. `useTerminalEvents`: scansiona output (completed/error) e `state.metadata` (running, per dev server long-running che non si completano mai) → `setDetectedUrl`. `features/preview/DevServerBanner.tsx`: banner ambra con URL + "Open preview" (→ `openPreview`, usato in 4.3) + dismiss; montato in ChatShell sotto l'header. Build verde. **Scoperto:** i dev server restano in stato `running` (non `completed`), quindi la detection deve guardare anche `metadata`. **Riprendere da:** Fase 4.3 — Anteprima web in webview Tauri._
- _2026-06-26 — **Fatto:** Fase 4.1 — Terminale xterm.js. Installati `@xterm/xterm@6`, `@xterm/addon-fit`, `@xterm/addon-web-links`. `stores/terminal.store.ts`: `entries: TermEntry[]` + `writtenIds: Set` per dedupe per part.id. `stores/ui.store.ts`: `bottomOpen` + `bottomTab` ('terminal'|'diff') + `toggleTerminal`. `features/terminal/useTerminalEvents.ts`: hook montato in ChatShell, capta `message.part.updated` con tool=bash su completed/error e aggiunge entry (command da `state.input.command`). `TerminalPanel.tsx`: xterm read-only (`disableStdin`), tema forge (bg #0a0c0e, cursor amber), ANSI (cyan `$ cmd`, rosso errori), FitAddon+ResizeObserver, scrive entry incrementalmente, tasto Clear. `App.tsx`: bottom panel con tab-bar Terminal/Diff (diff solo se file aperto), terminale resta montato (display:hidden) per preservare scrollback; effect riporta a terminal se il file viene chiuso. `ChatShell`: toggle terminale nell'header. `file.store.openFile` ora apre il bottom panel su tab diff. `FileTree` usa `openFile`. Build verde (826KB — xterm pesante, lazy-split in Fase 10). **Riprendere da:** Fase 4.2 — Rilevamento dev server da output._
- _2026-06-26 — **Fatto:** Fase 3.3 — Apertura file alla riga esatta. `file.store.ts`: aggiunto `selectedLine: number|null` e `openFile(path, line?)` (atomico). `FileDiffPanel.tsx`: `revealLine(editor, monaco, line, decoRef)` con `editor.revealLineInCenter + setPosition + deltaDecorations` (classe `monaco-target-line`); `handleEditorMount`/`handleDiffMount` rivelano la riga al mount; `useEffect([selectedLine])` re-rivela se cambia dopo il mount; header mostra `path:riga`; fallback a `patch.hunks[0].newStart` se nessuna riga esplicita. `ToolCallCard.tsx`: `extractFileRef(input)` (prova chiavi `path/filePath/file_path/file` + `line/startLine/start_line/lineNumber`), chip `ExternalLink basename:N` cliccabile → `openFile`. `monaco-editor@0.55.1` installato come devDep per i tipi. Build verde (487KB). **Riprendere da:** Fase 4 — Terminale xterm.js._
- _2026-06-26 — **Fatto:** Fase 3.2 — Diff inline Monaco. `@monaco-editor/react@4.7.0` installato. `src/stores/file.store.ts`: Zustand store `selectedFilePath`. `FileDiffPanel.tsx`: header con path+badge git (A/M/D, +N/-N linee), Monaco DiffEditor side-by-side per file con patch, Monaco Editor read-only per file puliti, `reverseApplyPatch` che ricostruisce l'originale dai patch hunks (logica: context copy+modIdx++, `-` → origLines, `+` → modIdx++). Pannello `h-[42vh]` sotto la chat, si mostra solo quando `selectedFilePath != null`. `FileTree.tsx`: selection ora usa store via `setSelectedFilePath`. Build verde (485KB). **Riprendere da:** Fase 3.3 — Apertura file alla riga esatta._
- _2026-06-26 — **Fatto:** Fase 3.1 — File tree del progetto. `src/opencode/file.ts`: hooks TanStack Query per `useProjectCurrent`, `useFileList(path)`, `useFileRead`, `useFileStatus`, `useInvalidateFiles`. `src/features/filetree/FileTree.tsx`: tree ricorsivo con lazy-load per directory, badge git A/M/D colorati (verde/amber/rosso), icone per estensione (TS=blu, RS=arancio, JSON=giallo, MD=grigio, CSS=rosa, config=viola), sort dirs-first, filtro file ignored. Sottoscrizione a `file.edited` e `file.watcher.updated` per invalidare la cache. `SessionSidebar.tsx`: rimossi `w-56 shrink-0 border-r` dall'aside (spostati al parent). `App.tsx`: sidebar sinistra `w-64` con sessions (max 45% altezza) + divider + file tree (flex-1). Build verde (467KB). **Riprendere da:** Fase 3.2 — Diff inline Monaco._
- _2026-06-26 — **Fatto:** polish UI — angoli prompt input arrotondati elegantemente. `ChatInput.tsx`: `rounded-xl` → `rounded-2xl` + `overflow-hidden` sul container esterno; children ora vengono clippati dentro i bordi. Build verde. **Riprendere da:** Fase 3 — Editor & diff (file tree + Monaco)._
- _2026-06-26 — **Fatto:** Fase 2.5 — Gestione sessioni sidebar. `useDeleteSession` aggiunto a `session.ts` (DELETE /session/{id}). `SessionSidebar.tsx`: lista sessioni ordinata per updated, running indicator pulsante, tempo relativo, tasto New (+), delete on hover (Trash2, non visibile se running). Auto-switch alla sessione precedente dopo delete. `App.tsx` → layout 2-colonne (sidebar 224px + chat flex). `pnpm build` verde (459KB). **Riprendere da:** Fase 3 — Editor & diff (file tree + Monaco)._
- _2026-06-26 — **Fatto:** Fase 2.4 — Input prompt + toggle Plan/Build. `session.ts` → `useSendPrompt` ora accetta `agent?: string` (passato alla body del prompt). `ChatInput.tsx` ristrutturato: riga superiore con pill-toggle Build/Plan (icone Hammer/Map, default Build, bloccato durante run), placeholder dinamico col mode attivo. `ChatShell.tsx` → `handleSend` ora riceve `(text, mode)` e passa `agent: mode` alla mutation. `pnpm build` verde (456KB). **Scoperto:** `agent` nel body del prompt è stringa libera (`"plan"` | `"build"` | `"general"`); `AssistantMessage.mode` restituisce il mode usato. **Riprendere da:** Fase 2.5 — Gestione sessioni nella sidebar._
- _2026-06-26 — **Fatto:** Fasi 2.2–2.3. 2.2: ToolCallCard (già in 2.1) spuntata — card generica con icone per tool type, expand input/output, stati pending/running/completed/error. 2.3: HITL completo — `src/opencode/permission.ts` (useRespondPermission: once/always/reject), `src/stores/permission.store.ts` (Zustand+persist: Map pending + Set allowList con custom storage per Set), `useChatEvents.ts` aggiornato (permission.updated → auto-approve se in allowList, altrimenti addPending), `PermissionBanner.tsx` (banner ambra con 3 pulsanti: Once/Always/Reject; Always → salva tipo in allowList). ChatShell aggiornato con banner sopra l'input. `pnpm build` verde (454KB). **Scoperto:** SDK method `postSessionIdPermissionsPermissionId` (non sotto `session.`); response = "once"|"always"|"reject". **Riprendere da:** Fase 2.4 — Input prompt + toggle Plan/Build._
- _2026-06-26 — **Fatto:** Fase 2.1 — Chat shell + streaming markdown. Creati: `src/stores/chat.store.ts` (liveParts/liveMessages/runningSessions), `src/opencode/useChatEvents.ts` (SSE→store, 6 event types con explicit type params), `src/features/chat/MarkdownContent.tsx` (ReactMarkdown+remarkGfm, streaming cursor), `ToolCallCard.tsx` (ToolPart: pending/running/completed/error, collapsible input+output), `MessageBubble.tsx` (user bubble right, assistant bubble left con text/reasoning/tool), `MessageList.tsx` (auto-scroll, merge live+historic parts), `ChatInput.tsx` (textarea auto-resize, Enter=send, Shift+Enter=newline, abort button), `ChatShell.tsx` (wiring completo, auto-create session). `App.tsx` → solo `<ChatShell>`. `pnpm build` verde (450KB). **Scoperto:** SessionMessages response è `Array<{ info: Message; parts: Part[] }>` (parti incluse); onEventType richiede explicit type param per narrowing TS. **Riprendere da:** Fase 2.2 — Tool-call card avanzata (o 2.3 HITL)._
- _2026-06-26 — **Fatto:** Fasi 1.2–1.6. 1.2: documentato in `docs/02-provider-setup.md` (da eseguire manualmente in locale). 1.3: Rust sidecar (`src-tauri/src/sidecar/mod.rs`: spawn/kill/health su porta libera; lib.rs: comandi Tauri `get_opencode_url`, `stop_opencode`, evento `opencode-ready`). 1.4: SDK layer TS — `src/opencode/client.ts` (singleton), `session.ts` (TQ hooks: list/get/create/prompt/abort), `OpencodeProvider.tsx` (bootstrap + QueryClient). 1.5: `src/opencode/events.ts` (SSE stream via `.stream` AsyncGenerator, `onEvent`/`onEventType`). Store: `src/stores/session.store.ts` (Zustand persist). 1.6: ADR `docs/03-adr-integration-layer.md`. `pnpm build` verde (267KB). **Scoperto:** SDK va importato da `@opencode-ai/sdk/client` (non root — `server.js` usa `child_process`). **Riprendere da:** Fase 2 — Chat shell + streaming markdown (2.1)._
- _2026-06-26 — **Fatto:** Fasi 0.1–0.4. Struttura repo, licenza MIT, .gitignore. Scaffold Tauri 2 + React 19 + TS + Vite (pnpm). Tailwind v4 CSS-first (@tailwindcss/vite), Motion, Lucide, clsx/twMerge. Design token completi in `src/index.css` (palette forge + amber accent, font display/body/mono, spacing, radii, variabili shadcn). `src/lib/utils.ts` cn(). `App.tsx` hello Forgia. `pnpm build` verde. Cargo bloccato in env remoto (static.crates.io policy) → verificare localmente. **Riprendere da:** 0.5 (CI GitHub Actions) → poi 1.2 (provider test) → 1.3 (sidecar Rust)._
- _2026-06-26 — **Fatto:** Fase 1.1. Installato `opencode-ai@1.17.11`, avviato `opencode serve` (porta 4096), ispezionata l'OpenAPI 3.1 (181 op, 444 schemi). Aggiunti `CLAUDE.md` (protocollo di lavoro) e `docs/01-opencode-openapi-findings.md`. **Scoperto:** il rischio #1 (§15.2) è rientrato — token/costo sono nativi su `Session` e `AssistantMessage`, la finestra è in `Model.limit.context`, esiste `GET /session/{id}/context` per "cosa è in contesto", più eventi `compaction.*`/`context.updated`. Streaming via SSE `GET /event`; HITL via `/permission`. **Riprendere da:** confermare il piano Fase 0 (scaffold) → poi eseguire; in parallelo Fase 1.2 (provider di test via `opencode auth`)._
- _(prima sessione: deciso di costruire la GUI sopra OpenCode; riscritti `PROGETTO.md` e `CHECKLIST.md`; raccolte le risorse — OpenCode SDK, Onlook per la selezione visuale, shadcn/Magic UI/Aceternity per la UI. Prossimo passo: Fase 1.1 — avviare `opencode serve` e leggere l'OpenAPI per validare l'integrazione.)_

---

## 🎯 Decisioni da prendere (vedi `PROGETTO.md` §15)

- [ ] **D1.** Strumentazione selezione visuale: `data-*` (Onlook) **vs** jsx-source/click-to-component
- [ ] **D2.** Monaco **vs** CodeMirror 6
- [ ] **D3.** Quanto usare Magic UI/Aceternity (dose di effetti)
- [ ] **D4.** Come bundlare/versionare il binario `opencode`
- [ ] **D5.** Nome definitivo del progetto

---

## Fase 0 — Fondamenta

- [x] **0.1** Inizializza il repo (struttura `PROGETTO.md` §12), licenza, `.gitignore`
- [x] **0.2** Scaffold Tauri 2 + React 19 + TypeScript + Vite; "hello window" che builda su Windows _(cargo check richiede static.crates.io — verificare in locale; frontend build verde)_
- [x] **0.3** Setup Tailwind v4 + shadcn/ui + Motion + Lucide; tema dark-first _(shadcn: setup base + `cn()`; v4 CSS-first; `src/index.css`)_
- [x] **0.4** Definisci i **design token** (palette 4–6 hex, scala tipografica display/body/mono, spacing) — `PROGETTO.md` §10 _(inglobato in 0.3: palette forge-950…50 + amber accent, font display/body/mono, spacing, radii in `@theme` di index.css)_
- [x] **0.5** CI minima (build + lint + format) + cartella `docs/` per gli ADR _(`.github/workflows/ci.yml`: frontend lint+build+format check; rust job con webkit2gtk; `.prettierrc`)_

## Fase 1 — Integrazione col motore OpenCode ⭐ *(da fare per prima)*

- [x] **1.1** Installa OpenCode; avvia `opencode serve`; apri l'OpenAPI `/doc` e **mappa cosa espone** (sessioni, streaming, eventi tool, stato contesto) → nota in `docs/` _(→ `docs/01-opencode-openapi-findings.md`)_
- [ ] **1.2** Configura un provider di test (DeepSeek o Gemini) via `opencode auth`; verifica una risposta dal terminale _(manuale — istruzioni in `docs/02-provider-setup.md`; da completare in locale con chiavi API reali)_
- [x] **1.3** Backend Rust: **spawn/kill di `opencode serve`** come sidecar (porta libera, health check, riavvio) _(→ `src-tauri/src/sidecar/mod.rs`, `lib.rs`; Tauri cmds: `get_opencode_url`, evento `opencode-ready`)_
- [x] **1.4** Frontend: connetti `@opencode-ai/sdk` (`createOpencodeClient`); **crea sessione + invia prompt + ricevi risposta** (round-trip minimo) _(→ `src/opencode/client.ts`, `session.ts`, `OpencodeProvider.tsx`, `src/stores/session.store.ts`)_
- [x] **1.5** **Streaming** dei token/eventi dal server alla UI (rendering progressivo) _(→ `src/opencode/events.ts`: SSE `.stream` AsyncGenerator, `onEvent`/`onEventType` bus)_
- [x] **1.6** ADR: confine e contratto del **layer di integrazione** (cosa passa dalla GUI al motore e viceversa) _(→ `docs/03-adr-integration-layer.md`)_

## Fase 2 — Chat & revisione (la conversazione)

- [x] **2.1** **Chat shell** + streaming markdown (riusa primitive agent-UI da `awesome-shadcn-ui`)
- [x] **2.2** **Tool-call card**: render delle azioni dell'agente (bash, edit, search…)
- [x] **2.3** **Approva/Rifiuta** modifiche e comandi (human-in-the-loop) + allow-list auto-approve
- [x] **2.4** Input prompt + toggle **Plan/Build** (mappato sul motore)
- [x] **2.5** Gestione sessioni (lista, nuova, ripresa) nella sidebar

## Fase 3 — Editor & diff

- [x] **3.1** File tree del progetto _(→ `src/opencode/file.ts` hooks; `src/features/filetree/FileTree.tsx`: lazy-load, git status A/M/D, icone per tipo, selezione; `App.tsx` ristrutturato: sidebar sinistra 256px con sessions (max 45%) + file tree (flex-1 sotto))_
- [x] **3.2** **Diff inline** con Monaco (o CodeMirror, D2) per le modifiche proposte _(→ `@monaco-editor/react` installato; `src/stores/file.store.ts`; `src/features/filetree/FileDiffPanel.tsx`: Monaco DiffEditor side-by-side con ricostruzione original via `reverseApplyPatch`; Monaco Editor read-only per file senza diff; pannello h-[42vh] sotto la chat in `App.tsx`)_
- [x] **3.3** Apertura file alla riga esatta _(→ `file.store.ts`: `selectedLine + openFile(path, line?)`; `FileDiffPanel`: `revealLine` con Monaco `deltaDecorations` on mount + `useEffect` su `selectedLine`; `ToolCallCard`: chip `ExternalLink path:line` cliccabile che chiama `openFile`)_

## Fase 4 — Terminale & anteprima web

- [x] **4.1** **xterm.js**: mostra l'output dei comandi eseguiti dal motore _(→ `@xterm/xterm` + addon fit/web-links; `stores/terminal.store.ts` (entries+dedupe), `stores/ui.store.ts` (bottom panel tab terminal/diff); `features/terminal/useTerminalEvents.ts` (capta ToolPart bash da SSE), `TerminalPanel.tsx` (xterm read-only, tema forge, ANSI colorato); `App.tsx` bottom panel con tab Terminal/Diff; toggle nell'header chat)_
- [x] **4.2** Rilevamento **dev server** (`localhost:PORT`) dall'output _(→ `features/terminal/detectDevServer.ts` (regex Vite/Next/CRA, normalizza 0.0.0.0→localhost); `stores/preview.store.ts` (detectedUrl/previewUrl/dismissed); detection in `useTerminalEvents` su output completed/error + metadata running; `features/preview/DevServerBanner.tsx` (banner ambra "Open preview"))_
- [x] **4.3** **Anteprima web** nella webview Tauri con auto-reload (HMR) _(→ `features/preview/PreviewPanel.tsx`: iframe verso `previewUrl`, toolbar (reload/URL editabile/open-external/close), HMR del dev server ricarica l'iframe da solo; terza colonna in `App.tsx` (w-1/2, border-l); ADR `docs/04-adr-web-preview.md`: iframe ora, webview WRY nativa poi per la selezione visuale Fase 5)_

## Fase 5 — Selezione visuale degli elementi ⭐ *(il pezzo custom più serio)*

- [ ] **5.1** Studia l'architettura di **Onlook** (mappatura `data-oid` file+riga) → nota in `docs/`
- [ ] **5.2** Decidi la strategia (D1) e **strumenta il progetto in anteprima** (plugin/attributi DOM→sorgente)
- [ ] **5.3** **Modalità selezione**: hover-highlight + click → ricava `file:riga`
- [ ] **5.4** **Traduzione in prompt**: comporre il messaggio per OpenCode dall'elemento selezionato + intento utente
- [ ] **5.5** Loop completo: clicco → descrivo la modifica → il motore edita → l'anteprima si aggiorna

## Fase 6 — Context Inspector ⭐ *(il differenziatore)*

- [ ] **6.1** Recupera lo **stato del contesto** dagli eventi/endpoint OpenCode (+ stima lato GUI dove serve)
- [ ] **6.2** **Conteggio token** + % budget rispetto alla finestra del modello
- [ ] **6.3** **Ripartizione** del contesto (system/skill, AGENTS.md, storia, tool result, file)
- [ ] **6.4** Visualizza **compattato/troncato** e **costo** cumulato (shadcn Charts)
- [ ] **6.5** Pannello "cosa l'agente vede ora" (file/elementi in vista)

## Fase 7 — Funzioni del motore esposte nella GUI

- [ ] **7.1** **Switcher provider/modello** (sopra la config OpenCode) + setup chiavi guidato
- [ ] **7.2** **Skill**: UI per vedere/abilitare/disabilitare le skill di OpenCode
- [ ] **7.3** **MCP**: UI per aggiungere/configurare/monitorare server MCP
- [ ] **7.4** **Subagenti**: visualizzazione quando il motore delega sotto-task

## Fase 8 — Differenziatori UX

- [ ] **8.1** **Checkpoint timeline** visuale + rewind (sopra /undo–/redo)
- [ ] **8.2** **Command palette** (Raycast-style), tutto da tastiera
- [ ] **8.3** **Cost & token meter** sempre visibile in barra di stato

## Fase 9 — Pass estetico (la UI spettacolare)

- [ ] **9.1** Momenti-firma con **Magic UI/Aceternity** (onboarding, empty state, transizioni) — con misura (D3)
- [ ] **9.2** Tipografia, spacing, micro-interazioni rifiniti; tema chiaro
- [ ] **9.3** Sequenza d'apertura + reveal della chat (Motion)

## Fase 10 — Hardening

- [ ] **10.1** `prefers-reduced-motion` ovunque (specie Magic UI/Aceternity) + focus tastiera + contrasto
- [ ] **10.2** Stati di errore/empty curati (sidecar caduto, provider non configurato, dev server assente)
- [ ] **10.3** Resilienza del sidecar (crash/restart) e gestione porte occupate
- [ ] **10.4** Test del layer di integrazione (sessioni, streaming, approvazioni)

## Fase 11 — Packaging & release

- [ ] **11.1** **Bundla il binario `opencode`** nel sidecar (D4) + build/installer Windows (Tauri)
- [ ] **11.2** Onboarding al primo avvio: configura il primo provider, spiega Plan/Build, mostra l'Inspector
- [ ] **11.3** README + note di versione
- [ ] **11.4** _(futuro)_ macOS/Linux

---

## ✅ Definition of Done per fase

Builda, i suoi test passano, è spuntata qui, e il Log di sessione è aggiornato.

---

*Riferimento architetturale completo: `PROGETTO.md`.*
