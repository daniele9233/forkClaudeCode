import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConfig, useUpdateConfig } from "@/opencode/config";
import { useProviders } from "@/opencode/context";
import { modelSupportsVision } from "@/opencode/modelCaps";
import { useModelStore } from "@/stores/model.store";
import { AddProviderKey } from "./AddProviderKey";
import { isCurrentAnthropicModel, isCurrentGlmModel } from "./modelFilter";

/** A model is FREE when both input and output cost per token are 0. */
function isFreeModel(model: { cost?: { input?: number; output?: number } }): boolean {
  return !!model.cost && model.cost.input === 0 && model.cost.output === 0;
}

/**
 * Model indicator + provider connector. The dropdown has "Add provider API key"
 * on top and, below it, the models of the connected providers — each free model
 * is tagged FREE (like OpenCode), and the built-in Zen gateway is trimmed to its
 * free models so you can pick e.g. mimo / nemotron / north-code at no cost.
 */
export function ModelSwitcher() {
  const [open, setOpen] = useState(false);
  const [modelQuery, setModelQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { data: config } = useConfig();
  const { data: providers = [] } = useProviders();
  const updateConfig = useUpdateConfig();

  // kikkoCode's own selection wins: the engine's config.model can be pinned by
  // auth plugins (zai/GLM) and ignore updates — our store + per-prompt model
  // param make the choice effective regardless.
  const localSelected = useModelStore((s) => s.selected);
  const setSelected = useModelStore((s) => s.setSelected);
  // Auto-routing: one model for DESIGN (Claude/multimodal), one for CODING
  // (glm/deepseek); each prompt is classified and routed automatically.
  const roles = useModelStore((s) => s.roles);
  const setRole = useModelStore((s) => s.setRole);
  const autoRoute = useModelStore((s) => s.autoRoute);
  const setAutoRoute = useModelStore((s) => s.setAutoRoute);
  const currentModel = localSelected ?? config?.model ?? "";
  const slash = currentModel.indexOf("/");
  const currentProviderId = slash > 0 ? currentModel.slice(0, slash) : "";
  const currentModelId = slash > 0 ? currentModel.slice(slash + 1) : currentModel;
  // Strip the internal "byok-" prefix so the chip reads "deepseek" not
  // "byok-deepseek".
  const displayProvider = currentProviderId.replace(/^byok-/, "");
  const displayModel = currentModelId || "Select model";

  // Show every provider. The built-in "opencode" Zen gateway is included but
  // trimmed to its FREE models only (below), so free models like mimo /
  // nemotron / north-code appear without pushing the paid gateway.
  const visibleProviders = providers;

  // Vision capability of the currently selected model (drives the "sees images"
  // hint for the Audit + style-from-URL/screenshot features).
  const currentModelObj = visibleProviders.find((p) => p.id === currentProviderId)
    ?.models?.[currentModelId];
  const currentKnown = !!currentModelObj;
  const currentVision = modelSupportsVision(currentModelObj);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectModel = (providerId: string, modelId: string) => {
    // Effective immediately via our store (used as the per-prompt model param);
    // config.update is best-effort to keep the engine's default in sync too.
    setSelected(`${providerId}/${modelId}`);
    updateConfig.mutate({ model: `${providerId}/${modelId}` });
    setOpen(false);
  };

  // Zero-config routing: when the toggle is switched ON with unassigned roles,
  // pick sensible defaults automatically — the best VISION model for design
  // (Claude preferred) and the best fast coder for coding (glm/deepseek
  // preferred). The user can always override with the 🎨/⌨ buttons.
  const autoAssignRoles = () => {
    let bestDesign: { id: string; score: number } | null = null;
    let bestCoding: { id: string; score: number } | null = null;
    for (const p of visibleProviders) {
      const isGateway =
        p.id === "opencode" ||
        p.id.startsWith("opencode-") ||
        /opencode/i.test(p.name ?? "");
      for (const [modelId, model] of Object.entries(p.models ?? {})) {
        if ((model as { status?: string }).status === "deprecated") continue;
        if (isGateway && !isFreeModel(model)) continue; // paid gateway → invalid key
        const full = `${p.id}/${modelId}`;
        const hay = `${modelId} ${model.name ?? ""}`.toLowerCase();
        if (modelSupportsVision(model)) {
          let s = 1;
          if (p.id === "anthropic") s += 4;
          if (/opus|sonnet/.test(hay)) s += 3;
          if (/fable|gpt-5|gemini/.test(hay)) s += 2;
          if (/fast|latest|haiku|mini|flash/.test(hay)) s -= 1;
          if (!bestDesign || s > bestDesign.score) bestDesign = { id: full, score: s };
        }
        {
          let s = 0;
          if (/glm-5\.2/.test(hay)) s += 4;
          else if (/glm/.test(hay)) s += 2;
          if (/deepseek/.test(hay)) s += 3;
          if (/v4|pro|reasoner/.test(hay) && /deepseek/.test(hay)) s += 1;
          if (/coder|qwen/.test(hay)) s += 2;
          if (s > 0 && (!bestCoding || s > bestCoding.score))
            bestCoding = { id: full, score: s };
        }
      }
    }
    if (!roles.design && bestDesign) setRole("design", bestDesign.id);
    if (!roles.coding && bestCoding) {
      // Never assign the same model to both roles.
      const designId = roles.design ?? bestDesign?.id;
      if (bestCoding.id !== designId) setRole("coding", bestCoding.id);
      else if (currentModel && currentModel !== designId) setRole("coding", currentModel);
    }
  };

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs transition-colors",
          "border border-[var(--border)] bg-white/5",
          "text-[var(--muted-foreground)] hover:bg-white/10 hover:text-[var(--foreground)]",
          open && "bg-white/10 text-[var(--foreground)]",
        )}
        title="Model / providers"
      >
        {displayProvider && (
          <span className="text-[var(--muted-foreground)] opacity-70">
            {displayProvider}
          </span>
        )}
        {/* Green "online" treatment when a model is locked in */}
        {currentModel && (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-online)] shadow-[0_0_6px_var(--color-online)]" />
        )}
        <span
          className={cn(
            "max-w-[140px] truncate font-medium",
            currentModel && "text-[var(--color-online)]",
          )}
        >
          {displayModel}
        </span>
        {/* Vision indicator: does the selected model see images? */}
        {currentModel && currentKnown && (
          <span
            title={
              currentVision
                ? "Vede le immagini — Audit visivo e stile da URL/screenshot funzionano"
                : "Non vede le immagini — Audit visivo e stile da URL/screenshot NON funzioneranno"
            }
            className="shrink-0"
          >
            {currentVision ? (
              <Eye className="h-3 w-3 text-[var(--color-online)]" />
            ) : (
              <EyeOff className="h-3 w-3 text-amber-400" />
            )}
          </span>
        )}
        <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
      </button>

      {open && (
        <div className="glass-strong glass-border absolute right-0 top-full z-50 mt-1.5 flex max-h-[70vh] w-80 flex-col overflow-hidden rounded-2xl shadow-xl">
          <div className="shrink-0">
            <AddProviderKey onConnected={() => setOpen(false)} />
          </div>

          {/* Auto-routing: design → multimodal model, coding → fast coder. */}
          {visibleProviders.length > 0 && (
            <div className="shrink-0 space-y-1 border-t border-[var(--border)] px-2 py-1.5">
              <button
                onClick={() => {
                  const on = !autoRoute;
                  if (on) autoAssignRoles(); // zero-config: pick defaults now
                  setAutoRoute(on);
                }}
                className="flex w-full items-center gap-1.5 text-left"
                title="Con l'auto-routing scrivi e basta: ogni prompt viene classificato e va da solo al modello giusto (design/front-end → modello Design 🎨; il resto → modello Coding ⌨). All'accensione i ruoli si assegnano da soli (miglior modello vision per il design, glm/deepseek per il coding); puoi sempre cambiarli a mano con i bottoni 🎨/⌨ accanto ai modelli."
              >
                <span
                  className={cn(
                    "flex h-3.5 w-6 items-center rounded-full px-0.5 transition-colors",
                    autoRoute ? "bg-[var(--color-online)]/60" : "bg-[var(--muted)]",
                  )}
                >
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full bg-white transition-transform",
                      autoRoute && "translate-x-2.5",
                    )}
                  />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground)]">
                  Auto-routing
                </span>
                <span className="ml-auto truncate text-[9px] text-[var(--muted-foreground)]">
                  🎨 {roles.design ? roles.design.split("/").pop() : "—"} · ⌨{" "}
                  {roles.coding ? roles.coding.split("/").pop() : "—"}
                </span>
              </button>
              {autoRoute && (!roles.design || !roles.coding) && (
                <p className="text-[9px] leading-relaxed text-amber-400">
                  {!roles.design
                    ? "Nessun modello con vision collegato per il ruolo Design — collega una chiave Anthropic (Claude). "
                    : ""}
                  Puoi assegnare/cambiare i ruoli a mano: passa col mouse su un modello e
                  clicca 🎨 (design) o ⌨ (coding). Ruoli mancanti usano la selezione
                  manuale.
                </p>
              )}
            </div>
          )}

          {visibleProviders.length > 0 && (
            <div className="shrink-0 space-y-1.5 border-t border-[var(--border)] px-2 py-1.5">
              <input
                value={modelQuery}
                onChange={(e) => setModelQuery(e.target.value)}
                placeholder="Search models… (e.g. opus 4.8)"
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--muted)]/40 px-2 text-[11px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
              {/* Provider filter — show one provider at a time. */}
              {visibleProviders.length > 1 && (
                <div className="flex gap-1 overflow-x-auto pb-0.5">
                  <button
                    onClick={() => setProviderFilter(null)}
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                      providerFilter === null
                        ? "bg-[var(--primary)]/20 text-[var(--primary)]"
                        : "bg-[var(--muted)]/40 text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                    )}
                  >
                    All
                  </button>
                  {visibleProviders.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setProviderFilter(p.id)}
                      className={cn(
                        "shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                        providerFilter === p.id
                          ? "bg-[var(--primary)]/20 text-[var(--primary)]"
                          : "bg-[var(--muted)]/40 text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                      )}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto py-1">
            {visibleProviders.length === 0 && (
              <p className="px-3 py-3 text-center text-[11px] text-[var(--muted-foreground)]">
                No models yet — add a provider key above.
              </p>
            )}
            {visibleProviders
              .filter((p) => !providerFilter || p.id === providerFilter)
              .map((provider) => {
                const q = modelQuery.trim().toLowerCase();
                // Curate the list: always keep the selected model; drop
                // `deprecated` ones; for Anthropic show only the current lineup
                // (hides old point releases, "(latest)" aliases and "Fast"
                // variants); then apply the search box (id or display name).
                const models = Object.entries(provider.models ?? {}).filter(
                  ([modelId, model]) => {
                    const isActiveSelection =
                      currentProviderId === provider.id && currentModelId === modelId;
                    if (isActiveSelection) return true;
                    const name = model.name ?? "";
                    if ((model as { status?: string }).status === "deprecated") {
                      return false;
                    }
                    if (
                      provider.id === "anthropic" &&
                      !isCurrentAnthropicModel(modelId, name)
                    ) {
                      return false;
                    }
                    // z.ai advertises its full GLM catalog (~20 models) — trim
                    // it to the current 4.6/5.2 families so the list is legible.
                    // Covers a legacy `glm` provider id too (earlier versions used
                    // it before standardising on `zai`).
                    if (
                      (provider.id === "zai" || provider.id === "glm") &&
                      !isCurrentGlmModel(modelId, name)
                    ) {
                      return false;
                    }
                    // OpenCode gateways (Zen / Go): surface only their FREE
                    // models. The paid gateway models need an OpenCode
                    // subscription and otherwise fail with "Invalid API key" when
                    // clicked — hide them and keep the free ones.
                    const isGateway =
                      provider.id === "opencode" ||
                      provider.id.startsWith("opencode-") ||
                      /opencode/i.test(provider.name ?? "");
                    if (isGateway && !isFreeModel(model)) {
                      return false;
                    }
                    if (!q) return true;
                    return (
                      modelId.toLowerCase().includes(q) || name.toLowerCase().includes(q)
                    );
                  },
                );
                if (models.length === 0) return null;
                return (
                  <div key={provider.id}>
                    <div className="px-3 pb-0.5 pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      {provider.name}
                    </div>
                    {models.map(([modelId, model]) => {
                      const active =
                        currentProviderId === provider.id && currentModelId === modelId;
                      const full = `${provider.id}/${modelId}`;
                      const isDesign = roles.design === full;
                      const isCoding = roles.coding === full;
                      return (
                        <button
                          key={modelId}
                          onClick={() => selectModel(provider.id, modelId)}
                          className={cn(
                            "group flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors",
                            active
                              ? "bg-[var(--color-online)]/10"
                              : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]/50 hover:text-[var(--foreground)]",
                          )}
                        >
                          {/* Role assign: design 🎨 / coding ⌨ (for auto-routing) */}
                          <span
                            role="button"
                            tabIndex={-1}
                            onClick={(e) => {
                              e.stopPropagation();
                              setRole("design", isDesign ? null : full);
                            }}
                            title={
                              isDesign
                                ? "Modello DESIGN (clicca per rimuovere)"
                                : "Usa come modello DESIGN (front-end/visual, auto-routing)"
                            }
                            className={cn(
                              "shrink-0 rounded-sm px-0.5 text-[10px] leading-none transition-opacity",
                              isDesign
                                ? "opacity-100"
                                : "opacity-0 group-hover:opacity-50 hover:!opacity-100",
                            )}
                          >
                            🎨
                          </span>
                          <span
                            role="button"
                            tabIndex={-1}
                            onClick={(e) => {
                              e.stopPropagation();
                              setRole("coding", isCoding ? null : full);
                            }}
                            title={
                              isCoding
                                ? "Modello CODING (clicca per rimuovere)"
                                : "Usa come modello CODING (logica/fix/script, auto-routing)"
                            }
                            className={cn(
                              "shrink-0 rounded-sm px-0.5 text-[10px] leading-none transition-opacity",
                              isCoding
                                ? "opacity-100"
                                : "opacity-0 group-hover:opacity-50 hover:!opacity-100",
                            )}
                          >
                            ⌨
                          </span>
                          {/* Online dot on the connected model */}
                          {active && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-online)] shadow-[0_0_6px_var(--color-online)]" />
                          )}
                          <span
                            className={cn(
                              "flex-1 truncate text-xs",
                              active && "font-semibold text-[var(--color-online)]",
                            )}
                          >
                            {model.name || modelId}
                          </span>
                          {/* FREE tag (like OpenCode) on zero-cost models */}
                          {isFreeModel(model) && (
                            <span className="shrink-0 rounded-sm bg-[var(--color-online)]/15 px-1 text-[9px] font-bold uppercase tracking-wider text-[var(--color-online)]">
                              free
                            </span>
                          )}
                          {active && (
                            <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-[var(--color-online)]">
                              online
                            </span>
                          )}
                          {/* Vision-capable models show an eye */}
                          {modelSupportsVision(model) && (
                            <Eye
                              className="h-3 w-3 shrink-0 text-[var(--muted-foreground)]"
                              aria-label="Vede le immagini"
                            />
                          )}
                          {model.limit?.context ? (
                            <span className="shrink-0 text-[9px] text-[var(--muted-foreground)]">
                              {(model.limit.context / 1000).toFixed(0)}K
                            </span>
                          ) : null}
                          {active && (
                            <Check className="h-3 w-3 shrink-0 text-[var(--color-online)]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
          </div>

          {/* Written vision status of the selected model */}
          {currentModel && currentKnown && (
            <div
              className={cn(
                "flex shrink-0 items-center gap-1.5 border-t border-[var(--border)] px-3 py-2 text-[10px] leading-relaxed",
                currentVision ? "text-[var(--color-online)]" : "text-amber-400",
              )}
            >
              {currentVision ? (
                <Eye className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <EyeOff className="h-3.5 w-3.5 shrink-0" />
              )}
              <span>
                {currentVision
                  ? "Questo modello vede le immagini: Audit visivo e stile da URL/screenshot funzionano."
                  : "Questo modello NON vede le immagini: Audit visivo e stile da URL/screenshot non funzioneranno. Per quelli scegli un modello con l'icona 👁."}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
