import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import {
  SendHorizontal,
  Square,
  Hammer,
  Map,
  ListPlus,
  Rocket,
  Sparkles,
  Loader2,
  Pin,
  RotateCcw,
  Palette,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel } from "@/components/Panel";
import { usePromptCost } from "@/features/inspector/usePromptCost";
import { fmtNum } from "@/features/inspector/useSessionStats";
import { useSkillsStore } from "@/stores/skills.store";
import { useStylesStore } from "@/stores/styles.store";
import { useComposerStore } from "@/stores/composer.store";
import { enhancePrompt } from "@/opencode/enhance";
import { planInjection } from "@/skills/match";

export type AgentMode = "build" | "plan";

export interface SendOpts {
  /** Start an autopilot run with the text as goal. */
  autopilot?: { budgetUsd: number; maxIters: number };
  /** Recipe skills to force-inject in full (bypasses the 2-match cap). */
  forcedSkillIds?: string[];
}

interface Props {
  onSend: (text: string, mode: AgentMode, opts?: SendOpts) => void;
  onAbort?: () => void;
  disabled?: boolean;
  isRunning?: boolean;
}

const MODES: { value: AgentMode; label: string; icon: React.ReactNode; title: string }[] =
  [
    {
      value: "build",
      label: "Build",
      icon: <Hammer className="h-3 w-3" />,
      title: "Build mode — agent reads, writes files and runs commands",
    },
    {
      value: "plan",
      label: "Plan",
      icon: <Map className="h-3 w-3" />,
      title: "Plan mode — agent thinks and proposes without executing",
    },
  ];

