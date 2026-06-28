import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Hammer,
  Key,
  Check,
  Loader2,
  Compass,
  Wrench,
  Gauge,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel } from "@/components/Panel";
import { useProviders } from "@/opencode/context";
import { useConfig, useUpdateConfig, useSetAuth } from "@/opencode/config";
import { useOnboardingStore } from "@/stores/onboarding.store";

type Step = "welcome" | "provider" | "tour";

export function OnboardingWizard() {
  const reduce = useReducedMotion();
  const [step, setStep] = useState<Step>("welcome");
  const complete = useOnboardingStore((s) => s.complete);

  const fade = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const },
      };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <Panel
        strong
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to kikkoCode"
        className="relative flex max-h-[80vh] w-[560px] flex-col overflow-hidden shadow-2xl"
      >
        {/* Progress dots */}
        <div className="flex shrink-0 items-center justify-center gap-1.5 pt-4">
          {(["welcome", "provider", "tour"] as const).map((s) => (
            <span
              key={s}
              className={cn(
                "h-1.5 rounded-full transition-all",
                s === step ? "w-6 bg-[var(--primary)]" : "w-1.5 bg-[var(--border)]",
              )}
            />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          {step === "welcome" && (
            <motion.div
              key="welcome"
              {...fade}
              className="flex flex-col items-center gap-4 text-center"
            >
              <div className="relative">
                <div
                  aria-hidden
                  className="absolute inset-0 -z-10 rounded-full bg-[var(--primary)]/20 blur-2xl"
                />
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-amber-600 shadow-lg">
                  <Hammer className="h-7 w-7 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                Welcome to kikkoCode
              </h2>
              <p className="max-w-md text-sm text-[var(--muted-foreground)]">
                A calm, elegant desktop shell over the OpenCode engine. Let's get you set
                up in two quick steps — connect a model provider, then a short tour of
                what makes kikkoCode different.
              </p>
            </motion.div>
          )}

          {step === "provider" && <ProviderStep fade={fade} />}

          {step === "tour" && (
            <motion.div key="tour" {...fade} className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
                Three things to know
              </h2>
              <TourItem
                icon={<Compass className="h-4 w-4" />}
                title="Plan mode"
                body="Ask kikkoCode to think and propose before touching files — great for scoping a change."
              />
              <TourItem
                icon={<Wrench className="h-4 w-4" />}
                title="Build mode"
                body="Let the agent edit files and run commands. File changes and commands are proposed for your approval."
              />
              <TourItem
                icon={<Gauge className="h-4 w-4" />}
                title="Context Inspector ⭐"
                body="kikkoCode's signature panel: see exactly what the agent sees — tokens, % of the budget, cost. Open it from the bottom panel."
              />
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-[var(--border)] px-6 py-3">
          <button
            onClick={complete}
            className="hud-label transition-colors hover:text-[var(--foreground)]"
          >
            Skip
          </button>
          {step === "welcome" && (
            <NextButton label="Get started" onClick={() => setStep("provider")} />
          )}
          {step === "provider" && (
            <NextButton label="Next" onClick={() => setStep("tour")} />
          )}
          {step === "tour" && (
            <NextButton label="Start using kikkoCode" onClick={complete} />
          )}
        </div>
      </Panel>
    </div>
  );
}

function NextButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-4 py-1.5 text-xs font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
    >
      {label}
      <ArrowRight className="h-3.5 w-3.5" />
    </button>
  );
}

function TourItem({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-[var(--border)] bg-white/[0.03] p-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
        {icon}
      </span>
      <div>
        <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{body}</p>
      </div>
    </div>
  );
}

/* ── Provider connection step ─────────────────────────────────── */

function ProviderStep({ fade }: { fade: Record<string, unknown> }) {
  const { data: providers = [] } = useProviders();
  const { data: config } = useConfig();
  const setAuth = useSetAuth();
  const updateConfig = useUpdateConfig();

  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const needKey = providers.filter((p) => p.env.length > 0);

  const handleSave = async (providerId: string) => {
    const key = keyInputs[providerId]?.trim();
    if (!key) return;
    setSaving(providerId);
    try {
      await setAuth.mutateAsync({ providerId, key });
      setSaved((prev) => new Set(prev).add(providerId));
      setKeyInputs((prev) => ({ ...prev, [providerId]: "" }));

      // If no default model is set yet, adopt this provider's first model.
      if (!config?.model) {
        const provider = providers.find((p) => p.id === providerId);
        const firstModel = provider && Object.keys(provider.models)[0];
        if (firstModel) updateConfig.mutate({ model: `${providerId}/${firstModel}` });
      }
    } finally {
      setSaving(null);
    }
  };

  return (
    <motion.div key="provider" {...fade} className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
          Connect a provider
        </h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Add an API key for at least one provider. Keys stay on your machine — they go
          straight to the local OpenCode engine.
        </p>
      </div>

      {needKey.length === 0 && (
        <p className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 p-3 text-xs text-[var(--muted-foreground)]">
          No providers require a key, or none are available yet. You can configure
          providers anytime from Settings.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {needKey.map((provider) => {
          const isSaved = saved.has(provider.id);
          return (
            <div
              key={provider.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 p-3"
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {provider.name}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
                  <Key className="h-2.5 w-2.5" />
                  {provider.env.join(", ")}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="password"
                  placeholder={
                    isSaved
                      ? "Saved ✓ — enter a new key to replace"
                      : `${provider.env[0]}…`
                  }
                  value={keyInputs[provider.id] ?? ""}
                  onChange={(e) =>
                    setKeyInputs((prev) => ({ ...prev, [provider.id]: e.target.value }))
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleSave(provider.id)}
                  className="h-8 flex-1 rounded-md border border-[var(--border)] bg-[var(--background)] px-2.5 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
                <button
                  onClick={() => handleSave(provider.id)}
                  disabled={saving === provider.id || !keyInputs[provider.id]?.trim()}
                  aria-label={`Save ${provider.name} API key`}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-40",
                    isSaved
                      ? "bg-[var(--primary)]/20 text-[var(--primary)]"
                      : "bg-[var(--primary)]/15 text-[var(--primary)] hover:bg-[var(--primary)]/25",
                  )}
                >
                  {saving === provider.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
