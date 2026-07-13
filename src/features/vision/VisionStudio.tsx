import { useState } from "react";
import { X, ImagePlus, Sparkles, Loader2, EyeOff, Trophy } from "lucide-react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import type { FilePartInput } from "@opencode-ai/sdk/client";
import { cn, toFileUrl } from "@/lib/utils";
import { getClient } from "@/opencode/client";
import { useConfig } from "@/opencode/config";
import { useProviders } from "@/opencode/context";
import { modelSupportsVision } from "@/opencode/modelCaps";
import { useModelStore, splitModel, modelForRole } from "@/stores/model.store";
import { useSessionStore } from "@/stores/session.store";
import { useChatStore } from "@/stores/chat.store";
import { useVisionStudio } from "@/stores/visionStudio.store";
import { RECIPES } from "@/skills/recipes";

/**
 * Vision Studio — one gesture from image to awwwards site: pick a reference
 * (an awwwards screenshot, a paper sketch, a Figma frame export), and the
 * agent builds the site with the Hero-3D recipe, routed to the DESIGN model.
 *
 * HARD GUARD: if the model that would handle this doesn't support vision, the
 * image picker is BLOCKED with an explicit message (per user request) — no
 * silent "the model can't actually see your image" failures.
 */
export function VisionStudio() {
  const open = useVisionStudio((s) => s.open);
  const close = useVisionStudio((s) => s.close);
  const { data: config } = useConfig();
  const { data: providers = [] } = useProviders();
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const setActiveSession = useSessionStore((s) => s.setActiveSession);
  // Subscribe so the vision check re-evaluates when routing/selection changes.
  useModelStore((s) => s.roles);
  useModelStore((s) => s.autoRoute);
  useModelStore((s) => s.selected);

  const [imagePath, setImagePath] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [launched, setLaunched] = useState(false);

  if (!open) return null;

  // The model this task will ACTUALLY use: the design role when auto-routing
  // is on and assigned, else the manual selection / engine default.
  const effective = modelForRole("design") ?? config?.model ?? "";
  const { providerID, modelID } = splitModel(effective);
  const modelObj = providers.find((p) => p.id === providerID)?.models?.[modelID ?? ""];
  const known = !!modelObj;
  const hasVision = modelSupportsVision(modelObj);
  // Unknown model (not in catalog) → don't block, but the banner still warns.
  const blocked = known && !hasVision;

  const pickImage = async () => {
    if (blocked) return;
    setError(null);
    try {
      const picked = await openDialog({
        multiple: false,
        filters: [
          { name: "Immagini", extensions: ["png", "jpg", "jpeg", "webp", "gif"] },
        ],
      });
      if (typeof picked === "string") setImagePath(picked);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const generate = async () => {
    if (!imagePath || busy || blocked) return;
    setBusy(true);
    setError(null);
    try {
      let sessionId = activeSessionId;
      if (!sessionId) {
        const res = await getClient().session.create({ body: {}, throwOnError: true });
        sessionId = res.data!.id;
        setActiveSession(sessionId);
      }
      const recipe = RECIPES.find((r) => r.id === "hero-3d-awwwards");
      const ext = imagePath.split(".").pop()?.toLowerCase() ?? "png";
      const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
      const filePart: FilePartInput = {
        type: "file",
        mime,
        filename: `reference.${ext}`,
        url: toFileUrl(imagePath),
      };
      const text = [
        "RIFERIMENTO VISIVO ALLEGATO — studialo a fondo: direzione artistica, palette, tipografia, layout, mood. Non copiarlo 1:1: raggiungi QUELLA qualità e quella intenzione, adattata al progetto.",
        note.trim() ? `Indicazioni dell'utente: ${note.trim()}` : "",
        "",
        recipe?.prompt ??
          "Costruisci un sito di livello awwwards a partire dal riferimento.",
      ]
        .filter(Boolean)
        .join("\n");
      useChatStore.getState().setSessionRunning(sessionId, true);
      await getClient().session.prompt({
        path: { id: sessionId },
        body: {
          parts: [{ type: "text", text }, filePart],
          agent: "build",
          ...(providerID && modelID ? { model: { providerID, modelID } } : {}),
        },
        throwOnError: true,
      });
      setLaunched(true);
      setTimeout(() => {
        setLaunched(false);
        setImagePath(null);
        setNote("");
        close();
      }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      if (activeSessionId)
        useChatStore.getState().setSessionRunning(activeSessionId, false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <div className="glass-strong glass-border flex w-full max-w-lg flex-col overflow-hidden rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] px-4 py-3">
          <Trophy className="h-4 w-4 text-[var(--primary)]" />
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Vision Studio — da immagine a sito
            </h2>
            <p className="text-[10px] text-[var(--muted-foreground)]">
              Screenshot awwwards, sketch su carta o frame Figma → il modello Design lo
              studia e costruisce il sito con la ricetta Hero 3D.
            </p>
          </div>
          <button
            onClick={close}
            className="rounded p-1 text-[var(--muted-foreground)] hover:bg-white/10 hover:text-[var(--foreground)]"
            aria-label="Chiudi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-4 py-3">
          {/* HARD GUARD: the model can't see images → block the upload. */}
          {blocked && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-[11px] leading-relaxed text-amber-300">
              <EyeOff className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <b>Questo modello ({effective}) non supporta la vision</b> — non può
                vedere le immagini, quindi il caricamento è disabilitato. Seleziona un
                modello con l'icona 👁 (es. Claude Sonnet/Opus) o assegna un modello vision
                al ruolo <b>Design 🎨</b> con l'auto-routing.
              </span>
            </div>
          )}
          {!blocked && !known && effective && (
            <p className="text-[10px] text-amber-400">
              Modello {effective}: capacità vision non verificabile dal catalogo — se
              l'immagine viene ignorata, passa a un modello 👁.
            </p>
          )}
          {!blocked && known && (
            <p className="text-[10px] text-[var(--color-online)]">
              👁 Modello vision attivo: <b>{effective}</b>
            </p>
          )}

          {/* Image picker */}
          <button
            onClick={() => void pickImage()}
            disabled={blocked || busy}
            className={cn(
              "flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 transition-colors",
              blocked
                ? "cursor-not-allowed border-[var(--border)] opacity-40"
                : "border-[var(--border)] hover:border-[var(--primary)]/60 hover:bg-[var(--primary)]/5",
            )}
          >
            <ImagePlus className="h-6 w-6 text-[var(--primary)]" />
            <span className="text-xs font-medium text-[var(--foreground)]">
              {imagePath
                ? (imagePath.split(/[\\/]/).pop() ?? imagePath)
                : "Scegli l'immagine di riferimento…"}
            </span>
            <span className="text-[10px] text-[var(--muted-foreground)]">
              PNG / JPG / WEBP — screenshot di un sito, sketch, frame Figma
            </span>
          </button>

          {/* Optional guidance */}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={blocked}
            rows={2}
            placeholder="Note opzionali (es. 'è per uno studio di architettura, palette terracotta')…"
            className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--muted)]/40 px-2.5 py-2 text-[11px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:opacity-40"
          />

          {error && <p className="text-[10px] leading-relaxed text-red-300">{error}</p>}
          {launched && (
            <p className="text-[10px] font-medium text-[var(--color-online)]">
              🏆 Lanciato — l'agente sta costruendo il sito dal riferimento.
            </p>
          )}

          <button
            onClick={() => void generate()}
            disabled={!imagePath || busy || blocked}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold uppercase tracking-wider transition-colors",
              !imagePath || blocked
                ? "cursor-not-allowed bg-[var(--muted)]/40 text-[var(--muted-foreground)]"
                : "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90",
            )}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {busy ? "Lancio…" : "Genera il sito 🏆"}
          </button>
        </div>
      </div>
    </div>
  );
}
