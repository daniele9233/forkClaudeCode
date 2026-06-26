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
