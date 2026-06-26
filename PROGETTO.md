# FORGIA — Documento di Progetto

> **Nome in codice (provvisorio):** *Forgia*. Cambialo quando vuoi.
>
> **Cos'è:** un'app desktop (Windows-first) che mette una **GUI nuova e bellissima** sopra il motore di **OpenCode**. Tu scegli il provider LLM (Gemini, DeepSeek, OpenAI-compatible, Anthropic, modelli locali) e ottieni tutto ciò che fa un agente tipo Claude Code — leggere/modificare file, eseguire comandi, MCP, skill, subagenti — più due cose che Claude Code non ha: **anteprima web con selezione visuale degli elementi** e un **Context Inspector** che mostra cosa l'agente "vede".
>
> **Decisione architetturale fondante:** *non costruiamo il motore.* OpenCode è il motore (la "cucina"); noi costruiamo il guscio e i differenziatori (la "sala"). Vedi §4–§5.
>
> **Stato:** documento vivo. Rileggere a inizio di ogni sessione insieme a `CHECKLIST.md`. Protocollo anti-perdita-di-contesto in §14.

---

## 1. La stella polare

> *La GUI più bella e chiara per un agente di coding model-agnostic — costruita sopra un motore che già funziona (OpenCode), così ogni mese di lavoro va nell'esperienza utente e nei differenziatori, non nel reinventare l'harness.*

Tre pilastri:

1. **Model-agnostic.** Il provider è una scelta dell'utente. Ce lo dà OpenCode (75+ provider).
2. **Context-first.** La finestra di contesto è la risorsa più preziosa: la rendiamo **visibile e leggibile** col Context Inspector. È il nostro differenziatore tecnico.
3. **Estetica da prodotto premium.** Non "un tool che funziona", ma un oggetto che si ha piacere a usare. Riferimenti: Linear, Raycast, Zed, Warp.

---

## 2. Principi guida

- **Riusa il motore, costruisci il guscio.** Tutto ciò che OpenCode già fa, non lo riscriviamo.
- **Human-in-the-loop.** Modifiche ai file e comandi sono proposti e approvabili, con diff visuale.
- **Local-first / privacy.** Codice e chiavi restano sulla macchina. OpenCode non conserva codice o contesto sui propri server.
- **La selezione visuale traduce in prompt.** Cliccare un elemento nell'anteprima diventa un messaggio normale per il motore: il guscio è intelligente, il motore resta semplice.
- **Boldness in un punto solo.** L'elemento-firma è il Context Inspector; tutto il resto resta quieto e disciplinato (vedi §10).

---

## 3. Stack tecnologico

