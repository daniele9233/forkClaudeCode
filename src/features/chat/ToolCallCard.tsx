import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Terminal,
  FileEdit,
  Search,
  Globe,
  Wrench,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolPart } from "@opencode-ai/sdk/client";
import { useFileStore } from "@/stores/file.store";

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

/** Extract a file path and optional line number from the tool input object. */
function extractFileRef(input: unknown): { path: string; line?: number } | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const obj = input as Record<string, unknown>;

  const path =
    (typeof obj.path === "string" ? obj.path : null) ??
    (typeof obj.filePath === "string" ? obj.filePath : null) ??
    (typeof obj.file_path === "string" ? obj.file_path : null) ??
    (typeof obj.file === "string" ? obj.file : null);

  if (!path) return null;

  const line =
    (typeof obj.line === "number" ? obj.line : null) ??
    (typeof obj.startLine === "number" ? obj.startLine : null) ??
    (typeof obj.start_line === "number" ? obj.start_line : null) ??
    (typeof obj.lineNumber === "number" ? obj.lineNumber : null) ??
    undefined;

  return { path, line };
}

export function ToolCallCard({ part }: Props) {
  const [open, setOpen] = useState(false);
  const { openFile } = useFileStore();
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

  const fileRef = extractFileRef(input);

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
        <span className="flex-1 truncate font-semibold text-[var(--foreground)]">
          {title ?? tool}
        </span>

        {/* File:line chip — opens the file in the diff panel */}
        {fileRef && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              openFile(fileRef.path, fileRef.line);
            }}
            className={cn(
              "flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px]",
              "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
              "transition-colors",
            )}
            title={`Open ${fileRef.path}${fileRef.line ? `:${fileRef.line}` : ""}`}
          >
            <ExternalLink className="h-2.5 w-2.5" />
            <span className="max-w-[120px] truncate">
              {fileRef.path.split("/").pop()}
              {fileRef.line ? `:${fileRef.line}` : ""}
            </span>
          </button>
        )}

        {isRunning && (
          <span className="shrink-0 animate-pulse font-sans italic text-[var(--muted-foreground)]">
            running…
          </span>
        )}
        {isError && <span className="shrink-0 font-sans text-red-400">error</span>}
        {open ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-[var(--muted-foreground)]" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-[var(--muted-foreground)]" />
        )}
      </button>
      {open && (
        <div className="space-y-2 border-t border-[var(--border)] px-3 py-2">
          {input !== undefined && (
            <div>
              <div className="mb-1 font-sans text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                Input
              </div>
              <pre className="whitespace-pre-wrap break-all text-[var(--foreground)]">
                {JSON.stringify(input, null, 2)}
              </pre>
            </div>
          )}
          {output !== undefined && (
            <div>
              <div className="mb-1 font-sans text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                Output
              </div>
              <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-all text-[var(--foreground)]">
                {output}
              </pre>
            </div>
          )}
          {errorMsg !== undefined && (
            <div>
              <div className="mb-1 font-sans text-[10px] uppercase tracking-wider text-red-400">
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
