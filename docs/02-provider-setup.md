# Fase 1.2 — Configurazione provider di test

> **Task manuale da eseguire in locale** (richiede chiavi API reali).
> In questo ambiente remoto non sono disponibili credenziali — completare
> prima di procedere con test reali del round-trip.

---

## Procedura

```bash
# 1. Avvia il server (usa il sidecar che viene dalla Fase 1.3 o direttamente)
opencode serve --port 4096

# 2. Configura un provider. Opzioni consigliate:
#    a) DeepSeek (economico, buon rapporto qualità/costo)
opencode auth deepseek
#    → inserisci la chiave da https://platform.deepseek.com/

#    b) Gemini (free tier generoso)
opencode auth google
#    → inserisci la chiave da https://aistudio.google.com/apikey

# 3. Verifica dal terminale che il provider risponda
opencode
# Nel REPL: digita un prompt qualsiasi es. "echo hello" e verifica la risposta

# 4. Verifica via API (con il server già avviato)
SID=$(curl -sS -X POST http://127.0.0.1:4096/session | node -e \
  'let s=""; process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).data.id))')
curl -sS -X POST http://127.0.0.1:4096/session/$SID/prompt \
  -H "Content-Type: application/json" \
  -d '{"text":"Rispondi in una parola: colore del cielo","modelID":"deepseek/deepseek-chat"}' \
  | node -e 'let s=""; process.stdin.on("data",d=>s+=d).on("end",()=>console.log(s))'
```

## Verifica di successo

- Il messaggio assistant ha `cost > 0` e `tokens.input > 0`.
- La risposta è leggibile (non un errore di autenticazione).

## Provider consigliati (da `GET /api/model`, verificato 26-06-2026)

| Provider    | Modello              | Contesto | Note                                                                |
| ----------- | -------------------- | -------- | ------------------------------------------------------------------- |
| `deepseek`  | `deepseek-chat`      | 64K      | ~$0.00014/1K input — ottimo per test                                |
| `deepseek`  | `deepseek-reasoner`  | 64K      | modello di **ragionamento** ("DeepThink") — più lento ma più capace |
| `google`    | `gemini-2.0-flash`   | 1M       | free tier disponibile                                               |
| `anthropic` | `claude-haiku-4-5-*` | 200K     | veloce e economico                                                  |
| `openai`    | `gpt-4o-mini`        | 128K     | —                                                                   |

## Scelta del modello (DeepSeek e altri)

Quando aggiungi una chiave, kikkoCode **al primo collegamento** seleziona in
automatico un modello _veloce_ di default (per DeepSeek: `deepseek-chat`), perché
l'app itera molto sull'interfaccia e un modello di ragionamento sarebbe lento e
più costoso.

Per usare il modello di ragionamento ("pro"): apri il **selettore modello** in
alto a destra e scegli **`deepseek-reasoner`**. Da quel momento la tua scelta
**resta memorizzata** — non viene più sovrascritta quando ri-verifichi la chiave,
riavvii il motore o riapri l'app. L'unico caso in cui l'app riseleziona il
default è la _primissima_ connessione di un provider mai usato prima.

> DeepSeek espone due modelli via API: `deepseek-chat` (veloce, non-thinking) e
> `deepseek-reasoner` (thinking). Non esiste un id "pro v4": il modello "pro" è
> `deepseek-reasoner`.

### Anthropic / Claude

**Anthropic (Claude)** è selezionabile direttamente dall'elenco dei provider
(non usare "Other": Claude **non** è OpenAI-compatible). La chiave si prende da
`https://console.anthropic.com/` e usa l'header `x-api-key` — la verifica in
kikkoCode lo gestisce da sola. Al primo collegamento viene scelto un modello
**Sonnet** (equilibrato); puoi passare a Opus/Haiku dal selettore, e la scelta
resta memorizzata.

## Nota sicurezza

Le chiavi vengono salvate dal CLI di OpenCode (fuori dal repo).
**Non mettere mai chiavi in `.env` o file committati.** Il sidecar Tauri
le eredita dall'ambiente OpenCode — non le gestisce direttamente la GUI.
