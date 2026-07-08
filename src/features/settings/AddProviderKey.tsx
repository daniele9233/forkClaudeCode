import { useState, useEffect } from "react";
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
  /** Local open-source runtime (Ollama/LM Studio): no API key, you pick the model. */
  local?: boolean;
  /**
   * Cloud OpenAI-compatible provider that isn't a native opencode template
   * (e.g. GLM / z.ai): registered via `addProvider` with a key + a model you
   * pick, instead of the env-var connect path.
   */
  openaiCompat?: boolean;
  /** Default model id to pre-fill (local or openaiCompat). */
  defaultModel?: string;
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
  {
    id: "glm",
    label: "GLM (z.ai / Zhipu)",
    envVar: "",
    // z.ai's OpenAI-compatible endpoint. Key format is `id.secret`. You pick
    // the model (e.g. glm-4.6, glm-4.5-flash, or a newer glm-5.x).
    baseURL: "https://api.z.ai/api/paas/v4",
    openaiCompat: true,
    defaultModel: "glm-4.6",
  },
  // Open-source / local runtimes — no cloud key. OpenRouter and Groq (above)
  // already serve open-weight models with a key; these run fully on your machine.
  {
    id: "ollama",
    label: "Ollama (local · open-source)",
    envVar: "",
    baseURL: "http://localhost:11434/v1",
    local: true,
    defaultModel: "qwen2.5-coder:7b",
  },
  {
    id: "lmstudio",
    label: "LM Studio (local · open-source)",
    envVar: "",
    baseURL: "http://localhost:1234/v1",
    local: true,
    defaultModel: "local-model",
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

  const selectedTemplate = TEMPLATES.find((t) => t.id === choice);
  const isLocal = !!selectedTemplate?.local;
  const isOpenaiCompat = !!selectedTemplate?.openaiCompat;
  const needsModel = isLocal || isOpenaiCompat;
  const choiceLabel = choice === OTHER ? "the provider" : selectedTemplate?.label;

  // Pre-fill the model field when a runtime that lets you pick a model is chosen.
  useEffect(() => {
    if (selectedTemplate?.local || selectedTemplate?.openaiCompat) {
      setCustomModel((m) => m || selectedTemplate.defaultModel || "");
    }
  }, [choice, selectedTemplate]);

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

    // Local open-source runtime (Ollama / LM Studio): no cloud key needed —
    // just point at the local server and name the model you've pulled.
    if (selectedTemplate?.local) {
      const model = customModel.trim() || selectedTemplate.defaultModel || "";
      if (!model) {
        setError("Type the local model id you pulled (e.g. llama3.1, qwen2.5-coder).");
        return;
      }
      setVerifying(true);
      try {
        await invoke<string>("test_provider_key", {
          baseUrl: selectedTemplate.baseURL,
          apiKey: trimmedKey || "local",
        });
      } catch (e) {
        setVerifying(false);
        setError(
          `Couldn't reach ${selectedTemplate.label} at ${selectedTemplate.baseURL} (${String(e)}). Start it first (e.g. run \`ollama serve\` and \`ollama pull ${model}\`).`,
        );
        return;
      }
      setVerifying(false);
      try {
        await addProvider.mutateAsync({
          id: selectedTemplate.id,
          name: selectedTemplate.label.replace(/\s*\(.*\)$/, ""),
          npm: OPENAI_COMPAT,
          baseURL: selectedTemplate.baseURL,
          apiKey: trimmedKey || "local",
          models: { [model]: model },
        });
        finish();
      } catch (e) {
        setError(
          `Could not add ${selectedTemplate.label}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
      return;
    }

    if (!trimmedKey) {
      setError("Paste an API key.");
      return;
    }

    // Cloud OpenAI-compatible provider (e.g. GLM / z.ai): register with the key
    // + chosen model. Key verification is best-effort — some of these endpoints
    // don't implement GET /models, so a failed probe must NOT block a valid key
    // (a bad key surfaces on the first message).
    if (selectedTemplate?.openaiCompat) {
      const model = customModel.trim() || selectedTemplate.defaultModel || "";
      if (!model) {
        setError("Type the model id (e.g. glm-4.6).");
        return;
      }
      try {
        await addProvider.mutateAsync({
          id: selectedTemplate.id,
          name: selectedTemplate.label.replace(/\s*\(.*\)$/, ""),
          npm: OPENAI_COMPAT,
          baseURL: selectedTemplate.baseURL,
          apiKey: trimmedKey,
          models: { [model]: model },
        });
        finish();
      } catch (e) {
        setError(
          `Could not add ${selectedTemplate.label}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
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

      {needsModel && (
        <div className="space-y-1">
          <input
            type="text"
            placeholder={
              isLocal
                ? "local model id (e.g. llama3.1, qwen2.5-coder)"
                : "model id (e.g. glm-4.6, glm-4.5-flash)"
            }
            value={customModel}
            onChange={(e) => setCustomModel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            className="h-7 w-full rounded border border-[var(--border)] bg-[var(--muted)]/40 px-2 text-[11px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
          {isLocal ? (
            <p className="text-[10px] leading-relaxed text-[var(--muted-foreground)]">
              Runs on your machine — no cloud, no key. Start the server first (Ollama:{" "}
              <code>ollama serve</code> + <code>ollama pull …</code>) at{" "}
              <code>{selectedTemplate?.baseURL}</code>.
            </p>
          ) : (
            <p className="text-[10px] leading-relaxed text-[var(--muted-foreground)]">
              Paste your key below (GLM keys look like <code>id.secret</code>) and set the
              model id. Endpoint: <code>{selectedTemplate?.baseURL}</code>.
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <input
          type="password"
          placeholder={isLocal ? "API key (not needed for local)…" : "Paste API key…"}
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
          {isLocal ? "Connected ✓" : isOpenaiCompat ? "Added ✓" : "Key verified ✓"} —{" "}
          {choiceLabel} added and selected. Type a message to start.
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
