import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Key, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProviders } from "@/opencode/context";
import { useConfig, useUpdateConfig, useSetAuth } from "@/opencode/config";
import { AddProviderKey } from "./AddProviderKey";

export function ModelSwitcher() {
  const [open, setOpen] = useState(false);
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedProvider, setSavedProvider] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: config } = useConfig();
  const { data: providers = [] } = useProviders();
  const updateConfig = useUpdateConfig();
  const setAuth = useSetAuth();

  // Hide the built-in "OpenCode Zen" gateway (paid, needs its own key); show
  // only providers the user connects with their own key via "Add provider".
  const visibleProviders = providers.filter((p) => p.id !== "opencode");

  const currentModel = config?.model ?? "";
  const [currentProviderId, currentModelId] = currentModel.includes("/")
    ? currentModel.split("/").slice(0, 2)
    : ["", currentModel];

  const currentProviderName =
    providers.find((p) => p.id === currentProviderId)?.name ?? currentProviderId;
  const displayModel = currentModelId || currentModel || "Select model";

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = (providerId: string, modelId: string) => {
    setError(null);
    updateConfig.mutate(
      { model: `${providerId}/${modelId}` },
      {
        onError: (e) =>
          setError(`Could not select model: ${e instanceof Error ? e.message : String(e)}`),
      },
    );
    setOpen(false);
  };

  const handleSaveKey = async (providerId: string) => {
    const key = keyInputs[providerId]?.trim();
    if (!key) return;
    setError(null);
    setSavedProvider(null);
    setSavingKey(providerId);
    try {
      await setAuth.mutateAsync({ providerId, key });
      setKeyInputs((prev) => ({ ...prev, [providerId]: "" }));
      setSavedProvider(providerId);
      // Clear the "saved" tick after a moment.
      setTimeout(() => setSavedProvider((p) => (p === providerId ? null : p)), 2500);
    } catch (e) {
      setError(`Could not save key: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSavingKey(null);
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
        title="Switch model"
      >
        {currentProviderName && (
          <span className="text-[var(--muted-foreground)] opacity-70">
            {currentProviderName}
          </span>
        )}
        <span className="max-w-[120px] truncate font-medium">{displayModel}</span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
      </button>

      {open && (
        <div className="glass-strong glass-border absolute right-0 top-full z-50 mt-1.5 flex max-h-[70vh] w-80 flex-col overflow-hidden rounded-2xl shadow-xl">
          {error && (
            <p className="shrink-0 border-b border-red-500/30 bg-red-500/10 px-3 py-2 text-[10px] text-red-300">
              {error}
            </p>
          )}
          {/* GUI equivalent of `opencode auth login` — add a key for any provider */}
          <div className="shrink-0">
            <AddProviderKey />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto py-1">
            {visibleProviders.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-[var(--muted-foreground)]">
                No providers connected yet — use “Add provider API key” above.
              </p>
            )}
            {visibleProviders.map((provider) => {
              const modelEntries = Object.entries(provider.models);
              const needsKey = provider.env.length > 0;

              return (
                <div key={provider.id}>
                  {/* Provider header */}
                  <div className="flex items-center justify-between px-3 pb-0.5 pt-2.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      {provider.name}
                    </span>
                    {needsKey && (
                      <span className="flex items-center gap-0.5 text-[9px] text-[var(--muted-foreground)]">
                        <Key className="h-2.5 w-2.5" />
                        {provider.env.join(", ")}
                      </span>
                    )}
                  </div>

                  {/* API key input for providers that need it */}
                  {needsKey && (
                    <div className="flex items-center gap-1 px-3 pb-1">
                      <input
                        type="password"
                        placeholder={`${provider.env[0]}…`}
                        value={keyInputs[provider.id] ?? ""}
                        onChange={(e) =>
                          setKeyInputs((prev) => ({
                            ...prev,
                            [provider.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => e.key === "Enter" && handleSaveKey(provider.id)}
                        className="h-6 flex-1 rounded border border-[var(--border)] bg-[var(--muted)]/40 px-2 text-[10px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                      />
                      <button
                        onClick={() => handleSaveKey(provider.id)}
                        disabled={
                          savingKey === provider.id || !keyInputs[provider.id]?.trim()
                        }
                        className="flex h-6 w-6 items-center justify-center rounded bg-[var(--primary)]/15 text-[var(--primary)] hover:bg-[var(--primary)]/25 disabled:opacity-40"
                      >
                        {savingKey === provider.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : savedProvider === provider.id ? (
                          <Check className="h-3 w-3 text-[var(--color-online)]" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Model list */}
                  {modelEntries.map(([modelId, model]) => {
                    const isActive =
                      currentProviderId === provider.id && currentModelId === modelId;
                    return (
                      <button
                        key={modelId}
                        onClick={() => handleSelect(provider.id, modelId)}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors",
                          isActive
                            ? "bg-[var(--primary)]/10 text-[var(--foreground)]"
                            : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]/50 hover:text-[var(--foreground)]",
                        )}
                      >
                        <span className="flex-1 truncate text-xs">{model.name}</span>
                        <span className="shrink-0 text-[9px] text-[var(--muted-foreground)]">
                          {((model.limit?.context ?? 0) / 1000).toFixed(0)}K
                        </span>
                        {isActive && (
                          <Check className="h-3 w-3 shrink-0 text-[var(--primary)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
