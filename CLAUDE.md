# CLAUDE.md

Guida operativa per agenti (Claude Code / OpenCode) che lavorano su questo
repository. **Conciso per scelta.** La fonte di verità completa sono
`PROGETTO.md` (specifica) e `CHECKLIST.md` (roadmap + memoria di sessione).

---

## ⚙️ PROTOCOLLO DI LAVORO (leggi sempre, prima di tutto)

`PROGETTO.md` e `CHECKLIST.md` **sono** la fonte di verità e la memoria tra
le sessioni. Rispetta questo ciclo, senza eccezioni:

1. **A inizio sessione:** rileggi `PROGETTO.md` e `CHECKLIST.md` (il "Log di
   sessione" in cima alla checklist dice dove siamo). Trova la **prossima
   casella non spuntata `[ ]`**.
2. **Durante:** lavora **UNA FASE / UNA TASK ALLA VOLTA**, in ordine. **Non
   saltare avanti** su intere fasi senza revisione umana. Ogni decisione non
   banale → una riga negli ADR in `docs/` o nel Log.
3. **A piccoli passi revisionabili:** prima di modifiche importanti, **proponi
   un piano e aspetta conferma**. Niente grandi refactor non concordati.
4. **A fine di ogni task:**
   - spunta la casella corrispondente in `CHECKLIST.md` (`[ ]` → `[x]`);
   - aggiungi **2–3 righe in cima al "Log di sessione"** (formato:
     `data — fatto — scoperto — riprendere da`).

> Se la checklist e il log non sono aggiornati, la task **non** è finita.

---

## 🧭 Cos'è il progetto (in breve)

**FORGIA** — app desktop Windows-first che mette una **GUI nuova ed elegante
sopra il motore di OpenCode**. Non costruiamo il motore: OpenCode è la "cucina",
noi facciamo la "sala" e i differenziatori. Vedi `PROGETTO.md` §1–§5.

Differenziatori che Claude Code non ha:
- **Context Inspector** ⭐ — mostra cosa l'agente "vede" (token, % budget,
  ripartizione del contesto, costo).
- **Anteprima web + selezione visuale** degli elementi (Onlook-style).

## 🏗️ Architettura: motore + guscio

```
App Tauri (guscio)  ──►  UI React/TS  ──@opencode-ai/sdk (HTTP+stream)──►  opencode serve (sidecar, il motore)
        └── backend Rust: spawn/kill del sidecar, webview anteprima, op. native
```

- **Un solo confine vero:** UI React ↔ `opencode serve` (server locale) via
  `@opencode-ai/sdk` (`createOpencodeClient({ baseUrl })`).
- Il **backend Rust** gestisce il ciclo di vita del sidecar `opencode serve`
  (porta libera, health check, restart), la webview di anteprima e poche
  operazioni native.
- Tutto ciò che riguarda il motore (provider, loop agentico, tool, MCP, skill,
  subagenti, checkpoint, compaction) **viene da OpenCode** — non si riscrive.

## 🧱 Stack tecnologico

| Livello | Tecnologia |
|---|---|
| Motore agentico | **OpenCode** (`opencode serve`, headless) |
| Ponte col motore | **`@opencode-ai/sdk`** (client TS type-safe) |
| Shell desktop | **Tauri 2.x** (Rust + webview nativa) |
| Frontend / UI | **React 19 + TypeScript + Vite** |
| Stato UI | **Zustand** (+ TanStack Query) |
| Styling | **Tailwind CSS v4** (config CSS-first) |
| Componenti base | **shadcn/ui** (su Radix) |
| Effetti "wow" (con misura) | **Magic UI / Aceternity UI** |
| Grafici (Inspector) | **shadcn/ui Charts** (Recharts) |
| Animazioni | **Motion** (con `prefers-reduced-motion`) |
| Editor / diff | **Monaco** (alt. CodeMirror 6 — decisione D2) |
| Terminale | **xterm.js** |
| Anteprima web | webview Tauri (WRY) |
| Icone | **Lucide** |

## 📁 Struttura del repo (target, vedi `PROGETTO.md` §12)

```
src-tauri/   backend Rust (sidecar OpenCode, preview, comandi nativi, binaries/)
src/         frontend React+TS: components/, features/{chat,diff,preview,
             inspector,terminal,checkpoints}/, opencode/ (layer integrazione),
             stores/ (Zustand), lib/
docs/        ADR (decisioni architetturali) e note
```

## 🎯 Regole d'oro

- **Riusa il motore, costruisci il guscio.** Non reinventare l'harness.
- **Human-in-the-loop:** modifiche file e comandi sono proposti e approvabili.
- **Local-first / privacy:** codice e chiavi restano sulla macchina.
- **Boldness in un punto solo:** l'elemento-firma è il Context Inspector; il
  resto resta quieto e disciplinato (`PROGETTO.md` §10).
- **Verifica le versioni** prima di pinnare: OpenCode si muove in fretta.

---

*Dettagli completi: `PROGETTO.md`. Stato e prossimo passo: `CHECKLIST.md`.*