export function ChatInput({ onSend, onAbort, disabled, isRunning }: Props) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<AgentMode>("build");
  // Prompt Enhancer: rewrite a rough draft into an expert brief (editable).
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  // True while the composer holds a ready-made Studio recipe (already optimized
  // → "Perfeziona" is pointless and disabled). Cleared once the field is empty.
  const [fromRecipe, setFromRecipe] = useState(false);
  // A recipe's hand-picked skills, force-injected IN FULL on send (bypassing the
  // 2-match cap) so a top-tier brief runs its whole expert stack.
  const [recipeSkillIds, setRecipeSkillIds] = useState<string[]>([]);
  // Autopilot launcher: when armed, sending starts an autonomous run with the
  // text as goal, capped by budget ($) and iterations.
  const [autoOn, setAutoOn] = useState(false);
  const [budget, setBudget] = useState("1.00");
  const [iters, setIters] = useState("10");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cost = usePromptCost(text);
  // Subscribe to the skill inputs so the "will apply" chips recompute when the
  // prompt, pins, sticky warmth or settings change.
  const pinned = useSkillsStore((s) => s.pinned);
  const sticky = useSkillsStore((s) => s.sticky);
  const enabled = useSkillsStore((s) => s.enabled);
  const autoApply = useSkillsStore((s) => s.autoApply);
  const togglePin = useSkillsStore((s) => s.togglePin);
  const clearSticky = useSkillsStore((s) => s.clearSticky);
  const planned = useMemo(
    () => planInjection(text, recipeSkillIds).planned,
    [text, recipeSkillIds, pinned, sticky, enabled, autoApply],
  );
  const hasSticky = Object.values(sticky).some((t) => t > 0);

  // Active saved style (injected into every send until deactivated).
  const styleActiveId = useStylesStore((s) => s.activeId);
  const styles = useStylesStore((s) => s.styles);
  const setActiveStyle = useStylesStore((s) => s.setActive);
  const activeStyle = styleActiveId
    ? styles.find((s) => s.id === styleActiveId)
    : undefined;

  // Textarea auto-size that plays nice with the manual resize handle:
  // - grows AND shrinks to fit the content (up to 60vh) until the user drags
  //   the handle; after a manual resize we back off and respect their height,
  //   so the box never fights the drag. A ResizeObserver detects manual drags.
  const userResizedRef = useRef(false);
  const autoGrowGuardRef = useRef(false);
  const lastHeightRef = useRef(0);

  const autoGrow = useCallback(() => {
    const el = textareaRef.current;
    if (!el || userResizedRef.current) return;
    autoGrowGuardRef.current = true;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, Math.round(window.innerHeight * 0.6))}px`;
    requestAnimationFrame(() => {
      autoGrowGuardRef.current = false;
    });
  }, []);

  // Drag the grip at the top of the composer to raise/lower it — same pointer
  // logic as the bottom panel's handle. Dragging up makes the prompt taller.
  const startComposerResize = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const el = textareaRef.current;
    if (!el) return;
    userResizedRef.current = true; // manual size wins over auto-grow from now on
    const startY = e.clientY;
    const startH = el.offsetHeight;
    const max = Math.round(window.innerHeight * 0.85);
    const onMove = (ev: PointerEvent) => {
      const next = startH + (startY - ev.clientY);
      el.style.height = `${Math.min(Math.max(next, 40), max)}px`;
    };
    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    document.body.style.userSelect = "none";
    document.body.style.cursor = "row-resize";
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height ?? 0;
      // Ignore our own auto-grow; a height change we didn't cause = manual drag.
      if (autoGrowGuardRef.current) {
        lastHeightRef.current = h;
        return;
      }
      if (Math.abs(h - lastHeightRef.current) > 1 && lastHeightRef.current > 0) {
        userResizedRef.current = true;
      }
      lastHeightRef.current = h;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // A Studio recipe (or any external source) can push a ready-made brief into
  // the composer. Adopt it, focus, size the textarea, then clear the channel.
  const composerNonce = useComposerStore((s) => s.nonce);
  useEffect(() => {
    const { pending, source, skillIds, consume } = useComposerStore.getState();
    if (pending == null) return;
    setText(pending);
    setFromRecipe(source === "recipe");
    setRecipeSkillIds(source === "recipe" ? skillIds : []);
    consume();
    // A fresh brief starts auto-sized again (drop any prior manual height).
    userResizedRef.current = false;
    const el = textareaRef.current;
    if (el) {
      requestAnimationFrame(() => {
        el.focus();
        autoGrow();
        el.setSelectionRange(el.value.length, el.value.length);
      });
    }
  }, [composerNonce, autoGrow]);

  const submit = useCallback(() => {
    const trimmed = text.trim();
    // While the agent runs, sending is still allowed — the shell queues it
    // (NEXT queue) and fires it automatically when the agent goes idle.
    if (!trimmed || disabled) return;
    const forcedSkillIds = recipeSkillIds.length ? recipeSkillIds : undefined;
    if (autoOn) {
      // Autopilot needs an idle session to take over.
      if (isRunning) return;
      const budgetUsd = Math.max(0.05, parseFloat(budget) || 1);
      const maxIters = Math.max(1, Math.min(50, parseInt(iters, 10) || 10));
      onSend(trimmed, mode, { autopilot: { budgetUsd, maxIters }, forcedSkillIds });
      setAutoOn(false);
    } else {
      onSend(trimmed, mode, { forcedSkillIds });
    }
    setText("");
    setFromRecipe(false);
    setRecipeSkillIds([]);
    // Reset sizing: back to auto-grow from the minimum for the next prompt.
    userResizedRef.current = false;
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [text, disabled, mode, onSend, autoOn, isRunning, budget, iters, recipeSkillIds]);

  const enhance = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || enhancing) return;
    setEnhancing(true);
    setEnhanceError(null);
    try {
      const better = await enhancePrompt(trimmed);
      setText(better);
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        autoGrow();
        el.setSelectionRange(el.value.length, el.value.length);
      });
    } catch (e) {
      setEnhanceError(e instanceof Error ? e.message : String(e));
    } finally {
      setEnhancing(false);
    }
  }, [text, enhancing, autoGrow]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);
    // Editing an emptied field re-enables "Perfeziona" and re-arms auto-grow.
    if (value.trim() === "") {
      setFromRecipe(false);
      setRecipeSkillIds([]);
      userResizedRef.current = false;
    }
    // Auto-grow/shrink to fit (respects a prior manual resize).
    autoGrow();
  };

  return (
    <Panel className={cn("shadow-lg transition-opacity", disabled && "opacity-50")}>
      {/* Drag grip — raise/lower the prompt (same handle as the bottom panel) */}
      <div
        onPointerDown={startComposerResize}
        className="group relative flex h-3 shrink-0 touch-none select-none items-center justify-center rounded-t-2xl bg-[var(--border)]/40 transition-colors hover:bg-[var(--primary)]/25"
        style={{ cursor: "row-resize" }}
        title="Drag to resize the prompt"
      >
        <span className="pointer-events-none h-1 w-10 rounded-full bg-[var(--muted-foreground)]/50 transition-colors group-hover:bg-[var(--primary)]" />
      </div>

      {/* Mode toggle row */}
      <div className="flex items-center gap-1 border-b border-[var(--border)] px-2.5 py-1.5">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            disabled={disabled || isRunning}
            title={m.title}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest transition-colors",
              mode === m.value
                ? "bg-[var(--primary)]/15 text-[var(--primary)]"
                : "text-[var(--muted-foreground)] hover:bg-white/5 hover:text-[var(--foreground)]",
              (disabled || isRunning) && "cursor-not-allowed",
            )}
          >
            {m.icon}
            {m.label}
          </button>
        ))}
        {/* Autopilot launcher: goal = the prompt text; caps below */}
        <button
          onClick={() => setAutoOn((v) => !v)}
          disabled={disabled || isRunning}
          title="Autopilot — the agent iterates on its own toward the goal, within a cost budget and an iteration cap"
          className={cn(
            "ml-1 flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest transition-colors",
            autoOn
              ? "bg-[var(--primary)]/15 text-[var(--primary)]"
              : "text-[var(--muted-foreground)] hover:bg-white/5 hover:text-[var(--foreground)]",
            (disabled || isRunning) && "cursor-not-allowed",
          )}
        >
          <Rocket className="h-3 w-3" />
          Auto
        </button>
        {autoOn && !isRunning && (
          <span className="flex items-center gap-1 font-mono text-[10px] text-[var(--muted-foreground)]">
            <span>$</span>
            <input
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-12 rounded-sm border border-[var(--border)] bg-transparent px-1 py-0.5 text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
              title="Cost budget (USD) for the autopilot run"
            />
            <span className="ml-1">×</span>
            <input
              value={iters}
              onChange={(e) => setIters(e.target.value)}
              className="w-8 rounded-sm border border-[var(--border)] bg-transparent px-1 py-0.5 text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
              title="Max iterations"
            />
          </span>
        )}
        {/* Prompt Enhancer: rough draft → expert brief (editable before send).
            Disabled for Studio recipes — they're already optimized. */}
        <button
          onClick={() => void enhance()}
          disabled={!text.trim() || enhancing || fromRecipe}
          title={
            fromRecipe
              ? "Questa è una ricetta di Studio, già ottimizzata: Perfeziona non serve. Personalizza i dettagli e invia."
              : "Perfeziona: riscrive la tua richiesta in un brief esperto (poi puoi modificarlo e inviare)"
          }
          className={cn(
            "ml-1 flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest transition-colors",
            enhancing
              ? "bg-[var(--primary)]/15 text-[var(--primary)]"
              : "text-[var(--muted-foreground)] hover:bg-white/5 hover:text-[var(--foreground)]",
            (!text.trim() || enhancing || fromRecipe) && "cursor-not-allowed opacity-60",
          )}
        >
          {enhancing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          {enhancing ? "Perfeziono…" : "Perfeziona"}
        </button>
        {isRunning ? (
          <span className="hud-label ml-auto pr-1 text-[var(--primary)]">● running</span>
        ) : (
          <span className="ml-auto flex items-center gap-2 pr-1 font-mono text-[10px] text-[var(--muted-foreground)] tabular-nums">
            <span title="Estimated tokens for this prompt draft">
              ≈{fmtNum(cost.draftTokens)} tok
            </span>
            {cost.contextLimit > 0 && (
              <span
                title="Context window used after sending this prompt"
                className={cn(
                  cost.contextPct > 85
                    ? "text-red-400"
                    : cost.contextPct > 65
                      ? "text-amber-400"
                      : "text-[var(--muted-foreground)]",
                )}
              >
                ctx {cost.contextPct.toFixed(0)}%
              </span>
            )}
            {cost.hasPricing && (
              <span title="Estimated input cost to process this send">
                ~$
                {cost.estSendCost < 0.01
                  ? cost.estSendCost.toFixed(4)
                  : cost.estSendCost.toFixed(2)}
              </span>
            )}
          </span>
        )}
      </div>

      {/* Prompt Enhancer error (rare) */}
      {enhanceError && (
        <div className="border-b border-[var(--border)] px-3 py-1.5 text-[10px] text-red-400">
          Perfeziona non riuscito: {enhanceError}
        </div>
      )}

      {/* Active saved style — applied to every send until you turn it off */}
      {!isRunning && activeStyle && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--border)] px-3 py-1.5">
          <span className="hud-label text-[var(--muted-foreground)]/60">stile</span>
          <span
            className="flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-medium"
            style={{ background: `${activeStyle.accent}22`, color: activeStyle.accent }}
          >
            <Palette className="h-2.5 w-2.5" />
            {activeStyle.name}
            <button
              onClick={() => setActiveStyle(null)}
              title="Disattiva stile"
              className="ml-0.5 rounded hover:bg-black/10"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        </div>
      )}

      {/* Live "skills that will apply" chips — click to pin/unpin; sticky &
          pinned skills persist across turns. */}
      {!isRunning && planned.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--border)] px-3 py-1.5">
          <span className="hud-label text-[var(--muted-foreground)]/60">will apply</span>
          {planned.map(({ skill, source }) => {
            const isPinned = source === "pinned" || pinned.includes(skill.id);
            return (
              <button
                key={skill.id}
                onClick={() => togglePin(skill.id)}
                title={
                  (isPinned
                    ? "Fissata per la sessione — clicca per sfissare\n\n"
                    : source === "sticky"
                      ? "Attiva ancora per qualche turno — clicca per fissarla\n\n"
                      : "Clicca per fissare questa skill per la sessione\n\n") +
                  skill.description
                }
                className={cn(
                  "flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                  isPinned
                    ? "bg-[var(--primary)]/25 text-[var(--primary)] ring-1 ring-[var(--primary)]/40"
                    : source === "sticky"
                      ? "bg-[var(--muted)]/60 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      : "bg-[var(--primary)]/15 text-[var(--primary)] hover:bg-[var(--primary)]/25",
                )}
              >
                {skill.emoji} {skill.name}
                {isPinned && <Pin className="h-2.5 w-2.5 fill-current" />}
              </button>
            );
          })}
          {hasSticky && (
            <button
              onClick={clearSticky}
              title="Reset: dimentica le skill 'calde' dei turni precedenti"
              className="flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]/70 hover:text-[var(--foreground)]"
            >
              <RotateCcw className="h-2.5 w-2.5" />
              reset
            </button>
          )}
        </div>
      )}

      {/* Textarea + send button row */}
      <div className="flex items-end gap-2 px-3 py-2.5">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          placeholder={
            isRunning
              ? "Agent is working — Enter queues the next task"
              : autoOn
                ? "Describe the GOAL — Enter launches the autopilot 🚀"
                : `Message the agent in ${mode} mode (Enter to send)`
          }
          className={cn(
            "flex-1 resize-none bg-transparent text-sm text-[var(--foreground)]",
            "placeholder:text-[var(--muted-foreground)] focus:outline-none",
            // Auto-grow caps at 60vh; the top drag grip can go up to 85vh
            // (bigger than the auto cap) and down to the min — both directions.
            "max-h-[85vh] min-h-[2.5rem] overflow-y-auto",
          )}
        />
        {isRunning ? (
          <div className="flex shrink-0 items-end gap-1.5">
            {text.trim() && (
              <button
                onClick={submit}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-sm transition-colors",
                  "bg-[var(--primary)]/20 text-[var(--primary)] hover:bg-[var(--primary)]/30",
                )}
                title="Queue this task (runs when the agent is idle)"
                aria-label="Queue task"
              >
                <ListPlus className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onAbort}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-sm transition-colors",
                "bg-[var(--color-alert)]/80 text-white hover:bg-[var(--color-alert)]",
              )}
              title="Stop"
              aria-label="Stop generation"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          </div>
        ) : (
          <button
            onClick={submit}
            disabled={!text.trim() || disabled}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-sm transition-all",
              text.trim() && !disabled
                ? "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
                : "cursor-not-allowed bg-white/5 text-[var(--muted-foreground)]",
            )}
            title="Send (Enter)"
            aria-label="Send message"
          >
            <SendHorizontal className="h-4 w-4" />
          </button>
        )}
      </div>
    </Panel>
  );
}
