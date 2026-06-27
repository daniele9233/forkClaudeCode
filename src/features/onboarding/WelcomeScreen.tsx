import { motion, useReducedMotion } from "motion/react";
import { Compass, Bug, FileSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { CornerBrackets } from "@/components/CornerBrackets";
import type { AgentMode } from "@/features/chat/ChatInput";

interface Suggestion {
  icon: React.ReactNode;
  label: string;
  prompt: string;
  mode: AgentMode;
}

const SUGGESTIONS: Suggestion[] = [
  {
    icon: <Compass className="h-3.5 w-3.5" />,
    label: "Plan a feature",
    prompt: "Help me plan a new feature. Ask me what I want to build first.",
    mode: "plan",
  },
  {
    icon: <FileSearch className="h-3.5 w-3.5" />,
    label: "Explain this codebase",
    prompt:
      "Give me a high-level tour of this codebase: structure, entry points, and how the main pieces fit together.",
    mode: "plan",
  },
  {
    icon: <Bug className="h-3.5 w-3.5" />,
    label: "Find a bug",
    prompt:
      "Help me track down a bug. I'll describe the symptom — ask me clarifying questions.",
    mode: "build",
  },
];

interface WelcomeScreenProps {
  onPrompt?: (text: string, mode: AgentMode) => void;
}

export function WelcomeScreen({ onPrompt }: WelcomeScreenProps) {
  const reduce = useReducedMotion();

  const container = {
    hidden: {},
    show: {
      transition: reduce ? {} : { staggerChildren: 0.07, delayChildren: 0.05 },
    },
  };
  const item = {
    hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
    },
  };

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="hud-scan relative w-full max-w-2xl border border-[var(--border)] bg-[var(--card)]/30 px-10 py-12"
      >
        <CornerBrackets size={18} inset={-1} />

        {/* Top meta row */}
        <motion.div variants={item} className="mb-10 flex items-center justify-between">
          <span className="hud-label">FORGIA // AGENT SHELL</span>
          <span className="hud-label">v0.1.0</span>
        </motion.div>

        {/* Wordmark */}
        <motion.div variants={item} className="flex items-center gap-3">
          <span className="relative h-7 w-7 shrink-0">
            <span
              aria-hidden
              className="absolute inset-0 -z-10 bg-[var(--primary)]/30 blur-lg"
            />
            <span className="block h-full w-full bg-[var(--primary)]" />
          </span>
          <h1 className="font-mono text-4xl font-bold uppercase tracking-[0.18em] text-[var(--foreground)]">
            Forgia
          </h1>
        </motion.div>

        <motion.p
          variants={item}
          className="mt-4 max-w-md font-mono text-xs leading-relaxed text-[var(--muted-foreground)]"
        >
          A calm, technical shell over the OpenCode engine. Type a directive below — or
          select a starting vector.
        </motion.p>

        {/* Divider */}
        <motion.div variants={item} className="my-7 flex items-center gap-3">
          <span className="h-px flex-1 bg-[var(--border)]" />
          <span className="hud-label">START VECTORS</span>
          <span className="h-px flex-1 bg-[var(--border)]" />
        </motion.div>

        {/* Suggestion vectors */}
        <motion.div variants={item} className="grid gap-2 sm:grid-cols-3">
          {SUGGESTIONS.map((s, i) => (
            <button
              key={s.label}
              onClick={() => onPrompt?.(s.prompt, s.mode)}
              disabled={!onPrompt}
              className={cn(
                "group flex flex-col gap-2 border border-[var(--border)] bg-[var(--background)]/40 p-3 text-left transition-colors",
                "hover:border-[var(--primary)]/60 disabled:opacity-50",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted-foreground)] transition-colors group-hover:text-[var(--primary)]">
                  {s.icon}
                </span>
                <span className="hud-label opacity-40">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--foreground)]">
                {s.label}
              </span>
            </button>
          ))}
        </motion.div>

        {/* Footer hint */}
        <motion.div
          variants={item}
          className="mt-8 flex items-center justify-between border-t border-[var(--border)] pt-4"
        >
          <span className="hud-label">
            <kbd className="bg-[var(--muted)] px-1.5 py-0.5 font-mono text-[var(--foreground)]">
              CTRL K
            </kbd>{" "}
            COMMAND PALETTE
          </span>
          <span className="hud-label flex items-center gap-1.5 text-[var(--color-online)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-online)]" />
            STANDBY
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}
