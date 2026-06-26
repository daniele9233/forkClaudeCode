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
