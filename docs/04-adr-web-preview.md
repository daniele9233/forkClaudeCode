# ADR 04 — Anteprima web: `<iframe>` ora, webview WRY nativa poi

**Data:** 2026-06-26
**Stato:** Accettata (provvisoria, rivedere in Fase 5)
**Fase:** 4.3

## Contesto

FORGIA deve mostrare un'anteprima live del dev server del progetto dell'utente
(`localhost:PORT`) con auto-reload, e in Fase 5 deve permettere la **selezione
visuale degli elementi** (hover-highlight + click → `file:riga`), stile Onlook.

Due opzioni per renderizzare l'anteprima:

1. **`<iframe>`** dentro la webview React esistente.
2. **Webview nativa WRY** (una seconda `WebviewWindow` Tauri) embeddata.

## Decisione

Per la **4.3** usiamo un **`<iframe>`**. Motivi:

- **Testabile subito**, senza codice Rust (cargo è bloccato nell'ambiente remoto).
- I **dev server locali non impostano** `X-Frame-Options`/`frame-ancestors`,
  quindi l'embedding funziona (Vite, Next, CRA in dev).
- L'**auto-reload/HMR** è gestito dal client HMR del dev server stesso (websocket
  interno all'iframe): non serve logica lato GUI. Aggiungiamo solo un reload manuale.

## Conseguenze

**Vantaggi**
- Implementazione immediata, zero Rust, funziona in dev browser e in Tauri.

**Limiti (da superare con WRY in futuro)**
- Un iframe **same-origin** è necessario per iniettare lo script di selezione
  visuale (Fase 5). Verso `localhost:PORT` l'origin è diverso da quello dell'app
  Tauri (`tauri://localhost`), quindi `contentWindow.document` sarà **cross-origin**
  e non accessibile direttamente. La selezione visuale richiederà o:
  - uno **script iniettato** nel progetto in anteprima (plugin Vite / `data-*`),
    che comunica via `postMessage` con la GUI, **oppure**
  - una **webview WRY** con `initialization_script` (può iniettare JS in qualsiasi
    pagina, bypassando la same-origin policy).
- L'iframe non dà controllo nativo su navigazione/devtools/intercept richieste.

## Prossimi passi

- **Fase 5.1–5.2:** valutare se lo script di selezione va iniettato via plugin nel
  progetto utente (strategia D1) o via webview WRY con `initialization_script`.
- Se serve WRY, aggiungere comando Rust per creare/posizionare la webview di
  anteprima ancorata al pannello destro (richiede test su Windows).
