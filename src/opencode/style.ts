import { getClient } from "./client";
import { markSilent, unmarkSilent } from "./memory";
import { useModelStore, splitModel } from "@/stores/model.store";

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

/**
 * Capture the current project's style as a DESIGN.md spec. Throws with a clear
 * message on failure (empty result, engine error) so the UI can surface it.
 */
export async function captureStyle(): Promise<string> {
  let hiddenId: string | null = null;
  try {
    const created = await getClient().session.create({
      body: { title: HIDDEN_TITLE },
      throwOnError: true,
    });
    hiddenId = created.data!.id;
    markSilent(hiddenId);

    const { providerID, modelID } = splitModel(useModelStore.getState().selected ?? "");
    const res = await getClient().session.prompt({
      path: { id: hiddenId },
      body: {
        parts: [{ type: "text", text: CAPTURE_PROMPT }],
        agent: "plan",
        ...(providerID && modelID ? { model: { providerID, modelID } } : {}),
      },
      throwOnError: true,
    });

    const parts = (res.data?.parts ?? []) as Array<{ type: string; text?: string }>;
    const reply = parts
      .filter((p) => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text)
      .join("\n");
    const spec = sanitize(reply);
    if (spec.length < 40) {
      throw new Error("non sono riuscito a ricavare uno stile dal progetto");
    }
    return spec;
  } finally {
    if (hiddenId) {
      const id = hiddenId;
      getClient()
        .session.delete({ path: { id } })
        .catch(() => {
          /* the sidebar filters [kikko] sessions anyway */
        })
        .finally(() => unmarkSilent(id));
    }
  }
}
