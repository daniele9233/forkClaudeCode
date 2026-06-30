import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConfig } from "@/opencode/config";
import { AddProviderKey } from "./AddProviderKey";

/**
 * Compact model indicator + provider connector. The dropdown intentionally
 * contains ONLY "Add provider API key": connecting a provider auto-selects one
 * of its models, so there's no separate model list to wade through.
 */
export function ModelSwitcher() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { data: config } = useConfig();

  const currentModel = config?.model ?? "";
  const slash = currentModel.indexOf("/");
  // Strip the internal "byok-" prefix we use to avoid built-in provider id
  // collisions, so the chip reads "deepseek" rather than "byok-deepseek".
  const providerId = (slash > 0 ? currentModel.slice(0, slash) : "").replace(
    /^byok-/,
    "",
  );
  const modelId = slash > 0 ? currentModel.slice(slash + 1) : currentModel;
  const displayModel = modelId || "Select model";

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

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
        {providerId && (
          <span className="text-[var(--muted-foreground)] opacity-70">{providerId}</span>
        )}
        <span className="max-w-[140px] truncate font-medium">{displayModel}</span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
      </button>

      {open && (
        <div className="glass-strong glass-border absolute right-0 top-full z-50 mt-1.5 w-80 overflow-hidden rounded-2xl shadow-xl">
          <AddProviderKey onConnected={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
