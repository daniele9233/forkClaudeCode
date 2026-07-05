import { invoke } from "@tauri-apps/api/core";
import type { TextPartInput, FilePartInput } from "@opencode-ai/sdk/client";
import { runHiddenPlan } from "./hiddenSession";
import { toFileUrl } from "@/lib/utils";

/**
 * Style Memory capture — distills the current project's visual language into a
 * reusable DESIGN.md so you can reapply the exact look to a future site.
 *
 * Hybrid: a hidden plan-mode session (read-only, silenced, `[kikko]`-tagged,
 * deleted after) is told to return the project's DESIGN.md verbatim if one
 * exists, otherwise to inspect the real styling (Tailwind config, CSS
 * variables/tokens, main components, theme) and produce one. Works with any
 * model — it reads code, it doesn't need vision.
 */

const HIDDEN_TITLE = "[kikko] style capture";
const MAX_OUTPUT = 8_000;

const CAPTURE_PROMPT = `Sei un design engineer senior. Estrai il LINGUAGGIO VISIVO di QUESTO progetto in un unico documento DESIGN.md riutilizzabile per costruire altri siti con lo stesso identico stile.

Procedura:
1. Se esiste un file DESIGN.md nella root del progetto, restituisci il suo contenuto (integralo se è incompleto).
2. Altrimenti, ispeziona lo styling REALE del progetto — tailwind config, CSS variables/token, tema, e i componenti principali (nav, hero, bottoni, card) — e ricava un DESIGN.md fedele.

Il DESIGN.md deve avere queste sezioni, con VALORI CONCRETI presi dal progetto (hex reali, nomi font reali, numeri reali):
- Tema & atmosfera
- Palette & ruoli (ogni colore con hex + ruolo semantico)
- Tipografia (font display/body/mono + scala)
- Componenti (button, card, input, nav con i loro stati)
- Layout & spacing (scala, griglia, container)
- Profondità & ombre
- Do's & Don'ts
- Responsive (breakpoint, touch target)
- Prompt guide (2 righe: come richiedere questo stile)

Rispondi con SOLO il contenuto del DESIGN.md in markdown: niente preamboli, niente spiegazioni, niente code fence attorno al tutto.`;

/** Strip an accidental outer code fence. */
function sanitize(reply: string): string {
  let out = reply.trim();
  out = out
    .replace(/^```(?:markdown|md)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  return out.slice(0, MAX_OUTPUT);
}

/** Distill prompt for an EXTERNAL site (from a screenshot and/or its HTML). */
const EXTERNAL_PROMPT = `Sei un design engineer senior. Ti fornisco un sito web (uno screenshot e/o il suo HTML/CSS). Estrai il suo LINGUAGGIO VISIVO in un unico DESIGN.md riutilizzabile per costruire ALTRI siti con lo stesso identico stile.
Se vedi lo screenshot, basati soprattutto su quello; altrimenti usa l'HTML/CSS allegato. Se non riesci a percepire né l'immagine né il codice, rispondi ESATTAMENTE con "NO_STYLE".

Il DESIGN.md deve avere queste sezioni con VALORI CONCRETI (hex reali, nomi font reali, numeri):
- Tema & atmosfera
- Palette & ruoli (hex + ruolo)
- Tipografia (font + scala)
- Componenti (button, card, input, nav con stati)
- Layout & spacing
- Profondità & ombre
- Do's & Don'ts
- Responsive
- Prompt guide (2 righe)

Rispondi con SOLO il contenuto del DESIGN.md in markdown: niente preamboli, niente code fence attorno al tutto.`;

/** Run a hidden plan-mode distiller with the given parts; returns the spec. */
async function runDistiller(
  parts: Array<TextPartInput | FilePartInput>,
): Promise<string> {
  const reply = await runHiddenPlan(HIDDEN_TITLE, parts);
  const spec = sanitize(reply);
  if (spec.length < 40 || /^NO_STYLE\b/i.test(spec)) {
    throw new Error(
      "non sono riuscito a ricavare uno stile (per un URL/screenshot serve un modello con visione, oppure il sito non era leggibile)",
    );
  }
  return spec;
}

/**
 * Capture the CURRENT project's style as a DESIGN.md spec (hybrid: existing
 * DESIGN.md or distilled from the code).
 */
export async function captureStyle(): Promise<string> {
  return runDistiller([{ type: "text", text: CAPTURE_PROMPT }]);
}

/** Build a file part from a local PNG path (as returned by capture_preview). */
function imagePart(path: string, filename: string): FilePartInput {
  return { type: "file", mime: "image/png", filename, url: toFileUrl(path) };
}

/**
 * Capture a style from an EXTERNAL URL: screenshots the page (works on any URL)
 * AND fetches its HTML/CSS, then distills. A vision model uses the screenshot; a
 * text model falls back to the HTML — best-effort on both, needs at least one.
 */
export async function captureStyleFromUrl(rawUrl: string): Promise<string> {
  const url = /^https?:\/\//i.test(rawUrl.trim())
    ? rawUrl.trim()
    : `https://${rawUrl.trim()}`;

  const shot = await invoke<string>("capture_preview", {
    url,
    width: 1440,
    height: 1600,
  }).catch(() => null);

  const html = await invoke<string>("fetch_text", { url })
    .then((t) => t.slice(0, 12_000))
    .catch(() => null);

  if (!shot && !html) {
    throw new Error(`non sono riuscito a leggere ${url} (né screenshot né HTML)`);
  }

  const text = html
    ? `${EXTERNAL_PROMPT}\n\nHTML/CSS del sito (${url}):\n"""\n${html}\n"""`
    : `${EXTERNAL_PROMPT}\n\nSito: ${url}`;
  const parts: Array<TextPartInput | FilePartInput> = [{ type: "text", text }];
  if (shot) parts.push(imagePart(shot, "site.png"));
  return runDistiller(parts);
}

/** Capture a style from a local screenshot image (absolute path). */
export async function captureStyleFromImage(path: string): Promise<string> {
  return runDistiller([
    { type: "text", text: EXTERNAL_PROMPT },
    imagePart(path, "reference.png"),
  ]);
}