| Livello | Tecnologia | Perché |
|---|---|---|
| **Motore agentico** | **OpenCode** (`opencode serve`, headless) | MIT, 75+ provider, loop agentico, tool, MCP, skill, subagenti, checkpoint git, compaction. Non lo scriviamo noi. |
| **Ponte col motore** | **`@opencode-ai/sdk`** (client TS type-safe) | Generato dalla spec OpenAPI di OpenCode. La GUI lo usa per creare sessioni, inviare prompt, ricevere eventi in streaming. |
| **Shell desktop** | **Tauri 2.x** (Rust + webview nativa) | Binario piccolo, webview nativa (serve per l'anteprima), gestione del processo `opencode serve` come sidecar. |
| **Frontend / UI** | **React 19 + TypeScript + Vite** | Ecosistema più ricco per i pezzi da IDE e per i componenti UI premium. |
| **Stato UI** | **Zustand** (+ TanStack Query) | Leggero. |
| **Styling** | **Tailwind CSS v4** | Engine nuovo, config CSS-first, theming via variabili CSS. |
| **Base componenti** | **shadcn/ui** (su Radix) | Componenti *che possiedi*, accessibili, theming pulito via CSS-variable. La spina dorsale dell'app densa. |
| **Componenti "wow" (con misura)** | **Magic UI** / **Aceternity UI** | Effetti animati copy-paste (bordered beams, bento, kinetic text). Solo per momenti-firma (onboarding, empty state), non ovunque (vedi §10). |
| **Primitive agent-UI** | registry di **agent UI** (chat shell, tool-call card, streaming markdown) | Componenti già pensati per app-agente, su React 19 + Tailwind v4 + AI SDK. Da `awesome-shadcn-ui`. |
| **Grafici (Inspector)** | **shadcn/ui Charts** (Recharts) | Per i cruscotti del Context Inspector; theming coerente coi token. |
| **Animazioni** | **Motion** (ex Framer Motion) | Micro-interazioni e transizioni, con `prefers-reduced-motion`. |
| **Editor / diff** | **Monaco** | Diff editor integrato (cruciale per la revisione delle modifiche). Alt. più leggera: CodeMirror 6. |
| **Terminale** | **xterm.js** | Rendering dell'output di OpenCode (che gira già il PTY lato motore). |
| **Anteprima web** | webview Tauri (WRY) | Carica il dev server del progetto dell'utente. |
| **Selezione visuale** | strumentazione DOM→sorgente (vedi §8) | Onlook-style: `data-*` con file+riga, oppure jsx-source / click-to-component. |
| **Icone** | **Lucide** | Pulite, coerenti. |

> **Cutoff:** versioni stabili note a inizio 2026. Verifica sempre l'ultima stabile prima di pinnare. OpenCode si muove in fretta: aggancia una versione del binario e aggiorna con criterio.

---

## 4. Architettura: "motore + guscio"

```
┌──────────────────────────────────────────────────────────────┐
│                  FORGIA — App Tauri (il guscio)                │
│                                                                │
│   UI React + TS                                                │
│   Chat · Tool-call card · Diff (Monaco) · Terminale (xterm)    │
│   Anteprima web + selezione elementi · Context Inspector ⭐    │
│   Command palette · Checkpoint timeline · Cost meter           │
│        │                                                       │
│        │  @opencode-ai/sdk  (HTTP locale + eventi stream)      │
│        ▼                                                       │
│   ┌────────────────────────────────────────────────────────┐  │
│   │   opencode serve  — sidecar headless (il motore)        │  │
│   │   provider LLM · loop agentico · tool file/shell        │  │
│   │   MCP · skill · subagenti · checkpoint git · compaction │  │
│   └────────────────────────────────────────────────────────┘  │
│        ▲  (spawn / kill / porta)  — gestito dal backend Rust   │
└──────────────────────────────────────────────────────────────┘
```

**Come si avvia:** all'apertura, il backend Rust di Tauri **lancia `opencode serve`** come processo figlio (sidecar), su una porta locale. Il frontend si connette via `@opencode-ai/sdk` (`createOpencodeClient({ baseUrl })`). Da lì la GUI crea sessioni, manda prompt, riceve token ed eventi in streaming. Alla chiusura, il backend termina il sidecar.

**Un solo confine vero:** UI (React) ↔ OpenCode (server locale), via SDK/HTTP. Il backend Rust serve soprattutto a gestire il ciclo di vita del sidecar, la webview di anteprima, e le poche operazioni native.

---

## 5. Cosa ci dà OpenCode (gratis) vs cosa costruiamo noi

Questa tabella è il cuore del progetto.

| **OpenCode ce lo regala** | **Noi costruiamo (il nostro valore)** |
|---|---|
| Connessione a 75+ provider (DeepSeek, Gemini, locali via Ollama) + gestione chiavi (`opencode auth`) | **GUI desktop bellissima** (la "sala") |
| Loop agentico: ReAct, tool-calling, recupero dagli errori | **Context Inspector** ⭐ — visualizza il contesto, colma un buco documentato di OpenCode |
| Tool: lettura/scrittura/edit file, shell, ricerca | **Anteprima web + selezione visuale elementi** — feature che Claude Code *non* ha |
| Client **MCP** | **UX di revisione diff**: tool-call card con approva/rifiuta e diff bello |
| **Skill** + **subagenti** (via frontmatter) | **Command palette**, **cost meter**, switcher modelli, **checkpoint timeline** visuale |
| **Plan/Build mode**; **checkpoint git** (/undo, /redo) | **Layer di integrazione** che traduce azioni della GUI ↔ chiamate SDK |
| **Compaction** del contesto (/compact); memoria di progetto (AGENTS.md) | Onboarding, configurazione provider guidata, temi |
| Diagnostica **LSP** rimandata al modello | (eventuali tool/skill custom in futuro) |
| **Server HTTP headless + OpenAPI + SDK** type-safe | — |

In una riga: **il motore esiste già; noi facciamo la migliore esperienza al mondo sopra di esso.**

---

## 6. Integrazione con OpenCode (sottosistema centrale)

Non scrivendo il motore, il nostro "core" diventa il **layer di integrazione**.

- **Ciclo di vita del sidecar.** Il backend Rust avvia `opencode serve` (porta libera, auth locale opzionale con `OPENCODE_SERVER_PASSWORD`, CORS verso l'origine della UI), ne monitora la salute (`/health`), lo riavvia se cade, lo chiude all'uscita.
- **Client SDK.** `createOpencodeClient({ baseUrl })`. Operazioni base: `client.session.create(...)`, `client.session.prompt(...)`. Tipi importati dal pacchetto (`Session`, `Message`, `Part`), generati dall'OpenAPI.
- **Streaming verso la UI.** Gli eventi del server (token, parti di messaggio, tool-call, stato) vengono inoltrati ai componenti React per il rendering progressivo (chat, tool-call card, Inspector).
- **Mappatura azioni GUI → motore.** Click "Approva modifica", selezione di un elemento nell'anteprima, scelta del modello: tutto si traduce in chiamate SDK o in prompt strutturati.
- **Configurazione.** Provider e modelli si gestiscono via `opencode auth`/config; la GUI offre un'interfaccia sopra questa configurazione.

> Questo è il punto da **validare per primo** su codice vero (vedi Fase 1): leggere l'OpenAPI di OpenCode (`/doc`) e confermare che esponga ciò che ci serve — sessioni, streaming, eventi sui tool, stato del contesto — per alimentare l'Inspector.

---

## 7. Context Inspector ⭐ (il differenziatore)

Il motivo: una recensione indipendente nota che su codebase grandi OpenCode gestisce i limiti di contesto ma **non è sempre chiaro nel comunicare cosa riesce e cosa non riesce a "vedere"**. Il Context Inspector trasforma questa scatola nera in un cruscotto.

Cosa mostra, in tempo reale:
- **% di budget usato** rispetto alla finestra del modello scelto.
- **Ripartizione** del contesto: system/skill attive, memoria di progetto (AGENTS.md), storia, risultati dei tool, file allegati.
- **Cosa è stato compattato** (dopo un /compact) e cosa è stato troncato.
- **Costo cumulato** in token (in/out) e stima in valuta.
- Quali **file/elementi** sono attualmente "in vista" per l'agente.

Si alimenta dagli eventi/stato esposti dal server OpenCode. Dove il dato grezzo non basta, lo stimiamo lato GUI (conteggio token, euristiche). È l'elemento-firma: tutto il resto della UI gli fa da cornice quieta.

---

## 8. Anteprima web + selezione visuale degli elementi

Due feature, una facile e una che è il nostro pezzo di ingegneria più serio. Entrambe vivono nel guscio: OpenCode non ci limita.

### 8.1 Anteprima (facile)
La webview di Tauri carica il dev server del progetto dell'utente. Quando l'agente avvia il sito, dall'output compare un indirizzo tipo `localhost:5173`; lo intercettiamo e lo carichiamo. Il sito si aggiorna da solo (HMR) mentre l'agente modifica il codice.

### 8.2 Selezione visuale "clicca-e-modifica" (Onlook-style)
Riferimento diretto e open source: **Onlook** (Apache 2.0), il "Cursor for Designers". La tecnica per agganciare un elemento cliccato alla **riga esatta di codice**:

- **Strumentazione del progetto in anteprima.** Si inietta, nel build del progetto dell'utente, una mappatura DOM→sorgente. Due strade note:
  1. **Attributi `data-*`** (approccio Onlook: `data-oid`/`data-onlook-id` con *file + riga*). Robusto, indipendente dalla versione di React.
  2. **jsx-source / click-to-component** (es. `vite-plugin-react-click-to-component`, basato su `ericclemmons/click-to-component`): sfrutta le info di sorgente del transform JSX. Più leggero; nota che React 19 ha rimosso `_debugSource`, quindi serve la variante che re-inietta la sorgente nel Fiber.
- **Flusso al click:** modalità selezione → si evidenzia l'elemento sotto il mouse → al click si legge l'attributo → si ricava `file:riga`.
- **Traduzione in prompt:** la GUI compone un messaggio per OpenCode, es. *"l'utente ha selezionato `<button>` in `Hero.tsx:42`, vuole renderlo più grande e cambiare colore in teal"*. Il motore modifica il file come per una richiesta qualsiasi.

> È qui che sta il lavoro vero (strumentare il progetto dell'utente e mantenere la mappa affidabile). Onlook dimostra che è risolvibile; studiamo la sua architettura come blueprint.

---

## 9. Sicurezza & privacy

- **Chiavi API** gestite da OpenCode (`opencode auth`, salvate fuori dal repo); la GUI non le mette mai in chiaro su file. Eventuali segreti aggiuntivi nel keychain di sistema.
- **Server locale protetto:** `OPENCODE_SERVER_PASSWORD` + binding su loopback; CORS ristretto all'origine della UI.
- **Human-in-the-loop:** approvazione su scrittura file e comandi; allow-list granulare per l'auto-approve.
- **Privacy:** il codice resta locale; OpenCode non conserva codice/contesto sui propri server (i provider LLM applicano comunque le loro policy di retention).

---

## 10. GUI / UX — design

> Obiettivo esplicito: *unica, nuova, user-friendly, spettacolare ed elegante — il meglio dei repo esistenti, migliorato.*

### 10.1 Filosofia (principi di design)
- Riferimenti di qualità: **Linear** (calma, gerarchia), **Raycast** (command-first), **Zed/Warp** (densità tecnica elegante).
- **Spendi l'audacia in un punto solo:** l'elemento-firma è il **Context Inspector**; il resto resta quieto.
- **Evita i look "AI-generated" di default** (no cream+serif+terracotta, no nero+verde-acido a caso). La palette nasce dal soggetto: strumenti di precisione, atmosfera da officina digitale.
- **shadcn come base, Magic UI/Aceternity con misura.** Le librerie animate sono pensate per landing page e possono diventare "troppo" in un'app densa; inoltre richiedono gestione manuale di `prefers-reduced-motion`. Quindi: shadcn per l'app vera (chat, diff, pannelli, tabelle); effetti Magic UI/Aceternity solo per momenti-firma (onboarding, empty state, transizioni chiave).
- **Tipografia deliberata:** display + body + mono (per codice/dati), scala intenzionale.
- **Motion con misura:** una sequenza d'apertura, reveal allo scroll della chat, micro-interazioni sulle card. Rispetto di `prefers-reduced-motion`.
- **Copy dal lato dell'utente:** i controlli dicono cosa fanno ("Approva modifica", non "Submit"); errori che spiegano *cosa* è andato storto e *come* rimediare; schermate vuote come inviti all'azione.

### 10.2 Layout (tre pannelli adattivi)
```
┌──────────┬─────────────────────────────────┬──────────────────┐
│ SIDEBAR  │           CONVERSAZIONE          │  PANNELLO         │
│          │                                  │  CONTESTUALE      │
│ Sessioni │  messaggi · streaming markdown   │  Anteprima web    │
│ File     │  tool-call card (approva/rifiuta)│   (+ selezione)   │
│ Skill    │  diff inline (Monaco)            │   oppure Editor   │
│ MCP      │  ─────────────────────────────   │   oppure Terminale│
│ Modelli  │  [ input ]   [Plan | Build]      │   oppure Context  │
│          │                                  │   Inspector ⭐    │
├──────────┴─────────────────────────────────┴──────────────────┤
│  stato: provider/modello · token/costo · checkpoint            │
└────────────────────────────────────────────────────────────────┘
```

### 10.3 Elementi distintivi (il meglio dei repo, migliorato)
- **Tool-call card** revisionabili (approva/rifiuta, motivazione, diff bello).
- **Plan/Build mode** raffinato (lo dà OpenCode; noi gli diamo una bella UI).
- **Checkpoint timeline** visuale + rewind (sopra /undo–/redo di OpenCode).
- **Context Inspector** (firma): §7.
- **Selezione visuale** nell'anteprima: §8.
- **Switcher provider/modello** sempre a portata; **cost & token meter** sempre visibile.
- **Command palette** (Raycast-style): tutto da tastiera.

### 10.4 Quality floor (non negoziabile)
Responsive (anche finestre strette), focus tastiera visibile, `prefers-reduced-motion` rispettato (soprattutto con Magic UI/Aceternity), contrasto adeguato, stati di errore/empty curati.

---

## 11. Risorse, riferimenti e "skill" da usare

Tutto verificato sul web/GitHub. Da tenere a portata mentre costruiamo.

**Motore (OpenCode)**
- Sito/doc: `https://opencode.ai` — Server: `https://opencode.ai/docs/server` — SDK: `https://opencode.ai/docs/sdk` — Provider: `https://opencode.ai/docs/providers`
- OpenAPI locale (a server avviato): `http://localhost:4096/doc`

**Selezione visuale degli elementi**
- **Onlook** (blueprint, Apache 2.0): `https://github.com/onlook-dev/onlook` — tecnica `data-oid` (file+riga), web container, HMR.
- **vite-plugin-react-click-to-component**: `https://github.com/ArnaudBarre/vite-plugin-react-click-to-component` (+ `ericclemmons/click-to-component`).

**Componenti UI premium (per la UI spettacolare)**
- **shadcn/ui** (base accessibile, theming CSS-variable) — `https://ui.shadcn.com`
- **Magic UI** (150+ componenti animati, companion shadcn) — `https://magicui.design`
- **Aceternity UI** (blocchi motion-rich, effetti "wow") — `https://ui.aceternity.com`
- **Cult UI** (componenti animati + pattern AI-app, glue per OpenAI/Gemini/Claude) — utile per le tool-call card e i pattern agente.
- **shadcn/ui Charts** (Recharts) — per i cruscotti del Context Inspector.
- **awesome-shadcn-ui** (meta-lista curata, incl. registry di *agent UI primitives*: chat shell, tool-call card, streaming markdown) — `https://github.com/birobirobiro/awesome-shadcn-ui`

**Fondamenta**
- **Tauri 2** `https://tauri.app` · **Vite** `https://vite.dev` · **Tailwind v4** `https://tailwindcss.com` · **Motion** `https://motion.dev` · **Monaco** `https://microsoft.github.io/monaco-editor` · **xterm.js** `https://xtermjs.org` · **Lucide** `https://lucide.dev` · **Zustand** · **TanStack Query**

> Nota: Magic UI e Aceternity sono "copy-paste" (possiedi il codice) e splendidi, ma pensati per landing page e privi di reduced-motion automatico. Usali con la disciplina del §10.

---

## 12. Struttura del repository

```
forgia/
├─ PROGETTO.md                  # questo documento
├─ CHECKLIST.md                 # roadmap a fasi + log di sessione
├─ src-tauri/                   # backend Rust (shell)
│  ├─ src/
│  │  ├─ sidecar/               # ciclo di vita di `opencode serve`
│  │  ├─ preview/               # gestione webview di anteprima
│  │  └─ commands/              # comandi nativi esposti alla UI
│  ├─ binaries/                 # binario `opencode` bundlato (sidecar)
│  └─ tauri.conf.json
├─ src/                         # frontend React + TS (la GUI)
│  ├─ components/               # UI (shadcn-based, owned)
│  ├─ features/
│  │  ├─ chat/                  # chat, streaming, tool-call card
│  │  ├─ diff/                  # revisione modifiche (Monaco)
│  │  ├─ preview/               # anteprima + selezione visuale
│  │  ├─ inspector/             # Context Inspector ⭐
│  │  ├─ terminal/              # xterm
│  │  └─ checkpoints/           # timeline
│  ├─ opencode/                 # layer di integrazione (SDK client, eventi)
│  ├─ stores/                   # Zustand
│  └─ lib/
└─ docs/                        # ADR (decisioni architetturali), note
```

---

## 13. (sezione assorbita in §6 e §7 — niente "core agentico" da scrivere)

Il motore agentico, i provider, i tool, MCP, le skill e la compaction **provengono da OpenCode**. Quel che nel piano precedente era "costruire l'harness" qui diventa "integrarsi col motore" (§6) e "renderlo visibile/controllabile" (§7). È la differenza che rende il progetto ben definito.

---

## 14. Strategia anti-perdita-di-contesto (per noi che sviluppiamo)

Questi documenti **sono** la memoria tra le sessioni.

**Inizio sessione:** rileggi `PROGETTO.md`; apri `CHECKLIST.md` (lo stato delle spunte = dove siamo) e il "Log di sessione" in cima; trova la prossima task non spuntata.
**Durante:** una fase alla volta; ogni decisione non banale → una riga negli ADR (`docs/`) o nel log.
**Fine sessione:** spunta ciò che è fatto; aggiungi 2–3 righe al log (cosa fatto, cosa scoperto, da dove riprendere).

---

## 15. Rischi & decisioni aperte

1. **Accoppiamento a OpenCode.** Segui la sua API e la sua roadmap. Mitigazione: isolare tutto dietro il layer di integrazione (§6), pinnare una versione del binario, aggiornare con criterio.
2. **Cosa espone davvero l'OpenAPI per il Context Inspector?** Da verificare su codice vero (Fase 1). Se il dato grezzo sul contesto è limitato, parte dell'Inspector va stimata lato GUI.
3. **Strumentazione per la selezione visuale.** `data-*` (Onlook) vs jsx-source/click-to-component. Da decidere dopo un prototipo; React 19 complica la via jsx-source.
4. **Bundling del binario `opencode`.** Come impacchettarlo e versionarlo nel sidecar Tauri (dimensioni, aggiornamenti, multi-OS futuro).
5. **Quali provider mostrare per primi** nella UI (DeepSeek, Gemini, locali) e come presentare il setup chiavi.
6. **Monaco vs CodeMirror 6**; **quanto Magic UI/Aceternity** usare senza scadere nel "troppo".

---

## 16. Glossario rapido

- **Motore / harness:** il ciclo che fa "agire" l'LLM — qui è OpenCode.
- **Sidecar:** processo figlio (`opencode serve`) avviato e gestito dall'app.
- **SDK OpenCode:** client TS che parla col server via HTTP/OpenAPI.
- **Context Inspector:** cruscotto che mostra cosa c'è nella finestra di contesto.
- **Selezione visuale / data-oid:** mappatura da elemento DOM cliccato a riga di codice.
- **Compaction:** riassunto della storia per liberare contesto (lo fa OpenCode, /compact).
- **Checkpoint:** snapshot per il rewind (OpenCode, /undo–/redo).

---

*Fine documento. La roadmap operativa è in `CHECKLIST.md`.*
