# ADR-003 — Contratto del Layer di Integrazione

> **Stato:** accettato — 2026-06-26  
> **Contesto:** Fase 1.6

---

## Decisione

Il layer di integrazione tra UI React e motore OpenCode è contenuto in
`src/opencode/` e `src/stores/`. Il confine è **unidirezionale e tipato**:
solo questo modulo parla con OpenCode; il resto dell'app consuma dati tramite
hook React Query + Zustand.

---

## Architettura

```
┌────────────────────────────────────────────────────────┐
│  UI React (src/features/, src/components/)             │
│  consuma: useSession, useSessions, useSendPrompt,      │
│           onEventType, useSessionStore                  │
└──────────────────────┬─────────────────────────────────┘
                       │ hook React + Zustand
┌──────────────────────▼─────────────────────────────────┐
│  src/opencode/  — LAYER DI INTEGRAZIONE                 │
│                                                         │
│  client.ts      createOpencodeClient (singleton)        │
│                 initClient(url) → chiamato da Provider   │
│                 getClient() → usato dagli hook          │
│                                                         │
│  session.ts     Hook React Query:                       │
│                   useSessions, useSession,              │
│                   useSessionMessages, useCreateSession, │
│                   useSendPrompt, useAbortSession        │
│                                                         │
│  events.ts      SSE event bus:                          │
│                   startEventStream / stopEventStream    │
│                   onEvent(handler) → unsubscribe fn     │
│                   onEventType(type, handler)            │
│                                                         │
│  OpencodeProvider.tsx                                   │
│                 Wrapper React che:                      │
│                   1. Ascolta "opencode-ready" da Tauri  │
│                   2. Chiama initClient(url)             │
│                   3. Avvia startEventStream()           │
│                   4. Wrappa con QueryClientProvider     │
└──────────────────────┬─────────────────────────────────┘
                       │ @opencode-ai/sdk/client (HTTP)
┌──────────────────────▼─────────────────────────────────┐
│  opencode serve  (sidecar — gestito da src-tauri/)      │
└────────────────────────────────────────────────────────┘
```

---

## Contratto — cosa passa dalla GUI al motore

| Azione GUI | Chiamata SDK | Note |
|---|---|---|
| Crea sessione | `session.create({ body: { title? } })` | Restituisce `Session` |
| Invia prompt | `session.prompt({ path: { id }, body: { parts: [{ type:"text", text }], model? } })` | `parts` = array; `model = { modelID, providerID }` se specificato |
| Lista sessioni | `session.list()` | → `Session[]` |
| Messaggio singolo | `session.get({ path: { id } })` | → `Session` aggiornata |
| Messaggi sessione | `session.messages({ path: { id } })` | → `Array<{ info: Message; parts: Part[] }>` |
| Abort | `session.abort({ path: { id } })` | Interrompe il loop in corso |
| Approva permesso | `POST /session/{id}/permissions/{permID}` | via SDK quando disponibile o fetch diretto |

## Contratto — cosa arriva dal motore alla GUI

Tutto tramite SSE `GET /event` (un singolo stream per sessione):

| Evento | Tipo SDK | Usato da |
|---|---|---|
| Testo in streaming | `EventMessagePartUpdated` (type: `"message.part.updated"`) | Chat |
| Messaggio aggiornato | `EventMessageUpdated` | Chat, Inspector |
| Sessione idle | `EventSessionIdle` | Input area (unlock) |
| Errore sessione | `EventSessionError` | Notifiche |
| Permesso richiesto | `EventPermissionUpdated` | Tool-call card HITL |
| File modificato | `EventFileEdited` | Preview auto-reload |
| Sessione compattata | `EventSessionCompacted` | Inspector |

## Invarianti

1. **`initClient()` prima di qualsiasi hook.** `getClient()` lancia se chiamato
   prima di `initClient()`. `OpencodeProvider` garantisce l'ordine.

2. **Un solo stream SSE attivo.** `startEventStream()` è idempotente.
   `stopEventStream()` è chiamato al cleanup del provider.

3. **React Query = cache dei REST endpoint.** I dati SSE aggiornano la cache
   tramite `queryClient.invalidateQueries()` o `setQueryData()`, non
   ridisegnando tutto.

4. **Gli hook non parlano mai direttamente HTTP.** Tutto passa per
   `getClient()` — così il baseUrl viene scambiato una volta sola (al riavvio
   del sidecar) senza modificare gli hook.

5. **Sicurezza:** `baseUrl` è sempre `http://127.0.0.1:{port}` (loopback).
   `OPENCODE_SERVER_PASSWORD` va impostato dal backend Rust come env var del
   sidecar (future: Fase 1.3 hardening).

---

## Decisioni collegate

- **D4 (bundling opencode):** il backend Rust (Fase 1.3) espone il `base_url`
  tramite Tauri command `get_opencode_url` e evento `opencode-ready`. Il
  frontend non conosce la porta fino a quel momento (è dinamica).
- **Import SDK:** `@opencode-ai/sdk/client` (non il root `@opencode-ai/sdk`
  che include `server.js` con `child_process` — non bundlabile con Vite).

---

## Alternative scartate

- **Polling REST invece di SSE:** scartato. Il SSE è necessario per lo
  streaming di token e per eventi real-time (permessi, file edit).
- **WebSocket custom:** non necessario. OpenCode espone già SSE con auto-retry
  e il PTY usa WS separato (Fase 4).
- **Stato globale solo Zustand (no React Query):** scartato. React Query gestisce
  cache, stale-time e invalidazione senza boilerplate; Zustand copre lo stato
  UI puro (sessione attiva, status sidecar).
