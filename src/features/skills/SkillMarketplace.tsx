import { useEffect, useState, useCallback } from "react";
import { X, Download, Loader2, Check, Trash2, RefreshCw, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { SKILL_PACKS } from "@/skills/skillPacks";
import { useSkillMarketplace } from "@/stores/skillMarketplace.store";
import {
  installSkillRepo,
  listInstalledSkills,
  removeInstalledSkill,
  restartEngine,
} from "@/opencode/skillInstall";

/**
 * Skill Marketplace — installs REAL engine skills (git repos with SKILL.md
 * folders) into `~/.claude/skills`, so the engine exposes them as invocable
 * skills. Distinct from the built-in design *playbooks* (auto-injected into the
 * prompt); this is the "install skills like npx skills add" experience.
 */
export function SkillMarketplace() {
  const open = useSkillMarketplace((s) => s.open);
  const close = useSkillMarketplace((s) => s.close);

  const [installed, setInstalled] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null); // pack id / "custom" while installing
  const [error, setError] = useState<string | null>(null);
  const [justInstalled, setJustInstalled] = useState<string[]>([]);
  const [needsRestart, setNeedsRestart] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [customUrl, setCustomUrl] = useState("");

  const refresh = useCallback(async () => {
    try {
      setInstalled(await listInstalledSkills());
    } catch {
      /* not in the desktop app / no dir yet — leave empty */
    }
  }, []);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  if (!open) return null;

  const doInstall = async (id: string, url: string) => {
    setBusy(id);
    setError(null);
    setJustInstalled([]);
    try {
      const names = await installSkillRepo(url);
      setJustInstalled(names);
      setNeedsRestart(true);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const doRemove = async (name: string) => {
    try {
      await removeInstalledSkill(name);
      setNeedsRestart(true);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const doRestart = async () => {
    setRestarting(true);
    setError(null);
    try {
      await restartEngine();
      setNeedsRestart(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRestarting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <div className="glass-strong glass-border flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] px-4 py-3">
          <Package className="h-4 w-4 text-[var(--primary)]" />
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Installa skill (motore)
            </h2>
            <p className="text-[10px] text-[var(--muted-foreground)]">
              Skill vere e invocabili, copiate in <code>~/.claude/skills</code> — diverse
              dai playbook di design auto-iniettati.
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

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {/* Restart banner */}
          {needsRestart && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-3 py-2 text-[11px] text-[var(--foreground)]">
              <span className="flex-1">
                Skill installate. Riavvia il motore perché le rilegga e le renda
                invocabili.
              </span>
              <button
                onClick={() => void doRestart()}
                disabled={restarting}
                className="flex items-center gap-1 rounded bg-[var(--primary)]/20 px-2 py-1 font-medium text-[var(--primary)] hover:bg-[var(--primary)]/30 disabled:opacity-50"
              >
                {restarting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Riavvia motore
              </button>
            </div>
          )}

          {error && (
            <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">
              {error}
            </div>
          )}
          {justInstalled.length > 0 && (
            <div className="mb-3 rounded-lg border border-[var(--color-online)]/30 bg-[var(--color-online)]/10 px-3 py-2 text-[11px] text-[var(--color-online)]">
              Installate: {justInstalled.join(", ")}
            </div>
          )}

          {/* Curated packs */}
          <div className="space-y-2">
            {SKILL_PACKS.map((pack) => (
              <div
                key={pack.id}
                className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 px-3 py-2.5"
              >
                <span className="mt-0.5 text-lg leading-none">{pack.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--foreground)]">
                      {pack.name}
                    </span>
                    <span className="rounded-sm bg-[var(--muted)]/60 px-1 text-[9px] font-medium text-[var(--muted-foreground)]">
                      {pack.count}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--muted-foreground)]">
                    {pack.description}
                  </p>
                </div>
                <button
                  onClick={() => void doInstall(pack.id, pack.repo)}
                  disabled={busy !== null}
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wider transition-colors",
                    "bg-[var(--primary)]/15 text-[var(--primary)] hover:bg-[var(--primary)]/25 disabled:opacity-40",
                  )}
                >
                  {busy === pack.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                  {busy === pack.id ? "Installo…" : "Installa"}
                </button>
              </div>
            ))}
          </div>

          {/* Custom URL */}
          <div className="mt-4 border-t border-[var(--border)] pt-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Da URL GitHub
            </p>
            <div className="flex items-center gap-1.5">
              <input
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  customUrl.trim() &&
                  void doInstall("custom", customUrl.trim())
                }
                placeholder="https://github.com/utente/repo-skill"
                className="h-7 flex-1 rounded border border-[var(--border)] bg-[var(--muted)]/40 px-2 text-[11px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
              <button
                onClick={() =>
                  customUrl.trim() && void doInstall("custom", customUrl.trim())
                }
                disabled={busy !== null || !customUrl.trim()}
                className="flex h-7 items-center gap-1 rounded bg-[var(--primary)]/15 px-2.5 text-[10px] font-medium uppercase tracking-wider text-[var(--primary)] hover:bg-[var(--primary)]/25 disabled:opacity-40"
              >
                {busy === "custom" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Download className="h-3 w-3" />
                )}
                Installa
              </button>
            </div>
          </div>

          {/* Installed */}
          {installed.length > 0 && (
            <div className="mt-4 border-t border-[var(--border)] pt-3">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Installate ({installed.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {installed.map((name) => (
                  <span
                    key={name}
                    className="flex items-center gap-1 rounded-sm bg-[var(--muted)]/50 px-1.5 py-0.5 text-[10px] text-[var(--foreground)]"
                  >
                    <Check className="h-2.5 w-2.5 text-[var(--color-online)]" />
                    {name}
                    <button
                      onClick={() => void doRemove(name)}
                      title="Rimuovi"
                      className="ml-0.5 rounded text-[var(--muted-foreground)] hover:text-red-400"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
