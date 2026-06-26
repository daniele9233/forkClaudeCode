# FORGIA — Roadmap & Checklist

> Documento operativo, accanto a `PROGETTO.md`. Lo stato delle spunte **è** la nostra memoria tra le sessioni.
>
> **Protocollo:** a inizio sessione → leggi il Log + trova la prossima `[ ]`. A fine sessione → spunta il fatto + 2–3 righe nel Log.
>
> **Architettura (promemoria):** GUI Tauri (React/TS) **sopra** `opencode serve` (sidecar). Non costruiamo il motore. Vedi `PROGETTO.md` §4–§5.

---

## 📌 Log di sessione

> Voce più recente in cima. Formato: `data — fatto — scoperto — riprendere da`.

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
- [ ] **2.4** Input prompt + toggle **Plan/Build** (mappato sul motore)
- [ ] **2.5** Gestione sessioni (lista, nuova, ripresa) nella sidebar

## Fase 3 — Editor & diff

- [ ] **3.1** File tree del progetto
- [ ] **3.2** **Diff inline** con Monaco (o CodeMirror, D2) per le modifiche proposte
- [ ] **3.3** Apertura file alla riga esatta (per collegare con la selezione visuale, Fase 5)

## Fase 4 — Terminale & anteprima web

- [ ] **4.1** **xterm.js**: mostra l'output dei comandi eseguiti dal motore
- [ ] **4.2** Rilevamento **dev server** (`localhost:PORT`) dall'output
- [ ] **4.3** **Anteprima web** nella webview Tauri con auto-reload (HMR)

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
