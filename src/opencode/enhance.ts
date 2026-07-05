import { runHiddenPlan } from "./hiddenSession";

/**
 * Prompt Enhancer — the fix for "great skills, weak prompt → ugly site".
 *
 * Takes the user's rough request and, in a hidden throwaway session (plan mode
 * → read-only, no side effects, silenced like the memory distiller), rewrites
 * it into a full expert web-design brief: infers the site type, commits to a
 * style + layout, lists real sections/content, sets brand direction, names the
 * stack and quality bar. The result is dropped back into the composer for the
 * user to review/edit before sending — human stays in the loop.
 */

const HIDDEN_TITLE = "[kikko] prompt enhancer";
const MAX_INPUT = 4_000;
const MAX_OUTPUT = 4_500;

function enhanceMeta(rough: string): string {
  return `Sei un direttore creativo + design engineer senior. Riscrivi la richiesta grezza dell'utente in un BRIEF ESPERTO e dettagliato che un coding agent seguirà per costruire un sito web front-end di altissima qualità (come se ci lavorasse un team di 30 esperti di front-end design). NON costruire nulla e NON restituire codice: restituisci SOLO il testo del brief migliorato, pronto da inviare.

RICHIESTA GREZZA DELL'UTENTE:
"""
${rough.slice(0, MAX_INPUT)}
"""

Il brief migliorato, in italiano (mantieni i termini di design/tecnici in inglese), deve:
- Dedurre tipo di sito e obiettivo; se mancano, scegliere l'ipotesi più sensata e dichiararla in una riga.
- Scegliere UNO stile visivo preciso (es. bento, glassmorphism, neubrutalism, neumorphism, minimalismo editoriale, skeuomorphism…) e UN layout (F-shape, Z-shape, split-screen, asimmetrico, masonry/Pinterest…), coerenti col contenuto.
- Definire la direzione di brand: palette (neutri tintati + UN accento), abbinamento font distintivo (mai Inter/Arial), tono di voce.
- Elencare le SEZIONI concrete in ordine (nav, hero, …, footer) con contenuti reali e specifici del settore — niente lorem ipsum, niente placeholder generici.
- Specificare lo stack (Vite + React + TS + Tailwind), animazioni (Framer Motion / GSAP / Lenis con easing corretto, mai ease-in su UI, reduced-motion safe), asset reali (hero/illustrazioni/favicon/OG), e la barra di qualità (responsive 360→ultrawide, WCAG AA, performance, HTML semantico).
- Essere direttivo e specifico, mai generico. Lunghezza 250–500 parole.

Rispondi con SOLO il testo del brief: niente preamboli, niente virgolette, niente intestazioni markdown, nessuna nota su cosa hai fatto.`;
}

/** Strip code fences the model might wrap the answer in. */
function sanitize(reply: string): string {
  let out = reply.trim();
  out = out
    .replace(/^```(?:markdown|md|text)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  return out.slice(0, MAX_OUTPUT);
}

/**
 * Rewrite a rough prompt into an expert brief. Returns the improved text, or
 * the original if anything goes wrong (never throws away the user's input).
 */
export async function enhancePrompt(rough: string): Promise<string> {
  const text = rough.trim();
  if (!text) return rough;
  // Hidden plan-mode session (read-only): it only writes the improved text back.
  const reply = await runHiddenPlan(HIDDEN_TITLE, [
    { type: "text", text: enhanceMeta(text) },
  ]);
  return sanitize(reply) || text;
}
