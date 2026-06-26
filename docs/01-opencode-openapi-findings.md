# Fase 1.1 — OpenCode OpenAPI: cosa espone davvero

> De-risking dell'assunzione fondante (`PROGETTO.md` §6, §15.2): *l'OpenAPI di
> OpenCode espone ciò che serve alla GUI — sessioni, streaming, eventi tool e,
> soprattutto, lo stato del contesto per il Context Inspector?*
>
> **Risposta breve: SÌ, e meglio del previsto.** I dati per token, costo,
> finestra di contesto e "cosa è in contesto" sono esposti nativamente.

---

## Setup usato

- **OpenCode:** `opencode-ai` v**1.17.11** (install via `npm i -g opencode-ai`).
- **Avvio:** `opencode serve --port 4096 --hostname 127.0.0.1`
  → `opencode server listening on http://127.0.0.1:4096`
  - ⚠️ Avverte: `OPENCODE_SERVER_PASSWORD is not set; server is unsecured`
    → in produzione **va impostato** (vedi `PROGETTO.md` §9).
- **OpenAPI:** `GET http://127.0.0.1:4096/doc` → OpenAPI **3.1.0**,
  **181 operazioni** su 156 path, **444 schemi**.
- Tutti i test sotto sono stati eseguiti **live** contro il server.

> Nota path: molti endpoint esistono in doppia forma, con e senza prefisso
> `/api` (es. `/session` e `/api/session`). Per la GUI useremo comunque il
> client ufficiale `@opencode-ai/sdk`, non l'HTTP a mano.

---

## ⭐ Context Inspector — il dato c'è (rischio §15.2 rientrato)

Questo era il rischio #1. Esito: **i dati grezzi sono esposti**, serve poca o
nessuna stima lato GUI per le metriche principali.

### 1. Token e costo aggregati di sessione — **nativi**
L'oggetto **Session** (`GET /session/{id}`, `POST /session`) porta già:
```jsonc
{
  "id": "ses_...",
  "cost": 0,                       // costo cumulato in valuta (number)
  "tokens": {                      // aggregato vivo della sessione
    "input": 0, "output": 0, "reasoning": 0,
    "cache": { "read": 0, "write": 0 }
  },
  "model": null,                   // provider/model correnti
  "directory": "/home/user/...",
  "time": { "created": ..., "updated": ..., "archived": null }
}
```
→ **Cost & token meter** (`CHECKLIST 8.3`) e budget di sessione: dato diretto.

### 2. Token e costo per messaggio — **nativi**
**AssistantMessage** (e `SessionMessageAssistant`) portano per ogni risposta:
```jsonc
{
  "modelID": "...", "providerID": "...",
  "cost": 0.0123,                  // costo del singolo step
  "tokens": {
    "input": ..., "output": ..., "reasoning": ...,
    "cache": { "read": ..., "write": ... },
    "total": ...                   // presente in AssistantMessage
  }
}
```
→ permette la **timeline del consumo** e la ripartizione per step.

### 3. Finestra di contesto del modello — **nativa**
`GET /api/model` elenca **196 modelli**; ogni **Model** ha:
```jsonc
{
  "id": "...", "providerID": "...", "name": "...",
  "limit": { "context": 256000, "input": ..., "output": 64000 },
  "cost":  { "input": ..., "output": ..., "cache": { "read":..,"write":.. },
             "tiers": [...], "experimentalOver200K": {...} },
  "capabilities": { "reasoning": true, "toolcall": true, ... }
}
```
→ **% di budget usato** = `session.tokens.* / model.limit.context`. Diretto.
→ Il **costo** può essere ricalcolato/validato lato GUI dai prezzi in `model.cost`
  (inclusi cache e tier oltre 200K), oltre al `cost` già fornito dal server.

