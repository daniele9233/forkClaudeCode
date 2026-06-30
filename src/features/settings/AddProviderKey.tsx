import { useState } from "react";
import { Check, Loader2, Plus, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSetAuth } from "@/opencode/config";

/**
 * Well-known providers and their canonical opencode ids. Setting a credential
 * for one of these makes the engine surface it (with its models) in the
 * provider list — the GUI equivalent of `opencode auth login`.
 */
const KNOWN_PROVIDERS: { id: string; label: string; env: string }[] = [
  { id: "deepseek", label: "DeepSeek", env: "DEEPSEEK_API_KEY" },
  { id: "openai", label: "OpenAI", env: "OPENAI_API_KEY" },
  { id: "anthropic", label: "Anthropic (Claude)", env: "ANTHROPIC_API_KEY" },
  { id: "google", label: "Google (Gemini)", env: "GEMINI_API_KEY" },
  { id: "openrouter", label: "OpenRouter", env: "OPENROUTER_API_KEY" },
  { id: "groq", label: "Groq", env: "GROQ_API_KEY" },
  { id: "xai", label: "xAI (Grok)", env: "XAI_API_KEY" },
  { id: "mistral", label: "Mistral", env: "MISTRAL_API_KEY" },
];

const OTHER = "__other__";

export function AddProviderKey() {
  const [expanded, setExpanded] = useState(false);
  const [choice, setChoice] = useState(KNOWN_PROVIDERS[0].id);
  const [customId, setCustomId] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const setAuth = useSetAuth();

  const providerId = choice === OTHER ? customId.trim().toLowerCase() : choice;

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    if (!providerId) {
      setError("Pick or type a provider id.");
      return;
    }
    if (!key.trim()) {
      setError("Paste an API key.");
      return;
    }
    try {
      await setAuth.mutateAsync({ providerId, key: key.trim() });
      setKey("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(
        `Could not save key: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex w-full items-center gap-2 border-b border-[var(--border)] px-3 py-2.5 text-left text-[11px] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--primary)]/[0.06] hover:text-[var(--foreground)]"
      >
        <Plus className="h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />
        <span className="font-medium uppercase tracking-wider">
          Add provider API key
        </span>
        <KeyRound className="ml-auto h-3 w-3 shrink-0 opacity-50" />
      </button>
    );
  }

  return (
    <div className="space-y-2 border-b border-[var(--border)] bg-[var(--muted)]/20 p-3">
      <p className="hud-label">Connect a provider with your own key</p>

      <select
        value={choice}
        onChange={(e) => setChoice(e.target.value)}
        className="h-7 w-full rounded border border-[var(--border)] bg-[var(--muted)]/40 px-2 text-[11px] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
      >
        {KNOWN_PROVIDERS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
        <option value={OTHER}>Other…</option>
      </select>

      {choice === OTHER && (
        <input
          type="text"
          placeholder="provider id (e.g. together, fireworks)"
          value={customId}
          onChange={(e) => setCustomId(e.target.value)}
          className="h-7 w-full rounded border border-[var(--border)] bg-[var(--muted)]/40 px-2 text-[11px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
        />
      )}

      <div className="flex items-center gap-1.5">
        <input
          type="password"
          placeholder="Paste API key…"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          className="h-7 flex-1 rounded border border-[var(--border)] bg-[var(--muted)]/40 px-2 text-[11px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
        />
        <button
          onClick={handleSave}
          disabled={setAuth.isPending}
          className={cn(
            "flex h-7 items-center gap-1 rounded px-2.5 text-[10px] font-medium uppercase tracking-wider transition-colors",
            "bg-[var(--primary)]/15 text-[var(--primary)] hover:bg-[var(--primary)]/25 disabled:opacity-40",
          )}
        >
          {setAuth.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : saved ? (
            <Check className="h-3 w-3 text-[var(--color-online)]" />
          ) : (
            <Check className="h-3 w-3" />
          )}
          {saved ? "Saved" : "Save"}
        </button>
      </div>

      {error && <p className="text-[10px] text-red-300">{error}</p>}
      {saved && (
        <p className="text-[10px] text-[var(--color-online)]">
          Key saved. The provider and its models should now appear below.
        </p>
      )}
    </div>
  );
}
