import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Terminal,
  FileEdit,
  Search,
  Globe,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolPart } from "@opencode-ai/sdk/client";

interface Props {
  part: ToolPart;
}

const TOOL_ICONS: Array<[string, React.ReactNode]> = [
  ["bash", <Terminal key="bash" className="h-3.5 w-3.5" />],
  ["edit", <FileEdit key="edit" className="h-3.5 w-3.5" />],
  ["read", <Search key="read" className="h-3.5 w-3.5" />],
  ["fetch", <Globe key="fetch" className="h-3.5 w-3.5" />],
];

function iconForTool(toolName: string) {
  const key = toolName.toLowerCase();
  for (const [prefix, icon] of TOOL_ICONS) {
    if (key.includes(prefix)) return icon;
  }
  return <Wrench className="h-3.5 w-3.5" />;
}

export function ToolCallCard({ part }: Props) {
  const [open, setOpen] = useState(false);
  const { tool, state } = part;
  const isRunning = state.status === "pending" || state.status === "running";
  const isError = state.status === "error";
  const isCompleted = state.status === "completed";

  const input = state.status !== "pending" ? state.input : undefined;
  const output = isCompleted ? state.output : undefined;
  const errorMsg = isError ? state.error : undefined;
  const title = isCompleted
    ? state.title
    : state.status === "running"
      ? state.title
      : undefined;

  return (
    <div
      className={cn(
        "my-1.5 rounded-lg border text-xs font-mono",
        isRunning && "border-[var(--border)] bg-[var(--muted)]/30",
        isError && "border-red-800/50 bg-red-950/20",
        isCompleted && "border-[var(--border)] bg-[var(--muted)]/20",
      )}
    >
      <button
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-[var(--muted-foreground)]">{iconForTool(tool)}</span>
        <span className="flex-1 text-[var(--foreground)] font-semibold truncate">
          {title ?? tool}
        </span>
        {isRunning && (
          <span className="shrink-0 text-[var(--muted-foreground)] italic font-sans animate-pulse">
            running…
          </span>
        )}
        {isError && <span className="shrink-0 text-red-400 font-sans">error</span>}
        {open ? (
          <ChevronDown className="shrink-0 h-3 w-3 text-[var(--muted-foreground)]" />
        ) : (
          <ChevronRight className="shrink-0 h-3 w-3 text-[var(--muted-foreground)]" />
        )}
      </button>
      {open && (
        <div className="border-t border-[var(--border)] px-3 py-2 space-y-2">
          {input !== undefined && (
            <div>
              <div className="text-[var(--muted-foreground)] mb-1 font-sans text-[10px] uppercase tracking-wider">
                Input
              </div>
              <pre className="whitespace-pre-wrap break-all text-[var(--foreground)]">
                {JSON.stringify(input, null, 2)}
              </pre>
            </div>
          )}
          {output !== undefined && (
            <div>
              <div className="text-[var(--muted-foreground)] mb-1 font-sans text-[10px] uppercase tracking-wider">
                Output
              </div>
              <pre className="whitespace-pre-wrap break-all text-[var(--foreground)] max-h-48 overflow-y-auto">
                {output}
              </pre>
            </div>
          )}
          {errorMsg !== undefined && (
            <div>
              <div className="text-red-400 mb-1 font-sans text-[10px] uppercase tracking-wider">
                Error
              </div>
              <pre className="whitespace-pre-wrap break-all text-red-300">{errorMsg}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
