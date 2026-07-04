import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConfig, useUpdateConfig } from "@/opencode/config";
import { useProviders } from "@/opencode/context";
import { modelSupportsVision } from "@/opencode/modelCaps";
import { useModelStore } from "@/stores/model.store";
import { AddProviderKey } from "./AddProviderKey";

/**
 * Model indicator + provider connector. The dropdown has "Add provider API key"
 * on top and, below it, the models of the providers you've connected (the
 * built-in paid "OpenCode Zen" gateway is hidden) — so you can switch between
 * e.g. a fast chat model and a slower reasoning model.
 */
export function ModelSwitcher() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { data: config } = useConfig();
  const { data: providers = [] } = useProviders();
  const updateConfig = useUpdateConfig();

  // kikkoCode's own selection wins: the engine's config.model can be pinned by
  // auth plugins (zai/GLM) and ignore updates — our store + per-prompt model
  // param make the choice effective regardless.
  const localSelected = useModelStore((s) => s.selected);
  const setSelected = useModelStore((s) => s.setSelected);
  const currentModel = localSelected ?? config?.model ?? "";
  const slash = currentModel.indexOf("/");
  const currentProviderId = slash > 0 ? currentModel.slice(0, slash) : "";
  const currentModelId = slash > 0 ? currentModel.slice(slash + 1) : currentModel;
  // Strip the internal "byok-" prefix so the chip reads "deepseek" not
  // "byok-deepseek".
  const displayProvider = currentProviderId.replace(/^byok-/, "");
  const displayModel = currentModelId || "Select model";

  // Only providers the user connected — hide the built-in Zen gateway.
  const visibleProviders = providers.filter((p) => p.id !== "opencode");

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

          <div className="min-h-0 flex-1 overflow-y-auto border-t border-[var(--border)] py-1">
            {visibleProviders.length === 0 && (
              <p className="px-3 py-3 text-center text-[11px] text-[var(--muted-foreground)]">
                No models yet — add a provider key above.
              </p>
            )}
            {visibleProviders.map((provider) => {
              const models = Object.entries(provider.models ?? {});
              if (models.length === 0) return null;
              return (
                <div key={provider.id}>
                  <div className="px-3 pb-0.5 pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    {provider.name}
                  </div>
                  {models.map(([modelId, model]) => {
                    const active =
                      currentProviderId === provider.id && currentModelId === modelId;
                    return (
                      <button
                        key={modelId}
                        onClick={() => selectModel(provider.id, modelId)}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors",
                          active
                            ? "bg-[var(--color-online)]/10"
                            : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]/50 hover:text-[var(--foreground)]",
                        )}
                      >
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