### 4. "Cosa è in contesto" — endpoint dedicato
`GET /api/session/{sessionID}/context` → `{ "data": SessionMessage[] }`.
Restituisce **l'insieme dei messaggi attualmente in contesto** (verificato live:
sessione vuota → `{"data":[]}`). I `SessionMessage` sono un'unione tipata:
`User · Assistant · System · Synthetic · Shell · Compaction · ModelSwitched ·
AgentSwitched`. Da qui si ricava la **ripartizione** (`CHECKLIST 6.3`):
system, storia, tool result, compaction, ecc.
→ Questo è l'endpoint che alimenta il pannello "cosa l'agente vede ora"
  (`CHECKLIST 6.5`).

### 5. Compaction & overflow — osservabili
- Eventi: `session.next.compaction.started / delta / ended`, `session.compacted`.
- Endpoint: `POST /session/{id}/compact`, `POST /session/{id}/summarize`.
- Errore tipato **`ContextOverflowError`** (compare in `AssistantMessage.error`).
- Evento **`session.next.context.updated`** `{ sessionID, messageID, text }`.
→ Copre "cosa è stato compattato/troncato" (`CHECKLIST 6.4`).

**Conclusione Inspector:** % budget, token (in/out/reasoning/cache), costo,
ripartizione e compaction sono **tutti ottenibili dal server**. La stima lato
GUI resta utile solo come *anteprima pre-invio* (token counting locale del
prompt in digitazione), non per i numeri ufficiali.

---

## Sessioni, prompt, streaming (Fase 1.4 / 1.5)

### Round-trip minimo
- `POST /session` → crea (verificato: ritorna Session completa). ✅
- `POST /session/{id}/prompt` (sync) e `POST /session/{id}/prompt_async`.
- `POST /session/{id}/message`, `GET /session/{id}/message`, `GET .../message/{id}`.
- `POST /session/{id}/command`, `POST /session/{id}/shell`.
- Gestione: `GET /session` (lista), `DELETE`, `PATCH`, `fork`, `summarize`,
  `abort`, `children`, `revert`/`unrevert`, `share`/`unshare`, `init`.

### Streaming — Server-Sent Events
`GET /event` (e `/api/event`) — **Subscribe to events**: un unico stream SSE per
tutta l'attività. Eventi rilevanti per la UI (≈90 tipi totali):

| Categoria | Eventi chiave |
|---|---|
| Testo progressivo | `session.next.text.started/delta/ended` |
| Reasoning | `session.next.reasoning.started/delta/ended` |
| Tool-call (lifecycle) | `session.next.tool.called`, `tool.input.started/delta/ended`, `tool.progress`, `tool.success`, `tool.failed` |
| Step/loop agentico | `session.next.step.started/ended/failed` |
| Shell | `session.next.shell.started/ended` |
| Messaggi/parti | `message.updated/removed`, `message.part.updated/delta/removed` |
| Stato sessione | `session.created/updated/idle/error`, `session.status` |
| Contesto | `session.next.context.updated`, `session.next.compaction.*`, `session.compacted` |
| File | `file.edited`, `file.watcher.updated` |
| Permessi (HITL) | `permission.asked/replied` (+ `permission.v2.*`) |
| Domande | `question.asked/replied/rejected` (+ `.v2.*`) |
| MCP / LSP | `mcp.tools.changed`, `lsp.updated` |

→ Copre rendering progressivo (`2.1`), tool-call card (`2.2`), e gli aggiornamenti
  live dell'Inspector.

---

## Human-in-the-loop (Fase 2.3)

Approva/Rifiuta nativo:
- `GET /permission` / `GET /api/permission/request` — richieste pendenti.
- `POST /permission/{requestID}/reply` — rispondi (approva/rifiuta).
- `POST /session/{id}/permission/{requestID}/reply` — variante per sessione.
- `GET /api/permission/saved` + `DELETE` — **allow-list auto-approve** persistita.
- Eventi `permission.asked/replied` per aggiornare la UI.

---

## Funzioni motore esposte (Fase 7)

