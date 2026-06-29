import { motion, useReducedMotion } from "motion/react";
import { Compass, Bug, FileSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel, PanelTab } from "@/components/Panel";
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
    icon: <Compass className="h-3.5 w-3.5" />,
    label: "Plan a feature",
    hint: "scope it before writing code",
    prompt: "Help me plan a new feature. Ask me what I want to build first.",
    mode: "plan",
  },
  {
    icon: <FileSearch className="h-3.5 w-3.5" />,
    label: "Explain this codebase",
    hint: "structure · entry points · flow",
    prompt:
      "Give me a high-level tour of this codebase: structure, entry points, and how the main pieces fit together.",
    mode: "plan",
  },
  {
    icon: <Bug className="h-3.5 w-3.5" />,
    label: "Find a bug",
    hint: "track down a symptom",
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
    show: { transition: reduce ? {} : { staggerChildren: 0.06, delayChildren: 0.04 } },
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
    <div className="flex flex-1 items-start justify-start overflow-auto p-4">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="w-full max-w-md"
      >
        <Panel className="shadow-2xl">
          <PanelTab right="v0.1.0">kikkocode // agent shell</PanelTab>

          <div className="p-7">
            <motion.div variants={item} className="flex items-center gap-3">
              <span className="h-6 w-6 shrink-0 bg-[var(--primary)]" />
              <h1 className="text-3xl font-bold uppercase tracking-[0.16em] text-[var(--foreground)]">
                kikkoCode
              </h1>
            </motion.div>

            <motion.p
              variants={item}
              className="mt-3 max-w-md text-xs leading-relaxed text-[var(--muted-foreground)]"
            >
              A calm, technical shell over the OpenCode engine. Type a directive below —
              or select a starting vector.
            </motion.p>

            <motion.div variants={item} className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-[var(--border)]" />
              <span className="hud-label">start vectors</span>
              <span className="h-px flex-1 bg-[var(--border)]" />
            </motion.div>

            <motion.div variants={item} className="flex flex-col">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={s.label}
                  onClick={() => onPrompt?.(s.prompt, s.mode)}
                  disabled={!onPrompt}
                  className={cn(
                    "group flex items-center gap-3 border border-[var(--border)] px-4 py-3 text-left transition-colors",
                    i > 0 && "border-t-0",
                    "hover:bg-[var(--primary)]/[0.06] disabled:opacity-50",
                  )}
                >
                  <span className="hud-label w-6 shrink-0 text-[var(--muted-foreground)]/50">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[var(--muted-foreground)] transition-colors group-hover:text-[var(--primary)]">
                    {s.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium uppercase tracking-wider text-[var(--foreground)]">
                      {s.label}
                    </span>
                    <span className="block truncate text-[11px] text-[var(--muted-foreground)]">
                      {s.hint}
                    </span>
                  </span>
                  <span className="hud-label opacity-0 transition-opacity group-hover:opacity-60">
                    ↩
                  </span>
                </button>
              ))}
            </motion.div>

            <motion.div
              variants={item}
              className="mt-6 flex items-center justify-between border-t border-[var(--border)] pt-4"
            >
              <span className="hud-label">
                <kbd className="bg-[var(--muted)] px-1.5 py-0.5 text-[var(--foreground)]">
                  CTRL K
                </kbd>{" "}
                command palette
              </span>
              <span className="hud-label flex items-center gap-1.5 text-[var(--color-online)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-online)]" />
                standby
              </span>
            </motion.div>
          </div>
        </Panel>
      </motion.div>
    </div>
  );
}
