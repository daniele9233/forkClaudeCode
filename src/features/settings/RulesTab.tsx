import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Brain, Save, Loader2, ToggleLeft, ToggleRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemoryStore } from "@/stores/memory.store";
import { useSessionStore } from "@/stores/session.store";
import { memorizeNow } from "@/opencode/memory";

const DEFAULT_TEMPLATE = `# Project instructions

Rules the agent must always follow in this project (opencode loads this file
into every session automatically):

-
`;

/**
 * Rules & Memory — edits the project's AGENTS.md (the "instincts" file the
 * engine injects natively) and controls the auto-maintained project memory
 * that kikkoCode distills into it after each run.
 */
export function RulesTab() {
  const [text, setText] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const autoMemorize = useMemoryStore((s) => s.autoMemorize);
  const setAutoMemorize = useMemoryStore((s) => s.setAutoMemorize);
  const distilling = useMemoryStore((s) => s.distilling);
  const lastAt = useMemoryStore((s) => s.lastAt);
  const lastError = useMemoryStore((s) => s.lastError);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);

  useEffect(() => {
    let cancelled = false;
    invoke<string | null>("read_agents_file")
      .then((t) => {
        if (!cancelled) setText(t ?? DEFAULT_TEMPLATE);
      })
      .catch(() => {
        if (!cancelled) setText(DEFAULT_TEMPLATE);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    if (text == null) return;
    setSaving(true);
    try {
      await invoke("write_agents_file", { content: text });
      setDirty(false);
      setSavedAt(Date.now());
    } catch (e) {
      console.error("[rules] save failed:", e);
    } finally {
      setSaving(false);
    }
  };

  const reloadFile = () => {
    invoke<string | null>("read_agents_file")
      .then((t) => {
        setText(t ?? DEFAULT_TEMPLATE);
        setDirty(false);
      })
      .catch(() => undefined);
  };

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Project memory controls */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 p-3">
        <div className="flex items-center gap-2">
          <Brain
            className={cn(
              "h-4 w-4 shrink-0",
              distilling
                ? "animate-pulse text-[var(--primary)]"
                : "text-[var(--primary)]",
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-[var(--foreground)]">
              Project memory
            </div>
            <div className="text-[10px] leading-relaxed text-[var(--muted-foreground)]">
              After each run kikkoCode distills durable knowledge (conventions, decisions,
              preferences, gotchas) into a managed block of AGENTS.md — which the engine
              injects into every future session.
              {lastAt && <> Last update: {new Date(lastAt).toLocaleString()}.</>}
              {lastError && <span className="text-red-400"> Error: {lastError}</span>}
            </div>
          </div>
          <button
            onClick={() => setAutoMemorize(!autoMemorize)}
            title={autoMemorize ? "Disable auto-memorize" : "Enable auto-memorize"}
            className="shrink-0 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            {autoMemorize ? (
              <ToggleRight className="h-5 w-5 text-[var(--primary)]" />
            ) : (
              <ToggleLeft className="h-5 w-5" />
            )}
          </button>
        </div>
        <button
          onClick={() => {
            if (activeSessionId) {
              void memorizeNow(activeSessionId).then((ok) => {
                if (ok) reloadFile();
              });
            }
          }}
          disabled={!activeSessionId || distilling}
          className="mt-2 flex items-center gap-1.5 rounded border border-[var(--primary)]/40 bg-[var(--primary)]/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-[var(--foreground)] hover:bg-[var(--primary)]/20 disabled:opacity-50"
          title={
            activeSessionId
              ? "Distill the current session into the project memory now"
              : "Open a session first"
          }
        >
          {distilling ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Brain className="h-3 w-3" />
          )}
          Memorize now
        </button>
      </div>

      {/* AGENTS.md editor */}
      <div className="flex min-h-72 flex-1 flex-col rounded-lg border border-[var(--border)]">
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-1.5">
          <span className="font-mono text-[11px] text-[var(--foreground)]">
            AGENTS.md
          </span>
          <span className="text-[9px] text-[var(--muted-foreground)]">
            loaded natively by the engine · don&apos;t edit inside the kikko:memory
            markers
          </span>
          <span className="flex-1" />
          {savedAt && !dirty && (
            <span className="text-[9px] text-emerald-400">saved ✓</span>
          )}
          <button
            onClick={() => void save()}
            disabled={!dirty || saving || text == null}
            className="flex items-center gap-1 rounded bg-[var(--primary)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            Save
          </button>
        </div>
        {text == null ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-[var(--muted-foreground)]" />
          </div>
        ) : (
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setDirty(true);
            }}
            spellCheck={false}
            className="min-h-0 flex-1 resize-none bg-transparent p-3 font-mono text-[11px] leading-relaxed text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
            placeholder="# Project instructions…"
          />
        )}
      </div>
    </div>
  );
}
