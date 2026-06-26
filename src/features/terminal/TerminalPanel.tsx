import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import { useTerminalStore, type TermEntry } from "@/stores/terminal.store";

/* ANSI helpers */
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

/** Normalize \n → \r\n so xterm renders newlines correctly. */
function nl(text: string): string {
  return text.replace(/\r?\n/g, "\r\n");
}

function writeEntry(term: Terminal, entry: TermEntry) {
  term.writeln(`${CYAN}$ ${entry.command}${RESET}`);
  if (entry.output && entry.output.trim().length > 0) {
    term.writeln(nl(entry.output.replace(/\s+$/, "")));
  }
  if (entry.error && entry.error.trim().length > 0) {
    term.writeln(`${RED}${nl(entry.error.replace(/\s+$/, ""))}${RESET}`);
  }
  term.writeln("");
}

/** Terminal colors aligned with the forge palette (dark steel + amber). */
const FORGE_THEME = {
  background: "#0a0c0e",
  foreground: "#cbd5e1",
  cursor: "#f59e0b",
  selectionBackground: "#f59e0b33",
  black: "#0a0c0e",
  brightBlack: "#475569",
};

export function TerminalPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const writtenCountRef = useRef(0);

  const entries = useTerminalStore((s) => s.entries);
  const clear = useTerminalStore((s) => s.clear);

  // Initialize xterm once
  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      convertEol: false,
      disableStdin: true,
      cursorBlink: false,
      fontSize: 12,
      fontFamily: "var(--font-mono, 'JetBrains Mono', ui-monospace, monospace)",
      theme: FORGE_THEME,
      scrollback: 5000,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());
    term.open(containerRef.current);
    fit.fit();

    termRef.current = term;
    fitRef.current = fit;

    // Write any entries that already exist (panel was mounted late)
    const existing = useTerminalStore.getState().entries;
    existing.forEach((e) => writeEntry(term, e));
    writtenCountRef.current = existing.length;
    if (existing.length === 0) {
      term.writeln(`${DIM}Terminal — output of commands run by the agent${RESET}`);
      term.writeln("");
    }

    const ro = new ResizeObserver(() => {
      try {
        fit.fit();
      } catch {
        /* container detached */
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
      writtenCountRef.current = 0;
    };
  }, []);

  // Write newly added entries incrementally
  useEffect(() => {
    const term = termRef.current;
    if (!term) return;
    if (entries.length < writtenCountRef.current) {
      // store was cleared — reset
      term.clear();
      writtenCountRef.current = 0;
    }
    for (let i = writtenCountRef.current; i < entries.length; i++) {
      writeEntry(term, entries[i]);
    }
    writtenCountRef.current = entries.length;
  }, [entries]);

  return (
    <div className="flex h-full flex-col bg-[#0a0c0e]">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-3 py-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Terminal
        </span>
        <button
          onClick={() => {
            clear();
            termRef.current?.clear();
          }}
          className="rounded px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          title="Clear terminal"
        >
          Clear
        </button>
      </div>
      <div ref={containerRef} className="min-h-0 flex-1 overflow-hidden px-2 py-1" />
    </div>
  );
}
