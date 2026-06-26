# ADR 05 — Selezione visuale degli elementi: strategia D1

**Data:** 2026-06-26  
**Stato:** Accettata  
**Fase:** 5.1–5.5

---

## Contesto

FORGIA deve permettere all'utente di cliccare un elemento nel pannello di
anteprima (iframe verso `localhost:PORT`) e:
1. Sapere a quale **file e riga** corrisponde nella codebase.
2. Comporre e inviare una richiesta di modifica all'agente OpenCode.
3. Vedere l'anteprima aggiornarsi via HMR dopo l'edit.

Il vincolo principale: l'iframe verso `localhost:PORT` è **cross-origin**
rispetto all'app Tauri (`tauri://localhost`), quindi `contentWindow.document`
non è accessibile direttamente dal codice React/Tauri.

---

## Opzioni valutate

| Opzione | Vantaggi | Limiti |
|---|---|---|
| **A. Script iniettato via Vite plugin + postMessage** | Nessun Rust, funziona ora | Richiede che l'utente aggiunga il plugin al suo progetto |
| **B. Webview WRY nativa con `initialization_script`** | Bypass totale della same-origin policy | Richiede Rust, cargo bloccato in env remoto |
| **C. Browser extension** | Funziona su qualsiasi pagina | Troppo invasivo, non integrabile nel flusso |

---

## Decisione: Opzione A — Vite plugin + postMessage

### Architettura sorgente → DOM → file:riga

**Stack sorgente (nel progetto dell'utente):**

React in modalità sviluppo (via `@vitejs/plugin-react`) abilita
automaticamente `@babel/plugin-transform-react-jsx-source`, che aggiunge
a ogni componente JSX la proprietà interna `_debugSource`:

```typescript
// fiber._debugSource ← iniettato da Babel in dev mode
{ fileName: '/Users/john/myapp/src/Button.tsx', lineNumber: 42, columnNumber: 5 }
```

Questo info vive nell'**albero dei fiber React** attaccato ai nodi DOM come
proprietà `__reactFiber$XXXXX` (chiave con suffisso esadecimale generato da React).

**Script bridge (`ForgiaInspectorPlugin.ts` → `forgiaInspector()`):**

Un plugin Vite di FORGIA inietta un piccolo script JS (tramite
`transformIndexHtml`) nella pagina del progetto utente. Lo script:

1. Naviga l'albero fiber da `el.__reactFiber$*` verso `fiber.return`
   finché trova `fiber._debugSource`.
2. Invia `window.parent.postMessage({ type: 'forgia:hover'/'forgia:select',
   file, line, col, tagName, outerHTML }, '*')` quando l'utente muove il mouse
   o clicca.
3. Ascolta comandi dal genitore (`forgia:enable` / `forgia:disable` /
   `forgia:ping`) per attivare/disattivare la modalità di selezione.
4. Segnala la propria disponibilità con `forgia:ready` al caricamento della
   pagina e risponde `forgia:pong` ai ping.

Fallback: se il fiber non ha `_debugSource` (build di produzione o componente
nativo), lo script cerca l'attributo `data-forgia-loc="file:line:col"` sull'
elemento o il suo antenato più vicino (inserito da un eventuale Babel transform
separato, non necessario per l'MVP).

**FORGIA GUI (`PreviewPanel.tsx`):**

```
iframe onLoad → ping → forgia:ready → se selectionMode → forgia:enable
                                                                ↓
                           utente hover → forgia:hover → hoveredElement in store
                           utente click → forgia:select → selectedElement in store
                                                                ↓
                                                    ElementCompose (UI)
                                                    ↓            ↓
                                             openFile(f,l)  useSendPrompt → OpenCode
```

---

## Loop completo (Fase 5.5)

```
1. Utente apre il dev server (url rilevata in 4.2)
2. Pannello anteprima appare (4.3) — iframe verso localhost:PORT
3. L'utente clicca [⊕ Seleziona] nel toolbar del PreviewPanel
4. FORGIA invia forgia:enable all'iframe
5. Utente fa hover sugli elementi → highlight ambra + tooltip file:riga
6. Utente clicca un elemento → forgia:select ricevuto
7. ElementCompose appare sotto il toolbar:
   - Mostra <tag> file.tsx:42 + outerHTML troncato
   - Campo testo: "Cosa vuoi cambiare?"
   - Pulsante [✦ Edit] → compone prompt + invia a OpenCode via useSendPrompt
8. OpenCode edita il file sorgente
9. Il dev server rileva la modifica → HMR aggiorna l'iframe automaticamente
10. Utente vede il risultato senza ricaricare
```

---

## Come abilitare (utente finale)

1. Nella directory del proprio progetto React+Vite, copiare `ForgiaInspectorPlugin.ts`.
2. Aggiungere al `vite.config.ts`:
   ```ts
   import { forgiaInspector } from './ForgiaInspectorPlugin';
   export default defineConfig({
     plugins: [react(), forgiaInspector()],
   });
   ```
3. Riavviare il dev server. L'icona ⊕ nel toolbar del PreviewPanel FORGIA
   diventa attiva (il ping riceve pong).

---

## Limiti noti

- **Solo dev mode**: `_debugSource` è disponibile solo in development build.
  Per la produzione serve il Babel transform separato che inietta `data-forgia-loc`.
- **Pagine non-React**: la selezione non funziona. L'utente vede il hint
  "aggiungi il plugin" nel toolbar.
- **Iframe cross-origin**: la postMessage usa `'*'` come `targetOrigin`.
  Non è un rischio di sicurezza in un ambiente desktop locale, ma in un
  contesto web andrebbero usati origin specifici.
- **WRY nativa (futuro)**: permette `initialization_script` che bypassa la
  same-origin policy e funziona su qualsiasi pagina — da considerare in Fase 5b.

---

## Decisione D1 (checklist)

**Scelta: `data-*` Onlook-style + fiber `_debugSource` + postMessage**  
(non `jsx-source/click-to-component` standalone, che richiederebbe una seconda
webview o un browser extension)
