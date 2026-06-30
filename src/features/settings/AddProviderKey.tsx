import { useState } from "react";
import { Check, Loader2, KeyRound } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";
import { useAddProvider, type AddProviderInput } from "@/opencode/config";

/**
 * Curated OpenAI-compatible providers. Each is fully self-describing (npm +
 * baseURL + a couple of models) so writing it into the config — together with
 * the user's key — makes the engine surface it with usable models. All of these
 * speak the OpenAI wire format, so they share the same npm package.
 */
interface Template extends Omit<AddProviderInput, "apiKey"> {
  label: string;
}

const OPENAI_COMPAT = "@ai-sdk/openai-compatible";

// Provider ids are deliberately prefixed so they do NOT collide with opencode's
// built-in providers (e.g. its native "deepseek"). A collision makes opencode
// merge our config with the built-in definition and resolve the key from the
// wrong source — the key verifies but chat returns "Invalid API key". A unique
// id gives a clean, self-contained OpenAI-compatible provider that uses exactly
// the key + baseURL we set in options.
const BYOK = "byok-";

const TEMPLATES: Template[] = [
  {
    id: `${BYOK}deepseek`,
    label: "DeepSeek",
    name: "DeepSeek",
    npm: OPENAI_COMPAT,
    baseURL: "https://api.deepseek.com/v1",
    models: {
      "deepseek-chat": "DeepSeek Chat",
      "deepseek-reasoner": "DeepSeek Reasoner",
    },
    contextLimit: 64_000,
  },
  {
    id: `${BYOK}openai`,
    label: "OpenAI",
    name: "OpenAI",
    npm: OPENAI_COMPAT,
    baseURL: "https://api.openai.com/v1",
    models: { "gpt-4o": "GPT-4o", "gpt-4o-mini": "GPT-4o mini" },
    contextLimit: 128_000,
  },
  {
    id: `${BYOK}openrouter`,
    label: "OpenRouter",
    name: "OpenRouter",
    npm: OPENAI_COMPAT,
    baseURL: "https://openrouter.ai/api/v1",
    models: { "openai/gpt-4o": "GPT-4o", "deepseek/deepseek-chat": "DeepSeek Chat" },
    contextLimit: 128_000,
  },
  {
    id: `${BYOK}groq`,
    label: "Groq",
    name: "Groq",
    npm: OPENAI_COMPAT,
    baseURL: "https://api.groq.com/openai/v1",
    models: { "llama-3.3-70b-versatile": "Llama 3.3 70B" },
    contextLimit: 128_000,
  },
  {
    id: `${BYOK}xai`,
    label: "xAI (Grok)",
    name: "xAI",
    npm: OPENAI_COMPAT,
    baseURL: "https://api.x.ai/v1",
    models: { "grok-2-latest": "Grok 2" },
    contextLimit: 128_000,
  },
  {
    id: `${BYOK}mistral`,
    label: "Mistral",
    name: "Mistral",
    npm: OPENAI_COMPAT,
    baseURL: "https://api.mistral.ai/v1",
    models: { "mistral-large-latest": "Mistral Large" },
    contextLimit: 128_000,
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
  const addProvider = useAddProvider();

  const choiceLabel =
    choice === OTHER ? "the provider" : TEMPLATES.find((t) => t.id === choice)?.label;

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    const trimmedKey = key.trim();
    if (!trimmedKey) {
      setError("Paste an API key.");
      return;
    }

    let input: AddProviderInput;
    if (choice === OTHER) {
      const id = customId.trim().toLowerCase();
      const baseURL = customBaseUrl.trim();
      const model = customModel.trim();
      if (!id || !baseURL || !model) {
        setError("For a custom provider, fill id, base URL and a model id.");
        return;
      }
      input = {
        id: `${BYOK}${id}`,
        name: id,
        npm: OPENAI_COMPAT,
        baseURL,
        apiKey: trimmedKey,
        models: { [model]: model },
      };
    } else {
      const t = TEMPLATES.find((x) => x.id === choice)!;
      input = { ...t, apiKey: trimmedKey };
    }

    // Verify the key against the provider BEFORE committing, so we can tell the
    // user clearly whether the key itself is the problem (vs. an app issue).
    setVerifying(true);
    try {
      await invoke<string>("test_provider_key", {
        baseUrl: input.baseURL,
        apiKey: trimmedKey,
      });
    } catch (e) {
      setVerifying(false);
      setError(
        `${choiceLabel} rejected this key — ${String(e)}. Regenerate the key on the provider's dashboard and check your account balance.`,
      );
      return;
    }
    setVerifying(false);

    try {
      await addProvider.mutateAsync(input);
      setKey("");
      setSaved(true);
      // Give the user a beat to see the confirmation, then close.
      setTimeout(() => onConnected?.(), 1400);
    } catch (e) {
      setError(`Could not add provider: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

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
          disabled={addProvider.isPending || verifying}
          className={cn(
            "flex h-7 items-center gap-1 rounded px-2.5 text-[10px] font-medium uppercase tracking-wider transition-colors",
            "bg-[var(--primary)]/15 text-[var(--primary)] hover:bg-[var(--primary)]/25 disabled:opacity-40",
          )}
        >
          {verifying || addProvider.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : saved ? (
            <Check className="h-3 w-3 text-[var(--color-online)]" />
          ) : (
            <Check className="h-3 w-3" />
          )}
          {verifying ? "Checking" : saved ? "Saved" : "Save"}
        </button>
      </div>

      {error && <p className="text-[10px] leading-relaxed text-red-300">{error}</p>}
      {saved && (
        <p className="text-[10px] leading-relaxed text-[var(--color-online)]">
          Key verified ✓ — connected to {choiceLabel} and selected a model. Type a message
          to start.
        </p>
      )}
    </div>
  );
}