| GUI | Endpoint |
|---|---|
| Switcher provider/modello (`7.1`) | `GET /provider`, `GET /api/model`, `POST /session/{id}/model`, `GET /provider/auth` |
| Auth provider | `PUT /auth/{providerID}`, `DELETE /auth/{providerID}`, OAuth `POST /provider/{id}/oauth/authorize|callback` |
| Skill (`7.2`) | `GET /skill`, `GET /api/skill` |
| MCP (`7.3`) | `GET /mcp`, `POST /mcp`, `connect/disconnect`, OAuth MCP, `GET /experimental/resource` |
| Subagenti (`7.4`) | `GET /agent`, `POST /session/{id}/agent`, `POST /experimental/session/{id}/background`, evento `session.next.agent.switched` |
| Plan/Build (`2.4`) | gestito via `agent`/`mode` sul prompt e sulla sessione |

## Editor, diff, terminale, file (Fasi 3–4)

- **Diff:** `GET /session/{id}/diff` (per messaggio), `GET /vcs/diff` + `/raw`,
  `GET /vcs/status`, `POST /vcs/apply`. → alimenta Monaco (`3.2`).
- **File:** `GET /file`, `GET /file/content`, `GET /file/status`,
  `GET /find`, `/find/file`, `/find/symbol`, `GET /api/fs/*`. → file tree (`3.1`).
- **Terminale/PTY:** `POST /pty` (crea), `GET /pty/{id}/connect`
  (**WebSocket**, con `connect-token`), `GET /pty/shells`. → xterm (`4.1`).
- **Checkpoint/rewind:** `POST /session/{id}/revert`, `/unrevert`,
  `revert/stage|commit|clear`, `GET /vcs`. → checkpoint timeline (`8.1`).

## Config & lifecycle (per il sidecar, Fase 1.3)

- `GET /api/health` → `{"healthy":true}` (verificato). Health check del sidecar.
- `GET /config`, `PATCH /config`, `GET /global/config`, `GET /config/providers`.
- `POST /global/dispose` / `POST /instance/dispose` — shutdown pulito.
- `POST /global/upgrade` — upgrade del binario.
- `GET /path`, `GET /project/current`, `GET /api/location`.

---

## Implicazioni per la roadmap

- **Rischio §15.2 (Inspector) → rientrato.** Procediamo come da `PROGETTO.md` §7;
  la stima lato GUI serve solo per l'anteprima del prompt in digitazione.
- **SDK:** usare `@opencode-ai/sdk` (`createOpencodeClient({ baseUrl })`) — la
  spec OpenAPI 3.1 conferma la generazione type-safe. Tipi: `Session`, `Message`
  (`AssistantMessage`/`UserMessage`), `Model`, `SessionMessage`.
- **Streaming:** un solo SSE `GET /event` → multiplexare lato GUI per
  feature (chat, tool card, inspector). Il PTY usa **WebSocket** separato.
- **Sicurezza:** impostare `OPENCODE_SERVER_PASSWORD` + binding loopback + CORS
  ristretto (`PROGETTO.md` §9) quando il backend Rust avvia il sidecar.
- **Versione pinnata (proposta):** `opencode-ai@1.17.11` (decisione **D4**).

### Decisioni aperte toccate
- **D4 (bundling binario):** confermato che `npm i -g opencode-ai` installa un
  CLI funzionante con `serve`; per Tauri valuteremo il binario come sidecar.
- Nessuna nuova decisione bloccante emersa per la Fase 0.

---

## Prossimo passo

- **Fase 1.2:** configurare un provider di test (DeepSeek o Gemini) via
  `opencode auth` e validare un round-trip reale con token/costo non-zero.
- In parallelo si può partire con la **Fase 0** (scaffold), che non dipende dal
  provider. Piano in `docs/02-fase0-plan.md` (in attesa di conferma).

> Riferimenti: spec completa salvabile da `GET /doc`. Server testato:
> OpenCode 1.17.11, OpenAPI 3.1.0, 181 operazioni, 444 schemi.
