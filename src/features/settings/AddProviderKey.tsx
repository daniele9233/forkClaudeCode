import { useState } from "react";
import { Check, Loader2, KeyRound } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";
import { useAddProvider, useConnectProvider } from "@/opencode/config";

/**
 * Built-in providers opencode knows natively. Connecting one injects
 * `<envVar>=<key>` into the engine env and restarts it, so the engine's own
 * provider loads the key. `baseURL` is only used to verify the key up front.
 */
interface Template {
  id: string;
  label: string;
  envVar: string;
  baseURL: string;
}

const OPENAI_COMPAT = "@ai-sdk/openai-compatible";

const TEMPLATES: Template[] = [
  {
    id: "anthropic",
    label: "Anthropic (Claude)",
    envVar: "ANTHROPIC_API_KEY",
    // Anthropic isn't OpenAI-compatible: it authenticates with an `x-api-key`
    // header (not Bearer) and needs `anthropic-version`. The Rust key check
    // special-cases this host; the engine's native `anthropic` provider handles
    // the rest once the key is set.
    baseURL: "https://api.anthropic.com/v1",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    envVar: "DEEPSEEK_API_KEY",
    baseURL: "https://api.deepseek.com/v1",
  },
  {
    id: "openai",
    label: "OpenAI",
    envVar: "OPENAI_API_KEY",
    baseURL: "https://api.openai.com/v1",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    envVar: "OPENROUTER_API_KEY",
    baseURL: "https://openrouter.ai/api/v1",
  },
  {
    id: "groq",
    label: "Groq",
    envVar: "GROQ_API_KEY",
    baseURL: "https://api.groq.com/openai/v1",
  },
  {
    id: "xai",
    label: "xAI (Grok)",
    envVar: "XAI_API_KEY",
    baseURL: "https://api.x.ai/v1",
  },
  {
    id: "mistral",
    label: "Mistral",
    envVar: "MISTRAL_API_KEY",
    baseURL: "https://api.mistral.ai/v1",
  },
];

const OTHER = "__other__";

export function AddProviderKey({ onConnected }: { onConnected?: () => void } = {}) {
  const [choice, setChoice] = useState(TEMPLATES[0].id);
  const [customId, setCustomId] = useState("");
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const connectProvider = useConnectProvider();
  const addProvider = useAddProvider();
  const busy = verifying || connectProvider.isPending || addProvider.isPending;

  const choiceLabel =
    choice === OTHER ? "the provider" : TEMPLATES.find((t) => t.id === choice)?.label;

  const finish = () => {
    setKey("");
    setSaved(true);
    setTimeout(() => onConnected?.(), 1400);
  };

  const verify = async (baseURL: string, apiKey: string): Promise<boolean> => {
    setVerifying(true);
    try {
      await invoke<string>("test_provider_key", { baseUrl: baseURL, apiKey });
      return true;
    } catch (e) {
      setError(
        `${choiceLabel} rejected this key — ${String(e)}. Regenerate the key on the provider's dashboard and check your account balance.`,
      );
      return false;
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    const trimmedKey = key.trim();
    if (!trimmedKey) {
      setError("Paste an API key.");
      return;
    }

    if (choice === OTHER) {
      const id = customId.trim().toLowerCase();
      const baseURL = customBaseUrl.trim();
      const model = customModel.trim();
      if (!id || !baseURL || !model) {
        setError("For a custom provider, fill id, base URL and a model id.");
        return;
      }
      if (!(await verify(baseURL, trimmedKey))) return;
      try {
        await addProvider.mutateAsync({
          id: `byok-${id}`,
          name: id,
          npm: OPENAI_COMPAT,
          baseURL,
          apiKey: trimmedKey,
          models: { [model]: model },
        });
        finish();
      } catch (e) {
        setError(`Could not add provider: ${e instanceof Error ? e.message : String(e)}`);
      }
      return;
    }

    const t = TEMPLATES.find((x) => x.id === choice)!;
    if (!(await verify(t.baseURL, trimmedKey))) return;
    try {
      await connectProvider.mutateAsync({
        providerId: t.id,
        envVar: t.envVar,
        apiKey: trimmedKey,
      });
      finish();
    } catch (e) {
      setError(
        `Key verified but the engine could not finish connecting: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  };

  const buttonLabel = verifying
    ? "Checking"
    : connectProvider.isPending
      ? "Connecting"
      : saved
        ? "Saved"
        : "Save";

  return (
    <div className="space-y-2 p-3">
      <p className="hud-label flex items-center gap-1.5">
        <KeyRound className="h-3 w-3 text-[var(--primary)]" />
        Add provider API key
      </p>

      <select
        value={choice}
        onChange={(e) => setChoice(e.target.value)}
        className="h-7 w-full rounded border border-[var(--border)] bg-[var(--muted)]/40 px-2 text-[11px] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
      >
        {TEMPLATES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
        <option value={OTHER}>Other (OpenAI-compatible)…</option>
      </select>

      {choice === OTHER && (
        <div className="space-y-1.5">
          <input
            type="text"
            placeholder="provider id (e.g. together)"
            value={customId}
            onChange={(e) => setCustomId(e.target.value)}
            className="h-7 w-full rounded border border-[var(--border)] bg-[var(--muted)]/40 px-2 text-[11px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
          <input
            type="text"
            placeholder="base URL (e.g. https://api.together.xyz/v1)"
            value={customBaseUrl}
            onChange={(e) => setCustomBaseUrl(e.target.value)}
            className="h-7 w-full rounded border border-[var(--border)] bg-[var(--muted)]/40 px-2 text-[11px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
          <input
            type="text"
            placeholder="model id (e.g. meta-llama/Llama-3.3-70B)"
            value={customModel}
            onChange={(e) => setCustomModel(e.target.value)}
            className="h-7 w-full rounded border border-[var(--border)] bg-[var(--muted)]/40 px-2 text-[11px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>
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
          disabled={busy}
          className={cn(
            "flex h-7 items-center gap-1 rounded px-2.5 text-[10px] font-medium uppercase tracking-wider transition-colors",
            "bg-[var(--primary)]/15 text-[var(--primary)] hover:bg-[var(--primary)]/25 disabled:opacity-40",
          )}
        >
          {busy ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : saved ? (
            <Check className="h-3 w-3 text-[var(--color-online)]" />
          ) : (
            <Check className="h-3 w-3" />
          )}
          {buttonLabel}
        </button>
      </div>

      {error && <p className="text-[10px] leading-relaxed text-red-300">{error}</p>}
      {saved && (
        <p className="text-[10px] leading-relaxed text-[var(--color-online)]">
          Key verified ✓ — connected to {choiceLabel} and selected a model. Type a message
          to start.
        </p>
      )}
      {connectProvider.isPending && (
        <p className="text-[10px] leading-relaxed text-[var(--muted-foreground)]">
          Restarting the engine with your key…
        </p>
      )}
    </div>
  );
}
