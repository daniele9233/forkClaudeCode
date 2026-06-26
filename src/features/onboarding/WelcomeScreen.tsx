import { motion, useReducedMotion } from "motion/react";
import { Hammer, Compass, Bug, FileSearch, Sparkles } from "lucide-react";
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

  // Stagger reveal — disabled (instant) when the user prefers reduced motion.
  const container = {
    hidden: {},
    show: {
      transition: reduce ? {} : { staggerChildren: 0.08, delayChildren: 0.05 },
    },
  };
  const item = {
    hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
    },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center"
    >
      {/* Signature mark — anvil with an amber forge glow (the one bold moment) */}
      <motion.div variants={item} className="relative">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 rounded-full bg-[var(--primary)]/20 blur-2xl"
        />
        <motion.div
          animate={reduce ? undefined : { scale: [1, 1.04, 1], opacity: [0.85, 1, 0.85] }}
          transition={
            reduce ? undefined : { duration: 3.5, repeat: Infinity, ease: "easeInOut" }
          }
          className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--primary)]/30 bg-[var(--primary)]/10"
        >
          <Hammer className="h-7 w-7 text-[var(--primary)]" />
        </motion.div>
      </motion.div>

      <motion.div variants={item} className="flex flex-col items-center gap-1.5">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
          Welcome to Forgia
        </h2>
        <p className="max-w-sm text-sm text-[var(--muted-foreground)]">
          A calm, elegant shell over the OpenCode engine. Send a message to start — or
          pick a starting point below.
        </p>
      </motion.div>

      <motion.div variants={item} className="flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            onClick={() => onPrompt?.(s.prompt, s.mode)}
            disabled={!onPrompt}
            className="group flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] transition-all hover:border-[var(--primary)]/40 hover:text-[var(--foreground)] disabled:opacity-50"
          >
            <span className="text-[var(--muted-foreground)] transition-colors group-hover:text-[var(--primary)]">
              {s.icon}
            </span>
            {s.label}
          </button>
        ))}
      </motion.div>

      <motion.p
        variants={item}
        className="flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)]/60"
      >
        <Sparkles className="h-3 w-3" />
        Press{" "}
        <kbd className="rounded bg-[var(--muted)] px-1 py-0.5 font-mono">Ctrl K</kbd> for
        the command palette
      </motion.p>
    </motion.div>
  );
}
