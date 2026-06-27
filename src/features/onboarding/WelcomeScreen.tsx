import { motion, useReducedMotion } from "motion/react";
import { Compass, Bug, FileSearch, Sparkles, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChamferPanel } from "@/components/ChamferPanel";
import type { AgentMode } from "@/features/chat/ChatInput";

interface Suggestion {
  icon: React.ReactNode;
  label: string;
  hint: string;
  prompt: string;
  mode: AgentMode;
}

const SUGGESTIONS: Suggestion[] = [
  {
    icon: <Compass className="h-4 w-4" />,
    label: "Plan a feature",
    hint: "Scope it before writing code",
    prompt: "Help me plan a new feature. Ask me what I want to build first.",
    mode: "plan",
  },
  {
    icon: <FileSearch className="h-4 w-4" />,
    label: "Explain this codebase",
    hint: "Get a guided tour",
    prompt:
      "Give me a high-level tour of this codebase: structure, entry points, and how the main pieces fit together.",
    mode: "plan",
  },
  {
    icon: <Bug className="h-4 w-4" />,
    label: "Find a bug",
    hint: "Track down a symptom",
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
    hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
    },
  };

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="w-full max-w-xl"
      >
        <ChamferPanel notch={24} className="shadow-2xl" innerClassName="p-8 sm:p-10">
          {/* Icon badge */}
          <motion.div variants={item}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)]/15 text-[var(--primary)] ring-1 ring-[var(--primary)]/25">
              <Sparkles className="h-6 w-6" />
            </div>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-5 text-2xl font-semibold tracking-tight text-[var(--foreground)]"
          >
            Welcome to Forgia
          </motion.h1>
          <motion.p
            variants={item}
            className="mt-2 max-w-md text-sm leading-relaxed text-[var(--muted-foreground)]"
          >
            A calm, elegant shell over the OpenCode engine. Ask anything below, or start
            from one of these.
          </motion.p>

          {/* Suggestions */}
          <motion.div variants={item} className="mt-6 flex flex-col gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                onClick={() => onPrompt?.(s.prompt, s.mode)}
                disabled={!onPrompt}
                className={cn(
                  "notch-tr group flex items-center gap-3 bg-white/[0.04] px-4 py-3 text-left transition-all",
                  "hover:bg-white/[0.08] disabled:opacity-50",
                )}
                style={{ ["--notch" as string]: "12px" } as React.CSSProperties}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                  {s.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-[var(--foreground)]">
                    {s.label}
                  </span>
                  <span className="block truncate text-xs text-[var(--muted-foreground)]">
                    {s.hint}
                  </span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--muted-foreground)] opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
          </motion.div>

          {/* Footer hint */}
          <motion.p
            variants={item}
            className="mt-6 text-xs text-[var(--muted-foreground)]"
          >
            Press{" "}
            <kbd className="rounded-md border border-[var(--border)] bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">
              Ctrl K
            </kbd>{" "}
            to open the command palette.
          </motion.p>
        </ChamferPanel>
      </motion.div>
    </div>
  );
}
